<template>
  <div class="workspace-container">
    <div class="page-header">
      <div class="header-left">
        <div class="icon-wrapper"><el-icon><Monitor /></el-icon></div>
        <div>
          <h1 class="page-title">运力调度工作台</h1>
          <p class="page-subtitle">城市微光指挥中心 - 实时护航序列监控</p>
        </div>
      </div>
      <div class="header-right">
        <div class="credit-badge">
          <span class="label">当前护航信誉分</span>
          <span class="value">100 <span class="unit">分</span></span>
        </div>
      </div>
    </div>

    <div class="segmented-control">
      <div class="segment-btn" :class="{ active: activeTab === 'available' }" @click="switchTab('available')">
        <span class="dot" v-if="activeTab === 'available'"></span> 抢单大厅
      </div>
      <div class="segment-btn" :class="{ active: activeTab === 'progress' }" @click="switchTab('progress')">
        <span class="dot" v-if="activeTab === 'progress'"></span> 正在护送
      </div>
      <div class="segment-btn" :class="{ active: activeTab === 'history' }" @click="switchTab('history')">
        <span class="dot" v-if="activeTab === 'history'"></span> 历史档案
      </div>
    </div>

    <div class="task-list-wrapper"
         v-loading="loading"
         element-loading-text="调度引擎数据同步中..."
         element-loading-background="rgba(248, 250, 252, 0.75)">

      <div v-if="!loading && taskList.length === 0" class="empty-status">
        <el-icon class="empty-icon"><Compass /></el-icon>
        <h3>当前频段暂无任务数据</h3>
      </div>

      <div class="task-row" v-for="item in taskList" :key="item.orderId || item.taskId">

        <div class="col-meta">
          <div class="type-badge" :class="isDonation(item.orderSn) ? 'bg-blue' : 'bg-red'">
            {{ isDonation(item.orderSn) ? '🔵 捐赠集货' : '🔴 紧急求助' }}
          </div>
          <div class="order-sn">{{ item.orderSn }}</div>
          <div class="urgency" v-if="item.urgencyLevel">紧急度 {{ item.urgencyLevel }}</div>
        </div>

        <div class="col-route">
          <div class="route-point">
            <div class="point-icon source">取</div>
            <div class="point-info">
              <div class="p-name" :title="item.sourceName">{{ item.sourceName || '起点未知' }}</div>
              <div class="p-address" :title="item.sourceAddress">{{ item.sourceAddress || '地址未录入' }}</div>
            </div>
          </div>

          <div class="route-connection">
            <div class="line"></div>
            <el-icon class="arrow"><Right /></el-icon>
          </div>

          <div class="route-point">
            <div class="point-icon target">送</div>
            <div class="point-info">
              <div class="p-name" :title="item.targetName">{{ item.targetName || '终点未知' }}</div>
              <div class="p-address" :title="item.targetAddress">{{ item.targetAddress || '地址未录入' }}</div>
            </div>
          </div>
        </div>

        <div class="col-goods">
          <div class="goods-box">
            <span class="g-name" :title="item.goodsName || item.requiredCategory">
              {{ item.goodsName || item.requiredCategory || '未知物资' }}
            </span>
            <span class="g-count">x <strong>{{ item.goodsCount || 0 }}</strong></span>
          </div>
        </div>

        <div class="col-actions">
          <button class="btn-tool" @click="openMapPreview(item)" :disabled="!isValidCoordinate(item.sourceLon, item.sourceLat) || !isValidCoordinate(item.targetLon, item.targetLat)">
            <el-icon><MapLocation /></el-icon> 路线推演
          </button>

          <button v-if="activeTab === 'available'" class="btn-main grab" @click="handleGrab(item)">
            立即响应
          </button>

          <button v-if="activeTab === 'progress'" class="btn-main finish" @click="openCheckoutDialog(item)">
            送达核销
          </button>
        </div>
      </div>
    </div>

    <el-drawer v-model="mapDrawerVisible" title="🗺️ 任务路径推演" size="40%" @opened="initMapRouting">
      <div class="map-wrapper">
        <div id="amap-routing-container"></div>
        <div class="map-overlay-panel" v-if="routeEstimate.distance">
          <div class="overlay-item">
            <span class="label">测算距离</span>
            <span class="value">{{ routeEstimate.distance }} <small>km</small></span>
          </div>
          <div class="overlay-item">
            <span class="label">预计耗时</span>
            <span class="value">{{ routeEstimate.time }} <small>min</small></span>
          </div>
        </div>
      </div>
    </el-drawer>

    <el-dialog v-model="checkoutVisible" title="🛡️ 护航履约确认" width="400px">
      <div class="upload-zone">
        <p class="upload-tip">请上传物资交接现场照片，完成闭环。</p>
        <el-upload class="custom-uploader" drag action="#" :auto-upload="false" :on-change="handlePhotoSelect">
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">拖拽图片或 <em>点击上传</em></div>
        </el-upload>
      </div>
      <template #footer>
        <el-button @click="checkoutVisible = false">取消</el-button>
        <el-button type="success" @click="submitCheckout" :loading="submitLoading">提交核销</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { Monitor, Right, MapLocation, UploadFilled, Compass, Van, Bicycle } from '@element-plus/icons-vue'
