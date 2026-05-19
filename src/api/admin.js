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

// 获取全域用户列表
export function getUserList(params) {
    return request({ url: '/admin/user/list', method: 'get', params })
}

// 更新弱势群体身份标签
export function updateUserTag(userId, tag, isVerified) {
    return request({ url: '/admin/user/update-tag', method: 'put', params: { userId, tag, isVerified } })
}

// 志愿者信誉分人工干预 (scoreChange 传正数加分，负数扣分)
export function updateUserCredit(userId, scoreChange) {
    return request({ url: '/admin/user/update-credit', method: 'put', params: { userId, scoreChange } })
}


// 1. 获取资质审核列表 (分页)
export function getAuditPage(params) {
    // 对接 UserController.java 的 /system/user/admin/audit-page
    return request({ url: '/system/user/admin/audit-page', method: 'get', params })
}

// 2. 提交资质审核结果 (deliveryType 可选, 仅对受赠者生效)
export function submitAudit(userId, isPass, deliveryType) {
    return request({
        url: `/system/user/admin/audit/${userId}`,
        method: 'put',
        params: { isPass, deliveryType }
    })
}

export function evictUser(userId) {
    return request({ url: `/admin/user/evict/${userId}`, method: 'put' })
}