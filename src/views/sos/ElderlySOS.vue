<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot" :class="{'locating': locationText.includes('正在获取')}"></span>
      📍 {{ locationText }}
    </div>

    <div class="sos-wrapper">
      <header class="page-header">
        <div class="header-text">
          <h2>🚨 紧急呼救大舱</h2>
          <p>遇到困难请别怕，社区与志愿者随时在您身边</p>
        </div>
      </header>

      <div class="glass-panel" v-loading="loading">
        <div class="user-info-bar">
          <div class="avatar-wrap">
            <img v-if="userInfo.avatar" :src="userInfo.avatar" class="avatar-img" alt="avatar" />
            <span v-else class="avatar">👴</span>
          </div>
          <div class="greeting">
            <h3>{{ userInfo.username || '加载中...' }}，您好！</h3>
            <p>请选择您今天需要的帮助类型</p>
          </div>
        </div>

        <div class="divider"></div>

        <div class="sos-actions" v-if="!activeOrder">
          <div class="sos-card urgent" @click="openDrawer('医疗与特需', ['感冒发烧', '降压/心脏药', '外伤处理', '营养补品'], 10)">
            <div class="card-icon-wrap"><span class="card-icon">💊</span></div>
            <div class="card-text"><h3>我需要药</h3><p>急救药物 / 常备用药 (极高优)</p></div>
            <div class="sos-arrow">〉</div>
          </div>

          <div class="sos-card food" @click="openDrawer('粮油副食', ['热乎盒饭', '米面粮油', '方便食品', '生鲜水果'], 7)">
            <div class="card-icon-wrap"><span class="card-icon">🍚</span></div>
            <div class="card-text"><h3>我要吃饭</h3><p>餐食 / 饮水 / 基础粮油 (高优)</p></div>
            <div class="sos-arrow">〉</div>
          </div>

          <div class="sos-card warm" @click="openDrawer('应急与生活', ['防寒衣物', '棉被毯子', '暖贴/取暖', '生活用品'], 3)">
            <div class="card-icon-wrap"><span class="card-icon">🧥</span></div>
            <div class="card-text"><h3>生活困难</h3><p>防寒 / 保暖 / 日用物资 (普通)</p></div>
            <div class="sos-arrow">〉</div>
          </div>
        </div>

        <div class="status-board" v-else>
          <div class="status-header">
            <div class="radar-spinner"></div>
            <h3 class="status-title">您的求助正在处理中</h3>
          </div>
          <div class="active-detail">
            <p class="detail-label">求助内容：</p>
            <p class="detail-value">{{ getShortDesc(activeOrder.description) || activeOrder.requiredCategory }}</p>
            <p class="order-sn">系统单号: {{ activeOrder.orderSn }}</p>
          </div>

          <div class="timeline">
            <div class="timeline-item" :class="{ active: activeOrder.status >= 0 }">
              <div class="dot"></div><div class="content"><h4>1. 社区已收到</h4><p>正在为您寻找距离最近的物资与志愿者</p></div>
            </div>
            <div class="timeline-item" :class="{ active: activeOrder.status >= 1 }">
              <div class="dot"></div>
              <div class="content">
                <h4>2. 志愿者在路上</h4>
                <p>爱心使者已出发，正飞奔向您</p>

                <div v-if="activeOrder.status >= 1" class="rider-contact-box">
                  <div class="rc-info">
                    <span class="rc-avatar">🚴</span>
                    <span class="rc-name">爱心志愿者为您服务</span>
                  </div>
                  <a :href="'tel:' + (activeOrder.volunteerPhone || '13800138000')" class="rc-call-btn">📞 一键拨号</a>
                </div>
              </div>
            </div>
            <div class="timeline-item" :class="{ active: activeOrder.status >= 2 }">
              <div class="dot"></div><div class="content"><h4>3. 物资已送达</h4><p>请您确认是否收到物资</p></div>
            </div>
          </div>

          <div class="action-btns">
            <button class="refresh-btn" @click="fetchActiveOrder">刷新最新进度</button>
            <button class="cancel-btn" @click="handleCancel" v-if="activeOrder.status === 0">撤销求助</button>
          </div>
        </div>
      </div>
    </div>

    <el-drawer v-model="drawerVisible" direction="btt" size="70%" :with-header="false" custom-class="sos-drawer">
      <div class="drawer-content">
        <h3 class="drawer-title">具体需要哪种物资？</h3>
        <div class="sub-category-grid">
          <button v-for="sub in currentSubCategories" :key="sub" class="sub-item" :class="{ active: selectedSub === sub }" @click="selectedSub = sub">
            {{ sub }}
          </button>
        </div>
        <div class="confirm-zone">
          <div class="selected-status" :class="{'is-selected': selectedSub}">
            {{ selectedSub ? `确认需要：${selectedSub}` : '请先点击上方的一项' }}
          </div>
          <button class="long-press-btn" :class="{'disabled': !selectedSub}"
                  @mousedown="startPress" @mouseup="cancelPress" @mouseleave="cancelPress"
                  @touchstart="startPress" @touchend="cancelPress">
            <div class="press-progress" :style="{ width: pressProgress + '%' }"></div>
            <span class="btn-text">
              <template v-if="!selectedSub">等待选择物资</template>
              <template v-else-if="pressProgress > 0">请按住不要松开...</template>
              <template v-else>长按 2 秒呼救</template>
            </span>
          </button>
          <p class="press-tip">长按大按钮是为了防止您不小心点错</p>
        </div>
      </div>
    </el-drawer>
  </main>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus'
