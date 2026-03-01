import request from '@/utils/request'

// 获取信誉看板数据（分数、称号、排名）
export function getCreditDashboard() {
    return request({ url: '/volunteer/credit/dashboard', method: 'get' })
}

// 获取积分流水列表
export function getCreditLogs(pageNum = 1, pageSize = 20) {
    return request({
        url: '/volunteer/credit/logs',
        method: 'get',
        params: { pageNum, pageSize }
    })
}