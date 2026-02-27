import request from '@/utils/request'

/**
 * 发起智能派单计算
 */
export function smartMatch(data) {
    return request({
        url: '/dispatch/smart-match',
        method: 'post',
        data: data
    })
}

/**
 * 志愿者发起抢单
 */
export function grabTask(orderId) {
    return request({
        url: '/dispatch/grab',
        method: 'post',
        // ⚠️ 关键点：如果是 @RequestParam，这里必须用 params！
        // 如果是用 params，Axios 会自动把参数拼在 URL 后面：/dispatch/grab?orderId=xxx
        params: {
            orderId: orderId
        }
    })
}