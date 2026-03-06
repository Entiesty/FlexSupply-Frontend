<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot"></span> 骑手调度终端在线 · 保持通讯畅通
    </div>

    <div class="tasks-container">
      <header class="page-header">
        <div class="header-left">
          <h2 class="title">🚴 骑手工作台</h2>
          <p class="subtitle">城市护航者，今天也要平安送达哦！</p>
        </div>
        <div class="credit-badge">我的信誉<br><span class="score">{{ myCredit }}</span></div>
      </header>

      <div class="tabs">
        <div class="tab-item" :class="{ active: activeTab === 'available' }" @click="switchTab('available')">
          抢单大厅 <span class="badge" v-if="availableCount">{{ availableCount }}</span>
        </div>
        <div class="tab-item" :class="{ active: activeTab === 'delivering' }" @click="switchTab('delivering')">
          待配送
        </div>
        <div class="tab-item" :class="{ active: activeTab === 'completed' }" @click="switchTab('completed')">
          已完成
        </div>
      </div>

      <div class="task-list" v-loading="loading">
        <el-empty v-if="taskList.length === 0" description="雷达扫描中，暂无相关任务哦~" />

        <div class="task-card" v-for="item in taskList" :key="item.id || item.orderId || item.taskId">
          <div class="card-header">
            <div class="head-info">
              <span class="order-no">#{{ (item.orderNo || item.orderSn || 'ORD-SYS-NEW').slice(-6) }}</span>
              <span class="urgency" :class="'level-' + (item.urgencyLevel || 1)">
                {{ getUrgencyText(item.urgencyLevel) }}
              </span>
            </div>
            <div v-if="activeTab === 'delivering'" class="countdown-badge">⏳ 剩余 28 分钟</div>
            <div v-if="activeTab === 'available'" class="distance-badge">距您 <strong>{{ item.distance || '1.2' }}</strong> km</div>
          </div>

          <div class="card-body">
            <div class="location-box">
              <div class="loc-item">
                <span class="icon from">取</span>
                <div class="loc-text">
                  <div class="loc-name">{{ item.sourceStationName || item.stationName || '涂寨镇社区食物银行' }}</div>
                  <div class="loc-user">{{ item.sourceStationAddress || item.stationAddress || '惠安县涂寨镇政府旁' }}</div>
                </div>
              </div>
              <div class="loc-line"></div>
              <div class="loc-item">
                <span class="icon to">送</span>
                <div class="loc-text">
                  <div class="loc-name">{{ item.receiverAddress || '受赠方安全地址' }}</div>
                  <div class="loc-user">{{ item.receiverName || '求助市民' }} <span class="phone-mask">138****{{ Math.floor(Math.random()*9000)+1000 }}</span></div>
                </div>
              </div>
            </div>

            <div class="material-info">
              <div class="m-box">
                <span class="m-label">📦 核心运载物</span>
                <div class="m-highlight-group">
                  <span class="m-highlight" :title="item.goodsName || item.requiredCategory || '综合应急救助包'">
                    {{ item.goodsName || item.requiredCategory || '综合应急救助包' }}
                  </span>
                  <span class="m-count-badge">需拉取: {{ item.goodsCount || item.stock || 1 }}</span>
                </div>
              </div>
              <div class="m-box">
                <span class="m-label">⚠️ 履约要求</span>
                <span class="m-desc">大件请备货车，拍照核销</span>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <template v-if="activeTab === 'available'">
              <button class="action-btn map-btn">🗺️ 路线预览</button>
              <button class="action-btn grab-btn" @click="handleGrab(item)">⚡ 立即抢单</button>
            </template>
            <template v-if="activeTab === 'delivering'">
              <div class="contact-actions">
                <a :href="'tel:' + (item.stationPhone || '10086')" class="call-btn from-call">📞 联系据点</a>
                <a :href="'tel:' + (item.receiverPhone || '10086')" class="call-btn to-call">📱 联系市民</a>
              </div>
              <button class="action-btn complete-btn" @click="openPhotoModal(item)">📸 拍照核销送达</button>
            </template>
            <template v-if="activeTab === 'completed'">
              <div class="completed-stamp"><span class="stamp-icon">✔️</span> 已送达核销，信誉分 +10</div>
            </template>
          </div>
        </div>
      </div>

      <transition name="fade">
        <div class="photo-modal-overlay" v-if="showPhotoModal">
          <div class="photo-modal-card">
            <div class="modal-header">
              <h3>📸 拍摄送达凭证</h3>
              <p>请将物资放置在指定位置，拍摄清晰的照片以完成闭环核销。</p>
            </div>
            <div class="upload-area" :class="{ 'has-photo': uploadedPhoto }" @click="simulateUpload">
              <template v-if="!uploadedPhoto">
                <div class="upload-icon">📷</div><p>点击调用相机 / 上传凭证</p><span class="upload-tip">支持 JPG/PNG</span>
              </template>
              <img v-else :src="uploadedPhoto" class="preview-img" alt="凭证预览" />
            </div>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="showPhotoModal = false">取消</button>
              <button class="modal-btn confirm" :disabled="!uploadedPhoto" @click="confirmDelivery">🚀 确认送达</button>
            </div>
          </div>
        </div>
      </transition>
      <transition name="bounce">
        <div class="clay-overlay" v-if="showClayPopup">
          <div class="clay-card">
            <div class="clay-icon">🏆</div><h3 class="clay-title">履约成功！</h3><p class="clay-desc">城市的温度，因你而提升</p>
            <div class="clay-score">+10 信誉分</div><button class="clay-btn" @click="closePopup">继续接单</button>
          </div>
        </div>
      </transition>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getAvailableOrders, grabTask, getMyTasks, checkOutTask } from '@/api/trade'

