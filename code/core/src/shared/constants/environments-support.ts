import type { BuildOptions } from 'esbuild';

// https://esbuild.github.io/api/#target
export const BROWSER_TARGETS: BuildOptions['target'] = [
  'chrome131',
  'edge134',
  'firefox136',
  'safari18.3',
  'ios18.3',
  'opera117',
];

const OVERRIDE_ENV_VAR = 'BROWSER_TARGETS_OVERRIDE';

function parseBrowserTargetsOverride(raw: string): BuildOptions['target'] | null {
  const trimmed = raw.trim();

  // Try JSON array first: '["chrome120","firefox120"]'
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.every((t) => typeof t === 'string')) {
        return parsed;
      }
      console.warn(
        `[${OVERRIDE_ENV_VAR}] JSON value must be an array of strings, got: ${trimmed}`
      );
      return null;
    } catch {
      console.warn(
        `[${OVERRIDE_ENV_VAR}] Failed to parse JSON value: ${trimmed}`
      );
      return null;
    }
  }

  // Comma-separated fallback: 'chrome120,firefox120,safari17'
  const parts = trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length > 0) {
    return parts;
  }

  return null;
}

export function getBrowserTargets(): BuildOptions['target'] {
  const raw = process.env[OVERRIDE_ENV_VAR];
  if (!raw) {
    return BROWSER_TARGETS;
  }

  const override = parseBrowserTargetsOverride(raw);
  if (override) {
    return override;
  }

  console.warn(
    `[${OVERRIDE_ENV_VAR}] Invalid value, falling back to default BROWSER_TARGETS. ` +
      `Expected a JSON array (e.g. '["chrome120","firefox120"]') or comma-separated list (e.g. 'chrome120,firefox120').`
  );
  return BROWSER_TARGETS;
}

// https://esbuild.github.io/api/#target
export const NODE_TARGET: BuildOptions['target'] = 'node20.19';

// https://esbuild.github.io/api/#supported
export const SUPPORTED_FEATURES: BuildOptions['supported'] = {
  // React Native does not support class static blocks without a specific babel plugin
  'class-static-blocks': false,
};