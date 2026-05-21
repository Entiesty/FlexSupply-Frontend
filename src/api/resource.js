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

// 管理员编辑/更新物理据点配置 (包含 LBS 坐标变更)
export function updateStation(data) {
    return request({
        url: '/resource/station/update',
        method: 'put',
        data
    })
}

// 获取特定据点/驿站内部的可用物资列表 (供日常食物银行大厅展示)
export function getStationGoods(stationId) {
    // 方案 A: 如果你后端有专门的 Restful 接口，用这个：
    // return request({ url: `/resource/goods/station/${stationId}`, method: 'get' })

    // 方案 B: 直接复用你已有的 list 接口，通过 params 过滤 (推荐，改动最小)
    return request({
        url: '/resource/goods/list',
        method: 'get',
        params: {
            stationId: stationId,
            status: 2, // 只查在库可用的物资
            pageSize: 50
        }
    })
}

// 线下手工出入库/损耗校准
export function adjustGoodsStock(data) {
    return request({
        url: '/resource/goods/adjust',
        method: 'post',
        data // 包含 goodsId, adjustType, diffCount, reason
    })
}
