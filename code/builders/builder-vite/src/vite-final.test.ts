import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Options } from 'storybook/internal/types';

import type { InlineConfig } from 'vite';

import { viteFinal } from './vite-final.ts';

const originalCI = process.env.CI;

function makeOptions(configType: 'DEVELOPMENT' | 'PRODUCTION'): Options {
  return {
    configType,
    configDir: '',
    packageJson: {},
    presets: { apply: async () => ({}) } as any,
    presetsList: [],
  } as Options;
}

const baseConfig: InlineConfig = {
  resolve: {
    alias: {
      existing: 'path/to/existing',
    },
  },
  build: {},
};

afterEach(() => {
  process.env.CI = originalCI;
  vi.restoreAllMocks();
});

describe('viteFinal', () => {
  describe('DEVELOPMENT mode', () => {
    it('should include storybook/theming and other development aliases in resolve.alias', async () => {
      const result = await viteFinal(baseConfig, makeOptions('DEVELOPMENT'));

      const alias = result.resolve!.alias as Record<string, string>;
      expect(alias['storybook/theming']).toBe('storybook/internal/theming');
      expect(alias['storybook/manager-api']).toBe('storybook/internal/manager-api');
      expect(alias['storybook/preview-api']).toBe('storybook/internal/preview-api');
      expect(alias['storybook/channels']).toBe('storybook/internal/channels');
      expect(alias['storybook/client-logger']).toBe('storybook/internal/client-logger');
    });

    it('should preserve existing aliases when adding development aliases', async () => {
      const result = await viteFinal(baseConfig, makeOptions('DEVELOPMENT'));

      const alias = result.resolve!.alias as Record<string, string>;
      expect(alias['existing']).toBe('path/to/existing');
      expect(alias['storybook/theming']).toBe('storybook/internal/theming');
    });

    it('should set build.sourcemap to true when CI is set', async () => {
      process.env.CI = 'true';
      const result = await viteFinal(baseConfig, makeOptions('DEVELOPMENT'));

      expect(result.build!.sourcemap).toBe(true);
    });

    it('should set build.sourcemap to false when CI is not set', async () => {
      delete process.env.CI;
      const result = await viteFinal(baseConfig, makeOptions('DEVELOPMENT'));

      expect(result.build!.sourcemap).toBe(false);
    });
  });

  describe('PRODUCTION mode', () => {
    it('should not include storybook/theming and other development aliases in resolve.alias', async () => {
      const result = await viteFinal(baseConfig, makeOptions('PRODUCTION'));

      const alias = result.resolve!.alias as Record<string, string>;
      expect(alias['storybook/theming']).toBeUndefined();
      expect(alias['storybook/manager-api']).toBeUndefined();
      expect(alias['storybook/preview-api']).toBeUndefined();
      expect(alias['storybook/channels']).toBeUndefined();
      expect(alias['storybook/client-logger']).toBeUndefined();
    });

    it('should preserve existing aliases without adding development aliases', async () => {
      const result = await viteFinal(baseConfig, makeOptions('PRODUCTION'));

      const alias = result.resolve!.alias as Record<string, string>;
      expect(alias['existing']).toBe('path/to/existing');
    });

    it('should set build.sourcemap to true when CI is set', async () => {
      process.env.CI = 'true';
      const result = await viteFinal(baseConfig, makeOptions('PRODUCTION'));

      expect(result.build!.sourcemap).toBe(true);
    });

    it('should set build.sourcemap to false when CI is not set', async () => {
      delete process.env.CI;
      const result = await viteFinal(baseConfig, makeOptions('PRODUCTION'));

      expect(result.build!.sourcemap).toBe(false);
    });
  });

  describe('sourcemap across both modes', () => {
    it.each(['DEVELOPMENT', 'PRODUCTION'] as const)(
      'should set sourcemap=true in %s mode when CI="1"',
      async (configType) => {
        process.env.CI = '1';
        const result = await viteFinal(baseConfig, makeOptions(configType));

        expect(result.build!.sourcemap).toBe(true);
      }
    );

    it.each(['DEVELOPMENT', 'PRODUCTION'] as const)(
      'should set sourcemap=false in %s mode when CI is undefined',
      async (configType) => {
        delete process.env.CI;
        const result = await viteFinal(baseConfig, makeOptions(configType));

        expect(result.build!.sourcemap).toBe(false);
      }
    );
  });
});