import { publishDemand, getMyActiveSos, cancelDemand } from '@/api/trade'
import { getUserProfile } from '@/api/user'

const route = useRoute()
const loading = ref(false)
const activeOrder = ref(null)
const userInfo = ref({})
let timer = null

const currentLon = ref(null)
const currentLat = ref(null)
const locationText = ref('正在初始化定位系统...')

const drawerVisible = ref(false)
const currentSubCategories = ref([])
const currentMainCat = ref('')
const currentUrgency = ref(1)
const selectedSub = ref('')

const pressProgress = ref(0)
let pressTimer = null

// 提取真实的短描述（过滤掉后面拼接的门牌号）
const getShortDesc = (desc) => {
  if (!desc) return ''
  return desc.split(' | ')[0]
}

// 语音播报 API
const playVoiceFeedback = (text) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9 // 语速调慢，适合老人
    utterance.pitch = 1.0
    window.speechSynthesis.speak(utterance)
  }
}

const fetchUserInfo = async () => {
  try {
    const res = await getUserProfile()
    if (res.data) userInfo.value = res.data
  } catch (e) { console.error('获取用户信息失败', e) }
}

const fetchActiveOrder = async () => {
  try {
    const res = await getMyActiveSos()
    activeOrder.value = res.data || null
  } catch (e) {}
}

const initRealLocation = () => {
  locationText.value = '正在获取物理定位...'
  if (!navigator.geolocation) { useFallbackLocation('设备不支持定位'); return }
  navigator.geolocation.getCurrentPosition(
      (position) => { currentLon.value = position.coords.longitude; currentLat.value = position.coords.latitude; locationText.value = '已获取高精度定位' },
      (error) => { useFallbackLocation('信号弱或未授权') },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  )
}

const useFallbackLocation = (reason) => {
  if (userInfo.value.currentLon && userInfo.value.currentLat) {
    currentLon.value = userInfo.value.currentLon; currentLat.value = userInfo.value.currentLat; locationText.value = `常住地址定位 (${reason})`
  } else {
    currentLon.value = 118.092000; currentLat.value = 24.485000; locationText.value = `系统默认定位 (${reason})`
  }
}

