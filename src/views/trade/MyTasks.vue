<template>
  <div class="workspace-container">
    <!-- ========== Step 1: 统一骑手状态横幅 ========== -->
    <div class="rider-status-bar">
      <div class="status-bar-left">
        <div class="icon-wrapper"><el-icon><Monitor /></el-icon></div>
        <h1 class="page-title">运力调度工作台</h1>
        <span class="gps-tag" :class="gpsStatusClass">
          <span class="pulse-dot"></span>
          {{ gpsShortLabel }}
        </span>
      </div>
      <div class="status-bar-right">
        <div class="credit-inline">
          <span class="credit-icon">🏆</span>
          <span class="credit-label">信誉分</span>
          <span class="credit-value">{{ currentCredit }}</span>
        </div>
      </div>
    </div>

    <!-- ========== 分段控制器 (保持) ========== -->
    <div class="segmented-control">
      <div class="segment-btn" :class="{ active: activeTab === 'available' }" @click="switchTab('available')">
        <span class="dot" v-if="activeTab === 'available'"></span> 抢单大厅
        <span class="live-badge" v-if="activeTab === 'available'">Live</span>
      </div>
      <div class="segment-btn" :class="{ active: activeTab === 'progress' }" @click="switchTab('progress')">
        <span class="dot" v-if="activeTab === 'progress'"></span> 正在护送
      </div>
      <div class="segment-btn" :class="{ active: activeTab === 'history' }" @click="switchTab('history')">
        <span class="dot" v-if="activeTab === 'history'"></span> 历史档案
      </div>
    </div>

    <!-- ========== 任务列表 ========== -->
    <div class="task-list-wrapper" v-loading="loading && taskList.length === 0" element-loading-text="调度引擎数据同步中..." element-loading-background="rgba(248, 250, 252, 0.75)">
      <div v-if="!loading && taskList.length === 0" class="empty-status">
        <div class="radar-spinner" v-if="activeTab === 'available'"></div>
        <el-icon class="empty-icon" v-else><Compass /></el-icon>
        <h3>{{ activeTab === 'available' ? '城市雷达扫掠中，暂无调度需求' : '当前频段暂无任务数据' }}</h3>
      </div>

      <transition-group name="list" tag="div" class="task-list-animator">
        <!-- ✅ FIX-3: SOS急救呼吸灯 + 超载拦截 -->
        <div class="task-card" v-for="item in taskList" :key="item.orderId || item.taskId" :class="{ overloaded: activeTab === 'available' && isOverCapacity(item), 'sos-emergency': isSosOrder(item) }">

          <!-- ===== Step 2a: 卡片顶部条带 ===== -->
          <div class="card-strip">
            <div class="strip-left">
              <span class="strip-sn">{{ item.orderSn }}</span>
              <span class="strip-time">🕒 {{ item.createTime || '近期' }}</span>
            </div>
            <div class="strip-right">
              <span class="type-badge" :class="isDonation(item.orderSn) ? 'bg-blue' : 'bg-red'">
                {{ isDonation(item.orderSn) ? '🔵 捐赠集货' : '🔴 紧急求助' }}
              </span>
              <span class="urgency-badge" :class="'urgency-' + (item.urgencyLevel || 5)">
                {{ formatUrgency(item.urgencyLevel) }}
              </span>
            </div>
          </div>

          <!-- ===== Step 2b-2e: 卡片主体 (路线中心 + 右面板) ===== -->
          <div class="card-body">
            <!-- 路线视觉中心 -->
            <div class="route-visual">
              <!-- 取件点 -->
              <div class="route-point source-box" :class="{ 'is-done': item.taskStatus === 2 }">
                <div class="point-icon source">
                  <el-icon v-if="item.taskStatus === 2"><Check /></el-icon>
                  <span v-else>取</span>
                </div>
                <div class="point-info">
                  <div class="p-name" :title="item.sourceName">{{ item.sourceName || '起点未知' }}</div>
                  <div class="p-address" :title="item.sourceAddress">{{ item.sourceAddress || '地址未录入' }}</div>
                  <div class="p-dist" v-if="activeTab === 'available'">
                    📍 接驾距离 {{ calculateStraightDistance(currentLocation.lon, currentLocation.lat, item.sourceLon, item.sourceLat) }}km
                  </div>
                </div>
              </div>

              <!-- 路线箭头 + 配送距离 -->
              <div class="route-arrow">
                <div class="arrow-line"></div>
                <el-icon class="arrow-icon"><Right /></el-icon>
                <span class="arrow-dist" v-if="activeTab === 'available'">
                  🛵 配送 {{ calculateStraightDistance(item.sourceLon, item.sourceLat, item.targetLon, item.targetLat) }}km
                </span>
              </div>

              <!-- 送达点 -->
              <div class="route-point target-box">
                <div class="point-icon target">送</div>
                <div class="point-info">
                  <div class="p-name" :title="item.targetName">{{ item.targetName || '终点未知' }}</div>
                  <div class="p-address" :title="item.targetAddress">{{ item.targetAddress || '地址未录入' }}</div>
                </div>
              </div>

              <!-- Step 2e: 微标签 -->
              <div class="micro-tags" v-if="getMicroTags(item).length > 0">
                <span class="m-tag" v-for="(tag, idx) in getMicroTags(item)" :key="idx">{{ tag }}</span>
              </div>
            </div>

            <!-- Step 2c+2d+3: 右侧面板 (调度分 + 物资胶囊 + 操作) -->
            <div class="card-right">
              <div class="score-badge" v-if="activeTab === 'available' && item.matchScore">
                <span class="score-ring"></span>
                匹配度 {{ item.matchScore.toFixed(2) }}
              </div>

              <div class="goods-capsule" v-if="item.goodsName || item.requiredCategory">
                <span class="capsule-name">📦 {{ item.goodsName || item.requiredCategory }}</span>
                <span class="goods-qty">× {{ item.goodsCount || 0 }}</span>
              </div>

              <div class="card-actions">
                <!-- 超载订单：语义状态说明牌 -->
                <div v-if="activeTab === 'available' && isOverCapacity(item)" class="overload-plaque">
                  <span class="overload-title">🧳 超出当前载具承载上限</span>
                  <span class="overload-sub">{{ capacitySubtitle(item) }}</span>
                </div>
                <template v-else>
                  <button class="btn-tool" @click="openMapPreview(item)" :disabled="!isValidCoordinate(item.sourceLon, item.sourceLat) || !isValidCoordinate(item.targetLon, item.targetLat)">
                    <el-icon><MapLocation /></el-icon> 路线推演
                  </button>
                  <button v-if="activeTab === 'available'" class="btn-main grab" @click="handleGrab(item)">⚡ 立即响应</button>
                  <template v-if="activeTab === 'progress'">
                    <button v-if="item.taskStatus === 1" class="btn-main pickup" @click="handlePickup(item)">📦 我已取货</button>
                    <button v-else-if="item.taskStatus === 2" class="btn-main finish" @click="openCheckoutDialog(item)">📸 送达核销</button>
                  </template>
                </template>
              </div>
            </div>
          </div>

        </div>
      </transition-group>
    </div>

    <!-- ========== 路线推演弹窗 ========== -->
    <el-dialog
        v-model="mapDialogVisible"
        title="🗺️ 护航路线导航"
        width="90%"
        style="max-width: 500px; border-radius: 20px; overflow: hidden;"
        destroy-on-close
        @opened="initMapRouting"
    >
      <div class="map-modal-body" v-loading="isMapLoading" element-loading-text="高德引擎路径测算中...">
        <div class="route-segment-control" v-if="currentMapOrder?.taskStatus !== 2">
          <button class="seg-btn" :class="{ active: currentRouteStep === 'all' }" @click="switchRoute('all')">全览</button>
          <button class="seg-btn" :class="{ active: currentRouteStep === 'pickup' }" @click="switchRoute('pickup')">取货路段</button>
          <button class="seg-btn" :class="{ active: currentRouteStep === 'delivery' }" @click="switchRoute('delivery')">送货路段</button>
        </div>
        <div class="route-segment-control" v-else>
          <button class="seg-btn active" style="cursor: default;">📍 专线直达导航 (已取货)</button>
        </div>
        <div id="amap-routing-container" class="amap-container"></div>
        <div class="route-info-float glass-effect">
          <div class="info-item">
            <span class="i-label">📍 当前导航</span>
            <span class="i-value highlight">{{ routeStepName }}</span>
          </div>
          <div class="info-item">
            <span class="i-label">🛣️ 预计距离</span>
            <span class="i-value">{{ routeDistance }}</span>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- ========== 核销弹窗 ========== -->
    <el-dialog v-model="checkoutVisible" title="🛡️ 护航履约确认" width="400px">
      <div class="upload-zone">
        <p class="upload-tip">请上传物资交接现场照片，完成物理世界闭环。</p>
        <el-upload class="custom-uploader" ref="uploadRef" drag action="#" :auto-upload="false" :on-change="handlePhotoSelect" accept="image/*">
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">拖拽图片或 <em>点击上传现场照片</em></div>
        </el-upload>
      </div>
      <template #footer>
        <el-button @click="checkoutVisible = false">暂不核销</el-button>
        <el-button type="success" @click="submitCheckout" :loading="submitLoading">🚀 提交核销归档</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus'
