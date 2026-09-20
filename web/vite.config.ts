/// <reference types="node" />
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';

/**
 * Vite + Vitest configuration. `VITE_BASE` lets the Pages workflow deploy under a repository
 * sub-path. The Results view is imported dynamically in App.svelte, so default code splitting
 * emits it as its own chunk and the intake screen stays small.
 */
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [svelte(), svelteTesting()],
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
