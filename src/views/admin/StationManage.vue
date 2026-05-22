<template>
  <div class="workspace-container">
    <div class="page-header">
      <div class="header-left">
        <div class="icon-wrapper"><el-icon><OfficeBuilding /></el-icon></div>
        <div>
          <h1 class="page-title">社区驿站管理</h1>
          <p class="page-subtitle">调度网络地基 - 维护全城“食物银行”与应急核心枢纽</p>
        </div>
      </div>
      <div class="header-right">
        <button class="btn-main grab" @click="openAddDialog">
          <el-icon><Plus /></el-icon> 设立新物理据点
        </button>
      </div>
    </div>

    <div class="stats-header">
      <div class="stat-card">
        <div class="stat-icon database">🌍</div>
        <div class="stat-info">
          <p>当前全网据点总数</p>
          <h3>{{ total }} <span class="unit">个</span></h3>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon success">🚨</div>
        <div class="stat-info">
          <p>核心应急枢纽 (本页)</p>
          <h3>{{ tableData.filter(d => d.isEmergencyHub === 1).length }} <span class="unit">个</span></h3>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon dispatching">🧊</div>
        <div class="stat-info">
          <p>具备冷链能力 (本页)</p>
          <h3>{{ tableData.filter(d => d.hasFreezer === 1).length }} <span class="unit">个</span></h3>
        </div>
      </div>
    </div>

    <div class="table-wrapper">
      <div class="filter-bar">
        <el-form :inline="true" :model="queryParams" class="demo-form-inline">
          <el-form-item label="据点检索">
            <el-input v-model="queryParams.stationName" placeholder="输入据点名称" clearable prefix-icon="Search" />
          </el-form-item>
          <el-form-item label="网点类型">
            <el-select v-model="queryParams.isEmergencyHub" placeholder="全部类型" clearable style="width: 140px">
              <el-option label="普通社区网点" :value="0" />
              <el-option label="核心应急枢纽" :value="1" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" class="custom-search-btn" @click="handleSearch">
              <el-icon><Search /></el-icon> 精准检索
            </el-button>
            <el-button @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table
          v-loading="loading"
          :data="tableData"
          style="width: 100%"
          class="custom-table"
          :header-cell-style="{ background: '#f8fafc', color: '#475569', fontWeight: '900', fontSize: '0.95rem' }"
          empty-text="暂无据点数据，请先设立"
      >
        <el-table-column label="网点类型" width="150" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.isEmergencyHub === 1 ? 'danger' : 'info'" effect="dark" size="large">
              {{ scope.row.isEmergencyHub === 1 ? '🚨 应急枢纽' : '🟢 普通网点' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="据点核心信息" min-width="280" align="left">
          <template #default="{ row }">
            <div class="goods-info-cell">
              <div class="goods-main">
                <span class="g-name" :title="row.stationName">📍 {{ row.stationName }}</span>
                <el-tag v-if="row.hasFreezer === 1" type="primary" effect="plain" size="small">🧊 冷链支持</el-tag>
                <el-tag v-else type="info" effect="plain" size="small">📦 常温仓储</el-tag>
              </div>
              <div class="goods-sub">
                <el-icon class="sub-icon"><Location /></el-icon>
                <span class="addr-text" :title="row.address">{{ row.address || '地址未录入' }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="地理坐标" width="200" align="left">
          <template #default="{ row }">
            <div class="coord-cell" v-if="row.longitude && row.latitude">
              <span class="coord-line">Lng: {{ Number(row.longitude).toFixed(6) }}</span>
              <span class="coord-line">Lat: {{ Number(row.latitude).toFixed(6) }}</span>
            </div>
            <span v-else class="coord-na">未设置</span>
          </template>
        </el-table-column>

        <el-table-column label="指挥中心干预" width="220" fixed="right" align="center">
          <template #default="scope">
            <el-button link type="warning" class="inventory-btn" @click="openInventoryDrawer(scope.row)">
              📦 大仓台账
            </el-button>
            <el-button link type="primary" class="detail-btn" @click="openEditDialog(scope.row)">
              <el-icon><Setting /></el-icon> 重新配置
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container" v-if="total > 0">
        <el-pagination
            v-model:current-page="queryParams.pageNum"
            v-model:page-size="queryParams.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :background="true"
            layout="total, sizes, prev, pager, next, jumper"
            :total="total"
            @size-change="fetchData"
            @current-change="fetchData"
        />
      </div>
    </div>

    <el-drawer v-model="inventoryDrawerVisible" size="60%" custom-class="inventory-drawer" :with-header="false" destroy-on-close>
      <div class="drawer-header">
        <div>
          <h2>📦 {{ currentStation?.stationName }} - 实时大仓台账</h2>
          <p>当前展示所有已入库可调度的城市援助物资</p>
        </div>
        <el-button round @click="inventoryDrawerVisible = false">关闭面板</el-button>
      </div>

      <div class="drawer-body" v-loading="inventoryLoading">
        <el-table :data="inventoryList" style="width: 100%" class="custom-table" empty-text="当前驿站大仓为空，等待志愿者送达物资">
          <el-table-column label="物资归属与名称" min-width="200">
            <template #default="{ row }">
              <div style="font-weight: 900; color: #1e293b;">{{ row.goodsName }}</div>
              <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">{{ row.category }}</div>
            </template>
          </el-table-column>

          <el-table-column label="当前结余库存" width="120" align="center">
            <template #default="{ row }">
              <span style="font-size: 1.2rem; font-weight: 900; color: #f97316;">{{ row.stock }}</span>
            </template>
          </el-table-column>

          <el-table-column label="临期健康度检测" width="180" align="center">
            <template #default="{ row }">
              <div class="expiration-status" :class="getExpirationClass(row.expirationDate)">
                <el-icon><WarningFilled v-if="isWarning(row.expirationDate)" /><CircleCheckFilled v-else /></el-icon>
                {{ getExpirationText(row.expirationDate) }}
              </div>
            </template>
          </el-table-column>

          <el-table-column label="人工干预" width="120" align="center" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="primary" plain @click="openAdjustDialog(row)">人工校准</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-drawer>

    <el-dialog v-model="adjustDialogVisible" title="⚖️ 线下物资出入库/损耗校准" width="450px" custom-class="admin-dialog">
      <el-form :model="adjustForm" label-width="90px" class="modern-form">
        <div class="adjust-target">
          正在校准：<strong>{{ currentAdjustGoods?.goodsName }}</strong> (当前: {{ currentAdjustGoods?.stock }})
        </div>
        <el-form-item label="干预类型" required>
          <el-radio-group v-model="adjustForm.type">
            <el-radio :label="1" class="text-green">⬆️ 线下手工入库 (增加)</el-radio>
            <el-radio :label="2" class="text-red">⬇️ 损耗报废/发放 (扣减)</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="干预数量" required>
          <el-input-number v-model="adjustForm.diffCount" :min="1" :max="999" style="width: 100%;"></el-input-number>
        </el-form-item>
        <el-form-item label="操作事由" required>
          <el-input v-model="adjustForm.reason" placeholder="如：线下被老人领取 / 牛奶包装破损报废" type="textarea" :rows="2"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustDialogVisible = false" round>取消</el-button>
        <el-button type="primary" @click="submitAdjust" :loading="submitting" round class="custom-search-btn" style="border: none;">确认强制平账</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="dialogVisible" :title="isEditMode ? '⚙️ 编辑据点配置' : '📍 设立新物理据点'" width="680px" custom-class="admin-dialog" destroy-on-close>
      <el-form :model="form" label-width="110px" @submit.prevent class="modern-form">

        <div class="form-section-title">📍 基础与物理定位</div>
        <el-form-item label="据点名称" required>
          <el-input v-model="form.stationName" placeholder="例如：厦门理工学院南门青年驿站" clearable></el-input>
        </el-form-item>

        <el-form-item label="坐标与地址" required>
          <div class="location-picker-box">
            <div class="loc-display" :class="{'has-val': form.longitude}">
              <div class="loc-address">{{ form.address || '尚未设置坐标，请点击右侧按钮进行地图选点' }}</div>
              <div class="loc-coords" v-if="form.longitude">
                Lon: {{ Number(form.longitude).toFixed(6) }} | Lat: {{ Number(form.latitude).toFixed(6) }}
              </div>
            </div>
            <button type="button" class="pick-map-btn" @click="openMapDialog">
              <el-icon><MapLocation /></el-icon> 地图选点
            </button>
          </div>
        </el-form-item>
        <p class="form-tip friendly-tip">💡 修改坐标将立即同步至 Redis GEO 缓存，调度引擎实时生效。</p>

        <div class="form-section-title">⚡ 硬件与调度能力</div>

        <el-form-item label="平急两用属性">
          <div class="card-radio-group">
            <div class="radio-card" :class="{ active: form.isEmergencyHub === 0 }" @click="form.isEmergencyHub = 0">
              <div class="rc-icon">🏘️</div>
              <div class="rc-content">
                <h4>普通社区网点</h4>
                <p>日常互助物资流转</p>
              </div>
            </div>
            <div class="radio-card theme-red" :class="{ active: form.isEmergencyHub === 1 }" @click="form.isEmergencyHub = 1">
              <div class="rc-icon">🚨</div>
              <div class="rc-content">
                <h4>核心应急枢纽</h4>
                <p>灾时提供特保避难</p>
              </div>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="冷链储藏能力">
          <div class="card-radio-group">
            <div class="radio-card" :class="{ active: form.hasFreezer === 0 }" @click="form.hasFreezer = 0">
              <div class="rc-icon">📦</div>
              <div class="rc-content">
                <h4>无冷链 (常温)</h4>
                <p>仅支持普通干货</p>
              </div>
            </div>
            <div class="radio-card theme-blue" :class="{ active: form.hasFreezer === 1 }" @click="form.hasFreezer = 1">
              <div class="rc-icon">🧊</div>
              <div class="rc-content">
                <h4>冷链储藏级</h4>
                <p>配有冰柜支持生鲜</p>
              </div>
            </div>
          </div>
        </el-form-item>

      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false" round>取消</el-button>
        <el-button type="primary" @click="submitAdd" :loading="submitting" round class="custom-search-btn" style="border: none; padding: 0 25px; font-size: 1.05rem;">
          {{ isEditMode ? '💾 保存配置修改' : '🚀 确认设立并入网' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="mapVisible" title="据点物理坐标定位" width="750px" @opened="initMap" destroy-on-close custom-class="map-dialog">
      <div class="map-search-bar">
        <el-autocomplete v-model="searchKeyword" :fetch-suggestions="querySearchAsync" placeholder="请输入详细地址 (边打字边出精准提示)" @select="handleSelectPoi" class="map-search-input-wrap" value-key="name" :trigger-on-focus="false" clearable @keyup.enter="handleSearchAddress">
          <template #default="{ item }"><div class="custom-poi-item"><div class="poi-name">{{ item.name }}</div><div class="poi-address">{{ item.district || '' }}{{ item.address || '' }}</div></div></template>
        </el-autocomplete>
        <button class="map-search-btn" @click="handleSearchAddress">🔍 搜索</button>
      </div>
      <div class="map-top-tip" style="margin-top: 10px;"><span class="tip-icon">👆</span> 您可以搜索具体地址，也可以在下方地图中直接点击选点</div>
      <div class="selected-address-bar" v-if="tempLoc.address"><strong>当前选中：</strong> {{ tempLoc.address }}</div>
      <div id="amap-container" class="amap-box"></div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="mapVisible = false" round>取消</el-button>
          <el-button type="primary" @click="confirmLocation" :disabled="!tempLoc.lng" round class="custom-search-btn" style="border: none;">确认据点坐标</el-button>
        </span>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Search, OfficeBuilding, Plus, Location, Setting, MapLocation, WarningFilled, CircleCheckFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import AMapLoader from '@amap/amap-jsapi-loader'

import { getStationPage, addStation, updateStation, getStationGoods, adjustGoodsStock } from '@/api/resource'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const queryParams = reactive({ pageNum: 1, pageSize: 10, stationName: '', isEmergencyHub: null })

const dialogVisible = ref(false)
const submitting = ref(false)
const isEditMode = ref(false)

const form = reactive({ stationId: null, stationName: '', address: '', longitude: '', latitude: '', isEmergencyHub: 0, hasFreezer: 0 })

// ================= 大仓库存核心逻辑 =================
const inventoryDrawerVisible = ref(false)
const inventoryLoading = ref(false)
const currentStation = ref(null)
const inventoryList = ref([])

const adjustDialogVisible = ref(false)
const currentAdjustGoods = ref(null)
const adjustForm = reactive({ type: 2, diffCount: 1, reason: '' })

const isWarning = (dateStr) => {
  if (!dateStr) return false
  const expDate = new Date(dateStr).getTime()
  const now = new Date().getTime()
  return (expDate - now) < 72 * 60 * 60 * 1000
}

const getExpirationClass = (dateStr) => {
  if (!dateStr) return 'exp-safe'
  const expDate = new Date(dateStr).getTime()
  const now = new Date().getTime()
  if (expDate < now) return 'exp-danger'
  if (expDate - now < 72 * 60 * 60 * 1000) return 'exp-warning'
  return 'exp-safe'
}

const getExpirationText = (dateStr) => {
  if (!dateStr) return '常温长期'
  const expDate = new Date(dateStr).getTime()
  const now = new Date().getTime()
  if (expDate < now) return '🚨 已过期，请核销'
  const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24))
  if (diffDays <= 3) return `⚠️ 临近过期 (${diffDays}天)`
  return `✅ 健康 (剩 ${diffDays}天)`
}

const openInventoryDrawer = async (row) => {
  currentStation.value = row
  inventoryDrawerVisible.value = true
  fetchInventory(row.stationId)
}

const fetchInventory = async (stationId) => {
  inventoryLoading.value = true
  try {
    const res = await getStationGoods(stationId)
    // 🚨 核心修复：加上 .records，剥离出真正的数组解构给 el-table
    inventoryList.value = res.data.records || []
  } catch (error) {
    ElMessage.error('拉取大仓台账失败')
  } finally {
    inventoryLoading.value = false
  }
}

const openAdjustDialog = (goods) => {
  currentAdjustGoods.value = goods
  adjustForm.type = 2
  adjustForm.diffCount = 1
  adjustForm.reason = ''
  adjustDialogVisible.value = true
}

const submitAdjust = async () => {
  if (!adjustForm.reason.trim()) return ElMessage.warning('必须填写干预理由备查！')
  if (adjustForm.type === 2 && adjustForm.diffCount > currentAdjustGoods.value.stock) {
    return ElMessage.error('扣减数量不能大于当前实际库存！')
  }

  submitting.value = true
  try {
    await adjustGoodsStock({
      goodsId: currentAdjustGoods.value.goodsId,
      adjustType: adjustForm.type,
      diffCount: adjustForm.diffCount,
      reason: adjustForm.reason
    })
    ElMessage.success('大仓数据手工平账成功！')
    adjustDialogVisible.value = false
    fetchInventory(currentStation.value.stationId)
  } catch (error) {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

// ================= 原有据点与地图逻辑 =================

const handleSearch = () => { queryParams.pageNum = 1; fetchData() }
const resetQuery = () => { queryParams.stationName = ''; queryParams.isEmergencyHub = null; handleSearch() }

const openAddDialog = () => {
  isEditMode.value = false
  Object.assign(form, { stationId: null, stationName: '', address: '', longitude: '', latitude: '', isEmergencyHub: 0, hasFreezer: 0 })
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  isEditMode.value = true
  Object.assign(form, {
    stationId: row.stationId, stationName: row.stationName, address: row.address,
    longitude: row.longitude, latitude: row.latitude, isEmergencyHub: row.isEmergencyHub,
    hasFreezer: row.hasFreezer
  })
  dialogVisible.value = true
}

const submitAdd = async () => {
  if (!form.stationName || !form.address || !form.longitude || !form.latitude) {
    return ElMessage.warning('请完整填写据点名称，并使用地图选点获取真实坐标！')
  }
  submitting.value = true
  try {
    const payload = { ...form, longitude: parseFloat(form.longitude), latitude: parseFloat(form.latitude) }
    if (isEditMode.value) {
      await updateStation(payload)
      ElMessage.success('🎉 物理据点配置已更新！调度引擎 LBS 缓存已同步。')
    } else {
      await addStation(payload)
      ElMessage.success('🎉 物理据点设立成功，已接入全局调度网络！')
    }
    dialogVisible.value = false
    fetchData()
  } catch (error) { ElMessage.error(isEditMode.value ? '更新失败' : '新增失败') }
  finally { submitting.value = false }
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getStationPage(queryParams)
    tableData.value = res.data.records || []
    total.value = res.data.total || 0
  } catch (error) { ElMessage.error('无法拉取物理据点数据') }
  finally { loading.value = false }
}

onMounted(() => {
  fetchData()
})

const mapVisible = ref(false)
let mapInstance = null, markerInstance = null, geocoderInstance = null, autoCompleteInstance = null
const searchKeyword = ref(''), tempLoc = reactive({ lng: '', lat: '', address: '' })
const openMapDialog = () => { tempLoc.lng = form.longitude; tempLoc.lat = form.latitude; tempLoc.address = form.address; searchKeyword.value = ''; mapVisible.value = true }
const querySearchAsync = (queryString, cb) => { if (!queryString || !autoCompleteInstance) { cb([]); return; } autoCompleteInstance.search(queryString, (status, result) => { if (status === 'complete' && result.tips) { cb(result.tips.filter(item => item.location)) } else { cb([]) } }) }
const handleSelectPoi = (poi) => { if (poi && poi.location) { const addressName = (poi.district || '') + (poi.address || '') + (poi.name || ''); updateMapByLocation(poi.location.getLng(), poi.location.getLat(), addressName); searchKeyword.value = poi.name; ElMessage.success('已自动定位至选中地点！') } }
const handleSearchAddress = () => { const keyword = searchKeyword.value.trim(); if (!keyword) return ElMessage.warning('请输入要搜索的地址'); if (!geocoderInstance || !mapInstance) return ElMessage.error('地图组件未就绪'); geocoderInstance.getLocation(keyword, (status, result) => { if (status === 'complete' && result.info === 'OK' && result.geocodes.length > 0) { const bestMatch = result.geocodes[0]; updateMapByLocation(bestMatch.location.getLng(), bestMatch.location.getLat(), bestMatch.formattedAddress); ElMessage.success('精准定位成功！') } else { ElMessage.warning('无法在地图上找到该地址') } }) }
const updateMapByLocation = (lng, lat, addressStr) => { tempLoc.lng = lng; tempLoc.lat = lat; tempLoc.address = addressStr; mapInstance.setZoomAndCenter(16, [lng, lat], false, 1000); if (markerInstance) markerInstance.setPosition([lng, lat]); else { markerInstance = new AMap.Marker({ position: [lng, lat] }); mapInstance.add(markerInstance) } }
const initMap = () => { window._AMapSecurityConfig = { securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE }; AMapLoader.load({ key: import.meta.env.VITE_AMAP_KEY, version: "2.0", plugins: ['AMap.Geocoder', 'AMap.AutoComplete'] }).then((AMap) => { const centerPoint = (tempLoc.lng && tempLoc.lat) ? [tempLoc.lng, tempLoc.lat] : [118.084761, 24.620538]; mapInstance = new AMap.Map("amap-container", { viewMode: "2D", zoom: 15, center: centerPoint }); geocoderInstance = new AMap.Geocoder({ radius: 1000, extensions: "all" }); autoCompleteInstance = new AMap.AutoComplete({}); if (tempLoc.lng) { markerInstance = new AMap.Marker({ position: centerPoint }); mapInstance.add(markerInstance) } mapInstance.on('click', (e) => { const lng = e.lnglat.getLng(), lat = e.lnglat.getLat(); geocoderInstance.getAddress([lng, lat], (status, result) => { let addr = '该区域暂无详细街道信息'; if (status === 'complete' && result.info === 'OK') addr = result.regeocode.formattedAddress; updateMapByLocation(lng, lat, addr) }) }) }).catch(e => { console.error(e); ElMessage.error('地图引擎初始化失败') }) }
const confirmLocation = () => { form.longitude = tempLoc.lng; form.latitude = tempLoc.lat; form.address = tempLoc.address; mapVisible.value = false }
</script>

<style scoped>
/* =========== Element Plus 品牌色全局覆写 =========== */
:deep(.el-button--primary) { --el-button-bg-color: #f97316; --el-button-border-color: #f97316; --el-button-hover-bg-color: #ea580c; --el-button-hover-border-color: #ea580c; --el-button-active-bg-color: #c2410c; }
:deep(.el-pagination.is-background .el-pager li.is-active) { background-color: #f97316 !important; }
:deep(.el-select .el-input.is-focus .el-input__wrapper) { box-shadow: 0 0 0 1px #f97316 inset !important; }
:deep(.el-input.is-focus .el-input__wrapper) { box-shadow: 0 0 0 1px #f97316 inset !important; }
:deep(.el-radio__input.is-checked .el-radio__inner) { background-color: #f97316; border-color: #f97316; }
:deep(.el-radio__input.is-checked + .el-radio__label) { color: #f97316; }
:deep(.el-drawer__header) { margin-bottom: 0; padding: 20px 24px; border-bottom: 1px solid #f1f5f9; font-weight: 900; font-size: 1.15rem; color: #0f172a; }

/* =========== 框架与布局结构 =========== */
.workspace-container { flex: 1; width: 100%; height: 100vh; overflow-y: auto; background: #f8fafc; padding: 40px 50px; box-sizing: border-box; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 35px; flex-shrink: 0; }
.header-left { display: flex; align-items: center; gap: 18px; }
.icon-wrapper { width: 52px; height: 52px; background: linear-gradient(135deg, #f97316, #ea580c); color: white; border-radius: 14px; display: flex; justify-content: center; align-items: center; font-size: 26px; box-shadow: 0 8px 20px rgba(249, 115, 22, 0.3); }
.page-title { font-size: 24px; font-weight: 900; color: #0f172a; margin: 0 0 6px; letter-spacing: 0.5px; }
.page-subtitle { font-size: 14px; color: #64748b; margin: 0; font-weight: 500;}

.btn-main { padding: 12px 24px; border: none; border-radius: 12px; color: white; font-weight: 900; font-size: 15px; cursor: pointer; transition: 0.3s; letter-spacing: 1px; display: flex; align-items: center; gap: 8px; }
.btn-main.grab { background: linear-gradient(135deg, #f97316, #ea580c); box-shadow: 0 6px 15px rgba(249, 115, 22, 0.3); }
.btn-main.grab:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(249, 115, 22, 0.4); }

.stats-header { display: flex; gap: 20px; margin-bottom: 24px; }
.stat-card { flex: 1; background: #fff; border-radius: 20px; padding: 20px 24px; display: flex; align-items: center; gap: 20px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02); transition: transform 0.3s; }
.stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); }
.stat-icon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 28px; }
.stat-icon.database { background: #fef2f2; color: #ef4444; }
.stat-icon.dispatching { background: #f0f9ff; color: #0ea5e9; }
.stat-icon.success { background: #ecfdf5; color: #10b981; }
.stat-info p { margin: 0; font-size: 0.85rem; color: #64748b; font-weight: bold; }
.stat-info h3 { margin: 5px 0 0 0; font-size: 1.8rem; color: #1e293b; font-weight: 900; }
.unit { font-size: 0.9rem; color: #94a3b8; font-weight: normal; }

/* =========== 表格容器与基础样式 =========== */
.table-wrapper { background: #fff; border-radius: 20px; padding: 24px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02); box-sizing: border-box; width: 100%; flex: 1; display: flex; flex-direction: column;}
.filter-bar { margin-bottom: 20px; }
.custom-search-btn { background: linear-gradient(135deg, #f97316, #ea580c); border: none; font-weight: bold; color: #fff; border-radius: 8px;}
.custom-search-btn:hover { background: linear-gradient(135deg, #ea580c, #c2410c); color: #fff; }

.custom-table { border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; flex: 1; }
:deep(.el-table th.el-table__cell) { border-bottom: 2px solid #f1f5f9; padding: 16px 0; text-align: center !important;}
:deep(.el-table td.el-table__cell) { padding: 18px 0; border-bottom: 1px dashed #f1f5f9; color: #334155; }
:deep(.el-table__inner-wrapper::before) { display: none; }

/* =========== 🚀 核心信息列 =========== */
.goods-info-cell { display: flex; flex-direction: column; gap: 8px;}
.goods-main { display: flex; align-items: center; gap: 10px; }
.g-name { font-weight: 900; color: #0f172a; font-size: 1.1rem; }
.manager-name { font-weight: 900; color: #1e293b; font-size: 0.95rem; }
.goods-sub { display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 0.85rem; width: 100%; min-width: 0; }
.sub-icon { flex-shrink: 0; font-size: 1rem; color: #94a3b8;}
.addr-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; font-weight: 500;}

/* =========== 操作列样式 =========== */
.inventory-btn { font-weight: 900; font-size: 1rem; margin-right: 10px; color: #f97316 !important; }
.inventory-btn:hover { color: #ea580c !important; }
.detail-btn { font-weight: bold; color: #f97316 !important; }
.detail-btn:hover { color: #ea580c !important; }

.pagination-container { margin-top: 24px; display: flex; justify-content: flex-end; }
:deep(.el-pagination.is-background .el-pager li.is-active) { background-color: #f97316 !important; color: #fff !important; }

/* =========== 大仓抽屉与状态样式 =========== */
:deep(.inventory-drawer .el-drawer__body) { padding: 0; background: #f8fafc; display: flex; flex-direction: column;}
.drawer-header { padding: 25px 30px; background: #fff; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
.drawer-header h2 { margin: 0 0 5px; color: #1e293b; font-weight: 900; font-size: 1.5rem; }
.drawer-header p { margin: 0; color: #64748b; font-size: 0.95rem; }
.drawer-body { padding: 20px 30px; flex: 1; overflow-y: auto; }

.expiration-status { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 8px; font-size: 0.85rem; font-weight: bold; }
.exp-safe { background: #ecfdf5; color: #10b981; }
.exp-warning { background: #fff7ed; color: #f97316; animation: pulse-warning 2s infinite; }
.exp-danger { background: #fef2f2; color: #ef4444; }
@keyframes pulse-warning { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

.adjust-target { background: #f1f5f9; padding: 12px; border-radius: 10px; margin-bottom: 20px; color: #475569; font-size: 0.95rem; text-align: center; }
.text-green { color: #10b981; font-weight: bold; }
.text-red { color: #ef4444; font-weight: bold; }

/* =========== 坐标列样式 =========== */
.coord-cell { display: flex; flex-direction: column; gap: 3px; font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; }
.coord-line { font-size: 0.78rem; color: #64748b; font-weight: 500; }
.coord-na { font-size: 0.8rem; color: #94a3b8; font-style: italic; }

/* =========== 弹窗及重构样式 =========== */
:deep(.admin-dialog), :deep(.map-dialog) { border-radius: 20px; overflow: hidden; }
:deep(.el-dialog__header) { background: #f8fafc; padding: 20px 25px; margin-right: 0; border-bottom: 1px solid #f1f5f9; font-weight: 900; color: #0f172a;}

/* 视觉区块分组标题 */
.form-section-title { font-size: 1.05rem; font-weight: 900; color: #1e293b; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px dashed #e2e8f0; display: flex; align-items: center; gap: 8px;}

/* 交互卡片样式 */
.card-radio-group { display: flex; gap: 15px; width: 100%; }
.radio-card { flex: 1; display: flex; align-items: center; gap: 12px; padding: 15px; border-radius: 12px; border: 2px solid #e2e8f0; background: #fff; cursor: pointer; transition: all 0.3s; box-shadow: 0 2px 10px rgba(0,0,0,0.02); }
.radio-card:hover { border-color: #cbd5e1; transform: translateY(-2px); }
.rc-icon { font-size: 2rem; background: #f1f5f9; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 10px; transition: 0.3s;}
.rc-content h4 { margin: 0 0 4px 0; font-size: 0.95rem; font-weight: 900; color: #334155; }
.rc-content p { margin: 0; font-size: 0.75rem; color: #94a3b8; font-weight: bold; }

/* 卡片激活状态 - 泛用橙色 */
.radio-card.active { border-color: #f97316; background: #fff7ed; box-shadow: 0 6px 15px rgba(249, 115, 22, 0.15); }
.radio-card.active .rc-icon { background: #ffedd5; color: #ea580c; }
.radio-card.active .rc-content h4 { color: #9a3412; }

/* 卡片激活状态 - 红色应急警示 */
.radio-card.theme-red.active { border-color: #ef4444; background: #fef2f2; box-shadow: 0 6px 15px rgba(239, 68, 68, 0.15); }
.radio-card.theme-red.active .rc-icon { background: #fee2e2; color: #dc2626; }
.radio-card.theme-red.active .rc-content h4 { color: #991b1b; }

/* 卡片激活状态 - 蓝色冷链冰霜 */
.radio-card.theme-blue.active { border-color: #0ea5e9; background: #f0f9ff; box-shadow: 0 6px 15px rgba(14, 165, 233, 0.15); }
.radio-card.theme-blue.active .rc-icon { background: #e0f2fe; color: #0284c7; }
.radio-card.theme-blue.active .rc-content h4 { color: #075985; }

/* 友好的文案提示 */
.friendly-tip { font-size: 0.8rem; color: #059669; padding: 8px 15px; margin-top: 5px; margin-bottom: 20px; font-weight: bold; background: #ecfdf5; border-radius: 8px; margin-left: 110px; display: inline-block; border: 1px dashed #a7f3d0;}

.location-picker-box { display: flex; align-items: stretch; gap: 15px; width: 100%;}
.loc-display { flex: 1; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 10px 15px; display: flex; flex-direction: column; justify-content: center; transition: 0.3s;}
.loc-display.has-val { background: #f0fdf4; border: 2px solid #86efac; border-style: solid;}
.loc-address { font-size: 0.9rem; color: #64748b; font-weight: bold; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.loc-display.has-val .loc-address { color: #166534; font-size: 0.95rem;}
.loc-coords { font-family: monospace; font-size: 0.8rem; color: #10b981; margin-top: 4px; font-weight: bold;}

.pick-map-btn { display: flex; align-items: center; justify-content: center; gap: 6px; background: #fff; border: 2px solid #f97316; color: #f97316; font-weight: 900; border-radius: 12px; padding: 0 15px; cursor: pointer; transition: 0.2s; white-space: nowrap; box-shadow: 0 4px 10px rgba(249,115,22,0.1); }
.pick-map-btn:hover { background: #f97316; color: #fff; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(249,115,22,0.25);}

.map-search-bar { display: flex; gap: 10px; margin-bottom: 15px; }
.map-search-input-wrap { flex: 1; }
:deep(.map-search-input-wrap .el-input__wrapper) { border-radius: 10px; box-shadow: 0 0 0 2px #e2e8f0 inset; padding: 4px 15px; }
:deep(.map-search-input-wrap .el-input__wrapper.is-focus) { box-shadow: 0 0 0 2px #f97316 inset !important; }
.map-search-btn { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 0 20px; background: #f97316; color: #fff; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; transition: 0.2s;}
.map-search-btn:hover { background: #ea580c; }

.map-top-tip { background: #fff7ed; color: #ea580c; padding: 10px 15px; border-radius: 8px; font-size: 0.9rem; font-weight: bold; margin-bottom: 15px; }
.selected-address-bar { background: #f1f5f9; padding: 12px 15px; border-radius: 8px; margin-bottom: 15px; color: #1e293b; font-size: 0.95rem; border-left: 4px solid #f97316; font-weight: 500;}
.amap-box { width: 100%; height: 380px; border-radius: 12px; overflow: hidden; border: 2px solid #e2e8f0; }
.custom-poi-item { line-height: 1.4; padding: 5px 0; }
.poi-name { font-weight: bold; color: #1e293b; font-size: 0.95rem; text-overflow: ellipsis; overflow: hidden; }
.poi-address { font-size: 0.75rem; color: #94a3b8; text-overflow: ellipsis; overflow: hidden; margin-top: 2px; }
</style>