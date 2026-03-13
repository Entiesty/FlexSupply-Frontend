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
        <div class="header-icon">💝</div>
        <div class="header-text">
          <h2>爱心商家捐赠大厅</h2>
          <p>让每一份余量，成为城市的温暖能量</p>
        </div>
      </header>

      <div class="donate-card" v-loading="loading">
        <div class="section-title"><span>01</span> 基础物资信息</div>
        <div class="form-item">
          <label>物资明细名称</label>
          <input v-model="form.goodsName" type="text" placeholder="例如：某品牌全麦吐司面包 (建议标注规格)"/>
        </div>

        <div class="section-title"><span>02</span> 物资大类归属 (基于系统状态与资质动态渲染)</div>
        <div class="category-matrix">
          <template v-if="Object.keys(groupedCategories).length > 0">
            <div class="cat-group" v-for="(group, groupName) in groupedCategories" :key="groupName">
              <div class="group-name">{{ groupName }}</div>
              <div class="tags-wrap">
                <span v-for="cat in group" :key="cat" class="tag-btn" :class="{ active: form.category === cat }" @click="form.category = cat">{{ cat }}</span>
              </div>
            </div>
          </template>
        </div>

        <div class="section-title"><span>03</span> 物理形态预估 (调度引擎将据此指派异构运力)</div>
        <div class="physics-grid">
          <div class="physics-group">
            <label>📦 体积占用预估</label>
            <div class="abstract-options">
              <div class="abs-card" :class="{ active: form.volumeLevel === 1 }" @click="form.volumeLevel = 1">
                <div class="abs-icon">🛍️</div><div class="abs-text">手提袋级</div>
              </div>
              <div class="abs-card" :class="{ active: form.volumeLevel === 2 }" @click="form.volumeLevel = 2">
                <div class="abs-icon">🎒</div><div class="abs-text">外卖箱级</div>
              </div>
              <div class="abs-card" :class="{ active: form.volumeLevel === 3 }" @click="form.volumeLevel = 3">
                <div class="abs-icon">🚙</div><div class="abs-text">后备箱级</div>
              </div>
            </div>
          </div>
          <div class="physics-group">
            <label>⚖️ 整体重量预估</label>
            <div class="abstract-options">
              <div class="abs-card" :class="{ active: form.weightLevel === 1 }" @click="form.weightLevel = 1">
                <div class="abs-icon">🪶</div><div class="abs-text">轻便 &lt;5kg</div>
              </div>
              <div class="abs-card" :class="{ active: form.weightLevel === 2 }" @click="form.weightLevel = 2">
                <div class="abs-icon">🧱</div><div class="abs-text">偏重 ~15kg</div>
              </div>
              <div class="abs-card" :class="{ active: form.weightLevel === 3 }" @click="form.weightLevel = 3">
                <div class="abs-icon">🏋️‍♂️</div><div class="abs-text">极重 &gt;20kg</div>
              </div>
            </div>
          </div>
        </div>

        <transition name="fade-slide">
          <div v-if="form.category" class="tag-engine-section">
            <div class="section-title"><span>04</span> 物资精细化标签 (赋能算法精准匹配)</div>
            <div class="tags-matrix">
              <div class="tags-wrap">
                <span v-for="tag in availableTags" :key="tag" class="tag-btn multi-select" :class="{ active: form.tags.includes(tag) }" @click="toggleTag(tag)">
                  {{ form.tags.includes(tag) ? '✅ ' : '+ ' }}{{ tag }}
                </span>
              </div>
              <p class="tag-tip">💡 勾选符合该物资特征的标签，让它能更精准地匹配给有特殊需求(如糖尿病)的弱势群体</p>
            </div>
          </div>
        </transition>

        <div class="section-title"><span>05</span> 数量与保质期监控</div>
        <div class="form-row">
          <div class="form-item flex-2">
            <label>捐赠数量与单位</label>
            <div class="input-with-unit">
              <input v-model="form.stock" type="number" min="1" placeholder="填入数字"/>
              <select v-model="form.unit" class="unit-select">
                <option value="件">件</option><option value="箱">箱</option><option value="份">份</option>
                <option value="kg">kg</option><option value="袋">袋</option><option value="提">提</option>
              </select>
            </div>
          </div>
          <div class="form-item flex-1">
            <label>过期/临期警戒线</label>
            <input v-model="form.expirationDate" type="datetime-local" class="datetime-input" />
          </div>
        </div>

        <div class="section-title">
          <span>06</span> {{ sysMode === 'NORMAL' ? '目标捐入驿站设定' : '物流路由模式 (系统已接管)' }}
        </div>

        <template v-if="sysMode === 'NORMAL'">
          <div class="form-item">
            <label>期望存入的社区驿站 (系统将指派志愿者上门取货并送往此地)</label>
            <div class="select-wrapper">
              <select v-model="form.currentStationId" :class="{ 'has-value': form.currentStationId !== '' }">
                <option disabled value="">请选择距您最近的社区驿站...</option>
                <option v-for="st in stations" :key="st.stationId" :value="st.stationId">📍 {{ st.stationName }}</option>
              </select>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="emergency-route-box">
            <div class="route-icon">🚀</div>
            <div class="route-text">
              <h4>急用直达模式已激活 (Point-to-Point)</h4>
              <p>生命通道已开启！系统将越过社区驿站，指派骑士从您的商铺取货后，<strong>点对点直线护送</strong>至求救市民手中！</p>
            </div>
          </div>
        </template>

        <button class="submit-btn" :disabled="!isFormValid" @click="handleDonate">
          <span class="btn-shine"></span>
          {{ sysMode === 'EMERGENCY' ? '🚨 响应广播，立即发货' : '确认无误，发布捐赠 (等待取货)' }}
        </button>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus'
