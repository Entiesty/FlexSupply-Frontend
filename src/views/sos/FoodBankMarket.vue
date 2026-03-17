<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot green"></span>
      📍 {{ locationText }}
    </div>

    <div class="market-wrapper">
      <header class="page-header">
        <div class="header-text">
          <h2 class="theme-green">🏪 社区食物银行</h2>
          <p>日常公益余粮，倡导反食物浪费，就近预约自提</p>
        </div>
      </header>

      <transition name="fade-slide">
        <div class="active-voucher-card" v-if="activePickupOrder">
          <div class="voucher-left">
            <div class="v-icon pulse-glow-green">🎫</div>
            <div class="v-info">
              <h3>您有一个待提取的物资</h3>
              <p><strong>物资：</strong>{{ activePickupOrder.goodsName }} (x{{ activePickupOrder.goodsCount }})</p>
              <p><strong>门店：</strong>{{ activePickupOrder.sourceName || '社区指定驿站' }}</p>
              <p class="warning-text">⚠️ 请在超时释放前尽快前往提取</p>
            </div>
          </div>
          <div class="voucher-right">
            <span class="v-label">取件码</span>
            <span class="v-code">{{ activePickupOrder.pickupCode }}</span>
          </div>
        </div>
      </transition>

      <div class="glass-panel" v-loading="loading">
        <div class="user-info-bar">
          <div class="avatar-wrap green-gradient">
            <span class="avatar">🛍️</span>
          </div>
          <div class="greeting">
            <h3>今日社区余粮库</h3>
            <p>已根据您的 LBS 坐标为您推荐附近驿站</p>
          </div>
        </div>

        <div class="divider"></div>

        <div v-if="stationList.length === 0" class="empty-state">
          <div class="empty-icon">🍃</div>
          <h3>附近暂无可用物资</h3>
          <p>商铺暂未捐赠，或已被预约完</p>
        </div>

        <div class="station-list" v-else>
          <div class="station-card" v-for="station in stationList" :key="station.stationId">
            <div class="station-header">
              <div class="s-title">
                <h4><el-icon><OfficeBuilding /></el-icon> {{ station.stationName }}</h4>
                <span class="s-dist">{{ station.distance }} km</span>
              </div>
              <p class="s-addr">{{ station.address }}</p>
            </div>

            <div class="goods-grid">
              <div class="goods-item" v-for="goods in station.goodsList" :key="goods.goodsId">
                <div class="g-icon">{{ getCategoryIcon(goods.category) }}</div>
                <div class="g-info">
                  <h5 :title="goods.goodsName">{{ goods.goodsName }}</h5>
                  <div class="g-tags">
                    <span class="g-stock">余 {{ goods.stock }} {{ goods.unit || '件' }}</span>
                    <span class="g-cat">{{ goods.category }}</span>
                  </div>
                </div>
                <button class="reserve-btn" :disabled="activePickupOrder != null" @click="handleReserve(station, goods)">
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

    <el-drawer v-model="drawerVisible" direction="btt" size="65%" :with-header="false" custom-class="sos-drawer">
      <div class="drawer-content">
        <template v-if="!pickupResult">
          <h3 class="drawer-title" style="color: #059669;">确认预约自提吗？</h3>
          <div class="reserve-confirm-card">
            <div class="rc-goods">{{ currentSelectGoods?.goodsName }}</div>
            <div class="rc-station">📍 提货地：{{ currentSelectStation?.stationName }}</div>
          </div>
          <div class="confirm-zone">
            <button class="long-press-btn ready-green" :disabled="submitting" @click="confirmSubmit">
              <span class="btn-text" v-if="!submitting">点击确认预约</span>
              <span class="btn-text" v-else>锁定库存中...</span>
            </button>
            <p class="press-tip">预约后请在 2 小时内前往驿站提取，逾期自动取消</p>
          </div>
        </template>

        <template v-else>
          <div class="success-result-box">
            <div class="success-icon pulse-glow-green">✅</div>
            <h3 style="color: #10b981; margin-bottom: 5px;">预约成功</h3>
            <p style="color: #64748b; font-weight: bold; margin-bottom: 25px;">物资已为您锁定，请凭下方取件码前往提取</p>

            <div class="pickup-code-box">
              <span class="pickup-label">您的专属取件码</span>
              <span class="pickup-code">{{ pickupResult.pickupCode }}</span>
            </div>

            <div class="station-guide">
              <p><strong>提货地点：</strong>{{ currentSelectStation?.stationName }}</p>
              <p><strong>详细地址：</strong>{{ currentSelectStation?.address }}</p>
            </div>

            <button class="long-press-btn ready-green" style="margin-top: 20px;" @click="closeAndRefresh">
              <span class="btn-text">我已截图保存</span>
            </button>
          </div>
        </template>
      </div>
    </el-drawer>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { OfficeBuilding } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getUserProfile } from '@/api/user'
