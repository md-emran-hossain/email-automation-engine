import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: ['default', 'html'],
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    exclude: [...configDefaults.exclude, 'src/**/*.integration.spec.ts'],
  },
});
