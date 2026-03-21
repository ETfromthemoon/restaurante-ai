import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    singleFork: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    env: {
      DB_PATH: ':memory:',
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-para-vitest',
    },
  },
});
