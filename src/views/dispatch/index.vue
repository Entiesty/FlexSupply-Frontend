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
        <span class="pulse-dot" :style="{ background: sysMode === 'NORMAL' ? '#10b981' : '#ef4444' }"></span>
        当前运行模式: <strong>{{ MODE_LABELS[sysMode] || '🟢 常态模式调度' }}</strong>
        <button v-if="currentUserRole === 4" class="mode-switch-btn" @click="toggleSysMode">
          切换至{{ sysMode === 'NORMAL' ? '🔴 应急模式' : '🟢 常态模式' }}
        </button>
      </div>

      <div class="map-wrapper">
        <div v-if="!isLbsReady" class="map-loading-overlay">
          <div class="radar-spinner"></div>
          <h3>📍 正在加载调度地图...</h3>
          <p>加载厦门集美区地图数据...</p>
        </div>

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
import { switchMode, getCurrentConfig } from '@/api/config'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
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
const mapInitialized = ref(false)

// ================= 调度核心状态 =================
const loading = ref(false)
const result = ref(null)
const isError = ref(false)
const isMissionActive = ref(false)
const activeOrder = ref({})
const pendingOrder = ref(null)
const autoDispatchedOrderId = ref(null)

const lastSeenOrderId = ref(null)
let herdCheckTimer = null
const fallbackCountdown = ref(0)
const dynamicThreshold = ref(30)
let pollingTimer = null
let fallbackTimer = null

const userLocation = ref([118.092000, 24.623500])
const isLbsReady = ref(false)

// 厦门集美区安全坐标范围
const JIMEI_BOUNDS = { minLng: 117.00, maxLng: 119.00, minLat: 23.00, maxLat: 26.00 }
const GEO_FALLBACK = [118.092000, 24.623500]

const isValidCoord = (lng, lat) => {
  if (lng == null || lat == null || lng === '' || lat === '') return false
  const numLng = Number(lng)
  const numLat = Number(lat)
  if (isNaN(numLng) || isNaN(numLat)) return false
  if (!isFinite(numLng) || !isFinite(numLat)) return false
  return true
}

const safeCoord = (lng, lat, fallbackLng, fallbackLat) => {
  if (isValidCoord(lng, lat)) return [lng, lat]
  const fl = isValidCoord(fallbackLng, fallbackLat) ? fallbackLng : GEO_FALLBACK[0]
  const fa = isValidCoord(fallbackLng, fallbackLat) ? fallbackLat : GEO_FALLBACK[1]
  return [fl, fa]
}

const calcSafeCenter = () => {
  const lng = userLocation.value[0]
  const lat = userLocation.value[1]
  if (isValidCoord(lng, lat)) return [lng, lat]
  console.warn('userLocation 含有非法坐标，降级至默认中心')
  userLocation.value = [...GEO_FALLBACK]
  return GEO_FALLBACK
}

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

  // 监听审核状态变更 — 审核通过后实时解锁大屏并初始化地图
  window.addEventListener('audit-status-changed', (e) => {
    if (e.detail?.isVerified !== undefined) {
      isVerified.value = e.detail.isVerified
      if (e.detail.isVerified && !mapInitialized.value) {
        mapInitialized.value = true
        userLocation.value = isValidCoord(dbLon, dbLat) ? [dbLon, dbLat] : [...GEO_FALLBACK]
        proceedInit()
      }
    }
  })

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
            if (!isValidCoord(realLon, realLat) || Math.abs(realLon - 118.1) > 5 || Math.abs(realLat - 24.6) > 5) {
              console.warn('大屏检测到异地登录或GPS异常，开启地图保护，降级使用档案坐标');
              userLocation.value = isValidCoord(dbLon, dbLat) ? [dbLon, dbLat] : [...GEO_FALLBACK];
              ElMessage.warning('GPS异常，大屏已锁定至测试区域');
            } else {
              userLocation.value = [realLon, realLat];
              ElMessage.success('📍 大屏已接入实时 GPS 信号');
            }
            proceedInit(); // 拿到坐标后再初始化大盘
          },
          (err) => {
            console.warn('大屏 GPS 被拒或超时，使用静态坐标');
            userLocation.value = isValidCoord(dbLon, dbLat) ? [dbLon, dbLat] : [...GEO_FALLBACK];
            proceedInit();
          },
          { timeout: 5000, enableHighAccuracy: true }
      )
    }
    // 🏢 如果是指挥中心 (Role 4) 或不支持 GPS，直接用静态中心点
    else {
      userLocation.value = isValidCoord(dbLon, dbLat) ? [dbLon, dbLat] : [...GEO_FALLBACK];
      proceedInit();
    }
  }
})