const activeTab = ref('available')
const loading = ref(false)
const taskList = ref([])
const availableCount = ref(0)
const myCredit = ref(120)

const showClayPopup = ref(false)
const showPhotoModal = ref(false)
const uploadedPhoto = ref(null)
const currentDeliveryItem = ref(null)

const switchTab = (tab) => { activeTab.value = tab; fetchData() }
const getUrgencyText = (level) => {
  const map = { 1: '普通求助', 2: '较急求助', 3: '十万火急', 4: '十万火急', 5: '十万火急' }
  return map[level] || '紧急救援'
}

const fetchData = async () => {
  loading.value = true; taskList.value = []
  try {
    if (activeTab.value === 'available') {
      const res = await getAvailableOrders(); taskList.value = res.data?.records || res.data || []; availableCount.value = taskList.value.length
    } else if (activeTab.value === 'delivering') {
      const res = await getMyTasks({ status: 1 }); taskList.value = res.data?.records || res.data || []
    } else if (activeTab.value === 'completed') {
      const res = await getMyTasks({ status: 3 }); taskList.value = res.data?.records || res.data || []
    }
  } catch (e) { console.error(e) } finally { loading.value = false }
}

const handleGrab = async (item) => {
  try {
    const id = item.id || item.orderId
    await grabTask(id)
    ElMessage.success({ message: '抢单成功！请立即前往据点取货', duration: 3000 })
    switchTab('delivering')
  } catch (e) {
    const backendMsg = e.response?.data?.message || e.response?.data?.msg
    if (!backendMsg) ElMessage.warning('抢单失败：该任务已被其他骑手接下')
  }
}

const openPhotoModal = (item) => { currentDeliveryItem.value = item; uploadedPhoto.value = null; showPhotoModal.value = true }
const simulateUpload = () => {
  if (uploadedPhoto.value) return
  ElMessage.info('正在调用摄像头...')
  setTimeout(() => { uploadedPhoto.value = 'https://images.unsplash.com/photo-1585832770485-e68a5dbcf525?auto=format&fit=crop&q=80&w=400&h=300'; ElMessage.success('凭证上传成功') }, 800)
}
const confirmDelivery = async () => {
  try {
    const id = currentDeliveryItem.value.id || currentDeliveryItem.value.taskId || currentDeliveryItem.value.orderId
    await checkOutTask(id)
    showPhotoModal.value = false; showClayPopup.value = true; myCredit.value += 10
  } catch (e) { ElMessage.error('网络异常，核销失败') }
}
const closePopup = () => { showClayPopup.value = false; switchTab('completed') }

onMounted(() => fetchData())
</script>

<style scoped>
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 20px; background: #f8fafc; min-height: 100vh; }
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); font-weight: bold;}
.pulse-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; animation: pulse-green 2s infinite; }
@keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

