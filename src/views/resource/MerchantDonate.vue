<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot"></span> 城市物资供给网络接入中
      <span style="margin-left:8px; font-weight:bold" :style="{ color: sysMode === 'EMERGENCY' ? '#ef4444' : '#10b981' }">
        [{{ sysMode === 'EMERGENCY' ? '🔴 战时应急响应状态' : '🟢 常规食物银行状态' }}]
      </span>
    </div>

    <div class="donate-wrapper">
      <header class="page-header">
        <div class="header-text">
          <h2>物资供给与捐赠工作台 📦</h2>
          <p>高效流转城市余量物资，精准保障社区应急需求。</p>
        </div>
      </header>

      <div class="donate-board" v-loading="loading" element-loading-text="正在同步至大盘调度中心...">

        <transition name="el-zoom-in-top">
          <div v-if="sysMode === 'EMERGENCY'" class="active-mission-banner">
            <div class="mission-icon-wrap">
              <div class="mission-icon pulse-red-icon">🚨</div>
            </div>
            <div class="mission-info">
              <h3>生命通道援助任务已锁定！</h3>
              <p>
                目标援助范围：<span class="highlight-target">【{{ emergencyDialog.data?.requiredCategory || emergencyDialog.data?.category }}】</span><br/>
                骑士运力已在待命，请在下方选择<strong style="color: #dc2626;">对应的高亮子类目</strong>，补充数量并发布！
              </p>
            </div>
            <button class="quit-mission-btn" @click="cancelEmergency">
              <i class="el-icon-close"></i> 库存不足？取消任务
            </button>
          </div>
        </transition>

        <div class="hero-upload-card" :class="{'has-img': form.goodsImageUrl, 'emergency-glow': sysMode === 'EMERGENCY'}" @click="triggerUpload">
          <template v-if="!form.goodsImageUrl">
            <div class="up-icon">📷</div>
            <div class="up-title">点击拍摄 / 上传物资实拍图</div>
            <div class="up-sub">清晰的实拍图是护航骑士核对物资、受赠者确认收货的重要凭证</div>
          </template>
          <template v-else>
            <img :src="form.goodsImageUrl" class="hero-img" />
            <div class="up-mask">
              <span class="mask-icon">🔄</span>
              <span>更换实拍图</span>
            </div>
          </template>
          <input type="file" ref="fileInput" hidden @change="handleFileChange" accept="image/*" />
        </div>

        <div class="form-card" :class="{'emergency-glow': sysMode === 'EMERGENCY'}">
          <div class="smart-autofill-zone" v-if="sysMode === 'NORMAL' && hasHistoryRecord">
            <div class="autofill-info">
              <span class="icon">✨</span> 发现您最近上架过 <strong>{{ historyRecordName }}</strong>
            </div>
            <button class="autofill-btn" @click="loadLastRecord">一键填入参数</button>
          </div>

          <div class="form-item main-input-item">
            <input v-model="form.goodsName" type="text" placeholder="请输入物资名称，如：达利园全麦吐司面包 500g..." class="huge-input"/>
          </div>

          <div class="form-item">
            <label class="soft-label">
              <span>物资大类选择</span>
              <span v-if="sysMode === 'EMERGENCY'" class="lock-tip">🔒 应急模式下已开启定向锁定</span>
            </label>
            <div class="category-pills" :class="{'is-locked': sysMode === 'EMERGENCY'}">
              <template v-for="(group, groupName) in groupedCategories" :key="groupName">
                <div class="pill-group">
                  <div class="pill-group-title">{{ groupName }}</div>
                  <div class="pill-wrap">
                    <span v-for="cat in group" :key="cat" class="pill-btn"
                          :class="{ active: form.category === cat, disabled: !isCategoryAllowed(cat) }"
                          @click="handleCategorySelect(cat)">{{ cat }}</span>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div class="form-card compact-card">
          <transition name="fade-slide">
            <div v-if="form.category" class="tag-engine-section">
              <label class="soft-label">💡 系统已智能推荐以下靶向标签，请点选符合当前物资的特征：</label>
              <div class="tags-wrap">
                <span v-for="tag in availableTags" :key="tag" class="smart-tag" :class="{ active: form.tags.includes(tag) }" @click="toggleTag(tag)">
                  {{ form.tags.includes(tag) ? '✅ ' : '+ ' }}{{ tag }}
                </span>
              </div>
            </div>
          </transition>

          <div class="physics-matrix">
            <div class="pm-section">
              <label class="pm-label">📦 物资体积预估</label>
              <div class="pm-grid">
                <div class="pm-card" :class="{ active: form.volumeLevel === 1 }" @click="form.volumeLevel = 1">
                  <div class="pm-icon">🛍️</div><div class="pm-text">手提袋</div>
                </div>
                <div class="pm-card" :class="{ active: form.volumeLevel === 2 }" @click="form.volumeLevel = 2">
                  <div class="pm-icon">🎒</div><div class="pm-text">外卖箱</div>
                </div>
                <div class="pm-card" :class="{ active: form.volumeLevel === 3 }" @click="form.volumeLevel = 3">
                  <div class="pm-icon">🚙</div><div class="pm-text">大件/后备箱</div>
                </div>
              </div>
            </div>
            <div class="pm-divider"></div>
            <div class="pm-section">
              <label class="pm-label">⚖️ 物资重量预估</label>
              <div class="pm-grid">
                <div class="pm-card" :class="{ active: form.weightLevel === 1 }" @click="form.weightLevel = 1">
                  <div class="pm-icon">🪶</div><div class="pm-text">轻便 (<5kg)</div>
                </div>
                <div class="pm-card" :class="{ active: form.weightLevel === 2 }" @click="form.weightLevel = 2">
                  <div class="pm-icon">🧱</div><div class="pm-text">偏重 (5-15kg)</div>
                </div>
                <div class="pm-card" :class="{ active: form.weightLevel === 3 }" @click="form.weightLevel = 3">
                  <div class="pm-icon">🏋️</div><div class="pm-text">极重 (>15kg)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="form-card compact-card">
          <div class="form-row">
            <div class="form-item flex-2">
              <label class="soft-label">捐赠 / 上架数量</label>
              <div class="input-with-unit">
                <input v-model="form.stock" type="number" min="1" placeholder="填入数值" ref="stockInput" class="num-input"/>
                <select v-model="form.unit" class="unit-select">
                  <option value="件">件</option><option value="箱">箱</option><option value="份">份</option>
                  <option value="kg">kg</option><option value="袋">袋</option><option value="提">提</option>
                </select>
              </div>
            </div>
            <div class="form-item flex-3">
              <label class="soft-label">保质期 / 临期警戒线</label>
              <div class="date-input-wrap">
                <input v-model="form.expirationDate" type="datetime-local" class="datetime-input" />
                <div class="form-tip">
                  <div class="quick-dates" v-if="form.category">
                    <span class="q-btn" v-for="opt in quickDateOptions" :key="opt.label" @click="applyQuickDate(opt)">
                      {{ opt.label }}
                    </span>
                  </div>
                  <div v-else style="color: #94a3b8; font-size: 0.8rem; margin-top: 4px;">
                    (请先选择上方物资大类，解锁智能有效期推荐)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="form-card no-margin-bottom">
          <template v-if="sysMode === 'NORMAL'">
            <div class="form-item no-margin-bottom">
              <label class="soft-label">目标履约驿站 (骑士上门取货后将送往此地枢纽)</label>
              <div class="select-wrapper">
                <select v-model="form.currentStationId" :class="{ 'has-value': form.currentStationId !== '' }">
                  <option disabled value="">请选择系统为您 LBS 匹配的最近驿站...</option>
                  <option v-for="st in availableStations" :key="st.stationId" :value="st.stationId">
                    📍 {{ st.stationName }} {{ st.hasFreezer === 1 ? '🧊(支持冷链)' : '' }}
                  </option>
                </select>
              </div>
              <transition name="fade-slide">
                <div v-if="isColdChainNeeded" class="dynamic-tip cold-tip">
                  🧊 监测到当前物资存在冷链储藏需求，系统已自动屏蔽无冷库设备的普通驿站。
                </div>
              </transition>
            </div>
          </template>

          <template v-else>
            <div class="emergency-route-box">
              <div class="route-icon">🚀</div>
              <div class="route-text">
                <h4>生命通道直达模式 (Point-to-Point)</h4>
                <p>该单将越过社区驿站大仓，系统已指派运力从您的商铺取件，<strong>点对点全速护送</strong>至求助市民处！</p>
              </div>
            </div>
          </template>
        </div>

        <button class="submit-btn" :class="{'emergency-submit': sysMode === 'EMERGENCY'}" :disabled="!isFormValid" @click="handleDonate">
          <span class="btn-shine"></span>
          {{ sysMode === 'EMERGENCY' ? '🚨 响应紧急广播，立即发货！' : '确认上架，呼叫运力接货' }}
        </button>
      </div>
    </div>

    <el-dialog
        v-model="emergencyDialog.visible"
        :show-close="false"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        width="460px"
        class="premium-emergency-dialog"
        align-center
    >
      <div class="e-modal-container">
        <div class="e-header-bar">
          <div class="e-beacon pulse-red"></div>
          <span class="e-title-text">LBS 城市生命通道紧急求援</span>
        </div>

        <div class="e-body-zone">
          <div class="radar-scan-bg">
            <div class="radar-sweep"></div>
          </div>
          <div class="e-content-front">
            <div class="e-alert-icon">🚨</div>
            <h3 class="e-main-title">附近有市民遭遇困境！</h3>
            <p class="e-sub-desc">系统检测到您的商铺距离最近，急需调配以下物资：</p>

            <div class="e-target-goods-box">
              <span class="bracket">【</span>
              <span class="goods-core">{{ emergencyDialog.data?.requiredCategory || emergencyDialog.data?.category }}</span>
              <span class="bracket">】</span>
            </div>

            <div class="e-meta-tags">
              <span class="e-tag danger"><i class="el-icon-timer"></i> 最高优先级调度</span>
              <span class="e-tag info">📍 LBS 就近匹配</span>
            </div>
          </div>
        </div>

        <div class="e-footer-zone">
          <button class="e-btn btn-reject" @click="rejectEmergency">库存不足 / 忽略</button>
          <button class="e-btn btn-accept" @click="acceptEmergency">
            <span class="btn-icon">⚡</span> 锁定任务，马上发货
          </button>
        </div>
      </div>
    </el-dialog>

  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus'
