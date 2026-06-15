import type { InlineConfig, ServerOptions } from 'vite';

import { createViteLogger } from './logger.ts';
import type { InlineConfig, ServerOptions } from 'vite';
export async function createViteServer(options: Options, devServer: Server) {
  const { presets } = options;

  const commonCfg = await commonConfig(options, 'development');
