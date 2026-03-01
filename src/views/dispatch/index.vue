<template>
  <div class="app-layout">
    <SideMenu/>

    <main class="main-content">
      <div class="top-status">
        <span class="pulse-dot"></span> 智能匹配引擎运行中 · 坐标系: GCJ-02
      </div>

      <div class="map-wrapper">
        <div id="amap-container"></div>

        <DashboardPanel/>

        <DispatchControl
            v-if="pendingOrder"
            :loading="loading"
            :result="result"
            :isMissionActive="isMissionActive"
            :activeOrder="activeOrder"
            :isError="isError"
            @dispatch="handleSmartDispatch"
            @grab="handleGrab"
            @finish="handleFinishMission"
        />

        <div v-else class="empty-task-panel">
          <div class="radar-spinner"></div>
          <h3>暂无紧急调度需求</h3>
          <p>城市运转良好，调度大脑正在实时监听中...</p>
        </div>

        <div class="map-legend">
          <div class="legend-item"><span class="dot sos"></span>求助点</div>
          <div class="legend-item"><span class="dot station"></span>物资站</div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import {onMounted, onUnmounted, ref, shallowRef} from 'vue'
import {useRouter} from 'vue-router'
import AMapLoader from '@amap/amap-jsapi-loader'
import {smartMatch} from '@/api/dispatch'
import {getPendingOrders, grabTask} from '@/api/trade'
import {ElMessage} from 'element-plus'
import SideMenu from './components/SideMenu.vue'
import DispatchControl from './components/DispatchControl.vue'
import DashboardPanel from './components/DashboardPanel.vue'

const router = useRouter()

// 使用 Vite 环境变量读取密钥
window._AMapSecurityConfig = {
  securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE,
}

const map = shallowRef(null)
let AMap = null
const loading = ref(false)
const result = ref(null)
const isError = ref(false)
const isMissionActive = ref(false)
const activeOrder = ref({})

// 默认坐标
const defaultLocation = [118.092000, 24.485000]

const pendingOrder = ref(null)

// 保存定时器实例
let pollingTimer = null

// 🚨 合并后的 onMounted
onMounted(() => {
  initMap()
  fetchMapOrders()

  // 开启“真·雷达扫描”：每隔 5 秒钟，偷偷向后端看一眼有没有新订单
  pollingTimer = setInterval(() => {
    // 只有在没有任务的时候才去轮询
    if (!pendingOrder.value && !isMissionActive.value) {
      fetchMapOrders()
    }
  }, 5000)
})

onUnmounted(() => {
  if (map.value) map.value.destroy()
  if (pollingTimer) clearInterval(pollingTimer)
})

// ==========================================
// 1. 获取大屏订单数据
// ==========================================
const fetchMapOrders = async () => {
  try {
    const res = await getPendingOrders()

    if (res.data && res.data.length > 0) {
      pendingOrder.value = res.data[0]
      const lng = pendingOrder.value.targetLon || defaultLocation[0]
      const lat = pendingOrder.value.targetLat || defaultLocation[1]
      drawSosMarker([lng, lat])
    } else {
      pendingOrder.value = null
      if (map.value) map.value.clearMap() // 清理地图上的旧标
    }
  } catch (error) {
    console.error('获取大屏订单失败', error)
  }
}

const initMap = () => {
  AMapLoader.load({
    key: import.meta.env.VITE_AMAP_KEY,
    version: '2.0',
    plugins: ['AMap.MoveAnimation', 'AMap.Riding'] // 🚨 引入骑行路线插件
  }).then((amap) => {
    AMap = amap
    map.value = new AMap.Map('amap-container', {
      viewMode: '3D', pitch: 40, zoom: 15, center: defaultLocation,
      mapStyle: 'amap://styles/fresh'
    })
  }).catch(e => console.error(e))
}

// 🚨 绘制极简波纹求助点 (SOS)
const drawSosMarker = (position) => {
  if (!AMap || !map.value) return
  map.value.clearMap()
  map.value.setCenter(position)
  new AMap.Marker({
    map: map.value,
    position: position,
    content: '<div class="sos-pulse-marker"></div>',
    offset: new AMap.Pixel(-8, -8) // 居中偏移
  })
}

