import { resolve } from 'node:path';

import {
  getBrowserTargets,
  getBuilderOptions,
  resolvePathInStorybookCache,
} from 'storybook/internal/common';
import type { Options } from 'storybook/internal/types';

import type {
  ConfigEnv,
  InlineConfig,
  PluginOption,
  UserConfig as ViteConfig,
  InlineConfig as ViteInlineConfig,
} from 'vite';

import {
  csfPlugin,
  pluginWebpackStats,
  storybookEntryPlugin,
  storybookExternalGlobalsPlugin,
} from './plugins/index.ts';
import { viteCorePlugins as corePlugins } from './preset.ts';
import type { BuilderOptions } from './types.ts';

export type PluginConfigType = 'build' | 'development';

const configEnvServe: ConfigEnv = {
  mode: 'development',
  command: 'serve',
  isSsrBuild: false,
};

const configEnvBuild: ConfigEnv = {
  mode: 'production',
  command: 'build',
  isSsrBuild: false,
};

export async function commonConfig(
  options: Options,
  _type: PluginConfigType
): Promise<ViteInlineConfig> {
  const configEnv = _type === 'development' ? configEnvServe : configEnvBuild;
  const { loadConfigFromFile, mergeConfig } = await import('vite');

  const { viteConfigPath, configLoader } = await getBuilderOptions<BuilderOptions>(options);

  const projectRoot = resolve(options.configDir, '..');

  const { config: { build: buildProperty = undefined, ...userConfig } = {} } =
    (await loadConfigFromFile(
      configEnv,
      viteConfigPath,
      projectRoot,
      undefined,
      undefined,
      configLoader
    )) ?? {};

  const buildTarget =
    _type === 'build'
      ? getBrowserTargets({ defaultTargets: buildProperty?.target })
      : buildProperty?.target;

  const sbConfig: InlineConfig = {
    configFile: false,
    plugins: await pluginConfig(options),
    root: projectRoot,
    base: './',
    ...(options.cacheKey
      ? { cacheDir: resolvePathInStorybookCache('sb-vite', options.cacheKey) }
      : {}),
    build: {
      target: buildTarget,
    },
  };

  const config: ViteConfig = mergeConfig(userConfig, sbConfig);

  return config;
}

export async function pluginConfig(options: Options): Promise<PluginOption[]> {
  const frameworkName = await options.presets.apply('framework');

  return [
    await csfPlugin(options),
    await injectExportOrderPlugin(options),
    await pluginWebpackStats(options),
    await storybookEntryPlugin(options),
    await externalGlobalsPlugin(options),
    ...(await corePlugins(options)),
  ];
}

async function injectExportOrderPlugin(options: Options): Promise<PluginOption> {
  const { injectExportOrderPlugin } = await import('storybook/internal/csf-tools');
  return injectExportOrderPlugin({
    storyStoreV7: options.features?.legacyMdx1 !== true,
  });
}

async function externalGlobalsPlugin(options: Options): Promise<PluginOption> {
  return storybookExternalGlobalsPlugin({
    ...options,
    globals: await options.presets.apply<Record<string, string>>('globals'),
  });
}
