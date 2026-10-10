import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts'],
    // 跑得快一点 + 避免单测间状态污染
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // 单进程跑完所有测试,DB mock 更可控
      },
    },
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/test/**',
        'src/migrations/**',
        'src/scripts/**',
        'src/config/**',
        'src/app.ts',
        'src/types/**',
        'src/models/**',
        'src/utils/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