import { getRecommendStations, donateGoods } from '@/api/resource'
import { getUserProfile } from '@/api/user'
import { checkMyEmergencyBroadcast } from "@/api/dispatch"

const loading = ref(false)
const stations = ref([])
const targetOrderId = ref(null)
const sysMode = ref('NORMAL')
const merchantIndustryType = ref(1)
let pollTimer = null

const groupedCategories = computed(() => {
  const type = Number(merchantIndustryType.value)
  const mode = sysMode.value
  const baseLib = {
    '🍞 粮油副食': ['米面粮油', '烘焙糕点', '速食品', '乳制品', '生鲜水果', '生鲜蔬菜', '生鲜冷冻'],
    '💊 医疗与特需': ['医疗用品', '助残设备', '营养品'],
    '🛡️ 应急与生活': ['饮用水', '应急食品', '应急装备', '生活用品', '防寒衣物']
  }
  let result = {}
  if (mode === 'NORMAL') {
    if (type === 1 || type === 2) result['🍞 粮油副食'] = baseLib['🍞 粮油副食']
  } else if (mode === 'EMERGENCY') {
    result['🍞 粮油副食'] = baseLib['🍞 粮油副食']; result['🛡️ 应急与生活'] = baseLib['🛡️ 应急与生活']; result['💊 医疗与特需'] = baseLib['💊 医疗与特需'];
  }
  return result
})

// 🚨 加入：volumeLevel 和 weightLevel 默认值均为 1
const form = reactive({
  goodsName: '', category: '', tags: [], stock: '', unit: '件', expirationDate: '', currentStationId: '',
  volumeLevel: 1, weightLevel: 1
})

const isFormValid = computed(() => {
  if (sysMode.value === 'EMERGENCY') return form.goodsName && form.category && form.stock && form.expirationDate
  return form.goodsName && form.category && form.stock && form.expirationDate && form.currentStationId
})

const availableTags = computed(() => {
  const cat = form.category
  if (['米面粮油', '烘焙糕点', '速食品', '应急食品'].includes(cat)) return ['主食', '速食', '饱腹', '低糖', '无糖', '易咀嚼']
  if (['乳制品', '饮用水'].includes(cat)) return ['饮品', '高蛋白', '常温', '需要冷藏']
  if (['生鲜水果', '生鲜蔬菜', '生鲜冷冻'].includes(cat)) return ['生鲜', '需冷藏', '易损', '高维生素']
  if (['医疗用品', '营养品'].includes(cat)) return ['高血压', '心脏病', '糖尿病', '感冒发烧', '外伤', '肠胃']
  if (['应急装备', '生活用品', '防寒衣物'].includes(cat)) return ['保暖', '照明', '防护', '日用']
  return []
})

watch(() => form.category, () => { form.tags = [] })
const toggleTag = (tag) => { const idx = form.tags.indexOf(tag); if (idx > -1) form.tags.splice(idx, 1); else form.tags.push(tag) }

onMounted(async () => {
  loading.value = true
  try {
    sysMode.value = 'NORMAL'
    const userRes = await getUserProfile()
    if (userRes.data) {
      if (userRes.data.industryType) merchantIndustryType.value = userRes.data.industryType
      if (userRes.data.currentLon) await fetchStations(userRes.data.currentLon, userRes.data.currentLat)
      else await fetchStations()
    }
  } catch (error) { await fetchStations() }

  pollTimer = setInterval(async () => {
    try {
      const res = await checkMyEmergencyBroadcast()
      if (res?.data && res.data.category) showEmergencyPopup(res.data)
    } catch (e) {}
  }, 5000)
})

