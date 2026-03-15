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
        <button class="history-import-btn" @click="loadLastRecord">
          <span class="icon">📜</span> 一键导入昨日发货模板
        </button>
      </header>

      <div class="donate-board" v-loading="loading">

        <div class="form-card">
          <div class="card-title">📦 01. 物资基础画像</div>

          <div class="goods-base-info">
            <div class="upload-zone" @click="triggerUpload" :class="{'has-img': form.goodsImageUrl}">
              <template v-if="!form.goodsImageUrl">
                <div class="up-icon">📷</div>
                <div class="up-text">点击拍摄/上传物资实拍图</div>
                <div class="up-sub">让受赠者更安心</div>
              </template>
              <template v-else>
                <img :src="form.goodsImageUrl" class="uploaded-img" />
                <div class="up-mask">重新上传</div>
              </template>
              <input type="file" ref="fileInput" hidden @change="handleFileChange" accept="image/*" />
            </div>

            <div class="base-inputs">
              <div class="form-item">
                <label><span class="req">*</span> 物资明细名称</label>
                <input v-model="form.goodsName" type="text" placeholder="例如：某品牌全麦吐司面包 (建议标注规格)"/>
              </div>
              <div class="form-item" style="margin-bottom: 0;">
                <label><span class="req">*</span> 物资大类归属</label>
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
              </div>
            </div>
          </div>
        </div>

        <div class="form-card">
          <div class="card-title">🔬 02. 调度与精细化特征</div>

          <div class="physics-grid">
            <div class="physics-group">
              <label>📦 体积占用预估</label>
              <div class="abstract-options">
                <div class="abs-card" :class="{ active: form.volumeLevel === 1 }" @click="form.volumeLevel = 1"><div class="abs-icon">🛍️</div><div class="abs-text">手提袋级</div></div>
                <div class="abs-card" :class="{ active: form.volumeLevel === 2 }" @click="form.volumeLevel = 2"><div class="abs-icon">🎒</div><div class="abs-text">外卖箱级</div></div>
                <div class="abs-card" :class="{ active: form.volumeLevel === 3 }" @click="form.volumeLevel = 3"><div class="abs-icon">🚙</div><div class="abs-text">后备箱级</div></div>
              </div>
            </div>
            <div class="physics-group">
              <label>⚖️ 整体重量预估</label>
              <div class="abstract-options">
                <div class="abs-card" :class="{ active: form.weightLevel === 1 }" @click="form.weightLevel = 1"><div class="abs-icon">🪶</div><div class="abs-text">轻便 &lt;5kg</div></div>
                <div class="abs-card" :class="{ active: form.weightLevel === 2 }" @click="form.weightLevel = 2"><div class="abs-icon">🧱</div><div class="abs-text">偏重 ~15kg</div></div>
                <div class="abs-card" :class="{ active: form.weightLevel === 3 }" @click="form.weightLevel = 3"><div class="abs-icon">🏋️‍♂️</div><div class="abs-text">极重 &gt;20kg</div></div>
              </div>
            </div>
          </div>

          <transition name="fade-slide">
            <div v-if="form.category" class="tag-engine-section">
              <label class="section-sub-label">🎯 食用门槛与特殊标签 (赋能算法精准匹配)</label>
              <div class="tags-matrix">
                <div class="tags-wrap">
                  <span v-for="tag in availableTags" :key="tag" class="tag-btn multi-select" :class="{ active: form.tags.includes(tag) }" @click="toggleTag(tag)">
                    {{ form.tags.includes(tag) ? '✅ ' : '+ ' }}{{ tag }}
                  </span>
                </div>
              </div>
            </div>
          </transition>
        </div>

        <div class="form-card">
          <div class="card-title">⏳ 03. 数量与生命周期监控</div>
          <div class="form-row">
            <div class="form-item flex-2">
              <label><span class="req">*</span> 捐赠数量与单位</label>
              <div class="input-with-unit">
                <input v-model="form.stock" type="number" min="1" placeholder="填入数字"/>
                <select v-model="form.unit" class="unit-select">
                  <option value="件">件</option><option value="箱">箱</option><option value="份">份</option>
                  <option value="kg">kg</option><option value="袋">袋</option><option value="提">提</option>
                </select>
              </div>
            </div>
            <div class="form-item flex-3">
              <label><span class="req">*</span> 过期/临期警戒线</label>
              <div class="date-input-wrap">
                <input v-model="form.expirationDate" type="datetime-local" class="datetime-input" />
                <div class="quick-dates">
                  <button class="qd-btn danger" @click="setQuickDate(1)">仅剩1天</button>
                  <button class="qd-btn warning" @click="setQuickDate(3)">剩3天内</button>
                  <button class="qd-btn safe" @click="setQuickDate(7)">剩1周</button>
                  <button class="qd-btn" @click="setQuickDate(30)">长期有效</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="form-card" style="margin-bottom: 0;">
          <div class="card-title">
            📍 04. {{ sysMode === 'NORMAL' ? '目标捐入驿站设定' : '物流路由模式 (系统已接管)' }}
          </div>

          <template v-if="sysMode === 'NORMAL'">
            <div class="form-item" style="margin-bottom: 0;">
              <label><span class="req">*</span> 期望存入的社区驿站 (系统将指派志愿者上门取货并送往此地)</label>
              <div class="select-wrapper">
                <select v-model="form.currentStationId" :class="{ 'has-value': form.currentStationId !== '' }">
                  <option disabled value="">请选择距您最近的社区驿站...</option>
                  <option v-for="st in availableStations" :key="st.stationId" :value="st.stationId">📍 {{ st.stationName }}</option>
                </select>
              </div>
              <transition name="fade-slide">
                <div v-if="isColdChainNeeded" class="dynamic-tip cold-tip">
                  🧊 当前物资或标签涉及冷链要求，系统已为您自动隐藏无冷藏设备的普通驿站。
                </div>
              </transition>
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
        </div>

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
import { uploadFile } from '@/api/common' // 🚨 引入文件上传接口

