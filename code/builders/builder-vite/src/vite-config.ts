import { resolve } from 'node:path';

import {
  BROWSER_TARGETS,
  getBrowserTargetsOverride,
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

  const browserTargetsOverride = getBrowserTargetsOverride();

  const sbConfig: InlineConfig = {
    configFile: false,
    plugins: await pluginConfig(options),
    root: projectRoot,
    base: './',
    ...(options.cacheKey
      ? { cacheDir: resolvePathInStorybookCache('sb-vite', options.cacheKey) }
      : {}),
    build: {
      target: browserTargetsOverride ?? buildProperty?.target ?? BROWSER_TARGETS,
    },
  };

  const config: ViteConfig = mergeConfig(userConfig, sbConfig);

  return config;
}

export async function pluginConfig(options: Options) {
  const plugins = [
    ...(await corePlugins([], options)),
    await storybookExternalGlobalsPlugin(options),
    await csfPlugin(options),
    ...(await storybookEntryPlugin(options)),
    pluginWebpackStats({ workingDir: process.cwd() }),
  ] as PluginOption[];

  return plugins;
}
