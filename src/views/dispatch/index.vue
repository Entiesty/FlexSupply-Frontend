<template>
  <div class="app-layout">
    <SideMenu/>

    <main class="main-content">
      <div class="top-status">
        <span class="pulse-dot"></span> 智能匹配引擎运行中 · 坐标系: GCJ-02
      </div>

      <div class="map-wrapper">
        <div id="amap-container"></div>

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
import { ref, shallowRef, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import AMapLoader from '@amap/amap-jsapi-loader'
import { smartMatch, grabTask } from '@/api/dispatch'
import request from '@/utils/request' // 🚨 引入你的 request 工具
import { ElMessage } from 'element-plus'

import SideMenu from './components/SideMenu.vue'
import DispatchControl from './components/DispatchControl.vue'

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

// 默认坐标（如果没有获取到订单坐标，作为兜底）
const defaultLocation = [118.092000, 24.485000]

// 🚨 核心：不再写死假数据，而是初始化为空，等待后端填充
const pendingOrder = ref(null)

onMounted(() => {
  initMap()
  fetchMapOrders() // 🚨 页面加载时立刻向后端拉取待匹配订单
})

onUnmounted(() => {
  if (map.value) map.value.destroy()
})

// ==========================================
// 🚨 1. 新增：向后端拉取真实大屏订单数据
// ==========================================
const fetchMapOrders = async () => {
  try {
    // 调用后端只查询 status=0 (待匹配) 的接口
    const res = await request.get('/dispatch/order/pending-list')

    if (res.data && res.data.length > 0) {
      // 获取到真实订单，赋值给 pendingOrder
      pendingOrder.value = res.data[0]

      // 可选：将地图中心点和求助点移动到该订单的真实坐标 (如果数据库里存了 targetLon/Lat)
      const lng = pendingOrder.value.targetLon || defaultLocation[0]
      const lat = pendingOrder.value.targetLat || defaultLocation[1]
      drawSosMarker([lng, lat])

    } else {
      // 如果没有查到订单（或者被别人抢光了），清空数据
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
    plugins: ['AMap.MoveAnimation']
  }).then((amap) => {
    AMap = amap
    map.value = new AMap.Map('amap-container', {
      viewMode: '3D', pitch: 40, zoom: 15, center: defaultLocation,
      mapStyle: 'amap://styles/fresh'
    })
  }).catch(e => console.error(e))
}

// 绘制求助点 (红色 SOS)
const drawSosMarker = (position) => {
  if (!AMap || !map.value) return
  map.value.clearMap() // 画新标前清空旧标
  map.value.setCenter(position)
  new AMap.Marker({
    map: map.value, position: position,
    content: '<div class="custom-marker sos-marker">🆘 求助点</div>',
    offset: new AMap.Pixel(-40, -15)
  })
}

// ==========================================
// 2. 调度匹配 (读取真实的 pendingOrder)
// ==========================================
const handleSmartDispatch = async () => {
  if (!pendingOrder.value) return ElMessage.warning("当前无调度任务")
  loading.value = true
  result.value = null

  // 提取真实的坐标和请求参数
  const reqLng = pendingOrder.value.targetLon || defaultLocation[0]
  const reqLat = pendingOrder.value.targetLat || defaultLocation[1]

  try {
    const res = await smartMatch({
      longitude: reqLng,
      latitude: reqLat,
      goodsId: pendingOrder.value.goodsId,
      urgency: pendingOrder.value.urgencyLevel
    })

    if (res.data?.length) {
      result.value = res.data[0]
      // 将订单号合并给结果，方便展示
      result.value.orderSn = pendingOrder.value.orderSn || '未知单号'
      result.value.urgencyLevel = pendingOrder.value.urgencyLevel

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

// 绘制据点与连线
const drawRoute = (data, userPos) => {
  if (!AMap || !map.value) return
  const lng = data?.station?.longitude || data?.longitude || 118.0894250
  const lat = data?.station?.latitude || data?.latitude || 24.4798330
  const stationLoc = [lng, lat]

  new AMap.Marker({
    map: map.value, position: stationLoc,
    content: '<div class="custom-marker station-marker">🏥 物资点</div>',
    offset: new AMap.Pixel(-40, -15)
  })
  const curve = new AMap.BezierCurve({
    path: [stationLoc, [(userPos[0] + stationLoc[0]) / 2, (userPos[1] + stationLoc[1]) / 2 + 0.003], userPos],
    strokeColor: "#f97316", strokeWeight: 6, strokeOpacity: 0.8, isOutline: true, outlineColor: '#fff'
  })
  map.value.add(curve)
  map.value.setFitView()
}

// ==========================================
// 🚨 抢单逻辑闭环 (包含强制刷新机制)
// ==========================================
const handleGrab = async () => {
  if (!pendingOrder.value || !pendingOrder.value.orderId) {
    return ElMessage.error("未找到有效订单ID")
  }

  const targetOrderId = pendingOrder.value.orderId

  try {
    // 1. 发起真实抢单请求
    await grabTask(targetOrderId)

    // 2. 抢单成功后的处理
    ElMessage.success({ message: '抢单成功！请前往“我的配送任务”查看路线并执行', offset: 80 })
    // 跳转到执行看板
    router.push('/my-tasks')

  } catch (apiError) {
    // 3. 如果抢单失败（比如后端乐观锁拦截了，说明被别人抢了）
    ElMessage.warning(apiError.response?.data?.msg || apiError.message || '晚了一小步，该任务已有志愿者领取了')
    isError.value = true
    setTimeout(() => { isError.value = false }, 500)

  } finally {
    // 🚨 4. 核心防线：强制刷新大屏！
    // 只要执行到这里，说明抢单动作结束了。此时重新去查状态为 0 的列表。
    // 如果刚才被别人抢了（状态变1），这里就查不到了，红点自然就从地图上消失了。
    fetchMapOrders()

    // 清空当前的匹配结果面板
    result.value = null
  }
}

const handleFinishMission = () => {
  // 逻辑已移交至 MyTasks.vue，这里可以留空或重置地图
  isMissionActive.value = false
  result.value = null
  fetchMapOrders()
}

// 保存定时器实例
let pollingTimer = null

onMounted(() => {
  initMap()
  fetchMapOrders()

  // 🚨 开启“真·雷达扫描”：每隔 5 秒钟，偷偷向后端看一眼有没有新订单
  pollingTimer = setInterval(() => {
    // 只有在没有任务的时候才去轮询，防止打断正在执行的任务
    if (!pendingOrder.value && !isMissionActive.value) {
      fetchMapOrders()
    }
  }, 5000)
})

// 离开页面时记得销毁定时器
onUnmounted(() => {
  if (map.value) map.value.destroy()
  if (pollingTimer) clearInterval(pollingTimer)
})
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

/* 右侧内容区 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 顶部的轻量状态条 */
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
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

/* 地图区域撑满 */
.map-wrapper {
  flex: 1;
  position: relative;
}

#amap-container {
  width: 100%;
  height: 100%;
}

/* 🚨 空状态面板样式 */
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
  box-shadow: 0 15px 35px rgba(0,0,0,0.1);
  z-index: 100;
  pointer-events: none; /* 让鼠标事件穿透到地图 */
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
  to { transform: rotate(360deg); }
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

.sos { background: #ef4444; }
.station { background: #f97316; }
</style>

<style>
/* 高德地图原生覆盖物必须写在全局 */
.custom-marker {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 900;
  color: #fff;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
}
.sos-marker { background: #ef4444; }
.station-marker { background: #f97316; }
</style>