<template>
  <div class="flow-container">
    <div class="stats-header">
      <div class="stat-card">
        <div class="stat-icon database">🗄️</div>
        <div class="stat-info">
          <p>当前检索总单量</p>
          <h3>{{ total }} <span class="unit">单</span></h3>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon dispatching">🚴</div>
        <div class="stat-info">
          <p>当前页面调度中</p>
          <h3>{{ tableData.filter(d => d.status === 1).length }} <span class="unit">单</span></h3>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon success">✅</div>
        <div class="stat-info">
          <p>当前页面已送达</p>
          <h3>{{ tableData.filter(d => d.status === 2).length }} <span class="unit">单</span></h3>
        </div>
      </div>
    </div>

    <div class="table-wrapper">
      <div class="filter-bar">
        <el-form :inline="true" :model="queryParams" class="demo-form-inline">
          <el-form-item label="单号追踪">
            <el-input v-model="queryParams.orderSn" placeholder="输入完整或模糊单号" clearable prefix-icon="Search" />
          </el-form-item>
          <el-form-item label="订单状态">
            <el-select v-model="queryParams.status" placeholder="全部状态" clearable style="width: 140px">
              <el-option label="待匹配 (异常)" :value="0" />
              <el-option label="调度中 (运送)" :value="1" />
              <el-option label="已送达 (完结)" :value="2" />
              <el-option label="已取消 (关闭)" :value="3" />
            </el-select>
          </el-form-item>
          <el-form-item label="履约模式">
            <el-select v-model="queryParams.deliveryMethod" placeholder="全部模式" clearable style="width: 140px">
              <el-option label="志愿者配送" :value="1" />
              <el-option label="居民自提" :value="2" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" class="custom-search-btn" @click="handleSearch">
              <el-icon><Search /></el-icon> 精准检索
            </el-button>
            <el-button @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table
          v-loading="loading"
          :data="tableData"
          style="width: 100%"
          class="custom-table"
          :header-cell-style="{ background: '#f8fafc', color: '#475569', fontWeight: 'bold' }"
      >
        <el-table-column label="业务线" min-width="110" align="center">
          <template #default="scope">
            <div class="biz-badge" :class="scope.row.orderSn.startsWith('DON') ? 'don-type' : 'req-type'">
              {{ scope.row.orderSn.startsWith('DON') ? '🔵 捐赠入库' : '🔴 求助出库' }}
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="orderSn" label="调度单号" min-width="170" align="center">
          <template #default="scope">
            <span class="order-sn">{{ scope.row.orderSn }}</span>
          </template>
        </el-table-column>

        <el-table-column label="📦 派发物资明细" min-width="210" align="left">
          <template #default="{ row }">
            <div class="goods-info-cell">
              <div class="goods-main">
                <span class="g-name" :title="row.goodsName || '标准应急救助包'">
                  {{ row.goodsName || '标准应急救助包' }}
                </span>
                <span class="g-count">x{{ row.goodsCount || 1 }}</span>
              </div>
              <div class="goods-sub">
                <el-tag size="small" effect="plain" type="info" class="custom-tag-cat">
                  大类: {{ (row.requiredCategory && row.requiredCategory.trim() !== '') ? row.requiredCategory : '通用物资' }}
                </el-tag>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="紧急度" min-width="90" align="center">
          <template #default="scope">
            <span v-if="!scope.row.orderSn.startsWith('DON')" :class="['urgency-badge', scope.row.urgencyLevel >= 8 ? 'high' : 'normal']">
              Lv.{{ scope.row.urgencyLevel }}
            </span>
            <span v-else class="urgency-badge normal">常规</span>
          </template>
        </el-table-column>

        <el-table-column prop="deliveryMethod" label="履约模式" min-width="120" align="center">
          <template #default="scope">
            <div class="delivery-type" :class="scope.row.deliveryMethod === 2 ? 'pickup' : 'delivery'">
              {{ scope.row.deliveryMethod === 2 ? '🚶 自提/自送' : '🚴 志愿配送' }}
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="实时状态" min-width="120" align="center">
          <template #default="scope">
            <el-tag v-if="scope.row.status === 0" type="danger" effect="light">🟡 待匹配 (未接单)</el-tag>
            <el-tag v-else-if="scope.row.status === 1" type="primary" effect="light">🔵 调度流转中</el-tag>
            <el-tag v-else-if="scope.row.status === 2" type="success" effect="light">🟢 履约已完结</el-tag>
            <el-tag v-else type="info" effect="light">⚫ 已强制取消</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="createTime" label="时间轴" min-width="160" align="center" />

        <el-table-column label="指挥中心干预" width="180" fixed="right" align="center">
          <template #default="scope">
            <el-button
                v-if="scope.row.status === 0 || scope.row.status === 1"
                link
                type="danger"
                size="small"
                @click="handleCancel(scope.row)"
            >
              强行终止
            </el-button>
            <el-button
                link
                type="primary"
                size="small"
                class="detail-btn"
                @click="handleTrace(scope.row)"
            >
              轨迹追溯
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
            v-model:current-page="queryParams.pageNum"
            v-model:page-size="queryParams.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :background="true"
            layout="total, sizes, prev, pager, next, jumper"
            :total="total"
            @size-change="fetchData"
            @current-change="fetchData"
        />
      </div>
    </div>

    <el-dialog v-model="traceVisible" :title="`📦 订单轨迹追踪: ${currentTraceOrder?.orderSn}`" width="550px" custom-class="trace-dialog">
      <div class="trace-container">

        <div class="trace-summary">
          <div class="summary-item">
            <span class="label">运载标的：</span>
            <span class="value goods-name">{{ currentTraceOrder?.goodsName || currentTraceOrder?.requiredCategory || '未知物资' }}</span>
            <span class="value goods-count">x{{ currentTraceOrder?.goodsCount || 1 }}</span>
          </div>
          <div class="summary-item">
            <span class="label">履约模式：</span>
            <span class="value">{{ currentTraceOrder?.deliveryMethod === 2 ? '🚶 居民自提' : '🚴 志愿配送' }}</span>
          </div>
        </div>

        <el-timeline class="custom-timeline">

          <el-timeline-item :timestamp="currentTraceOrder?.createTime" color="#3b82f6" size="large">
            <h4 class="tl-title">
              {{ currentTraceOrder?.orderSn?.startsWith('DON') ? '🏪 爱心商家发起捐赠入库' : '👴 市民发起紧急求助出库' }}
            </h4>
            <p class="tl-desc">调度中枢已成功捕获需求，单号正式落库</p>
          </el-timeline-item>

          <el-timeline-item :timestamp="currentTraceOrder?.createTime" color="#10b981">
            <h4 class="tl-title">🧠 引擎智能分拨完成</h4>
            <p class="tl-desc">已测算 LBS 空间距离，自动就近锁定社区食物银行据点</p>
          </el-timeline-item>

          <el-timeline-item v-if="currentTraceOrder?.status === 3" color="#ef4444" size="large">
            <h4 class="tl-title error-text">🚨 订单已被指挥中心强制终止</h4>
            <p class="tl-desc">运力已释放，本次调度任务永久关闭</p>
          </el-timeline-item>

          <template v-else>
            <el-timeline-item v-if="currentTraceOrder?.deliveryMethod === 1"
                              :color="currentTraceOrder?.status >= 1 ? '#f97316' : '#e2e8f0'"
                              :hollow="currentTraceOrder?.status < 1">
              <h4 class="tl-title" :class="{'pending-text': currentTraceOrder?.status < 1}">
                {{ currentTraceOrder?.status >= 1 ? '⚡ 志愿者已接单响应' : '⏳ 正在雷达广播，呼叫周边运力...' }}
              </h4>
              <p class="tl-desc" v-if="currentTraceOrder?.status >= 1">护航者正在按照最优导航路线前往据点</p>
            </el-timeline-item>

            <el-timeline-item :color="currentTraceOrder?.status === 2 ? '#10b981' : '#e2e8f0'"
                              :hollow="currentTraceOrder?.status < 2"
                              size="large">
              <h4 class="tl-title" :class="{'pending-text': currentTraceOrder?.status < 2}">
                {{ currentTraceOrder?.status === 2 ? '✅ 物资送达，履约核销完结' : '⏳ 等待最终送达核销...' }}
              </h4>
              <p class="tl-desc" v-if="currentTraceOrder?.status === 2">拍照核销成功，本次城市微光护航圆满结束</p>
            </el-timeline-item>
          </template>

        </el-timeline>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAdminOrders, cancelOrder } from '@/api/trade'

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  orderSn: '',
  status: null,
  deliveryMethod: null
})

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const traceVisible = ref(false)
const currentTraceOrder = ref(null)

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getAdminOrders(queryParams)
    tableData.value = res.data.records
    total.value = res.data.total
  } catch (error) {
    ElMessage.error('获取订单数据失败，请检查后端服务')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => { queryParams.pageNum = 1; fetchData() }

const resetQuery = () => {
  queryParams.orderSn = ''
  queryParams.status = null
  queryParams.deliveryMethod = null
  handleSearch()
}

const handleCancel = (row) => {
  ElMessageBox.confirm(`此操作将强行撤销订单 ${row.orderSn}，是否继续？`, '⚠️ 异常干预警告', {
    confirmButtonText: '立即强制撤销',
    cancelButtonText: '暂不操作',
    type: 'error',
  }).then(async () => {
    loading.value = true
    try {
      await cancelOrder(row.orderId)
      ElMessage.success('🚀 指挥中心干预成功，订单已强制取消，运力已被释放！')
      fetchData()
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }).catch(() => {})
}

const handleTrace = (row) => { currentTraceOrder.value = row; traceVisible.value = true }
const getStatusText = (status) => {
  const map = { 0: '🟡 待匹配 (未接单)', 1: '🔵 调度流转中', 2: '🟢 履约已完结', 3: '⚫ 已强制取消' }
  return map[status] || '未知状态'
}

onMounted(() => fetchData())
</script>

<style scoped>
.flow-container { padding: 24px; background-color: #f1f5f9; min-height: calc(100vh - 60px); box-sizing: border-box; width: 100%; overflow-x: hidden; }

/* 顶部数据统计卡片 */
.stats-header { display: flex; gap: 20px; margin-bottom: 24px; }
.stat-card { flex: 1; background: #fff; border-radius: 20px; padding: 20px 24px; display: flex; align-items: center; gap: 20px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02); transition: transform 0.3s; }
.stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); }
.stat-icon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 28px; }
.stat-icon.database { background: #fef2f2; color: #ef4444; }
.stat-icon.dispatching { background: #eff6ff; color: #3b82f6; }
.stat-icon.success { background: #ecfdf5; color: #10b981; }

.stat-info p { margin: 0; font-size: 0.85rem; color: #64748b; font-weight: bold; }
.stat-info h3 { margin: 5px 0 0 0; font-size: 1.8rem; color: #1e293b; font-weight: 900; }
.unit { font-size: 0.9rem; color: #94a3b8; font-weight: normal; }

/* 表格主体容器 */
.table-wrapper { background: #fff; border-radius: 20px; padding: 24px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02); box-sizing: border-box; width: 100%; overflow-x: auto; }
.filter-bar { margin-bottom: 20px; }
.custom-search-btn { background: linear-gradient(135deg, #f97316, #ea580c); border: none; font-weight: bold; color: #fff; }
.custom-search-btn:hover { background: linear-gradient(135deg, #ea580c, #c2410c); color: #fff; }

.custom-table { border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
.order-sn { font-family: monospace; font-weight: bold; color: #334155; background: #f1f5f9; padding: 4px 8px; border-radius: 6px; }

/* 业务徽章样式 */
.biz-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 900; letter-spacing: 1px; }
.don-type { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
.req-type { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; }

.urgency-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 900; }
.urgency-badge.high { background: #fee2e2; color: #ef4444; animation: blink 2s infinite; }
.urgency-badge.normal { background: #f1f5f9; color: #64748b; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

.delivery-type { font-size: 0.8rem; font-weight: bold; padding: 4px 12px; border-radius: 12px; display: inline-block; }
.delivery-type.delivery { background: #eff6ff; color: #2563eb; }
.delivery-type.pickup { background: #ecfdf5; color: #059669; }

.detail-btn { color: #f97316; font-weight: bold; }
.detail-btn:hover { color: #ea580c; }
.pagination-container { margin-top: 24px; display: flex; justify-content: flex-end; }
:deep(.el-pagination.is-background .el-pager li.is-active) { background-color: #f97316 !important; color: #fff !important; }

/* 🚨 物资复合列高密度样式 */
.goods-info-cell { display: flex; flex-direction: column; gap: 6px; text-align: left; padding-left: 10px; }
.goods-main { display: flex; align-items: center; gap: 8px; }
.g-name { font-weight: 900; color: #1e293b; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }
.g-count { background: #fef2f2; color: #ef4444; padding: 2px 6px; border-radius: 8px; font-family: monospace; font-weight: 900; font-size: 0.8rem; border: 1px solid #fecaca; }
.custom-tag-cat { border-color: #cbd5e1 !important; color: #64748b !important; font-weight: bold; }
</style>