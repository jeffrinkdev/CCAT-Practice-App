import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['**/dist/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/utils/**/*.js'],
      exclude: [
        'node_modules/',
        '**/dist/**',
        '**/__tests__/**',
        '**/*.test.js',
      ],
    },
  },
})
