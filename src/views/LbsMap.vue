<template>
  <div class="map-root">
    <div id="amap-container"></div>

    <header class="glass-header">
      <div class="brand">
        <span class="brand-emoji">🧡</span>
        <span class="brand-name">社区食物银行 · 调度中心</span>
      </div>
      <div class="user-info">
        <div class="user-status">
          <span class="status-dot"></span>
          系统监控中
        </div>
        <div class="user-detail">
          <span class="role">高级志愿者</span>
          <span class="name">{{ currentUser.username }}</span>
        </div>
      </div>
    </header>

    <aside v-if="!isMissionActive" class="action-card">
      <div class="card-label">最新待调度需求</div>
      <div class="task-box">
        <div v-if="!result" class="empty-placeholder">点击下方开启智能匹配</div>
        <div v-else class="task-detail">
          <div class="task-row">
            <span class="t-key">单号:</span>
            <span class="t-val">{{ result.orderSn }}</span>
          </div>
          <div class="task-row">
            <span class="t-key">需求物资:</span>
            <span class="t-val">{{ result.goodsName || '应急物资' }}</span>
          </div>
          <div class="task-row">
            <span class="t-key">紧急程度:</span>
            <span class="t-val t-urgent">等级 {{ result.urgencyLevel }}</span>
          </div>
        </div>
      </div>
      <button class="dispatch-btn" :disabled="loading" @click="handleSmartDispatch">
        <span v-if="loading" class="btn-loader"></span>
        {{ loading ? '引擎计算中...' : '🎯 开启一键智能调度' }}
      </button>
    </aside>

    <transition name="mission-slide">
      <aside v-if="isMissionActive" class="mission-board">
        <div class="mb-head">
          <span class="mb-tag">🚀 任务进行中</span>
          <span class="mb-id">单号: {{ activeOrder.orderSn }}</span>
        </div>
        <div class="mb-body">
          <h3 class="mb-title">{{ activeOrder.stationName }}</h3>
          <p class="mb-addr">📍 {{ activeOrder.address }}</p>
          <div class="mb-timer">
            <span class="timer-label">预计抵达时间</span>
            <span class="timer-val">{{ activeOrder.eta }}</span>
          </div>
        </div>
        <div class="mb-footer">
          <button class="contact-btn">📞 联系据点</button>
          <button class="finish-btn" @click="handleFinishMission">完成配送</button>
        </div>
      </aside>
    </transition>

    <transition name="drawer-slide">
      <div v-if="result && !isMissionActive" class="result-drawer" :class="{ 'shake-error': isError }">
        <div class="res-content">
          <div class="res-tag">BEST MATCH 最佳匹配</div>
          <h2 class="res-title">{{ result.station.stationName }}</h2>
          <div class="res-stats">
            <div class="stat-item">🚴 距离 <strong>{{ result.distance }}</strong> 米</div>
            <div class="stat-item">⏱️ 耗时 约 <strong>{{ Math.ceil(result.distance / 250) + 2 }}</strong> 分</div>
            <div class="stat-item">📊 评分 <strong>{{ result.finalScore ? result.finalScore.toFixed(2) : 'N/A' }}</strong></div>
          </div>
        </div>
        <div class="res-action">
          <button class="grab-btn" @click="handleGrab(result.orderId)">确认响应 · 立即抢单</button>
          <p class="grab-note">感谢您的爱心接力</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { smartMatch, grabTask } from '@/api/dispatch'
import { ElMessage } from 'element-plus'

const map = ref(null)
const loading = ref(false)
const result = ref(null)
const isError = ref(false)
const isMissionActive = ref(false)
const activeOrder = ref({})

// 模拟从用户信息接口获取的当前登录用户数据
const currentUser = reactive({
  userId: 1,
  username: '王牌调度员'
})

const userLocation = [118.092000, 24.485000]

onMounted(() => initMap())
onUnmounted(() => { if (map.value) map.value.destroy() })