const loading = ref(false)
const stations = ref([])
const targetOrderId = ref(null)
const sysMode = ref('NORMAL')
const merchantIndustryType = ref(1)
let pollTimer = null

const fileInput = ref(null)

const form = reactive({
  goodsName: '', category: '', tags: [], stock: '', unit: '件', expirationDate: '', currentStationId: '',
  volumeLevel: 1, weightLevel: 1, goodsImageUrl: '' // 🌟 新增图片字段
})

const isFormValid = computed(() => {
  if (sysMode.value === 'EMERGENCY') return form.goodsName && form.category && form.stock && form.expirationDate && form.goodsImageUrl
  return form.goodsName && form.category && form.stock && form.expirationDate && form.currentStationId && form.goodsImageUrl
})

// ================== 🚨 核心拦截与冷链联动逻辑 ==================
const isColdChainNeeded = computed(() => {
  if (form.category === '生鲜冷冻') return true;
  if (form.tags.includes('需冷藏') || form.tags.includes('需要冷藏')) return true;
  return false;
})

const availableStations = computed(() => {
  if (isColdChainNeeded.value) {
    // 🚨 核心修复：将字段名严格对齐后端的 hasFreezer
    return stations.value.filter(st => st.hasFreezer === 1 || st.hasFreezer === true)
  }
  return stations.value
})

watch(availableStations, (newStations) => {
  if (form.currentStationId) {
    const isStillValid = newStations.find(st => st.stationId === form.currentStationId)
    if (!isStillValid) {
      form.currentStationId = ''
      ElMessage.warning('🧊 由于当前物资含冷链要求，已为您自动重置不符合条件的驿站')
    }
  }
})

// ================== 🌟 业务逻辑升级区 ==================

// 1. 实拍图上传逻辑
const triggerUpload = () => { if (fileInput.value) fileInput.value.click() }
const handleFileChange = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) return ElMessage.warning('图片大小不能超过 5MB')
  try {
    loading.value = true
    const res = await uploadFile(file)
    form.goodsImageUrl = res.data
    ElMessage.success('实拍图上传成功')
  } catch (error) { ElMessage.error('上传失败') } finally { loading.value = false }
}

