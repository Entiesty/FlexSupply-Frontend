<template>
  <main class="main-content">

    <div v-if="currentUserRole !== 4 && isVerified === 0" class="lock-screen">
      <div class="lock-panel">
        <div class="lock-icon">
          <span class="shield">🛡️</span>
        </div>
        <h2 class="lock-title">系统接入权限受限</h2>
        <p class="lock-desc">您的城市护航者资质正在由指挥中心进行人工核验。<br>在此期间，调度大屏与实况数据将对您保持锁定。</p>
        <div class="lock-status">
          <span class="spinner"></span> 正在等待中心下发授权...
        </div>
        <button class="go-profile-btn" @click="router.push('/profile')">前往个人中心完善资料</button>
      </div>
    </div>

    <template v-else>
      <div class="top-status" :class="{ 'emergency-mode': sysMode === 'EMERGENCY' }">
        <span class="pulse-dot" :style="{ background: sysMode === 'EMERGENCY' ? '#ef4444' : '#10b981' }"></span>
        当前运行模式: <strong>{{ sysMode === 'NORMAL' ? '🟢 平时常态调度' : '🔴 急时应急调度' }}</strong>
        <button v-if="currentUserRole === 4" class="mode-switch-btn" @click="toggleSysMode">
          切换至{{ sysMode === 'NORMAL' ? '急时' : '平时' }}
        </button>
      </div>

      <div class="map-wrapper">
        <div id="amap-container"></div>

        <DashboardPanel v-if="currentUserRole === 4" />

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
            @dispatch="handleDispatchAction"
            @grab="handleBatchGrab"
            @finish="handleFinishMission"
            @notify-pickup="handleNotifyPickup"
            @switch-pickup="handleSwitchToPickup"
        />

        <div v-else class="empty-task-panel">
          <div class="radar-spinner" :class="{ 'emergency-spin': sysMode === 'EMERGENCY' }"></div>
          <h3>{{ sysMode === 'NORMAL' ? '暂无调度需求' : '应急预案已启动，全城戒备' }}</h3>
          <p>城市运转良好，红蓝双轨调度引擎正在实时监听中...</p>
        </div>

        <div class="map-legend">
          <div class="legend-item"><span class="dot sos"></span>主求救点</div>
          <div class="legend-item"><span class="dot pb"></span>顺路打包点</div>
          <div class="legend-item"><span class="dot don"></span>捐赠商铺</div>
          <div class="legend-item"><span class="dot station"></span>社区物资站</div>
        </div>
      </div>
    </template>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import AMapLoader from '@amap/amap-jsapi-loader'
import { smartMatch, getDispatchConfig } from '@/api/dispatch'
import { getPendingOrders, grabTask, switchOrderToPickup } from '@/api/trade'
import { getUserProfile } from '@/api/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import DispatchControl from './components/DispatchControl.vue'
import DashboardPanel from './components/DashboardPanel.vue'

const router = useRouter()

// ================= 全局状态与权限 =================
const roleStr = localStorage.getItem('userRole')
const currentUserRole = ref(roleStr ? Number(roleStr) : 3)

window._AMapSecurityConfig = { securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE }

const sysMode = ref('NORMAL')
const map = shallowRef(null)
let AMap = null

const isVerified = ref(0)

// ================= 调度核心状态 =================
const loading = ref(false)
const result = ref(null)
const isError = ref(false)
const isMissionActive = ref(false)
const activeOrder = ref({})
const pendingOrder = ref(null)
const autoDispatchedOrderId = ref(null)

const fallbackCountdown = ref(0)
const dynamicThreshold = ref(30)
let pollingTimer = null
let fallbackTimer = null

