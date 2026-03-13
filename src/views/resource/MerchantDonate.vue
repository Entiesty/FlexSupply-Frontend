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
                <span v-for="cat in group" :key="cat"
                      class="tag-btn" :class="{ active: form.category === cat }"
                      @click="form.category = cat">
                  {{ cat }}
                </span>
              </div>
            </div>
          </template>
          <div v-else style="color:#ef4444; font-size: 0.9rem; padding: 10px 0;">
            感谢您的爱心！当前平稳状态下，您的行业资质未匹配入库需求，建议您转为志愿者参与护航。
          </div>
        </div>

        <transition name="fade-slide">
          <div v-if="form.category" class="tag-engine-section">
            <div class="section-title"><span>03</span> 物资精细化标签 (赋能算法精准匹配)</div>
            <div class="tags-matrix">
              <div class="tags-wrap">
                <span v-for="tag in availableTags" :key="tag"
                      class="tag-btn multi-select" :class="{ active: form.tags.includes(tag) }"
                      @click="toggleTag(tag)">
                  {{ form.tags.includes(tag) ? '✅ ' : '+ ' }}{{ tag }}
                </span>
              </div>
              <p class="tag-tip">💡 勾选符合该物资特征的标签，让它能更精准地匹配给有特殊需求(如糖尿病)的弱势群体</p>
            </div>
          </div>
        </transition>

        <div class="section-title"><span>04</span> 数量与保质期监控</div>
        <div class="form-row">
          <div class="form-item flex-2">
            <label>捐赠数量与单位</label>
            <div class="input-with-unit">
              <input v-model="form.stock" type="number" min="1" placeholder="填入数字"/>
              <select v-model="form.unit" class="unit-select">
                <option value="件">件</option>
                <option value="箱">箱</option>
                <option value="份">份</option>
                <option value="kg">kg</option>
                <option value="袋">袋</option>
                <option value="提">提</option>
              </select>
            </div>
          </div>
          <div class="form-item flex-1">
            <label>过期/临期警戒线</label>
            <input v-model="form.expirationDate" type="datetime-local" class="datetime-input" />
          </div>
        </div>

        <div class="section-title"><span>05</span> 目标捐入驿站设定</div>
        <div class="form-item">
          <label>期望存入的社区驿站 (系统将指派志愿者上门取货并送往此地)</label>
          <div class="select-wrapper">
            <select v-model="form.currentStationId" :class="{ 'has-value': form.currentStationId !== '' }">
              <option disabled value="">请选择距您最近的社区驿站...</option>
              <option
                  v-for="st in stations"
                  :key="st.stationId"
                  :value="st.stationId"
              >
                📍 {{ st.stationName }} ({{ st.distance === '距离未知' ? st.address : '距您 ' + st.distance }})
              </option>
            </select>
          </div>
        </div>

        <button class="submit-btn" :disabled="!isFormValid || Object.keys(groupedCategories).length === 0" @click="handleDonate">
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
// 🚨 终极闭环：用来记住当前正在响应的是哪个求救单
const targetOrderId = ref(null)

const sysMode = ref('NORMAL')
const merchantIndustryType = ref(1)

let pollTimer = null // 轮询定时器句柄

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
    if (type === 1) result['🍞 粮油副食'] = baseLib['🍞 粮油副食']
    else if (type === 2) { result['🍞 粮油副食'] = baseLib['🍞 粮油副食']; result['🛡️ 应急与生活'] = baseLib['🛡️ 应急与生活'] }
    else if (type === 3) result['💊 医疗与特需'] = baseLib['💊 医疗与特需']
    else if (type === 4) result['🛡️ 应急与生活'] = baseLib['🛡️ 应急与生活']
  }
  return result
})

const form = reactive({
  goodsName: '', category: '', tags: [], stock: '', unit: '件', expirationDate: '', currentStationId: ''
})

