import { readFile } from 'node:fs/promises';

const CHROME_COMPONENT_MAX = 65535;
const VERSION_NAME_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.\d{2}\.\d{4}(?:-r(?:[1-9]|[1-9]\d))?$/u;

function requireInteger(name, value, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isInteger(value) || value < 0 || value > maximum) {
    throw new Error(`${name} must be an integer between 0 and ${maximum}`);
  }
  return value;
}

function daysInMonth(year, month) {
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function parseDate(value) {
  if (typeof value !== 'string') throw new Error('date must be an ISO date in YYYY-MM-DD format');
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) throw new Error('date must be an ISO date in YYYY-MM-DD format');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const maximumDay = month >= 1 && month <= 12 ? daysInMonth(year, month) : undefined;
  if (maximumDay === undefined || day < 1 || day > maximumDay) throw new Error(`date is not a real calendar date: ${value}`);
  return { year, month, day };
}

function validateMachineComponents(components) {
  if (components.length < 1 || components.length > 4) throw new Error('extension version must contain 1 to 4 components');
  if (components.every((component) => component === 0)) throw new Error('extension version must not be all zero');
  for (const [index, component] of components.entries()) {
    requireInteger(`extension version component ${index + 1}`, component, CHROME_COMPONENT_MAX);
  }
}

export function deriveExtensionVersion(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('release version metadata must be an object');
  }
  const major = requireInteger('major', metadata.major, CHROME_COMPONENT_MAX);
  const minor = requireInteger('minor', metadata.minor, CHROME_COMPONENT_MAX);
  const revision = requireInteger('revision', metadata.revision, 99);
  const { year, month, day } = parseDate(metadata.date);
  const yy = String(year % 100).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const rr = String(revision).padStart(2, '0');
  const components = [major, minor, Number(`${yy}${mm}`), Number(`${dd}${rr}`)];
  validateMachineComponents(components);

  const version = components.join('.');
  const versionName = `${major}.${minor}.${yy}.${mm}${dd}${revision === 0 ? '' : `-r${revision}`}`;
  if (!VERSION_NAME_PATTERN.test(versionName)) throw new Error(`generated version_name has an invalid format: ${versionName}`);
  if (version.split('.').some((component) => component.length > 1 && component.startsWith('0'))) {
    throw new Error(`generated machine version contains a leading zero: ${version}`);
  }
  return Object.freeze({ version, versionName });
}

export async function loadExtensionVersion(metadataPath) {
  let metadata;
  try {
    metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read release version metadata at ${metadataPath}`, { cause: error });
  }
  return deriveExtensionVersion(metadata);
}

export function applyExtensionVersion(template, extensionVersion) {
  if (!template || typeof template !== 'object' || Array.isArray(template)) throw new Error('manifest template must be an object');
  if (Object.hasOwn(template, 'version') || Object.hasOwn(template, 'version_name')) {
    throw new Error('manifest templates must not duplicate version or version_name');
  }
  if (typeof template.name !== 'string' || !template.name) throw new Error('manifest template must contain a name');
  const output = {};
  for (const [key, value] of Object.entries(template)) {
    output[key] = value;
    if (key === 'name') {
      output.version = extensionVersion.version;
      output.version_name = extensionVersion.versionName;
    }
  }
  return output;
}