// ==========================================
// 2. 调度匹配
// ==========================================
// ==========================================
// 2. 调度匹配
// ==========================================
const handleSmartDispatch = async () => {
  if (!pendingOrder.value) return ElMessage.warning("当前无调度任务")
  loading.value = true
  result.value = null

  const reqLng = pendingOrder.value.targetLon || defaultLocation[0]
  const reqLat = pendingOrder.value.targetLat || defaultLocation[1]

  try {
    // 🚀 终极防报错对齐版
    const res = await smartMatch({
      targetLon: reqLng,       // 🚨 修复：从 longitude 改为 targetLon
      targetLat: reqLat,       // 🚨 修复：从 latitude 改为 targetLat
      goodsId: pendingOrder.value.goodsId,
      urgencyLevel: pendingOrder.value.urgencyLevel,
      requiredCategory: pendingOrder.value.requiredCategory
    })

    if (res.data?.length) {
      result.value = res.data[0]
      result.value.orderSn = pendingOrder.value.orderSn || '未知单号'
      result.value.urgencyLevel = pendingOrder.value.urgencyLevel

      // 绘制路线
      drawRoute(result.value, [reqLng, reqLat])
    } else {
      ElMessage.info("附近暂无可用物资据点")
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// 🚨 绘制路线及据点 (双节点不丢失版)
const drawRoute = (data, targetPos) => {
  if (!AMap || !map.value) return

  const lng = data?.station?.longitude || data?.longitude || 118.0894250
  const lat = data?.station?.latitude || data?.latitude || 24.4798330
  const stationLoc = [lng, lat]

  // 1. 路线规划前先清空图层
  map.value.clearMap()

  // 2. 重新把【求助点】钉上去
  new AMap.Marker({
    map: map.value,
    position: targetPos,
    content: '<div class="sos-pulse-marker"></div>',
    offset: new AMap.Pixel(-8, -8)
  })

  // 3. 把极简【物资点】钉上去
  new AMap.Marker({
    map: map.value,
    position: stationLoc,
    content: '<div class="station-mini-marker">🏥</div>',
    offset: new AMap.Pixel(-14, -14)
  })

  // 4. 调用高德骑行规划路线
  const riding = new AMap.Riding({
    map: map.value,
    hideMarkers: true, // 隐藏高德自带的大头针
    autoFitView: true  // 自动缩放视野
  })

  riding.search(stationLoc, targetPos, (status, result) => {
    if (status === 'complete') {
      console.log('✅ 真实路网及双节点渲染完毕')
    } else {
      console.error('路网规划失败', result)
    }
  })
}

// ==========================================
// 3. 抢单逻辑闭环
// ==========================================
const handleGrab = async () => {
  if (!pendingOrder.value || !pendingOrder.value.orderId) {
    return ElMessage.error("未找到有效订单ID")
  }

  const targetOrderId = pendingOrder.value.orderId

  try {
    await grabTask(targetOrderId)
    ElMessage.success({message: '抢单成功！请前往“我的配送任务”查看路线并执行', offset: 80})
    router.push('/my-tasks')
  } catch (apiError) {
    ElMessage.warning(apiError.response?.data?.msg || apiError.message || '晚了一小步，该任务已有志愿者领取了')
    isError.value = true
    setTimeout(() => {
      isError.value = false
    }, 500)
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
/* 整个页面采用 Flex 左右布局 */
.app-layout {
  position: fixed;
  inset: 0;
  display: flex;
  width: 100vw;
  height: 100vh;
  background: #f1f5f9;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.top-status {
  position: absolute;
  top: 20px;
  right: 30px;
  z-index: 100;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.75rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 8px #10b981;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
}

.map-wrapper {
  flex: 1;
  position: relative;
}

#amap-container {
  width: 100%;
  height: 100%;
}

.empty-task-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 40px;
  border-radius: 20px;
  text-align: center;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  z-index: 100;
  pointer-events: none;
}

.empty-task-panel h3 {
  color: #1e293b;
  margin: 15px 0 5px 0;
}

.empty-task-panel p {
  color: #64748b;
  font-size: 14px;
}

.radar-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f1f5f9;
  border-top-color: #f97316;
  border-radius: 50%;
  margin: 0 auto;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.map-legend {
  position: absolute;
  bottom: 30px;
  right: 30px;
  background: #fff;
  padding: 12px 18px;
  border-radius: 12px;
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.05);
  font-size: 0.75rem;
  border: 1px solid #f1f5f9;
  z-index: 100;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
  color: #64748b;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.sos {
  background: #ef4444;
}

.station {
  background: #f97316;
}
</style>

<style>
/* 🚨 极简 UI 图标样式必须写在非 scoped 里 */

/* 1. 呼吸波纹求助点 (SOS) */
.sos-pulse-marker {
  width: 16px;
  height: 16px;
  background: #ef4444;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.6);
  position: relative;
}

.sos-pulse-marker::after {
  content: '';
  position: absolute;
  top: -5px;
  left: -5px;
  width: 20px;
  height: 20px;
  border: 2px solid #ef4444;
  border-radius: 50%;
  animation: mapPulse 1.5s ease-out infinite;
}

@keyframes mapPulse {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

/* 2. 极简圆形物资点 (Station) */
.station-mini-marker {
  width: 28px;
  height: 28px;
  background: #fff;
  border: 3px solid #f97316;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
  color: #f97316;
  font-weight: bold;
}
</style>