onMounted(async () => {
  await fetchUserInfo()
  initRealLocation()
  await fetchActiveOrder()
  timer = setInterval(fetchActiveOrder, 5000)

  // 监听“再来一单”传过来的参数
  if (route.query.reorder && route.query.cat) {
    openDrawer(route.query.cat, [route.query.reorder], 5)
    selectedSub.value = route.query.reorder
  }
})

onUnmounted(() => { if (timer) clearInterval(timer) })

const openDrawer = (mainCat, subs, urgency) => {
  if (!currentLon.value || !currentLat.value) { ElMessage.warning('正在努力获取您的位置，请稍候一秒再试...'); return }
  currentMainCat.value = mainCat; currentSubCategories.value = subs; currentUrgency.value = urgency; selectedSub.value = ''; pressProgress.value = 0; drawerVisible.value = true
}

const startPress = (e) => {
  e.preventDefault(); if (!selectedSub.value) return; pressProgress.value = 0
  pressTimer = setInterval(() => {
    pressProgress.value += 4
    if (pressProgress.value >= 100) { clearInterval(pressTimer); handleFinalSubmit() }
  }, 100)
}
const cancelPress = () => { if (pressTimer) clearInterval(pressTimer); pressProgress.value = 0 }

const handleFinalSubmit = async () => {
  drawerVisible.value = false
  loading.value = true

  // 将老人的详细门牌号和健康备注，硬拼接到描述里发给骑手！
  const doorStr = userInfo.value.doorNumber ? ` | 门牌: ${userInfo.value.doorNumber}` : ' | 门牌: 未填'
  const remarkStr = userInfo.value.healthRemark ? ` | 备注: ${userInfo.value.healthRemark}` : ''
  const fullDescription = `${selectedSub.value}${doorStr}${remarkStr}`

  const demandData = {
    requiredCategory: currentMainCat.value,
    urgencyLevel: currentUrgency.value, // 🚨 这里把 10, 7, 3 传给了后端！
    targetLon: currentLon.value,
    targetLat: currentLat.value,
    description: fullDescription
  }

  try {
    await publishDemand(demandData)
    // 触发语音播报安抚长者
    playVoiceFeedback(`求救已发出，请安心等待，爱心志愿者马上就来。`)

    ElNotification({
      title: '✅ 呼救成功',
      message: `<div style="font-size: 1.2rem; margin-top:10px;">您需要的 <b>【${selectedSub.value}】</b> 社区已收到！<br/>请安心等待，志愿者马上就来！</div>`,
      dangerouslyUseHTMLString: true,
      type: 'success',
      duration: 8000
    })
    await fetchActiveOrder()
  } catch (e) {
    playVoiceFeedback(`哎呀，网络好像出问题了，请您直接拨打社区电话求助。`)
    ElMessage.error('网络不太好，请打社区电话求助哦')
  } finally {
    pressProgress.value = 0; loading.value = false
  }
}

const handleCancel = () => {
  ElMessageBox.confirm('是否确定撤销本次求助？撤销后志愿者将停止配送。', '温馨提示', { confirmButtonText: '确定撤销', cancelButtonText: '我点错了', type: 'warning', customClass: 'elderly-msg-box' }).then(async () => {
    try { loading.value = true; await cancelDemand(activeOrder.value.orderId); ElMessage.success('求助已成功撤销！'); activeOrder.value = null } catch (error) {} finally { loading.value = false }
  }).catch(() => {})
}
</script>

<style scoped>
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 40px; background: #f1f5f9; min-height: 100vh; overflow-y: auto;}
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); font-weight: bold;}
.pulse-dot { width: 10px; height: 10px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; animation: pulse-green 2s infinite; }
.pulse-dot.locating { background: #f97316; box-shadow: 0 0 8px #f97316; animation: pulse-orange 1.5s infinite; }
@keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
@keyframes pulse-orange { 0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(249, 115, 22, 0); } 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); } }

