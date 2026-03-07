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
              <span class="order-time">🗓️ {{ formatFriendlyTime(item.createTime) }}</span>
              <span class="status-badge" :class="'status-' + item.status">
                {{ getStatusText(item.status) }}
              </span>
            </div>

            <div class="card-body">
              <div class="goods-info">
                <span class="cat-icon">{{ getCatIcon(item.requiredCategory) }}</span>
                <div class="info-text">
                  <h3>{{ item.requiredCategory }}</h3>
                  <p>{{ getShortDesc(item.description) || '无具体说明' }}</p>
                </div>
              </div>

              <button class="reorder-btn" @click="handleReorder(item)">
                🔄 照着这个，再来一单
              </button>
            </div>
          </div>
        </div>

        <div class="load-more-wrap" v-if="historyList.length < total">
          <button class="big-load-btn" @click="loadMore">
            👇 点击查看更早的记录
          </button>
        </div>
        <div class="load-more-wrap" v-else-if="historyList.length > 0">
          <p class="end-text">— 已经到底啦 —</p>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getMyHistoryOrders } from '@/api/trade'

const router = useRouter()
const loading = ref(false)
const historyList = ref([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(5) // 每次少加载一点，卡片大

const getStatusText = (status) => {
  const map = { 0: '匹配中', 1: '派送中', 2: '✅ 已完成', 3: '已取消' }
  return map[status] || '未知'
}

const getCatIcon = (cat) => {
  if (cat?.includes('药') || cat?.includes('医疗')) return '💊'
  if (cat?.includes('冷') || cat?.includes('应急') || cat?.includes('生活')) return '🧥'
  return '🍚'
}

const getShortDesc = (desc) => {
  if (!desc) return ''
  return desc.split(' | ')[0]
}

// 🚨 核心改造：充满人情味的时间格式转换
const formatFriendlyTime = (dateStr) => {
  if(!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()

  // 判断昨天
  const yesterday = new Date(now - 86400000)
  const isYesterday = yesterday.getDate() === d.getDate() && yesterday.getMonth() === d.getMonth()

  const hours = d.getHours()
  const ampm = hours >= 12 ? '下午' : '上午'
  const displayHours = hours % 12 || 12
  const timeStr = `${ampm} ${displayHours}:${String(d.getMinutes()).padStart(2, '0')}`

  if (isToday) return `今天 ${timeStr}`
  if (isYesterday) return `昨天 ${timeStr}`
  return `${d.getMonth() + 1}月${d.getDate()}日 ${timeStr}`
}

const fetchData = async (isAppend = false) => {
  loading.value = true
  try {
    const res = await getMyHistoryOrders({ pageNum: pageNum.value, pageSize: pageSize.value })
    if (isAppend) {
      historyList.value = [...historyList.value, ...(res.data.records || [])]
    } else {
      historyList.value = res.data.records || []
    }
    total.value = res.data.total || 0
  } catch (e) {
    console.error('获取档案失败', e)
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  pageNum.value++
  fetchData(true)
}

// 🚨 跳转去 SOS 首页，并带上参数自动触发抽屉
const handleReorder = (item) => {
  const shortDesc = getShortDesc(item.description)
  router.push({
    path: '/sos',
    query: {
      cat: item.requiredCategory,
      reorder: shortDesc
    }
  })
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 30px; background: #f1f5f9; min-height: 100vh; overflow-y: auto;}
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.9rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); font-weight: bold;}
.pulse-dot { width: 10px; height: 10px; background: #f97316; border-radius: 50%; box-shadow: 0 0 8px #f97316; animation: pulse-orange 2s infinite; }
@keyframes pulse-orange { 0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(249, 115, 22, 0); } 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); } }

.history-wrapper { max-width: 800px; margin: 0 auto; width: 100%; padding-bottom: 50px;}
.page-header h2 { color: #1e293b; font-size: 2rem; margin: 0 0 8px 0; font-weight: 900; }
.page-header p { color: #64748b; font-size: 1.1rem; margin: 0 0 25px 0; }

.glass-panel { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 24px; padding: 25px; box-shadow: 0 15px 35px rgba(0,0,0,0.06); border: 1px solid #fff; min-height: 300px;}

.empty-state { text-align: center; padding: 50px 0; color: #94a3b8; }
.empty-icon { font-size: 4rem; margin-bottom: 15px; opacity: 0.5; }

.history-list { display: flex; flex-direction: column; gap: 20px; }
.history-card { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 20px; padding: 25px; transition: 0.2s; position: relative;}
.history-card:hover { border-color: #fdba74; box-shadow: 0 10px 25px rgba(249, 115, 22, 0.08); transform: translateY(-3px);}

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 15px;}
.order-time { font-size: 1.2rem; color: #334155; font-weight: 900; }
.status-badge { padding: 8px 16px; border-radius: 12px; font-weight: 900; font-size: 1.05rem; }
.status-0 { background: #fff7ed; color: #ea580c; border: 1px solid #fdba74;}
.status-1 { background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe;}
.status-2 { background: #ecfdf5; color: #10b981; border: 1px solid #6ee7b7;}
.status-3 { background: #f1f5f9; color: #94a3b8; }

.card-body { display: flex; justify-content: space-between; align-items: center;}
.goods-info { display: flex; align-items: center; gap: 18px; }
.cat-icon { font-size: 3rem; background: #fff; padding: 12px; border-radius: 18px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.info-text h3 { margin: 0 0 5px 0; font-size: 1.6rem; color: #1e293b; font-weight: 900;}
.info-text p { margin: 0; font-size: 1.2rem; color: #64748b; font-weight: bold;}

/* 🚨 极其显眼的再来一单按钮 */
.reorder-btn { background: #fff7ed; color: #ea580c; border: 2px solid #fdba74; padding: 12px 20px; border-radius: 14px; font-size: 1.1rem; font-weight: 900; cursor: pointer; transition: 0.2s;}
.reorder-btn:hover { background: #ffedd5; transform: scale(1.05); box-shadow: 0 5px 15px rgba(234, 88, 12, 0.2);}
.reorder-btn:active { transform: scale(0.95); }

/* 🚨 大白话翻页按钮 */
.load-more-wrap { text-align: center; margin-top: 30px; }
.big-load-btn { width: 100%; max-width: 400px; padding: 20px; background: #e2e8f0; color: #475569; font-size: 1.3rem; font-weight: 900; border: none; border-radius: 20px; cursor: pointer; transition: 0.2s;}
.big-load-btn:hover { background: #cbd5e1; color: #1e293b;}
.end-text { color: #cbd5e1; font-weight: bold; font-size: 1.1rem;}
</style>