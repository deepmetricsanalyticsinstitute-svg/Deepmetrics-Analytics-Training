import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // We cast process to any to avoid potential type issues in some node environments during build.
  const env = loadEnv(mode, process.cwd(), '');
  const processEnv = process.env || {};

  return {
    plugins: [react()],
    define: {
      // Polyfill process.env.API_KEY for the browser.
      // Priority: 
      // 1. .env files (env.API_KEY)
      // 2. Netlify/System environment variables (processEnv.API_KEY)
      // 3. Fallback to "undefined" string to prevent runtime reference errors
      'process.env.API_KEY': JSON.stringify(env.API_KEY || processEnv.API_KEY || "undefined")
    }
  };
});