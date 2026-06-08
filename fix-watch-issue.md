# Storybook / Vite 中 `tsconfig.json` 触发重新加载的问题分析与修复

## 可能的原因

1. **Vite 内部机制 (Config Dependencies)**: Vite 会自动将 `tsconfig.json` 作为配置依赖 (config dependency) 进行监听。当这些配置文件发生变化时，Vite 会强制重启 dev server（在浏览器端表现为完整的页面重新加载）。Vite 内部直接将这些依赖添加到 chokidar 中，并且通常使用绝对路径，这可能会绕过或不匹配 `**/tsconfig.json` 这样的相对 glob 模式。
2. **Glob 模式与跨平台路径匹配问题**: 底层使用的 `chokidar` 在处理 `**/` 开头的 glob 模式时，可能由于绝对路径/相对路径的差异，或者跨平台路径分隔符（Windows 的 `\` vs POSIX 的 `/`）导致匹配失败。
3. **第三方插件的干预**: 某些 Vite 插件（如 `vite-tsconfig-paths` 或其他 TS 相关的插件）可能会主动向 watcher 中添加对 `tsconfig.json` 的监听，并在文件修改时显式触发 `full-reload` 事件。

---

## 修复方案

### 方案一：使用正则表达式替代 Glob 模式（推荐）
在 `chokidar` 中，使用正则表达式比 glob 字符串更健壮，可以无视绝对路径前缀和跨平台路径分隔符的问题。

```typescript
// .storybook/main.ts 或 vite.config.ts
export default {
  async viteFinal(config) {
    return {
      ...config,
      server: {
        ...config.server,
        watch: {
          ...config.server?.watch,
          // 使用正则表达式精确忽略这些文件
          ignored: [
            /\.nx[\\/]cache/,
            /tsconfig\.json/
          ]
        }
      }
    };
  }
}
```

### 方案二：通过绝对路径进行忽略
如果你必须使用字符串模式，建议使用 Node.js 的 `path.resolve` 转换为绝对路径，这样可以确保 Vite 和 chokidar 能够准确匹配到该文件。

```typescript
import path from 'path';

export default {
  async viteFinal(config) {
    return {
      ...config,
      server: {
        ...config.server,
        watch: {
          ...config.server?.watch,
          ignored: [
            path.resolve(__dirname, '../.nx/cache') + '/**',
            path.resolve(__dirname, '../tsconfig.json')
          ]
        }
      }
    };
  }
}
```

### 方案三：编写 Vite 插件移除配置依赖
如果正则表达式依然无法阻止 Vite 因 `configDependencies` 触发的重启，可以编写一个简单的 Vite 插件，在 `configureServer` 阶段清理 Vite 收集到的配置依赖。

```typescript
// .storybook/main.ts
const ignoreTsConfigPlugin = () => ({
  name: 'ignore-tsconfig-watch',
  configureServer(server) {
    // 将 tsconfig.json 从 Vite 的配置依赖中移除
    if (server.config.configFileDependencies) {
      server.config.configFileDependencies = server.config.configFileDependencies.filter(
        (dep) => !dep.endsWith('tsconfig.json')
      );
    }
  }
});

export default {
  async viteFinal(config) {
    config.plugins = config.plugins || [];
    config.plugins.push(ignoreTsConfigPlugin());
    return config;
  }
}
```

---

## 如何验证修复是否生效

1. **启动开发服务器**: 运行 Storybook 启动命令（如 `yarn storybook`），等待浏览器页面完全加载完毕。
2. **测试 tsconfig 变更**: 打开项目根目录的 `tsconfig.json` 文件，做一些无副作用的修改（例如添加一个空行或添加/删除一个空格），然后保存。
3. **观察行为**:
   - **预期成功结果**: 终端没有出现类似 `[vite] server restarted` 的日志，浏览器页面**没有**刷新。
   - **预期失败结果**: 页面刷新，或终端提示重启。
4. **验证正常 HMR**: 修改任意一个普通的组件文件（如 `Button.tsx`）并保存。确保组件的修改能正常触发局部热更新（HMR）而不是整页刷新，以确认我们没有意外破坏其他文件的监听。