import { getRecommendStations, donateGoods } from '@/api/resource'
import { getUserProfile } from '@/api/user'
import { checkMyEmergencyBroadcast } from "@/api/dispatch"
import { uploadFile } from '@/api/common'

const loading = ref(false)
const stations = ref([])
const targetOrderId = ref(null)
const sysMode = ref('NORMAL')
let pollTimer = null

const fileInput = ref(null)
const stockInput = ref(null)
const processedBroadcastIds = new Set()

const form = reactive({
  goodsName: '', category: '', tags: [], stock: '', unit: '件', expirationDate: '', currentStationId: '',
  volumeLevel: 1, weightLevel: 1, goodsImageUrl: ''
})

const emergencyDialog = reactive({
  visible: false,
  data: null
})

// === 历史记录填充 ===
const hasHistoryRecord = ref(false)
const historyRecordName = ref('')

const checkHistoryRecord = () => {
  const lastRecord = localStorage.getItem('lastDonationRecord')
  if (lastRecord) {
    try {
      const data = JSON.parse(lastRecord)
      if (data && data.goodsName) {
        hasHistoryRecord.value = true
        historyRecordName.value = data.goodsName.substring(0, 15) + (data.goodsName.length > 15 ? '...' : '')
      }
    } catch (e) {}
  }
}

