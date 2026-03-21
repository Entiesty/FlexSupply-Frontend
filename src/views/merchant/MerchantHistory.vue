<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot"></span>
      物资全链路溯源系统运行中 | 🏆 我的商铺信誉分: <strong style="color: #f59e0b; font-size: 1.1em; margin: 0 4px;">{{ myCreditScore }}</strong> 分
    </div>

    <div class="history-wrapper">
      <header class="page-header">
        <h2>📜 我的捐赠溯源档案</h2>
        <p>每一份爱心都有迹可循，实时追踪您的物资流转状态</p>
      </header>

      <div class="glass-panel">
        <div class="toolbar">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input v-model="queryParams.goodsName" type="text" class="search-input" placeholder="输入物资名称检索..." @keyup.enter="fetchData" />
          </div>
          <select v-model="queryParams.status" class="status-select" @change="fetchData">
            <option :value="null">所有流转状态</option>
            <option :value="0">🟡 待取货 (在店)</option>
            <option :value="1">🔵 运送中 (干线)</option>
            <option :value="4">🟣 自送中 (商家自行配送)</option>
            <option :value="2">🟢 已入库 (据点)</option>
            <option :value="3">⚫ 已发完 (送达市民)</option>
          </select>
          <button class="search-btn" @click="fetchData">检索</button>
        </div>

        <div class="card-list" v-loading="loading">
          <div v-if="!loading && tableData.length === 0" class="empty-state">
            <div class="empty-icon">💝</div>
            <h3>暂无捐赠记录</h3>
            <p>快去捐赠大厅传递您的第一份爱心吧！</p>
          </div>

          <transition-group name="list-fade">
            <div class="donate-card" v-for="row in tableData" :key="row.goodsId">

              <div class="d-header">
                <div class="category-tag">{{ row.category }}</div>
                <div class="status-node" :class="'status-' + row.status">
                  <span class="node-dot"></span>
                  {{ getStatusText(row.status) }}
                </div>
              </div>

              <div class="d-body">
                <h3 class="goods-name" :title="row.goodsName">{{ cleanGoodsName(row.goodsName) }}</h3>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="i-label">捐赠结余数量</span>
                    <span class="i-value stock-num">{{ row.stock }} <span class="unit">份</span></span>
                  </div>
                  <div class="info-item">
                    <span class="i-label">定向流转驿站</span>
                    <span class="i-value station-name">📍 {{ row.stationName || '大盘算力分配中...' }}</span>
                  </div>
                </div>
              </div>

              <div class="d-footer">
                <button class="action-btn btn-trace" @click="openTrace(row)">
                  📍 物资全链路追踪
                </button>
                <div class="dynamic-actions">
                  <template v-if="row.status === 0">
                    <button class="action-btn btn-primary" @click="handleStart(row)">🚗 自送</button>
                    <button class="action-btn btn-revoke" @click="handleRevoke(row)">撤销</button>
                  </template>
                  <template v-else-if="row.status === 4">
                    <button class="action-btn btn-success" @click="handleFinish(row)">✅ 确认送达</button>
                  </template>
                </div>
              </div>
            </div>
          </transition-group>
        </div>

        <div class="pagination-wrap" v-if="total > 0">
          <el-pagination
              background
              layout="total, prev, pager, next"
              :total="total"
              :page-size="queryParams.pageSize"
              v-model:current-page="queryParams.pageNum"
              @current-change="fetchData"
          />
        </div>
      </div>
    </div>

    <el-dialog v-model="traceVisible" title="📦 捐赠物资履约追踪" width="90%" style="max-width: 550px; border-radius: 20px;" custom-class="trace-dialog">
      <div class="trace-container" v-if="currentTraceItem">
        <div class="trace-summary">
          <div class="summary-item">
            <span class="label">追踪物资：</span>
            <span class="value goods-name-trace">{{ cleanGoodsName(currentTraceItem.goodsName) }}</span>
            <span class="value goods-count">剩余 {{ currentTraceItem.stock }} 份</span>
          </div>
          <div class="summary-item">
            <span class="label">目标驿站：</span>
            <span class="value">🏥 {{ currentTraceItem.stationName || '系统算法分配中...' }}</span>
          </div>
        </div>

        <el-timeline class="custom-timeline">
          <el-timeline-item :timestamp="currentTraceItem.createTime || '近期'" color="#3b82f6" size="large">
            <h4 class="tl-title">💝 感谢您的爱心捐赠</h4>
            <p class="tl-desc">您的捐赠意向已录入城市调度大盘，正在匹配运力。</p>
          </el-timeline-item>

          <el-timeline-item
              :color="currentTraceItem.status === 1 || currentTraceItem.status === 4 || currentTraceItem.status >= 2 ? '#f97316' : '#e2e8f0'"
              :hollow="currentTraceItem.status === 0">
            <h4 class="tl-title" :class="{'pending-text': currentTraceItem.status === 0}">
              {{ currentTraceItem.status === 4 ? '🚗 您正在亲自护送物资前往驿站' : (currentTraceItem.status >= 1 ? '🚴 城市护航骑士已接单取货' : '⏳ 调度引擎正在呼叫骑士/等待自送...') }}
            </h4>
            <p class="tl-desc" v-if="currentTraceItem.status === 1 || currentTraceItem.status === 4">正在全力保障您的爱心物资安全抵达目的地。</p>
          </el-timeline-item>

          <el-timeline-item
              :color="currentTraceItem.status >= 2 ? '#10b981' : '#e2e8f0'"
              :hollow="currentTraceItem.status < 2"
              size="large">
            <h4 class="tl-title" :class="{'pending-text': currentTraceItem.status < 2}">
              <template v-if="currentTraceItem.status >= 2">
                {{ currentTraceItem.stationName ? `🏥 物资已安全抵达【${currentTraceItem.stationName}】` : '🚀 急态绿色通道：跳过驿站中转直达现场' }}
              </template>
              <template v-else>
                ⏳ 等待物资入库食物银行驿站/直达现场...
              </template>
            </h4>
            <p class="tl-desc" v-if="currentTraceItem.status >= 2">
              {{ currentTraceItem.stationName ? '驿站工作人员已清点并入库，等待受助市民实名申领。' : '触发紧急 P2P 调度模式，城市护航骑士将物资直接交接至求助市民手中。' }}
            </p>
          </el-timeline-item>

          <el-timeline-item
              :color="currentTraceItem.status === 3 ? '#ef4444' : '#e2e8f0'"
              :hollow="currentTraceItem.status < 3"
              size="large">
            <h4 class="tl-title" :class="{'pending-text': currentTraceItem.status < 3}">
              {{ currentTraceItem.status === 3 ? '🎉 物资已全部分发核销完毕！' : '⏳ 等待流转至最终困难群体...' }}
            </h4>
            <p class="tl-desc" v-if="currentTraceItem.status === 3">这份物资已经在这个城市中化作了一道微光，再次代表社区感谢您的善举！</p>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-dialog>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMerchantGoodsPage, revokeGoods, startSelfDelivery, finishSelfDelivery } from '@/api/resource'
