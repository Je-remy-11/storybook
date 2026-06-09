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

// https://esbuild.github.io/api/#target
export const NODE_TARGET: BuildOptions['target'] = 'node20.19';

// https://esbuild.github.io/api/#supported
export const SUPPORTED_FEATURES: BuildOptions['supported'] = {
  // React Native does not support class static blocks without a specific babel plugin
  'class-static-blocks': false,
};

// ---------------------------------------------------------------------------
// Runtime target resolution with environment-variable override support.
//
// CI 流水线可以通过设置 BROWSER_TARGETS_OVERRIDE / NODE_TARGET_OVERRIDE 来
// 动态改变浏览器/Node 支持范围；本地开发和未设置环境变量时使用上方默认值。
// ---------------------------------------------------------------------------

// esbuild target 的有效 token 格式：
//   es5 / es2015 / es2022 / esnext
//   chrome131 / edge134 / firefox136 / safari18.3 / ios18.3 / opera117 / node20.19
const ESBUILD_TARGET_TOKEN =
  /^(?:es(?:5|20\d{2}|next)|(?:chrome|edge|firefox|safari|ios|opera|node)\d+(?:\.\d+)?)$/;

function assertValidTargetToken(
  token: string,
  envVarName: string
): asserts token is NonNullable<BuildOptions['target']> extends (infer U)[]
  ? U
  : NonNullable<BuildOptions['target']> {
  const trimmed = token.trim();
  if (trimmed.length === 0 || !ESBUILD_TARGET_TOKEN.test(trimmed)) {
    throw new Error(
      `Invalid esbuild target token "${token}" provided via ${envVarName}. ` +
        `Expected a comma-separated list of tokens like "chrome131,safari18.3,es2022" or a ` +
        `single token like "node20.19". See https://esbuild.github.io/api/#target for the full list.`
    );
  }
}

function parseTargetsFromEnv(envVarName: string): string[] | null {
  const raw = process.env[envVarName];
  if (raw === undefined || raw === '') {
    return null;
  }
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * Resolve the effective browser esbuild target.
 *
 * When the `BROWSER_TARGETS_OVERRIDE` environment variable is set (e.g. in a CI
 * pipeline for a specific deployment environment), its comma-separated value is
 * used as the `target`. Otherwise the default `BROWSER_TARGETS` constant is used.
 *
 * Each token is validated against the esbuild target grammar. Invalid values
 * throw a descriptive error so CI failures are loud rather than silently
 * producing a mis-targeted bundle.
 */
export function getBrowserTargets(): BuildOptions['target'] {
  const overrides = parseTargetsFromEnv('BROWSER_TARGETS_OVERRIDE');
  if (!overrides) {
    return BROWSER_TARGETS;
  }
  overrides.forEach((token) => assertValidTargetToken(token, 'BROWSER_TARGETS_OVERRIDE'));
  return overrides as BuildOptions['target'];
}

/**
 * Resolve the effective Node esbuild target.
 *
 * When the `NODE_TARGET_OVERRIDE` environment variable is set (e.g. in a CI
 * pipeline targeting a specific Node runtime), its single-token value is used
 * as the `target`. Otherwise the default `NODE_TARGET` constant is used.
 */
export function getNodeTarget(): BuildOptions['target'] {
  const overrides = parseTargetsFromEnv('NODE_TARGET_OVERRIDE');
  if (!overrides) {
    return NODE_TARGET;
  }
  if (overrides.length !== 1) {
    throw new Error(
      `NODE_TARGET_OVERRIDE must contain exactly one target token (e.g. "node20.19"), ` +
        `but got: "${process.env.NODE_TARGET_OVERRIDE}".`
    );
  }
  const [token] = overrides;
  assertValidTargetToken(token, 'NODE_TARGET_OVERRIDE');
  return token;
}