const isFormValid = computed(() => {
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

watch(() => form.category, (newVal) => {
  form.tags = []
  if (['饮用水', '乳制品'].includes(newVal)) form.unit = '箱'
  else if (['米面粮油', '生鲜水果', '生鲜蔬菜', '生鲜冷冻'].includes(newVal)) form.unit = 'kg'
  else if (['速食品', '烘焙糕点'].includes(newVal)) form.unit = '袋'
  else if (['医疗用品', '应急食品', '营养品'].includes(newVal)) form.unit = '盒'
  else form.unit = '件'
})

const toggleTag = (tag) => {
  const idx = form.tags.indexOf(tag)
  if (idx > -1) form.tags.splice(idx, 1)
  else form.tags.push(tag)
}

onMounted(async () => {
  loading.value = true
  try {
    sysMode.value = 'NORMAL'
    const userRes = await getUserProfile()
    if (userRes.data) {
      if (userRes.data.industryType) merchantIndustryType.value = userRes.data.industryType
      if (userRes.data.currentLon && userRes.data.currentLat) {
        await fetchStations(userRes.data.currentLon, userRes.data.currentLat)
      } else {
        ElMessage.warning({ message: '💡 建议绑定商铺坐标，以便推荐最近的驿站！', duration: 5000 })
        await fetchStations()
      }
    }
  } catch (error) {
    await fetchStations()
  }

  // 🚨 启动“心跳短轮询”，每 5 秒监听一次指挥中心的强行调度广播
  pollTimer = setInterval(async () => {
    try {
      const res = await checkMyEmergencyBroadcast()
      if (res?.data && res.data.category) {
        showEmergencyPopup(res.data)
      }
    } catch (e) {
      // 轮询静默失败，不打扰商家
    }
  }, 5000)
})

// 🚨 架构师优化：防止内存泄漏，页面销毁时清理定时器
onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})

