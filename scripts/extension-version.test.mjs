import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyExtensionVersion, deriveExtensionVersion } from './extension-version.mjs';

const root = path.join(import.meta.dirname, '..');
const base = { major: 0, minor: 1, date: '2026-09-16', revision: 0 };

describe('extension version generation', () => {
  it('generates the initial 2026-09-16 release', () => {
    expect(deriveExtensionVersion(base)).toEqual({
      version: '0.1.2609.1600',
      versionName: '0.1.26.0916',
    });
  });

  it('increments both machine and display versions for a same-day revision', () => {
    expect(deriveExtensionVersion({ ...base, revision: 1 })).toEqual({
      version: '0.1.2609.1601',
      versionName: '0.1.26.0916-r1',
    });
  });

  it('does not emit leading zeroes in machine components for one-digit months and days', () => {
    const result = deriveExtensionVersion({ ...base, date: '2026-01-03' });
    expect(result).toEqual({ version: '0.1.2601.300', versionName: '0.1.26.0103' });
  });

  it('accepts revision 99', () => {
    expect(deriveExtensionVersion({ ...base, revision: 99 })).toEqual({
      version: '0.1.2609.1699',
      versionName: '0.1.26.0916-r99',
    });
  });

  it('rejects revision 100', () => {
    expect(() => deriveExtensionVersion({ ...base, revision: 100 })).toThrow(/revision must be an integer between 0 and 99/u);
  });

  it.each(['2026-02-29', '2026-02-30', '2026-13-01', '2026-00-01', '2026-09-31'])('rejects invalid date %s', (date) => {
    expect(() => deriveExtensionVersion({ ...base, date })).toThrow(/real calendar date/u);
  });

  it('rejects a Chrome component above 65535', () => {
    expect(() => deriveExtensionVersion({ ...base, major: 65536 })).toThrow(/major must be an integer between 0 and 65535/u);
  });

  it('is deterministic for the same metadata', () => {
    expect(deriveExtensionVersion(base)).toEqual(deriveExtensionVersion({ ...base }));
  });
});

describe('manifest version injection', () => {
  it('injects identical versions without changing browser-specific manifest fields', async () => {
    const extensionVersion = deriveExtensionVersion(base);
    const chrome = JSON.parse(await readFile(path.join(root, 'manifest/manifest.chrome.json'), 'utf8'));
    const firefox = JSON.parse(await readFile(path.join(root, 'manifest/manifest.firefox.json'), 'utf8'));
    const chromeOutput = applyExtensionVersion(chrome, extensionVersion);
    const firefoxOutput = applyExtensionVersion(firefox, extensionVersion);

    expect(chromeOutput.version).toBe(firefoxOutput.version);
    expect(chromeOutput.version_name).toBe(firefoxOutput.version_name);
    expect(chromeOutput.host_permissions).toEqual(chrome.host_permissions);
    expect(firefoxOutput.browser_specific_settings).toEqual(firefox.browser_specific_settings);
    expect(chrome).not.toHaveProperty('version');
    expect(firefox).not.toHaveProperty('version');
  });

  it('rejects version duplication in a source manifest', () => {
    expect(() => applyExtensionVersion({ name: 'test', version: '1.0' }, deriveExtensionVersion(base)))
      .toThrow(/must not duplicate version/u);
  });
});
