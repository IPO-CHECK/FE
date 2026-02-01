import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],

  server: {
    allowedHosts: true  // 모든 외부 호스트 허용 (ngrok 포함)
  }
})
