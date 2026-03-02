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

// 志愿者抢单 (转移至 trade 模块管控)
export function grabTask(orderId) {
    return request({ url: '/trade/order/grab', method: 'post', params: { orderId } })
}

// ================= 任务执行 (Task) =================

// 获取我的任务列表
export function getMyTasks(params) {
    // 🚨 路径由 /my-tasks 修改为后端的 /my-list
    return request({ url: '/trade/task/my-list', method: 'get', params })
}

// 确认送达并核销任务
export function checkOutTask(taskId) {
    // 🚨 路径由 /checkout 修改为后端的 /complete
    return request({ url: '/trade/task/complete', method: 'post', params: { taskId } })
}

// 🚨 运力熔断：一键转自提
export function switchOrderToPickup(orderId) {
    return request({ url: '/trade/order/switch-pickup', method: 'post', params: { orderId } })
}