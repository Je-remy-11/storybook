# Storybook 多框架快速入门 - React + Vue

## 已完成的配置

✅ **配置文件更新**
- 修复了 `code/.storybook/main.ts` 中的重复内容
- 添加了 Vue 3 支持的配置
- 创建了 `code/.storybook/vue-support.ts` 工具文件

✅ **示例组件**
- 创建了完整的 Vue 3 组件库示例在 `vue-components/src/`
- Button 组件（支持多种类型和禁用状态）
- Card 组件（支持插槽）
- 完整的 Stories 和文档

✅ **文档**
- `MULTI_FRAMEWORK_SETUP_GUIDE.md` - 详细的配置指南
- `vue-components/README.md` - Vue 组件库说明

## 核心更改

### 1. 主要修改的文件

**`code/.storybook/main.ts`**
- 添加了 Vue 故事加载路径
- 集成了 Vue Vite 插件
- 保持了 React 作为主要框架

**新增文件**
- `code/.storybook/vue-support.ts` - Vue 插件加载工具
- `vue-components/src/` - Vue 3 组件库

### 2. 关键配置部分

#### Stories 配置
```typescript
{ 
  directory: '../../vue-components/src', 
  titlePrefix: 'Vue', 
  files: '**/*.stories.@(js|ts|jsx|tsx|vue)' 
}
```

#### Vite 插件配置
```typescript
plugins: [
  react(),
  ...vueVitePlugins,  // Vue 3 官方插件
  ...vueStorybookPlugins,  // Storybook Vue 插件
]
```

## 如何使用

### 步骤 1：安装依赖

在项目根目录运行：

```bash
yarn add -D @storybook/vue3-vite @vitejs/plugin-vue vue
```

### 步骤 2：启动 Storybook

```bash
cd code
yarn storybook:ui
```

### 步骤 3：查看 Vue 组件

在 Storybook 侧边栏中找到 `Vue/` 目录，即可看到我们的示例组件。

## 可用的命令

```bash
# 在 code 目录中
cd code

# 启动 Storybook
yarn storybook:ui

# 构建 Storybook
yarn storybook:ui:build

# 运行测试
yarn storybook:vitest
```

## 添加新的 Vue 组件

1. 在 `vue-components/src/` 创建新组件（例如 `MyComponent.vue`）
2. 创建对应的故事文件 `MyComponent.stories.ts`
3. 重新启动 Storybook（或等待热重载）

## 两种方案对比

### 方案 A：单实例配置（当前实现）
✅ 单一界面，便于统一查看  
✅ 资源占用较小  
⚠️ 配置复杂  
⚠️ 潜在的插件冲突  

### 方案 B：Storybook Composition（推荐）
✅ 官方支持，稳定可靠  
✅ 完全隔离，无冲突  
⚠️ 需要维护多个配置  
⚠️ 资源占用较大  

详细信息请查看 `MULTI_FRAMEWORK_SETUP_GUIDE.md`。

## 故障排除

### 问题：Vue 组件无法显示
- 检查是否正确安装了依赖
- 检查浏览器控制台是否有错误

### 问题：Vite 构建失败
- 确保插件顺序正确（react() 在 vue() 前面）
- 清理缓存：`rm -rf node_modules/.vite`

### 问题：类型错误
- 确保安装了 `@storybook/vue3-vite`
- 检查 `vue-components/` 目录的 `package.json`

## 文件结构概览

```
storybook/
├── MULTI_FRAMEWORK_SETUP_GUIDE.md  # 详细配置指南
├── QUICKSTART_MULTIFRAMEWORK.md    # 本文件
├── vue-components/                 # Vue 3 组件库
│   ├── src/
│   │   ├── Button.vue
│   │   ├── Button.stories.ts
│   │   ├── Card.vue
│   │   └── Card.stories.ts
│   ├── package.json
│   └── README.md
└── code/.storybook/
    ├── main.ts                     # 更新的主配置
    └── vue-support.ts              # 新增的 Vue 支持文件
```