import { getStationPage, getStationGoods } from '@/api/resource'
import { publishDemand, getMyHistoryOrders } from '@/api/trade' // 引入历史订单查询接口

const loading = ref(false)
const locationText = ref('定位中...')
const userLoc = ref([118.092, 24.623])
const stationList = ref([])

const drawerVisible = ref(false)
const currentSelectStation = ref(null)
const currentSelectGoods = ref(null)
const submitting = ref(false)
const pickupResult = ref(null)

// 🚨 新增：常驻活跃自提单凭证
const activePickupOrder = ref(null)

const getCategoryIcon = (cat) => {
  const map = { '粮油副食': '🍚', '米面粮油': '🌾', '生鲜水果': '🍎', '速食品': '🍜', '烘焙糕点': '🍞' }
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
    // 1. 获取个人定位
    const userRes = await getUserProfile()
    if (userRes.data?.currentLon) {
      userLoc.value = [userRes.data.currentLon, userRes.data.currentLat]
      locationText.value = 'LBS 附近驿站检索完成'
    } else {
      locationText.value = '未设置家庭定位，使用默认坐标'
    }

    // 2. 🚨 静默查询：是否有正在进行的自提单，防止遗忘
    try {
      const historyRes = await getMyHistoryOrders({ pageNum: 1, pageSize: 20 })
      const orders = historyRes.data.records || []
      // 寻找状态=1(待取货) 且 履约方式=2(自提) 的存活订单
      activePickupOrder.value = orders.find(o => o.status === 1 && o.deliveryMethod === 2 && o.pickupCode) || null
    } catch (e) {
      console.warn('防遗忘溯源失败', e)
    }

    // 3. 获取大仓列表及库存
    const stRes = await getStationPage({ pageNum: 1, pageSize: 10 })
    let stations = stRes.data.records || []

    for (let st of stations) {
      st.distance = calculateDistance(userLoc.value[0], userLoc.value[1], st.longitude, st.latitude)
      try {
        const gRes = await getStationGoods(st.stationId)
        st.goodsList = gRes.data.records || [] // 注意这里加了 .records 以防万一
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

    const code = res.data?.pickupCode || String(Math.floor(Math.random() * 900000) + 100000)
    pickupResult.value = { pickupCode: code }

  } catch (e) {
    ElMessage.error(e.response?.data?.message || '手慢了，物资可能已被抢空')
  } finally {
    submitting.value = false
  }
}

const closeAndRefresh = () => {
  drawerVisible.value = false
  fetchData() // 刷新后，页面顶部会立刻挂载凭证悬浮舱
}

onMounted(() => fetchData())
</script>

<style scoped>
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 40px 30px; background: #f1f5f9; min-height: 100vh; overflow-y: auto;}
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; color: #10b981; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); font-weight: bold;}
.pulse-dot.green { width: 10px; height: 10px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; animation: pulse-green 2s infinite; }
@keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

/* 🚨 核心改动：解除宽度限制，最大 1400px，让宽屏也能看爽 */
.market-wrapper { max-width: 1400px; margin: 0 auto; width: 100%; padding-bottom: 50px;}

.page-header h2.theme-green { color: #10b981; font-size: 2.2rem; margin: 0 0 8px 0; font-weight: 900; letter-spacing: 1px; }
.page-header p { color: #64748b; font-size: 1.1rem; margin: 0 0 25px 0; }

/* 🚨 凭证悬浮卡片样式 */
.active-voucher-card { display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 2px dashed #34d399; border-radius: 20px; padding: 25px 30px; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.15); }
.voucher-left { display: flex; align-items: flex-start; gap: 20px; }
.v-icon { font-size: 2.5rem; background: #fff; width: 60px; height: 60px; display: flex; justify-content: center; align-items: center; border-radius: 50%; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2); }
.v-info h3 { margin: 0 0 8px 0; color: #065f46; font-size: 1.4rem; font-weight: 900; }
.v-info p { margin: 0 0 4px 0; color: #047857; font-size: 0.95rem; }
.v-info .warning-text { color: #ef4444; font-weight: bold; margin-top: 8px; font-size: 0.85rem; }
.voucher-right { text-align: center; background: #fff; padding: 15px 30px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
.v-label { display: block; color: #10b981; font-size: 0.9rem; font-weight: bold; margin-bottom: 5px; }
.v-code { font-family: 'Courier New', Courier, monospace; font-size: 2.5rem; font-weight: 900; color: #059669; letter-spacing: 4px; }

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.5s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-20px); }

.glass-panel { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 24px; padding: 30px 40px; box-shadow: 0 15px 35px rgba(0,0,0,0.06); border: 1px solid #fff; }

.user-info-bar { display: flex; align-items: center; gap: 15px; }
.avatar-wrap.green-gradient { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 4px; border-radius: 50%; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); display: flex; align-items: center; justify-content: center;}
.avatar { display: block; font-size: 2rem; background: #fff; border-radius: 50%; width: 50px; height: 50px; line-height: 50px; text-align: center; }
.greeting h3 { margin: 0 0 5px; font-size: 1.4rem; color: #1e293b; font-weight: 900; }
.greeting p { margin: 0; font-size: 0.95rem; color: #64748b; font-weight: bold;}
.divider { height: 1px; background: #f1f5f9; margin: 20px 0; }

.empty-state { text-align: center; padding: 60px 0; }
.empty-icon { font-size: 5rem; margin-bottom: 15px; opacity: 0.8;}
.empty-state h3 { color: #475569; margin: 0 0 8px; font-size: 1.2rem;}
.empty-state p { color: #94a3b8; font-size: 1rem;}

/* 🚨 核心改动：PC端瀑布流 Grid，手机端自动单列 */
.station-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 25px; }

.station-card { background: #f8fafc; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; display: flex; flex-direction: column; transition: 0.3s; }
.station-card:hover { transform: translateY(-4px); box-shadow: 0 12px 25px rgba(0,0,0,0.05); border-color: #cbd5e1; }
.station-header { padding: 18px 20px; background: #fff; border-bottom: 1px dashed #e2e8f0; }
.s-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.s-title h4 { margin: 0; font-size: 1.15rem; color: #1e293b; font-weight: 900; display: flex; align-items: center; gap: 6px;}
.s-dist { font-size: 0.85rem; background: #ecfdf5; color: #10b981; padding: 4px 10px; border-radius: 8px; font-weight: bold; border: 1px solid #a7f3d0;}
.s-addr { margin: 0; font-size: 0.85rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}

.goods-grid { padding: 15px; display: flex; flex-direction: column; gap: 12px; flex: 1;}
.goods-item { display: flex; align-items: center; gap: 12px; background: #fff; padding: 14px; border-radius: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); border: 1px solid #f1f5f9; transition: 0.2s;}
.goods-item:hover { border-color: #a7f3d0; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1); }
.g-icon { font-size: 2rem; background: #f8fafc; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 12px;}
.g-info { flex: 1; min-width: 0;}
.g-info h5 { margin: 0 0 6px 0; font-size: 1.05rem; color: #1e293b; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.g-tags { display: flex; gap: 8px; }
.g-stock { font-size: 0.75rem; background: #fef2f2; color: #ef4444; padding: 3px 8px; border-radius: 6px; font-weight: bold;}
.g-cat { font-size: 0.75rem; background: #f1f5f9; color: #64748b; padding: 3px 8px; border-radius: 6px; font-weight: bold;}
.reserve-btn { background: #10b981; color: white; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 900; font-size: 0.95rem; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2); white-space: nowrap;}
.reserve-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(16, 185, 129, 0.3); }
.reserve-btn:disabled { background: #cbd5e1; cursor: not-allowed; box-shadow: none; color: #fff;}

.no-goods-tip { text-align: center; color: #94a3b8; padding: 20px 0; font-size: 0.9rem; font-weight: bold; }

/* 抽屉样式保持原样 */
.drawer-content { padding: 30px; height: 100%; display: flex; flex-direction: column; max-width: 480px; margin: 0 auto;}
.drawer-title { font-size: 1.6rem; font-weight: 900; margin: 0 0 25px 0; text-align: center; }
.reserve-confirm-card { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 20px; margin-bottom: 30px; text-align: center;}
.rc-goods { font-size: 1.4rem; font-weight: 900; color: #1e293b; margin-bottom: 10px;}
.rc-station { font-size: 1rem; color: #64748b; font-weight: bold;}
.confirm-zone { margin-top: auto; text-align: center; padding-bottom: 20px; width: 100%;}
.long-press-btn { width: 100%; height: 60px; border-radius: 16px; border: none; font-size: 1.2rem; font-weight: 900; color: #fff; cursor: pointer; transition: 0.2s; box-shadow: 0 10px 25px rgba(0,0,0,0.1);}
.long-press-btn.ready-green { background: linear-gradient(135deg, #10b981, #059669); }
.long-press-btn.ready-green:hover { box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3); transform: translateY(-2px);}
.long-press-btn:disabled { background: #cbd5e1; cursor: not-allowed; box-shadow: none; transform: none;}
.press-tip { font-size: 0.85rem; color: #ef4444; margin-top: 15px; font-weight: bold;}

.success-result-box { text-align: center; padding-top: 20px;}
.success-icon { font-size: 4rem; margin-bottom: 10px; display: inline-block;}
.pulse-glow-green { animation: icon-pulse-green 2s infinite; border-radius: 50%;}
@keyframes icon-pulse-green { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 20px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

.pickup-code-box { margin-top: 15px; background: #ecfdf5; border: 2px dashed #34d399; border-radius: 16px; padding: 20px; text-align: center; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.1); margin-bottom: 20px;}
.pickup-label { color: #059669; font-size: 1rem; font-weight: bold; margin-bottom: 5px; display: block; }
.pickup-code { color: #10b981; font-size: 3rem; font-weight: 900; letter-spacing: 6px; font-family: 'Courier New', Courier, monospace; }

.station-guide { background: #f8fafc; padding: 15px; border-radius: 12px; text-align: left; border: 1px solid #e2e8f0;}
.station-guide p { margin: 0 0 8px 0; font-size: 0.95rem; color: #475569;}

/* 🚨 针对移动端的降级处理：在窄屏下，凭证卡片变为上下堆叠 */
@media screen and (max-width: 768px) {
  .active-voucher-card { flex-direction: column; text-align: center; gap: 15px; padding: 20px; }
  .voucher-left { flex-direction: column; align-items: center; }
  .voucher-right { width: 100%; box-sizing: border-box; }
  .glass-panel { padding: 20px 15px; }
  .station-list { grid-template-columns: 1fr; }
  .main-content { padding: 20px 15px; }
}
</style>
<style>
.sos-drawer .el-drawer__body { padding: 0; background: #fff; }
.sos-drawer { border-radius: 30px 30px 0 0 !important; box-shadow: 0 -10px 40px rgba(0,0,0,0.1) !important;}
</style>