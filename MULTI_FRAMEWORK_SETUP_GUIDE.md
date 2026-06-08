# Storybook 多框架（React + Vue）配置指南

## 概述

本指南将帮助你在同一个 Storybook 实例中同时支持 React 和 Vue 3 组件的文档化和开发。虽然 Storybook 官方不支持同时配置多个框架，但我们可以通过手动配置 Vite 插件来实现。

## 方案对比

### 方案一：Storybook Composition（推荐）

这是 Storybook 官方推荐的方案，通过创建独立的 Storybook 实例并组合它们。

**优点：**
- 配置简单，符合 Storybook 最佳实践
- 各个框架独立，互不干扰
- 官方支持，稳定性高

**缺点：**
- 需要维护多个 Storybook 配置
- 资源占用较高

### 方案二：手动 Vite 配置（本文重点）

手动配置 Vite 插件，同时支持 React 和 Vue 编译。

**优点：**
- 单一 Storybook 实例，便于管理
- 资源占用低
- 统一的用户体验

**缺点：**
- 配置复杂
- 需要手动处理潜在的冲突

---

## 方案二：手动 Vite 配置实现

### 1. 安装依赖

```bash
# Vue 3 相关
yarn add -D @storybook/vue3-vite @vitejs/plugin-vue vue vue-component-meta vue-docgen-api

# 如果使用 TSX
yarn add -D @vitejs/plugin-vue-jsx
```

### 2. 修改 `.storybook/main.ts`

```typescript
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 注意：这里我们只导入 React 的 defineMain 用于类型定义
import { defineMain } from '@storybook/react-vite/node';
import type { StorybookConfig } from 'storybook/internal/types';

import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import type { Plugin, InlineConfig } from 'vite';

import { BROWSER_TARGETS } from '../core/src/shared/constants/environments-support.ts';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);

const componentsPath = join(currentDirPath, '../core/src/components/index.ts');
const managerApiPath = join(currentDirPath, '../core/src/manager-api/index.mock.ts');
const themingCreatePath = join(currentDirPath, '../core/src/theming/create.ts');
const themingPath = join(currentDirPath, '../core/src/theming/index.ts');
const imageContextPath = join(currentDirPath, '../frameworks/nextjs/src/image-context.ts');

// 导入 Vue3 Vite 插件
const storybookVuePlugin = async (): Promise<Plugin[]> => {
  const { templateCompilation } = await import('../frameworks/vue3-vite/src/plugins/vue-template.ts');
  return [await templateCompilation()];
};

const config = defineMain({
  stories: [
    // 原有的 React stories
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
    
    // 新增的 Vue stories
    { directory: '../../vue-components/src', titlePrefix: 'Vue', files: '**/*.stories.@(js|ts|jsx|tsx|vue)' },
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
  // 注意：这里保留 React 作为主要框架，Vue 支持通过 Vite 插件实现
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  refs: {
    icons: {
      title: 'Icons',
      url: 'https://main--5ccbc373887ca40020446347.chromatic.com/',
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
    
    // 合并 React 和 Vue 的 Vite 插件
    const vuePlugins = await storybookVuePlugin();
    
    return mergeConfig(viteConfig, {
      resolve: {
        alias: configType === 'DEVELOPMENT'
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
      plugins: [
        // React 插件
        react(),
        // Vue 插件
        vue(),
        // Vue3 模板编译插件
        ...vuePlugins,
      ],
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
```

### 3. 修改 `.storybook/preview.ts`

创建或修改 preview 配置以支持 Vue 渲染：

```typescript
import type { Preview } from '@storybook/react';
import type { Preview as VuePreview } from '@storybook/vue3';

// 导入 Vue setup 函数
import { setup as setupVue } from '@storybook/vue3';

// 如果需要，为 Vue 应用配置全局插件
setupVue((app) => {
  // app.use(你的插件);
});

const preview: Preview & Partial<VuePreview> = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
```

### 4. 创建 Vue 组件示例

在 `../../vue-components/src/` 目录下创建 Vue 组件：

```vue
<!-- ../../vue-components/src/Button.vue -->
<template>
  <button :class="['vue-button', `vue-button--${type}`]" @click="onClick">
    <slot />
  </button>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  type: {
    type: String as () => 'primary' | 'secondary' | 'danger',
    default: 'primary',
  },
});

const emit = defineEmits<{
  click: [];
}>();

const onClick = () => {
  emit('click');
};
</script>

<style scoped>
.vue-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.vue-button--primary {
  background-color: #1e88e5;
  color: white;
}

.vue-button--secondary {
  background-color: #e3f2fd;
  color: #1e88e5;
}

.vue-button--danger {
  background-color: #e53935;
  color: white;
}
</style>
```

