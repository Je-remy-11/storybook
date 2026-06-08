import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const config: StorybookConfig = {
  stories: [
    // 保持原有 React stories
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    // 增加 Vue stories 路径
    '../vue-components/src/**/*.stories.@(js|ts)'
  ],
  framework: {
    // 核心冲突点：此处必须保持 react-vite，不能同时写 vue3-vite
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(config) {
    // 注入 Vue 插件以编译 .vue 文件
    return mergeConfig(config, {
      plugins: [vue()],
      resolve: {
        alias: {
          // 确保 vue 被正确解析
          vue: 'vue/dist/vue.esm-bundler.js',
        },
      },
    });
  },
};

export default config;