import { getAvailableOrders, grabTask, getMyTasks, checkOutTask } from '@/api/trade'
// 🚨 核心修复 1：引入高德动态加载器
import AMapLoader from '@amap/amap-jsapi-loader'

const activeTab = ref('available')
const loading = ref(false)
const taskList = ref([])

const mapDrawerVisible = ref(false)
let currentMapOrder = null
let amapInstance = null
const routeEstimate = reactive({ distance: 0, time: 0 })

const checkoutVisible = ref(false)
const submitLoading = ref(false)
const currentCheckoutOrder = ref(null)
const selectedPhoto = ref(null)

const isDonation = (sn) => sn?.startsWith('DON-')

const isValidCoordinate = (lon, lat) => {
  return lon && lat && !isNaN(lon) && !isNaN(lat) && lon > 0 && lat > 0
}

const switchTab = async (tab) => {
  if (activeTab.value === tab) return
  activeTab.value = tab
  await loadData()
}

const loadData = async () => {
  loading.value = true
  try {
    let res;
    if (activeTab.value === 'available') {
      res = await getAvailableOrders()
    } else {
      const backendStatus = activeTab.value === 'progress' ? 1 : 3
      res = await getMyTasks({ status: backendStatus })
    }

    if (res.data && Array.isArray(res.data.records)) {
      taskList.value = res.data.records
    } else {
      taskList.value = []
    }
  } catch (error) {
    console.error('获取任务异常:', error)
    taskList.value = []
  } finally {
    loading.value = false
  }
}

const handleGrab = async (item) => {
  try {
    await grabTask(item.orderId)
    ElNotification({ title: '指令已确认', message: `单号 ${item.orderSn} 已接入序列。`, type: 'success' })
    loadData()
  } catch (err) {}
}

const openMapPreview = (item) => {
  if (!isValidCoordinate(item.sourceLon, item.sourceLat) || !isValidCoordinate(item.targetLon, item.targetLat)) {
    ElMessage.warning('订单坐标数据不完整，高德引擎无法推演路线')
    return
  }
  currentMapOrder = item
  mapDrawerVisible.value = true
  routeEstimate.distance = 0; routeEstimate.time = 0;
}

