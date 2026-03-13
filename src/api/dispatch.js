import request from '@/utils/request'

// 1. 核心算法：智能派单计算
export function smartMatch(data) {
    return request({ url: '/dispatch/smart-match', method: 'post', data })
}

// 2. 大屏面板：获取今日核心指标
export function getBaseMetrics() {
    return request({ url: '/dispatch/dashboard/base-metrics', method: 'get' })
}

// 3. 大屏面板：获取物资分类占比
export function getCategoryStock() {
    return request({ url: '/dispatch/dashboard/category-stock', method: 'get' })
}

// 4. 大屏面板：获取志愿者信誉分排行榜
export function getVolunteerRank() {
    return request({ url: '/dispatch/dashboard/volunteer-rank', method: 'get' })
}

// 🚨 新增：获取大屏动态配置 (运力熔断阈值)
export function getDispatchConfig() {
    return request({ url: '/dispatch/config', method: 'get' })
}

// 🚨 触发周边商铺定向紧急募捐广播 (LBS 范围圈选)
export function triggerEmergencyBroadcast(orderId) {
    return request({
        url: `/dispatch/emergency/broadcast/${orderId}`,
        method: 'post'
    })
}

// 🚨 商家端短轮询：监听指挥中心发给我的紧急广播
export function checkMyEmergencyBroadcast() {
    return request({
        url: `/dispatch/emergency/my-broadcast`,
        method: 'get'
    })
}