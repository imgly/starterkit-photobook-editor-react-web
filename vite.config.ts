import { createLogger, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const logger = createLogger();
const { warn } = logger;
logger.warn = (message, options) => {
  if (message.includes('dynamic import cannot be analyzed')) return;
  warn(message, options);
};

// The web app lives in src/client/ next to the export server in src/server/;
// the .env file and the build output stay at the kit root.
export default defineConfig({
  root: 'src/client',
  envDir: '../..',
  build: {
    outDir: '../../dist',
    emptyOutDir: true
  },
  plugins: [react()],
  customLogger: logger,
  optimizeDeps: {
    exclude: ['@imgly/plugin-print-ready-pdfs-web']
  },
  worker: {
    format: 'es'
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080'
    }
  },
  resolve: {
    dedupe: ['react', 'react-dom']
  }
});
