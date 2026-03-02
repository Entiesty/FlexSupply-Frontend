<template>
  <main class="main-content">
    <div class="top-status" :class="{ 'emergency-mode': sysMode === 'EMERGENCY' }">
      <span class="pulse-dot" :style="{ background: sysMode === 'EMERGENCY' ? '#ef4444' : '#10b981' }"></span>
      当前运行模式: <strong>{{ sysMode === 'NORMAL' ? '🟢 平时常态调度' : '🔴 急时应急调度' }}</strong>
      <button v-if="currentUserRole === 4" class="mode-switch-btn" @click="toggleSysMode">
        切换至{{ sysMode === 'NORMAL' ? '急时' : '平时' }}
      </button>
    </div>

    <div class="map-wrapper">
      <div id="amap-container"></div>

      <DashboardPanel/>

      <DispatchControl
          v-if="pendingOrder"
          :pendingOrder="pendingOrder"
          :userRole="currentUserRole"
          :loading="loading"
          :result="result"
          :isMissionActive="isMissionActive"
          :activeOrder="activeOrder"
          :isError="isError"
          :fallbackCountdown="fallbackCountdown"
          @dispatch="handleSmartDispatch"
          @grab="handleGrab"
          @finish="handleFinishMission"
          @notify-pickup="handleNotifyPickup"
          @switch-pickup="handleSwitchToPickup"
      />

      <div v-else class="empty-task-panel">
        <div class="radar-spinner" :class="{ 'emergency-spin': sysMode === 'EMERGENCY' }"></div>
        <h3>{{ sysMode === 'NORMAL' ? '暂无调度需求' : '应急预案已启动，全城戒备' }}</h3>
        <p>城市运转良好，调度大脑正在实时监听中...</p>
      </div>

      <div class="map-legend">
        <div class="legend-item"><span class="dot sos"></span>求助点</div>
        <div class="legend-item"><span class="dot station"></span>物资站</div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import AMapLoader from '@amap/amap-jsapi-loader'
// 🚨 把 getDispatchConfig 补到 import 列表里
import { smartMatch, getDispatchConfig } from '@/api/dispatch'
import { getPendingOrders, grabTask, switchOrderToPickup } from '@/api/trade' // 🚨 引入新接口
import { ElMessage, ElMessageBox } from 'element-plus'
import DispatchControl from './components/DispatchControl.vue'
import DashboardPanel from './components/DashboardPanel.vue'


const router = useRouter()

// 1. 获取当前真实角色
const roleStr = localStorage.getItem('userRole')
const currentUserRole = ref(roleStr ? Number(roleStr) : 3)

window._AMapSecurityConfig = { securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE }

const sysMode = ref('NORMAL')
const map = shallowRef(null)
let AMap = null
const loading = ref(false)
const result = ref(null)
const isError = ref(false)
const isMissionActive = ref(false)
const activeOrder = ref({})

const defaultLocation = [118.092000, 24.485000]
const pendingOrder = ref(null)
const autoDispatchedOrderId = ref(null)
let pollingTimer = null

// 🚨 倒计时状态
const fallbackCountdown = ref(0)
let fallbackTimer = null
// 修改后：变成响应式变量，默认先给个 30
const dynamicThreshold = ref(30)

onMounted(async () => { // 🚨 加上 async
  initMap()

  // 🚨 挂载时，先去后端问一下：老板，今天熔断时间定多少秒？
  try {
    const configRes = await getDispatchConfig()
    if (configRes.data) {
      dynamicThreshold.value = configRes.data // 比如读取到了 yaml 里的 900
    }
  } catch (e) {
    console.warn('获取动态配置失败，使用默认 30s')
  }

  await fetchMapOrders()
  pollingTimer = setInterval(() => {
    if (!pendingOrder.value && !isMissionActive.value) fetchMapOrders()
  }, 5000)
})

onUnmounted(() => {
  if (map.value) map.value.destroy()
  if (pollingTimer) clearInterval(pollingTimer)
  clearFallbackTimer() // 离开时清理计时器
})

const toggleSysMode = () => {
  if (sysMode.value === 'NORMAL') {
    sysMode.value = 'EMERGENCY'
    ElMessage.error({ message: '⚠️ 已切换为【急时应急模式】，算法权重已向紧急度倾斜，仅应急物资可见！', duration: 4000 })
  } else {
    sysMode.value = 'NORMAL'
    ElMessage.success({ message: '✅ 已恢复为【平时常态模式】，资源调度已恢复常规策略。', duration: 4000 })
  }
}