const loadLastRecord = () => {
  const lastRecord = localStorage.getItem('lastDonationRecord')
  if (!lastRecord) return
  const data = JSON.parse(lastRecord)
  Object.keys(data).forEach(key => { if (form.hasOwnProperty(key) && key !== 'expirationDate' && key !== 'stock') form[key] = data[key] })
  ElMessage.success('✨ 记录提取成功！请补充当前库存数量与有效期。')
}

const saveToLastRecord = () => {
  localStorage.setItem('lastDonationRecord', JSON.stringify({
    goodsName: form.goodsName, category: form.category, tags: form.tags, unit: form.unit,
    volumeLevel: form.volumeLevel, weightLevel: form.weightLevel, goodsImageUrl: form.goodsImageUrl,
    currentStationId: form.currentStationId
  }))
  checkHistoryRecord()
}

const isFormValid = computed(() => {
  if (sysMode.value === 'EMERGENCY') return form.goodsName && form.category && form.stock && form.expirationDate && form.goodsImageUrl
  return form.goodsName && form.category && form.stock && form.expirationDate && form.currentStationId && form.goodsImageUrl
})

const isColdChainNeeded = computed(() => {
  if (form.category === '生鲜冷冻') return true;
  if (form.tags.includes('需冷藏保鲜')) return true;
  return false;
})

const availableStations = computed(() => {
  if (isColdChainNeeded.value) {
    return stations.value.filter(st => st.hasFreezer === 1 || st.hasFreezer === true)
  }
  return stations.value
})

watch(availableStations, (newStations) => {
  if (form.currentStationId) {
    const isStillValid = newStations.find(st => st.stationId === form.currentStationId)
    if (!isStillValid) {
      form.currentStationId = ''
      ElMessage.warning('🧊 监测到当前物资需冷链支持，已为您重置不支持设备的驿站选项')
    }
  }
})

const triggerUpload = () => { if (fileInput.value) fileInput.value.click() }
const handleFileChange = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) return ElMessage.warning('图片大小不能超过 5MB')
  try {
    loading.value = true
    const res = await uploadFile(file)
    form.goodsImageUrl = res.data
    ElMessage.success('凭证照片上传成功')
  } catch (error) { ElMessage.error('上传失败') } finally { loading.value = false }
}

