<template>
  <div class="workspace-container">
    <div class="page-header">
      <div class="header-left">
        <div class="icon-wrapper"><el-icon><Monitor /></el-icon></div>
        <div>
          <h1 class="page-title">运力调度工作台</h1>
          <div class="loc-status" :style="{ color: locStatus.color }">
            <el-icon><Location /></el-icon> {{ locStatus.label }}
          </div>
        </div>
      </div>
      <div class="header-right">
        <div class="credit-badge">
          <div class="cb-icon">🏆</div>
          <div class="cb-info">
            <span class="label">当前护航信誉分</span>
            <span class="value">{{ currentCredit }} <span class="unit">分</span></span>
          </div>
        </div>
      </div>
    </div>

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

    <div class="task-list-wrapper" v-loading="loading && taskList.length === 0" element-loading-text="调度引擎数据同步中..." element-loading-background="rgba(248, 250, 252, 0.75)">
      <div v-if="!loading && taskList.length === 0" class="empty-status">
        <div class="radar-spinner" v-if="activeTab === 'available'"></div>
        <el-icon class="empty-icon" v-else><Compass /></el-icon>
        <h3>{{ activeTab === 'available' ? '城市雷达扫掠中，暂无调度需求' : '当前频段暂无任务数据' }}</h3>
      </div>

      <transition-group name="list" tag="div" class="task-list-animator">
        <div class="task-row" v-for="item in taskList" :key="item.orderId || item.taskId">
          <div class="col-meta">
            <div class="tag-row">
              <div class="type-badge" :class="isDonation(item.orderSn) ? 'bg-blue' : 'bg-red'">
                {{ isDonation(item.orderSn) ? '🔵 捐赠集货' : '🔴 紧急求助' }}
              </div>
              <div class="urgency-badge" :class="'urgency-' + (item.urgencyLevel || 5)">
                {{ formatUrgency(item.urgencyLevel) }}
              </div>
            </div>

            <div class="order-sn">{{ item.orderSn }}</div>
            <div class="time-info">🕒 发起时间: {{ item.createTime || '近期' }}</div>

            <div class="micro-tags" v-if="getMicroTags(item).length > 0">
              <span class="m-tag" v-for="(tag, idx) in getMicroTags(item)" :key="idx">{{ tag }}</span>
            </div>

            <div class="algorithm-info" v-if="activeTab === 'available'">
              <div class="algo-row">
                <span>📍 接驾: {{ calculateStraightDistance(currentLocation.lon, currentLocation.lat, item.sourceLon, item.sourceLat) }}km</span>
                <span class="divider">|</span>
                <span>🛵 配送: {{ calculateStraightDistance(item.sourceLon, item.sourceLat, item.targetLon, item.targetLat) }}km</span>
              </div>
              <div class="algo-row" style="margin-top:4px;">
                <span style="color:#10b981; font-size:13px;">✨ 综合调度分: {{ item.matchScore ? item.matchScore.toFixed(2) : 0 }}</span>
              </div>
            </div>
          </div>

          <div class="col-route">
            <div class="route-point source-box" :class="{ 'is-done': item.taskStatus === 2 }">
              <div class="point-icon source">
                <el-icon v-if="item.taskStatus === 2"><Check /></el-icon>
                <span v-else>取</span>
              </div>
              <div class="point-info">
                <div class="p-name" :title="item.sourceName" :style="item.taskStatus === 2 ? 'text-decoration: line-through; color: #94a3b8;' : ''">
                  {{ item.sourceName || '起点未知' }}
                </div>
                <div class="p-address" :title="item.sourceAddress">{{ item.sourceAddress || '地址未录入' }}</div>
              </div>
            </div>

            <div class="route-connection">
              <div class="line"></div><el-icon class="arrow"><Right /></el-icon>
            </div>

            <div class="route-point target-box">
              <div class="point-icon target">送</div>
              <div class="point-info">
                <div class="p-name" :title="item.targetName">{{ item.targetName || '终点未知' }}</div>
                <div class="p-address" :title="item.targetAddress">{{ item.targetAddress || '地址未录入' }}</div>
              </div>
            </div>
          </div>

          <div class="col-goods">
            <div class="goods-receipt">
              <div class="receipt-header">
                <span class="r-icon">📦</span>
                <span class="r-title">护航物资清单</span>
              </div>
              <div class="receipt-body">
                <div class="r-main-item">
                  <div class="r-name" :title="item.goodsName || item.requiredCategory">
                    {{ item.goodsName || item.requiredCategory || '未知物资' }}
                  </div>
                  <div class="r-qty">
                    <span class="x">×</span><span class="num">{{ item.goodsCount || 0 }}</span>
                  </div>
                </div>
              </div>
              <div class="receipt-footer">
                <el-icon><Warning /></el-icon> 提取时请核对规格与完整性
              </div>
            </div>
          </div>

          <div class="col-actions">
            <button class="btn-tool" @click="openMapPreview(item)" :disabled="!isValidCoordinate(item.sourceLon, item.sourceLat) || !isValidCoordinate(item.targetLon, item.targetLat)">
              <el-icon><MapLocation /></el-icon> 路线推演
            </button>
            <button v-if="activeTab === 'available'" class="btn-main grab" @click="handleGrab(item)">⚡ 立即响应</button>

            <template v-if="activeTab === 'progress'">
              <button v-if="item.taskStatus === 1" class="btn-main pickup" @click="handlePickup(item)">
                📦 我已取货
              </button>
              <button v-else-if="item.taskStatus === 2" class="btn-main finish" @click="openCheckoutDialog(item)">
                📸 送达核销
              </button>
            </template>
          </div>
        </div>
      </transition-group>
    </div>

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
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus'
import { Monitor, Right, MapLocation, UploadFilled, Compass, Location, Warning, Check } from '@element-plus/icons-vue' // 🚨 引入 Check 图标
import { getAvailableOrders, grabTask, getMyTasks, checkOutTask, pickupTask } from '@/api/trade'
import { getUserProfile } from '@/api/user'
import { uploadFile } from '@/api/common'
import { useRoute, useRouter } from 'vue-router'
import AMapLoader from '@amap/amap-jsapi-loader'