const userLocation = ref([118.092000, 24.623500])

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// 🚨 核心重构：大屏级混合定位策略与初始化流程分离
onMounted(async () => {
  let dbLon = null, dbLat = null;

  try {
    const userRes = await getUserProfile()
    if (userRes?.data) {
      isVerified.value = userRes.data.isVerified !== undefined ? userRes.data.isVerified : 1
      dbLon = userRes.data.currentLon;
      dbLat = userRes.data.currentLat;
    }
  } catch (e) {
    console.warn('获取资料失败，可能未登录')
  }

  // 权限拦截：审核通过或是管理员，才允许看大屏
  if (currentUserRole.value === 4 || isVerified.value === 1) {

    // 🌍 核心交互：如果是志愿者 (Role 3)，一进大屏立刻弹窗请求真实 GPS
    if (currentUserRole.value === 3 && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          (pos) => {
            // 🚨 加上这三行打印代码，直接扒开浏览器的底裤！
            console.log("📍 【底层探针】浏览器抓取到的完整 GPS 数据对象:", pos);
            console.log(`🌍 经度: ${pos.coords.longitude}, 纬度: ${pos.coords.latitude}`);
            console.log(`🎯 定位精度: ${pos.coords.accuracy} 米`);

            let realLon = pos.coords.longitude
            let realLat = pos.coords.latitude

            // 答辩沙盘防漂移保护 (只在厦门集美区有效)
            if (Math.abs(realLon - 118.1) > 1 || Math.abs(realLat - 24.6) > 1) {
              console.warn('大屏检测到异地登录，开启沙盘保护，降级使用档案坐标');
              userLocation.value = [dbLon || 118.065200, dbLat || 24.615500];
              ElMessage.warning('GPS异地，大屏已锁定至测试沙盘区域');
            } else {
              userLocation.value = [realLon, realLat];
              ElMessage.success('📍 大屏已接入实时 GPS 信号');
            }
            proceedInit(); // 拿到坐标后再初始化大盘
          },
          (err) => {
            console.warn('大屏 GPS 被拒或超时，使用静态坐标');
            userLocation.value = [dbLon || 118.065200, dbLat || 24.615500];
            proceedInit();
          },
          { timeout: 5000, enableHighAccuracy: true }
      )
    }
    // 🏢 如果是指挥中心 (Role 4) 或不支持 GPS，直接用静态中心点
    else {
      userLocation.value = [dbLon || 118.092000, dbLat || 24.623500];
      proceedInit();
    }
  }
})

// 💡 抽离出的初始化执行管线 (等待坐标就绪后执行)
const proceedInit = () => {
  initMap()

  getDispatchConfig().then(res => {
    if (res?.data) dynamicThreshold.value = res.data
  }).catch(e => {})

  fetchMapOrders()

  pollingTimer = setInterval(() => {
    if (!pendingOrder.value && !isMissionActive.value) {
      fetchMapOrders()
    }
  }, 5000)
}

onUnmounted(() => {
  if (map.value) map.value.destroy()
  if (pollingTimer) clearInterval(pollingTimer)
  clearFallbackTimer()
})

const toggleSysMode = () => {
  sysMode.value = sysMode.value === 'NORMAL' ? 'EMERGENCY' : 'NORMAL'
  if(sysMode.value === 'EMERGENCY') ElMessage.error({ message: '⚠️ 已进入【急时应急模式】，请注意资源倾斜', duration: 4000 })
  else ElMessage.success({ message: '✅ 已恢复为【平时常态模式】', duration: 4000 })
}

const fetchMapOrders = async () => {
  try {
    const res = await getPendingOrders({
      currentLon: userLocation.value[0],
      currentLat: userLocation.value[1]
    })
    if (res?.data && res.data.length > 0) {
      const mainOrder = res.data[0]
      pendingOrder.value = mainOrder

      const mainSrcLat = mainOrder.sourceLat || userLocation.value[1]
      const mainSrcLon = mainOrder.sourceLon || userLocation.value[0]
      const mainTgtLat = mainOrder.targetLat || userLocation.value[1]
      const mainTgtLon = mainOrder.targetLon || userLocation.value[0]

      const isDonation = mainOrder.orderSn?.startsWith('DON')

      drawMarker(isDonation, [mainTgtLon, mainTgtLat])

      if (currentUserRole.value === 3
          && pendingOrder.value.deliveryMethod === 1
          && !result.value
          && autoDispatchedOrderId.value !== pendingOrder.value.orderId) {

        autoDispatchedOrderId.value = pendingOrder.value.orderId

        if (isDonation) handleDonationDispatch([mainTgtLon, mainTgtLat])
        else await handleSmartDispatch([mainTgtLon, mainTgtLat])
      }
    } else {
      pendingOrder.value = null
      result.value = null
      if (map.value) map.value.clearMap()
      clearFallbackTimer()
    }
  } catch (error) {
    console.error('调度大盘异常', error)
  }
}