// === 🚀 智能动态保质期引擎 ===
const quickDateOptions = computed(() => {
  const cat = form.category
  if (!cat) return []

  if (['热乎盒饭'].includes(cat)) {
    return [
      { label: '⏱️ 4小时内', hours: 4 },
      { label: '🌙 今晚前', hours: 'tonight' }
    ]
  } else if (['生鲜冷冻', '新鲜果蔬', '烘焙糕点', '乳制品'].includes(cat)) {
    return [
      { label: '剩1天', days: 1 },
      { label: '剩3天', days: 3 },
      { label: '剩1周', days: 7 }
    ]
  } else if (['米面粮油', '方便速食', '饮用水', '感冒退烧药', '肠胃用药', '营养补品'].includes(cat)) {
    return [
      { label: '剩1个月', months: 1 },
      { label: '半年有效', months: 6 },
      { label: '1年以上', years: 1 }
    ]
  } else if (['防寒衣物', '棉被毯子', '暖贴/取暖', '生活日用品', '应急装备', '降压/心脏药', '外伤消炎药', '医疗器械'].includes(cat)) {
    return [
      { label: '1年有效', years: 1 },
      { label: '🌟 长期有效', years: 10 }
    ]
  }
  return [
    { label: '剩3天', days: 3 },
    { label: '剩1周', days: 7 },
    { label: '长期', years: 5 }
  ]
})

const applyQuickDate = (opt) => {
  const target = new Date()
  if (opt.hours === 'tonight') {
    target.setHours(23, 59, 59)
  } else if (opt.hours) {
    target.setHours(target.getHours() + opt.hours)
  } else if (opt.days) {
    target.setDate(target.getDate() + opt.days)
  } else if (opt.months) {
    target.setMonth(target.getMonth() + opt.months)
  } else if (opt.years) {
    target.setFullYear(target.getFullYear() + opt.years)
  }
  const tzOffset = target.getTimezoneOffset() * 60000
  form.expirationDate = new Date(target - tzOffset).toISOString().slice(0, 16)
}

// === 类别与标签引擎 ===
const baseCategoryLib = {
  '🍚 温暖餐食': ['热乎盒饭', '米面粮油', '方便速食', '新鲜果蔬', '烘焙糕点', '生鲜冷冻', '乳制品', '饮用水'],
  '💊 常备用药': ['感冒退烧药', '降压/心脏药', '肠胃用药', '外伤消炎药', '医疗器械', '营养补品'],
  '🧥 越冬日用': ['防寒衣物', '棉被毯子', '暖贴/取暖', '生活日用品', '应急装备']
}

const groupedCategories = computed(() => baseCategoryLib)

const isCategoryAllowed = (cat) => {
  if (sysMode.value !== 'EMERGENCY') return true;
  const targetCat = emergencyDialog.data?.requiredCategory || emergencyDialog.data?.category || '';
  if (targetCat === cat) return true;
  for (const groupName in baseCategoryLib) {
    if (groupName.includes(targetCat)) {
      if (baseCategoryLib[groupName].includes(cat)) return true;
    }
  }
  return false;
}

const handleCategorySelect = (cat) => {
  if (!isCategoryAllowed(cat)) {
    ElMessage.warning(`🚨 应急模式下已被锁定救助范围，只能选择高亮的类目！`)
    return;
  }
  form.category = cat;
}

const availableTags = computed(() => {
  const cat = form.category
  if (!cat) return []
  let tags = new Set()

  if (['热乎盒饭', '方便速食', '烘焙糕点', '饮用水', '乳制品'].includes(cat)) {
    tags.add('开袋即食'); tags.add('无需加热');
  } else if (['米面粮油', '生鲜冷冻', '新鲜果蔬'].includes(cat)) {
    tags.add('需加热/烹饪');
  }
  if (['生鲜冷冻', '乳制品'].includes(cat)) tags.add('需冷藏保鲜');

  if (['生鲜冷冻', '方便速食', '烘焙糕点', '米面粮油', '热乎盒饭'].includes(cat)) {
    tags.add('清真'); tags.add('纯素食');
  }
  if (['烘焙糕点', '乳制品', '新鲜果蔬', '营养补品', '方便速食', '热乎盒饭', '米面粮油'].includes(cat)) {
    tags.add('无糖/低糖'); tags.add('清淡易消化'); tags.add('易咀嚼/流食');
  }

  if (cat === '降压/心脏药') {
    tags.add('高血压适用'); tags.add('心脏病适用');
  } else if (cat === '肠胃用药') {
    tags.add('肠胃脆弱');
  } else if (['外伤消炎药', '医疗器械', '应急装备'].includes(cat)) {
    tags.add('外伤急救');
  } else if (cat === '感冒退烧药') {
    tags.add('慢性病/常用药');
  }

  if (['防寒衣物', '棉被毯子', '暖贴/取暖'].includes(cat)) tags.add('保暖防寒');

  return Array.from(tags)
})

watch(() => form.category, () => {
  if (sysMode.value !== 'EMERGENCY') form.tags = []
})
const toggleTag = (tag) => { const idx = form.tags.indexOf(tag); if (idx > -1) form.tags.splice(idx, 1); else form.tags.push(tag) }