import { Monitor, Right, MapLocation, UploadFilled, Compass, Location, Warning, Check } from '@element-plus/icons-vue'
import { getAvailableOrders, grabTask, getMyTasks, checkOutTask, pickupTask } from '@/api/trade'
import { getUserProfile } from '@/api/user'
import { uploadFile } from '@/api/common'
import { useRoute, useRouter } from 'vue-router'
import AMapLoader from '@amap/amap-jsapi-loader'

const route = useRoute()
const router = useRouter()
const activeTab = ref(route.query.tab || 'available')

const currentCredit = ref(0)
const vehicleType = ref(1) // 载具类型，默认步行
const loading = ref(false)
const taskList = ref([])
let pollingTimer = null

const locStatus = reactive({ type: 'none', label: '引擎雷达搜索中...', color: '#94a3b8' })
const currentLocation = reactive({ lon: null, lat: null })

// === GPS 状态：简化为呼吸灯 Tag ===
const gpsStatusClass = computed(() => {
  if (locStatus.color === '#10b981') return 'online'
  if (locStatus.color === '#f97316') return 'fallback'
  return 'offline'
})
const gpsShortLabel = computed(() => {
  if (locStatus.color === '#10b981') return 'GPS 在线'
  if (locStatus.color === '#f97316') return 'GPS 降级'
  return 'GPS 离线'
})

// ================= 🗺️ 导航引擎与状态变量 =================
const mapDialogVisible = ref(false)
const isMapLoading = ref(false)
const currentMapOrder = ref(null)
const amapRoutingInstance = ref(null)
let ridingPluginA = null
let ridingPluginB = null
let mapMarkers = []  // 自己管理的 Marker 数组，确保切换路段时彻底清除

