import request from '@/utils/request'

// ================= 订单源头 (Order) =================

// 获取大屏待抢订单 (供大屏扫描)
export function getPendingOrders() {
    return request({ url: '/trade/order/pending-list', method: 'get' })
}

// 志愿者获取抢单大厅列表
export function getAvailableOrders(params) {
    return request({ url: '/trade/order/available-list', method: 'get', params })
}

// 受赠方发布紧急求助
export function publishDemand(data) {
    return request({ url: '/trade/order/publish-demand', method: 'post', data })
}

// 找到这部分代码，修改 URL 路径！
export function grabTask(orderId) {
    return request({
        url: '/dispatch/grab', // 🚨 核心修复：把原来的 /trade/order/grab 改成这个！
        method: 'post',
        params: { orderId }
    })
}

// ================= 任务执行 (Task) =================

// 获取我的任务列表
export function getMyTasks(params) {
    // 🚨 路径由 /my-tasks 修改为后端的 /my-list
    return request({ url: '/trade/task/my-list', method: 'get', params })
}

// 确认送达并核销任务 (支持多参数扁平化)
export function checkOutTask(data) {
    return request({
        url: '/trade/task/complete',
        method: 'post',
        params: { taskId: data.taskId, proofImage: data.proofImage }
    })
}

// 🚨 运力熔断：一键转自提
export function switchOrderToPickup(orderId) {
    return request({ url: '/trade/order/switch-pickup', method: 'post', params: { orderId } })
}

// 全盘订单流转 (指挥中心)
export function getAdminOrders(params) {
    return request({ url: '/trade/order/admin-page', method: 'get', params })
}

// 受赠方获取当前进行中的求助状态 (大字号看板轮询用)
export function getMyActiveSos() {
    return request({ url: '/trade/order/my-active-sos', method: 'get' })
}

// 受赠方撤销求助
export function cancelDemand(orderId) {
    return request({ url: `/trade/order/cancel/${orderId}`, method: 'put' })
}

// 受赠方获取自己的历史求助档案 (之前应该已经加过了，确认一下有就行)
export function getMyHistoryOrders(params) {
    return request({ url: '/trade/order/my-history', method: 'get', params })
}

// 在 src/api/trade.js 中加入这行
export function cancelOrder(orderId) {
    return request({
        url: `/trade/order/cancel/${orderId}`,
        method: 'put'
    })
}

// 获取滞留异常订单大屏数据
export function getExceptionMonitorList() {
    return request({
        url: '/trade/order/exception-monitor',
        method: 'get'
    })
}

// 受赠方确认收货并评价
export function confirmReceiptOrder(data) {
    return request({
        url: '/trade/order/confirm-receipt',
        method: 'post',
        params: data // 包含 orderId, rating, comment
    })
}