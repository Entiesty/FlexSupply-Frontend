import request from '@/utils/request'

// 1. 获取待审核商家列表
export function getPendingMerchants() {
    return request({ url: '/admin/merchant/pending', method: 'get' })
}

// 2. 审核商家资质 (pass: 1 为通过, -1 为驳回)
export function auditMerchant(userId, pass) {
    return request({
        url: '/admin/merchant/audit',
        method: 'post',
        params: { userId, pass }
    })
}