const currentRouteStep = ref('all')
const routeStepName = ref('全程总览')
const routeDistance = ref('计算中...')

const checkoutVisible = ref(false)
const submitLoading = ref(false)
const currentCheckoutOrder = ref(null)
const selectedPhoto = ref(null)
const uploadRef = ref(null)

const isDonation = (sn) => sn?.startsWith('DON-')
const isValidCoordinate = (lon, lat) => lon && lat && !isNaN(lon) && !isNaN(lat) && lon > 0 && lat > 0

// ===== 双维载具容量校验 (重量 vs 体积，绝对阈值，1对1履约) =====
const toWeightPoints = (level) => level === 3 ? 20 : (level === 2 ? 5 : 1)
const toVolumePoints = (level) => level === 3 ? 40 : (level === 2 ? 5 : 1)

const vehicleCapacity = (vType) => {
  if (vType === 1) return { maxW: 2, maxV: 2 }
  if (vType === 2) return { maxW: 4, maxV: 5 }
  if (vType === 3) return { maxW: 10, maxV: 15 }
  return { maxW: 100, maxV: 100 }
}

// ✅ FIX-3: SOS急救订单检测 (order_type=2 且 urgency>=8)
const isSosOrder = (item) => item.orderSn?.startsWith('SOS') || (item.urgencyLevel >= 8)

const isOverCapacity = (item) => {
  const wl = item.weightLevel || 1
  const vl = item.volumeLevel || 1
  const { maxW, maxV } = vehicleCapacity(vehicleType.value)
  return toWeightPoints(wl) > maxW || toVolumePoints(vl) > maxV
}

// 超载语义诊断：人类可读，拒绝生硬数值
const capacitySubtitle = (item) => {
  const wl = item.weightLevel || 1
  const vl = item.volumeLevel || 1
  const { maxW, maxV } = vehicleCapacity(vehicleType.value)
  const overW = toWeightPoints(wl) > maxW
  const overV = toVolumePoints(vl) > maxV
  if (overW && overV) return '❌ 物资超重且超容，推荐使用汽车配送'
  if (overW) return '🧳 物资过重，超出当前载具承重上限'
  return '📦 物资体积过大，当前载具空间不足'
}

const formatUrgency = (level) => {
  const map = {
    10: '☠️ S级(10级)',
    9: '💀 灾级(9级)',
    8: '🚨 危级(8级)',
    7: '🔴 急级(7级)',
    6: '🟠 较急(6级)',
    5: '🔥 特急(5级)',
    4: '🔴 紧急(4级)',
    3: '🟠 优先(3级)',
    2: '🟡 常规(2级)',
    1: '🟢 顺路(1级)'
  }
  return map[level] || '🟡 常规(1级)'
}

const getMicroTags = (item) => {
  const tags = []
  const name = (item.goodsName || item.requiredCategory || '').toLowerCase()
  if (name.includes('奶') || name.includes('生鲜') || name.includes('菜')) tags.push('🧊 易坏需冷链')
  if (name.includes('药') || name.includes('胰岛素')) tags.push('💊 救命药物')
  if (item.targetName?.includes('老人') || item.targetName?.includes('长者')) tags.push('👵 弱势群体关怀')
  if (item.urgencyLevel >= 4) tags.push('⚡ 限时速达')
  return tags
}

const calculateStraightDistance = (lon1, lat1, lon2, lat2) => {
  if (!isValidCoordinate(lon1, lat1) || !isValidCoordinate(lon2, lat2)) return '未知';
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c).toFixed(1);
}

const initLocationStrategy = async () => {
  let dbLon = null, dbLat = null;
  try {
    const res = await getUserProfile()
    if (res?.data) {
      currentCredit.value = res.data.creditScore || 0
      vehicleType.value = res.data.vehicleType || 1
      dbLon = res.data.currentLon; dbLat = res.data.currentLat;
    }
  } catch (e) { console.warn('获取个人资料失败') }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (pos) => {
          let realLon = pos.coords.longitude; let realLat = pos.coords.latitude;
          if (Math.abs(realLon - 118.1) > 1 || Math.abs(realLat - 24.6) > 1) {
            currentLocation.lon = dbLon || 118.065200; currentLocation.lat = dbLat || 24.615500;
            locStatus.label = 'GPS异地，已降级为档案坐标'; locStatus.color = '#f97316';
          } else {
            currentLocation.lon = realLon; currentLocation.lat = realLat;
            locStatus.label = 'H5 浏览器实时 GPS 接入'; locStatus.color = '#10b981';
          }
          startLifecycle();
        },
        (err) => {
          applyFallbackCoords(dbLon, dbLat);
        },
        { timeout: 5000, enableHighAccuracy: true }
    )
  } else {
    applyFallbackCoords(dbLon, dbLat);
  }
}

const applyFallbackCoords = (lon, lat) => {
  if (lon && lat) {
    currentLocation.lon = lon; currentLocation.lat = lat;
    locStatus.label = '已降级为档案常驻坐标'; locStatus.color = '#f97316';
    startLifecycle()
  } else {
    locStatus.label = '未授权且无基站数据'; locStatus.color = '#ef4444';
    ElMessageBox.confirm('系统无法获取您的实时GPS，且档案中无常驻坐标，调度引擎瘫痪！', '盲区警告', { confirmButtonText: '前往绑定', type: 'error' }).then(() => router.push('/volunteer/profile')).catch(() => startLifecycle())
  }
}

