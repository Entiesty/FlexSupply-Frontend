import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { ElMessage } from 'element-plus'

// 1. 定义路由表并配置 meta.roles 权限标签
const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        redirect: '/login'
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/views/Login.vue'),
        // 登录页不需要鉴权
        meta: { requiresAuth: false }
    },
    {
        path: '/map',
        name: 'Map',
        component: () => import('@/views/dispatch/index.vue'),
        // 🚨 核心配置：这表示该页面需要登录，且只有 3(志愿者) 和 4(管理员) 可以进
        meta: { requiresAuth: true, roles: [3, 4] }
    },
    {
        path: '/admin-settings',
        name: 'AdminSettings',
        // 假设你以后建了一个管理员页面
        component: () => import('@/views/Admin.vue'),
        // 🚨 这表示只有 4(管理员) 才能进
        meta: { requiresAuth: true, roles: [4] }
    },
    {
        path: '/my-tasks',
        name: 'MyTasks',
        component: () => import('@/views/dispatch/MyTasks.vue'),
        meta: { requiresAuth: true, roles: [3] } // 仅志愿者可见
    },
    // 404 兜底路由
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@/views/Login.vue') // 简单处理，找不到就回登录页
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 2. 配置全局前置路由守卫 (The Security Guard)
router.beforeEach((to, from, next) => {
    // 检查该路由是否需要登录鉴权
    if (to.meta.requiresAuth) {
        // 从 localStorage 获取当前用户的角色 (登录时存入的)
        // ⚠️ 注意：localStorage 存的是字符串，需要转成数字进行对比
        const userRoleStr = localStorage.getItem('userRole')

        // 规则 1：如果没有角色信息，说明根本没登录，踢回登录页
        if (!userRoleStr) {
            ElMessage.warning('请先登录系统')
            next('/login')
            return
        }

        const userRole = parseInt(userRoleStr)

        // 规则 2：检查该路由的 roles 数组是否包含当前用户的 role
        const allowedRoles = to.meta.roles as number[] | undefined

        if (allowedRoles && !allowedRoles.includes(userRole)) {
            ElMessage.error('权限不足：您无权访问该模块')
            if (from.path === '/') {
                next('/map')
            } else {
                next(false) // 明确传 boolean，中断当前导航
            }
            return
        }
    }

    // 规则 3：不需要鉴权，或者鉴权通过，放行！
    next()
})

export default router