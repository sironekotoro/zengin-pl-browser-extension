import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const target = process.argv[2];
if (target !== 'chrome' && target !== 'firefox') {
  console.error('Usage: node scripts/build.mjs <chrome|firefox>');
  process.exit(1);
}

const root = path.join(import.meta.dirname, '..');
const outdir = path.join(root, 'dist', target);

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });

await build({
  entryPoints: {
    background: path.join(root, 'src/background/index.ts'),
    popup: path.join(root, 'src/popup/popup.ts'),
  },
  bundle: true,
  outdir,
  format: 'iife',
  target: ['chrome109', 'firefox115'],
  sourcemap: true,
  logLevel: 'info',
});

await cp(path.join(root, 'src/popup/popup.html'), path.join(outdir, 'popup.html'));
await cp(path.join(root, 'src/popup/popup.css'), path.join(outdir, 'popup.css'));
await cp(path.join(root, 'src/onboarding/onboarding.html'), path.join(outdir, 'onboarding.html'));
await cp(
  path.join(root, 'docs/images/pin-to-toolbar.gif'),
  path.join(outdir, 'pin-to-toolbar.gif'),
);
// src/icons/ には icon サイズのPNG以外に、同期元SVGのピン留め用ファイル
// (source.svg, source.ref)も置かれているが、これらは配布パッケージには不要。
await mkdir(path.join(outdir, 'icons'), { recursive: true });
for (const size of [16, 48, 128]) {
  const fileName = `icon${size}.png`;
  await cp(path.join(root, 'src/icons', fileName), path.join(outdir, 'icons', fileName));
}
await cp(path.join(root, `manifest/manifest.${target}.json`), path.join(outdir, 'manifest.json'));

console.log(`Built ${target} extension into dist/${target}`);