onMounted(async () => {
  checkHistoryRecord()
  loading.value = true
  try {
    sysMode.value = 'NORMAL'
    const userRes = await getUserProfile()
    if (userRes.data && userRes.data.currentLon) {
      await fetchStations(userRes.data.currentLon, userRes.data.currentLat)
    } else {
      await fetchStations()
    }
  } catch (error) { await fetchStations() }

  pollTimer = setInterval(async () => {
    try {
      const res = await checkMyEmergencyBroadcast()
      if (res?.data && (res.data.category || res.data.requiredCategory)) {
        if (processedBroadcastIds.has(res.data.orderId)) return;
        showEmergencyPopup(res.data)
      }
    } catch (e) {}
  }, 5000)
})

onUnmounted(() => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null } })

const showEmergencyPopup = (data) => {
  if (emergencyDialog.visible) return;
  emergencyDialog.data = data;
  emergencyDialog.visible = true;
  processedBroadcastIds.add(data.orderId);
}

const acceptEmergency = () => {
  const data = emergencyDialog.data;
  sysMode.value = 'EMERGENCY';
  targetOrderId.value = data.orderId;
  form.category = '';
  emergencyDialog.visible = false;
  document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' });

  nextTick(() => {
    if (stockInput.value) stockInput.value.focus();
  });
}

const rejectEmergency = () => {
  emergencyDialog.visible = false;
  emergencyDialog.data = null;
  ElMessage.info('已忽略该调度请求，平台将继续为您流转常规订单');
}

const cancelEmergency = () => {
  ElMessageBox.confirm(
      '取消后该紧急工单将重新放入公池或广播给其他商铺，确认当前库存不足或无法响应吗？',
      '⚠️ 撤销援助任务',
      { confirmButtonText: '确认撤销', cancelButtonText: '点错了，继续发货', type: 'warning' }
  ).then(() => {
    sysMode.value = 'NORMAL';
    targetOrderId.value = null;
    form.category = '';
    form.tags = [];
    ElMessage.info('已退出应急响应模式，您可继续发布常规物资。');
  }).catch(() => {});
}

const fetchStations = async (lon = null, lat = null) => {
  try {
    const res = await getRecommendStations({ lon, lat })
    stations.value = res.data?.records || res?.data?.data || res?.data || res || []
  } catch (e) {
  } finally {
    loading.value = false
  }
}

const getMainCategoryStr = (subCat) => {
  for (const [groupName, subs] of Object.entries(baseCategoryLib)) {
    if (subs.includes(subCat)) return groupName.split(' ')[1];
  }
  return subCat;
}

const handleDonate = async () => {
  loading.value = true
  try {
    const finalGoodsName = `[${form.category}] ${form.goodsName} (单位:${form.unit})`
    let formattedDate = form.expirationDate.replace('T', ' ');
    if (formattedDate.length === 16) formattedDate += ':00';

    const submitData = {
      ...form,
      category: getMainCategoryStr(form.category),
      goodsName: finalGoodsName,
      expirationDate: formattedDate,
      tags: form.tags,
      currentStationId: sysMode.value === 'EMERGENCY' ? null : form.currentStationId,
      targetOrderId: targetOrderId.value
    }

    await donateGoods(submitData)
    saveToLastRecord()

    ElNotification.success({ title: '✅ 发布成功', message: '已同步至调度大盘，运力测算与匹配中...', duration: 5000 })
    form.goodsName = ''; form.stock = ''; form.category = ''; form.tags = []; form.expirationDate = ''; form.currentStationId = '';
    form.volumeLevel = 1; form.weightLevel = 1; form.goodsImageUrl = '';
    sysMode.value = 'NORMAL'; targetOrderId.value = null;
  } catch (e) {
  } finally { loading.value = false }
}
</script>

<style scoped>
.main-content { flex: 1; height: 100vh; overflow-y: auto; display: flex; flex-direction: column; position: relative; padding: 40px; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;}
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); }
.pulse-dot { width: 8px; height: 8px; background: #f97316; border-radius: 50%; box-shadow: 0 0 8px #f97316; animation: pulse-orange 2s infinite; }
@keyframes pulse-orange { 0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(249, 115, 22, 0); } 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); } }

