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
    // 👇 核心重构：受赠方主工作台 (紧急呼救大舱)
    {
        path: '/sos',
        name: 'ElderlySOS',
        component: () => import('@/views/sos/ElderlySOS.vue'),
        meta: { requiresAuth: true, roles: [1, 4] }
    },
    // 👇 核心新增：受赠方的历史求助档案
    {
        path: '/recipient/history',
        name: 'RecipientHistory',
        component: () => import('@/views/sos/RecipientHistory.vue'),
        meta: { requiresAuth: true, roles: [1] } // 严格限制：仅限受赠方访问
    },
    {
        path: '/merchant/donate',
        name: 'MerchantDonate',
        component: () => import('@/views/resource/MerchantDonate.vue'),
        meta: { requiresAuth: true, roles: [2] }
    },
    {
        path: '/merchant/history',
        name: 'MerchantHistory',
        component: () => import('@/views/merchant/MerchantHistory.vue'),
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
    // 👇 核心修改：个人设置也要允许受赠方(角色 1)进来，用来填健康档案
    {
        path: '/volunteer/profile',
        name: 'ProfileSetting',
        component: () => import('@/views/volunteer/ProfileSetting.vue'),
        meta: { requiresAuth: true, roles: [1, 2, 3, 4] }
    },
    {
        path: '/config',
        name: 'AlgorithmConfig',
        component: () => import('@/views/admin/AlgorithmConfig.vue'),
        meta: { requiresAuth: true, roles: [4] }
    },
    {
        path: '/admin/users',
        name: 'UserManage',
        component: () => import('@/views/admin/UserManage.vue'),
        meta: { requiresAuth: true, roles: [4] }
    },
    {
        path: '/flow',
        name: 'OrderFlow',
        component: () => import('@/views/admin/OrderFlow.vue'),
        meta: { requiresAuth: true, roles: [4] }
    },
    {
        path: '/admin/stations',
        name: 'StationManage',
        component: () => import('@/views/admin/StationManage.vue'),
        meta: { requiresAuth: true, roles: [4] } // 🚨 仅限管理员
    },
    // 在你的 routes 数组中找到合适的位置（比如在 admin 的 children 里，或者一级路由下）
    {
        path: '/admin/exception-monitor',
        name: 'ExceptionMonitor',
        component: () => import('@/views/admin/ExceptionMonitor.vue'), // 指向你新建的文件
        meta: {
            title: '异常预警大屏',
            requiresAuth: true,
            roles: [4] // 仅限管理员/指挥中心访问
        }
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