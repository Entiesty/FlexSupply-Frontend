import request from '@/utils/request'

export function login(phone, password) {
    return request({url: '/auth/login', method: 'post', params: {phone, password}})
}

export function register(data) {
    return request({url: '/auth/register', method: 'post', data: data})
}

export function sendSmsCode(phone, type = 'register') {
    return request({url: '/auth/send-code', method: 'get', params: { phone, type }}) // 把场景类型传给后端)
}

export function resetPassword(phone, smsCode, newPassword) {
    return request({url: '/auth/reset-password', method: 'post', params: {phone, smsCode, newPassword}})
}

export function logout(userId) {
    return request({url: '/auth/logout', method: 'post', params: {userId}})
}