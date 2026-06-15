import { describe, expect, it, vi } from 'vitest';

import type { Options } from 'storybook/internal/types';
import type { UserConfig as ViteConfig } from 'vite';

import { viteFinal } from './vite-final-example.ts';

const DEV_ALIAS_KEYS = [
  'storybook/theming',
  'storybook/manager-api',
  'storybook/preview-api',
  'storybook/internal/theming',
];

const createOptions = (configType: 'DEVELOPMENT' | 'PRODUCTION'): Options =>
  ({ configType }) as Options;

const baseConfig = (): ViteConfig => ({
  resolve: { alias: {} },
  build: {},
});

describe('viteFinal', () => {
  describe('resolve.alias', () => {
    it('adds storybook aliases in DEVELOPMENT mode', async () => {
      const result = await viteFinal(baseConfig(), createOptions('DEVELOPMENT'));
      const aliasKeys = Object.keys(result.resolve?.alias ?? {});
      DEV_ALIAS_KEYS.forEach((key) => {
        expect(aliasKeys).toContain(key);
      });
    });

    it('does not add storybook aliases in PRODUCTION mode', async () => {
      const result = await viteFinal(baseConfig(), createOptions('PRODUCTION'));
      const aliasKeys = Object.keys(result.resolve?.alias ?? {});
      DEV_ALIAS_KEYS.forEach((key) => {
        expect(aliasKeys).not.toContain(key);
      });
    });

    it('preserves user-provided aliases in both modes', async () => {
      const userAliases = { '@components': '/src/components', '@utils': '/src/utils' };
      const configWithUserAliases: ViteConfig = {
        resolve: { alias: userAliases },
        build: {},
      };

      const devResult = await viteFinal(configWithUserAliases, createOptions('DEVELOPMENT'));
      const prodResult = await viteFinal(configWithUserAliases, createOptions('PRODUCTION'));

      expect(devResult.resolve?.alias).toMatchObject(userAliases);
      expect(prodResult.resolve?.alias).toMatchObject(userAliases);
    });
  });

  describe('build.sourcemap', () => {
    it('forces sourcemap to true when CI is set', async () => {
      vi.stubEnv('CI', 'true');
      const config = { ...baseConfig(), build: { sourcemap: false } };
      const result = await viteFinal(config, createOptions('DEVELOPMENT'));
      expect(result.build?.sourcemap).toBe(true);
      vi.unstubAllEnvs();
    });

    it('defaults sourcemap to true when unset and CI is falsy', async () => {
      vi.stubEnv('CI', '');
      const result = await viteFinal(baseConfig(), createOptions('DEVELOPMENT'));
      expect(result.build?.sourcemap).toBe(true);
      vi.unstubAllEnvs();
    });

    it('respects user sourcemap value when CI is falsy', async () => {
      vi.stubEnv('CI', '');
      const config = { ...baseConfig(), build: { sourcemap: 'inline' as const } };
      const result = await viteFinal(config, createOptions('PRODUCTION'));
      expect(result.build?.sourcemap).toBe('inline');
      vi.unstubAllEnvs();
    });

    it('forces sourcemap to true in PRODUCTION when CI is set', async () => {
      vi.stubEnv('CI', '1');
      const config = { ...baseConfig(), build: { sourcemap: 'hidden' as const } };
      const result = await viteFinal(config, createOptions('PRODUCTION'));
      expect(result.build?.sourcemap).toBe(true);
      vi.unstubAllEnvs();
    });
  });
});
