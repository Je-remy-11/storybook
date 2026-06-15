import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { StorybookConfig, Options } from 'storybook/internal/types';

import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import type { InlineConfig } from 'vite';

import { BROWSER_TARGETS } from '../core/src/shared/constants/environments-support.ts';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);
const vueProjectRoot = join(currentDirPath, '../../vue-components');
const vueStoriesRoot = join(vueProjectRoot, 'src');
const isVueDocsMode = process.env.STORYBOOK_FRAMEWORK === 'vue3';
const vueStorybookUrl = process.env.STORYBOOK_VUE3_DOCS_URL;

const componentsPath = join(currentDirPath, '../core/src/components/index.ts');
const managerApiPath = join(currentDirPath, '../core/src/manager-api/index.mock.ts');
const themingCreatePath = join(currentDirPath, '../core/src/theming/create.ts');
const themingPath = join(currentDirPath, '../core/src/theming/index.ts');
const imageContextPath = join(currentDirPath, '../frameworks/nextjs/src/image-context.ts');

const reactStories = [
  './bench/*.stories.@(js|jsx|ts|tsx)',
  {
    directory: '../core/template/stories',
    titlePrefix: 'core',
  },
  {
    directory: '../core/src/manager',
    titlePrefix: 'manager',
  },
  {
    directory: '../core/src/preview-api',
    titlePrefix: 'preview',
  },
  {
    directory: '../core/src/preview',
    titlePrefix: 'preview',
  },
  {
    directory: '../core/src/shared',
    titlePrefix: 'core/shared',
  },
  {
    directory: '../core/src/components/brand',
    titlePrefix: 'brand',
  },
  {
    directory: '../core/src/components/components',
    titlePrefix: 'components',
  },
  {
    directory: '../core/src/component-testing/components',
    titlePrefix: 'component-testing',
  },
  {
    directory: '../core/src/controls/components',
    titlePrefix: 'controls',
  },
  {
    directory: '../core/src/highlight',
    titlePrefix: 'highlight',
  },
  {
    directory: '../core/src/actions/containers',
    titlePrefix: 'actions',
  },
  {
    directory: '../addons/a11y/src',
    titlePrefix: 'addons/accessibility',
  },
  {
    directory: '../addons/a11y/template/stories',
    titlePrefix: 'addons/accessibility',
  },
  {
    directory: '../addons/docs/template/stories',
    titlePrefix: 'addons/docs',
  },
  {
    directory: '../addons/docs/src',
    titlePrefix: 'addons/docs',
  },
  {
    directory: '../addons/links/template/stories',
    titlePrefix: 'addons/links',
  },
  {
    directory: '../addons/themes/template/stories',
    titlePrefix: 'addons/themes',
  },
  {
    directory: '../addons/onboarding/src',
    titlePrefix: 'addons/onboarding',
  },
  {
    directory: '../addons/onboarding/example-stories',
  },
  {
    directory: '../addons/pseudo-states/src',
    titlePrefix: 'addons/pseudo-states',
  },
  {
    directory: '../addons/vitest/src/components',
    titlePrefix: 'addons/vitest',
  },
  {
    directory: '../addons/vitest/template/stories',
    titlePrefix: 'addons/vitest',
  },
  {
    directory: '../addons/vitest/src',
    titlePrefix: 'addons/vitest',
    files: 'stories.tsx',
  },
];

const vueStories = [
  {
    directory: '../../vue-components/src',
    files: '**/*.stories.@(js|ts)',
    titlePrefix: 'vue',
  },
];

const commonConfig = {
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
  build: {
    test: {
      disableBlocks: false,
      disableDocgen: false,
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
    changeDetection: true,
  },
  staticDirs: [{ from: './bench/bundle-analyzer', to: '/bundle-analyzer' }],
} satisfies Pick<StorybookConfig, 'addons' | 'build' | 'core' | 'features' | 'staticDirs'>;

const baseRefs = {
  icons: {
    title: 'Icons',
    url: 'https://main--64b56e737c0aeefed9d5e675.chromatic.com',
    expanded: false,
  },
};

const createReactViteConfig = (): StorybookConfig => ({
  ...commonConfig,
  stories: reactStories,
  previewAnnotations: [
    './core/template/stories/preview.ts',
    './renderers/react/template/components/index.js',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  features: {
    ...commonConfig.features,
    experimentalReactComponentMeta: true,
  },
  refs: vueStorybookUrl
    ? {
        ...baseRefs,
        vue3: {
          title: 'Vue 3',
          url: vueStorybookUrl,
          expanded: false,
        },
      }
    : baseRefs,
  viteFinal: async (viteConfig: InlineConfig, { configType }: Options) => {
    const { mergeConfig } = await import('vite');

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
      },
      plugins: [react()],
      build: {
        sourcemap: process.env.CI !== 'true',
        target: BROWSER_TARGETS,
      },
      server: {
        watch: {
          ignored: ['**/.nx/cache/**', '**/tsconfig.json'],
        },
      },
    });
  },
});

const createVueViteConfig = (): StorybookConfig => ({
  ...commonConfig,
  stories: vueStories,
  previewAnnotations: ['./core/template/stories/preview.ts'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {
      docgen: {
        plugin: 'vue-component-meta',
        tsconfig: '../../vue-components/tsconfig.json',
      },
    },
  },
  refs: baseRefs,
  viteFinal: async (viteConfig: InlineConfig) => {
    const { mergeConfig } = await import('vite');

    return mergeConfig(viteConfig, {
      resolve: {
        dedupe: ['vue'],
      },
      plugins: [vue()],
      build: {
        sourcemap: process.env.CI !== 'true',
        target: BROWSER_TARGETS,
      },
      server: {
        fs: {
          allow: [vueProjectRoot, vueStoriesRoot],
        },
        watch: {
          ignored: ['**/.nx/cache/**', '**/tsconfig.json'],
        },
      },
    });
  },
});

const config = isVueDocsMode ? createVueViteConfig() : createReactViteConfig();

export default config;
