import { describe, expect, it } from 'vitest';

import { ignoreConfigWatchPlugin } from './ignore-config-watch-plugin.ts';

function createFakeServer(configFileDeps?: string[]) {
  return {
    config: {
      configFileDependencies: new Set(configFileDeps ?? []),
    },
  } as any;
}

describe('ignoreConfigWatchPlugin', () => {
  it('removes matching files from configFileDependencies', () => {
    const server = createFakeServer([
      '/project/tsconfig.json',
      '/project/vite.config.ts',
      '/project/postcss.config.js',
      '/project/package.json',
    ]);

    const plugin = ignoreConfigWatchPlugin({ patterns: [/tsconfig\.json/] });
    plugin.configureServer!(server);

    expect(server.config.configFileDependencies).toEqual(
      new Set(['/project/vite.config.ts', '/project/postcss.config.js', '/project/package.json'])
    );
  });

  it('removes multiple matching files', () => {
    const server = createFakeServer([
      '/project/tsconfig.json',
      '/project/tsconfig.node.json',
      '/project/vite.config.ts',
    ]);

    const plugin = ignoreConfigWatchPlugin({ patterns: [/tsconfig\.json/] });
    plugin.configureServer!(server);

    expect(server.config.configFileDependencies).toEqual(new Set(['/project/vite.config.ts']));
  });

  it('does nothing when configFileDependencies is empty', () => {
    const server = createFakeServer([]);

    const plugin = ignoreConfigWatchPlugin({ patterns: [/tsconfig\.json/] });
    plugin.configureServer!(server);

    expect(server.config.configFileDependencies).toEqual(new Set([]));
  });

  it('does nothing when configFileDependencies is undefined', () => {
    const server = { config: {} } as any;

    const plugin = ignoreConfigWatchPlugin({ patterns: [/tsconfig\.json/] });
    expect(() => plugin.configureServer!(server)).not.toThrow();
  });

  it('supports string patterns', () => {
    const server = createFakeServer([
      '/project/tsconfig.json',
      '/project/vite.config.ts',
    ]);

    const plugin = ignoreConfigWatchPlugin({ patterns: ['tsconfig.json'] });
    plugin.configureServer!(server);

    expect(server.config.configFileDependencies).toEqual(new Set(['/project/vite.config.ts']));
  });

  it('supports mixed string and RegExp patterns', () => {
    const server = createFakeServer([
      '/project/tsconfig.json',
      '/project/.nx/cache/output.json',
      '/project/vite.config.ts',
    ]);

    const plugin = ignoreConfigWatchPlugin({
      patterns: [/tsconfig\.json/, '.nx/cache'],
    });
    plugin.configureServer!(server);

    expect(server.config.configFileDependencies).toEqual(new Set(['/project/vite.config.ts']));
  });

  it('keeps all files when no patterns match', () => {
    const server = createFakeServer([
      '/project/tsconfig.json',
      '/project/vite.config.ts',
    ]);

    const plugin = ignoreConfigWatchPlugin({ patterns: [/tailwind\.config/] });
    plugin.configureServer!(server);

    expect(server.config.configFileDependencies).toEqual(
      new Set(['/project/tsconfig.json', '/project/vite.config.ts'])
    );
  });
});