const initMap = () => {
  AMapLoader.load({
    key: import.meta.env.VITE_AMAP_KEY,
    version: '2.0',
    plugins: ['AMap.MoveAnimation', 'AMap.Riding']
  }).then((amap) => {
    AMap = amap
    map.value = new AMap.Map('amap-container', {
      viewMode: '3D', pitch: 40, zoom: 15, center: userLocation.value, mapStyle: 'amap://styles/fresh'
    })
  }).catch(e => {
    ElMessage.error('地图引擎加载异常')
  })
}

const drawMarker = (isDonation, position) => {
  if (!AMap || !map.value) return
  map.value.clearMap()
  map.value.setCenter(position)

  const markerClass = isDonation ? 'don-pulse-marker' : 'sos-pulse-marker'
  new AMap.Marker({
    map: map.value, position: position, content: `<div class="${markerClass}"></div>`, offset: new AMap.Pixel(-8, -8)
  })
}

const handleDispatchAction = async () => {
  const isDonation = pendingOrder.value.orderSn?.startsWith('DON')
  const lng = pendingOrder.value.targetLon || userLocation.value[0]
  const lat = pendingOrder.value.targetLat || userLocation.value[1]
  if (isDonation) handleDonationDispatch([lng, lat])
  else await handleSmartDispatch([lng, lat])
}

const handleDonationDispatch = (targetPos) => {
  loading.value = true
  setTimeout(() => {
    const srcLng = pendingOrder.value.sourceLon || userLocation.value[0]
    const srcLat = pendingOrder.value.sourceLat || userLocation.value[1]

    result.value = {
      station: {
        longitude: targetPos[0],
        latitude: targetPos[1],
        stationName: pendingOrder.value.targetName || '社区接收驿站'
      },
      orderSn: pendingOrder.value.orderSn,
      requiredCategory: pendingOrder.value.goodsName || pendingOrder.value.requiredCategory || '爱心捐赠物资',
      urgencyLevel: 1
    }

    drawRoute(result.value, [srcLng, srcLat], true)
    loading.value = false
    ElMessage.success('✅ 识别到定向捐赠，已免测算直接生成回收路线！')
  }, 800)
}

const handleSmartDispatch = async (targetPos) => {
  if (!pendingOrder.value) return
  loading.value = true
  result.value = null

  const safeCategory = pendingOrder.value.requiredCategory || '应急物资'

  // 🚨 核心修复：前端数据清洗转换 (String -> Array)
  // 如果数据库里没有标签 (null)，就给后端传空数组 []
  // 如果有标签 (如 "高血压,无糖")，就按逗号切成数组 ["高血压", "无糖"]
  let parsedTags = []
  if (pendingOrder.value.requiredTags) {
    parsedTags = pendingOrder.value.requiredTags.split(',')
  }

  try {
    const res = await smartMatch({
      targetLon: targetPos[0],
      targetLat: targetPos[1],
      requiredCategory: safeCategory,
      urgencyLevel: pendingOrder.value.urgencyLevel || 5,
      // 👇 传入清洗好的标准数组格式，完美适配后端的 List<String>
      requiredTags: parsedTags,
      deliveryMethod: pendingOrder.value.deliveryMethod || 1
    })

    if (res?.data && res.data.length > 0) {
      result.value = res.data[0]
      result.value.orderSn = pendingOrder.value.orderSn || '未知单号'
      result.value.requiredCategory = safeCategory
      result.value.urgencyLevel = pendingOrder.value.urgencyLevel

      drawRoute(result.value, targetPos, false)

      if (currentUserRole.value === 4 && pendingOrder.value.deliveryMethod === 1) startFallbackTimer()
    } else {
      ElMessage.info(`测算完毕：附近 5 公里暂无满足 [${safeCategory}] 及其特殊标签的物资`)
    }
  } catch (e) {
    ElMessage.error(`调度失败: ${e.response?.data?.message || '引擎异常'}`)
  } finally {
    loading.value = false
  }
}