// 🚨 终极视觉武器：全屏紧急拦截弹窗
const showEmergencyPopup = (data) => {
  ElMessageBox.confirm(
      `<div style="text-align: center; padding: 10px 0;">
      <div style="font-size: 3.5rem; margin-bottom: 10px; animation: pulse 1s infinite;">🚨</div>
      <div style="color: #ef4444; font-size: 1.4rem; font-weight: 900; margin-bottom: 15px; letter-spacing: 1px;">城市生命通道紧急求援！</div>
      <div style="color: #1e293b; font-size: 1.1rem; line-height: 1.6; font-weight: bold;">
        指挥中心探测到您附近有市民遭遇困境，急需<br/>
        <span style="color:#ea580c; font-size:1.6rem; background: #fff7ed; padding: 2px 10px; border-radius: 8px; display: inline-block; margin: 10px 0; border: 1px dashed #fdba74;">
          【${data.category}】
        </span><br/>
        您的商铺是否可以立即提供该物资？
      </div>
    </div>`,
      '🔴 收到最高优先级调度广播',
      {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '我店里有，马上响应！',
        cancelButtonText: '抱歉，已售罄',
        showClose: false,
        closeOnClickModal: false,
        closeOnPressEscape: false,
        customClass: 'emergency-merchant-dialog' // 使用全局注入的红色样式
      }
  ).then(() => {
    // 商家点击响应：切入战时模式
    sysMode.value = 'EMERGENCY'
    form.category = data.category

    // 🚨 核心关联 1：把轮询拿到的救命单号存起来！
    targetOrderId.value = data.orderId

    // 页面平滑滚动回顶部，方便填表
    const mainContainer = document.querySelector('.main-content')
    if (mainContainer) {
      mainContainer.scrollTo({ top: 0, behavior: 'smooth' })
    }

    ElNotification.success({
      title: '🛡️ 已切入战时响应',
      message: '系统已锁定该求救单！请快速填入捐赠数量，护航骑士已在待命！',
      duration: 8000
    })
  }).catch(() => {
    ElMessage.info('已婉拒本次紧急募捐。')
  })
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
    let formattedDate = form.expirationDate
    if (formattedDate.includes('T')) {
      formattedDate = formattedDate.replace('T', ' ')
      if (formattedDate.length === 16) formattedDate += ':00'
    }

    const submitData = {
      ...form,
      goodsName: finalGoodsName,
      expirationDate: formattedDate,
      tags: form.tags,
      // 🚨 核心关联 2：把存起来的定向求救单 ID 发给后端打通闭环！
      targetOrderId: targetOrderId.value
    }
    await donateGoods(submitData)

    ElNotification({
      title: sysMode.value === 'EMERGENCY' ? '🚨 响应发货成功！' : '🎉 捐赠意向发布成功！',
      message: `【${form.goodsName}】已接入调度大盘。系统正在呼叫志愿者上门取货。`,
      type: 'success',
      duration: 8000
    })

    // 重置表单与状态
    form.goodsName = ''; form.stock = ''; form.category = ''; form.tags = []; form.expirationDate = ''; form.currentStationId = '';
    sysMode.value = 'NORMAL' // 捐完恢复正常模式

    // 🚨 核心关联 3：清空目标订单 ID，避免影响下一次普通捐赠
    targetOrderId.value = null

  } catch (e) {
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* =========== 基础极简架构样式 =========== */
.main-content { flex: 1; height: 100vh; overflow-y: auto; box-sizing: border-box; display: flex; flex-direction: column; position: relative; padding: 40px; background: #f1f5f9; }
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
.section-title:first-child { margin-top: 0; }
.section-title span { background: #ea580c; color: #fff; font-size: 0.8rem; padding: 2px 8px; border-radius: 8px; font-family: monospace; }

.form-item { display: flex; flex-direction: column; margin-bottom: 20px; }
.form-item label { font-size: 0.9rem; font-weight: bold; color: #64748b; margin-bottom: 10px; }
.form-item input { padding: 14px 18px; border: 2px solid #e2e8f0; border-radius: 14px; font-size: 1.05rem; color: #1e293b; background: #f8fafc; outline: none; transition: 0.3s; }
.form-item input:focus { background: #fff; border-color: #f97316; box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1); }

.form-row { display: flex; gap: 20px; }
.flex-1 { flex: 1; }
.flex-2 { flex: 1.5; }

.input-with-unit { display: flex; align-items: center; gap: 10px; }
.input-with-unit input { flex: 1; }
.unit-select { width: 85px; padding: 14px 10px; border: 2px solid #e2e8f0; border-radius: 14px; font-size: 1.05rem; color: #ea580c; background: #fff7ed; font-weight: bold; outline: none; cursor: pointer; transition: 0.3s; text-align: center; }
.unit-select:focus { border-color: #f97316; box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1); }

.category-matrix { background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px dashed #cbd5e1; transition: 0.3s; }
.cat-group { margin-bottom: 15px; }
.cat-group:last-child { margin-bottom: 0; }
.group-name { font-size: 0.85rem; color: #94a3b8; font-weight: bold; margin-bottom: 10px; }
.tags-wrap { display: flex; flex-wrap: wrap; gap: 10px; }
.tag-btn { padding: 8px 16px; background: #fff; border: 2px solid transparent; color: #475569; border-radius: 12px; font-size: 0.9rem; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
.tag-btn:hover { border-color: #fdba74; color: #ea580c; }
.tag-btn.active { background: #fff7ed; border-color: #f97316; color: #ea580c; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2); transform: scale(1.02); }

.tag-engine-section { margin-top: 10px; }
.tags-matrix { background: #eff6ff; padding: 20px; border-radius: 16px; border: 1px dashed #93c5fd; }
.tag-btn.multi-select { background: #f8fafc; border-color: #e2e8f0; }
.tag-btn.multi-select:hover { border-color: #3b82f6; color: #2563eb; }
.tag-btn.multi-select.active { background: #3b82f6; color: #fff; border-color: #2563eb; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
.tag-tip { font-size: 0.8rem; color: #64748b; margin: 15px 0 0 0; font-weight: bold; }

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.4s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-10px); }

.select-wrapper select { width: 100%; padding: 14px 18px; border: 2px solid #e2e8f0; border-radius: 14px; font-size: 1.05rem; color: #94a3b8; background: #f8fafc; outline: none; transition: 0.3s; appearance: none; cursor: pointer; }
.select-wrapper select.has-value { color: #1e293b; background: #fff; border-color: #3b82f6; }
.select-wrapper select:focus { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }

.submit-btn { width: 100%; padding: 18px; border: none; border-radius: 16px; background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; font-size: 1.2rem; font-weight: 900; cursor: pointer; transition: 0.3s; margin-top: 20px; position: relative; overflow: hidden; }
.submit-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(234, 88, 12, 0.35); }
.submit-btn:disabled { background: #cbd5e1; cursor: not-allowed; opacity: 0.7; }
</style>

<style>
.emergency-merchant-dialog {
  border-radius: 24px !important;
  border: 4px solid #ef4444 !important;
  box-shadow: 0 20px 50px rgba(239, 68, 68, 0.3) !important;
  overflow: hidden;
}
.emergency-merchant-dialog .el-message-box__header {
  background: #fef2f2;
  border-bottom: 1px solid #fca5a5;
  padding-bottom: 15px;
}
.emergency-merchant-dialog .el-message-box__title {
  color: #ef4444 !important;
  font-weight: 900 !important;
}
.emergency-merchant-dialog .el-button--primary {
  background: linear-gradient(135deg, #ef4444, #dc2626) !important;
  border: none !important;
  font-weight: 900 !important;
  font-size: 1.1rem !important;
  padding: 12px 24px !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4) !important;
  transition: all 0.2s;
}
.emergency-merchant-dialog .el-button--primary:hover {
  transform: scale(1.05);
}
.emergency-merchant-dialog .el-button--default {
  border-radius: 12px !important;
  padding: 12px 24px !important;
  font-weight: bold;
}
</style>