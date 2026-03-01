import request from '@/utils/request'

// ================= 物资库存 (Goods) =================
export function donateGoods(data) {
    return request({ url: '/resource/goods/donate', method: 'post', data })
}

export function getGoodsList(params) {
    return request({ url: '/resource/goods/list', method: 'get', params })
}

// ================= 社区据点 (Station) =================
export function addStation(data) {
    return request({ url: '/resource/station/add', method: 'post', data })
}

export function getStationList(params) {
    return request({ url: '/resource/station/list', method: 'get', params })
}