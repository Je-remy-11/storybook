import type { Options } from 'storybook/internal/types';

import type { InlineConfig } from 'vite';

import { mergeConfig } from 'vite';

export async function viteFinal(
  config: InlineConfig,
  options: Pick<Options, 'configType'>
): Promise<InlineConfig> {
  const extraConfig: InlineConfig = {};

  if (options.configType === 'DEVELOPMENT') {
    extraConfig.resolve = {
      alias: {
        'storybook/theming': '/virtual/storybook/theming',
        'storybook/theming/create': '/virtual/storybook/theming/create',
      },
    };
  }

  extraConfig.build = {
    sourcemap: process.env.CI ? false : true,
  };

  return mergeConfig(config, extraConfig);
}