.donate-wrapper { max-width: 760px; margin: 0 auto; width: 100%; padding-bottom: 60px; }
.page-header { text-align: center; margin-bottom: 30px; }
.header-text h2 { color: #0f172a; margin: 0 0 8px; font-size: 2.2rem; font-weight: 900; letter-spacing: 1px;}
.header-text p { color: #64748b; margin: 0; font-size: 1rem; font-weight: 500;}

.donate-board { display: flex; flex-direction: column; gap: 20px; }

/* 📸 视觉大图区 */
.hero-upload-card { width: 100%; height: 260px; border-radius: 24px; background: linear-gradient(135deg, #e0e7ff 0%, #f1f5f9 100%); border: 2px dashed #93c5fd; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden; box-shadow: 0 10px 20px rgba(0,0,0,0.02);}
.hero-upload-card:hover { transform: translateY(-4px); box-shadow: 0 15px 30px rgba(59, 130, 246, 0.15); border-color: #3b82f6; border-style: solid;}
.hero-upload-card .up-icon { font-size: 3.5rem; margin-bottom: 12px; filter: drop-shadow(0 4px 6px rgba(59,130,246,0.2));}
.hero-upload-card .up-title { font-size: 1.2rem; font-weight: 900; color: #1e3a8a; margin-bottom: 6px;}
.hero-upload-card .up-sub { font-size: 0.85rem; color: #64748b; font-weight: 500;}
.hero-img { width: 100%; height: 100%; object-fit: cover; }
.hero-upload-card .up-mask { position: absolute; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); color: #fff; font-weight: bold; font-size: 1.1rem; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; transition: 0.3s; gap: 8px;}
.hero-upload-card.has-img:hover .up-mask { opacity: 1; }
.mask-icon { font-size: 2rem; }

/* 📝 核心信息填写区 */
.form-card { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); padding: 25px 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.03); border: 1px solid rgba(255,255,255,0.8); transition: 0.3s; }
.compact-card { padding: 20px 30px; }
.no-margin-bottom { margin-bottom: 0 !important; }

/* 魔法导入提示 */
.smart-autofill-zone { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
.autofill-info { font-size: 0.9rem; color: #334155; }
.autofill-info strong { color: #1e293b; font-weight: bold;}
.autofill-btn { background: #fff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 6px 14px; border-radius: 8px; font-weight: bold; font-size: 0.8rem; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02);}
.autofill-btn:hover { background: #eff6ff; border-color: #93c5fd; }

.form-item { display: flex; flex-direction: column; margin-bottom: 20px; }
.main-input-item { margin-bottom: 25px; border-bottom: 2px dashed #f1f5f9; padding-bottom: 25px;}
.huge-input { width: 100%; border: none; background: transparent; font-size: 1.6rem; font-weight: 900; color: #0f172a; outline: none; padding: 0;}
.huge-input::placeholder { color: #cbd5e1; font-weight: 600; }

.soft-label { font-size: 0.9rem; font-weight: bold; color: #64748b; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;}

/* 胶囊分类选择器 */
.category-pills { display: flex; flex-direction: column; gap: 15px; transition: 0.3s; }
.pill-group { display: flex; flex-direction: column; gap: 8px;}
.pill-group-title { font-size: 0.75rem; color: #94a3b8; font-weight: bold; padding-left: 4px;}
.pill-wrap { display: flex; flex-wrap: wrap; gap: 10px; }
.pill-btn { padding: 8px 18px; background: #f8fafc; border: 1px solid #e2e8f0; color: #475569; border-radius: 100px; font-size: 0.9rem; font-weight: bold; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); user-select: none;}
.pill-btn:hover { border-color: #cbd5e1; background: #f1f5f9; transform: translateY(-1px);}
.pill-btn.active { background: #3b82f6; border-color: #2563eb; color: #fff; box-shadow: 0 4px 12px rgba(59,130,246,0.3); transform: scale(1.02);}

.category-pills.is-locked { opacity: 0.9; }
.pill-btn.disabled { opacity: 0.3; cursor: not-allowed; background: #f1f5f9; border-color: transparent;}
.pill-btn.disabled:hover { transform: none; border-color: transparent; }
.pill-btn.disabled.active { opacity: 1; background: #fee2e2; border-color: #ef4444; color: #dc2626; box-shadow: 0 4px 12px rgba(239,68,68,0.2); cursor: not-allowed;}

/* 智能标签推荐 */
.tag-engine-section { background: #f8fafc; padding: 15px 20px; border-radius: 16px; margin-bottom: 20px; border: 1px dashed #e2e8f0;}
.tags-wrap { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;}
.smart-tag { padding: 6px 12px; background: #fff; border: 1px solid #e2e8f0; color: #64748b; border-radius: 8px; font-size: 0.8rem; font-weight: bold; cursor: pointer; transition: 0.2s; }
.smart-tag.active { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }

/* 物理矩阵 UI */
.physics-matrix { display: flex; gap: 25px; align-items: stretch; margin-top: 15px; }
.pm-section { flex: 1; display: flex; flex-direction: column;}
.pm-label { font-size: 0.9rem; font-weight: bold; color: #64748b; margin-bottom: 12px; display: block;}
.pm-grid { display: flex; gap: 10px; flex: 1;}
.pm-card { flex: 1; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 14px; padding: 16px 5px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; user-select: none; }
.pm-card:hover { border-color: #cbd5e1; background: #f1f5f9; transform: translateY(-2px);}
.pm-card.active { border-color: #f97316; background: #fff7ed; box-shadow: 0 6px 15px rgba(249,115,22,0.12); transform: scale(1.02);}
.pm-icon { font-size: 2rem; margin-bottom: 8px; line-height: 1; }
.pm-text { font-size: 0.85rem; font-weight: bold; color: #475569; transition: 0.2s;}
.pm-card.active .pm-text { color: #ea580c; }
.pm-divider { width: 2px; background: #f1f5f9; border-radius: 2px; margin: 10px 0;}

/* 数量与日期 */
.form-row { display: flex; gap: 20px; margin-top: 25px;} .flex-2 { flex: 1.2; } .flex-3 { flex: 2; }
.input-with-unit { display: flex; gap: 10px; }
.num-input { flex: 1; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 1.1rem; background: #f8fafc; outline: none; transition: 0.3s; font-weight: 900; color: #1e293b;}
.num-input:focus, .datetime-input:focus, .select-wrapper select:focus { background: #fff; border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
.unit-select { width: 80px; padding: 0 10px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 1rem; color: #3b82f6; background: #eff6ff; font-weight: bold; outline: none; cursor: pointer; text-align: center; }
.date-input-wrap { display: flex; flex-direction: column; gap: 10px; }
.datetime-input { padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 1rem; background: #f8fafc; outline: none; transition: 0.3s; font-weight: bold; color: #475569; width: 100%; box-sizing: border-box;}
.form-tip { margin-top: 4px;}
.quick-dates { display: flex; flex-wrap: wrap; gap: 8px; }
.q-btn { padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: bold; cursor: pointer; transition: 0.2s; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;}
.q-btn:hover { background: #e2e8f0; color: #1e293b; border-color: #cbd5e1; }

/* 驿站选择 */
.select-wrapper select { width: 100%; padding: 14px 18px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 1.05rem; color: #94a3b8; background: #f8fafc; outline: none; cursor: pointer; font-weight: bold;}
.select-wrapper select.has-value { color: #1e293b; background: #fff; border-color: #10b981; box-shadow: 0 0 0 4px rgba(16,185,129,0.1);}
.cold-tip { margin-top: 12px; color: #0369a1; background: #e0f2fe; padding: 10px 14px; border-radius: 10px; font-size: 0.85rem; font-weight: bold; display: flex; align-items: center; gap: 8px;}

/* 紧急路由覆盖 */
.emergency-route-box { background: #fef2f2; border: 2px dashed #fca5a5; padding: 20px; border-radius: 16px; display: flex; align-items: flex-start; gap: 15px; margin-top: 10px;}
.route-icon { font-size: 2.5rem; animation: floatUp 2s ease-in-out infinite; }
.route-text h4 { color: #ef4444; margin: 0 0 5px; font-size: 1.1rem; font-weight: 900; }
.route-text p { color: #7f1d1d; margin: 0; font-size: 0.95rem; font-weight: bold; line-height: 1.5;}
@keyframes floatUp { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

/* 提交按钮 */
.submit-btn { width: 100%; padding: 20px; border: none; border-radius: 20px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #fff; font-size: 1.3rem; font-weight: 900; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); margin-top: 10px; letter-spacing: 1px;}
.submit-btn:hover:not(:disabled) { transform: translateY(-4px); box-shadow: 0 15px 35px rgba(37, 99, 235, 0.4); }
.submit-btn:disabled { background: #cbd5e1; cursor: not-allowed; opacity: 0.7; transform: none; box-shadow: none;}

/* =========== 🚨 战时相关补丁 =========== */
.active-mission-banner { background: linear-gradient(135deg, #fef2f2, #fee2e2); border: 2px solid #fca5a5; border-radius: 20px; padding: 20px 25px; margin-bottom: 20px; display: flex; align-items: center; gap: 20px; box-shadow: 0 10px 25px rgba(239, 68, 68, 0.15); }
.mission-icon-wrap { font-size: 2.5rem; }
.pulse-red-icon { animation: float-and-pulse 2s infinite ease-in-out; filter: drop-shadow(0 0 8px rgba(239,68,68,0.5)); }
@keyframes float-and-pulse { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-5px) scale(1.1); } }
.mission-info { flex: 1; }
.mission-info h3 { color: #b91c1c; margin: 0 0 8px; font-size: 1.3rem; font-weight: 900; }
.mission-info p { color: #7f1d1d; margin: 0; font-size: 0.95rem; line-height: 1.6; }
.highlight-target { color: #dc2626; font-size: 1.2rem; font-weight: 900; background: #fff; padding: 2px 8px; border-radius: 6px; border: 1px dashed #f87171; }
.quit-mission-btn { background: #fff; border: 1px solid #fca5a5; color: #ef4444; padding: 10px 16px; border-radius: 10px; font-weight: bold; cursor: pointer; transition: 0.2s; white-space: nowrap; }
.quit-mission-btn:hover { background: #fee2e2; border-color: #ef4444; }

.emergency-glow { border-color: #fca5a5; box-shadow: 0 0 20px rgba(239, 68, 68, 0.1); }
.lock-tip { color: #ef4444; font-size: 0.8rem; background: #fee2e2; padding: 2px 8px; border-radius: 6px; margin-left: auto;}

.submit-btn.emergency-submit { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3); animation: heartbeat 2s infinite; }
.submit-btn.emergency-submit:hover:not(:disabled) { box-shadow: 0 15px 40px rgba(239, 68, 68, 0.5); }
@keyframes heartbeat { 0% { transform: scale(1); } 5% { transform: scale(1.02); } 10% { transform: scale(1); } }

/* 动画类 */
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-10px); }

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .physics-matrix { flex-direction: column; gap: 15px;}
  .pm-divider { display: none; }
  .form-row { flex-direction: column; gap: 15px; }
}
</style>

<style>
.premium-emergency-dialog {
  border-radius: 20px !important;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(239, 68, 68, 0.35) !important;
  background: #ffffff !important;
  padding: 0 !important;
  border: 1px solid #fecaca;
}

.premium-emergency-dialog .el-dialog__header,
.premium-emergency-dialog .el-dialog__body {
  padding: 0 !important;
  margin: 0 !important;
}

.e-modal-container { display: flex; flex-direction: column; }
.e-header-bar { background: #fef2f2; border-bottom: 1px solid #fca5a5; padding: 12px 20px; display: flex; align-items: center; gap: 10px; }
.e-beacon { width: 10px; height: 10px; background: #ef4444; border-radius: 50%; }
.pulse-red { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); animation: pulse-danger 1.5s infinite cubic-bezier(0.66, 0, 0, 1); }
@keyframes pulse-danger { to { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); } }
.e-title-text { color: #b91c1c; font-weight: 900; font-size: 0.95rem; letter-spacing: 0.5px; }
.e-body-zone { position: relative; padding: 40px 30px; text-align: center; overflow: hidden; background: radial-gradient(circle at center, #fff 0%, #fef2f2 100%); }
.radar-scan-bg { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 300px; height: 300px; border-radius: 50%; border: 1px dashed #fca5a5; opacity: 0.3; pointer-events: none; }
.radar-scan-bg::before, .radar-scan-bg::after { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); border-radius: 50%; border: 1px solid #fca5a5; }
.radar-scan-bg::before { width: 200px; height: 200px; }
.radar-scan-bg::after { width: 100px; height: 100px; }
.radar-sweep { position: absolute; width: 50%; height: 50%; top: 0; left: 50%; transform-origin: bottom left; background: linear-gradient(90deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0) 100%); animation: radar-spin 4s linear infinite; }
@keyframes radar-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.e-content-front { position: relative; z-index: 2; }
.e-alert-icon { font-size: 4rem; margin-bottom: 15px; animation: floatUp 2s ease-in-out infinite; filter: drop-shadow(0 4px 6px rgba(239,68,68,0.2)); }.e-main-title { color: #991b1b; font-size: 1.4rem; font-weight: 900; margin: 0 0 8px; }
.e-sub-desc { color: #7f1d1d; font-size: 0.95rem; margin: 0 0 20px; font-weight: bold;}
.e-target-goods-box { background: #fff; display: inline-block; padding: 10px 20px; border-radius: 12px; border: 2px dashed #f87171; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.1); margin-bottom: 25px; }
.e-target-goods-box .bracket { color: #f87171; font-weight: bold; }
.e-target-goods-box .goods-core { color: #dc2626; font-size: 1.8rem; font-weight: 900; }
.e-meta-tags { display: flex; justify-content: center; gap: 10px; }
.e-tag { padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; }
.e-tag.danger { background: #fee2e2; color: #b91c1c; }
.e-tag.info { background: #e0f2fe; color: #0369a1; }
.e-footer-zone { display: flex; padding: 20px; gap: 15px; background: #fff; border-top: 1px solid #f1f5f9; }
.e-btn { flex: 1; padding: 14px 0; border-radius: 12px; font-size: 1.05rem; font-weight: bold; cursor: pointer; transition: 0.2s; text-align: center; border: none; }
.btn-reject { background: #f1f5f9; color: #64748b; }
.btn-reject:hover { background: #e2e8f0; color: #475569; }
.btn-accept { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; box-shadow: 0 8px 20px rgba(239, 68, 68, 0.3); display: flex; justify-content: center; align-items: center; gap: 6px; }
.btn-accept:hover { transform: translateY(-2px); box-shadow: 0 12px 25px rgba(239, 68, 68, 0.4); }
.btn-icon { font-size: 1.2rem; }
</style>