onUnmounted(() => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null } })

const showEmergencyPopup = (data) => {
  ElMessageBox.confirm(
      `<div style="text-align: center; padding: 10px 0;">
      <div style="font-size: 3.5rem; margin-bottom: 10px; animation: pulse 1s infinite;">🚨</div>
      <div style="color: #ef4444; font-size: 1.4rem; font-weight: 900; margin-bottom: 15px;">城市生命通道紧急求援！</div>
      <div style="color: #1e293b; font-size: 1.1rem; line-height: 1.6; font-weight: bold;">
        附近有市民遭遇困境，急需<br/>
        <span style="color:#ea580c; font-size:1.6rem; background: #fff7ed; padding: 2px 10px; border-radius: 8px; display: inline-block; margin: 10px 0; border: 1px dashed #fdba74;">
          【${data.category}】
        </span>
      </div>
    </div>`,
      '🔴 收到最高优先级调度广播',
      { dangerouslyUseHTMLString: true, confirmButtonText: '我店里有，马上响应！', cancelButtonText: '已售罄', showClose: false, closeOnClickModal: false, closeOnPressEscape: false, customClass: 'emergency-merchant-dialog' }
  ).then(() => {
    sysMode.value = 'EMERGENCY'; form.category = data.category; targetOrderId.value = data.orderId
    document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' })
  }).catch(() => {})
}

const fetchStations = async (lon = null, lat = null) => {
  try {
    const res = await getRecommendStations({ lon, lat })
    stations.value = res.data || []
  } catch (e) {} finally { loading.value = false }
}

const handleDonate = async () => {
  loading.value = true
  try {
    const finalGoodsName = `${form.goodsName} (单位:${form.unit})`
    let formattedDate = form.expirationDate.replace('T', ' ');
    if (formattedDate.length === 16) formattedDate += ':00';

    const submitData = {
      ...form,
      goodsName: finalGoodsName,
      expirationDate: formattedDate,
      tags: form.tags,
      currentStationId: sysMode.value === 'EMERGENCY' ? null : form.currentStationId,
      targetOrderId: targetOrderId.value
    }
    await donateGoods(submitData)

    ElNotification.success({ title: '🎉 成功', message: '已接入调度大盘，运力测算中...', duration: 5000 })
    form.goodsName = ''; form.stock = ''; form.category = ''; form.tags = []; form.expirationDate = ''; form.currentStationId = '';
    form.volumeLevel = 1; form.weightLevel = 1;
    sysMode.value = 'NORMAL'; targetOrderId.value = null;
  } catch (e) {
  } finally { loading.value = false }
}
</script>

