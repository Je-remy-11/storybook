import type { Server } from 'http';

import { describe, expect, it, vi } from 'vitest';

import { Channel } from 'storybook/internal/channels';
import type { Options, Presets } from 'storybook/internal/types';

import { createViteServer } from './vite-server.ts';

const createServerMock = vi.fn(async (config: any) => config);
const commonConfigMock = vi.fn();
const createViteLoggerMock = vi.fn(async () => ({ info: vi.fn() }));

vi.mock('vite', async (importOriginal: any) => ({
  ...(await importOriginal()),
  createServer: createServerMock,
}));

vi.mock('./vite-config.ts', () => ({
  commonConfig: commonConfigMock,
}));

vi.mock('./logger.ts', () => ({
  createViteLogger: createViteLoggerMock,
}));

const baseOptions: Options = {
  configType: 'DEVELOPMENT',
  configDir: '/repo/.storybook',
  packageJson: {},
  channel: new Channel({}),
  port: 6006,
  presets: {
    apply: async (key: string, config?: unknown) => {
      if (key === 'core') {
        return { allowedHosts: ['storybook.local'] };
      }

      if (key === 'viteFinal') {
        return config;
      }

      return undefined;
    },
  } as Presets,
  presetsList: [],
};

describe('createViteServer', () => {
  it('preserves user server.watch.ignored when applying Storybook server defaults', async () => {
    commonConfigMock.mockResolvedValueOnce({
      root: '/repo',
      server: {
        origin: 'http://localhost:5173',
        watch: {
          ignored: ['**/.nx/cache/**', '**/tsconfig.json'],
        },
        fs: {
          allow: ['/repo/shared'],
        },
        hmr: {
          overlay: false,
        },
      },
    });

    const devServer = {} as Server;
    const result = await createViteServer(baseOptions, devServer);

    expect(createServerMock).toHaveBeenCalledTimes(1);
    expect(result.server.watch).toEqual({
      ignored: ['**/.nx/cache/**', '**/tsconfig.json'],
    });
    expect(result.server.fs).toEqual({
      allow: ['/repo/shared'],
      strict: true,
    });
    expect(result.server.hmr).toEqual({
      overlay: false,
      port: 6006,
      server: devServer,
    });
    expect(result.server.allowedHosts).toEqual(['storybook.local']);
    expect(result.server.middlewareMode).toBe(true);
    expect(result.customLogger).toBeDefined();
  });
});