const startLifecycle = () => {
  loadData();
  managePolling();
}

const managePolling = () => {
  if (pollingTimer) clearInterval(pollingTimer)
  if (activeTab.value === 'available') {
    pollingTimer = setInterval(() => {
      loadData(true)
    }, 6000)
  }
}

const switchTab = async (tab) => {
  if (activeTab.value === tab) return
  activeTab.value = tab
  managePolling()
  await loadData()
}

const loadData = async (isSilent = false) => {
  if (!isSilent) loading.value = true
  try {
    let res;
    if (activeTab.value === 'available') {
      const params = {}
      if (currentLocation.lon && currentLocation.lat) {
        params.currentLon = currentLocation.lon
        params.currentLat = currentLocation.lat
      }
      res = await getAvailableOrders(params)
    }
    else {
      const backendStatus = activeTab.value === 'progress' ? 1 : 3
      res = await getMyTasks({ status: backendStatus })
    }
    const rawData = res.data
    if (Array.isArray(rawData)) taskList.value = rawData
    else if (rawData && Array.isArray(rawData.records)) taskList.value = rawData.records
    else taskList.value = []
  } catch (error) { if(!isSilent) taskList.value = [] }
  finally { if (!isSilent) loading.value = false }
}

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
})

const handleGrab = async (item) => {
  try {
    loading.value = true
    await grabTask(item.orderId)
    ElNotification({
      title: '护航指令已确认',
      message: `单号 ${item.orderSn} 抢单成功！正在同步调度引擎...`,
      type: 'success'
    })
    setTimeout(() => {
      switchTab('progress')
    }, 600)
  } catch (err) {
    loading.value = false
  }
}

const handlePickup = async (item) => {
  try {
    await ElMessageBox.confirm(
        '请确认您已到达物理据点，并核对物资【名称】与【数量】无误？',
        '⚖️ 物权交接确认',
        { confirmButtonText: '确认无误，已取货', cancelButtonText: '再核对一下', type: 'warning' }
    )
    loading.value = true
    await pickupTask(item.taskId || item.orderId)
    ElMessage.success('✅ 取货登记成功！请火速前往终点进行配送。')
    loadData()
  } catch (error) {} finally { loading.value = false }
}

const openCheckoutDialog = (item) => { currentCheckoutOrder.value = item; selectedPhoto.value = null; if (uploadRef.value) uploadRef.value.clearFiles(); checkoutVisible.value = true }
const handlePhotoSelect = (file) => selectedPhoto.value = file

const submitCheckout = async () => {
  if (!selectedPhoto.value) return ElMessage.warning('需要上传现场影像留档，才能完成核销！')
  submitLoading.value = true
  try {
    const uploadRes = await uploadFile(selectedPhoto.value.raw)
    const realImageUrl = uploadRes.data
    await checkOutTask({
      taskId: currentCheckoutOrder.value.taskId || currentCheckoutOrder.value.orderId,
      proofImage: realImageUrl
    })
    checkoutVisible.value = false
    ElMessage.success('核销闭环完成，现场照片已归档，信誉分已发放！')
    const userRes = await getUserProfile()
    if(userRes?.data) currentCredit.value = userRes.data.creditScore || 0
    loadData()
  } catch (err) { console.error('核销失败', err) }
  finally { submitLoading.value = false }
}

const openMapPreview = (item) => {
  currentMapOrder.value = item;
  mapDialogVisible.value = true;
}

const switchRoute = (step) => {
  if (currentMapOrder.value?.taskStatus === 2) return;
  currentRouteStep.value = step
  if (step === 'all') {
    routeStepName.value = '全程总览'
    routeDistance.value = '综合推演中...'
  } else if (step === 'pickup') {
    routeStepName.value = '前往取货点'
    routeDistance.value = '计算中...'
  } else {
    routeStepName.value = '前往送货点'
    routeDistance.value = '计算中...'
  }
  drawRouteByStep()
}

const clearMapMarkers = () => {
  if (!amapRoutingInstance.value) return
  mapMarkers.forEach(m => m.remove())
  mapMarkers = []
}

const addMapMarker = (lng, lat, content) => {
  if (!amapRoutingInstance.value || !lng || !lat) return
  const marker = new window.AMap.Marker({
    map: amapRoutingInstance.value,
    position: [Number(lng), Number(lat)],
    content: content,
    offset: new window.AMap.Pixel(-36, -36)
  })
  mapMarkers.push(marker)
  return marker
}

const initMapRouting = () => {
  if (!currentMapOrder.value) return
  if (currentMapOrder.value.taskStatus === 2) {
    currentRouteStep.value = 'delivery'
    routeStepName.value = '正在前往送货终点'
  } else {
    currentRouteStep.value = 'all'
    routeStepName.value = '全程总览'
  }
  routeDistance.value = '计算中...'
  isMapLoading.value = true
  nextTick(async () => {
    window._AMapSecurityConfig = { securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE }
    try {
      const AMap = await AMapLoader.load({ key: import.meta.env.VITE_AMAP_KEY, version: '2.0', plugins: ['AMap.Riding'] })
      if (amapRoutingInstance.value) amapRoutingInstance.value.destroy()
      amapRoutingInstance.value = new AMap.Map('amap-routing-container', {
        zoom: 13,
        center: [Number(currentMapOrder.value.sourceLon), Number(currentMapOrder.value.sourceLat)],
        viewMode: '2D'
      })
      // 🔧 双插件均隐藏内置 Marker，改由我们手动管理避免重叠
      ridingPluginA = new AMap.Riding({ map: amapRoutingInstance.value, hideMarkers: true, outlineColor: '#3b82f6' })
      ridingPluginB = new AMap.Riding({ map: amapRoutingInstance.value, hideMarkers: true, outlineColor: '#10b981' })
      drawRouteByStep(AMap)
    } catch (e) {
      ElMessage.error('高德引擎渲染失败')
    } finally {
      isMapLoading.value = false
    }
  })
}

