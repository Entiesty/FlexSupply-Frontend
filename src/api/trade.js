import request from '@/utils/request'

// ================= 订单相关 (DispatchOrder) =================

/**
 * 获取大屏待抢订单 (状态为0)
 */
export function getPendingOrders() {
    return request({
        url: '/trade/order/pending-list', //
        method: 'get'
    })
}

/**
 * 志愿者获取抢单大厅列表
 * @param {object} params 包含 pageNum, pageSize
 */
export function getAvailableOrders(params) {
    return request({
        url: '/trade/order/available-list', //
        method: 'get',
        params: params // 对应 @RequestParam
    })
}

/**
 * 受赠方发布紧急求助
 * @param {object} data 需求表单数据
 */
export function publishDemand(data) {
    return request({
        url: '/trade/order/publish-demand', //
        method: 'post',
        data: data // 对应 @RequestBody
    })
}

// ================= 任务相关 (DeliveryTask) =================

/**
 * 获取我的任务列表
 * @param {object} params 包含 status(可选), pageNum, pageSize
 */
export function getMyTasks(params) {
    return request({
        url: '/trade/task/my-tasks', //
        method: 'get',
        params: params // 对应 @RequestParam
    })
}

/**
 * 确认送达并核销任务
 * @param {number} taskId 任务ID
 */
export function checkOutTask(taskId) {
    return request({
        url: '/trade/task/checkout', //
        method: 'post',
        params: { taskId } // 对应 @RequestParam
    })
}