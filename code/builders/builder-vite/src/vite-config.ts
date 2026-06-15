import { resolve } from 'node:path';

import { getBuilderOptions, resolvePathInStorybookCache } from 'storybook/internal/common';
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

// Vite config that is common to development and production mode
export async function commonConfig(
  options: Options,
  _type: PluginConfigType
): Promise<ViteInlineConfig> {
  const configEnv = _type === 'development' ? configEnvServe : configEnvBuild;
  const { loadConfigFromFile, mergeConfig } = await import('vite');

  const { viteConfigPath, configLoader } = await getBuilderOptions<BuilderOptions>(options);

  const projectRoot = resolve(options.configDir, '..');

  // Keep this list aligned with the sibling Watchpack ignore list used by
  // `code/core/src/core-server/utils/watchConfig.ts` and
  // `watch-story-specifiers.ts`. It suppresses full reloads on changes to
  // tsconfig.json (which Vite's TypeScript plugin often marks as a
  // dependency of every TS module), tooling caches (.nx, .turbo, .cache), and
  // editor/project metadata.
  const DEFAULT_WATCH_IGNORED = [
    '**/.git/**',
    '**/node_modules/**',
    '**/.nx/**',
    '**/.turbo/**',
    '**/.cache/**',
    '**/tsconfig.json',
    '**/tsconfig.*.json',
    '**/tsconfig-*.json',
    '**/*.tsbuildinfo',
  ];

  // I destructure away the `build` property from the user's config object
  // I do this because I can contain config that breaks storybook, such as we had in a lit project.
  // If the user needs to configure the `build` they need to do so in the viteFinal function in main.js.
  const { config: { build: buildProperty = undefined, ...userConfig } = {} } =
    (await loadConfigFromFile(
      configEnv,
      viteConfigPath,
      projectRoot,
      undefined,
      undefined,
      configLoader
    )) ?? {};

  // Apply sensible defaults for `server.watch.ignored` only when the user
  // has not already configured them — we never override explicit user
  // configuration, only fill in the gap.
  const userIgnored = (userConfig as any)?.server?.watch?.ignored;
  const sbWatchIgnored = userIgnored ?? DEFAULT_WATCH_IGNORED;
  const patchedUserConfig = {
    ...userConfig,
    server: {
      ...((userConfig as any)?.server ?? {}),
      watch: {
        ...((userConfig as any)?.server?.watch ?? {}),
        ignored: sbWatchIgnored,
      },
    },
  };

  // Storybook's Vite config is assembled from self-contained plugins.
  // The config plugin handles base settings (root, cacheDir, resolve conditions, etc.),
  // while other plugins handle entry points, docgen, and runtime globals.
  // Shared vite plugins for mocking are defined in `./preset.ts` so that they can be
  // shared between @storybook/builder-vite and @storybook/addon-vitest.
  const sbConfig: InlineConfig = {
    configFile: false,
    plugins: await pluginConfig(options),
    root: projectRoot,
    // Allow storybook deployed as subfolder. See https://github.com/storybookjs/builder-vite/issues/238
    base: './',
    ...(options.cacheKey
      ? { cacheDir: resolvePathInStorybookCache('sb-vite', options.cacheKey) }
      : {}),
    // Pass build.target option from user's vite config
    build: {
      target: buildProperty?.target,
    },
  };

  const config: ViteConfig = mergeConfig(patchedUserConfig, sbConfig);

  return config;
}

export async function pluginConfig(options: Options) {
  const plugins = [
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
