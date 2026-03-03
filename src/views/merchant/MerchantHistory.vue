<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot"></span> 物资全链路溯源系统运行中
    </div>

    <div class="history-wrapper">
      <header class="page-header">
        <h2>📜 我的捐赠溯源档案</h2>
        <p>每一份爱心都有迹可循，实时追踪您的物资流转状态</p>
      </header>

      <div class="glass-panel">
        <div class="toolbar">
          <input v-model="queryParams.goodsName" type="text" class="search-input" placeholder="输入物资名称检索..." @keyup.enter="fetchData" />
          <select v-model="queryParams.status" class="status-select" @change="fetchData">
            <option :value="null">所有流转状态</option>
            <option :value="0">🟡 待取货 (在店)</option>
            <option :value="1">🔵 运送中 (干线)</option>
            <option :value="2">🟢 已入库 (据点)</option>
            <option :value="3">⚫ 已发完 (送达)</option>
          </select>
          <button class="search-btn" @click="fetchData">精准溯源</button>
        </div>

        <el-table :data="tableData" style="width: 100%" class="custom-table" v-loading="loading" :empty-text="'暂无捐赠记录，快去捐赠大厅传递爱心吧！'">
          <el-table-column prop="goodsName" label="物资明细" min-width="160">
            <template #default="scope">
              <span class="goods-name">{{ scope.row.goodsName }}</span>
              <div class="category-tag">{{ scope.row.category }}</div>
            </template>
          </el-table-column>

          <el-table-column label="捐赠数量" width="120" align="center">
            <template #default="scope">
              <span class="stock-num">{{ scope.row.stock }} 份</span>
            </template>
          </el-table-column>

          <el-table-column prop="stationName" label="定向流转驿站" min-width="150" align="center">
            <template #default="scope">
              <span class="station-badge">📍 {{ scope.row.stationName || '分配中...' }}</span>
            </template>
          </el-table-column>

          <el-table-column label="当前状态节点" width="160" align="center">
            <template #default="scope">
              <div class="status-node" :class="'status-' + scope.row.status">
                <span class="node-dot"></span>
                {{ getStatusText(scope.row.status) }}
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="createTime" label="捐赠时间" width="170" align="center" />

          <el-table-column label="风控干预" width="140" align="center" fixed="right">
            <template #default="scope">
              <button
                  v-if="scope.row.status === 0"
                  class="action-btn btn-revoke"
                  @click="handleRevoke(scope.row)"
              >
                撤销捐赠
              </button>
              <el-tooltip v-else content="物资已进入调度流转引擎，无法撤销" placement="top">
                <button class="action-btn btn-disabled" disabled>锁定流转</button>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrap">
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
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMerchantGoodsPage, revokeGoods } from '@/api/resource'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)

const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  goodsName: '',
  status: null
})

const getStatusText = (status) => {
  const map = { 0: '待取货', 1: '运送中', 2: '已入库', 3: '已发完' }
  return map[status] || '未知'
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

const handleRevoke = (row) => {
  ElMessageBox.confirm(
      `确定要撤销【${row.goodsName}】的捐赠吗？撤销后该物资将从全城调度大盘中移除。`,
      '撤销防呆确认',
      {
        confirmButtonText: '确认撤销',
        cancelButtonText: '点错了，保留',
        type: 'warning'
      }
  ).then(async () => {
    loading.value = true
    try {
      await revokeGoods(row.goodsId)
      ElMessage.success('撤销成功，已从大盘移除')
      fetchData() // 刷新列表
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }).catch(() => {})
}

onMounted(() => fetchData())
</script>

<style scoped>
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 40px; background: #f1f5f9; min-height: 100vh; overflow-y: auto;}
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); }
.pulse-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; animation: pulse-green 2s infinite; }
@keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

.history-wrapper { max-width: 1200px; margin: 0 auto; width: 100%; padding-bottom: 50px;}
.page-header h2 { color: #1e293b; font-size: 2.2rem; margin: 0 0 8px 0; font-weight: 900; letter-spacing: 1px; }
.page-header p { color: #64748b; font-size: 1.1rem; margin: 0 0 30px 0; }

.glass-panel { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 24px; padding: 25px; box-shadow: 0 15px 35px rgba(0,0,0,0.06); border: 1px solid #fff; }

.toolbar { display: flex; gap: 15px; margin-bottom: 25px; }
.search-input, .status-select { padding: 12px 18px; border: 2px solid #e2e8f0; border-radius: 12px; outline: none; transition: 0.3s; font-size: 1rem; color: #475569; background: #f8fafc; }
.search-input { flex: 1; }
.search-input:focus, .status-select:focus { border-color: #f97316; background: #fff; box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1); }
.search-btn { background: #1e293b; color: #fff; border: none; padding: 0 25px; border-radius: 12px; font-weight: 900; cursor: pointer; transition: 0.2s; }
.search-btn:hover { background: #0f172a; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(15, 23, 42, 0.2); }

:deep(.el-table) { border-radius: 16px; overflow: hidden; --el-table-border-color: transparent; }
:deep(.el-table th.el-table__cell) { background-color: #f8fafc; color: #475569; font-weight: 900; font-size: 0.95rem; padding: 18px 0; border-bottom: 2px solid #f1f5f9; }
:deep(.el-table td.el-table__cell) { padding: 15px 0; border-bottom: 1px dashed #f1f5f9; color: #334155; }
:deep(.el-table__inner-wrapper::before) { display: none; }

.goods-name { font-weight: 900; font-size: 1.05rem; color: #1e293b; display: block; }
.category-tag { display: inline-block; margin-top: 5px; font-size: 0.75rem; background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 6px; font-weight: bold; }
.stock-num { font-family: monospace; font-size: 1.1rem; color: #ea580c; font-weight: 900; }
.station-badge { background: #eff6ff; color: #2563eb; padding: 6px 12px; border-radius: 8px; font-weight: bold; font-size: 0.85rem; }

/* 状态节点设计 */
.status-node { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 0.85rem; border: 1px solid transparent; }
.node-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-0 { background: #fff7ed; color: #ea580c; border-color: #ffedd5; }
.status-0 .node-dot { background: #ea580c; box-shadow: 0 0 8px #ea580c; }
.status-1 { background: #eff6ff; color: #3b82f6; border-color: #dbeafe; }
.status-1 .node-dot { background: #3b82f6; animation: pulse-blue 1.5s infinite; }
.status-2 { background: #ecfdf5; color: #10b981; border-color: #d1fae5; }
.status-2 .node-dot { background: #10b981; }
.status-3 { background: #f1f5f9; color: #64748b; border-color: #e2e8f0; }
.status-3 .node-dot { background: #94a3b8; }

.action-btn { border: none; padding: 8px 16px; border-radius: 10px; font-weight: 900; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.btn-revoke { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
.btn-revoke:hover { background: #ef4444; color: white; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(239, 68, 68, 0.25); }
.btn-disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; box-shadow: none; }

.pagination-wrap { display: flex; justify-content: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid #f1f5f9; }
</style>