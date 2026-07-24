import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Vite + Vitest 設定（ADR-001）
// L4 のみ React。L0〜L3 は純粋 TS のため、エイリアスで層を明示する。
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@simulation': fileURLToPath(new URL('./src/simulation', import.meta.url)),
      '@perception': fileURLToPath(new URL('./src/perception', import.meta.url)),
      '@presentation': fileURLToPath(new URL('./src/presentation', import.meta.url)),
      '@content': fileURLToPath(new URL('./src/content', import.meta.url)),
    },
  },
  // コード分割の土台（B4 §12.3 Critical/Preload/Lazy）。詳細は最適化フェーズで。
  build: {
    target: 'es2022',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // L0〜L3（純粋ロジック）を重点計測。L4 の描画は Play Test 側（DevConst ⑩）。
      include: ['src/core/**', 'src/simulation/**', 'src/perception/**', 'src/data/**'],
    },
  },
});
