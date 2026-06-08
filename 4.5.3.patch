import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 假设我们正在测试某个框架或 builder 中的 viteFinal 函数。
// 此处提供了一个符合题意的 viteFinal 实现作为被测函数（实际中你会从 preset.ts 导入）。
const viteFinal = async (config: any, options: { configType: 'DEVELOPMENT' | 'PRODUCTION' }) => {
  const isDev = options.configType === 'DEVELOPMENT';
  
  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        // 开发模式下包含 storybook/theming 等额外别名
        ...(isDev ? { 'storybook/theming': '/mock/path/to/theming' } : {}),
      },
    },
    build: {
      ...config.build,
      // 两种模式下 build.sourcemap 的值根据 process.env.CI 正确设置
      // 此处逻辑为：CI 环境下关闭 sourcemap，非 CI 环境下开启
      sourcemap: process.env.CI !== 'true',
    },
  };
};

describe('viteFinal', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 每次测试前浅拷贝环境变量，避免不同测试用例之间的 process.env 污染
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // 测试后恢复原始环境变量并重置 mock
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('configType = DEVELOPMENT (开发模式)', () => {
    it('应该在 resolve.alias 中包含 storybook/theming，且非 CI 环境下 sourcemap 为 true', async () => {
      // 模拟非 CI 环境
      delete process.env.CI;

      const initialConfig = { resolve: { alias: { existing: 'alias' } } };
      const config = await viteFinal(initialConfig, { configType: 'DEVELOPMENT' });

      // 断言包含额外别名，且保留了原有的别名
      expect(config.resolve.alias).toHaveProperty('storybook/theming');
      expect(config.resolve.alias).toHaveProperty('existing', 'alias');

      // 断言根据 process.env.CI 正确设置了 sourcemap
      expect(config.build.sourcemap).toBe(true);
    });

    it('如果在 CI 环境中，sourcemap 应该设置为 false', async () => {
      // 模拟 CI 环境
      process.env.CI = 'true';

      const config = await viteFinal({}, { configType: 'DEVELOPMENT' });

      expect(config.build.sourcemap).toBe(false);
    });
  });

  describe('configType = PRODUCTION (生产模式)', () => {
    it('不应该在 resolve.alias 中包含 storybook/theming，且 CI 环境下 sourcemap 为 false', async () => {
      // 模拟 CI 环境
      process.env.CI = 'true';

      const initialConfig = { resolve: { alias: { existing: 'alias' } } };
      const config = await viteFinal(initialConfig, { configType: 'PRODUCTION' });

      // 断言不包含 storybook/theming 别名
      expect(config.resolve.alias).not.toHaveProperty('storybook/theming');
      // 确保并没有破坏原有的别名
      expect(config.resolve.alias).toHaveProperty('existing', 'alias');

      // 断言根据 process.env.CI 正确设置了 sourcemap
      expect(config.build.sourcemap).toBe(false);
    });
  });
});
