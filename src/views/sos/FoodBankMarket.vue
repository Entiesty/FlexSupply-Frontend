<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot green"></span>
      📍 {{ locationText }}
    </div>

    <div class="market-wrapper">
      <!-- 灾区配给制提示 -->
      <el-alert v-if="isEmergencyMode" :title="rationTitle" type="error"
        :description="rationDesc" :closable="false" show-icon style="margin-bottom: 20px;">
        <template #default>
          <div class="ration-detail">
            <span class="ration-count">今日剩余配额: <strong>{{ rationRemaining }} 次</strong></span>
            <span class="ration-tip">（基于Redis原子计数器防资源挤兑）</span>
          </div>
        </template>
      </el-alert>

      <header class="page-header">
        <div class="header-text">
          <h2 class="theme-green">🏪 社区食物银行</h2>
          <p>分享城市余温，践行零废弃，就近免费提取</p>
        </div>
      </header>

      <transition name="fade-slide">
        <div class="ticket-card" v-if="activePickupOrder">
          <div class="ticket-left">
            <div class="t-icon pulse-glow-green">🛍️</div>
            <div class="t-info">
              <h3>待提取物资</h3>
              <p class="goods-name">{{ activePickupOrder.goodsName }} <span class="qty">×{{ activePickupOrder.goodsCount }}</span></p>
              <p class="station-name"><el-icon><Location /></el-icon> {{ activePickupOrder.sourceName || '社区指定驿站' }}</p>
              <p class="warning-text">⚠️ 资源宝贵，请尽快前往提取</p>
            </div>
          </div>
          <div class="ticket-divider"></div>
          <div class="ticket-right">
            <span class="t-label">核销凭证码</span>
            <span class="t-code">{{ activePickupOrder.pickupCode }}</span>
          </div>
        </div>
      </transition>

      <div class="glass-panel" v-loading="loading">
        <div class="user-info-bar">
          <div class="greeting">
            <h3>今日社区余粮库 🛒</h3>
            <p>已通过 LBS 算法为您测算距离，优先展示附近货源</p>
          </div>
        </div>

        <div v-if="stationList.length === 0" class="empty-state">
          <div class="empty-icon">🍃</div>
          <h3>附近暂无可用物资</h3>
          <p>商铺暂未捐赠，或已被预约完</p>
        </div>

        <div class="station-list" v-else>
          <div class="store-card" v-for="station in stationList" :key="station.stationId">
            <div class="store-header">
              <div class="sh-main">
                <div class="sh-icon">🏠</div>
                <div class="sh-text">
                  <h4>{{ station.stationName }}</h4>
                  <p class="sh-addr">{{ station.address }}</p>
                </div>
              </div>
              <div class="sh-dist">{{ station.distance }} km</div>
            </div>

            <div class="goods-list">
              <div class="goods-item" v-for="goods in station.goodsList" :key="goods.goodsId">
                <div class="g-icon-box">{{ getCategoryIcon(goods.category) }}</div>
                <div class="g-content">
                  <h5 :title="goods.goodsName">{{ goods.goodsName }}</h5>
                  <div class="g-tags">
                    <span class="g-cat">{{ goods.category }}</span>
                    <span class="g-stock">仅剩 {{ goods.stock }} {{ goods.unit || '件' }}</span>
                  </div>
                </div>
                <button class="pill-btn reserve" :disabled="activePickupOrder != null" @click="handleReserve(station, goods)">
                  {{ activePickupOrder ? '已有预约' : '预约' }}
                </button>
              </div>
              <div v-if="!station.goodsList || station.goodsList.length === 0" class="no-goods-tip">
                该驿站当前暂无库存
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-drawer v-model="drawerVisible" direction="btt" size="auto" :with-header="false" custom-class="sos-drawer">
      <div class="drawer-content">
        <div class="drawer-handler"></div>
        <template v-if="!pickupResult">
          <h3 class="drawer-title" style="color: #059669;">确认预约自提吗？</h3>
          <div class="reserve-confirm-card">
            <div class="rc-icon">{{ getCategoryIcon(currentSelectGoods?.category) }}</div>
            <div class="rc-details">
              <div class="rc-goods">{{ currentSelectGoods?.goodsName }}</div>
              <div class="rc-station">📍 取货点：{{ currentSelectStation?.stationName }}</div>
            </div>
          </div>
          <div class="confirm-zone">
            <button class="apple-btn ready-green" :disabled="submitting" @click="confirmSubmit">
              <span class="btn-text" v-if="!submitting">确定预约并生成取件码</span>
              <span class="btn-text" v-else>锁定库存中...</span>
            </button>
            <p class="press-tip">预约后请在 2 小时内前往提取，逾期将退回公池</p>
          </div>
        </template>

        <template v-else>
          <div class="success-result-box">
            <div class="success-icon pulse-glow-green">✅</div>
            <h3 style="color: #10b981; margin-bottom: 5px;">物资已为您锁定</h3>
            <p style="color: #64748b; font-weight: bold; margin-bottom: 25px;">请凭下方凭证码前往驿站核销提取</p>

            <div class="pickup-code-box">
              <span class="pickup-label">专属提货码</span>
              <span class="pickup-code">{{ pickupResult.pickupCode }}</span>
            </div>

            <div class="station-guide">
              <div class="sg-row"><span class="sg-label">提货点：</span><span class="sg-value">{{ currentSelectStation?.stationName }}</span></div>
              <div class="sg-row"><span class="sg-label">地&nbsp;&nbsp;&nbsp;址：</span><span class="sg-value">{{ currentSelectStation?.address }}</span></div>
            </div>

            <button class="apple-btn outline-green" style="margin-top: 25px;" @click="closeAndRefresh">
              <span class="btn-text">我已截图保存，返回大厅</span>
            </button>
          </div>
        </template>
      </div>
    </el-drawer>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Location } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getUserProfile } from '@/api/user'
