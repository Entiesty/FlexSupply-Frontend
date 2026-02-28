import request from '@/utils/request'

// ================= 物资库存 (Goods) =================

/**
 * 商家捐赠物资入库
 * @param {object} data 物资详情对象
 */
export function donateGoods(data) {
    return request({
        url: '/resource/goods/donate', //
        method: 'post',
        data: data // 对应 @RequestBody
    })
}

/**
 * 分页查询可用物资库存
 * @param {object} params 包含 stationId, category, pageNum, pageSize
 */
export function getGoodsList(params) {
    return request({
        url: '/resource/goods/list', //
        method: 'get',
        params: params // 对应 @RequestParam
    })
}

// ================= 社区据点 (Station) =================

/**
 * 新增社区据点 (将同步至 Redis)
 * @param {object} data 据点详情对象
 */
export function addStation(data) {
    return request({
        url: '/resource/station/add', //
        method: 'post',
        data: data // 对应 @RequestBody
    })
}

/**
 * 分页获取所有据点
 * @param {object} params 包含 pageNum, pageSize
 */
export function getStationList(params) {
    return request({
        url: '/resource/station/list', //
        method: 'get',
        params: params // 对应 @RequestParam
    })
}