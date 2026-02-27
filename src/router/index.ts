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
        component: () => import('@/views/LbsMap.vue')
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router