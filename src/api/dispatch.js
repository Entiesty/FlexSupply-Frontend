import request from '@/utils/request'

/**
 * 🚀 新增：获取大屏待抢订单列表
 */
export function getPendingOrders() {
    return request({
        url: '/trade/order/pending-list', // 🚨 对应后端的 @GetMapping("/pending-list")
        method: 'get'
    })
}

/**
 * 模拟智能派单计算
 */
export function smartMatch(data) {
    return request({
        url: '/dispatch/smart-match',
        method: 'post',
        data: data
    })
}

/**
 * 志愿者抢单
 */
export function grabTask(orderId) {
    return request({
        url: '/trade/order/grab', // 🚨 顺手修正：改为后端的真实抢单路径
        method: 'post',
        params: { orderId }
    })
}

/**
 * 志愿者确认取货
 */
export function pickUpGoods(taskId) {
    return request({
        url: '/trade/order/pickup', // 🚨 顺手修正
        method: 'post',
        params: { taskId }
    })
}