import { defineConfig } from 'vite' // 🧹 移除了用不到的 loadEnv
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(() => { // 🧹 移除了用不到的 mode 参数
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      // 代理已经完全移除，请求直达后端 8080
    },
  }
})