import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Options, PresetProperty } from 'storybook/internal/types';

import react from '@vitejs/plugin-react';
import type { InlineConfig } from 'vite';

import { BROWSER_TARGETS } from '../core/src/shared/constants/environments-support.ts';
import { getVueVitePlugins, getVueStorybookPlugin } from './vue-support.ts';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);

const componentsPath = join(currentDirPath, '../core/src/components/index.ts');
const managerApiPath = join(currentDirPath, '../core/src/manager-api/index.mock.ts');
const themingCreatePath = join(currentDirPath, '../core/src/theming/create.ts');
const themingPath = join(currentDirPath, '../core/src/theming/index.ts');
const imageContextPath = join(currentDirPath, '../frameworks/nextjs/src/image-context.ts');

const config: PresetProperty<'config'> = {
  stories: [
    // 原有的 React stories（保持不变）
    { directory: '../core/src/stories', titlePrefix: 'components' },
    { directory: '../core/template/stories', titlePrefix: 'core' },
    { directory: '../core/src/manager', titlePrefix: 'manager' },
    { directory: '../core/src/preview-api', titlePrefix: 'preview' },
    { directory: '../core/src/preview', titlePrefix: 'preview' },
    { directory: '../core/src/shared', titlePrefix: 'core/shared' },
    { directory: '../core/src/components/brand', titlePrefix: 'brand' },
    { directory: '../core/src/components/components', titlePrefix: 'components' },
    { directory: '../core/src/component-testing/components', titlePrefix: 'component-testing' },
    { directory: '../core/src/controls/components', titlePrefix: 'controls' },
    { directory: '../core/src/highlight', titlePrefix: 'highlight' },
    { directory: '../core/src/actions/containers', titlePrefix: 'actions' },
    { directory: '../addons/a11y/src', titlePrefix: 'addons/accessibility' },
    { directory: '../addons/a11y/template/stories', titlePrefix: 'addons/accessibility' },
    { directory: '../addons/docs/template/stories', titlePrefix: 'addons/docs' },
    { directory: '../addons/docs/src', titlePrefix: 'addons/docs' },
    { directory: '../addons/links/template/stories', titlePrefix: 'addons/links' },
    { directory: '../addons/themes/template/stories', titlePrefix: 'addons/themes' },
    { directory: '../addons/onboarding/src', titlePrefix: 'addons/onboarding' },
    { directory: '../addons/onboarding/example-stories' },
    { directory: '../addons/pseudo-states/src', titlePrefix: 'addons/pseudo-states' },
    { directory: '../addons/vitest/src/components', titlePrefix: 'addons/vitest' },
    { directory: '../addons/vitest/template/stories', titlePrefix: 'addons/vitest' },
    { directory: '../addons/vitest/src', titlePrefix: 'addons/vitest', files: 'stories.tsx' },

    // 新增的 Vue 3 stories（从 ../../vue-components/src 目录加载）
    // 精确匹配 *.stories.@(js|ts)，避免与 React 的 tsx 混淆
    {
      directory: '../../vue-components/src',
      titlePrefix: 'Vue',
      files: '**/*.stories.@(js|ts)',
    },
  ],
  addons: [
    '@storybook/addon-onboarding',
    '@storybook/addon-themes',
    '@storybook/addon-docs',
    '@storybook/addon-designs',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-mcp',
    'storybook-addon-pseudo-states',
    '@chromatic-com/storybook',
    './services-preset.ts',
  ],
  previewAnnotations: async (entries: string[] = []) => {
    return [
      ...entries,
      './core/template/stories/preview.ts',
      './renderers/react/template/components/index.js',
      // Vue 3 渲染器注解 — 仅当 @storybook/vue3-vite 已安装时启用
      // 注：在同一个 Storybook 实例中混用两个渲染器，Vue 的 preview 需要条件化加载
      (await import('./vue-preview-annotation.ts')).default,
    ];
  },
  build: {
    test: {
      disableBlocks: false,
      disableDocgen: false,
    },
  },
  // ===== framework 字段说明 =====
  // Storybook 的 framework 是一个单例配置，只能声明一个"主框架"。
  // 这里继续保留 `@storybook/react-vite` 作为主框架，
  // 因为 React stories 数量更多，且它会自动注入：
  //   - @storybook/builder-vite 构建器
  //   - @storybook/react 渲染器（global renderer）
  // Vue 3 的支持通过以下方式补齐：
  //   1. viteFinal 中手动注入 @vitejs/plugin-vue + Vue 的 docgen/template 插件
  //   2. 通过 previewAnnotations 追加 Vue 的 preview 注解（渲染时按 story 类型分发）
  //   3. 在 package.json 中额外安装 @storybook/vue3-vite 以便引用其内部工具
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  refs: {
    icons: {
      title: 'Icons',
      url: 'https://main--64b56e737c0aeefed9d5e675.chromatic.com',
      expanded: false,
    },
  },
  core: {
    disableTelemetry: true,
    changeDetection: true,
  },
  features: {
    developmentModeForBuild: true,
    experimentalTestSyntax: true,
    experimentalDocgenServer: true,
    experimentalReactComponentMeta: true,
    changeDetection: true,
  },
  staticDirs: [{ from: './bench/bundle-analyzer', to: '/bundle-analyzer' }],
  viteFinal: async (viteConfig: InlineConfig, { configType }: Options) => {
    const { mergeConfig } = await import('vite');

    // 获取 Vue 相关 Vite 插件
    const vueVitePlugins = await getVueVitePlugins();
    const vueStorybookPlugins = await getVueStorybookPlugin();

    return mergeConfig(viteConfig, {
      resolve: {
        alias:
          configType === 'DEVELOPMENT'
            ? {
                'storybook/internal/components': componentsPath,
                'storybook/manager-api': managerApiPath,
                'storybook/theming/create': themingCreatePath,
                'storybook/theming': themingPath,
                'sb-original/image-context': imageContextPath,
              }
            : {
                'storybook/manager-api': managerApiPath,
              },
        // ===== 关键：让 Vite 同时解析 .vue 和 .tsx 的扩展名 =====
        // Vue 的 .vue SFC 需要显式加入，否则 import './Button.vue' 会报找不到
        extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
      },
      plugins: [
        // React 插件放在 Vue 插件前面
        react({
          // 让 React 插件只处理 .tsx/.jsx，避免与 Vue 的 .vue SFC 争抢
          include: /\.(t|j)sx?$/,
          exclude: [/\.vue$/],
        }),
        // Vue 插件放在 React 之后，处理 .vue 文件
        // 注意：@vitejs/plugin-vue 默认会注入它自己的 JSX 转换 (vue-jsx)，
        // 我们通过传入 explicit jsx: false 禁用，避免与 React 的 JSX 冲突
        ...vueVitePlugins,
        ...vueStorybookPlugins,
      ],
      optimizeDeps: {
        // ===== 预构建排除与包含 =====
        // Vue 的运行时库需要被 Vite 预构建，否则冷启动时会出现 ESM/CJS 混合导入问题
        include: ['vue', '@storybook/vue3', '@storybook/vue3-vite'],
      },
      build: {
        sourcemap: process.env.CI !== 'true',
        target: BROWSER_TARGETS,
        // 解决 Vue SFC 和 React 的 rollup chunk 冲突
        commonjsOptions: {
          transformMixedEsModules: true,
        },
      },
      server: {
        watch: {
          ignored: ['**/.nx/cache/**', '**/tsconfig.json'],
        },
      },
      ssr: {
        // Vue 组件在 SSR 场景下需要特殊处理，这里作为外部化依赖以避免打包问题
        external: ['vue', '@vue/compiler-sfc'],
      },
    } satisfies typeof viteConfig);
  },
};

export default config;
