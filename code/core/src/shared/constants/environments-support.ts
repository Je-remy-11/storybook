import type { BuildOptions, Supported } from 'esbuild';

export type BrowserTarget = string & { readonly __brand: unique symbol };

const BROWSER_TARGET_REGEX = /^(chrome|edge|firefox|safari|ios|opera|ie|node|es\d+)\d+(\.\d+)*$/;

export const BROWSER_TARGETS_ENV_KEY = 'BROWSER_TARGETS_OVERRIDE';

export const BROWSER_TARGETS: BuildOptions['target'] = [
  'chrome131',
  'edge134',
  'firefox136',
  'safari18.3',
  'ios18.3',
  'opera117',
];

export const NODE_TARGET: BuildOptions['target'] = ['node22'];

export const SUPPORTED_FEATURES: Supported = {
  'arrow': true,
  'const-and-let': true,
  'default-argument': true,
  'destructuring': true,
  'for-of': true,
  'generator': true,
  'optional-catch-binding': true,
  'optional-chain': true,
  'rest-argument': true,
  'template-literal': true,
  'unicode-es2015': true,
};

export function isValidBrowserTarget(target: string): target is BrowserTarget {
  return BROWSER_TARGET_REGEX.test(target);
}

export function parseBrowserTargets(input: string): BuildOptions['target'] {
  const targets = input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const invalid = targets.filter((t) => !isValidBrowserTarget(t));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid browser targets in ${BROWSER_TARGETS_ENV_KEY}: ${invalid.join(', ')}. ` +
        `Expected format: chrome100,edge100,firefox100,safari18,ios18,opera100`
    );
  }

  return targets;
}

export function getBrowserTargets(): BuildOptions['target'] {
  const override = process.env[BROWSER_TARGETS_ENV_KEY];
  if (!override) {
    return BROWSER_TARGETS;
  }

  try {
    const parsed = parseBrowserTargets(override);
    return parsed;
  } catch (err) {
    if (err instanceof Error) {
      console.warn(`${err.message} Falling back to default BROWSER_TARGETS.`);
    }
    return BROWSER_TARGETS;
  }
}