import { getStationPage, getStationGoods } from '@/api/resource'
import { publishDemand, getMyHistoryOrders } from '@/api/trade'
import { getCurrentConfig } from '@/api/config'

const loading = ref(false)
const locationText = ref('定位中...')
const userLoc = ref([118.092, 24.623])
const stationList = ref([])

// 灾区配给制状态
const sysMode = ref('NORMAL')
const maxDailyClaims = ref(3)
const todayClaimed = ref(0)

const isEmergencyMode = computed(() => sysMode.value === 'EMERGENCY_RESPONSE' || sysMode.value === 'WARNING_FREEZE')
const rationRemaining = computed(() => Math.max(0, maxDailyClaims.value - todayClaimed.value))
const rationTitle = computed(() => sysMode.value === 'EMERGENCY_RESPONSE' ? '🚨 战时配给制已启动' : '⚠️ 预警冻结期 · 限流配给中')
const rationDesc = computed(() => `根据应急管理指挥中心指令，当前每人每日最多申领 ${maxDailyClaims.value} 次，请将资源留给最需要的人。`)

const drawerVisible = ref(false)
const currentSelectStation = ref(null)
const currentSelectGoods = ref(null)
const submitting = ref(false)
const pickupResult = ref(null)

const activePickupOrder = ref(null)

const getCategoryIcon = (cat) => {
  const map = { '粮油副食': '🍚', '米面粮油': '🌾', '生鲜冷冻': '🥩', '新鲜果蔬': '🍎', '方便速食': '🍜', '烘焙糕点': '🍞', '常备用药': '💊', '越冬日用': '🧥' }
  return map[cat] || '📦'
}

const calculateDistance = (lon1, lat1, lon2, lat2) => {
  const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(2)
}

