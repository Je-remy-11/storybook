import { join, relative } from 'node:path';

import { globToRegexp } from 'storybook/internal/common';
import type { Options } from 'storybook/internal/types';

import type { Server } from 'http';
import { normalize } from 'pathe';
import type { InlineConfig, ServerOptions, ViteDevServer } from 'vite';

import { createViteLogger } from './logger.ts';
import { commonConfig } from './vite-config.ts';

type IgnoredWatchValue = NonNullable<Exclude<ServerOptions['watch'], null>['ignored']>;
type WatchedPaths = Record<string, string[]>;

function stripLeadingPathPrefix(path: string) {
  return path.replace(/^[./\\]+/, '');
}

function createIgnoredPathMatcher(
  root: string,
  ignored: IgnoredWatchValue | undefined
): ((path: string) => boolean) | undefined {
  if (!ignored) {
    return undefined;
  }

  const ignoredEntries = Array.isArray(ignored) ? ignored : [ignored];
  const normalizedRoot = normalize(root);
  const matchers = ignoredEntries.flatMap<(path: string) => boolean>((entry) => {
    if (typeof entry === 'string') {
      const regexp = globToRegexp(entry);
      return [(candidate) => regexp.test(candidate)];
    }

    if (entry instanceof RegExp) {
      return [(candidate) => entry.test(candidate)];
    }

    if (typeof entry === 'function') {
      return [(candidate) => Boolean(entry(candidate))];
    }

    return [];
  });

  if (matchers.length === 0) {
    return undefined;
  }

  return (path: string) => {
    const normalizedPath = normalize(path);
    const relativePath = normalize(relative(normalizedRoot, normalizedPath));
    const candidates = new Set([
      normalizedPath,
      stripLeadingPathPrefix(normalizedPath),
      relativePath,
      `./${relativePath}`,
    ]);

    return [...candidates].some((candidate) => matchers.some((matcher) => matcher(candidate)));
  };
}

function collectWatchedPaths(server: ViteDevServer): string[] {
  const watchedPaths = server.watcher.getWatched() as WatchedPaths;

  return Object.entries(watchedPaths).flatMap(([directory, entries]) =>
    entries.map((entry) => normalize(join(directory, entry)))
  );
}

function filterIgnoredWatchPaths(server: ViteDevServer) {
  const ignored = server.config.server.watch?.ignored as IgnoredWatchValue | undefined;
  const isIgnoredPath = createIgnoredPathMatcher(server.config.root, ignored);

  if (!isIgnoredPath) {
    return;
  }

  const ignoredWatchedPaths = collectWatchedPaths(server).filter(isIgnoredPath);
  if (ignoredWatchedPaths.length > 0) {
    void server.watcher.unwatch(ignoredWatchedPaths);
  }

  const originalAdd = server.watcher.add.bind(server.watcher);
  server.watcher.add = ((paths: string | readonly string[]) => {
    const pathList = Array.isArray(paths) ? [...paths] : [paths];
    const allowedPaths = pathList
      .map((path) => normalize(path))
      .filter((path) => !isIgnoredPath(path));

    if (allowedPaths.length === 0) {
      return server.watcher;
    }

    return originalAdd(Array.isArray(paths) ? allowedPaths : allowedPaths[0]);
  }) as typeof server.watcher.add;
}

export async function createViteServer(options: Options, devServer: Server) {
  const { presets } = options;

  const commonCfg = await commonConfig(options, 'development');

  const { allowedHosts } = await presets.apply('core', {});
  const existingServerConfig = commonCfg.server ?? {};
  const existingHmrConfig =
    typeof existingServerConfig.hmr === 'object' && existingServerConfig.hmr !== null
      ? existingServerConfig.hmr
      : undefined;

  const config: InlineConfig & { server: ServerOptions } = {
    ...commonCfg,
    server: {
      ...existingServerConfig,
      allowedHosts,
      middlewareMode: true,
      hmr: {
        ...existingHmrConfig,
        port: options.port,
        server: devServer,
      },
      fs: {
        ...existingServerConfig.fs,
        strict: true,
      },
    },
    appType: 'custom' as const,
  };

  if (
    options.host === '0.0.0.0' &&
    (!allowedHosts || (Array.isArray(allowedHosts) && allowedHosts.length === 0))
  ) {
    config.server.allowedHosts = true;
  }

  const finalConfig = await presets.apply('viteFinal', config, options);

  const { createServer } = await import('vite');

  finalConfig.customLogger ??= await createViteLogger();
  const server = await createServer(finalConfig);
  filterIgnoredWatchPaths(server);
  return server;
}