const initMap = () => {
  AMapLoader.load({
    key: '你的高德Web端Key',
    version: '2.0',
    plugins: ['AMap.MoveAnimation']
  }).then((amap) => {
    map.value = new amap.Map('amap-container', {
      viewMode: '3D', pitch: 35, zoom: 15, center: userLocation,
      mapStyle: 'amap://styles/fresh'
    })
    new amap.Marker({
      map: map.value, position: userLocation,
      content: '<div class="custom-marker sos-marker">🆘 求助点</div>',
      offset: new amap.Pixel(-40, -15)
    })
  })
}

const handleSmartDispatch = async () => {
  loading.value = true
  result.value = null
  try {
    const res = await smartMatch({ longitude: userLocation[0], latitude: userLocation[1], goodsId: 1, urgency: 10 })

    if (res.data?.length) {
      result.value = res.data[0]

      // 🚨 核心修复：兼容后端可能返回的各种 ID 字段名！
      // 它会按顺序寻找 orderId，如果没有就找 id，再没有就找 order_id
      result.value.orderId = res.data[0].orderId || res.data[0].id || res.data[0].order_id || 2

      // 兼容其他字段
      result.value.orderSn = res.data[0].orderSn || 'ORD-NEW-2026'
      result.value.goodsName = res.data[0].goodsName || '应急矿泉水'
      result.value.urgencyLevel = res.data[0].urgencyLevel || res.data[0].urgency || 10

      drawRoute(result.value.station)
    } else {
      ElMessage.info("暂无可调度的需求")
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const drawRoute = (station) => {
  const stationLoc = [station.longitude, station.latitude]
  new AMap.Marker({
    map: map.value, position: stationLoc,
    content: '<div class="custom-marker station-marker">🏥 物资点</div>',
    offset: new AMap.Pixel(-40, -15)
  })
  const curve = new AMap.BezierCurve({
    path: [stationLoc, [ (userLocation[0]+stationLoc[0])/2, (userLocation[1]+stationLoc[1])/2+0.002 ], userLocation],
    strokeColor: "#f97316", strokeWeight: 6, strokeOpacity: 0.8, isOutline: true, outlineColor: '#fff'
  })
  map.value.add(curve)
  map.value.setFitView()
}

// 🚨 修复：接收动态传来的 orderId
const handleGrab = async (orderId) => {
  if (!orderId) {
    ElMessage.error("未找到有效订单ID")
    return
  }
  try {
    // 抢单时传入动态订单 ID
    await grabTask(orderId)
    ElMessage.success({ message: '响应成功！爱心已成功接力', offset: 80 })

    // 🚨 状态流转：用刚抢到的数据填充“执行中面板”
    activeOrder.value = {
      orderSn: result.value.orderSn,
      stationName: result.value.station.stationName,
      address: result.value.station.address || '据点详细地址',
      // 计算一个简单的未来时间作为 ETA
      eta: new Date(Date.now() + 8 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    // 触发页面状态切换：隐藏预览卡和抽屉，显示执行看板
    isMissionActive.value = true
  } catch (error) {
    // 失败触发震动
    isError.value = true
    setTimeout(() => { isError.value = false }, 500)
  }
}

const handleFinishMission = () => {
  ElMessage.success('任务圆满完成！')
  isMissionActive.value = false
  result.value = null
  // 这里真实场景下还需要调用后端 API 完成订单状态更新
}
</script>

<style scoped>
.map-root { position: fixed; inset: 0; background: #f1f5f9; }
#amap-container { width: 100%; height: 100%; }

.glass-header {
  position: absolute; top: 0; left: 0; right: 0; z-index: 100;
  height: 64px; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px);
  border-bottom: 1.5px solid rgba(249, 115, 22, 0.15); display: flex; align-items: center; justify-content: space-between; padding: 0 30px;
}
.brand { font-size: 1.1rem; font-weight: 800; color: #c2410c; }
.role-tag { font-size: 0.75rem; background: rgba(249, 115, 22, 0.1); color: #f97316; padding: 2px 8px; border-radius: 10px; margin-right: 10px; }
.name { font-weight: bold; color: #1e293b; }

.action-card {
  position: absolute; top: 84px; left: 24px; z-index: 100;
  width: 280px; background: #fff; border-radius: 24px; padding: 24px; border: 1.5px solid rgba(249, 115, 22, 0.12); box-shadow: 0 10px 25px rgba(0,0,0,0.05);
}
/* 新增：数据为空时的占位样式 */
.empty-placeholder { color: #94a3b8; font-size: 0.85rem; padding: 20px 0; text-align: center; border: 1px dashed #e2e8f0; border-radius: 12px; }
.card-label { font-size: 0.7rem; color: #f97316; font-weight: 800; margin-bottom: 15px; }
.task-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.85rem; }
.t-val { font-weight: 700; color: #1e293b; }
.t-urgent { color: #ef4444; }

.dispatch-btn { width: 100%; padding: 14px; border: none; border-radius: 14px; background: linear-gradient(135deg, #f97316, #fb923c); color: #fff; font-weight: 800; cursor: pointer; transition: 0.3s; margin-top: 15px;}
.dispatch-btn:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(249, 115, 22, 0.2); }

/* 任务执行看板样式 */
.mission-board {
  position: absolute; top: 84px; left: 24px; z-index: 105;
  width: 320px; background: #fff; border-radius: 24px; padding: 24px; border: 2px solid #f97316; box-shadow: 0 20px 40px rgba(249, 115, 22, 0.15);
}
.mb-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.mb-tag { font-size: 0.75rem; color: #f97316; font-weight: 900; background: rgba(249,115,22,0.1); padding: 4px 10px; border-radius: 10px; }
.mb-id { font-size: 0.7rem; color: #94a3b8; }
.mb-title { font-size: 1.1rem; color: #1e293b; font-weight: bold; margin-bottom: 8px; }
.mb-addr { font-size: 0.85rem; color: #64748b; margin-bottom: 15px; }
.mb-timer { background: #fff7ed; padding: 12px; border-radius: 12px; text-align: center; }
.timer-label { display: block; font-size: 0.7rem; color: #f97316; }
.timer-val { font-size: 1.3rem; font-weight: 800; color: #ea580c; }
.mb-footer { display: flex; gap: 10px; margin-top: 20px; }
.contact-btn { flex: 1; padding: 10px; border: 1.5px solid #f97316; background: #fff; color: #f97316; border-radius: 12px; cursor: pointer; font-weight: bold; }
.finish-btn { flex: 1; padding: 10px; border: none; background: #f97316; color: #fff; border-radius: 12px; cursor: pointer; font-weight: bold; }

.result-drawer {
  position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%);
  width: 750px; z-index: 100; background: #fff; border-radius: 30px; padding: 30px 45px;
  display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.2); border: 2px solid #fff; transition: 0.3s;
}

@keyframes shake {
  0%, 100% { transform: translate(-50%, 0); }
  25% { transform: translate(-52%, 0); }
  75% { transform: translate(-48%, 0); }
}
.shake-error {
  animation: shake 0.4s ease-in-out;
  border-color: #f87171 !important;
  box-shadow: 0 0 40px rgba(248, 113, 113, 0.3) !important;
}

.res-tag { font-size: 0.7rem; color: #10b981; font-weight: 900; }
.res-title { font-size: 1.6rem; color: #1e293b; margin: 5px 0 15px; }
.res-stats { display: flex; gap: 30px; }
.stat-item { font-size: 0.85rem; color: #64748b; }
.stat-item strong { color: #f97316; }

.grab-btn { padding: 16px 35px; background: #f97316; color: #fff; border: none; border-radius: 18px; font-weight: 800; cursor: pointer; transition: 0.3s; }
.grab-btn:hover { background: #ea580c; transform: scale(1.05); }
.grab-note { font-size: 0.75rem; color: #94a3b8; margin-top: 10px; text-align: right; }

/* 动画效果 */
.drawer-slide-enter-active, .mission-slide-enter-active { transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.drawer-slide-enter-from { transform: translate(-50%, 150%); opacity: 0; }
.mission-slide-enter-from { transform: translateX(-120%); opacity: 0; }

.btn-loader { display: inline-block; width: 14px; height: 14px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 自定义 Marker */
.custom-marker { padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 900; color: #fff; box-shadow: 0 6px 15px rgba(0,0,0,0.1); }
.sos-marker { background: #ef4444; }
.station-marker { background: #f97316; }
</style>