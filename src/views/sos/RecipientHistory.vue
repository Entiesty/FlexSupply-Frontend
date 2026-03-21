<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot green"></span> 您的专属互助档案库
    </div>

    <div class="history-wrapper">
      <header class="page-header">
        <h2 class="theme-green">📜 我的受赠档案</h2>
        <p>您的每一次求助与提取，城市互助网络都用心记录在册</p>
      </header>

      <div class="status-tabs">
        <div class="tab-item" :class="{ active: queryParams.status === null }" @click="switchTab(null)">全部记录</div>
        <div class="tab-item" :class="{ active: queryParams.status === '0,1' }" @click="switchTab('0,1')">🔄 进行中</div>
        <div class="tab-item" :class="{ active: queryParams.status === '2' }" @click="switchTab('2')">🌟 待评价</div>
        <div class="tab-item" :class="{ active: queryParams.status === '3' }" @click="switchTab('3')">✅ 已完结</div>
        <div class="tab-item" :class="{ active: queryParams.status === '4' }" @click="switchTab('4')">❌ 已取消</div>
      </div>

      <div class="order-list" v-loading="loading">
        <div v-if="!loading && historyList.length === 0" class="empty-state">
          <div class="empty-icon">📂</div>
          <h3>暂无对应的互助记录</h3>
          <p>您还没有相关的受赠或求助档案</p>
          <button class="go-market-btn" @click="router.push('/market')">去食物银行逛逛</button>
        </div>

        <transition-group name="list-fade">
          <div class="order-card" v-for="item in historyList" :key="item.orderId">

            <div class="card-header">
              <div class="time-info">
                <el-icon><Clock /></el-icon> {{ formatFriendlyTime(item.createTime) }}
              </div>
              <div class="status-badge" :class="'status-' + item.status">
                {{ getStatusText(item.status, item.deliveryMethod) }}
              </div>
            </div>

            <div class="card-body">
              <div class="goods-icon-box">{{ getCatIcon(item.requiredCategory) }}</div>
              <div class="goods-details">
                <h4 class="g-name" :title="item.requiredCategory">
                  {{ item.requiredCategory || '未知物资' }}
                </h4>
                <div class="g-desc" v-if="item.goodsName">
                  {{ cleanGoodsName(item.goodsName) }}
                </div>
                <div class="g-meta">
                  <span class="meta-tag" :class="item.deliveryMethod === 2 ? 'bg-blue' : 'bg-orange'">
                    {{ item.deliveryMethod === 2 ? '🏪 驿站自提' : '🛵 骑士护航' }}
                  </span>
                  <span class="meta-tag bg-gray">
                    数量: {{ item.goodsCount || 1 }} 份
                  </span>
                </div>
              </div>
            </div>

            <div class="pickup-zone" v-if="item.deliveryMethod === 2 && (item.status === 0 || item.status === 1) && item.pickupCode">
              <div class="pz-left">
                <span class="pz-label">自提核销码</span>
                <span class="pz-tip">请向驿站工作人员出示此码</span>
              </div>
              <div class="pz-right">
                <span class="pz-code">{{ item.pickupCode }}</span>
              </div>
            </div>

            <div class="card-footer">
              <div class="exception-text" v-if="item.status === 4 && item.exceptionReason">
                <el-icon><Warning /></el-icon> 取消原因: {{ item.exceptionReason }}
              </div>

              <div class="actions" :class="{'full-width': item.status !== 4}">
                <button class="action-btn cancel-btn"
                        v-if="item.status === 0 || item.status === 1"
                        @click="handleCancel(item)">
                  取消订单
                </button>

                <button class="action-btn btn-rate"
                        v-if="item.status === 2"
                        @click="openRateDialog(item)">
                  🌟 确认收货并评价
                </button>

                <button class="action-btn reorder-btn" v-if="item.status !== 2" @click="handleReorder(item)">
                  <el-icon><RefreshRight /></el-icon> 照着这个，再来一单
                </button>
              </div>
            </div>
          </div>
        </transition-group>

        <div class="load-more-wrap" v-if="historyList.length < total">
          <button class="big-load-btn" @click="loadMore">👇 点击查看更早的记录</button>
        </div>
        <div class="load-more-wrap" v-else-if="historyList.length > 0">
          <p class="end-text">— 档案到底啦 —</p>
        </div>
      </div>
    </div>

    <el-dialog v-model="rateVisible" title="🌟 确认收货与评价" width="90%" style="max-width: 400px; border-radius: 16px;" custom-class="rate-dialog">
      <div class="rate-box">
        <p class="rate-tip">您的评价将直接为背后的护航骑士与爱心商家增加信誉分，让他们被城市看见！</p>
        <el-rate v-model="rateForm.rating" :colors="['#94a3b8', '#fbbf24', '#f59e0b']" size="large" />
        <el-input
            v-model="rateForm.comment"
            type="textarea"
            placeholder="写一句对爱心人士的感谢吧（选填）..."
            class="rate-textarea"
            :rows="3"
        />
      </div>
      <template #footer>
        <div class="dialog-actions">
          <button class="action-btn cancel-btn" @click="rateVisible = false">稍后再评</button>
          <button class="action-btn btn-success" @click="submitRating">提交星级反馈</button>
        </div>
      </template>
    </el-dialog>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Clock, Warning, RefreshRight } from '@element-plus/icons-vue'
