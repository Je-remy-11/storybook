/**
 * Refactored stories configuration using a mapping table + flatMap.
 *
 * 设计思路：
 * - 将原本重复的 { directory, titlePrefix, files } 对象抽成一张映射表 storyMappings
 * - 每个映射条目定义 dir（目录路径）和可选的 prefix（标题前缀）、files（文件匹配）
 * - 利用 Array.flatMap() 将映射表展开为最终的 story entry 数组
 * - 对于没有 prefix 的条目（如 example-stories），省略 titlePrefix 字段
 * - 对于需要额外字段的条目（如 vitest/src 需指定 files），直接在映射表里声明
 *
 * 优势：
 * - 消除大量结构重复的模板代码
 * - 新增/修改一个 story 目录只需在映射表中增删一行
 * - prefix 与 dir 配对清晰，一目了然
 * - flatMap 保留了未来扩展的能力（如一个映射条目展开为多个 entry）
 */

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

/* ============================================================
 * 核心重构：映射表 + flatMap
 * ============================================================ */

/** 每个映射条目代表一组 story 配置 */
type StoryMapping = {
  /** 相对于 .storybook 目录的路径 */
  dir: string;
  /** 可选的标题前缀 */
  prefix?: string;
  /** 可选的文件匹配模式（覆盖默认的 stories glob） */
  files?: string;
};

/** 映射表：一行一个目录，新增/修改只需操作这里 */
const storyMappings: StoryMapping[] = [
  // ---- core ----
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
  // ---- addons ----
  { dir: '../addons/a11y/src', prefix: 'addons/accessibility' },
  { dir: '../addons/a11y/template/stories', prefix: 'addons/accessibility' },
  { dir: '../addons/docs/template/stories', prefix: 'addons/docs' },
  { dir: '../addons/docs/src', prefix: 'addons/docs' },
  { dir: '../addons/links/template/stories', prefix: 'addons/links' },
  { dir: '../addons/themes/template/stories', prefix: 'addons/themes' },
  { dir: '../addons/onboarding/src', prefix: 'addons/onboarding' },
  { dir: '../addons/onboarding/example-stories' },                      // 无 titlePrefix
  { dir: '../addons/pseudo-states/src', prefix: 'addons/pseudo-states' },
  { dir: '../addons/vitest/src/components', prefix: 'addons/vitest' },
  { dir: '../addons/vitest/template/stories', prefix: 'addons/vitest' },
  { dir: '../addons/vitest/src', prefix: 'addons/vitest', files: 'stories.tsx' }, // 带 files 覆盖
];

/**
 * 利用 flatMap 将映射表展开为 story entry 数组。
 *
 * 之所以用 flatMap 而非 map，是因为 flatMap 天然支持：
 * 1. 一个映射条目展开为多个 story entry（未来扩展）
 * 2. 条件性地过滤某些条目（返回空数组 [] 即可跳过）
 * 3. 保持最终的 stories 数组扁平
 */
const generatedStories = storyMappings.flatMap(({ dir, prefix, files }) => [
  {
    directory: dir,
    ...(prefix && { titlePrefix: prefix }),
    ...(files && { files }),
  },
]);

/* ============================================================
 * 最终 config
 * ============================================================ */

const config = defineMain({
  stories: [
    // 保留非结构化的 glob 条目
    './bench/*.stories.@(js|jsx|ts|tsx)',
    // 展开映射表生成的结构化条目
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