// 🚀 核心升级：大屏支持区分角色，志愿者展示三点接驾线，并自带防跨海降级
// 🚀 架构师重构版：导航级平滑路径渲染引擎 (带流向箭头、智能降级与 Z-Index 视觉层级控制)
const drawRoute = async (data, targetPos, isDonation) => {
  if (!AMap || !map.value) return

  const stationLoc = [data?.station?.longitude || userLocation.value[0], data?.station?.latitude || userLocation.value[1]]
  map.value.clearMap()

  // 1. 定义三个关键物理坐标点
  const ptA = new AMap.LngLat(userLocation.value[0], userLocation.value[1]) // A: 志愿者位置
  const pickupPos = isDonation ? targetPos : stationLoc
  const ptB = new AMap.LngLat(pickupPos[0], pickupPos[1]) // B: 取货点
  const dropoffPos = isDonation ? stationLoc : targetPos
  const ptC = new AMap.LngLat(dropoffPos[0], dropoffPos[1]) // C: 送达点

  // 2. 绘制带文字标签的高区分度 Marker（骑手一眼可辨）
  const pickupName = isDonation
    ? (pendingOrder.value.sourceName || '爱心商家')
    : (data?.station?.stationName || '物资站')
  const dropoffName = isDonation
    ? (data?.station?.stationName || '社区驿站')
    : (pendingOrder.value.targetName || '求助市民')

  const pillStyle = 'color:#fff;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:900;white-space:nowrap;border:2px solid #fff;'

  new AMap.Marker({ map: map.value, position: ptA,
    content: `<div style="background:#1e40af;${pillStyle}box-shadow:0 3px 12px rgba(30,64,175,0.45);">🚴 我</div>`,
    offset: new AMap.Pixel(-30, -16), zIndex: 110 })

  new AMap.Marker({ map: map.value, position: ptB,
    content: `<div style="background:#f97316;${pillStyle}box-shadow:0 3px 12px rgba(249,115,22,0.45);">📦 取: ${pickupName}</div>`,
    offset: new AMap.Pixel(-60, -16), zIndex: 100 })

  new AMap.Marker({ map: map.value, position: ptC,
    content: `<div style="background:#10b981;${pillStyle}box-shadow:0 3px 12px rgba(16,185,129,0.45);">🚩 送: ${dropoffName}</div>`,
    offset: new AMap.Pixel(-60, -16), zIndex: 100 })

  // 3. 初始化极其纯净的骑行引擎 (不绑定 map，完全手动接管渲染)
  const riding = new AMap.Riding({ policy: 0 })

  // 💡 核心：带 Z-Index 层级控制的 Promise 路线解析器
  const searchAndDraw = (startLoc, endLoc, routeColor, layerZIndex) => {
    return new Promise((resolve) => {
      riding.search(startLoc, endLoc, (status, result) => {
        if (status === 'complete' && result.routes && result.routes.length > 0) {
          let path = []
          result.routes[0].rides.forEach(ride => {
            path = path.concat(ride.path)
          })

          new AMap.Polyline({
            map: map.value,
            path: path,
            strokeColor: routeColor,
            strokeWeight: 7,
            strokeOpacity: 0.9,
            lineJoin: 'round',
            lineCap: 'round',
            showDir: true,
            dirColor: '#ffffff',
            isOutline: true,
            outlineColor: '#ffffff',
            borderWeight: 2,
            zIndex: layerZIndex // 🚨 动态接收传入的 Z轴层级
          })
          resolve(true)
        } else {
          console.warn('该路段暂无合规骑行路径，已降级为直线测算映射')
          new AMap.Polyline({
            map: map.value,
            path: [startLoc, endLoc],
            strokeColor: routeColor,
            strokeWeight: 5,
            strokeStyle: 'dashed',
            strokeDasharray: [15, 10],
            lineJoin: 'round',
            zIndex: layerZIndex // 🚨 虚线也保持层级
          })
          resolve(false)
        }
      })
    })
  }

  // 4. 严格建立视觉层级 (Visual Hierarchy)
  // 👉 先画第二段：履约段 (B -> C)，分配较低的 zIndex: 50
  await searchAndDraw(ptB, ptC, '#10b981', 50)

  // 👉 再画第一段：接驾段 (A -> B)，分配最高的 zIndex: 60，强行压在绿线上方！
  await searchAndDraw(ptA, ptB, '#3b82f6', 60)

  // 5. 动画级视野自适应：四周留出 80px 的优美 Padding
  map.value.setFitView(null, false, [80, 80, 80, 80])
}