// 2. 保质期快捷胶囊
const setQuickDate = (days) => {
  const target = new Date()
  target.setDate(target.getDate() + days)
  const tzOffset = target.getTimezoneOffset() * 60000
  const localISOTime = new Date(target - tzOffset).toISOString().slice(0, 16)
  form.expirationDate = localISOTime
}

// 3. 历史模板一键导入
const loadLastRecord = () => {
  const lastRecord = localStorage.getItem('lastDonationRecord')
  if (!lastRecord) return ElMessage.info('暂无历史发货记录')
  const data = JSON.parse(lastRecord)
  Object.keys(data).forEach(key => { if (form.hasOwnProperty(key) && key !== 'expirationDate' && key !== 'stock') form[key] = data[key] })
  ElMessage.success('已自动填入历史常用参数！请补充数量与日期即可。')
}

const saveToLastRecord = () => {
  localStorage.setItem('lastDonationRecord', JSON.stringify({
    goodsName: form.goodsName, category: form.category, tags: form.tags, unit: form.unit,
    volumeLevel: form.volumeLevel, weightLevel: form.weightLevel, goodsImageUrl: form.goodsImageUrl,
    currentStationId: form.currentStationId
  }))
}

// 4. 重构后的专业标签库
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

const availableTags = computed(() => {
  const cat = form.category
  if (!cat) return []
  let tags = []

  // 食用门槛
  if (['米面粮油', '生鲜蔬菜', '生鲜冷冻'].includes(cat)) tags.push('需完整烹饪')
  else if (['速食品'].includes(cat)) tags.push('需简单加热(微波/开水)')
  else if (['烘焙糕点', '乳制品', '生鲜水果', '饮用水', '应急食品'].includes(cat)) tags.push('开袋即食')

  // 特殊饮食
  if (['烘焙糕点', '速食品'].includes(cat)) tags.push('无麸质')
  if (['生鲜冷冻', '速食品', '烘焙糕点', '米面粮油'].includes(cat)) { tags.push('清真(Halal)', '纯素食') }
  if (['生鲜冷冻', '乳制品'].includes(cat)) tags.push('需冷藏')

  // 弱势关怀
  if (['烘焙糕点', '乳制品', '生鲜水果', '营养品'].includes(cat)) {
    tags.push('低GI/糖友友好', '低钠/心血管友好', '易吞咽/流食')
  }

  // 应急物资
  if (['医疗用品', '应急装备'].includes(cat)) tags.push('外伤急救', '保暖防寒', '慢性病用药')

  return [...new Set(tags)] // 去重
})

watch(() => form.category, () => { form.tags = [] })
const toggleTag = (tag) => { const idx = form.tags.indexOf(tag); if (idx > -1) form.tags.splice(idx, 1); else form.tags.push(tag) }

// ================== 系统挂载与发货 ==================
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

    // 🚨 架构师探测雷达：直接把后端返回的原始包裹打印出来！
    console.log("👉 拦截到的后端原始响应:", res);

    // 兼容取值法：不管后端套了多少层 data 或者 records，统统拿下
    stations.value = res.data?.records || res?.data?.data || res?.data || res || []

    console.log("👉 最终存入下拉框的数据:", stations.value);

  } catch (e) {
    console.error("拉取驿站失败", e)
  } finally {
    loading.value = false
  }
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
    saveToLastRecord() // 发货成功后存入历史缓存

    ElNotification.success({ title: '🎉 成功', message: '已接入调度大盘，运力测算中...', duration: 5000 })
    form.goodsName = ''; form.stock = ''; form.category = ''; form.tags = []; form.expirationDate = ''; form.currentStationId = '';
    form.volumeLevel = 1; form.weightLevel = 1; form.goodsImageUrl = '';
    sysMode.value = 'NORMAL'; targetOrderId.value = null;
  } catch (e) {
  } finally { loading.value = false }
}
</script>

