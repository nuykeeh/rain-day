import { defineConfig } from 'vite';

export default defineConfig({
  base: './',   // 어느 하위 경로에 올려도 동작 (PRD 7.1)
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  build: { target: 'es2020' },
});