const route = useRoute()
const router = useRouter()
const activeTab = ref(route.query.tab || 'available')

const currentCredit = ref(0)
const loading = ref(false)
const taskList = ref([])
let pollingTimer = null

const locStatus = reactive({ type: 'none', label: '引擎雷达搜索中...', color: '#94a3b8' })
const currentLocation = reactive({ lon: null, lat: null })

// ================= 🗺️ 导航引擎与状态变量 =================
const mapDialogVisible = ref(false)
const isMapLoading = ref(false)
// 🚨 核心修复：改为响应式引用，以便 template 内动态判断
const currentMapOrder = ref(null)
const amapRoutingInstance = ref(null)
let ridingPluginA = null
let ridingPluginB = null

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

// 1. 修改文案映射，5 级才是特急
const formatUrgency = (level) => {
  const map = {
    5: '🔥 特急(5级)',
    4: '🔴 紧急(4级)',
    3: '🟠 优先(3级)',
    2: '🟡 常规(2级)',
    1: '🟢 顺路(1级)'
  }
  return map[level] || '🟢 顺路(1级)' // 默认保底为 1 级
}

// 2. 修改微标签的判定条件
const getMicroTags = (item) => {
  const tags = []
  const name = (item.goodsName || item.requiredCategory || '').toLowerCase()
  if (name.includes('奶') || name.includes('生鲜') || name.includes('菜')) tags.push('🧊 易坏需冷链')
  if (name.includes('药') || name.includes('胰岛素')) tags.push('💊 救命药物')
  if (item.targetName?.includes('老人') || item.targetName?.includes('长者')) tags.push('👵 弱势群体关怀')

  // 🚨 将原本的 === 1 || === 2，改为 >= 4 才触发限时速达
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
    await grabTask(item.orderId)
    ElNotification({ title: '护航指令已确认', message: `单号 ${item.orderSn} 已接入履约序列，请立即启程。`, type: 'success' })
    switchTab('progress')
  } catch (err) {}
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
  if (currentMapOrder.value?.taskStatus === 2) return; // 拦截：若已取货，强锁状态
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

