<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot"></span> 社区关怀网络运行中
    </div>

    <div class="history-wrapper">
      <header class="page-header">
        <h2>📜 我的受赠档案</h2>
        <p>您的每一次求助，社区都用心记录在册</p>
      </header>

      <div class="glass-panel" v-loading="loading">
        <div v-if="historyList.length === 0" class="empty-state">
          <div class="empty-icon">📂</div>
          <p>您最近还没有求助记录哦</p>
        </div>

        <div v-else class="history-list">
          <div class="history-card" v-for="item in historyList" :key="item.orderId">
            <div class="card-header">
              <span class="order-time">{{ item.createTime }}</span>
              <span class="status-badge" :class="'status-' + item.status">
                {{ getStatusText(item.status) }}
              </span>
            </div>

            <div class="card-body">
              <div class="goods-info">
                <span class="cat-icon">{{ getCatIcon(item.requiredCategory) }}</span>
                <div class="info-text">
                  <h3>{{ item.requiredCategory }}</h3>
                  <p>{{ item.description || '无具体说明' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="pagination-wrap" v-if="total > 0">
          <el-pagination
              background
              layout="prev, pager, next"
              :total="total"
              :page-size="pageSize"
              v-model:current-page="pageNum"
              @current-change="fetchData"
          />
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getMyHistoryOrders } from '@/api/trade' // 稍后我们在 trade.js 里加上这个

const loading = ref(false)
const historyList = ref([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)

const getStatusText = (status) => {
  const map = { 0: '匹配中', 1: '派送中', 2: '✅ 已完成', 3: '已取消' }
  return map[status] || '未知'
}

const getCatIcon = (cat) => {
  if (cat?.includes('药') || cat?.includes('医疗')) return '💊'
  if (cat?.includes('冷') || cat?.includes('应急') || cat?.includes('生活')) return '🧥'
  return '🍚'
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getMyHistoryOrders({ pageNum: pageNum.value, pageSize: pageSize.value })
    historyList.value = res.data.records || []
    total.value = res.data.total || 0
  } catch (e) {
    console.error('获取档案失败', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 30px; background: #f1f5f9; min-height: 100vh; overflow-y: auto;}
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.9rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); }
.pulse-dot { width: 10px; height: 10px; background: #f97316; border-radius: 50%; box-shadow: 0 0 8px #f97316; animation: pulse-orange 2s infinite; }
@keyframes pulse-orange { 0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(249, 115, 22, 0); } 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); } }

.history-wrapper { max-width: 800px; margin: 0 auto; width: 100%; padding-bottom: 50px;}
.page-header h2 { color: #1e293b; font-size: 2rem; margin: 0 0 8px 0; font-weight: 900; }
.page-header p { color: #64748b; font-size: 1.1rem; margin: 0 0 25px 0; }

.glass-panel { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 24px; padding: 25px; box-shadow: 0 15px 35px rgba(0,0,0,0.06); border: 1px solid #fff; min-height: 300px;}

.empty-state { text-align: center; padding: 50px 0; color: #94a3b8; }
.empty-icon { font-size: 4rem; margin-bottom: 15px; opacity: 0.5; }

.history-list { display: flex; flex-direction: column; gap: 15px; }
.history-card { background: #f8fafc; border: 2px solid #f1f5f9; border-radius: 16px; padding: 20px; transition: 0.2s; }
.history-card:hover { border-color: #fdba74; box-shadow: 0 8px 20px rgba(249, 115, 22, 0.08); transform: translateY(-2px);}

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;}
.order-time { font-size: 1.1rem; color: #64748b; font-weight: bold; }
.status-badge { padding: 6px 14px; border-radius: 12px; font-weight: bold; font-size: 1rem; }
.status-0 { background: #fff7ed; color: #ea580c; }
.status-1 { background: #eff6ff; color: #3b82f6; }
.status-2 { background: #ecfdf5; color: #10b981; }
.status-3 { background: #f1f5f9; color: #94a3b8; }

.card-body { padding-top: 5px; }
.goods-info { display: flex; align-items: center; gap: 15px; }
.cat-icon { font-size: 2.5rem; background: #fff; padding: 10px; border-radius: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.info-text h3 { margin: 0 0 5px 0; font-size: 1.5rem; color: #1e293b; font-weight: 900;}
.info-text p { margin: 0; font-size: 1.1rem; color: #64748b; }

.pagination-wrap { display: flex; justify-content: center; margin-top: 30px; }
:deep(.el-pagination button), :deep(.el-pagination li) { font-size: 1.1rem !important; height: 40px !important; min-width: 40px !important; line-height: 40px !important; border-radius: 10px !important;}
</style>