import type { Options } from 'storybook/internal/types';

import type { InlineConfig } from 'vite';

const DEVELOPMENT_ALIASES: Record<string, string> = {
  'storybook/theming': 'storybook/internal/theming',
  'storybook/manager-api': 'storybook/internal/manager-api',
  'storybook/preview-api': 'storybook/internal/preview-api',
  'storybook/channels': 'storybook/internal/channels',
  'storybook/client-logger': 'storybook/internal/client-logger',
};

export async function viteFinal(
  config: InlineConfig,
  options: Options
): Promise<InlineConfig> {
  const isDevelopment = options.configType === 'DEVELOPMENT';

  const alias = isDevelopment
    ? {
        ...(config.resolve?.alias instanceof Array ? {} : config.resolve?.alias),
        ...DEVELOPMENT_ALIASES,
      }
    : config.resolve?.alias;

  const sourcemap = !!process.env.CI;

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
}
