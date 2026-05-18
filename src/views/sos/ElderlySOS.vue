<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot" :class="{ error: !userInfo.currentLon || userInfo.isVerified === 0 }"></span>
      📍 {{ locationText }}
    </div>

    <div class="sos-wrapper">
      <header class="page-header">
        <h2>🚨 紧急呼救大舱</h2>
        <p>遇到困难请别怕，社区与志愿者随时在您身边</p>
      </header>

      <!-- ===== Step 1: 平急模式动态横幅 ===== -->
      <div class="mode-banner" :class="modeBannerClass">
        <span class="mode-icon">{{ modeBannerIcon }}</span>
        <span class="mode-text">{{ modeBannerText }}</span>
      </div>

      <!-- ===== Step 2: 状态机互斥隔离 ===== -->

      <!-- 状态 A：无进行中订单 → 极简求助表单 -->
      <div v-if="!activeOrder" class="sos-form-area">
        <div class="glass-panel" v-loading="loading" element-loading-text="爱心信号发射中...">
          <div class="user-info-bar">
            <div class="avatar-wrap">
              <img v-if="userInfo.avatar" :src="userInfo.avatar" class="avatar-img" alt="avatar" />
              <span v-else class="avatar">👴</span>
            </div>
            <div class="greeting">
              <h3>
                {{ userInfo.username || '加载中...' }}，您好！
                <span v-if="userInfo.isVerified === 0" class="unverified-tag">身份待核验</span>
              </h3>
              <p>请选择您今天需要送上门的物资类型</p>
            </div>
          </div>

          <div class="divider"></div>

          <div class="sos-actions">
            <div class="sos-card urgent" @click="openDrawer('医疗健康', ['常备药品', '外用急救', '医疗器械', '营养补品'], 10)">
              <div class="card-icon-wrap"><span class="card-icon">💊</span></div>
              <div class="card-text"><h3>医疗健康</h3><p>慢性病药 / 急救用品 / 营养补品</p></div>
              <div class="sos-arrow">〉</div>
            </div>

            <div class="sos-card food" @click="openDrawer('食品与饮料', ['米面粮油', '方便速食', '饮用水', '热食盒饭', '烘焙糕点', '生鲜果蔬', '冷冻食品', '乳制品'], 6)">
              <div class="card-icon-wrap"><span class="card-icon">🍚</span></div>
              <div class="card-text"><h3>食品与饮料</h3><p>米面粮油 / 速食 / 饮用水 / 热食</p></div>
              <div class="sos-arrow">〉</div>
            </div>

            <div class="sos-card warm" @click="openDrawer('生活日用', ['卫生护理', '防寒保暖', '寝具家纺', '洗漱用品', '纸品耗材'], 3)">
              <div class="card-icon-wrap"><span class="card-icon">🧹</span></div>
              <div class="card-text"><h3>生活日用</h3><p>卫生护理 / 防寒保暖 / 洗漱用品</p></div>
              <div class="sos-arrow">〉</div>
            </div>

            <div class="sos-card emergency-card" @click="openDrawer('应急物资', ['应急食品', '应急照明', '防护装备', '保暖物资'], 9)">
              <div class="card-icon-wrap"><span class="card-icon">🚨</span></div>
              <div class="card-text"><h3>应急物资</h3><p>应急食品 / 照明 / 防护装备</p></div>
              <div class="sos-arrow">〉</div>
            </div>
          </div>

          <p class="form-footnote">💡 选择物资大类后，将为您匹配最近的社区驿站与爱心骑士</p>
        </div>
      </div>

      <!-- 状态 B：有进行中订单 → 履约追踪看板 -->
      <div v-else class="tracking-area">
        <div class="tracking-header-card">
          <div class="th-left">
            <div class="th-icon-wrap"><span class="th-icon">📡</span></div>
            <div class="th-text">
              <h3>您的求助已发送</h3>
              <p>社区引擎正在为您匹配最近的物资与志愿者</p>
            </div>
          </div>
          <span class="th-badge">单号 {{ activeOrder.orderSn }}</span>
        </div>

        <!-- Step 3: 时间轴 SaaS 卡片 -->
        <div class="timeline-card">
          <div class="tc-header">📋 履约进度</div>
          <div class="tc-body">
            <div class="tl-item" :class="{ active: activeOrder.status >= 0 }">
              <div class="tl-dot"></div>
              <div class="tl-line"></div>
              <div class="tl-content">
                <h4>1. 社区已收到求助</h4>
                <p>正在为您寻找距离最近的物资与志愿者</p>
              </div>
            </div>
            <div class="tl-item" :class="{ active: activeOrder.status >= 1 }">
              <div class="tl-dot"></div>
              <div class="tl-line"></div>
              <div class="tl-content">
                <h4>2. 志愿者正在路上</h4>
                <p>爱心使者已出发，正飞奔向您</p>
                <div v-if="activeOrder.status >= 1" class="rider-callout">
                  <span class="rc-avatar">🚴</span>
                  <span class="rc-name">爱心志愿者为您服务</span>
                  <a :href="'tel:' + (activeOrder.volunteerPhone || '13800138000')" class="rc-call-btn">📞 一键拨号</a>
                </div>
              </div>
            </div>
            <div class="tl-item" :class="{ active: activeOrder.status >= 2 }">
              <div class="tl-dot"></div>
              <div class="tl-content">
                <h4>3. 物资已送达</h4>
                <p>请您确认是否收到物资</p>
              </div>
            </div>
          </div>
        </div>

        <div class="tracking-actions">
          <button v-if="activeOrder.status === 2" class="confirm-btn pulse-glow" @click="openRatingDrawer">
            📦 物资已送达，点击确认收货
          </button>
          <template v-else>
            <button class="refresh-btn" @click="fetchActiveOrder">🔄 刷新最新进度</button>
            <button class="cancel-btn" v-if="activeOrder.status === 0" @click="handleCancel">撤销求助</button>
          </template>
        </div>
      </div>
    </div>

    <!-- ===== 物资细类选择抽屉 ===== -->
    <el-drawer v-model="drawerVisible" direction="btt" size="55%" :with-header="false" custom-class="sos-drawer">
      <div class="drawer-content">
        <h3 class="drawer-title">具体需要哪种物资？</h3>
        <div class="sub-category-grid">
          <button v-for="sub in currentSubCategories" :key="sub" class="sub-item" :class="{ active: selectedSub === sub }" @click="selectedSub = sub">
            {{ sub }}
          </button>
        </div>

        <div class="confirm-zone">
          <div class="selected-status" :class="{ 'is-selected': selectedSub }">
            {{ selectedSub ? `确认需要：${selectedSub}` : '请先点击上方的一项' }}
          </div>
          <button class="simple-confirm-btn" :class="{ disabled: !selectedSub }" @click="triggerSubmitConfirm">
            <span class="btn-text">{{ selectedSub ? '确认呼叫骑士送货上门' : '等待选择物资' }}</span>
          </button>
        </div>
      </div>
    </el-drawer>

    <!-- ===== 评价抽屉 ===== -->
    <el-drawer v-model="ratingDrawerVisible" direction="btt" size="65%" :with-header="false" custom-class="sos-drawer">
      <div class="drawer-content rating-content">
        <h3 class="drawer-title">您对本次援助满意吗？</h3>
        <p class="rating-sub">您的评价将直接影响志愿者的信誉星级</p>
        <div class="stars-container">
          <span v-for="star in 5" :key="star" class="huge-star" :class="{ 'is-active': ratingForm.rating >= star }" @click="ratingForm.rating = star">★</span>
        </div>
        <div class="rating-text-desc" :class="'color-' + ratingForm.rating">
          {{ ratingTextMap[ratingForm.rating] || '请点击星星打分' }}
        </div>
        <div class="quick-tags" v-if="ratingForm.rating > 0">
          <span class="q-tag" v-for="tag in currentTags" :key="tag" :class="{ active: ratingForm.comment.includes(tag) }" @click="toggleTag(tag)">{{ tag }}</span>
        </div>
        <div class="confirm-zone">
          <button class="simple-confirm-btn" @click="submitRating" :disabled="ratingForm.rating === 0" :class="{ disabled: ratingForm.rating === 0 }">
            <span class="btn-text">提交评价并完成订单</span>
          </button>
        </div>
      </div>
    </el-drawer>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus'