const fetchData = async () => {
  loading.value = true
  try {
    const userRes = await getUserProfile()
    if (userRes.data?.currentLon) {
      userLoc.value = [userRes.data.currentLon, userRes.data.currentLat]
      locationText.value = 'LBS 附近货源检索完成'
    } else {
      locationText.value = '未设置家庭定位，使用默认坐标'
    }

    // 读取用户当日已申领次数
    if (userRes.data?.dailyClaimCount != null) {
      todayClaimed.value = userRes.data.dailyClaimCount
    }

    // 读取系统模式配置
    try {
      const configRes = await getCurrentConfig()
      if (configRes.data) {
        sysMode.value = configRes.data.sysMode
        maxDailyClaims.value = configRes.data.maxDailyClaims || 3
      }
    } catch (e) {}

    try {
      const historyRes = await getMyHistoryOrders({ pageNum: 1, pageSize: 20 })
      const orders = historyRes.data.records || []
      activePickupOrder.value = orders.find(o => o.status === 1 && o.deliveryMethod === 2 && o.pickupCode) || null
    } catch (e) {}

    const stRes = await getStationPage({ pageNum: 1, pageSize: 10 })
    let stations = stRes.data.records || []

    for (let st of stations) {
      st.distance = calculateDistance(userLoc.value[0], userLoc.value[1], st.longitude, st.latitude)
      try {
        const gRes = await getStationGoods(st.stationId)
        st.goodsList = gRes.data.records || []
      } catch (e) { st.goodsList = [] }
    }

    stationList.value = stations.filter(s => s.goodsList.length > 0).sort((a, b) => a.distance - b.distance)
  } catch (e) {
    ElMessage.error('获取附近物资失败')
  } finally {
    loading.value = false
  }
}

const handleReserve = (station, goods) => {
  if (activePickupOrder.value) {
    return ElMessage.warning('您当前已有一笔待提取的物资，请先核销后再预约，把资源留给更多人！')
  }
  currentSelectStation.value = station
  currentSelectGoods.value = goods
  pickupResult.value = null
  drawerVisible.value = true
}

const confirmSubmit = async () => {
  submitting.value = true
  try {
    const res = await publishDemand({
      goodsId: currentSelectGoods.value.goodsId,
      sourceId: currentSelectStation.value.stationId,
      requiredCategory: currentSelectGoods.value.category,
      urgencyLevel: 1,
      targetLon: userLoc.value[0],
      targetLat: userLoc.value[1],
      description: currentSelectGoods.value.goodsName,
      deliveryMethod: 2
    })
    const code = res.data?.pickupCode || res.data;
    pickupResult.value = { pickupCode: code }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '手慢了，物资可能已被抢空')
  } finally {
    submitting.value = false
  }
}

const closeAndRefresh = () => {
  drawerVisible.value = false
  fetchData()
}

onMounted(() => fetchData())
</script>

<style scoped>
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 40px; background: #f8fafc; min-height: 100vh; overflow-y: auto; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;}
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; color: #10b981; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); font-weight: bold;}
.pulse-dot.green { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; animation: pulse-green 2s infinite; }
@keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

.market-wrapper { max-width: 1200px; margin: 0 auto; width: 100%; padding-bottom: 50px;}

