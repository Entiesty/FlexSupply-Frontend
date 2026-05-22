<template>
  <main class="radar-main">
    <div class="top-status" :class="{ 'is-normal': sysMode !== 'EMERGENCY' }">
      <span class="pulse-dot" :class="sysMode === 'EMERGENCY' ? 'dot-emergency' : 'dot-normal'"></span>
      {{ sysMode === 'EMERGENCY' ? '紧急求助雷达 · 爱心商铺响应中心' : '爱心商铺 · 物资捐赠响应平台' }}
      <span v-if="sysMode === 'EMERGENCY'" class="mode-badge">🔴 应急模式</span>
      <span v-else class="mode-badge normal-badge">🟢 常态模式</span>
    </div>

    <div class="radar-wrapper">
      <header class="page-header">
        <h2 v-if="sysMode === 'EMERGENCY'">🔥 紧急求助雷达</h2>
        <h2 v-else>📡 应急雷达 (待命守护中)</h2>
        <p v-if="sysMode === 'EMERGENCY'">指挥中心已向您推送紧急募捐请求，请尽快响应以守护城市生命线</p>
        <p v-else>当前城市物资流转平稳。雷达已进入静默守护状态，当指挥中心拉响应急警报时，此面板将自动激活。</p>
      </header>

      <div class="board-content" v-loading="loading">
        <div v-if="sysMode !== 'EMERGENCY'" class="all-clear glass-card">
          <div class="green-radar"></div>
          <h3 class="text-green">🟢 城市运行于常态模式</h3>
          <p>紧急求助雷达仅在应急模式下激活，当前无需响应募捐请求</p>
        </div>
        <div v-else-if="broadcastList.length === 0" class="all-clear glass-card">
          <div class="green-radar"></div>
          <h3 class="text-green">暂无紧急求助</h3>
          <p>当前没有需要您响应的紧急募捐请求，城市运转平稳</p>
        </div>

        <div v-else class="emergency-grid">
          <div class="emergency-card" v-for="bc in broadcastList" :key="bc.orderId">
            <div class="card-urgency-bar">
              <span class="urgency-level">Lv.{{ bc.urgency || '?' }}</span>
              <span class="pulse-alert"></span>
            </div>

            <div class="card-body">
              <div class="recipient-row">
                <span class="avatar">{{ avatarFor(bc.recipientTag) }}</span>
                <div>
                  <div class="recipient-name">{{ bc.recipientName || '求助市民' }}</div>
                  <div class="recipient-tag" v-if="bc.recipientTag">{{ tagLabel(bc.recipientTag) }}</div>
                </div>
              </div>

              <div class="info-rows">
                <div class="info-row">
                  <span>📍</span>
                  {{ bc.doorNumber || resolvedAddresses[bc.orderId] || (bc.lon && bc.lat ? '正在通过卫星解析位置...' : '地址未登记') }}
                </div>
                <div class="info-row"><span>📦</span> 急需：{{ bc.category }}</div>
                <div class="info-row" v-if="bc.urgency >= 8"><span>🔥</span> 高优先级紧急求助</div>
              </div>

              <div v-if="expandedOrderId === bc.orderId" class="response-form">
                <el-divider>填写响应物资</el-divider>
                <el-input v-model="responseForm.goodsName" size="large" placeholder="物资名称，如：金龙鱼大米 5kg" class="rf-input" />
                <div class="rf-row">
                  <el-input-number v-model="responseForm.stock" :min="1" :max="999" size="large" placeholder="数量" style="flex:1;" />
                  <el-select v-model="responseForm.unit" size="large" style="width:120px;">
                    <el-option v-for="u in units" :key="u" :label="u" :value="u" />
                  </el-select>
                </div>
                <el-input v-model="responseForm.estimatedValue" size="large" placeholder="估值(元)">
                  <template #prepend>¥</template>
                </el-input>
                <div class="rf-row">
                  <el-select v-model="responseForm.weightLevel" size="large" style="flex:1;">
                    <el-option v-for="w in weightOpts" :key="w.value" :label="w.label" :value="w.value" />
                  </el-select>
                  <el-select v-model="responseForm.volumeLevel" size="large" style="flex:1;">
                    <el-option v-for="v in volumeOpts" :key="v.value" :label="v.label" :value="v.value" />
                  </el-select>
                </div>
                <div class="rf-actions">
                  <el-button @click="expandedOrderId = null">取消</el-button>
                  <el-button type="danger" @click="handleRespond(bc)" :disabled="!responseForm.goodsName.trim()">
                    ⚡ 确认响应，点对点直达
                  </el-button>
                </div>
              </div>
            </div>

            <div class="card-footer" v-if="expandedOrderId !== bc.orderId">
              <button class="respond-btn" @click="openRespondForm(bc)">⚡ 立即响应</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { checkMyEmergencyBroadcast } from '@/api/dispatch'
