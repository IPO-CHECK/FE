import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],

  // server: {
  //   allowedHosts: true  // 모든 외부 호스트 허용 (ngrok 포함)
  // }

  server: {
    // 1. 외부 접속 허용 (반드시 포함)
    host: true,

    // 2. 에러 메시지에 나온 호스트 주소를 직접 명시
    allowedHosts: [
      '2ad4b6f298bd.ngrok-free.app'
    ],

    // 3. 백엔드 프록시 설정
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false, // https와 http 간의 연결 에러 방지
      }
    }
  }
})
