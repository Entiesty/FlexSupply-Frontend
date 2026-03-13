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
            <div class="route-point source-box">
              <div class="point-icon source">取</div>
              <div class="point-info">
                <div class="p-name" :title="item.sourceName">{{ item.sourceName || '起点未知' }}</div>
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
            <button v-if="activeTab === 'progress'" class="btn-main finish" @click="openCheckoutDialog(item)">📸 送达核销</button>
          </div>
        </div>
      </transition-group>
    </div>

    <el-drawer v-model="mapDrawerVisible" title="🗺️ 三点一线导航级路径推演" size="45%" @opened="initMapRouting">
      <div class="map-wrapper" v-loading="isMapLoading" element-loading-text="高德引擎路径测算中...">
        <div id="amap-routing-container"></div>
        <div class="map-overlay-panel" v-if="routeEstimate.distance > 0">
          <div class="overlay-item">
            <span class="label">骑行总里程</span>
            <span class="value">{{ routeEstimate.distance }} <small>km</small></span>
          </div>
          <div class="overlay-item">
            <span class="label">预计总耗时</span>
            <span class="value">{{ routeEstimate.time }} <small>min</small></span>
          </div>
        </div>
      </div>
    </el-drawer>

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
import { ElMessage, ElNotification } from 'element-plus'
import { Monitor, Right, MapLocation, UploadFilled, Compass, Location } from '@element-plus/icons-vue'
import { getAvailableOrders, grabTask, getMyTasks, checkOutTask } from '@/api/trade'
import { getUserProfile } from '@/api/user'
import { uploadFile } from '@/api/common' // 🚨 引入真实的通用文件上传接口
import { useRoute } from 'vue-router'
import AMapLoader from '@amap/amap-jsapi-loader'

const route = useRoute()
const activeTab = ref(route.query.tab || 'available')

const currentCredit = ref(0)
const loading = ref(false)
const taskList = ref([])
let pollingTimer = null // 🚨 轮询定时器

const locStatus = reactive({ type: 'none', label: '引擎雷达搜索中...', color: '#94a3b8' })
const currentLocation = reactive({ lon: null, lat: null })

const mapDrawerVisible = ref(false)
const isMapLoading = ref(false)
let currentMapOrder = null
let amapInstance = null
const routeEstimate = reactive({ distance: 0, time: 0 })

const checkoutVisible = ref(false)
const submitLoading = ref(false)
const currentCheckoutOrder = ref(null)
const selectedPhoto = ref(null)
const uploadRef = ref(null)

const isDonation = (sn) => sn?.startsWith('DON-')
const isValidCoordinate = (lon, lat) => lon && lat && !isNaN(lon) && !isNaN(lat) && lon > 0 && lat > 0

// ================= UI 格式化工具 =================
const formatUrgency = (level) => {
  const map = { 1: '🔥 特急(1级)', 2: '🔴 紧急(2级)', 3: '🟠 较高(3级)', 4: '🟡 常规(4级)', 5: '🟢 宽松(5级)' }
  return map[level] || '🟡 常规(5级)'
}

