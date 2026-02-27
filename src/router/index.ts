import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router' // 🚨 显式声明这是一个“类型”

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        redirect: '/login'
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/views/Login.vue')
    },
    {
        path: '/map',
        name: 'Map',
        // 🚨 核心修改：指向我们刚重构的全新调度大屏目录
        // 这样当你从登录页跳转到 /map 时，加载的就是带有左侧菜单的新页面了
        component: () => import('@/views/dispatch/index.vue')
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router