import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cast process to any to avoid "Property 'cwd' does not exist on type 'Process'" error
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env.API_KEY for the browser.
      // We explicitly check process.env.API_KEY to support Netlify environment variables
      // and fallback to 'undefined' string if missing to avoid "process is not defined" errors in browser.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY) || 'undefined'
    }
  };
});