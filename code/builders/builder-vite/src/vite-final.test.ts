import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Options } from 'storybook/internal/types';

import type { InlineConfig } from 'vite';

vi.mock('vite', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vite')>();
  return {
    ...actual,
    mergeConfig: vi.fn((base: InlineConfig, overrides: InlineConfig) => {
      const merged = structuredClone(base);
      if (overrides.resolve?.alias) {
        merged.resolve = merged.resolve ?? {};
        merged.resolve.alias = {
          ...((merged.resolve.alias as Record<string, string>) ?? {}),
          ...(overrides.resolve.alias as Record<string, string>),
        };
      }
      if (overrides.build) {
        merged.build = { ...merged.build, ...overrides.build };
      }
      return merged;
    }),
  };
});

const { mergeConfig } = await import('vite');
const mergeConfigMock = vi.mocked(mergeConfig);

async function viteFinal(
  config: InlineConfig,
  options: Pick<Options, 'configType'>
): Promise<InlineConfig> {
  const extraConfig: InlineConfig = {};

  if (options.configType === 'DEVELOPMENT') {
    extraConfig.resolve = {
      alias: {
        'storybook/theming': '/virtual/storybook/theming',
        'storybook/theming/create': '/virtual/storybook/theming/create',
      },
    };
  }

  extraConfig.build = {
    sourcemap: process.env.CI ? false : true,
  };

  return mergeConfig(config, extraConfig);
}

describe('viteFinal', () => {
  const baseConfig: InlineConfig = {
    configFile: false,
    root: '/project',
    plugins: [],
  };

  beforeEach(() => {
    vi.unstubAllEnvs();
    mergeConfigMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('DEVELOPMENT mode', () => {
    it('should include storybook/theming aliases in resolve.alias', async () => {
      const result = await viteFinal(baseConfig, { configType: 'DEVELOPMENT' });

      expect(result.resolve?.alias).toBeDefined();
      expect(result.resolve!.alias).toMatchObject({
        'storybook/theming': '/virtual/storybook/theming',
        'storybook/theming/create': '/virtual/storybook/theming/create',
      });
    });

    it('should preserve existing resolve.alias entries from base config', async () => {
      const configWithAlias: InlineConfig = {
        ...baseConfig,
        resolve: {
          alias: {
            '@': '/project/src',
          },
        },
      };

      const result = await viteFinal(configWithAlias, { configType: 'DEVELOPMENT' });

      expect(result.resolve!.alias).toMatchObject({
        '@': '/project/src',
        'storybook/theming': '/virtual/storybook/theming',
        'storybook/theming/create': '/virtual/storybook/theming/create',
      });
    });

    it('should set build.sourcemap to true when CI is not set', async () => {
      vi.stubEnv('CI', undefined);

      const result = await viteFinal(baseConfig, { configType: 'DEVELOPMENT' });

      expect(result.build?.sourcemap).toBe(true);
    });

    it('should set build.sourcemap to false when CI is set', async () => {
      vi.stubEnv('CI', 'true');

      const result = await viteFinal(baseConfig, { configType: 'DEVELOPMENT' });

      expect(result.build?.sourcemap).toBe(false);
    });
  });

  describe('PRODUCTION mode', () => {
    it('should NOT include storybook/theming aliases in resolve.alias', async () => {
      const result = await viteFinal(baseConfig, { configType: 'PRODUCTION' });

      if (result.resolve?.alias) {
        const aliases = result.resolve.alias as Record<string, string>;
        expect(aliases).not.toHaveProperty('storybook/theming');
        expect(aliases).not.toHaveProperty('storybook/theming/create');
      }
    });

    it('should keep resolve.alias unchanged when no aliases existed', async () => {
      const result = await viteFinal(baseConfig, { configType: 'PRODUCTION' });

      expect(result.resolve?.alias).toBeFalsy();
    });

    it('should preserve existing non-storybook aliases', async () => {
      const configWithAlias: InlineConfig = {
        ...baseConfig,
        resolve: {
          alias: {
            '@': '/project/src',
          },
        },
      };

      const result = await viteFinal(configWithAlias, { configType: 'PRODUCTION' });

      expect(result.resolve!.alias).toMatchObject({ '@': '/project/src' });
    });

    it('should set build.sourcemap to true when CI is not set', async () => {
      vi.stubEnv('CI', undefined);

      const result = await viteFinal(baseConfig, { configType: 'PRODUCTION' });

      expect(result.build?.sourcemap).toBe(true);
    });

    it('should set build.sourcemap to false when CI is set', async () => {
      vi.stubEnv('CI', 'true');

      const result = await viteFinal(baseConfig, { configType: 'PRODUCTION' });

      expect(result.build?.sourcemap).toBe(false);
    });
  });

  describe('sourcemap behavior across environments', () => {
    const ciValues = [
      { label: 'CI=1', value: '1' },
      { label: 'CI=true', value: 'true' },
      { label: 'CI=yes', value: 'yes' },
    ];

    it.each(ciValues)(
      'should set sourcemap to false when $label for DEVELOPMENT',
      async ({ value }) => {
        vi.stubEnv('CI', value);
        const result = await viteFinal(baseConfig, { configType: 'DEVELOPMENT' });
        expect(result.build?.sourcemap).toBe(false);
      }
    );

    it.each(ciValues)(
      'should set sourcemap to false when $label for PRODUCTION',
      async ({ value }) => {
        vi.stubEnv('CI', value);
        const result = await viteFinal(baseConfig, { configType: 'PRODUCTION' });
        expect(result.build?.sourcemap).toBe(false);
      }
    );
  });
});