const initMapRouting = () => {
  if (!currentMapOrder.value) return

  // 🚨 核心逻辑升级：根据订单的进度决定初始视角
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

      ridingPluginA = new AMap.Riding({ map: amapRoutingInstance.value, hideMarkers: false, outlineColor: '#3b82f6' })
      ridingPluginB = new AMap.Riding({ map: amapRoutingInstance.value, hideMarkers: false, outlineColor: '#10b981' })

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

  ridingPluginA.clear()
  ridingPluginB.clear()

  // 🚨 已取货状态：严格执行【取货点 -> 送货点】的后半程推演
  if (currentMapOrder.value.taskStatus === 2) {
    ridingPluginB.search(ptSource, ptTarget, (status, result) => {
      if(status === 'complete') routeDistance.value = '约 ' + (result.routes[0].distance / 1000).toFixed(1) + ' km'
      else routeDistance.value = '路线规划失败'
    })
    return;
  }

  // 正常未取货的推演逻辑
  if (currentRouteStep.value === 'all') {
    let totalDist = 0;
    // 第一段推演：当前位置 -> 取货点 (蓝线)
    if (ptMe) {
      ridingPluginA.search(ptMe, ptSource, (status, result) => {
        if(status === 'complete') totalDist += (result.routes[0].distance / 1000)
      })
    }
    // 第二段推演：取货点 -> 送货点 (绿线，严格基于 ptSource)
    ridingPluginB.search(ptSource, ptTarget, (status, result) => {
      if(status === 'complete') {
        totalDist += (result.routes[0].distance / 1000)
        routeDistance.value = ptMe ? `约 ${totalDist.toFixed(1)} km (总程)` : `约 ${totalDist.toFixed(1)} km (后半段)`
      }
    })
  } else if (currentRouteStep.value === 'pickup') {
    // 仅推演取货路段：当前位置 -> 取货点
    if (ptMe) {
      ridingPluginA.search(ptMe, ptSource, (status, result) => {
        if(status === 'complete') routeDistance.value = '约 ' + (result.routes[0].distance / 1000).toFixed(1) + ' km'
      })
    } else {
      routeDistance.value = '未获取到您的定位'
    }
  } else if (currentRouteStep.value === 'delivery') {
    // 仅推演送货路段：取货点 -> 送货点 (严格基于 ptSource)
    ridingPluginB.search(ptSource, ptTarget, (status, result) => {
      if(status === 'complete') routeDistance.value = '约 ' + (result.routes[0].distance / 1000).toFixed(1) + ' km'
    })
  }
}

onMounted(() => { initLocationStrategy() })
</script>

