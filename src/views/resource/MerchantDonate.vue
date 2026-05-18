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

        <el-alert v-if="sysMode === 'EMERGENCY'" :title="'🚨 定向救助任务: ' + activeTargetCategory"
          type="error" :closable="false" show-icon style="margin-bottom: 20px;">
          <template #default>
            请选择<strong>高亮类目</strong>发布物资 — 骑士已待命，取件后直达求助市民
            <el-button size="small" type="warning" style="margin-left: 12px;" @click="cancelEmergency">退出任务</el-button>
          </template>
        </el-alert>

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
                      :class="{ active: form.category === cat, disabled: sysMode === 'EMERGENCY' && !isEmergencyTarget(cat) }"
                      @click="selectCategory(cat)">{{ cat }}</span>
                  </div>
                </div>
              </template>
            </el-form-item>

            <el-form-item label="物资名称" prop="goodsName" class="no-margin-bottom">
              <el-input v-model="form.goodsName" size="large" placeholder="如：东北五常大米 5kg装" maxlength="50" show-word-limit />
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
                <el-form-item label="市场估值(元)">
                  <el-input-number v-model="form.estimatedValue" :min="0" :precision="2" controls-position="right"
                    style="width:100%;" placeholder="生成专属CSR社会责任战报" />
                </el-form-item>
              </el-col>
            </el-row>

            <div class="valuation-hint">💡 累计捐赠金额可作为企业所得税税前扣除申报佐证</div>

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
                      :disabled="opt.disabled" @click="applyQuickDate(opt)" round>{{ opt.label }}</el-button>
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- ====== 区块三：调度配置 ====== -->
          <div class="form-card">
            <div class="card-title">⚙️ 调度配置</div>

            <el-form-item label="物理形态 (影响运力匹配与超载校验)">
              <el-row :gutter="20">
                <el-col :span="12">
                  <div class="radio-label">📦 体积等级</div>
                  <el-radio-group v-model="form.volumeLevel">
                    <el-radio-button :value="1">🛍️ 手提袋</el-radio-button>
                    <el-radio-button :value="2">🎒 外卖箱</el-radio-button>
                    <el-radio-button :value="3">🚙 后备箱</el-radio-button>
                  </el-radio-group>
                </el-col>
                <el-col :span="12">
                  <div class="radio-label">⚖️ 重量等级</div>
                  <el-radio-group v-model="form.weightLevel">
                    <el-radio-button :value="1">🪶 轻便 &lt;5kg</el-radio-button>
                    <el-radio-button :value="2">🧱 偏重 5-15kg</el-radio-button>
                    <el-radio-button :value="3">🏋️ 极重 &gt;15kg</el-radio-button>
                  </el-radio-group>
                </el-col>
              </el-row>
            </el-form-item>

            <el-form-item class="no-margin-bottom">
              <el-checkbox v-model="form.isEmergencyOnly">
                <span class="check-label">🛡️ 标记为战备物资</span>
                <span class="check-desc">若系统进入预警冻结或应急响应状态，仅战备物资保持流通</span>
              </el-checkbox>
            </el-form-item>

            <template v-if="sysMode !== 'EMERGENCY'">
              <el-form-item label="目标履约驿站" prop="currentStationId" class="no-margin-bottom">
                <el-select v-model="form.currentStationId" placeholder="系统将按LBS匹配最近驿站..." style="width:100%;" filterable clearable>
                  <el-option v-for="st in availableStations" :key="st.stationId" :value="st.stationId"
                    :label="st.stationName + (st.hasFreezer === 1 ? ' 🧊冷链' : '')" />
                </el-select>
              </el-form-item>
              <el-alert v-if="isColdChainNeeded" title="🧊 检测到冷链需求 — 已自动过滤无冷库设备的驿站" type="info" :closable="false" class="inline-alert" />
            </template>
            <template v-else>
              <el-alert title="🚀 生命通道直达模式" type="error" :closable="false" show-icon class="inline-alert">
                <template #default>
                  该单将越过驿站大仓，系统已指派运力从商铺取件后<strong>点对点护送</strong>至求助市民处
                </template>
              </el-alert>
            </template>
          </div>

          <!-- CTA 提交按钮 -->
          <el-button size="large" :type="sysMode === 'EMERGENCY' ? 'danger' : 'primary'"
            class="submit-btn-cta" :disabled="!isFormValid" @click="handleDonate" :loading="submitting">
            {{ sysMode === 'EMERGENCY' ? '🚨 响应紧急广播，立即发货' : '确认上架，呼叫运力接货' }}
          </el-button>
        </el-form>
      </div>
    </main>

    <el-dialog v-model="emergencyDialog.visible" title="🚨 城市生命通道紧急求援"
      width="460px" :close-on-click-modal="false" :close-on-press-escape="false" align-center>
      <div style="text-align:center;">
        <p style="color:#64748b;margin-bottom:12px;">您是最靠近求助者的商家，急需以下物资：</p>
        <div style="background:#fef2f2;border:2px dashed #fca5a5;border-radius:12px;padding:16px;margin-bottom:12px;">
          <span style="color:#dc2626;font-size:1.4rem;font-weight:900;">
            {{ emergencyDialog.data?.requiredCategory || emergencyDialog.data?.category }}
          </span>
        </div>
        <div style="display:flex;gap:8px;justify-content:center;">
          <el-tag type="danger">最高优先级</el-tag>
          <el-tag type="info">LBS就近匹配</el-tag>
        </div>
      </div>
      <template #footer>
        <el-button @click="rejectEmergency">库存不足 / 忽略</el-button>
        <el-button type="danger" @click="acceptEmergency">⚡ 锁定任务，马上发货</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus'