import { publishDemand, getMyActiveSos, cancelDemand, rateOrder } from '@/api/trade'
import { getUserProfile } from '@/api/user'
import { getCurrentConfig } from '@/api/config'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const activeOrder = ref(null)
const userInfo = ref({})
let timer = null

const currentLon = ref(null)
const currentLat = ref(null)
const locationText = ref('正在校验身份与地址...')

// ===== Step 1: 系统平急模式感知 =====
const sysMode = ref('NORMAL')

const modeBannerClass = computed(() => {
  if (sysMode.value === 'EMERGENCY_RESPONSE') return 'mode-emergency'
  if (sysMode.value === 'WARNING_FREEZE') return 'mode-warning'
  return 'mode-normal'
})

const modeBannerIcon = computed(() => {
  if (sysMode.value === 'EMERGENCY_RESPONSE') return '🚨'
  if (sysMode.value === 'WARNING_FREEZE') return '⚠️'
  return '🤝'
})

const modeBannerText = computed(() => {
  if (sysMode.value === 'EMERGENCY_RESPONSE') return '城市处于紧急响应期，启用战时配给制，优先保障生存物资'
  if (sysMode.value === 'WARNING_FREEZE') return '社区进入预警冻结期，物资调配受限，请合理申领'
  return '社区互助快车道，专为行动不便长者开启，爱心骑士随时待命'
})

