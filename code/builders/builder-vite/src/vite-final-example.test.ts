import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Channel } from 'storybook/internal/channels';
import type { Options, Presets } from 'storybook/internal/types';
import { viteFinal } from './vite-final-example.ts';

// 模拟 process.env
const mockEnv = vi.hoisted(() => ({
  CI: undefined,
}));

vi.stubEnv('CI', mockEnv.CI);

// 创建一个基础的 options 对象
const createMockOptions = (configType: 'DEVELOPMENT' | 'PRODUCTION'): Options => ({
  configType,
  configDir: '/test/.storybook',
  packageJson: {},
  channel: new Channel({}),
  presets: {
    apply: vi.fn(),
  } as Presets,
  presetsList: [],
});

describe('viteFinal', () => {
  // 每个测试前重置 mock
  beforeEach(() => {
    mockEnv.CI = undefined;
    vi.stubEnv('CI', '');
  });

  describe('开发模式 (configType = DEVELOPMENT)', () => {
    it('应该在 resolve.alias 中包含 storybook 相关别名', async () => {
      const mockOptions = createMockOptions('DEVELOPMENT');
      const baseConfig = {
        resolve: { alias: {} },
        build: {},
      };
      
      const result = await viteFinal(baseConfig, mockOptions);
      
      // 验证别名是否正确添加
      expect(result.resolve?.alias).toHaveProperty('storybook/theming');
      expect(result.resolve?.alias).toHaveProperty('storybook/manager-api');
      expect(result.resolve?.alias).toHaveProperty('storybook/preview-api');
      expect(result.resolve?.alias).toHaveProperty('storybook/internal/theming');
    });

    it('应该保留用户原始配置的别名', async () => {
      const mockOptions = createMockOptions('DEVELOPMENT');
      const baseConfig = {
        resolve: { 
          alias: { 
            '@components': '/src/components',
            '@utils': '/src/utils' 
          } 
        },
        build: {},
      };
      
      const result = await viteFinal(baseConfig, mockOptions);
      
      // 验证用户原始别名是否被保留
      expect(result.resolve?.alias).toHaveProperty('@components', '/src/components');
      expect(result.resolve?.alias).toHaveProperty('@utils', '/src/utils');
    });
  });

  describe('生产模式 (configType = PRODUCTION)', () => {
    it('不应该在 resolve.alias 中包含额外的 storybook 别名', async () => {
      const mockOptions = createMockOptions('PRODUCTION');
      const baseConfig = {
        resolve: { alias: {} },
        build: {},
      };
      
      const result = await viteFinal(baseConfig, mockOptions);
      
      // 验证额外的别名是否没有被添加
      expect(result.resolve?.alias).not.toHaveProperty('storybook/theming');
      expect(result.resolve?.alias).not.toHaveProperty('storybook/manager-api');
      expect(result.resolve?.alias).not.toHaveProperty('storybook/preview-api');
      expect(result.resolve?.alias).not.toHaveProperty('storybook/internal/theming');
    });

    it('应该保留用户原始配置的别名', async () => {
      const mockOptions = createMockOptions('PRODUCTION');
      const baseConfig = {
        resolve: { 
          alias: { 
            '@components': '/src/components',
            '@utils': '/src/utils' 
          } 
        },
        build: {},
      };
      
      const result = await viteFinal(baseConfig, mockOptions);
      
      // 验证用户原始别名是否被保留
      expect(result.resolve?.alias).toHaveProperty('@components', '/src/components');
      expect(result.resolve?.alias).toHaveProperty('@utils', '/src/utils');
    });
  });

  describe('build.sourcemap 配置', () => {
    it('当 CI 环境变量设置为 true 时，sourcemap 应该为 true', async () => {
      // 设置 CI 环境变量
      mockEnv.CI = 'true';
      vi.stubEnv('CI', 'true');
      
      const mockOptions = createMockOptions('DEVELOPMENT');
      const baseConfig = {
        resolve: { alias: {} },
        build: { sourcemap: false }, // 即使用户设置为 false，CI 环境下也应该为 true
      };
      
      const result = await viteFinal(baseConfig, mockOptions);
      
      expect(result.build?.sourcemap).toBe(true);
    });

    it('当 CI 环境变量未设置时，应该使用用户的 sourcemap 配置或默认值 true', async () => {
      // 未设置 CI 环境变量
      const mockOptions = createMockOptions('DEVELOPMENT');
      
      // 测试用户设置 sourcemap 为 false 的情况
      const configWithFalseSourcemap = {
        resolve: { alias: {} },
        build: { sourcemap: false },
      };
      
      const result1 = await viteFinal(configWithFalseSourcemap, mockOptions);
      expect(result1.build?.sourcemap).toBe(false);
      
      // 测试用户未设置 sourcemap 的情况，应该默认为 true
      const configWithoutSourcemap = {
        resolve: { alias: {} },
        build: {},
      };
      
      const result2 = await viteFinal(configWithoutSourcemap, mockOptions);
      expect(result2.build?.sourcemap).toBe(true);
      
      // 测试用户设置 sourcemap 为 'inline' 的情况
      const configWithInlineSourcemap = {
        resolve: { alias: {} },
        build: { sourcemap: 'inline' },
      };
      
      const result3 = await viteFinal(configWithInlineSourcemap, mockOptions);
      expect(result3.build?.sourcemap).toBe('inline');
    });

    it('在生产模式下，sourcemap 也应该根据 CI 环境正确设置', async () => {
      const mockOptions = createMockOptions('PRODUCTION');
      
      // 测试 CI 环境下的生产模式
      mockEnv.CI = 'true';
      vi.stubEnv('CI', 'true');
      
      const resultCi = await viteFinal(
        { resolve: { alias: {} }, build: { sourcemap: false } }, 
        mockOptions
      );
      expect(resultCi.build?.sourcemap).toBe(true);
      
      // 测试非 CI 环境下的生产模式
      mockEnv.CI = '';
      vi.stubEnv('CI', '');
      
      const resultNoCi = await viteFinal(
        { resolve: { alias: {} }, build: { sourcemap: 'hidden' } }, 
        mockOptions
      );
      expect(resultNoCi.build?.sourcemap).toBe('hidden');
    });
  });

  describe('完整配置验证', () => {
    it('应该正确合并所有配置，而不覆盖其他配置项', async () => {
      const mockOptions = createMockOptions('DEVELOPMENT');
      const baseConfig = {
        resolve: {
          alias: { '@test': '/test' },
          extensions: ['.ts', '.tsx', '.js', '.jsx'],
        },
        build: {
          sourcemap: 'inline',
          minify: 'terser',
        },
        server: {
          port: 6006,
        },
      };
      
      const result = await viteFinal(baseConfig, mockOptions);
      
      // 验证其他配置项是否被保留
      expect(result.resolve?.extensions).toEqual(['.ts', '.tsx', '.js', '.jsx']);
      expect(result.build?.minify).toBe('terser');
      expect(result.server?.port).toBe(6006);
      
      // 验证别名是否被正确添加
      expect(result.resolve?.alias).toHaveProperty('@test', '/test');
      expect(result.resolve?.alias).toHaveProperty('storybook/theming');
    });
  });
});
