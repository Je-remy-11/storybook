import path from 'path';

/**
 * 修复方案一：使用正则表达式替代 Glob 模式
 * 在 .storybook/main.ts 中配置 viteFinal
 */
export const viteFinalRegex = async (config: any) => {
  return {
    ...config,
    server: {
      ...config.server,
      watch: {
        ...config.server?.watch,
        // 使用正则表达式精确忽略缓存目录和 tsconfig.json
        ignored: [
          /\.nx[\\/]cache/,
          /tsconfig\.json/
        ]
      }
    }
  };
};

/**
 * 修复方案二：编写 Vite 插件移除配置依赖
 * 如果正则表达式依然无法阻止 Vite 重启，可使用此插件
 */
export const ignoreTsConfigPlugin = () => ({
  name: 'ignore-tsconfig-watch',
  configureServer(server: any) {
    // 将 tsconfig.json 从 Vite 的配置依赖中移除
    if (server.config.configFileDependencies) {
      server.config.configFileDependencies = server.config.configFileDependencies.filter(
        (dep: string) => !dep.endsWith('tsconfig.json')
      );
    }
  }
});

// 在 .storybook/main.ts 中结合使用插件的示例：
export const viteFinalWithPlugin = async (config: any) => {
  config.plugins = config.plugins || [];
  config.plugins.push(ignoreTsConfigPlugin());
  return config;
};