import { respondSos } from '@/api/trade'
import { getCurrentConfig } from '@/api/config'
// ✅ 引入高德地图引擎
import AMapLoader from '@amap/amap-jsapi-loader'

const loading = ref(false)
const broadcastList = ref([])
const sysMode = ref('NORMAL')
const expandedOrderId = ref(null)
let pollTimer = null

// ✅ 新增：逆地理编码缓存池与解析逻辑
const resolvedAddresses = reactive({})
let geocoderInstance = null

const initGeocoder = () => {
  window._AMapSecurityConfig = { securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE }
  AMapLoader.load({
    key: import.meta.env.VITE_AMAP_KEY,
    version: '2.0',
    plugins: ['AMap.Geocoder']
  }).then((AMap) => {
    geocoderInstance = new AMap.Geocoder({ radius: 1000 })
  }).catch(() => {})
}

const resolveAddress = (lon, lat, orderId) => {
  if (!geocoderInstance || !lon || !lat) return
  if (resolvedAddresses[orderId]) return // 已解析过则跳过

  geocoderInstance.getAddress([lon, lat], (status, result) => {
    if (status === 'complete' && result.info === 'OK') {
      resolvedAddresses[orderId] = result.regeocode.formattedAddress
    } else {
      resolvedAddresses[orderId] = '地址解析失败，附近无标志性建筑'
    }
  })
}

const units = ['件', '箱', '袋', '瓶', '公斤', '升', '份', '包']
const responseForm = reactive({ goodsName: '', stock: 1, unit: '件', estimatedValue: 0, weightLevel: 1, volumeLevel: 1 })
const weightOpts = [{ value:1, label:'🛍️ 轻量 <5kg' }, { value:2, label:'🛵 标准 5-20kg' }, { value:3, label:'🚗 重载 >20kg' }]
const volumeOpts = [{ value:1, label:'👜 小件' }, { value:2, label:'📦 中件' }, { value:3, label:'🚛 大件' }]

const avatarFor = (tag) => {
  const map = { ELDERLY: '👴', DISABLED: '👩‍🦽', SAN_WORKER: '🧹', NORMAL: '👤' }
  return map[tag] || '👤'
}
const tagLabel = (tag) => {
  const map = { ELDERLY: '需照顾老人', DISABLED: '残障人士', SAN_WORKER: '环卫工人', NORMAL: '普通市民' }
  return map[tag] || tag
}

const openRespondForm = (bc) => {
  Object.assign(responseForm, { goodsName: '', stock: 1, unit: '件', estimatedValue: 0, weightLevel: 1, volumeLevel: 1 })
  expandedOrderId.value = bc.orderId
}

const handleRespond = async (bc) => {
  if (!responseForm.goodsName.trim()) return ElMessage.warning('请填写响应物资名称')
  try {
    await respondSos({
      orderId: bc.orderId,
      goodsName: responseForm.goodsName,
      category: bc.category || '应急物资',
      stock: responseForm.stock,
      unit: responseForm.unit,
      expirationDate: '2099-12-31 23:59:59',
      weightLevel: responseForm.weightLevel,
      volumeLevel: responseForm.volumeLevel,
      goodsImageUrl: '/img/default.png',
      estimatedValue: responseForm.estimatedValue || 0
    })
    expandedOrderId.value = null
    ElNotification.success({ title: '✅ 响应成功', message: '物资将点对点直达受赠方，感谢您的爱心！' })
    // 立即刷新列表，已接单的广播会在后端被清除
    await fetchBroadcasts()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '响应失败')
  }
}

const fetchBroadcasts = async () => {
  try {
    const res = await checkMyEmergencyBroadcast()
    if (res?.data) {
      broadcastList.value = Array.isArray(res.data) ? res.data : []

      // ✅ 新增逻辑：遍历广播列表，自动去高德解析那些只有坐标没有门牌号的记录
      broadcastList.value.forEach(bc => {
        if (!bc.doorNumber && bc.lon && bc.lat) {
          resolveAddress(bc.lon, bc.lat, bc.orderId)
        }
      })
    }
  } catch (e) { /* silent */ }
}

const startPolling = () => {
  if (pollTimer) return
  fetchBroadcasts()
  pollTimer = setInterval(fetchBroadcasts, 5000)
}
const stopPolling = () => {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  broadcastList.value = []
}

