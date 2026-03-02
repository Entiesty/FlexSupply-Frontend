<template>
  <div class="donate-container">
    <header class="page-header">
      <h2>🏪 商家爱心捐赠中心</h2>
      <p>您的每一份余量，都是城市的温暖能量</p>
    </header>

    <div class="donate-card" v-loading="loading">
      <div class="form-item">
        <label>物资名称</label>
        <input v-model="form.goodsName" type="text" placeholder="例如：某品牌全麦吐司面包 (临期)"/>
      </div>

      <div class="form-item">
        <label>物资大类 (关联大屏统计算法)</label>
        <div class="category-tags">
          <span v-for="cat in categories" :key="cat"
                class="tag" :class="{ active: form.category === cat }"
                @click="form.category = cat">{{ cat }}</span>
        </div>
      </div>

      <div class="form-row">
        <div class="form-item flex-1">
          <label>捐赠数量 (份/件)</label>
          <input v-model="form.stock" type="number" min="1" placeholder="填入数量"/>
        </div>
        <div class="form-item flex-1">
          <label>过期/临期时间</label>
          <input v-model="form.expirationDate" type="date" />
        </div>
      </div>

      <div class="form-item">
        <label>接收驿站</label>
        <select v-model="form.currentStationId">
          <option disabled value="">请选择要捐入的社区驿站...</option>
          <option v-for="st in stations" :key="st.stationId" :value="st.stationId">
            {{ st.stationName }} ({{ st.address }})
          </option>
        </select>
      </div>

      <button class="submit-btn" @click="handleDonate">💖 确认捐赠，传递爱心</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { getStationList, donateGoods } from '@/api/resource'

const loading = ref(false)
const stations = ref([])
// 这里的类别要和刚才的 SQL 初始化饼图数据严格对应！
const categories = ['米面粮油', '新鲜果蔬', '应急药品', '速食品', '防寒衣物']

const form = reactive({
  goodsName: '',
  category: '',
  stock: '',
  expirationDate: '',
  currentStationId: ''
})

onMounted(async () => {
  try {
    const res = await getAllStations()
    // 后端 /all 返回的是纯 List，所以 res.data 直接就是数组
    stations.value = res.data || []
  } catch (e) {
    console.error('获取驿站列表失败', e)
  }
})

const handleDonate = async () => {
  if (!form.goodsName || !form.category || !form.stock || !form.expirationDate || !form.currentStationId) {
    return ElMessage.warning('请将捐赠信息填写完整哦')
  }
  loading.value = true
  try {
    // 补全时间格式 YYYY-MM-DD HH:mm:ss
    const submitData = { ...form, expirationDate: form.expirationDate + ' 23:59:59' }
    await donateGoods(submitData)

    ElNotification({
      title: '捐赠成功！',
      message: '感谢您的爱心！物资已自动入库，数据大屏已实时更新。',
      type: 'success',
      duration: 5000
    })

    // 清空表单
    form.goodsName = ''; form.stock = ''; form.category = ''; form.expirationDate = '';
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.donate-container { max-width: 600px; margin: 0 auto; padding: 30px 20px; min-height: 100vh; background: #f8fafc; }
.page-header h2 { color: #ea580c; margin-bottom: 5px; font-weight: 900; }
.page-header p { color: #64748b; font-size: 0.9rem; margin-bottom: 25px; }
.donate-card { background: #fff; padding: 25px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
.form-item { display: flex; flex-direction: column; margin-bottom: 20px; }
.form-item label { font-size: 0.85rem; font-weight: bold; color: #475569; margin-bottom: 8px; }
.form-item input, .form-item select { padding: 12px 15px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 1rem; outline: none; transition: 0.2s; }
.form-item input:focus, .form-item select:focus { border-color: #ea580c; box-shadow: 0 0 0 3px rgba(234,88,12,0.1); }
.form-row { display: flex; gap: 15px; }
.flex-1 { flex: 1; }
.category-tags { display: flex; flex-wrap: wrap; gap: 10px; }
.tag { padding: 8px 16px; background: #f1f5f9; color: #64748b; border-radius: 20px; font-size: 0.85rem; cursor: pointer; transition: 0.2s; font-weight: bold; }
.tag.active { background: #ea580c; color: #fff; box-shadow: 0 4px 10px rgba(234,88,12,0.3); }
.submit-btn { width: 100%; padding: 16px; border: none; border-radius: 14px; background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; font-size: 1.1rem; font-weight: bold; cursor: pointer; box-shadow: 0 8px 20px rgba(234,88,12,0.3); transition: transform 0.2s; margin-top: 10px; }
.submit-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(234,88,12,0.4); }
</style>