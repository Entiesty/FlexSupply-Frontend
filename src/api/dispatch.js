import request from '@/utils/request'

/**
 * 模拟智能派单计算 (返回匹配的物资点列表)
 * @param {object} data 包含经纬度、物资类型、紧急度的对象
 */
export function smartMatch(data) {
    return request({
        url: '/dispatch/smart-match', //
        method: 'post',
        data: data // 对应 @RequestBody
    })
}

/**
 * 志愿者抢单
 * @param {number} orderId 订单ID
 */
export function grabOrder(orderId) {
    return request({
        url: '/dispatch/grab', //
        method: 'post',
        params: { orderId } // 对应 @RequestParam
    })
}

/**
 * 志愿者确认取货
 * @param {number} taskId 任务ID
 */
export function pickUpGoods(taskId) {
    return request({
        url: '/dispatch/pickup', //
        method: 'post',
        params: { taskId } // 对应 @RequestParam
    })
}