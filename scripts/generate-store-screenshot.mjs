// Chrome Web Store / AMO 提出用の横長プロモーションスクリーンショットを、
// 実機で撮影した縦長のスクリーンショット(docs/images/search-screenshot.png)を
// 素材として合成生成するスクリプト。
//
//   node scripts/generate-store-screenshot.mjs             # 1280x800 (Chromeウェブストア既定)
//   node scripts/generate-store-screenshot.mjs 640 400      # 640x400 (Chromeウェブストア小サイズ)
import { Resvg } from '@resvg/resvg-js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const sourceImagePath = path.join(root, 'docs/images/search-screenshot.png');
const outDir = path.join(root, 'store-assets');
// docs/images/search-screenshot.png の実寸(`file`コマンドで確認済み)。
// 素材の画像を差し替えた場合はここも更新すること。
const SOURCE_IMAGE_WIDTH = 1136;
const SOURCE_IMAGE_HEIGHT = 2344;

const [, , widthArg, heightArg] = process.argv;
const CANVAS_WIDTH = Number(widthArg ?? 1280);
const CANVAS_HEIGHT = Number(heightArg ?? 800);

const NAVY = '#1b2b38';
const NAVY_LIGHT = '#30475A';
const ACCENT = '#8ab4f8';

function escapeXml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 日本語(全角相当)を前提に、1文字 ≒ fontSize幅として概算で折り返す。
function wrapText(text, maxWidth, fontSize) {
  const maxChars = Math.max(1, Math.floor(maxWidth / fontSize));
  const lines = [];
  let current = '';
  for (const ch of text) {
    if (current.length >= maxChars) {
      lines.push(current);
      current = '';
    }
    current += ch;
  }
  if (current) lines.push(current);
  return lines;
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const imageBuffer = await readFile(sourceImagePath);
  const srcWidth = SOURCE_IMAGE_WIDTH;
  const srcHeight = SOURCE_IMAGE_HEIGHT;
  const base64 = imageBuffer.toString('base64');

  const padding = Math.round(CANVAS_HEIGHT * 0.08);
  const maxImgHeight = CANVAS_HEIGHT - padding * 2;
  const scale = maxImgHeight / srcHeight;
  const imgWidth = srcWidth * scale;
  const imgHeight = srcHeight * scale;
  const imgX = CANVAS_WIDTH - imgWidth - padding * 1.4;
  const imgY = (CANVAS_HEIGHT - imgHeight) / 2;

  const textBlockWidth = imgX - padding * 1.2;
  const titleSize = Math.round(CANVAS_HEIGHT * 0.075);
  const taglineSize = Math.round(CANVAS_HEIGHT * 0.032);
  const bulletSize = Math.round(CANVAS_HEIGHT * 0.028);

  const taglineY = CANVAS_HEIGHT * 0.22 + taglineSize * 1.6;
  const taglineLines = wrapText(
    '銀行名・銀行コード・支店名・支店コードを、ブラウザからサクッと検索',
    textBlockWidth,
    taglineSize,
  );
  const taglineSvg = taglineLines
    .map(
      (line, i) =>
        `<text x="${padding}" y="${taglineY + i * taglineSize * 1.5}" font-size="${taglineSize}" fill="#c7d2db" font-family="'Hiragino Sans','Hiragino Kaku Gothic ProN',sans-serif">${escapeXml(line)}</text>`,
    )
    .join('\n');
  const bulletsStartY =
    taglineY + (taglineLines.length - 1) * taglineSize * 1.5 + CANVAS_HEIGHT * 0.14;

  const bullets = [
    '銀行名・銀行コードで検索 → 支店名・支店コードで検索',
    '銀行名/コード/支店名/コード/半角カナをコピー',
    '検索画面は開いたまま。他アプリへの貼り付けも快適',
  ];

  const bulletLines = bullets
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

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${NAVY}" />
      <stop offset="1" stop-color="${NAVY_LIGHT}" />
    </linearGradient>
  </defs>
  <rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="url(#bg)" />

  <text x="${padding}" y="${CANVAS_HEIGHT * 0.22}" font-size="${titleSize}" font-weight="700" fill="#ffffff" font-family="'Hiragino Sans','Hiragino Kaku Gothic ProN',sans-serif">全銀コード検索</text>
  ${taglineSvg}

  ${bulletLines}

  <rect x="${imgX - 10}" y="${imgY - 10}" width="${imgWidth + 20}" height="${imgHeight + 20}" rx="14" fill="#ffffff" opacity="0.08" />
  <image x="${imgX}" y="${imgY}" width="${imgWidth}" height="${imgHeight}" href="data:image/png;base64,${base64}" preserveAspectRatio="xMidYMid slice" />
  <rect x="${imgX}" y="${imgY}" width="${imgWidth}" height="${imgHeight}" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2" rx="6" />
</svg>
`;

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: CANVAS_WIDTH } });
  const png = resvg.render().asPng();
  const outPath = path.join(outDir, `chrome-screenshot-${CANVAS_WIDTH}x${CANVAS_HEIGHT}.png`);
  await writeFile(outPath, png);
  console.log(`generated ${outPath}`);
}

await main();
