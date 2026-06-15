import type { Options } from 'storybook/internal/types';
import type { UserConfig as ViteConfig } from 'vite';

/**
 * Dev-only resolve aliases for Storybook packages. These are only added in
 * DEVELOPMENT mode so that HMR paths stay predictable. In PRODUCTION builds,
 * the real package exports are used instead.
 */
const DEV_ALIASES = {
  'storybook/theming': 'storybook/theming',
  'storybook/manager-api': 'storybook/manager-api',
  'storybook/preview-api': 'storybook/preview-api',
  'storybook/internal/theming': 'storybook/internal/theming',
} as const;

/**
 * Example viteFinal hook used by the accompanying unit test. In real
 * frameworks the hook is usually provided by the framework preset.
 */
export const viteFinal = async (
  config: ViteConfig,
  options: Options
): Promise<ViteConfig> => {
  const { configType } = options;

  const alias =
    configType === 'DEVELOPMENT'
      ? { ...config.resolve?.alias, ...DEV_ALIASES }
      : config.resolve?.alias;

  const sourcemap = process.env.CI ? true : (config.build?.sourcemap ?? true);

  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias,
    },
    build: {
      ...config.build,
      sourcemap,
    },
  };
};
