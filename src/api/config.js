import request from '@/utils/request'

export function getCurrentConfig() {
    return request({ url: '/system/config/current', method: 'get' })
}

export function updateConfig(data) {
    return request({ url: '/system/config/update', method: 'put', data })
}

export function switchMode(data) {
    return request({ url: '/system/config/switch-mode', method: 'put', data })
}

export function getCsrReport() {
    return request({ url: '/merchant/csr-report', method: 'get' })
}

export function preCheckMode(mode) {
    return request({ url: '/system/config/pre-check', method: 'get', params: { mode } })
}