.sos-wrapper { max-width: 900px; margin: 0 auto; width: 100%; padding-bottom: 50px;}
.page-header h2 { color: #ef4444; font-size: 2.2rem; margin: 0 0 8px 0; font-weight: 900; letter-spacing: 1px; }
.page-header p { color: #64748b; font-size: 1.1rem; margin: 0 0 25px 0; }

.glass-panel { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 24px; padding: 35px 40px; box-shadow: 0 15px 35px rgba(0,0,0,0.06); border: 1px solid #fff; }

.user-info-bar { display: flex; align-items: center; gap: 20px; }
.avatar-wrap { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 4px; border-radius: 50%; box-shadow: 0 4px 10px rgba(249, 115, 22, 0.3); display: flex; align-items: center; justify-content: center;}
.avatar { display: block; font-size: 2.5rem; background: #fff; border-radius: 50%; width: 55px; height: 55px; line-height: 55px; text-align: center; }
.avatar-img { width: 55px; height: 55px; border-radius: 50%; border: 2px solid #fff; object-fit: cover; }
.greeting h3 { margin: 0 0 5px; font-size: 1.5rem; color: #1e293b; font-weight: 900; }
.greeting p { margin: 0; font-size: 1.05rem; color: #64748b; font-weight: bold;}

.divider { height: 1px; background: #f1f5f9; margin: 25px 0; }

.sos-actions { display: flex; flex-direction: column; gap: 20px; }
.sos-card { display: flex; align-items: center; background: #fff; border-radius: 20px; padding: 25px; box-shadow: 0 8px 25px rgba(0,0,0,0.03); cursor: pointer; transition: all 0.3s; border: 2px solid transparent; }
.sos-card:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(0,0,0,0.06); }
.sos-card:active { transform: scale(0.98); }
.card-icon-wrap { width: 75px; height: 75px; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin-right: 20px; flex-shrink: 0; }
.card-icon { font-size: 3rem; }
.card-text { flex: 1; }
.card-text h3 { margin: 0 0 8px; font-size: 1.7rem; font-weight: 900; color: #1e293b; }
.card-text p { margin: 0; font-size: 1.1rem; color: #64748b; font-weight: 500; }
.sos-arrow { font-size: 1.8rem; color: #cbd5e1; padding-left: 10px; font-weight: bold; }

.urgent { border-color: #ffe4e6; } .urgent .card-icon-wrap { background: #fff1f2; } .urgent:hover { border-color: #fca5a5; }
.food { border-color: #ffedd5; } .food .card-icon-wrap { background: #fff7ed; } .food:hover { border-color: #fdba74; }
.warm { border-color: #e0f2fe; } .warm .card-icon-wrap { background: #f0f9ff; } .warm:hover { border-color: #7dd3fc; }

.status-header { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; }
.radar-spinner { width: 28px; height: 28px; border: 4px solid #ffedd5; border-top-color: #f97316; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.status-title { font-size: 1.8rem; color: #ea580c; margin: 0; font-weight: 900; }

.active-detail { background: #fff7ed; padding: 20px; border-radius: 16px; margin-bottom: 30px; border: 1px dashed #fdba74;}
.detail-label { font-size: 1.1rem; color: #ea580c; margin: 0 0 8px; font-weight: bold;}
.detail-value { font-size: 1.5rem; color: #c2410c; margin: 0 0 10px; font-weight: 900;}
.order-sn { margin: 0; color: #fdba74; font-size: 1rem; font-family: monospace; font-weight: bold; }

.timeline { margin-left: 20px; border-left: 4px solid #f1f5f9; padding-left: 30px; }
.timeline-item { position: relative; margin-bottom: 45px; opacity: 0.4; transition: all 0.4s; }
.timeline-item.active { opacity: 1; }
.timeline-item .dot { position: absolute; left: -42px; top: 4px; width: 20px; height: 20px; border-radius: 50%; background: #cbd5e1; border: 4px solid #fff; transition: all 0.4s; }
.timeline-item.active .dot { background: #f97316; box-shadow: 0 0 0 4px #ffedd5; }
.timeline-item h4 { margin: 0 0 8px; font-size: 1.4rem; color: #1e293b; font-weight: 900; }
.timeline-item p { margin: 0; font-size: 1.1rem; color: #64748b; font-weight: bold; }

/* 骑手电话框 */
.rider-contact-box { margin-top: 15px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 15px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.1);}
.rc-info { display: flex; align-items: center; gap: 10px; }
.rc-avatar { font-size: 1.8rem; background: #fff; border-radius: 50%; width: 40px; height: 40px; text-align: center; line-height: 40px;}
.rc-name { font-size: 1.1rem; color: #065f46; font-weight: 900;}
.rc-call-btn { background: #10b981; color: white; text-decoration: none; padding: 10px 18px; border-radius: 10px; font-size: 1.1rem; font-weight: 900; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: 0.2s;}
.rc-call-btn:active { transform: scale(0.95); }

.action-btns { display: flex; gap: 20px; margin-top: 40px;}
.refresh-btn { flex: 2; background: #fff7ed; border: 2px solid #fdba74; padding: 18px; border-radius: 16px; font-size: 1.2rem; color: #ea580c; font-weight: 900; cursor: pointer; transition: all 0.2s; }
.refresh-btn:hover { background: #ffedd5; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(234, 88, 12, 0.15);}
.cancel-btn { flex: 1; background: #f8fafc; border: 2px solid #e2e8f0; padding: 18px; border-radius: 16px; font-size: 1.1rem; color: #64748b; font-weight: bold; cursor: pointer; transition: 0.2s;}
.cancel-btn:hover { background: #f1f5f9; color: #ef4444; border-color: #fca5a5; }

.drawer-content { padding: 30px; height: 100%; display: flex; flex-direction: column; max-width: 800px; margin: 0 auto;}
.drawer-title { font-size: 1.8rem; font-weight: 900; margin: 0 0 25px 0; color: #1e293b; text-align: center; }
.sub-category-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: auto; }
.sub-item { padding: 25px 15px; border-radius: 16px; border: 2px solid #f1f5f9; background: #f8fafc; font-size: 1.3rem; font-weight: bold; color: #475569; transition: 0.2s; cursor: pointer;}
.sub-item.active { border-color: #f97316; background: #fff7ed; color: #ea580c; box-shadow: 0 6px 15px rgba(249,115,22,0.15); transform: scale(1.02);}

.confirm-zone { margin-top: 30px; text-align: center; padding-bottom: 20px;}
.selected-status { font-size: 1.2rem; color: #94a3b8; margin-bottom: 20px; font-weight: bold; min-height: 28px;}
.selected-status.is-selected { color: #ea580c; font-size: 1.4rem;}

.long-press-btn { width: 100%; height: 85px; border-radius: 20px; border: none; background: #cbd5e1; position: relative; overflow: hidden; font-size: 1.6rem; font-weight: 900; color: #fff; cursor: pointer; user-select: none; -webkit-user-select: none; touch-action: manipulation; box-shadow: 0 10px 25px rgba(0,0,0,0.1);}
.long-press-btn:not(.disabled) { background: #94a3b8; }
.press-progress { position: absolute; left: 0; top: 0; height: 100%; background: linear-gradient(90deg, #f97316, #ea580c); transition: width 0.1s linear; z-index: 1; }
.btn-text { position: relative; z-index: 2; letter-spacing: 2px;}
.press-tip { font-size: 1rem; color: #94a3b8; margin-top: 15px; font-weight: bold;}
</style>
<style>
.sos-drawer .el-drawer__body { padding: 0; background: #fff; }
.sos-drawer { border-radius: 30px 30px 0 0 !important; box-shadow: 0 -10px 40px rgba(0,0,0,0.1) !important;}
</style>