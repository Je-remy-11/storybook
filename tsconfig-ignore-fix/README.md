# 修复 Storybook server.watch.ignored 配置问题

本目录包含了修复 Storybook 中 `server.watch.ignored` 配置未能正确忽略 tsconfig.json 问题的文件。

## 问题描述

即使在配置中设置了:
```javascript
server: {
  watch: {
    ignored: ['**/.nx/cache/**', '**/tsconfig.json']
  }
}
```

修改 tsconfig.json 仍然会触发 Storybook 的完整重新加载。

## 原因分析

1. Storybook 使用多个独立的文件监听系统
2. `server.watch.ignored` 只影响 Vite 的 chokidar 监听器
3. 不影响 Storybook 自己的 Watchpack 监听器
4. Vite 可能会将 tsconfig.json 识别为配置文件而强制重新加载

## 解决方案

查看以下文件了解不同的修复方案:

1. [main.ts.example](./main.ts.example) - 完整的 main.ts 配置示例
2. [vite.config.ts.example](./vite.config.ts.example) - Vite 配置示例
3. [4.1.5.patch](./4.1.5.patch) - Storybook 源代码的修复补丁（可选）