<style scoped>
.main-content { flex: 1; height: 100vh; overflow-y: auto; display: flex; flex-direction: column; position: relative; padding: 40px; background: #f1f5f9; }
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); transition: 0.3s; }
.pulse-dot { width: 8px; height: 8px; background: #f97316; border-radius: 50%; box-shadow: 0 0 8px #f97316; animation: pulse-orange 2s infinite; }
@keyframes pulse-orange { 0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(249, 115, 22, 0); } 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); } }

.donate-wrapper { max-width: 850px; margin: 0 auto; width: 100%; padding-bottom: 60px; }
.page-header { display: flex; align-items: center; gap: 20px; margin-bottom: 25px; position: relative;}
.header-icon { font-size: 3rem; background: #fff; padding: 15px; border-radius: 20px; box-shadow: 0 10px 25px rgba(249, 115, 22, 0.15); }
.header-text h2 { color: #1e293b; margin: 0 0 8px; font-size: 2rem; font-weight: 900; }
.header-text p { color: #64748b; margin: 0; font-size: 1.05rem; }

.history-import-btn { position: absolute; right: 0; top: 50%; transform: translateY(-50%); background: #fff; border: 2px dashed #f97316; color: #ea580c; font-weight: bold; padding: 10px 20px; border-radius: 12px; cursor: pointer; transition: 0.3s; display: flex; align-items: center; gap: 8px;}
.history-import-btn:hover { background: #fff7ed; border-style: solid; box-shadow: 0 4px 12px rgba(249,115,22,0.15); transform: translateY(-50%) scale(1.05);}

.donate-board { display: flex; flex-direction: column; gap: 20px; }
.form-card { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); padding: 30px 35px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); border: 1px solid #fff; }
.card-title { font-size: 1.15rem; font-weight: 900; color: #1e293b; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px dashed #f1f5f9; display: flex; align-items: center; gap: 10px; }

/* 01. 基础画像结构 */
.goods-base-info { display: flex; gap: 25px; align-items: stretch; }
.upload-zone { flex: 0 0 180px; height: 180px; border: 2px dashed #cbd5e1; border-radius: 16px; background: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: 0.3s; position: relative; overflow: hidden; }
.upload-zone:hover { border-color: #3b82f6; background: #eff6ff; }
.upload-zone .up-icon { font-size: 2.5rem; margin-bottom: 10px; }
.upload-zone .up-text { font-size: 0.85rem; font-weight: bold; color: #3b82f6; text-align: center; }
.upload-zone .up-sub { font-size: 0.7rem; color: #94a3b8; margin-top: 5px; }
.uploaded-img { width: 100%; height: 100%; object-fit: cover; }
.up-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.5); color: #fff; font-weight: bold; display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.3s; }
.upload-zone.has-img:hover .up-mask { opacity: 1; }

.base-inputs { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }

/* 表单通用 */
.form-item { display: flex; flex-direction: column; margin-bottom: 20px; }
.form-item label { font-size: 0.9rem; font-weight: bold; color: #475569; margin-bottom: 10px; }
.req { color: #ef4444; margin-right: 4px; }
.form-item input { padding: 14px 18px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 1.05rem; background: #f8fafc; outline: none; transition: 0.3s; color: #1e293b; font-weight: 500;}
.form-item input:focus { background: #fff; border-color: #f97316; box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1); }
.form-row { display: flex; gap: 20px; } .flex-1 { flex: 1; } .flex-2 { flex: 1.2; } .flex-3 { flex: 2; }

/* 大类矩阵 */
.category-matrix { background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px dashed #cbd5e1; max-height: 150px; overflow-y: auto;}
.cat-group { margin-bottom: 15px; } .cat-group:last-child { margin-bottom: 0; }
.group-name { font-size: 0.8rem; color: #94a3b8; font-weight: bold; margin-bottom: 8px; }
.tags-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-btn { padding: 6px 14px; background: #fff; border: 1px solid #e2e8f0; color: #475569; border-radius: 8px; font-size: 0.85rem; font-weight: bold; cursor: pointer; transition: 0.2s; }
.tag-btn:hover { border-color: #fdba74; color: #ea580c; }
.tag-btn.active { background: #fff7ed; border-color: #f97316; color: #ea580c; box-shadow: 0 2px 8px rgba(249,115,22,0.15); }

/* 02. 调度因子结构 */
.physics-grid { display: flex; gap: 30px; margin-bottom: 20px; }
.physics-group { flex: 1; }
.physics-group label { display: block; font-size: 0.85rem; color: #64748b; font-weight: bold; margin-bottom: 10px; }
.abstract-options { display: flex; gap: 8px; }
.abs-card { flex: 1; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 10px 5px; text-align: center; cursor: pointer; transition: 0.2s; user-select: none; }
.abs-card:hover { border-color: #cbd5e1; transform: translateY(-2px); }
.abs-card.active { background: #eff6ff; border-color: #3b82f6; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2); }
.abs-icon { font-size: 1.5rem; margin-bottom: 5px; }
.abs-text { font-size: 0.75rem; font-weight: 900; color: #64748b; }
.abs-card.active .abs-text { color: #2563eb; }

.tag-engine-section { margin-top: 5px; }
.section-sub-label { font-size: 0.85rem; font-weight: bold; color: #64748b; margin-bottom: 10px; display: block; }
.tags-matrix { background: #eff6ff; padding: 15px; border-radius: 12px; border: 1px dashed #93c5fd; }
.tag-btn.multi-select { background: #f8fafc; border-color: #e2e8f0; }
.tag-btn.multi-select.active { background: #3b82f6; color: #fff; border-color: #2563eb; box-shadow: 0 2px 8px rgba(59,130,246,0.3);}

/* 03. 数量与时间 */
.input-with-unit { display: flex; gap: 10px; } .input-with-unit input { flex: 1; }
.unit-select { width: 75px; padding: 0 10px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 1rem; color: #ea580c; background: #fff7ed; font-weight: bold; outline: none; cursor: pointer; text-align: center; }

.date-input-wrap { display: flex; flex-direction: column; gap: 10px; }
.quick-dates { display: flex; gap: 8px; }
.qd-btn { flex: 1; padding: 6px 0; border: none; border-radius: 8px; background: #f1f5f9; color: #64748b; font-size: 0.8rem; font-weight: bold; cursor: pointer; transition: 0.2s; }
.qd-btn:hover { background: #e2e8f0; }
.qd-btn.danger { color: #ef4444; background: #fef2f2; } .qd-btn.danger:hover { background: #fee2e2; }
.qd-btn.warning { color: #f97316; background: #fff7ed; } .qd-btn.warning:hover { background: #ffedd5; }
.qd-btn.safe { color: #10b981; background: #ecfdf5; } .qd-btn.safe:hover { background: #d1fae5; }

/* 04. 路由发货 */
.select-wrapper select { width: 100%; padding: 14px 18px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 1.05rem; color: #94a3b8; background: #f8fafc; outline: none; cursor: pointer; font-weight: bold;}
.select-wrapper select.has-value { color: #1e293b; background: #fff; border-color: #3b82f6; }
.cold-tip { margin-top: 10px; color: #0284c7; background: #e0f2fe; border: 1px dashed #7dd3fc; padding: 8px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: bold; }

.emergency-route-box { background: #fef2f2; border: 2px dashed #fca5a5; padding: 20px; border-radius: 14px; display: flex; align-items: flex-start; gap: 15px; margin-top: 10px;}
.route-icon { font-size: 2.5rem; animation: floatUp 2s ease-in-out infinite; }
.route-text h4 { color: #ef4444; margin: 0 0 5px; font-size: 1.1rem; font-weight: 900; }
.route-text p { color: #7f1d1d; margin: 0; font-size: 0.95rem; font-weight: bold; line-height: 1.5;}
@keyframes floatUp { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

/* 大按钮 */
.submit-btn { width: 100%; padding: 18px; border: none; border-radius: 16px; background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; font-size: 1.2rem; font-weight: 900; cursor: pointer; transition: 0.3s; margin-top: 10px; }
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