import { describe, expect, it, vi } from 'vitest';

import type { Options, Presets } from 'storybook/internal/types';

import { loadConfigFromFile } from 'vite';

import { storybookConfigPlugin } from './plugins/storybook-config-plugin.ts';
import { commonConfig } from './vite-config.ts';

vi.mock('vite', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vite')>()),
  loadConfigFromFile: vi.fn(async () => ({})),
  defaultClientConditions: undefined,
}));
const loadConfigFromFileMock = vi.mocked(loadConfigFromFile);

const dummyOptions: Options = {
  packageJson: {},
  channel: new Channel({}),
  presets: {
    apply: async (key: string) =>
      ({
        framework: {
          name: '',
        },
        addons: [],
        core: {
          builder: {},
        },
        options: {},
      })[key],
  } as Presets,
  presetsList: [],
};

describe('commonConfig', () => {
  it('should set configFile to false and include plugins', async () => {
    loadConfigFromFileMock.mockReturnValueOnce(
  it('should pass configLoader option to loadConfigFromFile', async () => {
    const optionsWithConfigLoader: Options = {
      ...dummyOptions,
      presets: {
        apply: async (key: string) =>
          ({
            framework: { name: '' },
            addons: [],
            core: {
              builder: {
                name: '@storybook/builder-vite',
                options: {
                  configLoader: 'native',
                },
    expect(result.resolve.conditions).toContain('test');
  });

  it('should not set base when not provided', async () => {
    const plugins = storybookConfigPlugin({ configDir: '/test/.storybook' });
    const configPlugin = plugins.find((p) => p.name === 'storybook:config-plugin')!;

    const result = await (configPlugin.config as Function)({}, {});
    expect(result.base).toBeUndefined();
  });

  it('should allow storybook dir when server fs allow list exists', () => {
    const plugins = storybookConfigPlugin({ configDir: '/test/.storybook' });
    const allowPlugin = plugins.find((p) => p.name === 'storybook:allow-storybook-dir')!;

    const config = { server: { fs: { allow: ['/some/path'] } } };
    (allowPlugin.config as Function)(config);
    expect(config.server.fs.allow).toContain('/test/.storybook');
  });
});
    // Inline mock: this test asserts a specific call signature, so it needs its
    // own one-shot return value distinct from the shared default mock.
    // Verify loadConfigFromFile was called with configLoader as the 6th argument
    // The config hook receives the current Vite config and returns partial config to merge
