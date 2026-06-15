import type { Options } from 'storybook/internal/types';

import type { Server } from 'http';
import type { InlineConfig, ServerOptions } from 'vite';

import { basename, relative } from 'pathe';

import { createViteLogger } from './logger.ts';
import { commonConfig } from './vite-config.ts';

export async function createViteServer(options: Options, devServer: Server) {
  const { presets } = options;

  const commonCfg = await commonConfig(options, 'development');

  const { allowedHosts } = await presets.apply('core', {});

  const projectRoot = commonCfg.root ?? process.cwd();

  const defaultWatchIgnored = [
    (filePath: string) => {
      const rel = relative(projectRoot, filePath);
      if (rel.includes('.nx/cache') || rel.includes('.nx\\cache')) return true;
      if (/^tsconfig(\.\w+)?\.json$/.test(basename(filePath))) return true;
      return false;
    },
  ];

  const config: InlineConfig & { server: ServerOptions } = {
    ...commonCfg,
    server: {
      allowedHosts,
      middlewareMode: true,
      hmr: {
        port: options.port,
        server: devServer,
      },
      fs: {
        strict: true,
      },
      watch: {
        ignored: defaultWatchIgnored,
      },
    },
  };

  // '0.0.0.0' binds to all interfaces, which is useful for Docker and other containerized environments
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
