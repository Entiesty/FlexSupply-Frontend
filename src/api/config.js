import request from '@/utils/request'

export function getCurrentConfig() {
    return request({ url: '/system/config/current', method: 'get' })
}

export function updateConfig(data) {
    return request({ url: '/system/config/update', method: 'put', data })
}