### 5. 创建 Vue Story 示例

```typescript
// ../../vue-components/src/Button.stories.ts
import type { Meta, StoryObj } from '@storybook/vue3';
import Button from './Button.vue';

const meta: Meta<typeof Button> = {
  title: 'Vue/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['primary', 'secondary', 'danger'],
    },
    onClick: { action: 'clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    type: 'primary',
  },
  render: (args) => ({
    components: { Button },
    setup() { return { args }; },
    template: '<Button v-bind="args">Primary Button</Button>',
  }),
};

export const Secondary: Story = {
  args: {
    type: 'secondary',
  },
  render: (args) => ({
    components: { Button },
    setup() { return { args }; },
    template: '<Button v-bind="args">Secondary Button</Button>',
  }),
};
```

---

## 方案一：Storybook Composition 实现（推荐）

### 1. 创建独立的 Vue Storybook 配置

在项目根目录创建一个 Vue 专用的 Storybook 配置目录：

```bash
mkdir -p .storybook-vue
```

### 2. 配置 Vue Storybook

创建 `.storybook-vue/main.ts`：

```typescript
import { defineMain } from '@storybook/vue3-vite/node';
import type { StorybookConfig } from '@storybook/vue3-vite';

const config: StorybookConfig = {
  stories: ['../../vue-components/src/**/*.stories.@(js|ts|jsx|tsx|vue)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public'],
};

export default config;
```

创建 `.storybook-vue/preview.ts`：

```typescript
import type { Preview } from '@storybook/vue3';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
```

### 3. 配置主 Storybook 引用 Vue 实例

在主 `.storybook/main.ts` 中添加 `refs` 配置：

```typescript
// 在现有配置中添加
refs: {
  icons: {
    title: 'Icons',
    url: 'https://main--5ccbc373887ca40020446347.chromatic.com/',
    expanded: false,
  },
  vue: {
    title: 'Vue Components',
    url: 'http://localhost:6007', // Vue Storybook 运行端口
    expanded: true,
  },
},
```

### 4. 添加 npm scripts

在 `package.json` 中添加：

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "storybook:vue": "storybook dev -p 6007 -c .storybook-vue",
    "storybook:build": "storybook build",
    "storybook:build:vue": "storybook build -c .storybook-vue -o storybook-static-vue"
  }
}
```

---

## 潜在冲突与解决方案

### 1. Vite 插件顺序冲突

**问题：** React 和 Vue 插件可能在处理某些文件时发生冲突。

**解决方案：** 确保插件顺序正确，Vue 插件在 React 插件之后：
```typescript
plugins: [
  react(), // 先处理 React 文件
  vue(),   // 再处理 Vue 文件
  ...vuePlugins,
]
```

### 2. 文档生成冲突

**问题：** 文档生成插件可能无法同时支持 React 和 Vue 的自动文档。

**解决方案：** 为 Vue 单独配置文档插件或使用 autodocs tags：

```typescript
// 在 Vue 组件故事中
tags: ['autodocs'],
```

### 3. 全局样式冲突

**问题：** React 和 Vue 组件可能有不同的全局样式要求。

**解决方案：** 使用 CSS Modules 或 scoped 样式，避免全局污染。

### 4. 预览上下文冲突

**问题：** React 和 Vue 可能需要不同的预览配置。

**解决方案：** 使用方案一的 Storybook Composition，完全隔离两个框架的预览环境。

---

## 验证与测试

1. 安装依赖：`yarn install`
2. 运行 Storybook：`yarn storybook`
3. 检查是否可以同时看到 React 和 Vue 组件的故事
4. 测试 Vue 组件的交互功能是否正常
5. 运行测试：`yarn test`

---

## 推荐方案

对于生产环境，我们**强烈推荐使用方案一（Storybook Composition）**，因为：
- 官方支持，更稳定
- 框架完全隔离，避免潜在的冲突
- 维护成本更低
- 更符合 Storybook 的设计理念

方案二（手动 Vite 配置）适合用于研究或小项目，因为它虽然实现了单一 Storybook 实例的目标，但需要更多的手动配置和维护。