const startFallbackTimer = () => {
  clearFallbackTimer()
  fallbackCountdown.value = dynamicThreshold.value
  fallbackTimer = setInterval(() => {
    fallbackCountdown.value--
    if (fallbackCountdown.value <= 0) { clearFallbackTimer(); autoTriggerFallback(); }
  }, 1000)
}

const clearFallbackTimer = () => { if (fallbackTimer) clearInterval(fallbackTimer); fallbackCountdown.value = 0 }

const autoTriggerFallback = async () => {
  if (pendingOrder.value && pendingOrder.value.deliveryMethod === 1) {
    try {
      await switchOrderToPickup(pendingOrder.value.orderId)
      pendingOrder.value.deliveryMethod = 2
      ElMessage.warning({ message: '🚨 超时未响应！启动兜底市民自提模式', duration: 5000 })
    } catch (e) {}
  }
}

const handleSwitchToPickup = () => {
  ElMessageBox.confirm('是否转为自提？', '指挥中心干预', { confirmButtonText: '确认', type: 'warning' }).then(async () => {
    try {
      await switchOrderToPickup(pendingOrder.value.orderId)
      pendingOrder.value.deliveryMethod = 2
      clearFallbackTimer()
      ElMessage.success('已切换为自提模式。')
    } catch (e) {}
  })
}

const handleNotifyPickup = () => {
  ElMessageBox.confirm('是否下发提货码？', '确认', { confirmButtonText: '下发', type: 'success' }).then(() => {
    ElMessage.success('居民已收到自提指南。')
    pendingOrder.value = null; result.value = null; map.value.clearMap()
  })
}

const handleBatchGrab = async () => {
  const orderId = pendingOrder.value?.orderId
  if (!orderId) return ElMessage.error('订单状态异常')

  loading.value = true
  try {
    await grabTask(orderId)
    ElNotification.success({
      title: '⚡ 抢单成功',
      message: `单号 ${pendingOrder.value.orderSn} 已被您锁定，请尽快前往取货`,
      type: 'success',
      duration: 6000
    })
    result.value = null
    isMissionActive.value = true
    activeOrder.value = pendingOrder.value
    fetchMapOrders()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '抢单失败，请重试')
  } finally {
    loading.value = false
  }
}

const handleFinishMission = () => {
  isMissionActive.value = false; result.value = null; fetchMapOrders()
}
</script>

<style scoped>
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; overflow: hidden; background: #f1f5f9; }

