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
await cp(path.join(root, 'src/icons'), path.join(outdir, 'icons'), { recursive: true });
await cp(path.join(root, `manifest/manifest.${target}.json`), path.join(outdir, 'manifest.json'));

console.log(`Built ${target} extension into dist/${target}`);
