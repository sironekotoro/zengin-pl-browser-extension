import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { applyExtensionVersion, loadExtensionVersion } from './extension-version.mjs';

const target = process.argv[2];
if (target !== 'chrome' && target !== 'firefox') {
  console.error('Usage: node scripts/build.mjs <chrome|firefox>');
  process.exit(1);
}

const root = path.join(import.meta.dirname, '..');
const outdir = path.join(root, 'dist', target);
const extensionVersion = await loadExtensionVersion(path.join(root, 'release-version.json'));
const manifestTemplatePath = path.join(root, `manifest/manifest.${target}.json`);
const manifestTemplate = JSON.parse(await readFile(manifestTemplatePath, 'utf8'));
const manifest = applyExtensionVersion(manifestTemplate, extensionVersion);

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
await writeFile(path.join(outdir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Built ${target} extension ${extensionVersion.version} (${extensionVersion.versionName}) into dist/${target}`);
