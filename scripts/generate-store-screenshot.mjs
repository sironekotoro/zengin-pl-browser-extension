// Chrome Web Store提出用の画像(スクリーンショット・プロモーションタイル)を、
// 実機で撮影した縦長のスクリーンショット(docs/images/search-screenshot.png)を
// 素材として合成生成するスクリプト。
//
// Chromeウェブストアの規定(https://developer.chrome.com/docs/webstore/images):
//   スクリーンショット:       1280x800 または 640x400 (JPEG または 24bit PNG、アルファなし)
//   プロモーションタイル(小): 440x280                (同上)
//   マーキープロモーションタイル: 1400x560            (同上)
// いずれも「アルファなし」が必須のため、最終出力はJPEGに変換している。
//
//   node scripts/generate-store-screenshot.mjs             # 1280x800
//   node scripts/generate-store-screenshot.mjs 640 400      # 640x400
//   node scripts/generate-store-screenshot.mjs 440 280      # プロモーションタイル(小)
//   node scripts/generate-store-screenshot.mjs 1400 560      # マーキープロモーションタイル
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const sourceImagePath = path.join(root, 'docs/images/search-screenshot.png');
const iconPath = path.join(root, 'src/icons/icon128.png');
const outDir = path.join(root, 'store-assets');
// docs/images/search-screenshot.png の実寸(`file`コマンドで確認済み)。
// 素材の画像を撮り直した場合はここも更新すること。
const SOURCE_IMAGE_WIDTH = 1136;
const SOURCE_IMAGE_HEIGHT = 2344;
const ICON_SIZE = 128;
// このサイズより低い(=縦に余裕がない)場合は、製品スクリーンショットを省略し
// アイコン+タイトル+タグラインのみのシンプルな構成にする。
const MIN_HEIGHT_FOR_SCREENSHOT = 350;

const [, , widthArg, heightArg] = process.argv;
const CANVAS_WIDTH = Number(widthArg ?? 1280);
const CANVAS_HEIGHT = Number(heightArg ?? 800);
const useScreenshot = CANVAS_HEIGHT >= MIN_HEIGHT_FOR_SCREENSHOT;

const NAVY = '#1b2b38';
const NAVY_LIGHT = '#30475A';
const ACCENT = '#8ab4f8';

function escapeXml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 日本語(全角相当)を前提に、1文字 ≒ fontSize幅として概算で折り返す。
// 「・」「、」「→」「/」「。」等の区切り文字の直後でのみ改行し、
// 「支店コード」「検索」のような単語の途中では改行しないようにする。
const BREAK_CHARS = '・、,。/→\\s';
const TOKEN_PATTERN = new RegExp(`[^${BREAK_CHARS}]*[${BREAK_CHARS}]?`, 'g');

