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

type SimpleMapping = { dir: string; prefix: string };
type AddonMapping = { base: string; prefix: string; subdirs: string[] };
type DirectEntry = { directory: string; titlePrefix?: string; files?: string };
type StoryMapping = SimpleMapping | AddonMapping | DirectEntry;

function isSimpleMapping(m: StoryMapping): m is SimpleMapping {
  return 'dir' in m && 'prefix' in m && !('subdirs' in m);
}

function isAddonMapping(m: StoryMapping): m is AddonMapping {
  return 'base' in m && 'subdirs' in m;
}

function expandStoryMapping(mapping: StoryMapping): DirectEntry[] {
  if (isAddonMapping(mapping)) {
    return mapping.subdirs.map((subdir) => ({
      directory: `${mapping.base}/${subdir}`,
      titlePrefix: mapping.prefix,
    }));
  }
  if (isSimpleMapping(mapping)) {
    return [{ directory: mapping.dir, titlePrefix: mapping.prefix }];
  }
  return [mapping];
}

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
  { base: '../addons/a11y', prefix: 'addons/accessibility', subdirs: ['src', 'template/stories'] },
  { base: '../addons/docs', prefix: 'addons/docs', subdirs: ['template/stories', 'src'] },
  { base: '../addons/links', prefix: 'addons/links', subdirs: ['template/stories'] },
  { base: '../addons/themes', prefix: 'addons/themes', subdirs: ['template/stories'] },
  { base: '../addons/onboarding', prefix: 'addons/onboarding', subdirs: ['src'] },
  { base: '../addons/pseudo-states', prefix: 'addons/pseudo-states', subdirs: ['src'] },
  { base: '../addons/vitest', prefix: 'addons/vitest', subdirs: ['src/components', 'template/stories'] },
  { directory: '../addons/onboarding/example-stories' },
  { directory: '../addons/vitest/src', titlePrefix: 'addons/vitest', files: 'stories.tsx' },
];

const config = defineMain({
  stories: [
    './bench/*.stories.@(js|jsx|ts|tsx)',
    ...storyMappings.flatMap(expandStoryMapping),
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
      disableBlocks: false,
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
        sourcemap: process.env.CI !== 'true',
        target: BROWSER_TARGETS,
      },
      server: {
        watch: {
          ignored: ['**/.nx/cache/**', '**/tsconfig.json'],
        },
      },
    } satisfies typeof viteConfig);
  },
});

export default config;