/* 🚨 锁定屏酷炫样式 */
.lock-screen { position: absolute; inset: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(15px); display: flex; align-items: center; justify-content: center; z-index: 999; }
.lock-panel { text-align: center; background: rgba(255, 255, 255, 0.05); padding: 50px; border-radius: 30px; border: 1px solid rgba(255, 255, 255, 0.1); max-width: 400px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); }
.lock-icon { width: 80px; height: 80px; margin: 0 auto 20px; background: rgba(249, 115, 22, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; border: 2px solid #f97316; animation: float 3s ease-in-out infinite; }
.lock-title { color: #fff; font-size: 1.8rem; font-weight: 900; margin: 0 0 10px; letter-spacing: 2px; }
.lock-desc { color: #94a3b8; font-size: 0.95rem; line-height: 1.6; margin-bottom: 25px; }
.lock-status { display: inline-flex; align-items: center; gap: 10px; color: #f97316; font-weight: bold; background: rgba(249, 115, 22, 0.1); padding: 8px 20px; border-radius: 20px; margin-bottom: 30px; }
.spinner { width: 14px; height: 14px; border: 2px solid #f97316; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; }
.go-profile-btn { background: #3b82f6; color: #fff; border: none; padding: 14px 30px; border-radius: 16px; font-weight: 900; font-size: 1rem; cursor: pointer; transition: 0.3s; box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3); }
.go-profile-btn:hover { background: #2563eb; transform: translateY(-3px); box-shadow: 0 15px 30px rgba(59, 130, 246, 0.4); }

@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

/* 正常界面样式 */
.top-status { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); z-index: 100; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); padding: 10px 24px; border-radius: 30px; font-size: 0.9rem; color: #1e293b; display: flex; align-items: center; gap: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); border: 2px solid #e2e8f0; transition: 0.5s; }
.top-status.emergency-mode { background: #fef2f2; border-color: #ef4444; color: #991b1b; }
.mode-switch-btn { margin-left: 10px; padding: 4px 12px; font-size: 0.75rem; font-weight: bold; color: #fff; background: #3b82f6; border: none; border-radius: 12px; cursor: pointer; transition: 0.3s; }
.mode-switch-btn:hover { background: #2563eb; transform: scale(1.05); }
.emergency-mode .mode-switch-btn { background: #ef4444; }
.pulse-dot { width: 10px; height: 10px; border-radius: 50%; animation: pulse 2s infinite; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
.map-wrapper { flex: 1; position: relative; width: 100%; height: 100%; }
#amap-container { width: 100%; height: 100%; }
.empty-task-panel { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1); z-index: 100; pointer-events: none; }
.empty-task-panel h3 { color: #1e293b; margin: 15px 0 5px 0; font-weight: 800; }
.empty-task-panel p { color: #64748b; font-size: 14px; }
.radar-spinner { width: 50px; height: 50px; border: 4px solid #f1f5f9; border-top-color: #10b981; border-radius: 50%; margin: 0 auto; animation: spin 1s linear infinite; }
.radar-spinner.emergency-spin { border-top-color: #ef4444; animation: spin 0.5s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.map-legend { position: absolute; bottom: 30px; right: 30px; background: #fff; padding: 12px 18px; border-radius: 12px; box-shadow: 0 10px 15px rgba(0, 0, 0, 0.05); font-size: 0.75rem; border: 1px solid #f1f5f9; z-index: 100; }
.legend-item { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; color: #64748b; font-weight: bold; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.sos { background: #ef4444; }
.don { background: #3b82f6; }
.pb { background: #94a3b8; }
.station { background: #f97316; }
</style>

<style>
/* 地图打点样式保持不变 */
.sos-pulse-marker { width: 16px; height: 16px; background: #ef4444; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px rgba(239, 68, 68, 0.6); position: relative; }
.sos-pulse-marker::after { content: ''; position: absolute; top: -5px; left: -5px; width: 20px; height: 20px; border: 2px solid #ef4444; border-radius: 50%; animation: mapPulse 1.5s ease-out infinite; }

.don-pulse-marker { width: 16px; height: 16px; background: #3b82f6; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px rgba(59, 130, 246, 0.6); position: relative; }
.don-pulse-marker::after { content: ''; position: absolute; top: -5px; left: -5px; width: 20px; height: 20px; border: 2px solid #3b82f6; border-radius: 50%; animation: mapPulse 1.5s ease-out infinite; }

.pb-mini-marker { width: 10px; height: 10px; background: #94a3b8; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); }

@keyframes mapPulse { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
.station-mini-marker { width: 28px; height: 28px; background: #fff; border: 3px solid #f97316; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4); color: #f97316; font-weight: bold; }
</style>