import request from '@/utils/request'

/**
 * 获取今日核心指标 (新增求助、完成派送、总库存)
 */
export function getBaseMetrics() {
    return request({
        url: '/dispatch/dashboard/base-metrics', //
        method: 'get'
    })
}

/**
 * 获取物资分类占比 (供饼图使用)
 */
export function getCategoryStock() {
    return request({
        url: '/dispatch/dashboard/category-stock', //
        method: 'get'
    })
}

/**
 * 获取志愿者信誉分排行榜 TOP 5
 */
export function getVolunteerRank() {
    return request({
        url: '/dispatch/dashboard/volunteer-rank', //
        method: 'get'
    })
}