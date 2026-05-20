<template>
  <div class="app-layout">
    <SideMenu />

    <main class="main-content">
      <div class="top-status">
        <span class="pulse-dot" :style="{ background: sysMode === 'NORMAL' ? '#10b981' : '#ef4444', boxShadow: sysMode === 'NORMAL' ? '0 0 8px #10b981' : '0 0 8px #ef4444' }"></span>
        {{ sysMode === 'NORMAL' ? '🟢 常规食物银行' : '🔴 战时应急响应' }}
      </div>

      <div class="donate-wrapper" v-loading="loading">
        <header class="page-header">
          <h2>📦 物资捐赠</h2>
          <p>将余量物资送入社区调度网络，系统自动匹配最近驿站与最优运力</p>
        </header>

        <el-form ref="formRef" :model="form" label-position="top" :rules="rules" :disabled="submitting">

          <!-- ====== 区块一：基本信息 ====== -->
          <div class="form-card">
            <div class="card-title">📋 基本信息</div>

            <el-form-item prop="goodsImageUrl" class="no-margin-bottom">
              <div class="upload-zone" :class="{ 'has-img': form.goodsImageUrl }" @click="triggerUpload">
                <template v-if="!form.goodsImageUrl">
                  <span class="upload-icon-large">📷</span>
                  <span class="upload-text">点击上传物资实拍图</span>
                  <span class="upload-hint">骑手核对与受赠方确认的重要凭据</span>
                </template>
                <template v-else>
                  <img :src="form.goodsImageUrl" class="preview-img" />
                  <div class="up-mask"><span>🔄 更换图片</span></div>
                </template>
                <input type="file" ref="fileInput" hidden @change="handleFileChange" accept="image/*" />
              </div>
            </el-form-item>

            <el-form-item label="物资大类" prop="category">
              <template v-for="(group, groupName) in categoryGroups" :key="groupName">
                <div class="category-group">
                  <span class="category-group-name">{{ groupName }}</span>
                  <div class="pill-wrap">
                    <span v-for="cat in group" :key="cat" class="pill-btn"
                      :class="{ active: form.category === cat }"
                      @click="selectCategory(cat)">{{ cat }}</span>
                  </div>
                </div>
              </template>
            </el-form-item>

            <el-form-item label="物资名称" prop="goodsName" class="no-margin-bottom">
              <el-input v-model="form.goodsName" size="large" :placeholder="goodsNamePlaceholder" maxlength="50" show-word-limit />
            </el-form-item>
          </div>

          <!-- ====== 区块二：规格参数 ====== -->
          <div class="form-card">
            <div class="card-title">📐 规格参数</div>

            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="捐赠数量" prop="stock">
                  <el-input-number v-model="form.stock" :min="1" :max="99999" controls-position="right" style="width:100%;" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="计量单位" prop="unit">
                  <el-select v-model="form.unit" style="width:100%;">
                    <el-option v-for="u in ['件','箱','份','kg','袋','提','瓶','包']" :key="u" :label="u" :value="u" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item>
                  <template #label>
                    <span>批次总估值 (元)
                      <span v-if="estimatedValuePerUnit !== null" style="color:#f97316;font-weight:900;margin-left:4px;">
                        ≈ ¥{{ estimatedValuePerUnit }}/{{ form.unit }}
                      </span>
                    </span>
                  </template>
                  <el-input-number v-model="form.estimatedValue" :min="0" :precision="2" controls-position="right"
                    style="width:100%;" placeholder="整批物资的市场总价" />
                </el-form-item>
              </el-col>
            </el-row>

            <div class="valuation-hint" v-if="form.estimatedValue > 0 && form.stock > 0">
              💡 本批 {{ form.stock }} {{ form.unit }} × 约 ¥{{ estimatedValuePerUnit }}/{{ form.unit }} = 总估值 ¥{{ form.estimatedValue }}
            </div>

            <el-row :gutter="16">
              <el-col :span="16">
                <el-form-item label="保质期 / 临期警戒线" prop="expirationDate">
                  <el-date-picker v-model="form.expirationDate" type="datetime" placeholder="选择日期时间"
                    format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%;" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item v-if="form.category" label="快捷设置" class="no-margin-bottom">
                  <div class="quick-date-row">
                    <el-button v-for="opt in quickDateOptions" :key="opt.label" size="small"
                      :type="activeQuickDate === opt.label ? 'primary' : 'default'"
                      @click="applyQuickDate(opt)" round>{{ opt.label }}</el-button>
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- ====== 区块三：双维物理规格 ====== -->
          <div class="form-card">
            <div class="card-title">📦 物理规格与运力调度</div>

            <!-- 重量维度 -->
            <div class="spec-group">
              <div class="spec-group-label">⚖️ 物资重量评估</div>
              <div class="spec-cards">
                <div v-for="(opt, idx) in weightOptions" :key="'w'+idx"
                  class="spec-card" :class="{ active: form.weightLevel === opt.value }"
                  @click="form.weightLevel = opt.value">
                  <span class="spec-icon">{{ opt.icon }}</span>
                  <div class="spec-body">
                    <span class="spec-title">{{ opt.title }}</span>
                    <span class="spec-desc">{{ opt.desc }}</span>
                  </div>
                  <span v-if="form.weightLevel === opt.value" class="spec-check">✓</span>
                </div>
              </div>
            </div>

            <!-- 体积维度 -->
            <div class="spec-group">
              <div class="spec-group-label">📐 空间体积评估</div>
              <div class="spec-cards">
                <div v-for="(opt, idx) in volumeOptions" :key="'v'+idx"
                  class="spec-card" :class="{ active: form.volumeLevel === opt.value }"
                  @click="form.volumeLevel = opt.value">
                  <span class="spec-icon">{{ opt.icon }}</span>
                  <div class="spec-body">
                    <span class="spec-title">{{ opt.title }}</span>
                    <span class="spec-desc">{{ opt.desc }}</span>
                  </div>
                  <span v-if="form.volumeLevel === opt.value" class="spec-check">✓</span>
                </div>
              </div>
            </div>

            <div class="spec-footer-hint">
              💡 精准的物理规格评估，有助于系统算法为您秒级匹配最优运力
            </div>

            <el-form-item label="目标履约驿站" prop="currentStationId" class="no-margin-bottom">
              <el-select v-model="form.currentStationId" placeholder="系统将按LBS匹配最近驿站..." style="width:100%;" filterable clearable>
                <el-option v-for="st in availableStations" :key="st.stationId" :value="st.stationId"
                  :label="st.stationName + (st.hasFreezer === 1 ? ' 🧊冷链' : '')" />
              </el-select>
            </el-form-item>
            <el-alert v-if="isColdChainNeeded" title="🧊 检测到冷链需求 — 已自动过滤无冷库设备的驿站" type="info" :closable="false" class="inline-alert" />
          </div>

          <!-- CTA 提交按钮 -->
          <el-button size="large" type="primary"
            class="submit-btn-cta" :disabled="!isFormValid" @click="handleDonate" :loading="submitting">
            确认上架，呼叫运力接货
          </el-button>
        </el-form>
      </div>
    </main>

    <el-dialog v-model="emergencyDialog.visible" title="🚨 紧急求助响应" width="480px" align-center>
      <template v-if="emergencyDialog.data">
        <!-- 求助人摘要 -->
        <div class="emergency-recipient-card">
          <div class="er-header">
            <span class="er-avatar">{{ emergencyDialog.data.recipientTag === 'ELDERLY' ? '👴' : emergencyDialog.data.recipientTag === 'DISABLED' ? '👩‍🦽' : '👤' }}</span>
            <div>
              <div class="er-name">{{ emergencyDialog.data.recipientName || '求助市民' }}</div>
              <div class="er-tag" v-if="emergencyDialog.data.recipientTag">{{ formatRecipientTag(emergencyDialog.data.recipientTag) }}</div>
            </div>
          </div>
          <div class="er-details">
            <div class="er-row"><span>📍</span> {{ emergencyDialog.data.doorNumber || '地址未登记' }}</div>
            <div class="er-row"><span>🔥</span> 紧急度 Lv.{{ emergencyDialog.data.urgency || '?' }} · 急需 {{ emergencyDialog.data.category }}</div>
          </div>
        </div>

        <!-- 响应物资输入 -->
        <div class="emergency-response-form">
          <div class="erf-title">📦 您的响应物资</div>
          <el-input v-model="emergencyForm.goodsName" size="large" placeholder="物资名称，如：金龙鱼大米 5kg" class="erf-input" />
          <el-row :gutter="10" style="margin-top:10px;">
            <el-col :span="8">
              <el-input-number v-model="emergencyForm.stock" :min="1" :max="999" size="large" controls-position="right" style="width:100%;" placeholder="数量" />
            </el-col>
            <el-col :span="8">
              <el-select v-model="emergencyForm.unit" size="large" style="width:100%;">
                <el-option v-for="u in ['件','箱','份','kg','袋','提','瓶','包']" :key="u" :label="u" :value="u" />
              </el-select>
            </el-col>
            <el-col :span="8">
              <el-input v-model="emergencyForm.estimatedValue" size="large" placeholder="估值(元)" />
            </el-col>
          </el-row>
        </div>
      </template>
      <template #footer>
        <el-button @click="rejectEmergency">暂不响应</el-button>
        <el-button type="danger" @click="acceptEmergency" :disabled="!emergencyForm.goodsName">⚡ 确认响应，点对点直达</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import SideMenu from '@/views/dispatch/components/SideMenu.vue'
