import type { Options } from 'storybook/internal/types';

import type { Server } from 'http';
import type { InlineConfig, ServerOptions } from 'vite';

import { createViteLogger } from './logger.ts';
import { commonConfig } from './vite-config.ts';

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
  return createServer(finalConfig);
}
