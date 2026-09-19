import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: ['default', 'html'],
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.integration.spec.{ts,tsx}'],
  },
});