import { getRecommendStations, donateGoods } from '@/api/resource'
import { getUserProfile } from '@/api/user'
import { checkMyEmergencyBroadcast } from '@/api/dispatch'
import { respondSos } from '@/api/trade'
import { getCurrentConfig } from '@/api/config'
import { uploadFile } from '@/api/common'

const loading = ref(false)
const submitting = ref(false)
const stations = ref([])
const sysMode = ref('NORMAL')
const fileInput = ref(null)
const formRef = ref(null)
let pollTimer = null
const processedBroadcastIds = new Set()

const form = reactive({
  goodsName: '',
  category: '',
  stock: 1,
  unit: '件',
  expirationDate: '',
  currentStationId: null,
  weightLevel: 1,
  volumeLevel: 1,
  goodsImageUrl: '',
  estimatedValue: 0
})

const emergencyDialog = reactive({ visible: false, data: null })

const weightOptions = [
  { value: 1, icon: '🛍️', title: '轻量 <5kg', desc: '适合手提 / 步行配送' },
  { value: 2, icon: '🛵', title: '标准 5–20kg', desc: '单人搬运 / 电动车取件' },
  { value: 3, icon: '🚗', title: '重载 >20kg', desc: '需推车或多人协助搬运' }
]

const volumeOptions = [
  { value: 1, icon: '👜', title: '小件', desc: '手提袋 / 塑料袋可装' },
  { value: 2, icon: '📦', title: '中件', desc: '外卖保温箱可容纳' },
  { value: 3, icon: '🚛', title: '大件', desc: '需汽车后备箱或货厢装运' }
]