.tasks-container { max-width: 600px; width: 100%; margin: 50px auto 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.title { font-size: 1.8rem; color: #1e293b; margin: 0 0 5px 0; font-weight: 900; }
.subtitle { margin: 0; font-size: 0.9rem; color: #64748b; }
.credit-badge { background: #fff; color: #64748b; padding: 10px 15px; border-radius: 16px; font-weight: bold; font-size: 0.8rem; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 2px solid #f1f5f9;}
.score { font-size: 1.4rem; color: #f97316; font-weight: 900; font-family: Impact, sans-serif; }

.tabs { display: flex; background: #e2e8f0; border-radius: 16px; padding: 6px; margin-bottom: 25px; }
.tab-item { flex: 1; text-align: center; padding: 12px 0; font-weight: bold; color: #64748b; border-radius: 12px; cursor: pointer; transition: all 0.3s; position: relative; font-size: 0.95rem; }
.tab-item.active { background: #fff; color: #3b82f6; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
.badge { position: absolute; top: 4px; right: 12%; background: #ef4444; color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 10px; border: 2px solid #fff;}

.task-list { display: flex; flex-direction: column; gap: 20px; }
.task-card { background: #fff; border-radius: 24px; padding: 24px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04); border: 1px solid #f1f5f9; transition: transform 0.2s; overflow: hidden; }
.task-card:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(0, 0, 0, 0.08); }

.card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #f1f5f9; padding-bottom: 15px; margin-bottom: 20px; }
.head-info { display: flex; align-items: center; gap: 10px; }
.order-no { font-family: monospace; color: #94a3b8; font-weight: bold; font-size: 1.1rem; }
.urgency { font-weight: bold; padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; }
.level-1 { background: #ecfdf5; color: #10b981; } .level-2 { background: #fff7ed; color: #f97316; }
.level-3, .level-4, .level-5 { background: #fef2f2; color: #ef4444; animation: blink-red 2s infinite;}
@keyframes blink-red { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }

.countdown-badge { background: #fef2f2; color: #ef4444; font-weight: 900; font-size: 0.85rem; padding: 6px 12px; border-radius: 12px; }
.distance-badge { font-size: 0.9rem; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 8px;}
.distance-badge strong { color: #f97316; font-size: 1.1rem; }

.location-box { position: relative; display: flex; flex-direction: column; gap: 25px; margin-bottom: 20px; }
.loc-item { display: flex; align-items: flex-start; gap: 15px; }
.icon { width: 32px; height: 32px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: bold; z-index: 2; border: 3px solid #fff; }
.from { background: #3b82f6; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.4); }
.to { background: #f97316; box-shadow: 0 4px 10px rgba(249, 115, 22, 0.4); }
.loc-line { position: absolute; left: 15px; top: 30px; bottom: 30px; width: 2px; background: #e2e8f0; z-index: 1; }
.loc-text { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.loc-name { font-weight: 900; color: #1e293b; font-size: 1.1rem; }
.loc-user { font-size: 0.85rem; color: #64748b; display: flex; justify-content: space-between; }
.phone-mask { background: #f1f5f9; padding: 2px 6px; border-radius: 6px; font-family: monospace; font-size: 0.8rem;}

/* 🚨 物资明细区域 */
.material-info { background: #f8fafc; padding: 15px; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 8px; }
.m-box { display: flex; align-items: center; justify-content: space-between; font-size: 0.9rem; }
.m-label { color: #64748b; font-weight: bold; }
.m-highlight-group { display: flex; align-items: center; gap: 8px; }
.m-highlight { font-weight: 900; color: #f97316; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }
.m-count-badge { background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 8px; font-weight: 900; font-size: 0.8rem; border: 1px dashed #fca5a5; white-space: nowrap; }
.m-desc { color: #10b981; font-weight: bold; }

.card-footer { margin-top: 20px; display: flex; gap: 15px; justify-content: flex-end; align-items: center; }
.action-btn { border: none; border-radius: 14px; font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 1rem; flex: 1; padding: 15px 0; }
.map-btn { background: #f1f5f9; color: #475569; flex: 0.5; }
.map-btn:hover { background: #e2e8f0; }
.grab-btn { background: #3b82f6; color: #fff; box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3); }
.grab-btn:hover { background: #2563eb; transform: translateY(-2px); box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4); }

.contact-actions { display: flex; gap: 10px; flex: 0.8; }
.call-btn { flex: 1; text-align: center; text-decoration: none; padding: 12px 0; border-radius: 12px; font-weight: bold; font-size: 0.85rem; transition: 0.2s; }
.from-call { background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; }
.to-call { background: #fff7ed; color: #f97316; border: 1px solid #fed7aa; }
.complete-btn { background: #10b981; color: #fff; box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3); flex: 1.2; }
.complete-btn:hover { background: #059669; transform: translateY(-2px); }
.completed-stamp { font-weight: 900; font-size: 1rem; color: #10b981; background: #ecfdf5; padding: 10px 20px; border-radius: 12px; width: 100%; text-align: center; border: 1px dashed #a7f3d0; }

.photo-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 999; }
.photo-modal-card { width: 320px; background: #fff; border-radius: 28px; padding: 30px 25px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border: 1px solid #f1f5f9; }
.modal-header h3 { margin: 0 0 10px 0; color: #1e293b; font-size: 1.4rem; font-weight: 900; }
.modal-header p { margin: 0 0 20px 0; color: #64748b; font-size: 0.85rem; line-height: 1.5; }
.upload-area { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 20px; height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: 0.3s; margin-bottom: 25px; overflow: hidden; position: relative; }
.upload-area:hover { border-color: #3b82f6; background: #eff6ff; }
.upload-area.has-photo { border-style: solid; border-color: #10b981; padding: 0; }
.upload-icon { font-size: 2.5rem; margin-bottom: 10px; opacity: 0.8; }
.upload-area p { margin: 0; color: #3b82f6; font-weight: bold; font-size: 0.95rem; }
.upload-tip { color: #94a3b8; font-size: 0.75rem; margin-top: 5px; }
.preview-img { width: 100%; height: 100%; object-fit: cover; }

.modal-actions { display: flex; gap: 15px; }
.modal-btn { flex: 1; padding: 14px; border: none; border-radius: 14px; font-weight: bold; font-size: 1rem; cursor: pointer; transition: 0.2s; }
.modal-btn.cancel { background: #f1f5f9; color: #64748b; }
.modal-btn.confirm { background: #10b981; color: #fff; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); }
.modal-btn.confirm:disabled { background: #cbd5e1; color: #94a3b8; box-shadow: none; cursor: not-allowed; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.clay-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.clay-card { width: 280px; background: #f8fafc; border-radius: 36px; padding: 30px 20px; text-align: center; box-shadow: 30px 30px 60px rgba(0, 0, 0, 0.15), -10px -10px 20px rgba(255, 255, 255, 0.8), inset 4px 4px 10px rgba(255, 255, 255, 0.9), inset -4px -4px 15px rgba(0, 0, 0, 0.05); border: 4px solid #ffffff; }
.clay-icon { width: 80px; height: 80px; margin: 0 auto 15px; background: #ffedd5; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 3rem; box-shadow: inset 5px 5px 10px rgba(255, 255, 255, 0.8), inset -5px -5px 10px rgba(234, 88, 12, 0.1), 10px 10px 20px rgba(0, 0, 0, 0.05); }
.clay-title { margin: 0 0 5px; color: #1e293b; font-size: 1.4rem; font-weight: 900; }
.clay-score { margin: 0 auto 25px; padding: 10px; background: #ecfdf5; color: #10b981; font-weight: 900; font-size: 1.5rem; border-radius: 16px; width: fit-content; box-shadow: inset 3px 3px 6px rgba(255, 255, 255, 0.8), inset -3px -3px 6px rgba(16, 185, 129, 0.1); }
.clay-btn { width: 80%; padding: 14px; border: none; border-radius: 20px; background: #3b82f6; color: white; font-size: 1.1rem; font-weight: bold; cursor: pointer; box-shadow: 6px 6px 12px rgba(59, 130, 246, 0.3), inset 3px 3px 8px rgba(255, 255, 255, 0.4), inset -3px -3px 8px rgba(0, 0, 0, 0.1); transition: 0.2s; }
.clay-btn:active { transform: scale(0.96); }
.bounce-enter-active { animation: bounce-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.bounce-leave-active { animation: bounce-in 0.4s reverse; }
@keyframes bounce-in { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
</style>