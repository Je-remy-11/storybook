import type { Options } from 'storybook/internal/types';
import type { UserConfig as ViteConfig } from 'vite';

/**
 * 一个示例 viteFinal 函数，用于演示测试需求
 * 
 * @param config - 原始 Vite 配置
 * @param options - Storybook 选项对象
 * @returns 处理后的 Vite 配置
 */
export const viteFinal = async (
  config: ViteConfig,
  options: Options
): Promise<ViteConfig> => {
  const { configType } = options;
  
  // 配置别名，仅在开发模式下添加
  const alias = configType === 'DEVELOPMENT'
    ? {
        ...config.resolve?.alias,
        // 添加 storybook 相关别名
        'storybook/theming': 'storybook/theming',
        'storybook/manager-api': 'storybook/manager-api',
        'storybook/preview-api': 'storybook/preview-api',
        'storybook/internal/theming': 'storybook/internal/theming',
        // 可以继续添加其他需要的别名
      }
    : config.resolve?.alias;
  
  // 根据 CI 环境设置 sourcemap
  const sourcemap = process.env.CI ? true : (config.build?.sourcemap ?? true);
  
  // 返回合并后的配置
  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias,
    },
    build: {
      ...config.build,
      sourcemap,
    },
  };
};