const rules = {
  goodsName: [{ required: true, message: '请输入物资名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择物资大类', trigger: 'change' }],
  stock: [{ required: true, message: '请输入捐赠数量', trigger: 'blur' }],
  expirationDate: [{ required: true, message: '请选择保质期', trigger: 'change' }],
  goodsImageUrl: [{ required: true, message: '请上传物资实拍图', trigger: 'change' }],
  currentStationId: [{
    validator: (_rule, value, callback) => {
      if (!value) callback(new Error('请选择目标驿站'))
      else callback()
    }, trigger: 'change'
  }]
}

// 新四大分类体系
const categoryGroups = {
  '🍚 食品与饮料': ['米面粮油', '方便速食', '烘焙糕点', '生鲜果蔬', '冷冻食品', '乳制品', '饮用水', '热食盒饭'],
  '🧹 生活日用':   ['卫生护理', '防寒保暖', '寝具家纺', '洗漱用品', '纸品耗材'],
  '💊 医疗健康':   ['常备药品', '外用急救', '医疗器械', '营养补品'],
  '🚨 应急物资':   ['应急食品', '应急照明', '防护装备', '保暖物资']
}

const selectCategory = (cat) => { form.category = cat }

const isFormValid = computed(() => {
  if (!form.goodsName || !form.category || !form.stock || !form.expirationDate || !form.goodsImageUrl) return false
  if (!form.currentStationId) return false
  return true
})

const estimatedValuePerUnit = computed(() => {
  if (!form.stock || !form.estimatedValue || form.stock <= 0) return null
  return (form.estimatedValue / form.stock).toFixed(2)
})

