import request from '@/utils/request'

// ================= 物资库存 (Goods) =================

// 商家提交物资捐赠入库
export function donateGoods(data) {
    return request({ url: '/resource/goods/donate', method: 'post', data })
}

// 分页查询据点可用库存 (管理员/大屏备用)
export function getGoodsList(params) {
    return request({ url: '/resource/goods/list', method: 'get', params })
}

// ================= 社区据点 (Station) =================

// 管理员新增据点
export function addStation(data) {
    return request({ url: '/resource/station/add', method: 'post', data })
}

// 🚨 修正 1：保留原有的分页查询接口 (供后台管理表格使用)
export function getStationPage(params) {
    return request({ url: '/resource/station/list', method: 'get', params })
}

// 🚨 修正 2：新增无分页的全量查询接口 (专供商家捐赠下拉框、地图打点使用)
export function getAllStations() {
    return request({ url: '/resource/station/all', method: 'get' })
}