import SideMenu from '@/views/dispatch/components/SideMenu.vue'
import { getRecommendStations, donateGoods } from '@/api/resource'
import { getUserProfile } from '@/api/user'
import { checkMyEmergencyBroadcast } from '@/api/dispatch'
import { uploadFile } from '@/api/common'

const loading = ref(false)
const submitting = ref(false)
const stations = ref([])
const targetOrderId = ref(null)
const sysMode = ref('NORMAL')
const activeTargetCategory = ref('')
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
  volumeLevel: 1,
  weightLevel: 1,
  goodsImageUrl: '',
  estimatedValue: 0,
  isEmergencyOnly: false
})

const emergencyDialog = reactive({ visible: false, data: null })

const rules = {
  goodsName: [{ required: true, message: '请输入物资名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择物资大类', trigger: 'change' }],
  stock: [{ required: true, message: '请输入捐赠数量', trigger: 'blur' }],
  expirationDate: [{ required: true, message: '请选择保质期', trigger: 'change' }],
  goodsImageUrl: [{ required: true, message: '请上传物资实拍图', trigger: 'change' }],
  currentStationId: [{
    validator: (_rule, value, callback) => {
      if (sysMode.value !== 'EMERGENCY' && !value) callback(new Error('请选择目标驿站'))
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

const isEmergencyTarget = (cat) => {
  const target = activeTargetCategory.value
  if (!target) return true
  if (cat === target) return true
  for (const subs of Object.values(categoryGroups)) {
    if (subs.includes(target) && subs.includes(cat)) return true
  }
  return false
}

const selectCategory = (cat) => {
  if (sysMode.value === 'EMERGENCY' && !isEmergencyTarget(cat)) {
    ElMessage.warning('应急模式下只能选择高亮类目')
    return
  }
  form.category = cat
}

const isFormValid = computed(() => {
  if (!form.goodsName || !form.category || !form.stock || !form.expirationDate || !form.goodsImageUrl) return false
  if (sysMode.value !== 'EMERGENCY' && !form.currentStationId) return false
  return true
})

const isColdChainNeeded = computed(() =>
  form.category === '冷冻食品' || form.category === '乳制品' || (form.tags || []).includes('需冷藏保鲜')
)

const availableStations = computed(() =>
  isColdChainNeeded.value ? stations.value.filter(s => s.hasFreezer === 1 || s.hasFreezer === true) : stations.value
)

watch(availableStations, (newSts) => {
  if (form.currentStationId && !newSts.find(s => s.stationId === form.currentStationId)) {
    form.currentStationId = null
    ElMessage.warning('🧊 已为您重置不支持冷链的驿站选项')
  }
})

// 保质期快捷 — 适配新分类
const quickDateOptions = computed(() => {
  const cat = form.category
  if (!cat) return []
  if (['热食盒饭'].includes(cat)) return [{ label: '4小时内', hours: 4 }, { label: '今晚前', hours: 'tonight' }]
  if (['生鲜果蔬', '冷冻食品', '烘焙糕点', '乳制品'].includes(cat)) return [{ label: '剩1天', days: 1 }, { label: '剩3天', days: 3 }, { label: '剩1周', days: 7 }]
  if (['米面粮油', '方便速食', '饮用水', '常备药品', '营养补品', '应急食品'].includes(cat)) return [{ label: '剩1月', months: 1 }, { label: '半年', months: 6 }, { label: '1年+', years: 1 }]
  return [{ label: '1年有效', years: 1 }, { label: '长期', years: 10 }]
})

const applyQuickDate = (opt) => {
  const d = new Date()
  if (opt.hours === 'tonight') d.setHours(23, 59, 59)
  else if (opt.hours) d.setHours(d.getHours() + opt.hours)
  else if (opt.days) d.setDate(d.getDate() + opt.days)
  else if (opt.months) d.setMonth(d.getMonth() + opt.months)
  else if (opt.years) d.setFullYear(d.getFullYear() + opt.years)
  const tz = d.getTimezoneOffset() * 60000
  form.expirationDate = new Date(d - tz).toISOString().slice(0, 19).replace('T', ' ')
}

const triggerUpload = () => fileInput.value?.click()
const handleFileChange = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) return ElMessage.warning('图片不能超过 5MB')
  loading.value = true
  try { const res = await uploadFile(file); form.goodsImageUrl = res.data } catch (e) { ElMessage.error('上传失败') } finally { loading.value = false }
}

const showEmergencyPopup = (data) => {
  if (emergencyDialog.visible) return
  emergencyDialog.data = data; emergencyDialog.visible = true
  processedBroadcastIds.add(data.orderId)
}
const acceptEmergency = () => {
  const d = emergencyDialog.data
  sysMode.value = 'EMERGENCY'; activeTargetCategory.value = d.requiredCategory || d.category
  targetOrderId.value = d.orderId; form.category = ''; emergencyDialog.visible = false
}
const rejectEmergency = () => { emergencyDialog.visible = false; emergencyDialog.data = null; ElMessage.info('已忽略该调度请求') }
const cancelEmergency = () => {
  ElMessageBox.confirm('确认撤销援助任务？该工单将重新放入公池。', '⚠️ 撤销援助任务', {
    confirmButtonText: '确认撤销', cancelButtonText: '点错了', type: 'warning'
  }).then(() => {
    sysMode.value = 'NORMAL'; targetOrderId.value = null; form.category = ''
    activeTargetCategory.value = ''
  }).catch(() => {})
}

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
      isEmergencyOnly: form.isEmergencyOnly,
      currentStationId: sysMode.value === 'EMERGENCY' ? null : form.currentStationId,
      targetOrderId: targetOrderId.value
    })

    ElNotification.success({ title: '✅ 发布成功', message: '已同步至调度大盘，运力测算与匹配中...' })
    form.goodsName = ''; form.stock = 1; form.category = ''; form.expirationDate = ''
    form.currentStationId = null; form.volumeLevel = 1; form.weightLevel = 1; form.goodsImageUrl = ''; form.estimatedValue = 0; form.isEmergencyOnly = false
    sysMode.value = 'NORMAL'; targetOrderId.value = null; activeTargetCategory.value = ''
  } catch (e) { } finally { submitting.value = false }
}