function wrapText(text, maxWidth, fontSize) {
  const maxChars = Math.max(1, Math.floor(maxWidth / fontSize));
  const tokens = (text.match(TOKEN_PATTERN) ?? []).filter(Boolean);
  const lines = [];
  let current = '';

  for (const token of tokens) {
    if (current && (current.length + token.length) > maxChars) {
      lines.push(current);
      current = '';
    }
    if (token.length > maxChars) {
      // 区切りのない1トークンだけでmaxCharsを超える場合の保険(文字単位で分割)。
      let remaining = token;
      while (remaining.length > maxChars) {
        if (current) {
          lines.push(current);
          current = '';
        }
        lines.push(remaining.slice(0, maxChars));
        remaining = remaining.slice(maxChars);
      }
      current = remaining;
    } else {
      current += token;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function buildSvg() {
  const padding = Math.round(CANVAS_HEIGHT * 0.08);
  const titleSize = Math.round(CANVAS_HEIGHT * 0.11);
  const taglineSize = Math.round(CANVAS_HEIGHT * 0.05);
  const bulletSize = Math.round(CANVAS_HEIGHT * 0.028);

  let imgX = CANVAS_WIDTH;
  let imageSvg = '';
  let screenshotBase64 = null;

  if (useScreenshot) {
    const imageBuffer = await readFile(sourceImagePath);
    screenshotBase64 = imageBuffer.toString('base64');

    const maxImgHeight = CANVAS_HEIGHT - padding * 2;
    const scale = maxImgHeight / SOURCE_IMAGE_HEIGHT;
    const imgWidth = SOURCE_IMAGE_WIDTH * scale;
    const imgHeight = SOURCE_IMAGE_HEIGHT * scale;
    imgX = CANVAS_WIDTH - imgWidth - padding * 1.4;
    const imgY = (CANVAS_HEIGHT - imgHeight) / 2;

    imageSvg = `
      <rect x="${imgX - 10}" y="${imgY - 10}" width="${imgWidth + 20}" height="${imgHeight + 20}" rx="14" fill="#ffffff" opacity="0.08" />
      <image x="${imgX}" y="${imgY}" width="${imgWidth}" height="${imgHeight}" href="data:image/png;base64,${screenshotBase64}" preserveAspectRatio="xMidYMid slice" />
      <rect x="${imgX}" y="${imgY}" width="${imgWidth}" height="${imgHeight}" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2" rx="6" />
    `;
  }

  const textBlockWidth = imgX - padding * 1.2;

  // アイコン(丸背景込み)をタイトルの左に配置する。
  const iconBuffer = await readFile(iconPath);
  const iconBase64 = iconBuffer.toString('base64');
  const iconDisplaySize = titleSize * 1.3;
  const iconX = padding;
  const iconY = CANVAS_HEIGHT * (useScreenshot ? 0.22 : 0.5) - iconDisplaySize * 0.75;
  const titleX = iconX + iconDisplaySize + padding * 0.5;

  const titleBaselineY = iconY + iconDisplaySize * 0.72;
  const taglineY = titleBaselineY + taglineSize * 1.5;
  const taglineLines = wrapText(
    '銀行名・銀行コード・支店名・支店コードを、ブラウザからサクッと検索',
    Math.max(textBlockWidth - (titleX - padding), CANVAS_WIDTH * 0.3),
    taglineSize,
  );
  const taglineSvg = taglineLines
    .map(
      (line, i) =>
        `<text x="${titleX}" y="${taglineY + i * taglineSize * 1.5}" font-size="${taglineSize}" fill="#c7d2db" font-family="'Hiragino Sans','Hiragino Kaku Gothic ProN',sans-serif">${escapeXml(line)}</text>`,
    )
    .join('\n');

  let bulletLines = '';
  if (useScreenshot) {
    const bulletsStartY =
      taglineY + (taglineLines.length - 1) * taglineSize * 1.5 + CANVAS_HEIGHT * 0.14;
    const bullets = [
      '銀行名・銀行コードで検索 → 支店名・支店コードで検索',
      '銀行名/コード/支店名/コード/半角カナをコピー',
      '検索画面は開いたまま。他アプリへの貼り付けも快適',
    ];
    bulletLines = bullets
      .map((text, i) => {
        const y = bulletsStartY + i * (bulletSize * 1.9);
        const lines = wrapText(text, textBlockWidth - 22, bulletSize);
        const textSvg = lines
          .map(
            (line, li) =>
              `<text x="${padding + 22}" y="${y + li * bulletSize * 1.4}" font-size="${bulletSize}" fill="#e8eaed" font-family="'Hiragino Sans','Hiragino Kaku Gothic ProN',sans-serif">${escapeXml(line)}</text>`,
          )
          .join('\n');
        return `
          <circle cx="${padding + 6}" cy="${y - bulletSize * 0.35}" r="4" fill="${ACCENT}" />
          ${textSvg}
        `;
      })
      .join('\n');
  }

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${NAVY}" />
      <stop offset="1" stop-color="${NAVY_LIGHT}" />
    </linearGradient>
  </defs>
  <rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="url(#bg)" />

  <image x="${iconX}" y="${iconY}" width="${iconDisplaySize}" height="${iconDisplaySize}" href="data:image/png;base64,${iconBase64}" />
  <text x="${titleX}" y="${titleBaselineY}" font-size="${titleSize}" font-weight="700" fill="#ffffff" font-family="'Hiragino Sans','Hiragino Kaku Gothic ProN',sans-serif">全銀コード検索</text>
  ${taglineSvg}

  ${bulletLines}

  ${imageSvg}
</svg>
`;
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const svg = await buildSvg();
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: CANVAS_WIDTH } });
  const rgbaPng = resvg.render().asPng();

  // Chromeウェブストアの画像要件は「アルファなし」のため、
  // 不透明な背景に合成してJPEGへ変換する(JPEGはアルファを持ち得ないため確実に満たせる)。
  const jpeg = await sharp(rgbaPng).flatten({ background: NAVY }).jpeg({ quality: 92 }).toBuffer();

  const outPath = path.join(outDir, `chrome-${CANVAS_WIDTH}x${CANVAS_HEIGHT}.jpg`);
  await writeFile(outPath, jpeg);
  console.log(`generated ${outPath}`);
}

await main();
