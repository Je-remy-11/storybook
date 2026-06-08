# Vue 3 组件库示例

这是一个 Vue 3 组件库示例，用于在同一个 Storybook 实例中与 React 组件混合展示。

## 安装依赖

在 Storybook 项目根目录运行：

```bash
yarn add -D @storybook/vue3-vite @vitejs/plugin-vue vue @vue/tsconfig
```

## 已创建的组件

### 1. Button 组件
- 支持三种类型：primary、secondary、danger
- 支持 disabled 状态
- 位置：`src/Button.vue`
- 故事：`src/Button.stories.ts`

### 2. Card 组件
- 支持 header、content、footer 三个插槽
- 位置：`src/Card.vue`
- 故事：`src/Card.stories.ts`

## 配置说明

### 1. Stories 配置
在 `/app/storybook/code/.storybook/main.ts` 中，我们已添加：

```typescript
{ 
  directory: '../../vue-components/src', 
  titlePrefix: 'Vue', 
  files: '**/*.stories.@(js|ts|jsx|tsx|vue)' 
}
```

### 2. Vite 插件配置
在同一文件中，我们添加了 Vue 插件支持：

```typescript
plugins: [
  react(),
  ...vueVitePlugins,
  ...vueStorybookPlugins,
]
```

## 如何添加新的 Vue 组件

1. 在 `vue-components/src/` 中创建新的 Vue 组件文件
2. 创建对应的 `.stories.ts` 文件
3. 重新启动 Storybook 即可看到新组件

## 注意事项

虽然这种方式可以让 React 和 Vue 组件在同一个 Storybook 实例中展示，但这不是官方推荐的做法。更稳定的方式是使用 **Storybook Composition**（详见根目录下的 `MULTI_FRAMEWORK_SETUP_GUIDE.md`）。

## 相关文件

- `/app/storybook/MULTI_FRAMEWORK_SETUP_GUIDE.md` - 详细的多框架配置指南
- `/app/storybook/code/.storybook/main.ts` - Storybook 主配置文件
- `/app/storybook/code/.storybook/vue-support.ts` - Vue 支持工具函数