const goodsNamePlaceholder = computed(() => {
  const map = {
    '米面粮油': '如：品牌 + 品名 + 重量，金龙鱼大米 5kg',
    '方便速食': '如：品牌 + 品名 + 规格，康师傅红烧牛肉面 箱装',
    '烘焙糕点': '如：品牌 + 品名 + 规格，达利园软面包 1kg',
    '生鲜果蔬': '如：品名 + 规格，烟台红富士苹果 5kg',
    '冷冻食品': '如：品牌 + 品名 + 规格，思念水饺 500g',
    '乳制品': '如：品牌 + 品名 + 规格，伊利纯牛奶 250ml×12',
    '饮用水': '如：品牌 + 品名 + 规格，农夫山泉 550ml×24',
    '热食盒饭': '如：品名 + 份数，红烧牛肉饭 50份',
    '卫生护理': '如：品牌 + 品名 + 规格，舒肤佳沐浴露 500ml',
    '防寒保暖': '如：品牌 + 品名 + 规格，南极人冬被 2m×1.8m',
    '寝具家纺': '如：品牌 + 品名 + 规格，水星家纺枕头 一对装',
    '洗漱用品': '如：品牌 + 品名 + 规格，佳洁士牙膏 180g',
    '纸品耗材': '如：品牌 + 品名 + 数量，维达抽纸 3层×6包',
    '常备药品': '如：品牌 + 品名 + 规格，泰诺感冒片 12片/盒',
    '外用急救': '如：品牌 + 品名 + 规格，云南白药创可贴 100片',
    '医疗器械': '如：品名 + 规格，一次性医用口罩 50只/盒',
    '营养补品': '如：品牌 + 品名 + 规格，汤臣倍健维生素C 60片',
    '应急食品': '如：品名 + 规格，压缩饼干 500g×10',
    '应急照明': '如：品名 + 场景，强光手电筒 + 电池套装',
    '防护装备': '如：品名 + 规格，救灾应急帐篷 3m×4m',
    '保暖物资': '如：品名 + 规格，军用棉大衣 均码'
  }
  return map[form.category] || '如：品牌 + 品名 + 规格/数量'
})

const isColdChainNeeded = computed(() =>
  form.category === '冷冻食品' || form.category === '乳制品' || (form.tags || []).includes('需冷藏保鲜')
)

const availableStations = computed(() =>
  isColdChainNeeded.value ? stations.value.filter(s => s.hasFreezer === 1 || s.hasFreezer === true) : stations.value
)

const activeQuickDate = ref(null)
watch(() => form.category, () => { activeQuickDate.value = null })

watch(availableStations, (newSts) => {
  if (form.currentStationId && !newSts.find(s => s.stationId === form.currentStationId)) {
    form.currentStationId = null
    ElMessage.warning('🧊 已为您重置不支持冷链的驿站选项')
  }
})

// 保质期智能推荐矩阵
const quickDateOptions = computed(() => {
  const cat = form.category
  if (!cat) return []
  // 极易腐
  if (['热食盒饭'].includes(cat))
    return [{ label: '4小时后', hours: 4 }, { label: '今日24点', hours: 'tonight' }]
  // 短保生鲜
  if (['生鲜果蔬', '烘焙糕点', '冷冻食品', '乳制品'].includes(cat))
    return [{ label: '明日24点', days: 1, endOfDay: true }, { label: '3天后', days: 3 }, { label: '1周后', days: 7 }]
  // 长保食品与药品
  if (['米面粮油', '方便速食', '饮用水', '常备药品', '营养补品', '应急食品'].includes(cat))
    return [{ label: '半年后', months: 6 }, { label: '1年后', years: 1 }]
  // 耐用物资：无保质期
  return [{ label: '长期有效 (无保质期)', isPermanent: true }]
})