const onModeChanged = (e) => {
  if (!e.detail?.mode) return
  sysMode.value = e.detail.mode
  if (e.detail.mode === 'EMERGENCY') startPolling()
  else stopPolling()
}

onMounted(async () => {
  initGeocoder() // ✅ 组件挂载时第一时间加载高德解析引擎
  try { const r = await getCurrentConfig(); if (r?.data?.sysMode) sysMode.value = r.data.sysMode } catch (e) {}
  if (sysMode.value === 'EMERGENCY') startPolling()
  window.addEventListener('mode-changed', onModeChanged)
})

onUnmounted(() => {
  stopPolling()
  window.removeEventListener('mode-changed', onModeChanged)
})
</script>

<style scoped>
.radar-main { flex: 1; display: flex; flex-direction: column; padding: 40px; background: #f1f5f9; min-height: 100vh; }
.top-status { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; color: #ef4444; font-weight: bold; font-size: 0.85rem; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); padding: 10px 20px; border-radius: 20px; align-self: flex-start; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.top-status.is-normal { color: #475569; }
.mode-badge { background: #fef2f2; color: #dc2626; padding: 2px 10px; border-radius: 12px; font-size: 0.8rem; }
.normal-badge { background: #f0fdf4; color: #059669; }
.pulse-dot { width: 8px; height: 8px; border-radius: 50%; }
.dot-emergency { background: #ef4444; box-shadow: 0 0 8px #ef4444; animation: pulse-red 2s infinite; }
.dot-normal { background: #10b981; box-shadow: 0 0 8px #10b981; animation: pulse-green 2s infinite; }
@keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 70% { box-shadow: 0 0 0 6px rgba(239,68,68,0); } 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } }
@keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); } 70% { box-shadow: 0 0 0 6px rgba(16,185,129,0); } 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); } }

.radar-wrapper { max-width: 960px; width: 100%; margin: 0 auto; }
.page-header { margin-bottom: 28px; }
.page-header h2 { color: #1e293b; font-size: 2rem; margin: 0 0 6px; font-weight: 900; }
.page-header p { color: #64748b; margin: 0; font-size: 1rem; }

.glass-card { background: rgba(255,255,255,0.85); backdrop-filter: blur(15px); border-radius: 24px; padding: 60px 40px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.04); border: 1px solid #fff; }
.all-clear { }
.text-green { color: #10b981; font-size: 1.5rem; font-weight: 900; margin: 16px 0 8px; }
.green-radar { width: 80px; height: 80px; margin: 0 auto; border-radius: 50%; border: 4px solid #d1fae5; border-top-color: #10b981; animation: spin-radar 2s linear infinite; }
@keyframes spin-radar { 100% { transform: rotate(360deg); } }

.emergency-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px; }

.emergency-card { background: rgba(255,255,255,0.85); backdrop-filter: blur(15px); border-radius: 24px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.05); border: 1px solid rgba(239,68,68,0.15); transition: 0.3s; position: relative; }
.emergency-card:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.3); }

.card-urgency-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: linear-gradient(90deg, #fef2f2, #fff7ed); border-bottom: 1px solid #fee2e2; }
.urgency-level { background: #ef4444; color: #fff; padding: 3px 12px; border-radius: 14px; font-size: 0.8rem; font-weight: 900; }
.pulse-alert { width: 10px; height: 10px; background: #ef4444; border-radius: 50%; box-shadow: 0 0 12px #ef4444; animation: pulse-red 1.5s infinite; }

.card-body { padding: 20px; }
.recipient-row { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
.avatar { font-size: 2rem; }
.recipient-name { font-weight: 900; color: #1e293b; font-size: 1.15rem; }
.recipient-tag { font-size: 0.8rem; color: #f97316; font-weight: bold; }

.info-rows { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.info-row { color: #475569; font-size: 0.95rem; }
.info-row span { margin-right: 4px; }

.response-form { margin-top: 12px; display: flex; flex-direction: column; gap: 12px; background: #f8fafc; border-radius: 16px; padding: 16px; }
.rf-input { }
.rf-row { display: flex; gap: 10px; }
.rf-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }

.card-footer { padding: 0 20px 20px; }
.respond-btn { width: 100%; padding: 14px; border: none; border-radius: 16px; background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; font-size: 1.05rem; font-weight: 900; cursor: pointer; transition: 0.3s; box-shadow: 0 6px 20px rgba(239,68,68,0.3); }
.respond-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(239,68,68,0.45); filter: brightness(1.1); }
</style>