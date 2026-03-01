import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { ElMessage } from 'element-plus'

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        redirect: '/auth'
    },
    {
        path: '/auth',
        name: 'Auth',
        component: () => import('@/views/auth/Auth.vue'),
        meta: { requiresAuth: false }
    },
    {
        path: '/map',
        name: 'Map',
        component: () => import('@/views/dispatch/index.vue'),
        meta: { requiresAuth: true, roles: [1, 2, 3, 4] }
    },
    {
        path: '/my-tasks',
        name: 'MyTasks',
        component: () => import('@/views/trade/MyTasks.vue'),
        meta: { requiresAuth: true, roles: [3] }
    },
    {
        path: '/sos',
        name: 'ElderlySOS',
        component: () => import('@/views/sos/ElderlySOS.vue'),
        meta: { requiresAuth: true, roles: [1, 4] }
    },
    {
        path: '/merchant/donate',
        name: 'MerchantDonate',
        component: () => import('@/views/resource/MerchantDonate.vue'),
        meta: { requiresAuth: true, roles: [2] }
    },
    {
        path: '/admin/review',
        name: 'AdminReview',
        component: () => import('@/views/admin/AdminReview.vue'),
        meta: { requiresAuth: true, roles: [4] }
    },
    {
        path: '/volunteer/credit',
        name: 'CreditCenter',
        component: () => import('@/views/volunteer/CreditCenter.vue'),
        meta: { requiresAuth: true, roles: [3] }
    },
    {
        path: '/volunteer/profile',
        name: 'ProfileSetting',
        component: () => import('@/views/volunteer/ProfileSetting.vue'),
        meta: { requiresAuth: true, roles: [2, 3, 4] } // 允许商家、志愿者、管理员访问个人中心
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@/views/auth/Auth.vue')
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