<style scoped>
.workspace-container { flex: 1; width: 100%; height: 100vh; overflow-y: auto; background: #f8fafc; padding: 40px 50px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-sizing: border-box; display: flex; flex-direction: column; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 35px; flex-shrink: 0; }
.header-left { display: flex; align-items: center; gap: 18px; }
.icon-wrapper { width: 52px; height: 52px; background: #3b82f6; color: white; border-radius: 14px; display: flex; justify-content: center; align-items: center; font-size: 26px; box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3); }
.page-title { font-size: 24px; font-weight: 900; color: #0f172a; margin: 0 0 6px; letter-spacing: 0.5px; }

.loc-status { font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 4px; font-family: monospace; transition: 0.3s;}

.credit-badge { display: flex; align-items: center; gap: 15px; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); padding: 12px 26px; border-radius: 100px; border: 1px solid #e2e8f0; box-shadow: 0 6px 15px rgba(0,0,0,0.03); transition: all 0.3s; }
.credit-badge:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(249, 115, 22, 0.12); border-color: #fed7aa; }
.cb-icon { font-size: 34px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(245, 158, 11, 0.3));}
.cb-info { display: flex; flex-direction: column; align-items: flex-start; }
.cb-info .label { font-size: 13px; color: #64748b; font-weight: 800; margin-bottom: 2px; }
.cb-info .value { font-size: 26px; font-weight: 900; color: #f97316; line-height: 1; }
.cb-info .unit { font-size: 14px; font-weight: bold; color: #94a3b8; margin-left: 2px;}

.segmented-control { display: inline-flex; background: #e2e8f0; padding: 5px; border-radius: 14px; margin-bottom: 24px; flex-shrink: 0; align-self: flex-start;}
.segment-btn { position: relative; padding: 12px 28px; font-size: 15px; font-weight: bold; color: #475569; border-radius: 10px; cursor: pointer; transition: 0.3s; display: flex; align-items: center; gap: 8px; user-select: none; }
.segment-btn:hover { color: #2563eb; }
.segment-btn.active { background: white; color: #0f172a; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
.segment-btn .dot { width: 6px; height: 6px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 6px rgba(59, 130, 246, 0.6); }
.live-badge { position: absolute; top: -8px; right: -12px; background: #ef4444; color: white; font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 8px; border: 2px solid #f8fafc; animation: pulse 1.5s infinite; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 70% { box-shadow: 0 0 0 6px rgba(239,68,68,0); } 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } }

.task-list-wrapper { display: flex; flex-direction: column; gap: 16px; min-height: 400px; border-radius: 16px; flex: 1; }
.empty-status { padding: 100px 0; text-align: center; color: #94a3b8; display: flex; flex-direction: column; align-items: center; }
.empty-icon { font-size: 64px; margin-bottom: 20px; color: #cbd5e1; }
.empty-status h3 { color: #334155; font-size: 18px; font-weight: bold; margin-bottom: 8px; }
.radar-spinner { width: 50px; height: 50px; border: 4px solid #f1f5f9; border-top-color: #3b82f6; border-radius: 50%; margin-bottom: 20px; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.list-move, .list-enter-active, .list-leave-active { transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1); }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(30px) scale(0.95); }
.list-leave-active { position: absolute; }
.task-list-animator { display: flex; flex-direction: column; gap: 16px; width: 100%; position: relative;}

.task-row { display: flex; align-items: stretch; background: white; border-radius: 20px; padding: 24px 30px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02); border: 1px solid #f1f5f9; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); width: 100%; box-sizing: border-box;}
.task-row:hover { transform: translateY(-4px); box-shadow: 0 15px 35px rgba(0, 0, 0, 0.06); border-color: #e2e8f0; }

.col-meta { width: 220px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; border-right: 2px dashed #f1f5f9; padding-right: 25px; }
.tag-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap;}
.type-badge { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 900; color: white; letter-spacing: 0.5px; }
.bg-blue { background: #3b82f6; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3); }
.bg-red { background: #ef4444; box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3); }
.urgency-badge { padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 900; border: 1px solid;}
/* 🚨 颠倒颜色：5 级最红，1 级最绿 */
.urgency-5 { color: #b91c1c; background: #fef2f2; border-color: #fca5a5; } /* 红色系 */
.urgency-4 { color: #c2410c; background: #fff7ed; border-color: #fdba74; } /* 橘红色 */
.urgency-3 { color: #d97706; background: #fef3c7; border-color: #fde68a; } /* 橙黄色 */
.urgency-2 { color: #4d7c0f; background: #ecfccb; border-color: #bef264; } /* 浅黄绿 */
.urgency-1 { color: #047857; background: #d1fae5; border-color: #6ee7b7; } /* 翠绿色 */

.order-sn { font-family: monospace; font-size: 14px; color: #475569; font-weight: 900; }
.time-info { font-size: 12px; color: #94a3b8; font-weight: bold;}

.micro-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px;}
.m-tag { background: #f1f5f9; color: #475569; font-size: 11px; padding: 3px 6px; border-radius: 4px; font-weight: bold;}

.algorithm-info { display: flex; flex-direction: column; font-size: 12px; font-family: monospace; font-weight: bold; color: #64748b; background: #f8fafc; padding: 8px 10px; border-radius: 8px; margin-top: auto;}
.algo-row { display: flex; align-items: center; gap: 8px;}
.divider { color: #cbd5e1; }

.col-route { flex: 1; display: flex; align-items: center; padding: 0 30px; gap: 20px; overflow: hidden; }
.route-point { display: flex; align-items: flex-start; gap: 14px; overflow: hidden; }
.route-point.source-box { flex: 0.7; transition: 0.3s; }
.route-point.target-box { flex: 1.3; }

/* 🚨 核心 UI 升级：已取货的灰色状态 */
.route-point.source-box.is-done { filter: grayscale(100%); opacity: 0.5; }
.route-point.source-box.is-done .point-icon.source { background: #94a3b8; }
.point-icon.source .el-icon { font-weight: 900; font-size: 1.2rem; }

.point-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 16px; font-weight: 900; color: white; flex-shrink: 0; box-shadow: inset 0 -3px 0 rgba(0,0,0,0.15); }
.point-icon.source { background: #f97316; }
.point-icon.target { background: #10b981; }
.point-info { display: flex; flex-direction: column; gap: 6px; overflow: hidden; width: 100%; }
.p-name { font-size: 16px; font-weight: 900; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: 0.3s; }
.p-address { font-size: 14px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }

.route-connection { display: flex; align-items: center; color: #94a3b8; width: 60px; flex-shrink: 0; }
.route-connection .line { flex: 1; height: 3px; background: repeating-linear-gradient(to right, #cbd5e1 0, #cbd5e1 6px, transparent 6px, transparent 12px); }

.col-goods { width: 240px; flex-shrink: 0; padding: 0 20px; border-left: 2px dashed #f1f5f9; display: flex; flex-direction: column; justify-content: center; }

.goods-receipt { background: linear-gradient(to bottom, #f8fafc, #ffffff); border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; height: 100%; box-sizing: border-box; box-shadow: inset 0 2px 4px rgba(0,0,0,0.01); }

.receipt-header { display: flex; align-items: center; gap: 6px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; margin-bottom: 8px; }
.receipt-header .r-icon { font-size: 14px; }
.receipt-header .r-title { font-size: 12px; font-weight: 900; color: #64748b; letter-spacing: 1px; }

.receipt-body { flex: 1; display: flex; align-items: flex-start; overflow: hidden; }
.r-main-item { display: flex; justify-content: space-between; align-items: flex-start; width: 100%; gap: 10px; }
.r-name { font-size: 14px; font-weight: 900; color: #0f172a; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; word-break: break-all; }
.r-qty { display: flex; align-items: baseline; color: #3b82f6; flex-shrink: 0; margin-top: -2px;}
.r-qty .x { font-size: 13px; font-weight: bold; margin-right: 2px; }
.r-qty .num { font-size: 24px; font-weight: 900; font-family: Impact, sans-serif; letter-spacing: 0.5px; }

.receipt-footer { font-size: 11px; color: #94a3b8; display: flex; align-items: center; gap: 4px; padding-top: 8px; margin-top: auto; border-top: 1px dashed #cbd5e1; font-weight: bold;}
.col-actions { width: 150px; flex-shrink: 0; display: flex; flex-direction: column; justify-content: center; gap: 12px; padding-left: 20px;}
.btn-tool { padding: 10px 0; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 10px; color: #475569; font-weight: bold; font-size: 14px; cursor: pointer; transition: 0.2s; display: flex; justify-content: center; align-items: center; gap: 6px; }
.btn-tool:hover:not(:disabled) { background: #e2e8f0; color: #0f172a; }
.btn-tool:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-main { padding: 12px 0; border: none; border-radius: 10px; color: white; font-weight: 900; font-size: 15px; cursor: pointer; transition: 0.3s; letter-spacing: 1px; display: flex; justify-content: center; align-items: center; gap: 6px;}
.btn-main.grab { background: linear-gradient(135deg, #3b82f6, #2563eb); box-shadow: 0 6px 15px rgba(37, 99, 235, 0.3); }
.btn-main.grab:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }
.btn-main.pickup { background: linear-gradient(135deg, #f97316, #ea580c); box-shadow: 0 6px 15px rgba(249, 115, 22, 0.3); }
.btn-main.pickup:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(249, 115, 22, 0.4); }
.btn-main.finish { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 6px 15px rgba(16, 185, 129, 0.3); }
.btn-main.finish:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4); }

.upload-zone { text-align: center; }
.upload-tip { color: #64748b; font-size: 14px; margin-bottom: 16px; }

.map-modal-body { position: relative; height: 65vh; display: flex; flex-direction: column; background: #f1f5f9; }
.amap-container { flex: 1; width: 100%; }

.route-segment-control { position: absolute; top: 15px; left: 50%; transform: translateX(-50%); z-index: 100; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); padding: 5px; border-radius: 12px; display: flex; gap: 5px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.5);}
.seg-btn { border: none; background: transparent; padding: 8px 16px; border-radius: 8px; font-size: 0.9rem; font-weight: bold; color: #64748b; cursor: pointer; transition: 0.3s; white-space: nowrap;}
.seg-btn.active { background: #10b981; color: white; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3); }

.route-info-float { position: absolute; bottom: 20px; left: 20px; right: 20px; z-index: 100; padding: 15px 20px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center;}
.glass-effect { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #fff; }
.info-item { display: flex; flex-direction: column; gap: 4px; }
.i-label { font-size: 0.75rem; color: #94a3b8; font-weight: bold; }
.i-value { font-size: 1.1rem; color: #1e293b; font-weight: 900; }
.i-value.highlight { color: #f97316; }

:deep(.el-dialog__header) { padding: 20px; border-bottom: 1px solid #f1f5f9; margin-right: 0; margin-bottom: 0;}
:deep(.el-dialog__title) { font-weight: 900; color: #1e293b; }
:deep(.el-dialog__body) { padding: 0; }

@media screen and (max-width: 768px) {
  .workspace-container {
    padding: 15px 10px !important;
    min-height: 100vh;
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  .header-right { width: 100%; }
  .credit-badge { width: 100%; justify-content: center; }
  .segmented-control { width: 100%; flex-wrap: wrap; }
  .segment-btn { flex: 1; min-width: 40%; text-align: center; justify-content: center;}
  .map-modal-body { height: 75vh; }
}
</style>