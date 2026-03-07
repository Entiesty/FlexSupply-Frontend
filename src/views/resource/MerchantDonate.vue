<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot"></span> 城市物资供给网络接入中
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

        <div class="section-title"><span>02</span> 物资大类归属 (影响调度权重)</div>
        <div class="category-matrix">
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
        </div>

        <div class="section-title"><span>03</span> 数量与保质期监控</div>
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

        <div class="section-title"><span>04</span> 目标捐入驿站设定</div>
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

        <button class="submit-btn" :disabled="!isFormValid" @click="handleDonate">
          <span class="btn-shine"></span>
          确认无误，发布捐赠 (等待取货)
        </button>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue' // 引入 watch
import { ElMessage, ElNotification } from 'element-plus'
import { getRecommendStations, donateGoods } from '@/api/resource'
import { getUserProfile } from '@/api/user'

const loading = ref(false)
const stations = ref([])

const groupedCategories = {
  '🍞 粮油副食': ['米面粮油', '烘焙糕点', '速食品', '乳制品', '生鲜水果', '生鲜蔬菜', '生鲜冷冻'],
  '💊 医疗与特需': ['医疗用品', '助残设备', '营养品'],
  '🛡️ 应急与生活': ['饮用水', '应急食品', '应急装备', '生活用品', '防寒衣物']
}

const form = reactive({
  goodsName: '', category: '', stock: '', unit: '件', expirationDate: '', currentStationId: ''
})

const isFormValid = computed(() => {
  return form.goodsName && form.category && form.stock && form.expirationDate && form.currentStationId
})

// 🚨 联动魔法：监听大类选择，自动推导最合适的量词单位
watch(() => form.category, (newVal) => {
  if (['饮用水', '乳制品'].includes(newVal)) form.unit = '箱'
  else if (['米面粮油', '生鲜水果', '生鲜蔬菜', '生鲜冷冻'].includes(newVal)) form.unit = 'kg'
  else if (['速食品', '烘焙糕点'].includes(newVal)) form.unit = '袋'
  else if (['医疗用品', '应急食品', '营养品'].includes(newVal)) form.unit = '盒'
  else form.unit = '件'
})

onMounted(async () => {
  loading.value = true
  try {
    const userRes = await getUserProfile()
    if (userRes.data && userRes.data.currentLon && userRes.data.currentLat) {
      await fetchStations(userRes.data.currentLon, userRes.data.currentLat)
    } else {
      ElMessage.warning({ message: '💡 建议前往【个人设置】绑定商铺的具体地图坐标，以便为您推荐最近的社区驿站！', duration: 5000 })
      await fetchStations()
    }
  } catch (error) {
    await fetchStations()
  }
})

const fetchStations = async (lon = null, lat = null) => {
  try {
    const res = await getRecommendStations({ lon, lat })
    stations.value = res.data || []
  } catch (e) {
    console.error('获取驿站失败', e)
  } finally {
    loading.value = false
  }
}

const handleDonate = async () => {
  loading.value = true
  try {
    const finalGoodsName = `${form.goodsName} (单位:${form.unit})`

    // 🚨 核心修复：处理 datetime-local 带的 "T" 字符，并补齐秒数发给后端
    let formattedDate = form.expirationDate
    if (formattedDate.includes('T')) {
      formattedDate = formattedDate.replace('T', ' ')
      if (formattedDate.length === 16) formattedDate += ':00' // 补齐秒
    }

    const submitData = {
      ...form,
      goodsName: finalGoodsName,
      expirationDate: formattedDate
    }
    await donateGoods(submitData)

    ElNotification({
      title: '🎉 捐赠意向发布成功！',
      message: `【${form.goodsName}】已接入调度大盘。系统正在呼叫志愿者上门取货。`,
      type: 'success',
      duration: 8000
    })

    form.goodsName = ''; form.stock = ''; form.category = ''; form.expirationDate = ''; form.currentStationId = '';
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.main-content { flex: 1; height: 100vh; overflow-y: auto; box-sizing: border-box; display: flex; flex-direction: column; position: relative; padding: 40px; background: #f1f5f9; }
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); }
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

/* 🚨 数量+单位复合输入框样式 */
.input-with-unit { display: flex; align-items: center; gap: 10px; }
.input-with-unit input { flex: 1; }
.unit-select { width: 85px; padding: 14px 10px; border: 2px solid #e2e8f0; border-radius: 14px; font-size: 1.05rem; color: #ea580c; background: #fff7ed; font-weight: bold; outline: none; cursor: pointer; transition: 0.3s; text-align: center; }
.unit-select:focus { border-color: #f97316; box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1); }

.category-matrix { background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px dashed #cbd5e1; }
.cat-group { margin-bottom: 15px; }
.cat-group:last-child { margin-bottom: 0; }
.group-name { font-size: 0.85rem; color: #94a3b8; font-weight: bold; margin-bottom: 10px; }
.tags-wrap { display: flex; flex-wrap: wrap; gap: 10px; }
.tag-btn { padding: 8px 16px; background: #fff; border: 2px solid transparent; color: #475569; border-radius: 12px; font-size: 0.9rem; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
.tag-btn:hover { border-color: #fdba74; color: #ea580c; }
.tag-btn.active { background: #fff7ed; border-color: #f97316; color: #ea580c; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2); transform: scale(1.02); }

.select-wrapper select { width: 100%; padding: 14px 18px; border: 2px solid #e2e8f0; border-radius: 14px; font-size: 1.05rem; color: #94a3b8; background: #f8fafc; outline: none; transition: 0.3s; appearance: none; cursor: pointer; }
.select-wrapper select.has-value { color: #1e293b; background: #fff; border-color: #3b82f6; }
.select-wrapper select:focus { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }

.submit-btn { width: 100%; padding: 18px; border: none; border-radius: 16px; background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; font-size: 1.2rem; font-weight: 900; cursor: pointer; transition: 0.3s; margin-top: 20px; position: relative; overflow: hidden; }
.submit-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(234, 88, 12, 0.35); }
.submit-btn:disabled { background: #cbd5e1; cursor: not-allowed; opacity: 0.7; }
</style>