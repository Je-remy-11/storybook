import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineMain } from '@storybook/react-vite/node';
import type { Options } from 'storybook/internal/types';

import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import type { InlineConfig } from 'vite';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);

const config = defineMain({
  stories: [
    // React stories - existing configuration
    '../src/**/*.stories.@(js|jsx|ts|tsx)',
    '../src/stories/**/*.stories.@(js|jsx|ts|tsx)',

    // Vue 3 stories - new configuration
    {
      directory: '../vue-components/src',
      titlePrefix: 'Vue Components',
      files: '**/*.stories.@(js|ts)',
    },
  ],

  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-links',
    '@storybook/addon-interactions',
  ],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  docs: {},

  typescript: {
    reactDocgen: 'react-docgen',
  },

  viteFinal: async (viteConfig: InlineConfig, { configType }: Options) => {
    const { mergeConfig } = await import('vite');

    return mergeConfig(viteConfig, {
      plugins: [
        react(),
        vue(),
      ],
      build: {
        sourcemap: true,
      },
    } satisfies typeof viteConfig);
  },
});

export default config;