const drawRouteByStep = (AMapClass) => {
  const AMap = AMapClass || window.AMap
  const ptMe = (currentLocation.lon && currentLocation.lat)
      ? new AMap.LngLat(Number(currentLocation.lon), Number(currentLocation.lat))
      : null
  const ptSource = new AMap.LngLat(Number(currentMapOrder.value.sourceLon), Number(currentMapOrder.value.sourceLat))
  const ptTarget = new AMap.LngLat(Number(currentMapOrder.value.targetLon), Number(currentMapOrder.value.targetLat))

  // 🔧 彻底清除：双插件 + 手动 Marker 全部重置
  ridingPluginA.clear()
  ridingPluginB.clear()
  clearMapMarkers()

  const pillStyle = 'color:#fff;padding:4px 10px;border-radius:16px;font-size:11px;font-weight:900;white-space:nowrap;border:2px solid #fff;'

  // 已取货：只画送货段
  if (currentMapOrder.value.taskStatus === 2) {
    addMapMarker(ptSource.lng, ptSource.lat, `<div style="background:#f97316;${pillStyle}box-shadow:0 3px 10px rgba(249,115,22,0.4);">📦 取货点</div>`)
    addMapMarker(ptTarget.lng, ptTarget.lat, `<div style="background:#10b981;${pillStyle}box-shadow:0 3px 10px rgba(16,185,129,0.4);">🏁 送达点</div>`)
    ridingPluginB.search(ptSource, ptTarget, (status, result) => {
      if (status === 'complete') routeDistance.value = '约 ' + (result.routes[0].distance / 1000).toFixed(1) + ' km'
      else routeDistance.value = '路线规划失败'
    })
    return
  }

  // 🔧 竞态修复：双异步回调用计数器和局部累加，等两个都完成再统一赋值
  if (currentRouteStep.value === 'all') {
    let distA = 0, distB = 0
    let doneA = !ptMe  // 若无骑手坐标，A 段视为已完成 (0km)
    let doneB = false

    const trySetTotal = () => {
      if (doneA && doneB) {
        const total = distA + distB
        routeDistance.value = ptMe
          ? `约 ${total.toFixed(1)} km (总程)`
          : `约 ${total.toFixed(1)} km (后半段)`
      }
    }

    if (ptMe) {
      addMapMarker(ptMe.lng, ptMe.lat, `<div style="background:#1e40af;${pillStyle}box-shadow:0 3px 10px rgba(30,64,175,0.4);">🚴 我的位置</div>`)
      ridingPluginA.search(ptMe, ptSource, (status, result) => {
        if (status === 'complete') distA = result.routes[0].distance / 1000
        doneA = true
        trySetTotal()
      })
    }

    addMapMarker(ptSource.lng, ptSource.lat, `<div style="background:#f97316;${pillStyle}box-shadow:0 3px 10px rgba(249,115,22,0.4);">📦 取货点</div>`)
    addMapMarker(ptTarget.lng, ptTarget.lat, `<div style="background:#10b981;${pillStyle}box-shadow:0 3px 10px rgba(16,185,129,0.4);">🏁 送达点</div>`)

    ridingPluginB.search(ptSource, ptTarget, (status, result) => {
      if (status === 'complete') distB = result.routes[0].distance / 1000
      doneB = true
      trySetTotal()
    })

  } else if (currentRouteStep.value === 'pickup') {
    if (ptMe) {
      addMapMarker(ptMe.lng, ptMe.lat, `<div style="background:#1e40af;${pillStyle}box-shadow:0 3px 10px rgba(30,64,175,0.4);">🚴 我的位置</div>`)
      addMapMarker(ptSource.lng, ptSource.lat, `<div style="background:#f97316;${pillStyle}box-shadow:0 3px 10px rgba(249,115,22,0.4);">📦 取货点</div>`)
      ridingPluginA.search(ptMe, ptSource, (status, result) => {
        if (status === 'complete') routeDistance.value = '约 ' + (result.routes[0].distance / 1000).toFixed(1) + ' km'
      })
    } else {
      routeDistance.value = '未获取到您的定位'
    }

  } else if (currentRouteStep.value === 'delivery') {
    addMapMarker(ptSource.lng, ptSource.lat, `<div style="background:#f97316;${pillStyle}box-shadow:0 3px 10px rgba(249,115,22,0.4);">📦 取货点</div>`)
    addMapMarker(ptTarget.lng, ptTarget.lat, `<div style="background:#10b981;${pillStyle}box-shadow:0 3px 10px rgba(16,185,129,0.4);">🏁 送达点</div>`)
    ridingPluginB.search(ptSource, ptTarget, (status, result) => {
      if (status === 'complete') routeDistance.value = '约 ' + (result.routes[0].distance / 1000).toFixed(1) + ' km'
    })
  }
}

onMounted(() => { initLocationStrategy() })
</script>

<style scoped>
/* ============================================================
   Step 1: 骑手状态横幅
   ============================================================ */