const getMicroTags = (item) => {
  const tags = []
  const name = (item.goodsName || item.requiredCategory || '').toLowerCase()
  if (name.includes('奶') || name.includes('生鲜') || name.includes('菜')) tags.push('🧊 易坏需冷链')
  if (name.includes('药') || name.includes('胰岛素')) tags.push('💊 救命药物')
  if (item.targetName?.includes('老人') || item.targetName?.includes('长者')) tags.push('👵 弱势群体关怀')
  if (item.urgencyLevel === 1 || item.urgencyLevel === 2) tags.push('⚡ 限时速达')
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

// ================= 核心混合定位引擎 =================
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

// ================= 生命周期与轮询引擎 =================
const startLifecycle = () => {
  loadData();
  managePolling();
}

const managePolling = () => {
  if (pollingTimer) clearInterval(pollingTimer)
  // 🚨 只有在抢单大厅才开启心跳轮询
  if (activeTab.value === 'available') {
    pollingTimer = setInterval(() => {
      loadData(true) // 静默加载，不展示全屏 loading
    }, 6000)
  }
}

const switchTab = async (tab) => {
  if (activeTab.value === tab) return
  activeTab.value = tab
  managePolling() // 切换 Tab 时管理轮询
  await loadData()
}

const loadData = async (isSilent = false) => {
  if (!isSilent) loading.value = true
  try {
    let res;
    if (activeTab.value === 'available') {
      // 🚨 核心修复：把硬件级真实 GPS 喂给后端的多因子算法！
      // (字段名 currentLon/currentLat 请确保与你后端 Controller 接收的实体类参数名一致)
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
  if (pollingTimer) clearInterval(pollingTimer) // 防止内存泄漏
})

// ================= 业务操作 =================
const handleGrab = async (item) => {
  try {
    await grabTask(item.orderId)
    ElNotification({ title: '护航指令已确认', message: `单号 ${item.orderSn} 已接入履约序列，请立即启程。`, type: 'success' })
    switchTab('progress') // 抢单成功，自动跳到护送页
  } catch (err) {}
}

const openMapPreview = (item) => {
  currentMapOrder = item; mapDrawerVisible.value = true;
  routeEstimate.distance = 0; routeEstimate.time = 0;
}

// ================= 📸 硬核闭环：物理世界核销 =================
const openCheckoutDialog = (item) => { currentCheckoutOrder.value = item; selectedPhoto.value = null; if (uploadRef.value) uploadRef.value.clearFiles(); checkoutVisible.value = true }
const handlePhotoSelect = (file) => selectedPhoto.value = file

const submitCheckout = async () => {
  if (!selectedPhoto.value) return ElMessage.warning('需要上传现场影像留档，才能完成核销！')
  submitLoading.value = true
  try {
    // 1. 真实上传图片
    const uploadRes = await uploadFile(selectedPhoto.value.raw)
    const realImageUrl = uploadRes.data

    // 2. 带着图片URL去核销
    await checkOutTask({
      taskId: currentCheckoutOrder.value.taskId || currentCheckoutOrder.value.orderId,
      proofImage: realImageUrl // 后端在此归档闭环
    })

    checkoutVisible.value = false
    ElMessage.success('核销闭环完成，现场照片已归档，信誉分已发放！')

    // 刷新数据与状态
    const userRes = await getUserProfile()
    if(userRes?.data) currentCredit.value = userRes.data.creditScore || 0
    loadData()
  } catch (err) { console.error('核销失败', err) }
  finally { submitLoading.value = false }
}

// ================= 🗺️ 导航级三点一线推演引擎 =================
const initMapRouting = () => {
  isMapLoading.value = true
  nextTick(async () => {
    window._AMapSecurityConfig = { securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE }

    try {
      const AMap = await AMapLoader.load({ key: import.meta.env.VITE_AMAP_KEY, version: '2.0', plugins: ['AMap.Riding'] })
      if (amapInstance) amapInstance.destroy()

      amapInstance = new AMap.Map('amap-routing-container', { zoom: 14, center: [currentMapOrder.sourceLon, currentMapOrder.sourceLat], mapStyle: 'amap://styles/fresh' })

      const ptA = (currentLocation.lon && currentLocation.lat) ? new AMap.LngLat(currentLocation.lon, currentLocation.lat) : null;
      const ptB = new AMap.LngLat(currentMapOrder.sourceLon, currentMapOrder.sourceLat);
      const ptC = new AMap.LngLat(currentMapOrder.targetLon, currentMapOrder.targetLat);

      if (ptA) new AMap.Marker({ map: amapInstance, position: ptA, content: '<div style="background:#3b82f6; width:16px; height:16px; border:3px solid #fff; border-radius:50%; box-shadow:0 0 10px rgba(59,130,246,0.6)"></div>', offset: new AMap.Pixel(-8, -8), zIndex: 110, title: '我的位置' });
      new AMap.Marker({ map: amapInstance, position: ptB, content: '<div style="background:#f97316; width:16px; height:16px; border:3px solid #fff; border-radius:50%; box-shadow:0 0 10px rgba(249,115,22,0.6)"></div>', offset: new AMap.Pixel(-8, -8), zIndex: 100, title: '取货源点' });
      new AMap.Marker({ map: amapInstance, position: ptC, content: '<div style="background:#10b981; width:22px; height:22px; border:2px solid #fff; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px; font-weight:bold; box-shadow:0 0 10px rgba(16,185,129,0.6)">终</div>', offset: new AMap.Pixel(-11, -11), zIndex: 100, title: '送达终点' });

      const riding = new AMap.Riding({ map: null, policy: 0 })

      const searchAndDraw = (startLoc, endLoc, routeColor, layerZIndex) => {
        return new Promise((resolve) => {
          riding.search(startLoc, endLoc, (status, result) => {
            if (status === 'complete' && result.routes && result.routes.length > 0) {
              const route = result.routes[0]
              let path = route.rides.flatMap(ride => ride.path)
              new AMap.Polyline({ map: amapInstance, path: path, strokeColor: routeColor, strokeWeight: 7, strokeOpacity: 0.9, lineJoin: 'round', lineCap: 'round', showDir: true, dirColor: '#ffffff', isOutline: true, outlineColor: '#ffffff', borderWeight: 2, zIndex: layerZIndex })
              resolve({ dist: route.distance / 1000, time: route.time / 60 })
            } else {
              const straightDist = startLoc.distance(endLoc) / 1000;
              new AMap.Polyline({ map: amapInstance, path: [startLoc, endLoc], strokeColor: routeColor, strokeWeight: 5, strokeStyle: 'dashed', strokeDasharray: [15, 10], lineJoin: 'round', zIndex: layerZIndex })
              resolve({ dist: straightDist, time: (straightDist / 15) * 60 })
            }
          })
        })
      }

      routeEstimate.distance = 0; routeEstimate.time = 0;

      if (ptA) {
        const res2 = await searchAndDraw(ptB, ptC, '#10b981', 50)
        const res1 = await searchAndDraw(ptA, ptB, '#3b82f6', 60)
        routeEstimate.distance = (res1.dist + res2.dist).toFixed(2)
        routeEstimate.time = Math.ceil(res1.time + res2.time)
      } else {
        const res = await searchAndDraw(ptB, ptC, '#10b981', 50)
        routeEstimate.distance = res.dist.toFixed(2)
        routeEstimate.time = Math.ceil(res.time)
      }

      amapInstance.setFitView(null, false, [60, 60, 60, 60])
    } catch (e) { ElMessage.error('高德引擎渲染失败') }
    finally { isMapLoading.value = false }
  })
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

/* 列表动画 */
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
.urgency-1 { color: #b91c1c; background: #fef2f2; border-color: #fca5a5; }
.urgency-2 { color: #c2410c; background: #fff7ed; border-color: #fdba74; }
.urgency-3 { color: #d97706; background: #fef3c7; border-color: #fde68a; }
.urgency-4 { color: #4d7c0f; background: #ecfccb; border-color: #bef264; }
.urgency-5 { color: #047857; background: #d1fae5; border-color: #6ee7b7; }

.order-sn { font-family: monospace; font-size: 14px; color: #475569; font-weight: 900; }
.time-info { font-size: 12px; color: #94a3b8; font-weight: bold;}

.micro-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px;}
.m-tag { background: #f1f5f9; color: #475569; font-size: 11px; padding: 3px 6px; border-radius: 4px; font-weight: bold;}

/* 算分 UI */
.algorithm-info { display: flex; flex-direction: column; font-size: 12px; font-family: monospace; font-weight: bold; color: #64748b; background: #f8fafc; padding: 8px 10px; border-radius: 8px; margin-top: auto;}
.algo-row { display: flex; align-items: center; gap: 8px;}
.divider { color: #cbd5e1; }

.col-route { flex: 1; display: flex; align-items: center; padding: 0 30px; gap: 20px; overflow: hidden; }
.route-point { display: flex; align-items: flex-start; gap: 14px; overflow: hidden; }
.route-point.source-box { flex: 0.7; }
.route-point.target-box { flex: 1.3; }
.point-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 16px; font-weight: 900; color: white; flex-shrink: 0; box-shadow: inset 0 -3px 0 rgba(0,0,0,0.15); }
.point-icon.source { background: #f97316; }
.point-icon.target { background: #10b981; }
.point-info { display: flex; flex-direction: column; gap: 6px; overflow: hidden; width: 100%; }
.p-name { font-size: 16px; font-weight: 900; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.p-address { font-size: 14px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }

.route-connection { display: flex; align-items: center; color: #94a3b8; width: 60px; flex-shrink: 0; }
.route-connection .line { flex: 1; height: 3px; background: repeating-linear-gradient(to right, #cbd5e1 0, #cbd5e1 6px, transparent 6px, transparent 12px); }

/* ================= 物资清单小票 UI ================= */
.col-goods { width: 240px; flex-shrink: 0; padding: 0 20px; border-left: 2px dashed #f1f5f9; display: flex; flex-direction: column; justify-content: center; }

.goods-receipt { background: linear-gradient(to bottom, #f8fafc, #ffffff); border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; height: 100%; box-sizing: border-box; box-shadow: inset 0 2px 4px rgba(0,0,0,0.01); }

.receipt-header { display: flex; align-items: center; gap: 6px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; margin-bottom: 8px; }
.receipt-header .r-icon { font-size: 14px; }
.receipt-header .r-title { font-size: 12px; font-weight: 900; color: #64748b; letter-spacing: 1px; }

.receipt-body { flex: 1; display: flex; align-items: flex-start; overflow: hidden; }
.r-main-item { display: flex; justify-content: space-between; align-items: flex-start; width: 100%; gap: 10px; }
/* 支持多行文本溢出隐藏，名字再长也能优雅换行展示 */
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
.btn-main.finish { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 6px 15px rgba(16, 185, 129, 0.3); }
.btn-main.finish:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4); }

.map-wrapper { width: 100%; height: 100%; position: relative; }
#amap-routing-container { width: 100%; height: 100%; }
.map-overlay-panel { position: absolute; top: 20px; left: 20px; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); padding: 15px 25px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display: flex; gap: 20px; border: 1px solid #e2e8f0; z-index: 100; }
.overlay-item { display: flex; flex-direction: column; }
.overlay-item .label { font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 4px; }
.overlay-item .value { font-size: 24px; font-weight: 900; color: #0f172a; }
.upload-zone { text-align: center; }
.upload-tip { color: #64748b; font-size: 14px; margin-bottom: 16px; }
</style>