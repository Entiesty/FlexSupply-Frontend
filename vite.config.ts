import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path' // 需安装 @types/node

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 1. 根据当前模式 (development/production) 加载 .env 环境变量
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [vue()],

    resolve: {
      // 2. 路径别名配置：使用 @ 替代 src，避免 ../../../ 这种套娃路径
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    server: {
      host: '0.0.0.0',
      port: 5173,
      // 3. 增强版代理配置
      proxy: {
        '/api': {
          // 从环境变量读取后端地址，若无则默认为本地 8080
          target: env.VITE_API_BASE_URL || 'http://localhost:8080',
          changeOrigin: true,
          // 4. 路径重写逻辑（重要）
          // 如果你的 Spring Boot 没有配置 server.servlet.context-path=/api
          // 则必须启用下方 rewrite，否则请求到后端会变成 404
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})