const fetchSysMode = async () => {
  try {
    const res = await getCurrentConfig()
    if (res.data?.sysMode) sysMode.value = res.data.sysMode
  } catch (e) {}
}

const drawerVisible = ref(false)
const currentSubCategories = ref([])
const currentMainCat = ref('')
const currentUrgency = ref(1)
const selectedSub = ref('')

const ratingDrawerVisible = ref(false)
const ratingForm = reactive({ rating: 0, comment: '' })
const ratingTextMap = { 1: '😡 极度不满', 2: '😞 体验不佳', 3: '😐 普普通通', 4: '😊 比较满意', 5: '😍 非常感谢！' }

const currentTags = computed(() => {
  if (ratingForm.rating >= 4) return ['速度很快', '态度热情', '物资完好', '非常贴心']
  if (ratingForm.rating === 3) return ['中规中矩', '基本满足需求']
  if (ratingForm.rating > 0) return ['送太慢了', '态度不好', '物资有破损', '找不到人']
  return []
})

const getShortDesc = (desc) => {
  if (!desc) return ''
  return desc.split(' | ')[0]
}

const playVoiceFeedback = (text) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9
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

const initLocation = () => {
  if (userInfo.value.currentLon && userInfo.value.currentLat) {
    currentLon.value = userInfo.value.currentLon
    currentLat.value = userInfo.value.currentLat
    locationText.value = '已绑定并锁定家庭住址定位'
  } else {
    locationText.value = '⚠️ 未设置家庭住址，无法呼救'
  }
}

onMounted(async () => {
  await fetchUserInfo()
  initLocation()
  await fetchSysMode()
  await fetchActiveOrder()
  timer = setInterval(fetchActiveOrder, 5000)

  if (route.query.reorder && route.query.cat) {
    openDrawer(route.query.cat, [route.query.reorder], 5)
    selectedSub.value = route.query.reorder
  }
})

onUnmounted(() => { if (timer) clearInterval(timer) })

const openDrawer = (mainCat, subs, urgency) => {
  if (userInfo.value.isVerified === 0) {
    ElMessageBox.alert(
        '您的受赠身份仍在社区审核中，为防止恶意占用医疗物资通道，暂无法发起求助。<br/><br/>如有极其紧急情况，请直接致电居委会！',
        '⚠️ 平台权限受限',
        { dangerouslyUseHTMLString: true, confirmButtonText: '我知道了', type: 'warning', customClass: 'elderly-msg-box' }
    )
    return
  }

  if (!userInfo.value.currentLon || !userInfo.value.currentLat) {
    ElMessageBox.alert(
        '系统检测到您<b>尚未填写家庭住址与门牌号</b>。<br/>为了让骑士能精准将物资送到您家中，请先前往个人中心进行设置！',
        '📍 缺少地址信息',
        {
          dangerouslyUseHTMLString: true,
          confirmButtonText: '去设置地址',
          type: 'error',
          customClass: 'elderly-msg-box',
          callback: () => { router.push('/profile') }
        }
    )
    return
  }

  currentMainCat.value = mainCat;
  currentSubCategories.value = subs;
  currentUrgency.value = urgency;
  selectedSub.value = '';
  drawerVisible.value = true;
}