// 💡 抽离出的初始化执行管线 (等待坐标就绪后执行)
const proceedInit = () => {
  mapInitialized.value = true
  // 🛡️ 最终防线：原子性确保 userLocation 合法
  if (!isValidCoord(userLocation.value[0], userLocation.value[1])) {
    console.warn('proceedInit 检测到非法 userLocation，强制写入默认中心')
    userLocation.value = [...GEO_FALLBACK]
  }

  // 🗺️ 高德地图容器常驻 DOM，直接初始化即可读取到正确物理尺寸
  initMap()

  // 🚦 map 创建成功后揭开遮罩（在 initMap 的 then 回调中设置）
  // 这里先标记为 ready，initMap 失败时会回写 false

  // 加载当前系统模式 (后端状态机)
  getCurrentConfig().then(res => {
    if (res?.data?.sysMode) sysMode.value = res.data.sysMode
  }).catch(() => {})

  // 监听全局模式切换, 大屏实时联动 — 清空旧模式脏数据并重新拉取
  window.addEventListener('mode-changed', handleModeChange)
  // 限制 3：惊群效应安抚 — 监听订单被抢事件（带防抖，避免 WebSocket 消息洪峰刷屏）
  window.addEventListener('refresh-orders', () => {
    if (pendingOrder.value?.orderId) {
      lastSeenOrderId.value = pendingOrder.value.orderId
    }
    // 正在执行任务或抢单中 → 清掉残留 tracking，防止任务完成后误判弹窗
    if (isMissionActive.value || loading.value) {
      lastSeenOrderId.value = null
    }
    // 300ms 防抖：短时间内的多次 refresh-orders 只执行最后一次
    if (herdCheckTimer) clearTimeout(herdCheckTimer)
    herdCheckTimer = setTimeout(async () => {
      await fetchMapOrders()
      if (lastSeenOrderId.value && !pendingOrder.value?.orderId && !isMissionActive.value) {
        // ElMessage.info('⚡ 慢了一步，该紧急指令已被其他护航者接管，感谢您的响应！')
        if (map.value) map.value.clearMap()
        lastSeenOrderId.value = null
      }
    }, 300)
  })

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

// 模式切换统一处理函数（WebSocket 事件驱动，保证单一数据源）
const handleModeChange = (e) => {
  if (e.detail?.mode && sysMode.value !== e.detail.mode) {
    sysMode.value = e.detail.mode
    // 1. 彻底清空旧模式残留的所有测算数据和弹窗
    pendingOrder.value = null
    result.value = null
    autoDispatchedOrderId.value = null
    if (map.value) map.value.clearMap()
    // 2. 立即拉取新模式下的全城态势
    fetchMapOrders()
    ElMessage.warning(`系统已切换为 ${e.detail.mode === 'EMERGENCY' ? '应急模式' : '常态模式'}，地图已重置。`)
  }
}

onUnmounted(() => {
  if (map.value) map.value.destroy()
  if (pollingTimer) clearInterval(pollingTimer)
  clearFallbackTimer()
  window.removeEventListener('mode-changed', handleModeChange)
})

const MODE_LABELS = {
  NORMAL: '🟢 常态模式调度',
  EMERGENCY: '🔴 应急模式调度'
}

const MODE_NEXT = {
  NORMAL: 'EMERGENCY',
  EMERGENCY: 'NORMAL'
}

// 🚨 终极修复：发起者“先斩后奏”，绝不干等极其容易断连的 WebSocket！
const toggleSysMode = async () => {
  const target = MODE_NEXT[sysMode.value]
  if (!target) return

  try {
    // 1. 发送 API 请求，更新后台数据库
    await switchMode({ targetMode: target })

    // 2. 🔥 API 一旦成功，本地立刻强行更新状态！不再等 WebSocket！
    sysMode.value = target

    // 3. 彻底清空旧模式的大盘残留数据 (毁尸灭迹)
    pendingOrder.value = null
    result.value = null
    autoDispatchedOrderId.value = null
    if (map.value) map.value.clearMap()

    // 4. 重新拉取新模式下的全城态势
    await fetchMapOrders()

    ElMessage.success({ message: `系统已强制切换至: ${MODE_LABELS[target]}，地图已重置`, duration: 3000 })
  } catch (e) {
    ElMessage.error(e?.message || '模式切换失败，请检查权限或状态机规则')
  }
}

const fetchMapOrders = async () => {
  try {
    const [safeLng, safeLat] = calcSafeCenter()
    const res = await getPendingOrders({
      currentLon: safeLng,
      currentLat: safeLat
    })
    if (res?.data && res.data.length > 0) {
      const mainOrder = res.data[0]

      // 新订单到来时清除上次的测算结果
      if (pendingOrder.value?.orderId !== mainOrder.orderId) {
        result.value = null
        autoDispatchedOrderId.value = null
      }
      pendingOrder.value = mainOrder

      const mainTgtLat = isValidCoord(mainOrder.targetLon, mainOrder.targetLat) ? mainOrder.targetLat : safeLat
      const mainTgtLon = isValidCoord(mainOrder.targetLon, mainOrder.targetLat) ? mainOrder.targetLon : safeLng

      const isDonation = mainOrder.orderType === 1

      drawMarker(isDonation, [mainTgtLon, mainTgtLat])

      // 已绑定取货源：只要有有效坐标就走直达通道，不再依赖 sourceName 关键词
      const hasValidSource = pendingOrder.value.sourceId != null
          && isValidCoord(pendingOrder.value.sourceLon, pendingOrder.value.sourceLat)

      if (currentUserRole.value === 3
          && pendingOrder.value.deliveryMethod === 1
          && !result.value) {

        autoDispatchedOrderId.value = pendingOrder.value.orderId

        if (isDonation) {
          handleDonationDispatch([mainTgtLon, mainTgtLat])
        } else if (hasValidSource) {
          handleP2PDispatch([mainTgtLon, mainTgtLat])
        } else {
          await handleSmartDispatch([mainTgtLon, mainTgtLat])
        }
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
    const center = calcSafeCenter()
    // 深拷贝 + Number 强转：彻底切断 Vue Proxy 与任何非数字引用
    const safeCenter = [Number(center[0]), Number(center[1])]
    if (!isValidCoord(safeCenter[0], safeCenter[1])) {
      console.error('地图中心坐标二次校验失败，写入硬编码降级值')
      safeCenter[0] = GEO_FALLBACK[0]
      safeCenter[1] = GEO_FALLBACK[1]
    }
    // 🎯 极简初始化：去掉 3D/viewMode/mapStyle 等可能因 WebGL/Key 等级产生内部 NaN 的选项
    try {
      map.value = new AMap.Map('amap-container', {
        zoom: 15,
        center: safeCenter
      })
      isLbsReady.value = true
      console.log('🗺️ 高德地图实例已安全创建，中心:', safeCenter)
    } catch (e) {
      console.error('AMap.Map 构造失败，最终降级:', e)
      map.value = null
      isLbsReady.value = false
    }
  }).catch(e => {
    console.error('AMapLoader 加载失败', e)
    ElMessage.error('地图引擎加载异常')
    isLbsReady.value = false
  })
}

const drawMarker = (isDonation, position) => {
  if (!AMap || !map.value) return
  if (!isValidCoord(position[0], position[1])) {
    console.warn('drawMarker 收到非法坐标，已降级')
    return
  }
  map.value.clearMap()
  map.value.setCenter(position)

  const markerClass = isDonation ? 'don-pulse-marker' : 'sos-pulse-marker'
  new AMap.Marker({
    map: map.value, position: position, content: `<div class="${markerClass}"></div>`, offset: new AMap.Pixel(-8, -8)
  })
}

const handleDispatchAction = async () => {
  const [safeLng, safeLat] = calcSafeCenter()
  const isDonation = pendingOrder.value.orderType === 1
  const hasValidSource = pendingOrder.value.sourceId != null
      && isValidCoord(pendingOrder.value.sourceLon, pendingOrder.value.sourceLat)
  const lng = isValidCoord(pendingOrder.value.targetLon, pendingOrder.value.targetLat) ? pendingOrder.value.targetLon : safeLng
  const lat = isValidCoord(pendingOrder.value.targetLon, pendingOrder.value.targetLat) ? pendingOrder.value.targetLat : safeLat
  if (isDonation) handleDonationDispatch([lng, lat])
  else if (hasValidSource) handleP2PDispatch([lng, lat])
  else await handleSmartDispatch([lng, lat])
}

const handleDonationDispatch = (targetPos) => {
  loading.value = true
  setTimeout(() => {
    const [safeLng, safeLat] = calcSafeCenter()
    const srcLng = isValidCoord(pendingOrder.value.sourceLon, pendingOrder.value.sourceLat) ? pendingOrder.value.sourceLon : safeLng
    const srcLat = isValidCoord(pendingOrder.value.sourceLon, pendingOrder.value.sourceLat) ? pendingOrder.value.sourceLat : safeLat

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

// P2P 已响应订单：跳过 SAW 驿站匹配，直接用商家坐标绘制三点接驾路线
const handleP2PDispatch = (targetPos) => {
  loading.value = true
  setTimeout(() => {
    const [safeLng, safeLat] = calcSafeCenter()
    const srcLng = isValidCoord(pendingOrder.value.sourceLon, pendingOrder.value.sourceLat)
      ? pendingOrder.value.sourceLon : safeLng
    const srcLat = isValidCoord(pendingOrder.value.sourceLon, pendingOrder.value.sourceLat)
      ? pendingOrder.value.sourceLat : safeLat

    result.value = {
      station: {
        longitude: srcLng,
        latitude: srcLat,
        stationName: pendingOrder.value.sourceName || '🚨 爱心商铺取货点'
      },
      orderSn: pendingOrder.value.orderSn,
      requiredCategory: pendingOrder.value.goodsName || pendingOrder.value.requiredCategory || '应急物资',
      urgencyLevel: pendingOrder.value.urgencyLevel || 8
    }

    drawRoute(result.value, targetPos, false)
    loading.value = false
    ElMessage.success('✅ 取货源已确认，跳过驿站匹配，请立即前往取货！')
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
      ElMessage.info(`测算完毕：附近暂无满足 [${safeCategory}] 的驿站物资（将尝试商家募捐）`)
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
  if (!isValidCoord(targetPos[0], targetPos[1])) {
    console.warn('drawRoute 收到非法 targetPos, 已取消渲染')
    return
  }

  const [safeLng, safeLat] = calcSafeCenter()

  // 取 station 坐标，非法则用安全中心
  const staLng = isValidCoord(data?.station?.longitude, data?.station?.latitude) ? data.station.longitude : safeLng
  const staLat = isValidCoord(data?.station?.longitude, data?.station?.latitude) ? data.station.latitude : safeLat
  const stationLoc = [staLng, staLat]
  map.value.clearMap()

  // 1. 定义三个关键物理坐标点
  const ptA = new AMap.LngLat(safeLng, safeLat) // A: 志愿者/指挥中心位置
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
      // 🛡️ 防卫：起终点 LngLat 对象非空且坐标合法
      if (!startLoc || !endLoc ||
          !isValidCoord(startLoc.lng, startLoc.lat) ||
          !isValidCoord(endLoc.lng, endLoc.lat)) {
        console.warn('searchAndDraw 收到非法起终点，已跳过')
        resolve(false)
        return
      }
      riding.search(startLoc, endLoc, (status, result) => {
        if (status === 'complete' && result.routes && result.routes.length > 0) {
          let path = []
          result.routes[0].rides.forEach(ride => {
            path = path.concat(ride.path)
          })
          // 🛡️ 过滤掉路径中的 NaN 点
          path = path.filter(p => p && isValidCoord(p.lng, p.lat))
          if (path.length === 0) {
            console.warn('骑行路线路径全为非法坐标，降级为直线')
            path = [startLoc, endLoc]
          }

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
            zIndex: layerZIndex
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
            zIndex: layerZIndex
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
  try { map.value.setFitView(null, false, [80, 80, 80, 80]) } catch (e) { console.warn('setFitView 异常', e) }
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
  // 🚨 在 await 之前立起保护屏障，防止 refresh-orders 的 debounce 定时器在 await 间隙误判"慢了一步"
  isMissionActive.value = true
  try {
    await grabTask(orderId)
    // 先捕获快照，再清空大屏，防止 fetchMapOrders 因 MQ 延迟把同一单拉回来
    const grabbedSnap = { ...pendingOrder.value }
    activeOrder.value = grabbedSnap
    pendingOrder.value = null
    result.value = null
    localStorage.setItem('riderStatus', 'BUSY')
    if (map.value) map.value.clearMap()
    ElNotification.success({
      title: '⚡ 抢单成功',
      message: `单号 ${grabbedSnap.orderSn} 已被您锁定，请尽快前往取货`,
      type: 'success',
      duration: 6000
    })
  } catch (e) {
    // 抢单失败回滚：释放保护屏障，允许继续轮询
    isMissionActive.value = false
    const errMsg = e.response?.data?.message || e.message || '抢单失败，请重试'
    ElMessage.error(errMsg)
  } finally {
    loading.value = false
  }
}

const handleFinishMission = () => {
  isMissionActive.value = false; result.value = null
  localStorage.setItem('riderStatus', 'IDLE')
  fetchMapOrders()
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
.map-loading-overlay { position: absolute; inset: 0; z-index: 999; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f1f5f9; color: #64748b; }
.map-loading-overlay h3 { margin-top: 20px; color: #1e293b; font-weight: 800; }
.map-loading-overlay p { font-size: 14px; margin-top: 8px; }
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