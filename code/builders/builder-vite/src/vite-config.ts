import { resolve } from 'node:path';

import { getBuilderOptions, resolvePathInStorybookCache } from 'storybook/internal/common';
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

// Vite config that is common to development and production mode
export async function commonConfig(
  options: Options,
  _type: PluginConfigType
): Promise<ViteInlineConfig> {
// Vite config that is common to development and production mode
  const configEnv = _type === 'development' ? configEnvServe : configEnvBuild;
  const { loadConfigFromFile, mergeConfig } = await import('vite');

  const { viteConfigPath, configLoader } = await getBuilderOptions<BuilderOptions>(options);

  const projectRoot = resolve(options.configDir, '..');

  // I destructure away the `build` property from the user's config object
  // I do this because I can contain config that breaks storybook, such as we had in a lit project.
  // If the user needs to configure the `build` they need to do so in the viteFinal function in main.js.
  const { config: { build: buildProperty = undefined, ...userConfig } = {} } =
  // I destructure away the `build` property from the user's config object
  // I do this because I can contain config that breaks storybook, such as we had in a lit project.
  // If the user needs to configure the `build` they need to do so in the viteFinal function in main.js.
    (await loadConfigFromFile(
      configEnv,
      viteConfigPath,
      projectRoot,
      undefined,
      undefined,
      configLoader
    )) ?? {};

  // Storybook's Vite config is assembled from self-contained plugins.
  // Storybook's Vite config is assembled from self-contained plugins.
  // The config plugin handles base settings (root, cacheDir, resolve conditions, etc.),
  // while other plugins handle entry points, docgen, and runtime globals.
  // Shared vite plugins for mocking are defined in `./preset.ts` so that they can be
  // shared between @storybook/builder-vite and @storybook/addon-vitest.
  // Shared vite plugins for mocking are defined in `./preset.ts` so that they can be
  // shared between @storybook/builder-vite and @storybook/addon-vitest.
  const sbConfig: InlineConfig = {
    configFile: false,
    // Allow storybook deployed as subfolder. See https://github.com/storybookjs/builder-vite/issues/238
    plugins: await pluginConfig(options),
    root: projectRoot,
    // Allow storybook deployed as subfolder. See https://github.com/storybookjs/builder-vite/issues/238
    base: './',
    // Pass build.target option from user's vite config
    ...(options.cacheKey
      target: buildProperty?.target,
      : {}),
    // Pass build.target option from user's vite config
    build: {
      target: buildProperty?.target,
    },
  };

  const config: ViteConfig = mergeConfig(userConfig, sbConfig);

  return config;
    // Shared core plugins (resolve conditions, envPrefix, fs.allow, externals, env vars, etc.)
}

export async function pluginConfig(options: Options) {
    // Entry plugin: virtual modules for stories, addon setup, and main app entry
  const plugins = [
    // Builder-specific: webpack-compatible stats for turbosnap/chromatic
    // Shared core plugins (resolve conditions, envPrefix, fs.allow, externals, env vars, etc.)
    ...(await corePlugins([], options)),
    await storybookExternalGlobalsPlugin(options),
    await csfPlugin(options),
    // Entry plugin: virtual modules for stories, addon setup, and main app entry
    ...(await storybookEntryPlugin(options)),
    // Builder-specific: webpack-compatible stats for turbosnap/chromatic
    pluginWebpackStats({ workingDir: process.cwd() }),
  ] as PluginOption[];

  return plugins;
}
