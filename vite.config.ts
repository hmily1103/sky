import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// PC 优先，同时兼容手机竖屏
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
})
