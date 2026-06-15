# React + Vue 3 双框架 Storybook 方案

## 一、核心问题

Storybook 的 `framework` 字段（main.ts）只能指定 **一个** 框架，每个框架映射到唯一的渲染器（renderer）：

```
@storybook/react-vite  → renderer: @storybook/react/preset
@storybook/vue3-vite    → renderer: @storybook/vue3/preset
```

渲染器负责 `renderToCanvas`、decorators、argTypes 增强等核心渲染逻辑。**同一个 Storybook 构建进程不可能同时加载两个渲染器**，因为它们在运行时互斥。

## 二、推荐方案：Composed Storybooks（组合实例）

使用 Storybook 内置的 `refs` 机制，将两个独立的 Storybook 实例组合到同一个 UI 中。

### 目录结构

```
project/
├── .storybook/                  # React Storybook（宿主）
│   ├── main.ts                  # React 配置 + refs
│   └── preview.tsx              # React preview（不变）
├── .storybook-vue/              # Vue Storybook（子实例）
│   ├── main.ts                  # Vue 配置
│   └── preview.ts               # Vue preview
├── src/                         # React 组件（不变）
├── ../vue-components/           # Vue 组件
│   └── src/
│       └── **/*.stories.@(js|ts)
├── package.json
└── vite.config.ts
```

### 运行方式

```bash
# 开发模式 - 需要两个终端
# 终端 1: 启动 Vue Storybook（先启动，因为 React 宿主会引用它）
yarn storybook:vue    # 运行在 http://localhost:6007

# 终端 2: 启动 React Storybook（宿主）
yarn storybook        # 运行在 http://localhost:6006

# 或使用 concurrently 同时启动
yarn storybook:all
```

## 三、main.ts 修改要点

### 3.1 React 宿主 main.ts（`.storybook/main.ts`）

需要修改的部分：

1. **`refs`**：指向 Vue Storybook 实例。这是核心变更，通过此配置将 Vue stories 引用到 React Storybook 的侧边栏中。

2. **`framework`**：保持 `@storybook/react-vite`，不修改。React 渲染器继续负责渲染 React stories。

3. **`stories`**：不添加 Vue stories 的 glob。Vue stories 由 Vue Storybook 实例独立扫描和加载。

4. **`viteFinal`**：不需要额外修改。React 的 Vite 插件由 `@storybook/react-vite` preset 自动添加。

### 3.2 Vue Storybook main.ts（`.storybook-vue/main.ts`）

需要配置的部分：

1. **`framework`**：设为 `@storybook/vue3-vite`。这会自动：
   - 加载 `@storybook/vue3` 渲染器
   - 添加 Vue SFC 编译插件（`vue-template-compilation`）
   - 添加 docgen 插件（`vue-docgen-api` 或 `vue-component-meta`）
   - 配置 `vue` 别名指向 `vue/dist/vue.esm-bundler.js`

2. **`stories`**：指向 `../vue-components/src/**/*.stories.@(js|ts)`

3. **`viteFinal`**：`@storybook/vue3-vite` preset 会自动处理：
   - `templateCompilation()` —— 配置 Vue 别名和 SFC 编译
   - `vueDocgen()` 或 `vueComponentMeta()` —— 自动生成 Props/Events/Slots 文档
   - 如果使用 `vue-component-meta`，需要确保根目录有 `tsconfig.json`

### 3.3 Vue Storybook preview.ts（`.storybook-vue/preview.ts`）

Vue 专用的 preview 配置。如果 Vue 组件依赖全局注册的插件（如 Vue Router、Pinia），需要在这里通过 decorators 注入。