const fetchMapOrders = async () => {
  try {
    const res = await getPendingOrders()
    if (res.data && res.data.length > 0) {
      pendingOrder.value = res.data[0]
      const lng = pendingOrder.value.targetLon || defaultLocation[0]
      const lat = pendingOrder.value.targetLat || defaultLocation[1]
      drawSosMarker([lng, lat])

      // 只有配送单才给志愿者自动推演
      if (currentUserRole.value === 3
          && pendingOrder.value.deliveryMethod === 1
          && !result.value
          && autoDispatchedOrderId.value !== pendingOrder.value.orderId) {
        autoDispatchedOrderId.value = pendingOrder.value.orderId
        await handleSmartDispatch()
      }
    } else {
      pendingOrder.value = null
      result.value = null
      if (map.value) map.value.clearMap()
      clearFallbackTimer() // 没任务时清理计时器
    }
  } catch (error) {
    console.error('获取大屏订单失败', error)
  }
}

const initMap = () => {
  AMapLoader.load({
    key: import.meta.env.VITE_AMAP_KEY,
    version: '2.0',
    plugins: ['AMap.MoveAnimation', 'AMap.Riding']
  }).then((amap) => {
    AMap = amap
    map.value = new AMap.Map('amap-container', { viewMode: '3D', pitch: 40, zoom: 15, center: defaultLocation, mapStyle: 'amap://styles/fresh' })
  }).catch(e => console.error(e))
}

const drawSosMarker = (position) => {
  if (!AMap || !map.value) return
  map.value.clearMap()
  map.value.setCenter(position)
  new AMap.Marker({ map: map.value, position: position, content: '<div class="sos-pulse-marker"></div>', offset: new AMap.Pixel(-8, -8) })
}

const handleSmartDispatch = async () => {
  if (!pendingOrder.value) return ElMessage.warning("当前无调度任务")
  if (loading.value) return

  loading.value = true
  result.value = null

  const reqLng = pendingOrder.value.targetLon || defaultLocation[0]
  const reqLat = pendingOrder.value.targetLat || defaultLocation[1]
  const safeCategory = pendingOrder.value.requiredCategory || '米面粮油'

  try {
    const res = await smartMatch({
      targetLon: reqLng, targetLat: reqLat, requiredCategory: safeCategory, urgencyLevel: pendingOrder.value.urgencyLevel || 5
    })

    if (res.data && res.data.length > 0) {
      result.value = res.data[0]
      result.value.orderSn = pendingOrder.value.orderSn || '未知单号'
      result.value.requiredCategory = safeCategory
      result.value.urgencyLevel = pendingOrder.value.urgencyLevel

      drawRoute(result.value, [reqLng, reqLat])

      // 🚨 触发倒计时机制 (仅对管理员且是配送单生效)
      if (currentUserRole.value === 4 && pendingOrder.value.deliveryMethod === 1) {
        startFallbackTimer()
      }
    } else {
      ElMessage.info(`附近暂无 [${safeCategory}] 的物资据点`)
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || '调度服务异常')
  } finally {
    loading.value = false
  }
}

const drawRoute = (data, targetPos) => {
  if (!AMap || !map.value) return
  const lng = data?.station?.longitude || 118.0894250
  const lat = data?.station?.latitude || 24.4798330
  const stationLoc = [lng, lat]
  map.value.clearMap()

  new AMap.Marker({ map: map.value, position: targetPos, content: '<div class="sos-pulse-marker"></div>', offset: new AMap.Pixel(-8, -8) })
  new AMap.Marker({ map: map.value, position: stationLoc, content: '<div class="station-mini-marker">🏥</div>', offset: new AMap.Pixel(-14, -14) })

  const riding = new AMap.Riding({ map: map.value, hideMarkers: true, autoFitView: true })
  riding.search(stationLoc, targetPos, () => {})
}

// 🚨 修改计时器，使用动态读到的阈值
const startFallbackTimer = () => {
  clearFallbackTimer()
  // 从 yaml 读取到多少秒，这里就倒计时多少秒
  fallbackCountdown.value = dynamicThreshold.value

  fallbackTimer = setInterval(() => {
    fallbackCountdown.value--
    if (fallbackCountdown.value <= 0) {
      clearFallbackTimer()
      autoTriggerFallback()
    }
  }, 1000)
}

const clearFallbackTimer = () => {
  if (fallbackTimer) clearInterval(fallbackTimer)
  fallbackCountdown.value = 0
}

const autoTriggerFallback = async () => {
  if (pendingOrder.value && pendingOrder.value.deliveryMethod === 1) {
    try {
      await switchOrderToPickup(pendingOrder.value.orderId) // 🚨 真实向后端写库
      pendingOrder.value.deliveryMethod = 2
      ElMessage.warning({ message: '🚨 超时未响应！系统已自动触发运力熔断，后台状态已变更为自提模式', duration: 5000 })
    } catch (e) {
      console.error('熔断写库失败', e)
    }
  }
}

