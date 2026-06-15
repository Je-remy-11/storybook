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

type StoryMapping = {
  dir: string;
  prefix?: string;
  files?: string;
};

const storyMappings: StoryMapping[] = [
  { dir: '../core/template/stories', prefix: 'core' },
  { dir: '../core/src/manager', prefix: 'manager' },
  { dir: '../core/src/preview-api', prefix: 'preview' },
  { dir: '../core/src/preview', prefix: 'preview' },
  { dir: '../core/src/shared', prefix: 'core/shared' },
  { dir: '../core/src/components/brand', prefix: 'brand' },
  { dir: '../core/src/components/components', prefix: 'components' },
  { dir: '../core/src/component-testing/components', prefix: 'component-testing' },
  { dir: '../core/src/controls/components', prefix: 'controls' },
  { dir: '../core/src/highlight', prefix: 'highlight' },
  { dir: '../core/src/actions/containers', prefix: 'actions' },
  { dir: '../addons/a11y/src', prefix: 'addons/accessibility' },
  { dir: '../addons/a11y/template/stories', prefix: 'addons/accessibility' },
  { dir: '../addons/docs/template/stories', prefix: 'addons/docs' },
  { dir: '../addons/docs/src', prefix: 'addons/docs' },
  { dir: '../addons/links/template/stories', prefix: 'addons/links' },
  { dir: '../addons/themes/template/stories', prefix: 'addons/themes' },
  { dir: '../addons/onboarding/src', prefix: 'addons/onboarding' },
  { dir: '../addons/onboarding/example-stories' },
  { dir: '../addons/pseudo-states/src', prefix: 'addons/pseudo-states' },
  { dir: '../addons/vitest/src/components', prefix: 'addons/vitest' },
  { dir: '../addons/vitest/template/stories', prefix: 'addons/vitest' },
  { dir: '../addons/vitest/src', prefix: 'addons/vitest', files: 'stories.tsx' },
];

const generatedStories = storyMappings.flatMap(({ dir, prefix, files }) => [
  {
    directory: dir,
    ...(prefix && { titlePrefix: prefix }),
    ...(files && { files }),
  },
]);

const config = defineMain({
  stories: [
    './bench/*.stories.@(js|jsx|ts|tsx)',
    ...generatedStories,
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
