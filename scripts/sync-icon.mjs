// zengin-pl (Webフロントエンド) の favicon.svg を正本として、
// この拡張機能のアイコン(icon16/48/128.png)を再生成するスクリプト。
// zengin-pl.web/favicon.svg が更新された場合、このスクリプトを再実行することで追随できる。
//
//   npm run icons                 # zengin-pl の master 最新版を取得してピン留めを更新
//   npm run icons -- --ref <sha>  # 指定コミットのバージョンを取得してピン留め
import { Resvg } from '@resvg/resvg-js';
import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const ZENGIN_PL_REPO = 'sironekotoro/zengin-pl';
const FAVICON_PATH = 'web/favicon.svg';
const ICON_SIZES = [16, 48, 128];

const iconsDir = path.join(import.meta.dirname, '..', 'src', 'icons');
const sourceSvgPath = path.join(iconsDir, 'source.svg');
const sourceRefPath = path.join(iconsDir, 'source.ref');

function parseArgs(argv) {
  const refIndex = argv.indexOf('--ref');
  return { ref: refIndex !== -1 ? argv[refIndex + 1] : undefined };
}

async function resolveCommitSha(ref) {
  const res = await fetch(`https://api.github.com/repos/${ZENGIN_PL_REPO}/commits/${ref}`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) {
    throw new Error(`コミットの解決に失敗しました(${ref}): HTTP ${res.status}`);
  }
  const body = await res.json();
  return body.sha;
}

async function fetchFaviconSvg(sha) {
  const url = `https://raw.githubusercontent.com/${ZENGIN_PL_REPO}/${sha}/${FAVICON_PATH}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`favicon.svg の取得に失敗しました(${sha}): HTTP ${res.status}`);
  }
  return res.text();
}

async function renderPng(svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
  });
  return resvg.render().asPng();
}

async function main() {
  const { ref } = parseArgs(process.argv.slice(2));
  const requestedRef = ref ?? 'master';

  console.log(`zengin-pl(${requestedRef}) の favicon.svg を取得しています...`);
  const sha = await resolveCommitSha(requestedRef);
  const svg = await fetchFaviconSvg(sha);

  await writeFile(sourceSvgPath, svg.endsWith('\n') ? svg : `${svg}\n`);
  await writeFile(sourceRefPath, `${sha}\n`);
  console.log(`src/icons/source.svg を更新しました(コミット ${sha})`);

  for (const size of ICON_SIZES) {
    const png = await renderPng(svg, size);
    const outPath = path.join(iconsDir, `icon${size}.png`);
    await writeFile(outPath, png);
    console.log(`generated ${outPath}`);
  }
}

async function regenerateFromLocalSource() {
  const svg = await readFile(sourceSvgPath, 'utf8');
  for (const size of ICON_SIZES) {
    const png = await renderPng(svg, size);
    const outPath = path.join(iconsDir, `icon${size}.png`);
    await writeFile(outPath, png);
    console.log(`generated ${outPath}`);
  }
}

if (process.argv.includes('--offline')) {
  await regenerateFromLocalSource();
} else {
  await main();
}