<style scoped>
.physics-grid { display: flex; gap: 30px; margin-bottom: 25px; }
.physics-group { flex: 1; }
.physics-group label { display: block; font-size: 0.95rem; color: #475569; font-weight: bold; margin-bottom: 10px; }
.abstract-options { display: flex; gap: 10px; }
.abs-card { flex: 1; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 12px 5px; text-align: center; cursor: pointer; transition: 0.2s; user-select: none; }
.abs-card:hover { border-color: #cbd5e1; transform: translateY(-2px); }
.abs-card.active { background: #eff6ff; border-color: #3b82f6; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2); }
.abs-icon { font-size: 1.8rem; margin-bottom: 5px; }
.abs-text { font-size: 0.8rem; font-weight: 900; color: #64748b; }
.abs-card.active .abs-text { color: #2563eb; }

.main-content { flex: 1; height: 100vh; overflow-y: auto; display: flex; flex-direction: column; position: relative; padding: 40px; background: #f1f5f9; }
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); transition: 0.3s; }
.pulse-dot { width: 8px; height: 8px; background: #f97316; border-radius: 50%; box-shadow: 0 0 8px #f97316; animation: pulse-orange 2s infinite; }
@keyframes pulse-orange { 0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(249, 115, 22, 0); } 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); } }
.donate-wrapper { max-width: 800px; margin: 0 auto; width: 100%; padding-bottom: 60px; }
.page-header { display: flex; align-items: center; gap: 20px; margin-bottom: 25px; }
.header-icon { font-size: 3rem; background: #fff; padding: 15px; border-radius: 20px; box-shadow: 0 10px 25px rgba(249, 115, 22, 0.15); }
.header-text h2 { color: #1e293b; margin: 0 0 8px; font-size: 2rem; font-weight: 900; }
.header-text p { color: #64748b; margin: 0; font-size: 1.05rem; }
.donate-card { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); padding: 35px 40px; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.04); border: 1px solid #fff; }
.section-title { font-size: 1.1rem; font-weight: 900; color: #334155; margin: 30px 0 15px; display: flex; align-items: center; gap: 10px; }
.section-title span { background: #ea580c; color: #fff; font-size: 0.8rem; padding: 2px 8px; border-radius: 8px; font-family: monospace; }
.form-item { display: flex; flex-direction: column; margin-bottom: 20px; }
.form-item label { font-size: 0.9rem; font-weight: bold; color: #64748b; margin-bottom: 10px; }
.form-item input { padding: 14px 18px; border: 2px solid #e2e8f0; border-radius: 14px; font-size: 1.05rem; background: #f8fafc; outline: none; transition: 0.3s; }
.form-item input:focus { background: #fff; border-color: #f97316; box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1); }
.form-row { display: flex; gap: 20px; } .flex-1 { flex: 1; } .flex-2 { flex: 1.5; }
.input-with-unit { display: flex; gap: 10px; } .input-with-unit input { flex: 1; }
.unit-select { width: 85px; padding: 14px 10px; border: 2px solid #e2e8f0; border-radius: 14px; font-size: 1.05rem; color: #ea580c; background: #fff7ed; font-weight: bold; outline: none; cursor: pointer; text-align: center; }
.category-matrix { background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px dashed #cbd5e1; }
.cat-group { margin-bottom: 15px; } .group-name { font-size: 0.85rem; color: #94a3b8; font-weight: bold; margin-bottom: 10px; }
.tags-wrap { display: flex; flex-wrap: wrap; gap: 10px; }
.tag-btn { padding: 8px 16px; background: #fff; border: 2px solid transparent; color: #475569; border-radius: 12px; font-size: 0.9rem; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
.tag-btn:hover { border-color: #fdba74; color: #ea580c; }
.tag-btn.active { background: #fff7ed; border-color: #f97316; color: #ea580c; transform: scale(1.02); }
.tag-engine-section { margin-top: 10px; } .tags-matrix { background: #eff6ff; padding: 20px; border-radius: 16px; border: 1px dashed #93c5fd; }
.tag-btn.multi-select { background: #f8fafc; border-color: #e2e8f0; }
.tag-btn.multi-select.active { background: #3b82f6; color: #fff; border-color: #2563eb; }
.select-wrapper select { width: 100%; padding: 14px 18px; border: 2px solid #e2e8f0; border-radius: 14px; font-size: 1.05rem; color: #94a3b8; background: #f8fafc; outline: none; cursor: pointer; }
.select-wrapper select.has-value { color: #1e293b; background: #fff; border-color: #3b82f6; }
.emergency-route-box { background: #fef2f2; border: 2px dashed #fca5a5; padding: 20px; border-radius: 14px; display: flex; align-items: flex-start; gap: 15px; margin-bottom: 20px; }
.route-icon { font-size: 2.5rem; animation: floatUp 2s ease-in-out infinite; }
.route-text h4 { color: #ef4444; margin: 0 0 5px; font-size: 1.1rem; font-weight: 900; }
.route-text p { color: #7f1d1d; margin: 0; font-size: 0.95rem; font-weight: bold; }
@keyframes floatUp { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
.submit-btn { width: 100%; padding: 18px; border: none; border-radius: 16px; background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; font-size: 1.2rem; font-weight: 900; cursor: pointer; transition: 0.3s; margin-top: 20px; }
.submit-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(234, 88, 12, 0.35); }
.submit-btn:disabled { background: #cbd5e1; cursor: not-allowed; opacity: 0.7; }
</style>
<style>
.emergency-merchant-dialog { border-radius: 24px !important; border: 4px solid #ef4444 !important; box-shadow: 0 20px 50px rgba(239, 68, 68, 0.3) !important; overflow: hidden; }
.emergency-merchant-dialog .el-message-box__header { background: #fef2f2; border-bottom: 1px solid #fca5a5; padding-bottom: 15px; }
.emergency-merchant-dialog .el-message-box__title { color: #ef4444 !important; font-weight: 900 !important; }
.emergency-merchant-dialog .el-button--primary { background: linear-gradient(135deg, #ef4444, #dc2626) !important; border: none !important; font-weight: 900 !important; font-size: 1.1rem !important; padding: 12px 24px !important; border-radius: 12px !important; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4) !important; transition: all 0.2s; }
.emergency-merchant-dialog .el-button--primary:hover { transform: scale(1.05); }
</style>