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

type StoryGroup = {
  prefix?: string;
  dirs: Array<string | { dir: string; files?: string }>;
};

const storyGroups: StoryGroup[] = [
  { prefix: 'core', dirs: ['../core/template/stories'] },
  { prefix: 'manager', dirs: ['../core/src/manager'] },
  { prefix: 'preview', dirs: ['../core/src/preview-api', '../core/src/preview'] },
  { prefix: 'core/shared', dirs: ['../core/src/shared'] },
  { prefix: 'brand', dirs: ['../core/src/components/brand'] },
  { prefix: 'components', dirs: ['../core/src/components/components'] },
  { prefix: 'component-testing', dirs: ['../core/src/component-testing/components'] },
  { prefix: 'controls', dirs: ['../core/src/controls/components'] },
  { prefix: 'highlight', dirs: ['../core/src/highlight'] },
  { prefix: 'actions', dirs: ['../core/src/actions/containers'] },
  {
    prefix: 'addons/accessibility',
    dirs: ['../addons/a11y/src', '../addons/a11y/template/stories'],
  },
  { prefix: 'addons/docs', dirs: ['../addons/docs/template/stories', '../addons/docs/src'] },
  { prefix: 'addons/links', dirs: ['../addons/links/template/stories'] },
  { prefix: 'addons/themes', dirs: ['../addons/themes/template/stories'] },
  { prefix: 'addons/onboarding', dirs: ['../addons/onboarding/src'] },
  { dirs: ['../addons/onboarding/example-stories'] },
  { prefix: 'addons/pseudo-states', dirs: ['../addons/pseudo-states/src'] },
  {
    prefix: 'addons/vitest',
    dirs: [
      '../addons/vitest/src/components',
      '../addons/vitest/template/stories',
      { dir: '../addons/vitest/src', files: 'stories.tsx' },
    ],
  },
];

const config = defineMain({
  stories: [
    './bench/*.stories.@(js|jsx|ts|tsx)',
    ...storyGroups.flatMap(({ prefix, dirs }) =>
      dirs.map((entry) => {
        const { dir, files } =
          typeof entry === 'string' ? { dir: entry, files: undefined } : entry;
        return {
          directory: dir,
          ...(prefix && { titlePrefix: prefix }),
          ...(files && { files }),
        };
      })
    ),
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
