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