// 🚨 核心修复 2：完全对齐 index.vue 的高德加载逻辑
const initMapRouting = () => {
  nextTick(() => {
    // 注入安全密钥
    window._AMapSecurityConfig = {
      securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE,
    }

    AMapLoader.load({
      key: import.meta.env.VITE_AMAP_KEY,
      version: '2.0',
      plugins: ['AMap.Riding']
    }).then((AMap) => {
      if (amapInstance) {
        amapInstance.destroy()
      }

      amapInstance = new AMap.Map('amap-routing-container', {
        zoom: 14,
        center: [currentMapOrder.sourceLon, currentMapOrder.sourceLat],
        mapStyle: 'amap://styles/fresh'
      })

      const ridingService = new AMap.Riding({ map: amapInstance, hideMarkers: false })
      const start = new AMap.LngLat(currentMapOrder.sourceLon, currentMapOrder.sourceLat)
      const end = new AMap.LngLat(currentMapOrder.targetLon, currentMapOrder.targetLat)

      ridingService.search(start, end, (status, result) => {
        if (status === 'complete' && result.routes && result.routes.length) {
          const route = result.routes[0]
          routeEstimate.distance = (route.distance / 1000).toFixed(2)
          routeEstimate.time = Math.ceil(route.time / 60)
        } else {
          ElMessage.warning('高德测算异常：距离可能过远或跨海')
        }
      })
    }).catch(e => {
      console.error("高德地图加载失败", e)
      ElMessage.error('地图组件初始化失败，请检查 Key 或网络')
    })
  })
}

const openCheckoutDialog = (item) => {
  currentCheckoutOrder.value = item
  selectedPhoto.value = null
  checkoutVisible.value = true
}

const handlePhotoSelect = (file) => selectedPhoto.value = file

