import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  core: {
    builder: '@storybook/builder-vite',
  },
  refs: (_config: any, { configType }: { configType: string }) => {
    if (configType === 'DEVELOPMENT') {
      return {
        'vue-components': {
          title: 'Vue 3 Components',
          url: 'http://localhost:6007',
          expanded: false,
        },
      };
    }
    return {};
  },

  viteFinal: async (config) => {
    return config;
  },

  docs: {
    autodocs: 'tag',
  },
};

export default config;