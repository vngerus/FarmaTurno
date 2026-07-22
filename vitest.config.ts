import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Solo los tests de src/ usan vitest. scripts/ tiene sus propios tests
    // escritos para el runner nativo de Node (node:test), no para vitest.
    include: ['src/**/*.test.ts'],
  },
});
