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

// 商家查询自己的捐赠溯源记录
export function getMerchantGoodsPage(params) {
    return request({ url: '/resource/goods/merchant/page', method: 'get', params })
}

// 商家撤销尚未被接管的捐赠物资
export function revokeGoods(goodsId) {
    return request({ url: `/resource/goods/revoke/${goodsId}`, method: 'delete' })
}

// 商家开始自行配送 (上锁)
export function startSelfDelivery(goodsId) {
    return request({ url: `/resource/goods/start-self-delivery/${goodsId}`, method: 'put' })
}

// 商家确认送达 (核销)
export function finishSelfDelivery(goodsId) {
    return request({ url: `/resource/goods/finish-self-delivery/${goodsId}`, method: 'put' })
}

// ================= 社区据点 (Station) =================

// 管理员新增据点
export function addStation(data) {
    return request({ url: '/resource/station/add', method: 'post', data })
}

// 保留原有的分页查询接口 (供后台管理表格使用)
export function getStationPage(params) {
    return request({ url: '/resource/station/list', method: 'get', params })
}

// 新增无分页的全量查询接口 (专供商家地图打点使用)
export function getAllStations() {
    return request({ url: '/resource/station/all', method: 'get' })
}

// 获取带有智能推荐标签的据点列表 (支持传入经纬度 params)
export function getRecommendStations(params) {
    return request({ url: '/resource/station/recommend', method: 'get', params })
}