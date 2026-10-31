import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string;
};

/**
 * Vite needs `base` to begin and end with a slash (`/`, `/DawaRaksha/`).
 * Accepts either form so `VITE_BASE_PATH=DawaRaksha` works too.
 */
function normalizeBase(value?: string): string {
  const raw = (value ?? '').trim();
  if (!raw || raw === '/') return '/';
  return `/${raw.replace(/^\/+|\/+$/g, '')}/`;
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // The GitHub Pages workflow pins VITE_BASE_PATH=/DawaRaksha/ because the
  // project is served from that sub-path. Render (and most other hosts) serve
  // from the domain root, so '/' is the default and needs no extra config.
  // The dev server always runs at the domain root.
  const base = command === 'build' ? normalizeBase(env.VITE_BASE_PATH || '/') : '/';

  return {
    base,
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
    preview: {
      host: true,
      allowedHosts: ['.e2b.app'],
      port: 4173,
    },
  };
});