## 四、package.json 脚本配置

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "storybook:build": "storybook build",
    "storybook:vue": "storybook dev -c .storybook-vue -p 6007",
    "storybook:vue:build": "storybook build -c .storybook-vue -o storybook-static/vue",
    "storybook:all": "concurrently \"yarn storybook\" \"yarn storybook:vue\""
  }
}
```

关键新增依赖：
```json
{
  "@storybook/vue3-vite": "^8.0.0",
  "@storybook/vue3": "^8.0.0",
  "@vitejs/plugin-vue": "^5.0.0",
  "concurrently": "^8.0.0"
}
```

## 五、冲突点与解决方案

### 5.1 渲染器互斥（根本冲突）

**问题**：Storybook 的 `framework` 是单值字段，无法同时加载 React 和 Vue 渲染器。

**解决**：使用 Composed Storybooks，每个实例独立运行各自的渲染器。

### 5.2 端口冲突

**问题**：两个 Storybook 实例默认都使用端口 6006。

**解决**：Vue 实例使用 `-p 6007` 指定不同端口。

### 5.3 styles/theme 不一致

**问题**：React 和 Vue 实例可能使用不同的主题或全局样式。

**解决**：在各自的 `preview.ts` 中通过 `decorators` 注入各自的全局样式。

### 5.4 共享 addons 版本冲突

**问题**：`@storybook/addon-essentials`、`@storybook/addon-docs` 等 addons 必须在两个实例的版本完全一致。

**解决**：确保根 `package.json` 中 Storybook 相关包使用相同的版本号。通过 resolutions/overrides 锁定版本。

### 5.5 Vite 缓存冲突

**问题**：两个 Storybook 实例共享同一个 `node_modules/.vite` 缓存目录可能导致问题。

**解决**：在 `.storybook-vue/main.ts` 中配置独立的缓存目录：

```typescript
viteFinal: async (config) => {
  const { mergeConfig } = await import('vite');
  return mergeConfig(config, {
    cacheDir: 'node_modules/.vite-storybook-vue',
  });
}
```

### 5.6 生产构建和部署

**问题**：`refs` 在开发环境指向 `http://localhost:6007`，生产环境需要指向部署后的 Vue Storybook。

**解决**：分别构建两个实例，将 Vue Storybook 的输出部署到可访问的 URL：

```typescript
refs: (_config, { configType }) => {
  if (configType === 'DEVELOPMENT') {
    return {
      'vue-components': {
        title: 'Vue 3 Components',
        url: 'http://localhost:6007',
      },
    };
  }
  // 生产环境指向部署的 Vue Storybook
  return {
    'vue-components': {
      title: 'Vue 3 Components',
      url: process.env.VUE_STORYBOOK_URL || '/storybook-vue',
    },
  };
},
```

### 5.7 TypeScript 配置差异

**问题**：React 和 Vue 可能使用不同的 `tsconfig.json`（如不同的 JSX 配置、路径别名等）。

**解决**：Vue Storybook 会在其 `framework.options.docgen.tsconfig` 中使用独立的 tsconfig。如果 Vue 组件目录有自己的 `tsconfig.json`，可以通过此选项指定。

## 六、备选方案：自定义复合 Framework Preset（实验性）

如果不希望运行两个进程，可以尝试创建自定义 preset 手动加载两个渲染器：

```
project/
├── .storybook/
│   ├── main.ts
│   └── multi-framework-preset.ts   # 自定义 preset
```

```typescript
// multi-framework-preset.ts
import type { PresetProperty } from 'storybook/internal/types';

export const core: PresetProperty<'core'> = async () => {
  return {
    builder: await import.meta.resolve('@storybook/builder-vite'),
    renderer: await import.meta.resolve('@storybook/react/preset'),
  };
};
```

**局限性**：
- 只能有一个主渲染器，另一个框架的组件需要手动提供 render 函数
- Docs 自动文档生成只对主框架生效
- 不推荐在生产环境使用

## 七、总结

| 方面 | Composed Storybooks（推荐）| 自定义复合 Preset |
|------|---------------------------|-------------------|
| 架构复杂度 | 低 | 高 |
| 维护成本 | 低 | 高 |
| Docs 支持 | 完整（各自独立）| 部分 |
| 开发体验 | 需要两个进程 | 单个进程 |
| 可靠性 | 官方支持 | 实验性 |