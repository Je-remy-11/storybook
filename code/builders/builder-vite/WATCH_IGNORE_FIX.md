# Storybook / Vite 中 `tsconfig.json` 触发重新加载的问题分析与修复

## 问题描述

在 `server.watch.ignored` 中设置了 `**/.nx/cache/**` 和 `**/tsconfig.json`，但修改 `tsconfig.json` 后 Storybook 仍然会触发完整的页面重新加载。

## 根本原因

Vite 内部有两套**独立的**文件监听机制：

### 1. HMR 文件监听器（chokidar）

`server.watch.ignored` 只控制 chokidar 的忽略规则。当 chokidar 检测到文件变化时，Vite 会通过 HMR（Hot Module Replacement）将变更推送到浏览器。但如果文件被 `ignored` 排除，chokidar 就不会触发该文件的变化事件。

**问题：** `**/tsconfig.json` 是相对 glob 模式，chokidar 收到的是绝对路径，glob 匹配在绝对路径与相对模式之间可能不可靠，尤其在跨平台（Windows `\` vs POSIX `/`）时。

### 2. Vite 配置依赖监听器（configFileDependencies）

**这是真正的根本原因。** Vite 在启动时会解析 `tsconfig.json`（以及 `vite.config.ts`、`postcss.config.js` 等）并将它们加入内部的 `server.config.configFileDependencies` 集合。Vite 会**独立**监听这些文件——当它们变化时，Vite 会触发**完整的 dev server 重启**（`server.restart()`），在浏览器端表现为整页刷新。

**关键点：** `server.watch.ignored` 对此机制**完全无效**，因为 Vite 的 config file watcher 使用独立的 `fs.watch` 而非 chokidar。

---

## 修复方案

### 方案一：使用正则表达式 + 保留用户配置（已实现于 vite-server.ts）

**原理：** 将 `server.watch.ignored` 中的 glob 字符串改为正则表达式，同时保留用户通过 `vite.config.ts` 或 `viteFinal` 传入的自定义忽略规则。

**代码位置：** [code/builders/builder-vite/src/vite-server.ts](file:///app/storybook/code/builders/builder-vite/src/vite-server.ts)

```typescript
watch: {
  ...commonCfg.server?.watch,
  ignored: [
    // 继承用户自定义的忽略规则
    ...(Array.isArray(commonCfg.server?.watch?.ignored)
      ? commonCfg.server?.watch?.ignored
      : commonCfg.server?.watch?.ignored
        ? [commonCfg.server?.watch?.ignored]
        : []),
    // 使用正则表达式，不受绝对路径/相对路径影响
    /\.nx[\\/]cache/,
    /tsconfig\.json/,
  ],
},
```

**优点：**
- 正则表达式在 chokidar 中比 glob 字符串更可靠，不依赖路径前缀匹配
- 保留了用户自定义的 `ignored` 规则，不会覆盖用户配置
- 兼容 Windows 和 POSIX 的路径分隔符

**缺点：** 只解决了 chokidar 层面的问题，无法阻止 Vite 的 config file watcher 触发重启。

---

### 方案二：`ignoreConfigWatchPlugin` 插件（推荐，已实现）

**原理：** 编写一个 Vite 插件，在 `configureServer` 阶段从 `server.config.configFileDependencies` 中移除 `tsconfig.json` 和 `.nx/cache` 相关条目，阻止 Vite 的 config file watcher 检测到这些文件的变化。

**代码位置：** [code/builders/builder-vite/src/plugins/ignore-config-watch-plugin.ts](file:///app/storybook/code/builders/builder-vite/src/plugins/ignore-config-watch-plugin.ts)

```typescript
export function ignoreConfigWatchPlugin(options: IgnoreConfigWatchPluginOptions): Plugin {
  const { patterns } = options;

  const matches = (filePath: string): boolean =>
    patterns.some((pattern) => {
      if (pattern instanceof RegExp) {
        return pattern.test(filePath);
      }
      return filePath.includes(pattern) || filePath.endsWith(pattern);
    });

  return {
    name: 'storybook:ignore-config-watch-plugin',
    enforce: 'pre',
    configureServer(server) {
      const deps = server.config.configFileDependencies;
      if (!deps || deps.size === 0) {
        return;
      }

      const filtered = new Set<string>();
      for (const dep of deps) {
        if (!matches(dep)) {
          filtered.add(dep);
        }
      }
      server.config.configFileDependencies = filtered;
    },
  };
}
```

**已集成到 `vite-server.ts`：**

```typescript
// 在 createServer 之前自动注入插件
finalConfig.plugins = [
  ...(finalConfig.plugins ?? []),
  ignoreConfigWatchPlugin({ patterns: [/tsconfig\.json/, /\.nx[\\/]cache/] }),
];
return createServer(finalConfig);
```

**优点：**
- 从根源上解决了 Vite 的 config file watcher 重启问题
- 对用户透明，无需手动配置
- 支持正则和字符串两种匹配模式

**缺点：** 如果用户确实需要 `tsconfig.json` 修改后自动重启服务器（例如改了 `compilerOptions.paths` 影响别名解析），则需要手动移除该插件。

---

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| [vite-server.ts](file:///app/storybook/code/builders/builder-vite/src/vite-server.ts) | 修改 | 使用正则 + 继承用户配置；集成 ignoreConfigWatchPlugin |
| [ignore-config-watch-plugin.ts](file:///app/storybook/code/builders/builder-vite/src/plugins/ignore-config-watch-plugin.ts) | 新增 | 移除 configFileDependencies 中匹配文件的插件 |
| [ignore-config-watch-plugin.test.ts](file:///app/storybook/code/builders/builder-vite/src/plugins/ignore-config-watch-plugin.test.ts) | 新增 | 插件的单元测试 |
| [index.ts](file:///app/storybook/code/builders/builder-vite/src/plugins/index.ts) | 修改 | 导出 ignoreConfigWatchPlugin |

---

## 如何验证修复是否生效

### 1. 启动 Storybook 开发服务器

```bash
cd code && yarn storybook:ui
# 或者使用 sandbox
yarn task sandbox --template react-vite/default-ts --start-from auto
cd ../storybook-sandboxes/react-vite-default-ts && yarn storybook
```

### 2. 测试 tsconfig.json 变更

打开项目根目录的 `tsconfig.json`，做一个无副作用的修改（如添加一个空行），保存文件。

**预期成功：**
- 终端**没有**出现 `[vite] server restarted` 日志
- 浏览器页面**没有**刷新
- Storybook 正常运行

**预期失败：**
- 终端出现 `[vite] server restarted`
- 浏览器页面完全刷新

### 3. 测试 .nx/cache 变更

模拟 NX 缓存写入（在 `.nx/cache/` 目录下创建或修改文件）。

**预期成功：**
- 页面**没有**刷新
- 不会触发不必要的重新构建

### 4. 回归验证：HMR 正常工作

修改一个组件文件（如 `Button.stories.tsx` 中引用的组件），保存文件。

**预期成功：**
- 组件通过 HMR 局部热更新，页面**不进行整页刷新**
- 修改内容即时反映在浏览器中

### 5. 查看 Vite 日志

添加 `--debug` 参数启动 Storybook 可以查看 Vite 的详细日志：

```bash
yarn storybook --debug
```

观察日志中是否有 `config file changed` 或 `server restarted` 相关信息，以确认修复是否生效。

### 6. 运行单元测试

```bash
yarn nx test builder-vite
```

验证 `ignore-config-watch-plugin.test.ts` 中的测试全部通过。