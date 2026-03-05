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
          <div class="form-item flex-1">
            <label>捐赠数量 (件/箱/份)</label>
            <input v-model="form.stock" type="number" min="1" placeholder="填入纯数字"/>
          </div>
          <div class="form-item flex-1">
            <label>过期/临期警戒线</label>
            <input v-model="form.expirationDate" type="date" />
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
              </option>w
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
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
// 引入智能推荐接口
import { getRecommendStations, donateGoods } from '@/api/resource'

const loading = ref(false)
const stations = ref([])

const groupedCategories = {
  '🍞 粮油副食': ['米面粮油', '烘焙糕点', '速食品', '乳制品', '生鲜水果', '生鲜蔬菜', '生鲜冷冻'],
  '💊 医疗与特需': ['医疗用品', '助残设备', '营养品'],
  '🛡️ 应急与生活': ['饮用水', '应急食品', '应急装备', '生活用品', '防寒衣物']
}

const form = reactive({
  goodsName: '', category: '', stock: '', expirationDate: '', currentStationId: ''
})

const isFormValid = computed(() => {
  return form.goodsName && form.category && form.stock && form.expirationDate && form.currentStationId
})

onMounted(() => {
  loading.value = true
  // 🌟 调用 HTML5 浏览器原生 API 获取真实物理定位
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        async (position) => {
          // 用户授权定位，获取到真实经纬度
          await fetchStations(position.coords.longitude, position.coords.latitude)
        },
        async (error) => {
          console.warn('获取定位失败，降级为无距离模式', error)
          // 用户拒绝授权或定位失败，不传经纬度
          await fetchStations()
        }
    )
  } else {
    fetchStations()
  }
})

const fetchStations = async (lon = null, lat = null) => {
  try {
    // 把真实的经纬度传给后端计算距离
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
    const submitData = { ...form, expirationDate: form.expirationDate + ' 23:59:59' }
    await donateGoods(submitData)

    ElNotification({
      title: '🎉 捐赠意向发布成功！',
      message: `【${form.goodsName}】已接入调度大盘。系统正在呼叫志愿者上门取货；您也可以在【我的捐赠记录】中操作自行送达。`,
      type: 'success',
      duration: 8000 // 延长提示时间，确保商家看清后续流转规则
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
/* 🌟 核心修复 3：统一框架层级样式，加入 flex:1 和 overflow-y: auto */
.main-content {
  flex: 1;
  height: 100vh;
  overflow-y: auto; /* 必须要有这个，内容过多时内部才会出滚动条 */
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
  padding: 40px;
  background: #f1f5f9;
}

.top-status {
  position: absolute; top: 20px; right: 30px; z-index: 100;
  background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px);
  padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; color: #64748b;
  display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}
.pulse-dot {
  width: 8px; height: 8px; background: #f97316; border-radius: 50%;
  box-shadow: 0 0 8px #f97316; animation: pulse-orange 2s infinite;
}
@keyframes pulse-orange {
  0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(249, 115, 22, 0); }
  100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
}

/* 🌟 核心修复 4：内容居中限制区 */
.donate-wrapper {
  max-width: 800px; /* 限制宽度 */
  margin: 0 auto;   /* 完美居中 */
  width: 100%;
  padding-bottom: 60px; /* 底部留白，滚动到底部不局促 */
}

/* 后面的卡片和元素样式保持完美 */
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