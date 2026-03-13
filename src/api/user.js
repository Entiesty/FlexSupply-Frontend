import request from '@/utils/request'

// 获取个人基础资料
export function getUserProfile() {
    return request({ url: '/system/user/profile', method: 'get' })
}

// 更新个人基础资料(姓名)
export function updateUserProfile(data) {
    return request({ url: '/system/user/profile', method: 'put', data })
}

// 修改密码
export function updatePassword(data) {
    return request({ url: '/system/user/password', method: 'put', data })
}

// 🌟 新增：获取千人千面成就看板数据
export function getDashboardStats() {
    return request({ url: '/system/user/dashboard/stats', method: 'get' })
}

// 🌟 新增：更新用户头像
export function updateAvatar(avatarUrl) {
    return request({
        url: '/system/user/avatar',
        method: 'put',
        params: { avatarUrl }
    })
}

// 获取可作为据点负责人的用户列表 (role = 3 志愿者, 或 role = 4 管理员)
export function getEligibleManagers() {
    return request({
        url: '/system/user/managers',
        method: 'get'
    })
}