.rider-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 16px 28px;
  margin-bottom: 24px;
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(0,0,0,0.03);
}
.status-bar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.status-bar-right {
  display: flex;
  align-items: center;
}

/* 图标块 */
.icon-wrapper {
  width: 48px; height: 48px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border-radius: 14px;
  display: flex; justify-content: center; align-items: center;
  font-size: 24px;
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.25);
  flex-shrink: 0;
}
.page-title {
  font-size: 22px; font-weight: 900; color: #0f172a;
  margin: 0; letter-spacing: 0.5px; white-space: nowrap;
}

/* GPS 呼吸灯 Tag */
.gps-tag {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 12px; border-radius: 20px;
  font-size: 12px; font-weight: 800; font-family: monospace;
  white-space: nowrap;
}
.gps-tag.online {
  background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;
}
.gps-tag.fallback {
  background: #fff7ed; color: #ea580c; border: 1px solid #fdba74;
}
.gps-tag.offline {
  background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5;
}
.pulse-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  display: inline-block;
}
.gps-tag.online .pulse-dot {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16,185,129,0.5);
  animation: pulse-dot-glow 2s infinite;
}
.gps-tag.fallback .pulse-dot {
  background: #f97316;
  box-shadow: 0 0 6px rgba(249,115,22,0.4);
}
.gps-tag.offline .pulse-dot {
  background: #ef4444;
  box-shadow: 0 0 4px rgba(239,68,68,0.3);
}
@keyframes pulse-dot-glow {
  0% { box-shadow: 0 0 4px rgba(16,185,129,0.4); }
  70% { box-shadow: 0 0 10px rgba(16,185,129,0.8); }
  100% { box-shadow: 0 0 4px rgba(16,185,129,0.4); }
}

/* 信誉分行内展示 */
.credit-inline {
  display: flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, #fef2f2, #fff7ed);
  padding: 8px 18px; border-radius: 20px;
  border: 1px solid #fed7aa;
}
.credit-icon { font-size: 18px; line-height: 1; }
.credit-label {
  font-size: 12px; color: #64748b; font-weight: 800;
}
.credit-value {
  font-size: 22px; font-weight: 900; color: #f97316;
  font-family: Impact, monospace; line-height: 1;
}

/* ============================================================
   工作区容器 / 分段控制器 / 空状态 (保持)
   ============================================================ */
.workspace-container {
  flex: 1; width: 100%; height: 100vh; overflow-y: auto;
  background: #f8fafc; padding: 32px 48px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  box-sizing: border-box; display: flex; flex-direction: column;
}

