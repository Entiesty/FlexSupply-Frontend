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
            :loading="loading"
            :result="result"
            :isMissionActive="isMissionActive"
            :activeOrder="activeOrder"
            :isError="isError"
            @dispatch="handleSmartDispatch"
            @grab="handleGrab"
            @finish="handleFinishMission"
        />

        <div class="map-legend">
          <div class="legend-item"><span class="dot sos"></span>求助点</div>
          <div class="legend-item"><span class="dot station"></span>物资站</div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, shallowRef, reactive, onMounted, onUnmounted } from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import {smartMatch, grabTask} from '@/api/dispatch'
import {ElMessage} from 'element-plus'

// 引入拆分出来的组件
import SideMenu from './components/SideMenu.vue'
import DispatchControl from './components/DispatchControl.vue'

// 🚨 使用 Vite 环境变量读取密钥
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

const userLocation = [118.092000, 24.485000]

onMounted(() => initMap())
onUnmounted(() => {
  if (map.value) map.value.destroy()
})

const initMap = () => {
  AMapLoader.load({
    key: import.meta.env.VITE_AMAP_KEY, // 🚨 使用环境变量
    version: '2.0',
    plugins: ['AMap.MoveAnimation']
  }).then((amap) => {
    AMap = amap
    map.value = new AMap.Map('amap-container', {
      viewMode: '3D', pitch: 40, zoom: 15, center: userLocation,
      mapStyle: 'amap://styles/fresh'
    })
    new AMap.Marker({
      map: map.value, position: userLocation,
      content: '<div class="custom-marker sos-marker">🆘 求助点</div>',
      offset: new AMap.Pixel(-40, -15)
    })
  }).catch(e => console.error(e))
}

// ==========================================
// 1. 新增：前端全局维持的“待处理订单”状态
// ==========================================
// 真实场景下，这个数据应该是用户从“任务大厅”点击某个任务后传过来的
const pendingOrder = ref({
  id: 2, // 🚨 对应你数据库里那个待匹配的真实订单 ID
  orderSn: 'ORD-2026-REFRESH',
  goodsName: '应急矿泉水',
  goodsId: 1, // 传给匹配引擎计算用的物资ID
  urgencyLevel: 10
})

// ==========================================
// 2. 修改：智能调度方法 (读取 pendingOrder)
// ==========================================
const handleSmartDispatch = async () => {
  loading.value = true
  result.value = null
  try {
    // 🚨 使用 pendingOrder 里的真实物资 ID 和紧急度去请求“计算器”
    const res = await smartMatch({
      longitude: userLocation[0],
      latitude: userLocation[1],
      goodsId: pendingOrder.value.goodsId,
      urgency: pendingOrder.value.urgencyLevel
    })

    if (res.data?.length) {
      result.value = res.data[0]
      // 🚨 手动把 pendingOrder 里的订单信息“缝合”到结果里，供子组件显示
      result.value.orderSn = pendingOrder.value.orderSn
      result.value.goodsName = pendingOrder.value.goodsName
      result.value.urgencyLevel = pendingOrder.value.urgencyLevel

      drawRoute(result.value)
    } else {
      ElMessage.info("暂无可调度的需求")
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const drawRoute = (data) => {
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
    path: [stationLoc, [(userLocation[0] + stationLoc[0]) / 2, (userLocation[1] + stationLoc[1]) / 2 + 0.003], userLocation],
    strokeColor: "#f97316", strokeWeight: 6, strokeOpacity: 0.8, isOutline: true, outlineColor: '#fff'
  })
  map.value.add(curve)
  map.value.setFitView()
}

// ==========================================
// 3. 修改：抢单方法 (彻底抛弃从 result 里找 ID)
// ==========================================
// 这里的 orderId 参数可以留着（兼容之前子组件的 emit），但我们直接用 pendingOrder.value.id
const handleGrab = async (passedOrderId) => {
  // 🚨 核心逻辑：直接使用前端自己存的真实订单 ID
  const targetOrderId = pendingOrder.value.id

  if (!targetOrderId) return ElMessage.error("未找到有效订单ID")

  try {
    // 向后端发送真正的抢单请求
    await grabTask(targetOrderId)
  } catch (apiError) {
    // 如果抛出异常（比如手慢了），触发 UI 震动并终止
    isError.value = true
    setTimeout(() => { isError.value = false }, 500)
    return
  }

  // 走到这里说明后端返回 200，接单成功！
  ElMessage.success({ message: '响应成功！爱心接力中', offset: 80 })

  // 使用 pendingOrder 和匹配计算的结果，组装执行看板所需的数据
  activeOrder.value = {
    orderSn: pendingOrder.value.orderSn,
    stationName: result.value?.station?.stationName || result.value?.stationName || '核心调度据点',
    address: result.value?.station?.address || result.value?.address || '据点详细地址',
    eta: new Date(Date.now() + 8 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // 切换为任务进行中状态
  isMissionActive.value = true
}

const handleFinishMission = () => {
  ElMessage.success('任务圆满完成！')
  isMissionActive.value = false
  result.value = null
  map.value.clearMap() // 清空飞行路线，重置地图状态
  initMap() // 重新放置起点
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

/* 地图区域撑满 */
.map-wrapper {
  flex: 1;
  position: relative;
}

#amap-container {
  width: 100%;
  height: 100%;
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
/* 高德地图原生覆盖物必须写在全局 */
.custom-marker {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 900;
  color: #fff;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
}

.sos-marker {
  background: #ef4444;
}

.station-marker {
  background: #f97316;
}
</style>