const triggerSubmitConfirm = () => {
  if (!selectedSub.value) return;

  playVoiceFeedback(`您选择了${selectedSub.value}，请确认呼叫骑士送货。`);

  ElMessageBox.confirm(
      `<div style="text-align:center">
      <div style="font-size:3.5rem; margin-bottom:10px; line-height:1;">🚚</div>
      <h2 style="color:#f97316; margin:0 0 10px; font-size:1.6rem; font-weight:900;">呼叫骑士送货上门</h2>
      <p style="color:#64748b; font-size:1.15rem; margin:0; font-weight:bold;">确定需要系统为您配送【${selectedSub.value}】吗？</p>
    </div>`,
      '确认发出物资求助',
      {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '确定呼叫',
        cancelButtonText: '再想想',
        confirmButtonClass: 'el-button--success huge-btn',
        cancelButtonClass: 'huge-btn-cancel',
        center: true,
        customClass: 'elderly-huge-confirm-box'
      }
  ).then(() => {
    handleFinalSubmit();
  }).catch(() => {})
}

const generateImplicitTags = (subCat, remark) => {
  let tags = []
  if (subCat.includes('药')) tags.push('药品')
  if (subCat.includes('急救')) tags.push('外伤', '急救')
  if (subCat.includes('器械')) tags.push('医疗器械')

  if (subCat === '热食盒饭') tags.push('主食', '速食', '饱腹')
  if (subCat === '米面粮油') tags.push('主食', '饱腹')
  if (subCat === '方便速食') tags.push('速食', '饱腹')
  if (subCat === '生鲜果蔬') tags.push('生鲜', '高维生素')
  if (subCat === '冷冻食品') tags.push('冷冻', '需冷藏保鲜')
  if (subCat === '乳制品') tags.push('需冷藏保鲜')
  if (subCat === '饮用水') tags.push('饮品')

  if (subCat === '卫生护理') tags.push('日用', '女性关怀')
  if (subCat.includes('防寒') || subCat.includes('暖')) tags.push('保暖')
  if (subCat.includes('寝具')) tags.push('日用')
  if (subCat.includes('洗漱')) tags.push('日用')

  if (subCat === '应急食品') tags.push('速食', '饱腹', '应急')
  if (subCat === '应急照明') tags.push('应急', '电子设备')
  if (subCat === '防护装备') tags.push('应急', '防护')
  if (subCat === '保暖物资') tags.push('保暖', '应急')

  if (remark) {
    if (remark.includes('糖')) tags.push('无糖', '低糖', '糖尿病')
    if (remark.includes('压') || remark.includes('心')) tags.push('高血压', '心脏病')
    if (remark.includes('牙') || remark.includes('老') || remark.includes('嚼')) tags.push('易咀嚼')
  }
  return [...new Set(tags)]
}