.segmented-control {
  display: inline-flex; background: #e2e8f0; padding: 5px;
  border-radius: 14px; margin-bottom: 24px;
  flex-shrink: 0; align-self: flex-start;
}
.segment-btn {
  position: relative; padding: 12px 28px; font-size: 15px; font-weight: bold;
  color: #475569; border-radius: 10px; cursor: pointer; transition: 0.3s;
  display: flex; align-items: center; gap: 8px; user-select: none;
}
.segment-btn:hover { color: #2563eb; }
.segment-btn.active {
  background: white; color: #0f172a;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}
.segment-btn .dot {
  width: 6px; height: 6px; background: #3b82f6; border-radius: 50%;
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.6);
}
.live-badge {
  position: absolute; top: -8px; right: -12px;
  background: #ef4444; color: white; font-size: 10px; font-weight: 900;
  padding: 2px 6px; border-radius: 8px; border: 2px solid #f8fafc;
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
  70% { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
  100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
}

.task-list-wrapper {
  display: flex; flex-direction: column; gap: 16px;
  min-height: 400px; border-radius: 16px; flex: 1;
}
.empty-status {
  padding: 100px 0; text-align: center; color: #94a3b8;
  display: flex; flex-direction: column; align-items: center;
}
.empty-icon { font-size: 64px; margin-bottom: 20px; color: #cbd5e1; }
.empty-status h3 { color: #334155; font-size: 18px; font-weight: bold; margin-bottom: 8px; }
.radar-spinner {
  width: 50px; height: 50px; border: 4px solid #f1f5f9;
  border-top-color: #3b82f6; border-radius: 50%;
  margin-bottom: 20px; animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.list-move, .list-enter-active, .list-leave-active {
  transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1);
}
.list-enter-from, .list-leave-to {
  opacity: 0; transform: translateY(30px) scale(0.95);
}
.list-leave-active { position: absolute; }
.task-list-animator {
  display: flex; flex-direction: column; gap: 16px; width: 100%; position: relative;
}

/* ============================================================
   Step 2: 任务卡片 — 降噪重组
   ============================================================ */
.task-card {
  display: flex; flex-direction: column;
  background: white; border-radius: 20px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.02);
  border: 1px solid #f1f5f9;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%; box-sizing: border-box;
  overflow: hidden;
}
.task-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 35px rgba(0,0,0,0.06);
  border-color: #e2e8f0;
}

/* --- 2a: 卡片顶部条带 --- */
.card-strip {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 28px;
  background: #fafbfc;
  border-bottom: 1px solid #f1f5f9;
}
.strip-left {
  display: flex; align-items: center; gap: 14px;
}
.strip-sn {
  font-family: monospace; font-size: 14px; font-weight: 900; color: #334155;
}
.strip-time {
  font-size: 12px; color: #94a3b8; font-weight: bold;
}
.strip-right {
  display: flex; gap: 8px; align-items: center;
}

/* type/urgency badges (复用原样式,微调) */
.type-badge {
  display: inline-block; padding: 4px 10px; border-radius: 6px;
  font-size: 11px; font-weight: 900; color: white; letter-spacing: 0.5px;
}
.bg-blue { background: #3b82f6; box-shadow: 0 2px 8px rgba(59,130,246,0.3); }
.bg-red  { background: #ef4444; box-shadow: 0 2px 8px rgba(239,68,68,0.3); }

.urgency-badge {
  padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 900; border: 1px solid;
}
.urgency-10 { color: #fff; background: #4a0000; border-color: #7f1d1d; }
.urgency-9  { color: #fecaca; background: #7f1d1d; border-color: #991b1b; }
.urgency-8  { color: #fca5a5; background: #7f1d1d; border-color: #b91c1c; }
.urgency-7  { color: #b91c1c; background: #fef2f2; border-color: #f87171; }
.urgency-6  { color: #dc2626; background: #fef2f2; border-color: #fca5a5; }
.urgency-5  { color: #b91c1c; background: #fef2f2; border-color: #fca5a5; }
.urgency-4  { color: #c2410c; background: #fff7ed; border-color: #fdba74; }
.urgency-3  { color: #d97706; background: #fef3c7; border-color: #fde68a; }
.urgency-2  { color: #4d7c0f; background: #ecfccb; border-color: #bef264; }
.urgency-1  { color: #047857; background: #d1fae5; border-color: #6ee7b7; }

/* --- 2b-2e: 卡片主体 --- */
.card-body {
  display: flex; align-items: stretch;
  padding: 24px 28px; gap: 30px;
}

/* 路线视觉中心 */
.route-visual {
  flex: 1; display: flex; flex-direction: column; gap: 10px;
  min-width: 0;
}

/* 取/送点 (复用原样式) */
.route-point {
  display: flex; align-items: flex-start; gap: 14px; overflow: hidden;
}
.route-point.source-box { transition: 0.3s; }
.route-point.source-box.is-done {
  filter: grayscale(100%); opacity: 0.5;
}
.route-point.source-box.is-done .point-icon.source { background: #94a3b8; }

.point-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; justify-content: center; align-items: center;
  font-size: 16px; font-weight: 900; color: white; flex-shrink: 0;
  box-shadow: inset 0 -3px 0 rgba(0,0,0,0.15);
}
.point-icon.source { background: #f97316; }
.point-icon.target { background: #10b981; }
.point-icon .el-icon { font-weight: 900; font-size: 1.2rem; }

.point-info {
  display: flex; flex-direction: column; gap: 4px;
  overflow: hidden; width: 100%;
}
.p-name {
  font-size: 16px; font-weight: 900; color: #0f172a;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.p-address {
  font-size: 13px; color: #64748b;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-weight: 500;
}
.p-dist {
  font-size: 12px; color: #64748b; font-weight: bold;
  font-family: monospace; margin-top: 2px;
}

/* 路线箭头 + 配送距离 */
.route-arrow {
  display: flex; align-items: center; gap: 10px;
  padding: 0 0 0 12px;
}
.arrow-line {
  width: 3px; height: 28px;
  background: linear-gradient(to bottom, #f97316, #10b981);
  border-radius: 2px;
  flex-shrink: 0;
}
.arrow-icon {
  color: #94a3b8; font-size: 20px; font-weight: 900; flex-shrink: 0;
}
.arrow-dist {
  font-size: 12px; color: #64748b; font-weight: bold; font-family: monospace;
  white-space: nowrap;
}

/* 微标签 */
.micro-tags {
  display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; margin-left: 50px;
}
.m-tag {
  background: #f1f5f9; color: #475569; font-size: 11px;
  padding: 3px 8px; border-radius: 6px; font-weight: bold;
}

/* --- 2c+2d+3: 右侧面板 --- */
.card-right {
  width: 190px; flex-shrink: 0;
  display: flex; flex-direction: column; gap: 12px;
  border-left: 1px solid #f1f5f9; padding-left: 24px;
}

/* 调度分角标 */
.score-badge {
  display: flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, rgba(59,130,246,0.08), rgba(37,99,235,0.12));
  border: 1px solid rgba(59,130,246,0.2);
  border-radius: 14px;
  padding: 8px 14px;
  font-size: 13px; font-weight: 900; color: #2563eb;
  box-shadow: 0 0 12px rgba(59,130,246,0.08);
}
.score-ring {
  width: 8px; height: 8px; border-radius: 50%;
  background: #3b82f6;
  box-shadow: 0 0 6px rgba(59,130,246,0.5);
  animation: pulse-dot-glow 2s infinite;
}

/* 物资胶囊 */
.goods-capsule {
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
  padding: 10px 14px; font-size: 13px; font-weight: 800; color: #334155;
  display: flex; align-items: center; gap: 6px;
}
.goods-capsule .capsule-name {
  flex: 1; min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.goods-qty {
  color: #3b82f6; font-family: Impact, monospace;
  font-size: 18px; font-weight: 900; flex-shrink: 0;
}

/* 操作按钮区 */
.card-actions {
  display: flex; flex-direction: column; gap: 10px; margin-top: auto;
}

/* --- 按钮样式 --- */
.btn-tool {
  padding: 10px 0; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 10px;
  color: #475569; font-weight: bold; font-size: 14px; cursor: pointer; transition: 0.2s;
  display: flex; justify-content: center; align-items: center; gap: 6px;
}
.btn-tool:hover:not(:disabled) { background: #e2e8f0; color: #0f172a; }
.btn-tool:disabled { opacity: 0.5; cursor: not-allowed; }

/* 超载状态说明牌 — 纯展示，无交互 */
.overload-plaque {
  width: 100%; padding: 14px 12px; border-radius: 12px;
  background: #f8fafc; border: 1px solid #e2e8f0;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.overload-title {
  font-size: 0.95rem; font-weight: bold; color: #94a3b8;
}
.overload-sub {
  font-size: 0.8rem; font-weight: 600; color: #cbd5e1;
}

/* ✅ FIX-3: 超载卡片视觉降权——仅禁用抢单按钮，保留路线推演 */
.task-card.overloaded .card-body { opacity: 0.55; }
.task-card.overloaded .btn-main.grab { pointer-events: none; opacity: 0.4; cursor: not-allowed; }
.task-card.overloaded .card-strip { opacity: 1; }

/* ✅ FIX-3: SOS急救卡片呼吸灯特效 */
.task-card.sos-emergency {
  border: 2px solid #ef4444;
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.25), 0 4px 20px rgba(0,0,0,0.06);
  animation: sos-pulse 2s ease-in-out infinite;
}
@keyframes sos-pulse {
  0%, 100% { box-shadow: 0 0 12px rgba(239, 68, 68, 0.2), 0 4px 20px rgba(0,0,0,0.06); }
  50% { box-shadow: 0 0 28px rgba(239, 68, 68, 0.45), 0 4px 20px rgba(0,0,0,0.06); }
}

.btn-main {
  padding: 12px 0; border: none; border-radius: 10px; color: white; font-weight: 900;
  font-size: 15px; cursor: pointer; transition: 0.3s; letter-spacing: 1px;
  display: flex; justify-content: center; align-items: center; gap: 6px;
}
.btn-main.grab {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 6px 15px rgba(37,99,235,0.3);
}
.btn-main.grab:hover {
  transform: translateY(-3px); box-shadow: 0 8px 20px rgba(37,99,235,0.4);
}
.btn-main.pickup {
  background: linear-gradient(135deg, #f97316, #ea580c);
  box-shadow: 0 6px 15px rgba(249,115,22,0.3);
}
.btn-main.pickup:hover {
  transform: translateY(-3px); box-shadow: 0 8px 20px rgba(249,115,22,0.4);
}
.btn-main.finish {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 6px 15px rgba(16,185,129,0.3);
}
.btn-main.finish:hover {
  transform: translateY(-3px); box-shadow: 0 8px 20px rgba(16,185,129,0.4);
}

/* ============================================================
   弹窗 (保持)
   ============================================================ */
.upload-zone { text-align: center; }
.upload-tip { color: #64748b; font-size: 14px; margin-bottom: 16px; }

.map-modal-body {
  position: relative; height: 65vh; display: flex; flex-direction: column; background: #f1f5f9;
}
.amap-container { flex: 1; width: 100%; }

.route-segment-control {
  position: absolute; top: 15px; left: 50%; transform: translateX(-50%); z-index: 100;
  background: rgba(255,255,255,0.9); backdrop-filter: blur(10px);
  padding: 5px; border-radius: 12px; display: flex; gap: 5px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.5);
}
.seg-btn {
  border: none; background: transparent; padding: 8px 16px;
  border-radius: 8px; font-size: 0.9rem; font-weight: bold;
  color: #64748b; cursor: pointer; transition: 0.3s; white-space: nowrap;
}
.seg-btn.active {
  background: #10b981; color: white; box-shadow: 0 2px 8px rgba(16,185,129,0.3);
}

.route-info-float {
  position: absolute; bottom: 20px; left: 20px; right: 20px; z-index: 100;
  padding: 15px 20px; border-radius: 16px;
  display: flex; justify-content: space-between; align-items: center;
}
.glass-effect {
  background: rgba(255,255,255,0.95); backdrop-filter: blur(10px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #fff;
}
.info-item { display: flex; flex-direction: column; gap: 4px; }
.i-label { font-size: 0.75rem; color: #94a3b8; font-weight: bold; }
.i-value { font-size: 1.1rem; color: #1e293b; font-weight: 900; }
.i-value.highlight { color: #f97316; }

:deep(.el-dialog__header) {
  padding: 20px; border-bottom: 1px solid #f1f5f9; margin-right: 0; margin-bottom: 0;
}
:deep(.el-dialog__title) { font-weight: 900; color: #1e293b; }
:deep(.el-dialog__body) { padding: 0; }

/* ============================================================
   响应式
   ============================================================ */
@media screen and (max-width: 768px) {
  .workspace-container {
    padding: 15px 10px !important; min-height: 100vh;
  }
  .rider-status-bar {
    flex-direction: column; align-items: flex-start; gap: 12px;
  }
  .status-bar-left { flex-wrap: wrap; }
  .page-title { font-size: 18px; }
  .segmented-control { width: 100%; flex-wrap: wrap; }
  .segment-btn { flex: 1; min-width: 40%; text-align: center; justify-content: center; }
  .card-body {
    flex-direction: column; padding: 16px; gap: 16px;
  }
  .card-right {
    width: 100%; border-left: none; border-top: 1px solid #f1f5f9;
    padding-left: 0; padding-top: 14px; flex-direction: row; flex-wrap: wrap;
  }
  .card-actions { flex-direction: row; width: 100%; }
  .card-actions .btn-main { flex: 1; }
  .map-modal-body { height: 75vh; }
}
</style>