// 🚨 修复二：引入获取用户个人信息的接口
import { getUserProfile } from '@/api/user'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)

// 🚨 修复二：定义信誉分响应式变量
const myCreditScore = ref(100)

const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  goodsName: '',
  status: null
})

const traceVisible = ref(false)
const currentTraceItem = ref(null)

const getStatusText = (status) => {
  const map = { 0: '待取货', 1: '骑手运送中', 2: '已入库', 3: '已发完', 4: '商家自送中' }
  return map[status] || '未知'
}

// 统一清洗物资名称，防止过长
const cleanGoodsName = (name) => {
  if (!name) return '未知物资'
  return name.replace(/^急需：/, '').replace(/\[.*?\]\s*/, '')
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getMerchantGoodsPage(queryParams.value)
    tableData.value = res.data.records || []
    total.value = res.data.total || 0
  } catch (e) {
    console.error('获取溯源记录失败', e)
  } finally {
    loading.value = false
  }
}

const openTrace = (row) => {
  currentTraceItem.value = row
  traceVisible.value = true
}

const handleRevoke = (row) => {
  ElMessageBox.confirm(
      `确定要撤销【${cleanGoodsName(row.goodsName)}】的捐赠吗？撤销后该物资将从全城调度大盘中移除。`,
      '撤销防呆确认',
      { confirmButtonText: '确认撤销', cancelButtonText: '保留', type: 'warning' }
  ).then(async () => {
    loading.value = true
    try {
      await revokeGoods(row.goodsId)
      ElMessage.success('撤销成功，已从大盘移除')
      fetchData()
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }).catch(() => {})
}

const handleStart = async (row) => {
  try {
    loading.value = true
    await startSelfDelivery(row.goodsId)
    ElMessage.success('物资已锁定防抢单！请注意交通安全')
    await fetchData()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleFinish = async (row) => {
  ElMessageBox.confirm(
      `确认您已将【${cleanGoodsName(row.goodsName)}】亲自交到驿站工作人员手中了吗？`,
      '安全核销确认',
      { confirmButtonText: '确认入库', cancelButtonText: '取消', type: 'success' }
  ).then(async () => {
    loading.value = true
    try {
      await finishSelfDelivery(row.goodsId)
      ElMessage.success('核销成功，感谢您的亲力亲为！')
      await fetchData()
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }).catch(() => {})
}

// 🚨 修复二：在挂载时同步拉取当前商家的信誉分
onMounted(async () => {
  fetchData()
  try {
    const userRes = await getUserProfile()
    if (userRes && userRes.data) {
      myCreditScore.value = userRes.data.creditScore || 100
    }
  } catch (e) {
    console.error('获取信誉分失败', e)
  }
})
</script>

<style scoped>
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 40px 30px; background: #f8fafc; min-height: 100vh; overflow-y: auto;}
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); font-weight: bold;}
.pulse-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; animation: pulse-green 2s infinite; }
@keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

.history-wrapper { max-width: 1200px; margin: 0 auto; width: 100%; padding-bottom: 50px;}
.page-header h2 { color: #1e293b; font-size: 2.2rem; margin: 0 0 8px 0; font-weight: 900; letter-spacing: 1px; }
.page-header p { color: #64748b; font-size: 1.1rem; margin: 0 0 30px 0; font-weight: bold;}

.glass-panel { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 24px; padding: 25px 30px; box-shadow: 0 15px 35px rgba(0,0,0,0.06); border: 1px solid #fff; }

/* 现代工具栏 */
.toolbar { display: flex; gap: 15px; margin-bottom: 25px; align-items: center; flex-wrap: wrap;}
.search-box { flex: 1; min-width: 250px; position: relative; display: flex; align-items: center;}
.search-icon { position: absolute; left: 16px; color: #94a3b8; font-size: 1.1rem;}
.search-input { width: 100%; padding: 12px 18px 12px 42px; border: 2px solid #e2e8f0; border-radius: 14px; outline: none; transition: 0.3s; font-size: 1rem; color: #1e293b; background: #f8fafc; font-weight: bold;}
.status-select { padding: 12px 18px; border: 2px solid #e2e8f0; border-radius: 14px; outline: none; transition: 0.3s; font-size: 1rem; color: #475569; background: #f8fafc; font-weight: bold; min-width: 180px; cursor: pointer;}
.search-input:focus, .status-select:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
.search-btn { background: #1e293b; color: #fff; border: none; padding: 0 30px; height: 48px; border-radius: 14px; font-weight: 900; font-size: 1rem; cursor: pointer; transition: 0.2s; white-space: nowrap;}
.search-btn:hover { background: #0f172a; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(15, 23, 42, 0.2); }

/* 空状态 */
.empty-state { text-align: center; padding: 60px 0; }
.empty-icon { font-size: 5rem; margin-bottom: 15px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));}
.empty-state h3 { color: #1e293b; margin: 0 0 8px; font-size: 1.3rem; font-weight: 900;}
.empty-state p { color: #64748b; font-size: 1rem; font-weight: bold;}

/* 🚨 核心改造：卡片瀑布流 */
.card-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 24px; }
.donate-card { background: #fff; border-radius: 20px; border: 1px solid #f1f5f9; box-shadow: 0 10px 25px rgba(0,0,0,0.03); overflow: hidden; display: flex; flex-direction: column; transition: 0.3s; }
.donate-card:hover { transform: translateY(-4px); box-shadow: 0 15px 35px rgba(0,0,0,0.06); border-color: #e2e8f0; }

.d-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: #f8fafc; border-bottom: 1px dashed #e2e8f0;}
.category-tag { display: inline-block; font-size: 0.8rem; background: #e0f2fe; color: #0284c7; padding: 4px 10px; border-radius: 8px; font-weight: 900; letter-spacing: 0.5px;}

/* 状态节点设计 */
.status-node { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 10px; font-weight: 900; font-size: 0.85rem; }
.node-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-0 { background: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; }
.status-0 .node-dot { background: #ea580c; box-shadow: 0 0 8px #ea580c; }
.status-1 { background: #eff6ff; color: #3b82f6; border: 1px solid #dbeafe; }
.status-1 .node-dot { background: #3b82f6; animation: pulse-blue 1.5s infinite; }
.status-4 { background: #faf5ff; color: #a855f7; border: 1px solid #e9d5ff; }
.status-4 .node-dot { background: #a855f7; animation: pulse-purple 1.5s infinite; }
.status-2 { background: #ecfdf5; color: #10b981; border: 1px solid #d1fae5; }
.status-2 .node-dot { background: #10b981; }
.status-3 { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; }
.status-3 .node-dot { background: #ef4444; }

@keyframes pulse-blue { 0% { box-shadow: 0 0 0 0 rgba(59,130,246, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(59,130,246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59,130,246, 0); } }
@keyframes pulse-purple { 0% { box-shadow: 0 0 0 0 rgba(168,85,247, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(168,85,247, 0); } 100% { box-shadow: 0 0 0 0 rgba(168,85,247, 0); } }

.d-body { padding: 20px; flex: 1;}
.goods-name { margin: 0 0 16px 0; font-size: 1.25rem; color: #1e293b; font-weight: 900; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.info-grid { display: flex; flex-direction: column; gap: 12px; }
.info-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border-radius: 12px;}
.i-label { font-size: 0.85rem; color: #64748b; font-weight: bold; }
.i-value { font-size: 0.95rem; font-weight: 900; color: #1e293b; }
.stock-num { color: #ea580c; font-size: 1.1rem;}
.stock-num .unit { font-size: 0.8rem; color: #94a3b8; }
.station-name { color: #3b82f6; max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}

.d-footer { padding: 15px 20px; border-top: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 10px; background: #fff;}
.dynamic-actions { display: flex; gap: 10px; }
.action-btn { flex: 1; border: none; padding: 12px; border-radius: 12px; font-weight: 900; cursor: pointer; transition: all 0.2s; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.02);}
.btn-trace { width: 100%; background: #f1f5f9; color: #334155; }
.btn-trace:hover { background: #1e293b; color: white; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(30, 41, 59, 0.2); }
.btn-primary { background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; }
.btn-primary:hover { background: #3b82f6; color: white; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(59, 130, 246, 0.25); }
.btn-revoke { background: #fff; color: #ef4444; border: 1px solid #fecaca; flex: 0.6;}
.btn-revoke:hover { background: #fef2f2; transform: translateY(-2px); }
.btn-success { background: #ecfdf5; color: #10b981; border: 1px solid #a7f3d0; }
.btn-success:hover { background: #10b981; color: white; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(16, 185, 129, 0.25); }

.pagination-wrap { display: flex; justify-content: center; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #e2e8f0; }

.list-fade-enter-active, .list-fade-leave-active { transition: all 0.4s ease; }
.list-fade-enter-from, .list-fade-leave-to { opacity: 0; transform: translateY(20px); }

/* ================= 轨迹溯源弹窗专属 UI ================= */
.trace-container { padding: 0 5px; }
.trace-summary { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 20px; margin-bottom: 30px; display: flex; flex-direction: column; gap: 12px; }
.summary-item { display: flex; align-items: center; font-size: 0.95rem; }
.summary-item .label { color: #64748b; width: 80px; font-weight: bold;}
.summary-item .goods-name-trace { font-weight: 900; color: #1e293b; font-size: 1.15rem; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 12px;}
.summary-item .goods-count { background: #fff7ed; color: #ea580c; padding: 4px 10px; border-radius: 8px; font-weight: 900; border: 1px solid #fdba74; }

.custom-timeline { padding-left: 10px; margin-top: 10px;}
.tl-title { margin: 0 0 6px 0; font-size: 1.1rem; color: #1e293b; font-weight: 900; }
.tl-desc { margin: 0; font-size: 0.9rem; color: #64748b; line-height: 1.5; font-weight: bold;}
.pending-text { color: #94a3b8 !important; }

:deep(.el-timeline-item__node--large) { width: 16px; height: 16px; left: -2px; }
:deep(.el-timeline-item__wrapper) { padding-left: 28px; top: -4px; }
:deep(.el-dialog__header) { padding: 20px 25px; border-bottom: 1px solid #f1f5f9;}
:deep(.el-dialog__title) { font-weight: 900; color: #1e293b; }

@media screen and (max-width: 768px) {
  .main-content { padding: 20px 15px; }
  .toolbar { flex-direction: column; align-items: stretch;}
  .search-box, .status-select { width: 100%; min-width: unset;}
  .card-list { grid-template-columns: 1fr; }
  .glass-panel { padding: 20px 15px; }
  .info-item { flex-direction: column; align-items: flex-start; gap: 4px;}
  .station-name { max-width: 100%;}
}
</style>