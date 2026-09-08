import { defineConfig } from 'vite';
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import baseConfig from '../vite.config';

export default defineConfig(async (environment) => {
  const config = await (typeof baseConfig === 'function' ? baseConfig(environment) : baseConfig);
  return {
    ...config,
    cacheDir: '.cache/dispatch-vite',
    server: {
      ...config.server,
      fs: { ...config.server?.fs, allow: [process.cwd(), realpathSync(resolve('node_modules'))] },
    },
  };
});