// 时间计算引擎
const applyQuickDate = (opt) => {
  activeQuickDate.value = opt.label

  if (opt.isPermanent) {
    form.expirationDate = '2099-12-31 23:59:59'
    return
  }

  const d = new Date()
  if (opt.hours === 'tonight') {
    d.setHours(23, 59, 59, 0)
  } else if (opt.hours) {
    d.setHours(d.getHours() + opt.hours)
  } else if (opt.days) {
    d.setDate(d.getDate() + opt.days)
    if (opt.endOfDay) d.setHours(23, 59, 59, 0)
  } else if (opt.months) {
    d.setMonth(d.getMonth() + opt.months)
  } else if (opt.years) {
    d.setFullYear(d.getFullYear() + opt.years)
  }

  const pad = (n) => String(n).padStart(2, '0')
  form.expirationDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const triggerUpload = () => fileInput.value?.click()
const handleFileChange = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) return ElMessage.warning('图片不能超过 5MB')
  loading.value = true
  try { const res = await uploadFile(file); form.goodsImageUrl = res.data } catch (e) { ElMessage.error('上传失败') } finally { loading.value = false }
}

// 轮询收到紧急广播时展示弹窗
const showEmergencyPopup = (data) => {
  if (emergencyDialog.visible) return
  emergencyDialog.data = data; emergencyDialog.visible = true
  processedBroadcastIds.add(data.orderId)
}

const emergencyForm = reactive({ goodsName: '', stock: 1, unit: '件', estimatedValue: 0 })

const formatRecipientTag = (tag) => {
  const map = { 'ELDERLY': '👴 需照顾老人', 'DISABLED': '♿ 残障人士', 'SAN_WORKER': '🧹 环卫工人', 'NORMAL': '👤 普通市民' }
  return map[tag] || tag
}

// 紧急广播弹窗 — 使用独立表单, 不再复用捐赠表单
const acceptEmergency = async () => {
  const d = emergencyDialog.data
  if (!emergencyForm.goodsName.trim()) return ElMessage.warning('请填写响应物资名称')
  emergencyDialog.visible = false
  try {
    await respondSos({
      orderId: d.orderId,
      goodsName: emergencyForm.goodsName,
      category: d.category || '应急物资',
      stock: emergencyForm.stock,
      unit: emergencyForm.unit,
      expirationDate: '2099-12-31 23:59:59',
      weightLevel: 1,
      volumeLevel: 1,
      goodsImageUrl: '/img/default.png',
      estimatedValue: emergencyForm.estimatedValue || 0
    })
    ElNotification.success({ title: '✅ 响应成功', message: '物资将点对点直达受赠方，感谢您的爱心！' })
    emergencyForm.goodsName = ''; emergencyForm.stock = 1
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '响应失败')
  }
}
const rejectEmergency = () => { emergencyDialog.visible = false; ElMessage.info('已忽略该调度请求') }

const handleDonate = async () => {
  if (!isFormValid.value) return
  submitting.value = true
  try {
    let expDate = form.expirationDate
    if (expDate.length === 16) expDate += ':00'

    await donateGoods({
      goodsName: form.goodsName,
      category: form.category,
      stock: form.stock,
      unit: form.unit,
      expirationDate: expDate,
      volumeLevel: form.volumeLevel,
      weightLevel: form.weightLevel,
      goodsImageUrl: form.goodsImageUrl,
      estimatedValue: form.estimatedValue,
      currentStationId: form.currentStationId
    })

    ElNotification.success({ title: '✅ 发布成功', message: '已同步至调度大盘，运力测算与匹配中...' })
    form.goodsName = ''; form.stock = 1; form.category = ''; form.expirationDate = ''
    form.currentStationId = null; form.weightLevel = 1; form.volumeLevel = 1; form.goodsImageUrl = ''; form.estimatedValue = 0
  } catch (e) { } finally { submitting.value = false }
}

const fetchStations = async (lon, lat) => {
  try {
    const res = await getRecommendStations({ lon, lat })
    stations.value = res.data?.records || res?.data?.data || res?.data || res || []
  } catch (e) {} finally { loading.value = false }
}

onMounted(async () => {
  // ✅ FIX-2: 加载真实系统模式
  getCurrentConfig().then(res => { if (res?.data?.sysMode) sysMode.value = res.data.sysMode }).catch(() => {})
  // ✅ FIX-2: 监听模式切换事件, 无需刷新即可实时变色
  window.addEventListener('mode-changed', (e) => { if (e.detail?.mode) sysMode.value = e.detail.mode })

  loading.value = true
  try {
    const userRes = await getUserProfile()
    if (userRes.data?.currentLon) await fetchStations(userRes.data.currentLon, userRes.data.currentLat)
    else await fetchStations()
  } catch (e) { await fetchStations() }
  pollTimer = setInterval(async () => {
    try {
      const res = await checkMyEmergencyBroadcast()
      if (res?.data && (res.data.category || res.data.requiredCategory) && !processedBroadcastIds.has(res.data.orderId)) {
        showEmergencyPopup(res.data)
      }
    } catch (e) {}
  }, 5000)
})