// ⚠️ 请确保在 api/trade.js 中有 rateOrder 接口方法指向后端 confirmReceiptAndRate
import { getMyHistoryOrders, cancelOrder, rateOrder } from '@/api/trade'

const router = useRouter()
const loading = ref(false)
const historyList = ref([])
const total = ref(0)

const queryParams = ref({
  pageNum: 1,
  pageSize: 5,
  status: null
})

// 评价表单数据
const rateVisible = ref(false)
const rateForm = ref({
  orderId: null,
  rating: 5,
  comment: ''
})

// 🚨 更新状态显示字典
const getStatusText = (status, deliveryMethod) => {
  if (status === 0) return '匹配中 / 待接单'
  if (status === 1) return deliveryMethod === 2 ? '待提取' : '护航中 / 配送中'
  if (status === 2) return '🌟 待确认收货/评价'
  if (status === 3) return '✅ 已完结'
  if (status === 4) return '❌ 已取消'
  return '未知'
}

const getCatIcon = (cat) => {
  const map = { '粮油副食': '🍚', '米面粮油': '🌾', '生鲜冷冻': '🥩', '新鲜果蔬': '🍎', '方便速食': '🍜', '烘焙糕点': '🍞', '常备用药': '💊', '越冬日用': '🧥', '温暖餐食': '🍱' }
  return map[cat] || '📦'
}

const cleanGoodsName = (name) => {
  if (!name) return '无具体说明'
  return name.replace(/^急需：/, '').replace(/\[.*?\]\s*/, '')
}