const fetchStations = async (lon, lat) => {
  try {
    const res = await getRecommendStations({ lon, lat })
    stations.value = res.data?.records || res?.data?.data || res?.data || res || []
  } catch (e) {} finally { loading.value = false }
}

onMounted(async () => {
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

/* ===== 物理形态 radio ===== */
.radio-label { font-size: 0.8rem; color: #94a3b8; font-weight: bold; margin-bottom: 8px; }

/* ===== 战备勾选 ===== */
.check-label { font-weight: 900; color: #1e293b; }
.check-desc { color: #94a3b8; font-size: 0.82rem; margin-left: 8px; }

/* ===== 内联 alert ===== */
.inline-alert { margin-top: 12px; }

/* ===== CTA 按钮 ===== */
.submit-btn-cta { width: 100%; height: 56px; font-size: 1.1rem; font-weight: 900; border-radius: 16px; margin-top: 8px; letter-spacing: 1px; box-shadow: 0 8px 20px rgba(249, 115, 22, 0.3); transition: all 0.3s; }
.submit-btn-cta:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(249, 115, 22, 0.4); }

/* ===== 全局覆盖 Element Plus 蓝色 → 橙色 ===== */
:deep(.el-radio-group) { width: 100%; display: flex; }
:deep(.el-radio-button) { flex: 1; }
:deep(.el-radio-button__inner) { width: 100%; text-align: center; font-weight: bold; font-size: 0.85rem; }
:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) { background-color: #f97316; border-color: #ea580c; box-shadow: none; }
:deep(.el-input-number__increase:hover), :deep(.el-input-number__decrease:hover) { color: #f97316; }
:deep(.el-select .el-input.is-focus .el-input__wrapper) { box-shadow: 0 0 0 1px #f97316 inset; }
:deep(.el-input__wrapper.is-focus) { box-shadow: 0 0 0 1px #f97316 inset; }
:deep(.el-checkbox__input.is-checked .el-checkbox__inner) { background-color: #f97316; border-color: #f97316; }
:deep(.el-checkbox__input.is-checked + .el-checkbox__label) { color: #f97316; }
:deep(.el-date-picker) { --el-color-primary: #f97316; }

@media screen and (max-width: 768px) {
  .main-content { padding: 12px; }
  .form-card { padding: 20px; }
}
</style>
