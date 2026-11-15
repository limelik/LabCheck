import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const environment = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  return {
    plugins: [react()],
    server: {
      proxy: { '/api': environment.VITE_API_TARGET || 'http://127.0.0.1:3001' },
      fs: {
        deny: [
          '.env',
          '.env.*',
          '*.{crt,pem}',
          '**/.git/**',
          '**/.local-mailbox/**',
          '**/.private-uploads/**',
          `${path.resolve(environment.DEV_MAILBOX_DIR || '.local-mailbox')}/**`,
          `${path.resolve(environment.UPLOAD_DIR || '.private-uploads')}/**`,
        ],
      },
    },
  };
});
