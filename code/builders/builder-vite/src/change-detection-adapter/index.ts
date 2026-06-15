import { relative } from 'node:path';

import type {
  ChangeDetectionAdapter,
  FileChangeEvent,
  ModuleResolveConfig,
} from 'storybook/internal/core-server';
import { globToRegexp } from 'storybook/internal/common';
import { logger } from 'storybook/internal/node-logger';

import { normalize } from 'pathe';
import type { ViteDevServer } from 'vite';

function stripLeadingPathPrefix(path: string) {
  return path.replace(/^[./\\]+/, '');
}

function createIgnoredPathMatcher(server: ViteDevServer): ((path: string) => boolean) | undefined {
  const ignored = server.config.server?.watch?.ignored;

  if (!ignored) {
    return undefined;
  }

  const ignoredEntries = Array.isArray(ignored) ? ignored : [ignored];
  const root = normalize(server.config.root);
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
    const relativePath = normalize(relative(root, normalizedPath));
    const candidates = new Set([
      normalizedPath,
      stripLeadingPathPrefix(normalizedPath),
      relativePath,
      `./${relativePath}`,
    ]);

    return [...candidates].some((candidate) => matchers.some((matcher) => matcher(candidate)));
  };
}

/**
 * Vite implementation of {@link ChangeDetectionAdapter}.
 *
 * - `getResolveConfig()` snapshots `server.config.resolve.alias`, `server.config.resolve.conditions`
 *   and `server.config.root` once at startup. The detector caches the result.
 * - `onFileChange()` subscribes to `server.watcher` (chokidar) and forwards `add`/`change`/`unlink`
 *   events with normalised absolute paths. Other chokidar event names (`addDir`, `unlinkDir`,
 *   `ready`, `raw`, `error`) are intentionally filtered out.
 */
export function createViteChangeDetectionAdapter(server: ViteDevServer): ChangeDetectionAdapter {
  const isIgnoredPath = createIgnoredPathMatcher(server);

  return {
    /**
     * Snapshots the Vite resolver configuration (aliases, conditions, root) once at
     * adapter creation time. If `vite.config.ts` is modified while Storybook is
     * running, this snapshot becomes stale and Storybook must be restarted to pick
     * up the updated aliases.
     *
     * A future improvement would subscribe to Vite's HMR config-reload event and
     * invalidate the resolver cache on config change.
     */
    async getResolveConfig(): Promise<ModuleResolveConfig> {
      logger.debug(
        'Change detection: snapshotting Vite resolve config (restart required if vite.config.ts changes)'
      );
      const resolveOpts = server.config.resolve;
      const alias = resolveOpts?.alias as ModuleResolveConfig['alias'];
      const conditions = resolveOpts?.conditions;

      return {
        projectRoot: server.config.root,
        alias,
        conditions,
      };
    },

    onFileChange(handler: (event: FileChangeEvent) => void) {
      const FORWARDED_EVENTS = new Set<FileChangeEvent['kind']>(['add', 'change', 'unlink']);
      const isForwardedEvent = (name: string): name is FileChangeEvent['kind'] =>
        FORWARDED_EVENTS.has(name as FileChangeEvent['kind']);

      const onAll = (eventName: string, path: string) => {
        if (!isForwardedEvent(eventName)) {
          return;
        }

        const normalizedPath = normalize(path);
        if (isIgnoredPath?.(normalizedPath)) {
          return;
        }

        handler({ kind: eventName, path: normalizedPath });
      };

      server.watcher.on('all', onAll);
      return () => {
        server.watcher.off('all', onAll);
      };
    },
  };
}