const submitCheckout = async () => {
  if (!selectedPhoto.value) return ElMessage.warning('需要现场影像留档')
  submitLoading.value = true
  try {
    if (!currentCheckoutOrder.value.taskId) return ElMessage.error('任务追溯码丢失')
    await checkOutTask(currentCheckoutOrder.value.taskId)
    checkoutVisible.value = false
    ElMessage.success('核销闭环完成，信誉分已发放！')
    loadData()
  } catch (err) {
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => loadData())
</script>

<style scoped>
/* ================= 宽屏基础容器 ================= */
.workspace-container {
  min-height: calc(100vh - 60px);
  background: #f8fafc;
  padding: 32px 40px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  box-sizing: border-box;
}

/* ================= 顶部 Header ================= */
.page-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;
}
.header-left { display: flex; align-items: center; gap: 16px; }
.icon-wrapper { width: 48px; height: 48px; background: #3b82f6; color: white; border-radius: 12px; display: flex; justify-content: center; align-items: center; font-size: 24px; box-shadow: 0 8px 16px rgba(59, 130, 246, 0.25); }
.page-title { font-size: 22px; font-weight: 900; color: #0f172a; margin: 0 0 4px; letter-spacing: 0.5px; }
.page-subtitle { font-size: 14px; color: #64748b; margin: 0; }

.credit-badge { display: flex; flex-direction: column; align-items: flex-end; background: white; padding: 10px 24px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.02); }
.credit-badge .label { font-size: 12px; color: #64748b; font-weight: bold; }
.credit-badge .value { font-size: 26px; font-weight: 900; color: #f59e0b; line-height: 1; margin-top: 6px; }
.credit-badge .unit { font-size: 14px; font-weight: normal; color: #94a3b8; }

/* ================= 分段控制器 Tabs ================= */
.segmented-control { display: inline-flex; background: #e2e8f0; padding: 4px; border-radius: 12px; margin-bottom: 24px; }
.segment-btn { padding: 10px 24px; font-size: 15px; font-weight: bold; color: #475569; border-radius: 8px; cursor: pointer; transition: 0.3s; display: flex; align-items: center; gap: 8px; user-select: none; }
.segment-btn:hover { color: #2563eb; }
.segment-btn.active { background: white; color: #0f172a; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.segment-btn .dot { width: 6px; height: 6px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 6px rgba(59, 130, 246, 0.6); }

/* ================= 核心：横向列表设计 ================= */
.task-list-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 400px;
  border-radius: 16px;
}

.empty-status { padding: 80px 0; text-align: center; color: #94a3b8; }
.empty-icon { font-size: 54px; margin-bottom: 16px; color: #cbd5e1; }
.empty-status h3 { color: #334155; font-size: 18px; font-weight: bold; margin-bottom: 8px; }

.task-row {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
  border: 1px solid #f1f5f9;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.task-row:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.06);
  border-color: #e2e8f0;
}

/* 列 1：元数据 */
.col-meta { width: 170px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; border-right: 1px dashed #e2e8f0; padding-right: 20px; }
.type-badge { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 800; color: white; align-self: flex-start; letter-spacing: 0.5px; }
.bg-blue { background: #3b82f6; box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3); }
.bg-red { background: #ef4444; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3); }
.order-sn { font-family: monospace; font-size: 13px; color: #64748b; font-weight: 500; }
.urgency { font-size: 12px; font-weight: 800; color: #d97706; background: #fef3c7; padding: 3px 8px; border-radius: 4px; align-self: flex-start; border: 1px solid #fde68a; }

/* 列 2：路线对比 */
.col-route { flex: 1; display: flex; align-items: center; padding: 0 32px; gap: 16px; overflow: hidden; }
.route-point { flex: 1; display: flex; align-items: flex-start; gap: 12px; overflow: hidden; }
.point-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; justify-content: center; align-items: center; font-size: 14px; font-weight: 900; color: white; flex-shrink: 0; box-shadow: inset 0 -2px 0 rgba(0,0,0,0.1); }
.point-icon.source { background: #f97316; }
.point-icon.target { background: #10b981; }
.point-info { display: flex; flex-direction: column; gap: 4px; overflow: hidden; width: 100%; }
.p-name { font-size: 15px; font-weight: 900; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.p-address { font-size: 13px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }

.route-connection { display: flex; align-items: center; color: #94a3b8; width: 50px; flex-shrink: 0; }
.route-connection .line { flex: 1; height: 2px; background: repeating-linear-gradient(to right, #cbd5e1 0, #cbd5e1 4px, transparent 4px, transparent 8px); }

/* 列 3：物资 */
.col-goods { width: 180px; flex-shrink: 0; padding: 0 24px; border-left: 1px dashed #e2e8f0; display: flex; align-items: center; }
.goods-box { display: flex; align-items: center; justify-content: space-between; width: 100%; }
.g-name { font-size: 15px; font-weight: 900; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
.g-count { font-size: 16px; color: #3b82f6; font-weight: 900; }

/* 列 4：操作按钮 */
.col-actions { width: 130px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; }
.btn-tool { padding: 8px 0; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; color: #475569; font-weight: bold; cursor: pointer; transition: 0.2s; display: flex; justify-content: center; align-items: center; gap: 6px; }
.btn-tool:hover:not(:disabled) { background: #e2e8f0; color: #0f172a; }
.btn-tool:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-main { padding: 10px 0; border: none; border-radius: 8px; color: white; font-weight: 900; cursor: pointer; transition: 0.3s; letter-spacing: 1px; }
.btn-main.grab { background: linear-gradient(135deg, #3b82f6, #2563eb); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
.btn-main.grab:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(37, 99, 235, 0.4); }
.btn-main.finish { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
.btn-main.finish:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(16, 185, 129, 0.4); }

/* ================= 侧边栏和弹窗 ================= */
.map-wrapper { width: 100%; height: 100%; position: relative; }
#amap-routing-container { width: 100%; height: 100%; }
.map-overlay-panel { position: absolute; top: 20px; left: 20px; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); padding: 15px 25px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display: flex; gap: 20px; border: 1px solid #e2e8f0; }
.overlay-item { display: flex; flex-direction: column; }
.overlay-item .label { font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 4px; }
.overlay-item .value { font-size: 24px; font-weight: 900; color: #0f172a; }
.upload-zone { text-align: center; }
.upload-tip { color: #64748b; font-size: 14px; margin-bottom: 16px; }
</style>