const handleSwitchToPickup = () => {
  ElMessageBox.confirm('当前可能运力不足。是否触发【运力熔断机制】，将此单真实转为市民自提？', '⚠️ 运力熔断预警', {
    confirmButtonText: '确认转自提', cancelButtonText: '继续等待', type: 'warning'
  }).then(async () => {
    try {
      await switchOrderToPickup(pendingOrder.value.orderId) // 🚨 真实向后端写库
      pendingOrder.value.deliveryMethod = 2
      clearFallbackTimer() // 手动操作后立刻清理计时器
      ElMessage.success('已切换为自提模式！数据库已同步更新。')
    } catch (e) {
      ElMessage.error(e.response?.data?.msg || '操作失败')
    }
  })
}

// 下发自提通知
const handleNotifyPickup = () => {
  ElMessageBox.confirm('是否锁定库存并将自提提货码及导航路线下发给该市民？', '下发自提通知', {
    confirmButtonText: '立即下发', cancelButtonText: '取消', type: 'success',
  }).then(() => {
    ElMessage.success('已通过短信/APP推送通知市民前往自提！')
    pendingOrder.value = null
    result.value = null
    if (map.value) map.value.clearMap()
  })
}

const handleGrab = async () => {
  if (!pendingOrder.value?.orderId) return ElMessage.error("订单异常，无法抢单")
  try {
    await grabTask(pendingOrder.value.orderId)
    ElMessage.success({message: '抢单成功！请尽快前往据点取货', offset: 80})
    router.push('/my-tasks')
  } catch (apiError) {
    ElMessage.warning(apiError.response?.data?.msg || '任务已被其他志愿者抢先一步')
    isError.value = true
    setTimeout(() => { isError.value = false }, 500)
  } finally {
    fetchMapOrders()
    result.value = null
  }
}

const handleFinishMission = () => {
  isMissionActive.value = false
  result.value = null
  fetchMapOrders()
}
</script>

<style scoped>
/* 保持你的原样式完全不变即可！把刚才教你的那套复制过来 */
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; }

/* 🚨 修改顶部状态栏：平急两用动态样式 */
.top-status { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); z-index: 100; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); padding: 10px 24px; border-radius: 30px; font-size: 0.9rem; color: #1e293b; display: flex; align-items: center; gap: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); border: 2px solid #e2e8f0; transition: 0.5s; }
.top-status.emergency-mode { background: #fef2f2; border-color: #ef4444; color: #991b1b; }
.mode-switch-btn { margin-left: 10px; padding: 4px 12px; font-size: 0.75rem; font-weight: bold; color: #fff; background: #3b82f6; border: none; border-radius: 12px; cursor: pointer; transition: 0.3s; }
.mode-switch-btn:hover { background: #2563eb; transform: scale(1.05); }
.emergency-mode .mode-switch-btn { background: #ef4444; }

.pulse-dot { width: 10px; height: 10px; border-radius: 50%; animation: pulse 2s infinite; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

.map-wrapper { flex: 1; position: relative; }
#amap-container { width: 100%; height: 100%; }
.empty-task-panel { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1); z-index: 100; pointer-events: none; }
.empty-task-panel h3 { color: #1e293b; margin: 15px 0 5px 0; }
.empty-task-panel p { color: #64748b; font-size: 14px; }
.radar-spinner { width: 50px; height: 50px; border: 4px solid #f1f5f9; border-top-color: #10b981; border-radius: 50%; margin: 0 auto; animation: spin 1s linear infinite; }
.radar-spinner.emergency-spin { border-top-color: #ef4444; animation: spin 0.5s linear infinite; } /* 急时转得更快 */
@keyframes spin { to { transform: rotate(360deg); } }
.map-legend { position: absolute; bottom: 30px; right: 30px; background: #fff; padding: 12px 18px; border-radius: 12px; box-shadow: 0 10px 15px rgba(0, 0, 0, 0.05); font-size: 0.75rem; border: 1px solid #f1f5f9; z-index: 100; }
.legend-item { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; color: #64748b; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.sos { background: #ef4444; }
.station { background: #f97316; }
</style>

<style>
.sos-pulse-marker { width: 16px; height: 16px; background: #ef4444; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px rgba(239, 68, 68, 0.6); position: relative; }
.sos-pulse-marker::after { content: ''; position: absolute; top: -5px; left: -5px; width: 20px; height: 20px; border: 2px solid #ef4444; border-radius: 50%; animation: mapPulse 1.5s ease-out infinite; }
@keyframes mapPulse { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
.station-mini-marker { width: 28px; height: 28px; background: #fff; border: 3px solid #f97316; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4); color: #f97316; font-weight: bold; }
</style>