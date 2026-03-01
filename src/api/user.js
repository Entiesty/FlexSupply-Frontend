import request from '@/utils/request'

export function getUserProfile() {
    return request({ url: '/system/user/profile', method: 'get' })
}

export function updateUserProfile(data) {
    return request({ url: '/system/user/profile', method: 'put', data })
}

export function updatePassword(data) {
    return request({ url: '/system/user/password', method: 'put', data })
}