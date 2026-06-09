import type { BuildOptions } from 'esbuild';

export const BROWSER_TARGETS_OVERRIDE_ENV = 'BROWSER_TARGETS_OVERRIDE';

// https://esbuild.github.io/api/#target
export const BROWSER_TARGETS: BuildOptions['target'] = [
  'chrome131',
  'edge134',
  'firefox136',
  'safari18.3',
  'ios18.3',
  'opera117',
];

// https://esbuild.github.io/api/#target
export const NODE_TARGET: BuildOptions['target'] = 'node20.19';

// https://esbuild.github.io/api/#supported
export const SUPPORTED_FEATURES: BuildOptions['supported'] = {
  'class-static-blocks': false,
};

type BrowserTargetsEnvironment = Record<string, string | undefined>;

const isNonEmptyTarget = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const normalizeTarget = (value: string) => value.trim();

const normalizeTargets = (value: string[]): string[] | undefined => {
  const normalizedTargets = value.map(normalizeTarget);

  return normalizedTargets.every(Boolean) ? normalizedTargets : undefined;
};

const toBrowserTargets = (value: unknown): BuildOptions['target'] | undefined => {
  if (isNonEmptyTarget(value)) {
    return normalizeTarget(value);
  }

  if (Array.isArray(value)) {
    if (!value.every(isNonEmptyTarget)) {
      return undefined;
    }

    return normalizeTargets(value);
  }

  return undefined;
};

export const parseBrowserTargetsOverride = (
  value: string | undefined
): BuildOptions['target'] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return undefined;
  }

  if (!normalizedValue.startsWith('[') && !normalizedValue.startsWith('"')) {
    const normalizedTargets = normalizeTargets(normalizedValue.split(','));

    if (normalizedTargets) {
      return normalizedTargets.length === 1 ? normalizedTargets[0] : normalizedTargets;
    }
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(normalizedValue) as unknown;
  } catch {
    parsedValue = undefined;
  }

  const browserTargets = toBrowserTargets(parsedValue);

  if (browserTargets !== undefined) {
    return browserTargets;
  }

  throw new Error(
    `Expected ${BROWSER_TARGETS_OVERRIDE_ENV} to be a non-empty target string, a comma-separated target list, or a JSON string/JSON array of target strings.`
  );
};

export const getBrowserTargets = ({
  env = process.env,
  defaultTargets = BROWSER_TARGETS,
}: {
  env?: BrowserTargetsEnvironment;
  defaultTargets?: BuildOptions['target'];
} = {}): BuildOptions['target'] =>
  parseBrowserTargetsOverride(env[BROWSER_TARGETS_OVERRIDE_ENV]) ?? defaultTargets;