const formatFriendlyTime = (dateStr) => {
  if(!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
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

const switchTab = (status) => {
  queryParams.value.status = status;
  queryParams.value.pageNum = 1;
  fetchData(false);
}

const fetchData = async (isAppend = false) => {
  if (!isAppend) loading.value = true
  try {
    const res = await getMyHistoryOrders(queryParams.value)
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
  queryParams.value.pageNum++
  fetchData(true)
}

const handleCancel = (order) => {
  ElMessageBox.confirm(
      '确定要取消这笔物资请求吗？取消后物资将释放给其他需要的市民。',
      '⚠️ 取消确认',
      { confirmButtonText: '确认取消', cancelButtonText: '暂不取消', type: 'warning' }
  ).then(async () => {
    loading.value = true
    try {
      await cancelOrder(order.orderId)
      ElMessage.success('已成功取消该请求')
      fetchData(false)
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }).catch(() => {})
}

// 🚨 打开评价弹窗
const openRateDialog = (item) => {
  rateForm.value = {
    orderId: item.orderId,
    rating: 5,
    comment: ''
  }
  rateVisible.value = true
}

// 🚨 提交评价逻辑
const submitRating = async () => {
  if (rateForm.value.rating === 0) return ElMessage.warning('请至少点亮一颗星哦！')
  loading.value = true
  try {
    // 【对接注意】确保在后端传递了 orderId, rating 和 comment 字段
    await rateOrder(rateForm.value)
    ElMessage.success('评价成功！您的感谢已传递给爱心人士！')
    rateVisible.value = false
    fetchData(false) // 刷新列表，订单自动流转为"已完结"
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleReorder = (item) => {
  if (item.deliveryMethod === 2) {
    router.push('/market')
  } else {
    const shortDesc = item.goodsName || item.requiredCategory
    router.push({
      path: '/sos',
      query: { cat: item.requiredCategory, reorder: shortDesc }
    })
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 40px 30px; background: #f8fafc; min-height: 100vh; overflow-y: auto; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;}
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; color: #10b981; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); font-weight: bold;}
.pulse-dot.green { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; animation: pulse-green 2s infinite; }
@keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

.history-wrapper { max-width: 800px; margin: 0 auto; width: 100%; padding-bottom: 50px;}
.page-header { margin-bottom: 25px; text-align: center;}
.page-header h2.theme-green { color: #059669; font-size: 2rem; margin: 0 0 8px 0; font-weight: 900; letter-spacing: 0.5px; }
.page-header p { color: #64748b; font-size: 1.05rem; margin: 0; font-weight: bold;}

.status-tabs { display: flex; background: #e2e8f0; padding: 6px; border-radius: 16px; margin-bottom: 25px; width: fit-content; margin-left: auto; margin-right: auto;}
.tab-item { padding: 10px 24px; font-size: 0.95rem; font-weight: bold; color: #475569; border-radius: 12px; cursor: pointer; transition: 0.3s; }
.tab-item.active { background: #fff; color: #10b981; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

.empty-state { text-align: center; padding: 60px 0; background: #fff; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); margin-top: 20px;}
.empty-icon { font-size: 4rem; margin-bottom: 15px; filter: grayscale(1) opacity(0.5);}
.empty-state h3 { color: #1e293b; margin: 0 0 8px; font-size: 1.2rem; font-weight: 900;}
.empty-state p { color: #94a3b8; font-size: 1rem; margin-bottom: 20px;}
.go-market-btn { background: #10b981; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(16,185,129,0.2);}
.go-market-btn:hover { background: #059669; transform: translateY(-2px); }

.order-list { display: flex; flex-direction: column; gap: 20px; }
.order-card { background: #fff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; transition: 0.3s; }
.order-card:hover { transform: translateY(-2px); box-shadow: 0 15px 35px rgba(0,0,0,0.06); border-color: #e2e8f0;}

.card-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px dashed #e2e8f0; background: #fafaf9; }
.time-info { font-size: 1.05rem; color: #1e293b; font-weight: 900; display: flex; align-items: center; gap: 6px; }

.status-badge { font-size: 0.85rem; font-weight: 900; padding: 6px 12px; border-radius: 10px; }
.status-0 { background: #fff7ed; color: #ea580c; border: 1px solid #fdba74;}
.status-1 { background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe;}
.status-2 { background: #fefce8; color: #ca8a04; border: 1px solid #fde047;} /* 待评价专属色 */
.status-3 { background: #ecfdf5; color: #10b981; border: 1px solid #a7f3d0;}
.status-4 { background: #f1f5f9; color: #94a3b8; border: 1px solid #cbd5e1;}

.card-body { display: flex; padding: 20px; gap: 15px; align-items: center; }
.goods-icon-box { font-size: 2.5rem; background: #f8fafc; width: 64px; height: 64px; display: flex; justify-content: center; align-items: center; border-radius: 16px; border: 1px solid #e2e8f0; flex-shrink: 0;}
.goods-details { flex: 1; overflow: hidden;}
.g-name { margin: 0 0 6px 0; font-size: 1.25rem; color: #1e293b; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.g-desc { font-size: 0.9rem; color: #64748b; margin-bottom: 10px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.g-meta { display: flex; gap: 8px; }
.meta-tag { font-size: 0.85rem; font-weight: bold; padding: 4px 10px; border-radius: 8px; }
.bg-blue { background: #e0f2fe; color: #0284c7; }
.bg-orange { background: #ffedd5; color: #c2410c; }
.bg-gray { background: #f1f5f9; color: #475569; }

.pickup-zone { margin: 0 20px 20px 20px; background: #ecfdf5; border: 2px dashed #34d399; border-radius: 16px; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;}
.pz-left { display: flex; flex-direction: column; gap: 4px; }
.pz-label { color: #059669; font-weight: 900; font-size: 1rem; }
.pz-tip { color: #10b981; font-size: 0.8rem; font-weight: bold; }
.pz-right { background: #fff; padding: 8px 15px; border-radius: 12px; box-shadow: 0 4px 10px rgba(16,185,129,0.1); }
.pz-code { font-family: 'Courier New', Courier, monospace; font-size: 1.6rem; font-weight: 900; color: #059669; letter-spacing: 2px;}

.card-footer { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-top: 1px solid #f1f5f9; background: #fff;}
.exception-text { font-size: 0.85rem; color: #ef4444; font-weight: bold; display: flex; align-items: center; gap: 4px; max-width: 50%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
.actions { display: flex; gap: 10px; margin-left: auto;}
.actions.full-width { width: 100%; justify-content: flex-end; }
.action-btn { padding: 10px 16px; border-radius: 12px; font-weight: 900; font-size: 0.95rem; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 6px; border: none;}
.cancel-btn { background: #fff; color: #64748b; border: 1px solid #cbd5e1; }
.cancel-btn:hover { background: #fef2f2; color: #ef4444; border-color: #fca5a5; }
.reorder-btn { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
.reorder-btn:hover { background: #10b981; color: white; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16,185,129,0.2);}
.btn-rate { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; } /* 评价按钮专属金黄 */
.btn-rate:hover { background: #f59e0b; color: white; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2); }

/* 评价弹窗 */
.rate-box { text-align: center; padding: 15px 0; }
.rate-tip { margin-bottom: 25px; color: #64748b; font-weight: bold; line-height: 1.5; font-size: 0.95rem; }
.rate-textarea { margin-top: 25px; }
:deep(.el-textarea__inner) { border-radius: 12px; padding: 12px; background: #f8fafc; border: 2px solid #e2e8f0; transition: 0.3s; }
:deep(.el-textarea__inner:focus) { border-color: #f59e0b; background: #fff; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1); }
.dialog-actions { display: flex; gap: 10px; justify-content: center; width: 100%; }
.btn-success { background: #f59e0b; color: white; flex: 1; border: none; padding: 12px; border-radius: 12px; font-weight: 900; cursor: pointer; transition: 0.2s;}
.btn-success:hover { background: #d97706; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(245,158,11, 0.25); }

.load-more-wrap { text-align: center; margin-top: 30px; }
.big-load-btn { width: 100%; max-width: 400px; padding: 16px; background: #e2e8f0; color: #475569; font-size: 1.1rem; font-weight: 900; border: none; border-radius: 16px; cursor: pointer; transition: 0.2s;}
.big-load-btn:hover { background: #cbd5e1; color: #1e293b;}
.end-text { color: #cbd5e1; font-weight: bold; font-size: 1rem;}

.list-fade-enter-active, .list-fade-leave-active { transition: all 0.4s ease; }
.list-fade-enter-from, .list-fade-leave-to { opacity: 0; transform: translateY(20px); }

@media screen and (max-width: 768px) {
  .main-content { padding: 20px 15px; }
  .status-tabs { width: 100%; justify-content: space-between; flex-wrap: wrap; gap: 5px; }
  .tab-item { flex: 1 1 30%; text-align: center; padding: 10px 0; font-size: 0.85rem;}
  .pickup-zone { flex-direction: column; gap: 15px; align-items: flex-start;}
  .card-footer { flex-direction: column; gap: 15px; align-items: flex-start; }
  .actions { width: 100%; justify-content: space-between; margin-left: 0; flex-wrap: wrap;}
  .actions .action-btn { flex: 1; justify-content: center; }
}
</style>