const handleFinalSubmit = async () => {
  drawerVisible.value = false
  loading.value = true

  const doorStr = userInfo.value.doorNumber ? ` | 门牌: ${userInfo.value.doorNumber}` : ' | 门牌: 未填'
  const remarkStr = userInfo.value.healthRemark ? ` | 备注: ${userInfo.value.healthRemark}` : ''
  const fullDescription = `${selectedSub.value}${doorStr}${remarkStr}`

  const derivedTags = generateImplicitTags(selectedSub.value, userInfo.value.healthRemark)

  try {
    await publishDemand({
      requiredCategory: currentMainCat.value,
      urgencyLevel: currentUrgency.value,
      targetLon: currentLon.value,
      targetLat: currentLat.value,
      description: fullDescription,
      requiredTags: derivedTags,
      deliveryMethod: 1
    })

    playVoiceFeedback('求助已发出，请安心等待骑士送货。')
    ElNotification({
      title: '✅ 请求成功',
      message: `<div style="font-size: 1.1rem; margin-top:5px; line-height:1.5;">您需要的 <b>【${selectedSub.value}】</b> 社区已收到！<br/>骑士将尽快为您送货上门。</div>`,
      dangerouslyUseHTMLString: true,
      type: 'success',
      duration: 8000
    })
    await fetchActiveOrder()
  } catch (e) {
    playVoiceFeedback('哎呀，网络好像出问题了，请您直接拨打社区电话求助。')
    ElMessage.error('网络不太好，请打社区电话求助哦')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  ElMessageBox.confirm('是否确定撤销本次物资求助？', '温馨提示', { confirmButtonText: '确定撤销', cancelButtonText: '我点错了', type: 'warning', customClass: 'elderly-huge-confirm-box' }).then(async () => {
    try { loading.value = true; await cancelDemand(activeOrder.value.orderId); ElMessage.success('订单已成功撤销！'); activeOrder.value = null } catch (error) {} finally { loading.value = false }
  }).catch(() => {})
}

const openRatingDrawer = () => {
  ratingForm.rating = 0
  ratingForm.comment = ''
  ratingDrawerVisible.value = true
}

const toggleTag = (tag) => {
  if (ratingForm.comment.includes(tag)) {
    ratingForm.comment = ratingForm.comment.replace(tag, '').trim()
  } else {
    ratingForm.comment = (ratingForm.comment + ' ' + tag).trim()
  }
}

const submitRating = async () => {
  if (ratingForm.rating === 0) return ElMessage.warning('请至少点亮一颗星星哦')
  loading.value = true
  try {
    await rateOrder({
      orderId: activeOrder.value.orderId,
      rating: ratingForm.rating,
      comment: ratingForm.comment
    })
    ratingDrawerVisible.value = false
    activeOrder.value = null
    playVoiceFeedback('评价成功，感谢您的反馈，祝您身体健康！')
    ElNotification({ title: '爱心流转', message: '本次配送已圆满结束，感谢您的评价！', type: 'success' })
  } catch (e) {
    ElMessage.error('提交失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.main-content {
  flex: 1; display: flex; flex-direction: column; position: relative;
  padding: 40px; background: #f1f5f9; min-height: 100vh; overflow-y: auto;
}
.top-status {
  position: absolute; top: 20px; right: 30px; z-index: 100;
  background: rgba(255,255,255,0.8); backdrop-filter: blur(10px);
  padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; color: #64748b;
  display: flex; align-items: center; gap: 8px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05); font-weight: bold;
}

.pulse-dot {
  width: 10px; height: 10px; background: #10b981; border-radius: 50%;
  box-shadow: 0 0 8px #10b981; animation: pulse-green 2s infinite;
}
.pulse-dot.error {
  background: #ef4444; box-shadow: 0 0 8px #ef4444; animation: pulse-red 1.5s infinite;
}
@keyframes pulse-green {
  0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
  70% { box-shadow: 0 0 0 6px rgba(16,185,129,0); }
  100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
}
@keyframes pulse-red {
  0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
  70% { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
  100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
}

.sos-wrapper { max-width: 900px; margin: 0 auto; width: 100%; padding-bottom: 50px; }
.page-header h2 {
  color: #f97316; font-size: 2.2rem; margin: 0 0 8px 0;
  font-weight: 900; letter-spacing: 1px;
}
.page-header p { color: #64748b; font-size: 1.1rem; margin: 0 0 16px 0; }

/* ===== Step 1: 平急模式动态横幅 ===== */
.mode-banner {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 20px; border-radius: 14px; margin-bottom: 24px;
  font-weight: 800; font-size: 0.95rem; line-height: 1.5;
}
.mode-icon { font-size: 1.4rem; flex-shrink: 0; }
.mode-normal {
  background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af;
}
.mode-warning {
  background: #fffbeb; border: 1px solid #fde68a; color: #92400e;
}
.mode-emergency {
  background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b;
  box-shadow: 0 4px 12px rgba(239,68,68,0.08);
}

/* ===== 状态 A: 求助表单 ===== */
.sos-form-area { animation: fadeIn 0.35s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

.glass-panel {
  background: rgba(255,255,255,0.95); backdrop-filter: blur(10px);
  border-radius: 24px; padding: 35px 40px;
  box-shadow: 0 15px 35px rgba(0,0,0,0.06); border: 1px solid #fff;
}

.user-info-bar { display: flex; align-items: center; gap: 20px; }
.avatar-wrap {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 4px;
  border-radius: 50%; box-shadow: 0 4px 10px rgba(249,115,22,0.3);
  display: flex; align-items: center; justify-content: center;
}
.avatar {
  display: block; font-size: 2.5rem; background: #fff; border-radius: 50%;
  width: 55px; height: 55px; line-height: 55px; text-align: center;
}
.avatar-img { width: 55px; height: 55px; border-radius: 50%; border: 2px solid #fff; object-fit: cover; }
.greeting h3 {
  margin: 0 0 5px; font-size: 1.5rem; color: #1e293b;
  font-weight: 900; display: flex; align-items: center;
}
.greeting p { margin: 0; font-size: 1.05rem; color: #64748b; font-weight: bold; }

.unverified-tag {
  font-size: 0.85rem; background: #fee2e2; color: #ef4444; padding: 4px 10px;
  border-radius: 12px; margin-left: 12px; font-weight: bold;
  border: 1px solid #fca5a5; box-shadow: 0 2px 5px rgba(239,68,68,0.1);
}

.divider { height: 1px; background: #f1f5f9; margin: 25px 0; }

.sos-actions { display: flex; flex-direction: column; gap: 20px; }
.sos-card {
  display: flex; align-items: center; background: #fff; border-radius: 20px;
  padding: 25px; box-shadow: 0 8px 25px rgba(0,0,0,0.03);
  cursor: pointer; transition: all 0.3s; border: 2px solid transparent;
}
.sos-card:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(0,0,0,0.06); }
.sos-card:active { transform: scale(0.98); }

.card-icon-wrap {
  width: 75px; height: 75px; border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  margin-right: 20px; flex-shrink: 0;
}
.card-icon { font-size: 3rem; }
.card-text { flex: 1; }
.card-text h3 { margin: 0 0 8px; font-size: 1.7rem; font-weight: 900; color: #1e293b; }
.card-text p { margin: 0; font-size: 1.1rem; color: #64748b; font-weight: 500; }
.sos-arrow { font-size: 1.8rem; color: #cbd5e1; padding-left: 10px; font-weight: bold; }

.urgent { border-color: #ffe4e6; } .urgent .card-icon-wrap { background: #fff1f2; } .urgent:hover { border-color: #fca5a5; }
.food { border-color: #ffedd5; } .food .card-icon-wrap { background: #fff7ed; } .food:hover { border-color: #fdba74; }
.warm { border-color: #e0f2fe; } .warm .card-icon-wrap { background: #f0f9ff; } .warm:hover { border-color: #7dd3fc; }
.emergency-card { border-color: #fef2f2; } .emergency-card .card-icon-wrap { background: #fef2f2; } .emergency-card:hover { border-color: #f87171; }

.form-footnote {
  text-align: center; margin: 20px 0 0; font-size: 0.85rem;
  color: #94a3b8; font-weight: 500;
}

/* ===== 状态 B: 履约追踪看板 ===== */
.tracking-area { animation: fadeIn 0.35s ease; }

.tracking-header-card {
  display: flex; justify-content: space-between; align-items: center;
  background: #fff; border-radius: 20px; padding: 24px 28px;
  box-shadow: 0 8px 25px rgba(0,0,0,0.03); margin-bottom: 18px;
}
.th-left { display: flex; align-items: center; gap: 16px; }
.th-icon-wrap {
  width: 52px; height: 52px; background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border-radius: 14px; display: flex; align-items: center; justify-content: center;
}
.th-icon { font-size: 1.6rem; }
.th-text h3 { margin: 0 0 4px; font-size: 1.2rem; color: #1e293b; font-weight: 900; }
.th-text p { margin: 0; font-size: 0.9rem; color: #64748b; font-weight: 500; }
.th-badge {
  font-family: monospace; font-size: 0.8rem; background: #f1f5f9;
  color: #475569; padding: 6px 12px; border-radius: 8px; font-weight: 900;
}

/* Step 3: 时间轴卡片 */
.timeline-card {
  background: #fff; border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden;
}
.tc-header {
  padding: 16px 24px; font-size: 0.9rem; font-weight: 900; color: #475569;
  background: #fafbfc; border-bottom: 1px solid #f1f5f9;
}
.tc-body { padding: 28px 32px; }

.tl-item {
  display: flex; gap: 16px; position: relative;
  padding-bottom: 32px; opacity: 0.35; transition: opacity 0.4s;
}
.tl-item:last-child { padding-bottom: 0; }
.tl-item.active { opacity: 1; }

.tl-dot {
  width: 18px; height: 18px; border-radius: 50%;
  background: #cbd5e1; border: 3px solid #fff;
  box-shadow: 0 0 0 2px #e2e8f0; flex-shrink: 0; position: relative; z-index: 1;
  transition: all 0.4s;
}
.tl-item.active .tl-dot {
  background: #f97316; box-shadow: 0 0 0 2px #f97316, 0 0 12px rgba(249,115,22,0.3);
}

.tl-line {
  position: absolute; left: 8px; top: 26px; width: 2px;
  height: calc(100% - 8px); background: #e2e8f0;
}
.tl-item:last-child .tl-line { display: none; }
.tl-item.active .tl-line { background: #f97316; }

.tl-content { flex: 1; min-width: 0; }
.tl-content h4 {
  margin: 0 0 6px; font-size: 1.2rem; color: #1e293b; font-weight: 900;
}
.tl-content p {
  margin: 0; font-size: 0.95rem; color: #64748b; font-weight: 500; line-height: 1.5;
}

.rider-callout {
  margin-top: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px;
  padding: 14px 16px; display: flex; align-items: center; gap: 12px;
}
.rc-avatar { font-size: 1.6rem; flex-shrink: 0; }
.rc-name { font-size: 1rem; color: #065f46; font-weight: 900; flex: 1; }
.rc-call-btn {
  background: #10b981; color: white; text-decoration: none; padding: 10px 18px;
  border-radius: 10px; font-size: 1rem; font-weight: 900; white-space: nowrap;
  box-shadow: 0 4px 12px rgba(16,185,129,0.3); transition: 0.2s;
}
.rc-call-btn:active { transform: scale(0.95); }

/* 操作按钮区 */
.tracking-actions {
  display: flex; gap: 16px; margin-top: 24px;
}
.confirm-btn {
  width: 100%; background: linear-gradient(135deg, #10b981, #059669);
  color: white; border: none; padding: 20px; border-radius: 16px;
  font-size: 1.3rem; font-weight: 900; cursor: pointer; transition: 0.3s;
}
.pulse-glow {
  animation: btn-pulse 2s infinite; box-shadow: 0 0 20px rgba(16,185,129,0.6);
}
@keyframes btn-pulse {
  0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); }
}
.refresh-btn {
  flex: 2; background: #fff7ed; border: 2px solid #fdba74; padding: 18px;
  border-radius: 16px; font-size: 1.15rem; color: #ea580c; font-weight: 900;
  cursor: pointer; transition: all 0.2s;
}
.refresh-btn:hover { background: #ffedd5; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(234,88,12,0.15); }
.cancel-btn {
  flex: 1; background: #f8fafc; border: 2px solid #e2e8f0; padding: 18px;
  border-radius: 16px; font-size: 1.05rem; color: #64748b; font-weight: bold;
  cursor: pointer; transition: 0.2s;
}
.cancel-btn:hover { background: #f1f5f9; color: #ef4444; border-color: #fca5a5; }

/* ===== 抽屉 ===== */
.drawer-content {
  padding: 30px; height: 100%; display: flex; flex-direction: column;
  max-width: 800px; margin: 0 auto;
}
.drawer-title {
  font-size: 1.8rem; font-weight: 900; margin: 0 0 25px 0; color: #1e293b; text-align: center;
}
.sub-category-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 25px; }
.sub-item {
  padding: 25px 15px; border-radius: 16px; border: 2px solid #f1f5f9;
  background: #f8fafc; font-size: 1.3rem; font-weight: bold; color: #475569;
  transition: 0.2s; cursor: pointer;
}
.sub-item.active {
  border-color: #f97316; background: #fff7ed; color: #ea580c;
  box-shadow: 0 6px 15px rgba(249,115,22,0.15); transform: scale(1.02);
}

.confirm-zone { margin-top: auto; text-align: center; padding-bottom: 20px; width: 100%; }
.selected-status { font-size: 1.2rem; color: #94a3b8; margin-bottom: 20px; font-weight: bold; min-height: 28px; }
.selected-status.is-selected { color: #ea580c; font-size: 1.4rem; }

.simple-confirm-btn {
  width: 100%; padding: 22px; border-radius: 20px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white; font-size: 1.6rem; font-weight: 900; border: none; cursor: pointer;
  box-shadow: 0 10px 25px rgba(16,185,129,0.3);
  transition: all 0.2s cubic-bezier(0.4,0,0.2,1); letter-spacing: 1px;
}
.simple-confirm-btn.disabled { background: #cbd5e1; box-shadow: none; cursor: not-allowed; }
.simple-confirm-btn:not(.disabled):active { transform: scale(0.98); box-shadow: 0 4px 10px rgba(16,185,129,0.2); }

.rating-content { align-items: center; }
.rating-sub { color: #94a3b8; margin-bottom: 20px; font-size: 1.1rem; }
.stars-container { display: flex; gap: 15px; margin-bottom: 15px; justify-content: center; }
.huge-star {
  font-size: 4rem; color: #e2e8f0; cursor: pointer; transition: 0.2s;
  user-select: none; text-shadow: 0 4px 10px rgba(0,0,0,0.05);
}
.huge-star.is-active { color: #fbbf24; text-shadow: 0 4px 15px rgba(251,191,36,0.4); transform: scale(1.1); }
.rating-text-desc { font-size: 1.5rem; font-weight: 900; margin-bottom: 25px; transition: 0.3s; }
.color-1 { color: #ef4444; } .color-2 { color: #f97316; } .color-3 { color: #eab308; } .color-4 { color: #84cc16; } .color-5 { color: #10b981; }

.quick-tags { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-bottom: 30px; }
.q-tag {
  padding: 12px 20px; background: #f1f5f9; color: #475569; border-radius: 12px;
  font-size: 1.1rem; font-weight: bold; cursor: pointer;
  border: 2px solid transparent; transition: 0.2s;
}
.q-tag.active { background: #eff6ff; color: #3b82f6; border-color: #93c5fd; }

@media screen and (max-width: 768px) {
  .main-content { padding: 20px 15px; }
  .glass-panel { padding: 25px 20px; }
  .tc-body { padding: 20px; }
}
</style>

<style>
.sos-drawer .el-drawer__body { padding: 0; background: #fff; }
.sos-drawer { border-radius: 30px 30px 0 0 !important; box-shadow: 0 -10px 40px rgba(0,0,0,0.1) !important; }
.elderly-msg-box { border-radius: 20px !important; }
.elderly-msg-box .el-message-box__title { font-weight: 900; font-size: 1.2rem; }
.elderly-msg-box .el-message-box__content { font-size: 1.1rem; line-height: 1.5; color: #334155; }
.elderly-huge-confirm-box { width: 90% !important; max-width: 400px !important; border-radius: 24px !important; padding-bottom: 20px !important; }
.elderly-huge-confirm-box .el-message-box__btns { display: flex !important; flex-direction: row-reverse !important; gap: 15px !important; padding: 0 20px !important; }
.elderly-huge-confirm-box .huge-btn { flex: 2 !important; padding: 20px 0 !important; font-size: 1.3rem !important; border-radius: 16px !important; font-weight: 900 !important; margin-left: 0 !important; }
.elderly-huge-confirm-box .huge-btn-cancel { flex: 1 !important; padding: 20px 0 !important; font-size: 1.2rem !important; border-radius: 16px !important; font-weight: bold !important; background: #f1f5f9 !important; border-color: #e2e8f0 !important; color: #64748b !important; }
</style>
