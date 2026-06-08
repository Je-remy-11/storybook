import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  // 核心：通过 Composition 接入独立的 Vue Storybook
  refs: {
    vueComponents: {
      title: 'Vue 3 Components',
      url: 'http://localhost:6007', // 指向独立运行的 Vue Storybook 地址
    },
  },
};

export default config;
