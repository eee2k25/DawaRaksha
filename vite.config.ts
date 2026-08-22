import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string;
};

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves this project from https://eee2k25.github.io/DawaRaksha/,
  // so production bundles must reference /DawaRaksha/assets/... . The dev server
  // is served from the domain root, so it keeps '/'.
  base: command === 'build' ? '/DawaRaksha/' : '/',
  plugins: [react(), tailwindcss()],
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    host: true,
    // Sandbox/preview proxies (e.g. *.e2b.app) need to be allowed explicitly.
    allowedHosts: ['.e2b.app'],
  },
}));