.ration-detail { padding: 5px 0; }
.ration-count { font-weight: 900; font-size: 1rem; }
.ration-count strong { color: #dc2626; font-size: 1.2rem; }
.ration-tip { font-size: 0.8rem; color: #94a3b8; margin-left: 10px; }

.page-header { margin-bottom: 25px; }
.page-header h2.theme-green { color: #059669; font-size: 2.2rem; margin: 0 0 8px 0; font-weight: 900; letter-spacing: 0.5px; }
.page-header p { color: #64748b; font-size: 1.05rem; margin: 0; font-weight: 500;}

/* 🎫 升级版：拟物化票券设计 */
.ticket-card { display: flex; background: #fff; border-radius: 20px; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.12); position: relative; overflow: hidden; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05)); }
.ticket-left { flex: 1; padding: 25px 30px; display: flex; align-items: center; gap: 20px; background: linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%); }
.t-icon { font-size: 2.5rem; width: 64px; height: 64px; background: #fff; border-radius: 18px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.15); flex-shrink: 0;}
.t-info { flex: 1; }
.t-info h3 { margin: 0 0 6px 0; color: #065f46; font-size: 1.1rem; font-weight: 900; }
.t-info .goods-name { margin: 0 0 6px 0; color: #1e293b; font-size: 1.3rem; font-weight: bold; display: flex; align-items: center; gap: 8px;}
.t-info .qty { background: #d1fae5; color: #047857; font-size: 0.9rem; padding: 2px 8px; border-radius: 8px; }
.t-info .station-name { margin: 0 0 4px 0; color: #64748b; font-size: 0.95rem; display: flex; align-items: center; gap: 4px; }
.t-info .warning-text { color: #ef4444; font-weight: bold; margin: 0; font-size: 0.85rem; }

.ticket-divider { width: 0; border-left: 2px dashed #a7f3d0; position: relative; background: #fff;}
.ticket-divider::before, .ticket-divider::after { content: ''; position: absolute; width: 24px; height: 24px; background: #f8fafc; border-radius: 50%; left: -13px; z-index: 10; }
.ticket-divider::before { top: -12px; box-shadow: inset 0 -2px 4px rgba(0,0,0,0.03); }
.ticket-divider::after { bottom: -12px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.03); }

.ticket-right { width: 220px; padding: 25px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #fff; flex-shrink: 0;}
.t-label { color: #10b981; font-size: 0.9rem; font-weight: bold; margin-bottom: 8px; letter-spacing: 1px;}
.t-code { font-family: 'Courier New', Courier, monospace; font-size: 2.8rem; font-weight: 900; color: #059669; line-height: 1; letter-spacing: 2px; }

/* 主体内容区 */
.glass-panel { background: transparent; }

.user-info-bar { margin-bottom: 25px; }
.greeting h3 { margin: 0 0 5px; font-size: 1.5rem; color: #1e293b; font-weight: 900; }
.greeting p { margin: 0; font-size: 0.95rem; color: #64748b; font-weight: bold;}

.empty-state { text-align: center; padding: 80px 0; background: #fff; border-radius: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.02);}
.empty-icon { font-size: 4.5rem; margin-bottom: 15px; opacity: 0.6;}
.empty-state h3 { color: #1e293b; margin: 0 0 8px; font-size: 1.3rem; font-weight: bold;}
.empty-state p { color: #94a3b8; font-size: 1rem;}

/* 🏬 升级版：卡片式店铺与商品流 */
.station-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 25px; }

.store-card { background: #fff; border-radius: 24px; overflow: hidden; display: flex; flex-direction: column; transition: 0.3s; box-shadow: 0 10px 25px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; }
.store-card:hover { transform: translateY(-4px); box-shadow: 0 15px 35px rgba(0,0,0,0.06); border-color: #e2e8f0; }

.store-header { padding: 20px 25px; background: linear-gradient(to right, #f8fafc, #ffffff); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9;}
.sh-main { display: flex; align-items: center; gap: 15px; }
.sh-icon { font-size: 1.8rem; background: #ecfdf5; width: 45px; height: 45px; display: flex; justify-content: center; align-items: center; border-radius: 12px; }
.sh-text h4 { margin: 0 0 4px 0; font-size: 1.15rem; color: #0f172a; font-weight: 900; }
.sh-addr { margin: 0; font-size: 0.85rem; color: #64748b; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;}
.sh-dist { font-size: 0.85rem; background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 100px; font-weight: 900;}

.goods-list { padding: 20px 25px; display: flex; flex-direction: column; gap: 16px; background: #fff;}
.goods-item { display: flex; align-items: center; gap: 15px; }
.g-icon-box { font-size: 2.2rem; background: #f8fafc; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 16px; flex-shrink: 0; border: 1px solid #f1f5f9;}
.g-content { flex: 1; min-width: 0;}
.g-content h5 { margin: 0 0 8px 0; font-size: 1.1rem; color: #1e293b; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.g-tags { display: flex; gap: 8px; align-items: center;}
.g-cat { font-size: 0.75rem; background: #f1f5f9; color: #64748b; padding: 4px 8px; border-radius: 6px; font-weight: bold;}
.g-stock { font-size: 0.75rem; color: #ea580c; font-weight: 900;}

.pill-btn.reserve { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 100px; font-weight: 900; font-size: 0.95rem; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); white-space: nowrap; flex-shrink: 0;}
.pill-btn.reserve:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(16, 185, 129, 0.3); }
.pill-btn.reserve:active:not(:disabled) { transform: scale(0.95); }
.pill-btn.reserve:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; box-shadow: none; }

.no-goods-tip { text-align: center; color: #94a3b8; padding: 10px 0; font-size: 0.9rem; font-weight: bold; }

/* 🍎 Apple 风格抽屉 */
.drawer-content { padding: 0 30px 40px 30px; display: flex; flex-direction: column; max-width: 500px; margin: 0 auto; height: auto;}
.drawer-handler { width: 40px; height: 5px; background: #e2e8f0; border-radius: 5px; margin: 15px auto 25px auto; }
.drawer-title { font-size: 1.5rem; font-weight: 900; margin: 0 0 25px 0; text-align: center; }

.reserve-confirm-card { background: #f8fafc; border-radius: 20px; padding: 20px; margin-bottom: 30px; display: flex; align-items: center; gap: 20px;}
.rc-icon { font-size: 3rem; background: #fff; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; border-radius: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);}
.rc-details { flex: 1; text-align: left;}
.rc-goods { font-size: 1.2rem; font-weight: 900; color: #1e293b; margin-bottom: 6px;}
.rc-station { font-size: 0.95rem; color: #64748b; font-weight: bold;}

.confirm-zone { text-align: center; width: 100%;}
.apple-btn { width: 100%; height: 56px; border-radius: 100px; border: none; font-size: 1.15rem; font-weight: 900; color: #fff; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center;}
.apple-btn.ready-green { background: #10b981; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.2); }
.apple-btn.ready-green:hover:not(:disabled) { background: #059669; transform: translateY(-2px); box-shadow: 0 12px 25px rgba(16, 185, 129, 0.3);}
.apple-btn.outline-green { background: #ecfdf5; color: #059669; border: 2px solid #34d399; }
.apple-btn.outline-green:hover { background: #d1fae5; transform: translateY(-2px); }
.apple-btn:disabled { background: #cbd5e1; cursor: not-allowed; box-shadow: none; transform: none;}
.press-tip { font-size: 0.85rem; color: #ef4444; margin-top: 15px; font-weight: bold;}

.success-result-box { text-align: center; padding-top: 10px;}
.success-icon { font-size: 4rem; margin-bottom: 10px; display: inline-block;}
.pulse-glow-green { animation: icon-pulse-green 2s infinite; border-radius: 50%;}
@keyframes icon-pulse-green { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 20px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

.pickup-code-box { margin-top: 15px; background: #ecfdf5; border-radius: 20px; padding: 25px; text-align: center; margin-bottom: 25px;}
.pickup-label { color: #059669; font-size: 1rem; font-weight: bold; margin-bottom: 8px; display: block; }
.pickup-code { color: #10b981; font-size: 3.5rem; font-weight: 900; letter-spacing: 6px; font-family: 'Courier New', Courier, monospace; line-height: 1;}

.station-guide { background: #f8fafc; padding: 20px; border-radius: 16px; text-align: left;}
.sg-row { display: flex; margin-bottom: 8px; font-size: 0.95rem;}
.sg-row:last-child { margin-bottom: 0; }
.sg-label { color: #94a3b8; width: 70px; flex-shrink: 0; font-weight: bold;}
.sg-value { color: #1e293b; font-weight: bold; flex: 1; }

@media screen and (max-width: 768px) {
  .main-content { padding: 20px 15px; }
  .ticket-card { flex-direction: column; text-align: center; }
  .ticket-divider { width: 100%; border-left: none; border-top: 2px dashed #a7f3d0; height: 0; }
  .ticket-divider::before { top: -13px; left: -12px; box-shadow: inset -2px 0 4px rgba(0,0,0,0.03); }
  .ticket-divider::after { top: -13px; right: -12px; left: auto; bottom: auto; box-shadow: inset 2px 0 4px rgba(0,0,0,0.03); }
  .ticket-left { flex-direction: column; gap: 15px; padding: 30px 20px; }
  .ticket-right { width: 100%; padding: 20px; }
  .station-list { grid-template-columns: 1fr; }
}
</style>
<style>
.sos-drawer .el-drawer__body { padding: 0; background: #fff; overflow-y: visible;}
.sos-drawer { border-radius: 32px 32px 0 0 !important; box-shadow: 0 -10px 40px rgba(0,0,0,0.15) !important; background: #fff !important;}
</style>