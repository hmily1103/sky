import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// 单文件便携构建：所有 JS/CSS 内联进一个 index.html，
// 可用 file:// 双击打开，无需 Node / 服务器，可离线运行。
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-single',
    assetsInlineLimit: 100000000, // 内联一切
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
  },
})
