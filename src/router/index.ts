import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { ElMessage } from 'element-plus'

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        redirect: '/auth'
    },
    {
        path: '/auth', // 🚨 统一为 /auth
        name: 'Auth',
        component: () => import('@/views/Auth.vue'),
        meta: { requiresAuth: false }
    },
    {
        path: '/map',
        name: 'Map',
        component: () => import('@/views/dispatch/index.vue'),
        // 🚨 允许 1,2,3,4 均可进入大屏
        meta: { requiresAuth: true, roles: [1, 2, 3, 4] }
    },
    {
        path: '/admin-settings',
        name: 'AdminSettings',
        component: () => import('@/views/Admin.vue'),
        meta: { requiresAuth: true, roles: [4] }
    },
    {
        path: '/my-tasks',
        name: 'MyTasks',
        component: () => import('@/views/dispatch/MyTasks.vue'),
        meta: { requiresAuth: true, roles: [3] }
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@/views/Auth.vue')
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach((to, from, next) => {
    if (to.meta.requiresAuth) {
        const userRoleStr = localStorage.getItem('userRole')
        if (!userRoleStr) {
            ElMessage.warning('请先登录系统')
            next('/auth')
            return
        }

        const userRole = parseInt(userRoleStr)
        const allowedRoles = to.meta.roles as number[] | undefined

        if (allowedRoles && !allowedRoles.includes(userRole)) {
            ElMessage.error('权限不足：您无权访问该模块')
            if (from.path === '/') {
                next('/map')
            } else {
                next(false)
            }
            return
        }
    }
    next()
})

export default router