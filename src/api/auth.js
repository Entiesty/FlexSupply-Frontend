import request from '@/utils/request'

/**
 * 系统统一登录
 * 注意：后端接口用的是 @RequestParam 接收参数，所以我们这里放在 params 中传过去
 */
export function login(phone, password) {
    return request({
        url: '/auth/login',
        method: 'post',
        params: { phone, password }
    })
}