import type { Plugin } from 'vite';

export interface IgnoreConfigWatchPluginOptions {
  patterns: (string | RegExp)[];
}

/**
 * Vite plugin that removes matching files from Vite's internal config file dependencies
 * to prevent them from triggering a full dev server restart on change.
 *
 * Vite watches certain config files (tsconfig.json, vite.config.ts, postcss.config.js, etc.)
 * as "config file dependencies". When any of these change, Vite triggers a full server restart,
 * which manifests as a full page reload in the browser.
 *
 * The `server.watch.ignored` option only affects the chokidar-based HMR watcher — it does NOT
 * prevent the config file watcher from triggering restarts. This plugin fills that gap by
 * filtering entries from Vite's internal `configFileDependencies` set.
 */
export function ignoreConfigWatchPlugin(options: IgnoreConfigWatchPluginOptions): Plugin {
  const { patterns } = options;

  const matches = (filePath: string): boolean =>
    patterns.some((pattern) => {
      if (pattern instanceof RegExp) {
        return pattern.test(filePath);
      }
      return filePath.includes(pattern) || filePath.endsWith(pattern);
    });

  return {
    name: 'storybook:ignore-config-watch-plugin',
    enforce: 'pre',
    configureServer(server) {
      const deps = server.config.configFileDependencies;
      if (!deps || deps.size === 0) {
        return;
      }

      const filtered = new Set<string>();
      for (const dep of deps) {
        if (!matches(dep)) {
          filtered.add(dep);
        }
      }
      server.config.configFileDependencies = filtered;
    },
  };
}