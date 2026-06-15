import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/vue3-vite';

const currentDir = dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: [
    join(currentDir, '../../vue-components/src/**/*.stories.@(js|ts)'),
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/vue3-vite',
    options: {
      docgen: 'vue-component-meta',
    },
  },
  core: {
    builder: '@storybook/builder-vite',
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;