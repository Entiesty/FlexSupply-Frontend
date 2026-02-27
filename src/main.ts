import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 🚨 1. 引入我们配好的路由实例

// 导入状态管理和 UI 框架
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'

// 必须引入 Element Plus 的样式文件
import 'element-plus/dist/index.css'
// 你的全局样式（如有需要）
import './style.css'

/**
 * 高德地图安全密钥配置 (2.0 强制要求)
 * 必须在 AMapLoader.load() 之前执行。
 * 这里从 .env.development 文件中读取 VITE_AMAP_SECURITY_CODE
 */
window._AMapSecurityConfig = {
    securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE,
}

const app = createApp(App)

// 挂载插件
app.use(router) // 🚨 2. 必须挂载路由，页面才能正常跳转！
app.use(createPinia())
app.use(ElementPlus)

app.mount('#app')