onUnmounted(() => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null } })
</script>

<style scoped>
/* ===== 品牌色 CSS 变量 ===== */
:root {
  --el-color-primary: #f97316;
  --el-color-primary-light-3: #fb923c;
  --el-color-primary-light-5: #fdba74;
  --el-color-primary-light-9: #fff7ed;
}

.app-layout { position: fixed; inset: 0; display: flex; width: 100vw; height: 100vh; background: #f8fafc; overflow-y: auto; overflow-x: hidden; }
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 20px; }
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); padding: 10px 18px; border-radius: 20px; font-size: 0.8rem; color: #475569; font-weight: bold; display: flex; align-items: center; gap: 8px; box-shadow: 0 6px 15px rgba(0,0,0,0.05); }
.pulse-dot { width: 8px; height: 8px; border-radius: 50%; animation: pulse 2s infinite; }
@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }

.donate-wrapper { max-width: 760px; width: 100%; margin: 40px auto; }
.page-header { margin-bottom: 24px; }
.page-header h2 { color: #1e293b; font-size: 1.8rem; margin: 0 0 8px; font-weight: 900; }
.page-header p { color: #64748b; font-size: 1rem; margin: 0; }

/* ===== 卡片区块 ===== */
.form-card { background: #fff; border-radius: 16px; padding: 28px 30px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; }
.card-title { font-size: 0.9rem; font-weight: 900; color: #64748b; background: #f8fafc; display: inline-block; padding: 6px 14px; border-radius: 8px; margin-bottom: 20px; letter-spacing: 0.5px; }
.no-margin-bottom { margin-bottom: 0 !important; }

/* ===== 上传区 ===== */
.upload-zone { width: 100%; height: 170px; border-radius: 14px; border: 2px dashed #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.25s; background: #fafafa; position: relative; overflow: hidden; }
.upload-zone:hover { border-color: #f97316; background: #fff7ed; }
.upload-zone.has-img { border-style: solid; border-color: #e2e8f0; }
.upload-icon-large { font-size: 2.2rem; margin-bottom: 4px; }
.upload-text { font-weight: 900; color: #334155; font-size: 0.95rem; }
.upload-hint { font-size: 0.78rem; color: #94a3b8; margin-top: 2px; }
.preview-img { width: 100%; height: 100%; object-fit: cover; }
.up-mask { position: absolute; inset: 0; background: rgba(15,23,42,0.5); backdrop-filter: blur(4px); color: #fff; font-weight: 900; display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.3s; }
.upload-zone.has-img:hover .up-mask { opacity: 1; }

/* ===== 分类胶囊 ===== */
.category-group { margin-bottom: 12px; }
.category-group:last-child { margin-bottom: 0; }
.category-group-name { font-size: 0.78rem; color: #94a3b8; font-weight: bold; display: block; margin-bottom: 6px; }
.pill-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
.pill-btn { display: inline-block; padding: 7px 16px; background: #f8fafc; border: 1px solid #e2e8f0; color: #475569; border-radius: 100px; font-size: 0.85rem; font-weight: bold; cursor: pointer; transition: all 0.2s; user-select: none; }
.pill-btn:hover { border-color: #fdba74; background: #fff7ed; color: #ea580c; }
.pill-btn.active { background: #f97316; border-color: #ea580c; color: #fff; box-shadow: 0 3px 10px rgba(249, 115, 22, 0.25); }
.pill-btn.disabled { opacity: 0.3; cursor: not-allowed; }
.pill-btn.disabled:hover { border-color: #e2e8f0; background: #f8fafc; color: #475569; }

/* ===== 估值提示 ===== */
.valuation-hint { font-size: 0.78rem; color: #b45309; font-weight: bold; margin: -8px 0 16px 0; }

/* ===== 快捷日期 ===== */
.quick-date-row { display: flex; flex-wrap: wrap; gap: 6px; }

/* ===== 双维规格选择卡片 ===== */
.spec-group { margin-bottom: 20px; }
.spec-group:last-of-type { margin-bottom: 0; }
.spec-group-label {
  font-size: 0.82rem; font-weight: 900; color: #64748b;
  margin-bottom: 10px; display: block;
}

/* Step 1: 增加卡片间距 */
.spec-cards { display: flex; gap: 16px; }

/* Step 1+2: 宽裕内边距 + 平滑过渡 */
.spec-card {
  flex: 1; position: relative;
  display: flex; align-items: center; gap: 14px;
  padding: 16px 18px; border-radius: 14px;
  background: #f8fafc; border: 1.5px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.3s ease;
}
.spec-card:hover { border-color: #fdba74; background: #fff; }

/* Step 3: 选中状态 — 微光 + 上浮 */
.spec-card.active {
  border-color: #f97316; background: #fffcf9;
  box-shadow: 0 8px 24px rgba(249, 115, 22, 0.12);
  transform: translateY(-2px);
}

/* Step 1: 副标题加大字宽、加行高 */
.spec-desc { font-size: 0.78rem; color: #94a3b8; font-weight: 500; line-height: 1.4; }
.spec-card.active .spec-desc { color: #c2410c; }

/* Step 2: 图标弹性过渡 */
.spec-icon {
  font-size: 1.5rem; flex-shrink: 0;
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.spec-card:hover .spec-icon,
.spec-card.active .spec-icon { transform: scale(1.15); }

.spec-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.spec-title { font-size: 0.9rem; font-weight: 900; color: #1e293b; }
.spec-card.active .spec-title { color: #ea580c; }

/* Step 4: 水滴弹出角标 */
.spec-check {
  position: absolute; top: -8px; right: -8px;
  width: 24px; height: 24px; border-radius: 50%;
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: #fff; font-size: 0.7rem; font-weight: 900; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 3px 10px rgba(249, 115, 22, 0.35);
  animation: badge-pop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes badge-pop {
  0%   { transform: scale(0); }
  60%  { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.spec-footer-hint {
  margin-top: 20px; font-size: 0.78rem; color: #94a3b8;
  font-weight: 500; text-align: center;
}

/* ===== 内联 alert ===== */
.inline-alert { margin-top: 12px; }

/* ===== CTA 按钮 ===== */
.submit-btn-cta { width: 100%; height: 56px; font-size: 1.1rem; font-weight: 900; border-radius: 16px; margin-top: 8px; letter-spacing: 1px; box-shadow: 0 8px 20px rgba(249, 115, 22, 0.3); transition: all 0.3s; }
.submit-btn-cta:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(249, 115, 22, 0.4); }

/* ===== 全局覆盖 Element Plus 蓝色 → 橙色 ===== */
:deep(.el-input-number__increase:hover), :deep(.el-input-number__decrease:hover) { color: #f97316; }
:deep(.el-select .el-input.is-focus .el-input__wrapper) { box-shadow: 0 0 0 1px #f97316 inset; }
:deep(.el-input__wrapper.is-focus) { box-shadow: 0 0 0 1px #f97316 inset; }
:deep(.el-checkbox__input.is-checked .el-checkbox__inner) { background-color: #f97316; border-color: #f97316; }
:deep(.el-checkbox__input.is-checked + .el-checkbox__label) { color: #f97316; }
:deep(.el-date-picker) { --el-color-primary: #f97316; }

/* ===== 紧急响应弹窗 ===== */
.emergency-recipient-card { background: #fef2f2; border: 2px dashed #fca5a5; border-radius: 14px; padding: 16px; margin-bottom: 18px; }
.er-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.er-avatar { font-size: 2rem; background: #fff; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
.er-name { font-size: 1.1rem; font-weight: 900; color: #991b1b; }
.er-tag { display: inline-block; margin-top: 3px; font-size: 0.75rem; background: #fecaca; color: #dc2626; padding: 2px 8px; border-radius: 6px; font-weight: 700; }
.er-details { display: flex; flex-direction: column; gap: 6px; }
.er-row { font-size: 0.88rem; color: #7f1d1d; font-weight: 600; }
.er-row span { margin-right: 4px; }
.emergency-response-form { background: #f8fafc; border-radius: 12px; padding: 14px; }
.erf-title { font-size: 0.9rem; font-weight: 800; color: #475569; margin-bottom: 10px; }
.erf-input { margin-bottom: 4px; }
</style>
