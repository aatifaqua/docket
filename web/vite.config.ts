/// <reference types="node" />
import { defineConfig, type Plugin } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';

/**
 * Fills the CSP connect-src with exactly the API origin this build talks to (or just 'self'
 * for the in-browser demo), so the shipped policy never allows a broader set of hosts.
 */
function cspConnectSrc(): Plugin {
  const apiBase = process.env.VITE_API_BASE ?? '';
  const origin = apiBase === '' ? '' : new URL(apiBase).origin;
  const sources = ["'self'", origin].filter((source) => source !== '').join(' ');
  return {
    name: 'docket-csp-connect-src',
    transformIndexHtml: (html) => html.replace('__CONNECT_SRC__', sources),
  };
}

/**
 * Vite + Vitest configuration. `VITE_BASE` lets the Pages workflow deploy under a repository
 * sub-path. The Results view is imported dynamically in App.svelte, so default code splitting
 * emits it as its own chunk and the intake screen stays small.
 */
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [svelte(), svelteTesting(), cspConnectSrc()],
  build: { target: 'es2022' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,svelte}'],
      exclude: ['src/**/*.test.ts', 'src/main.ts', 'src/**/*.d.ts'],
      thresholds: { lines: 85, functions: 85, branches: 85, statements: 85 },
    },
  },
});
