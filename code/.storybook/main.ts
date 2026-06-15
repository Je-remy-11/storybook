import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineMain } from '@storybook/react-vite/node';
import type { Options } from 'storybook/internal/types';

import react from '@vitejs/plugin-react';
import type { InlineConfig } from 'vite';

import { BROWSER_TARGETS } from '../core/src/shared/constants/environments-support.ts';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);

const componentsPath = join(currentDirPath, '../core/src/components/index.ts');
const managerApiPath = join(currentDirPath, '../core/src/manager-api/index.mock.ts');
const themingCreatePath = join(currentDirPath, '../core/src/theming/create.ts');
const themingPath = join(currentDirPath, '../core/src/theming/index.ts');
const imageContextPath = join(currentDirPath, '../frameworks/nextjs/src/image-context.ts');

type StoryDirectoryMapping = {
  dirs: string | string[];
  prefix?: string;
  files?: string;
};

const storyDirectoryMappings: StoryDirectoryMapping[] = [
  { dirs: '../core/template/stories', prefix: 'core' },
  { dirs: '../core/src/manager', prefix: 'manager' },
  { dirs: ['../core/src/preview-api', '../core/src/preview'], prefix: 'preview' },
  { dirs: '../core/src/shared', prefix: 'core/shared' },
  { dirs: '../core/src/components/brand', prefix: 'brand' },
  { dirs: '../core/src/components/components', prefix: 'components' },
  { dirs: '../core/src/component-testing/components', prefix: 'component-testing' },
  { dirs: '../core/src/controls/components', prefix: 'controls' },
  { dirs: '../core/src/highlight', prefix: 'highlight' },
  { dirs: '../core/src/actions/containers', prefix: 'actions' },
  {
    dirs: ['../addons/a11y/src', '../addons/a11y/template/stories'],
    prefix: 'addons/accessibility',
  },
  {
    dirs: ['../addons/docs/template/stories', '../addons/docs/src'],
    prefix: 'addons/docs',
  },
  { dirs: '../addons/links/template/stories', prefix: 'addons/links' },
  { dirs: '../addons/themes/template/stories', prefix: 'addons/themes' },
  { dirs: '../addons/onboarding/src', prefix: 'addons/onboarding' },
  { dirs: '../addons/onboarding/example-stories' },
  { dirs: '../addons/pseudo-states/src', prefix: 'addons/pseudo-states' },
  {
    dirs: ['../addons/vitest/src/components', '../addons/vitest/template/stories'],
    prefix: 'addons/vitest',
  },
  { dirs: '../addons/vitest/src', prefix: 'addons/vitest', files: 'stories.tsx' },
] as const;

const createStoryEntries = ({ dirs, prefix, files }: StoryDirectoryMapping) =>
  (Array.isArray(dirs) ? dirs : [dirs]).map((directory) => ({
    directory,
    ...(prefix ? { titlePrefix: prefix } : {}),
    ...(files ? { files } : {}),
  }));

const stories = [
  './bench/*.stories.@(js|jsx|ts|tsx)',
  ...storyDirectoryMappings.flatMap(createStoryEntries),
];

const config = defineMain({
  stories,
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
  previewAnnotations: [
    './core/template/stories/preview.ts',
    './renderers/react/template/components/index.js',
  ],
  build: {
    test: {
      // we have stories for the blocks here, we can't exclude them
      disableBlocks: false,
      // some stories in blocks (ArgTypes, Controls) depends on argTypes inference
      disableDocgen: false,
    },
  },
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
        // disable sourcemaps in CI to not run out of memory
        sourcemap: process.env.CI !== 'true',
        target: BROWSER_TARGETS,
      },
      server: {
        watch: {
          // Something odd happens with tsconfig and nx which causes Storybook to keep reloading, so we ignore them
          ignored: ['**/.nx/cache/**', '**/tsconfig.json'],
        },
      },
    } satisfies typeof viteConfig);
  },
});

export default config;
