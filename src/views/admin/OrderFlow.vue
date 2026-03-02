<template>
  <div class="flow-container">
    <div class="stats-header">
      <div class="stat-card">
        <div class="stat-icon emergency">🚨</div>
        <div class="stat-info">
          <p>待匹配异常单</p>
          <h3>{{ tableData.filter(d => d.status === 0).length || 0 }}</h3>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon dispatching">🚴</div>
        <div class="stat-info">
          <p>全城调度中</p>
          <h3>{{ tableData.filter(d => d.status === 1).length || 0 }}</h3>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon success">✅</div>
        <div class="stat-info">
          <p>今日已送达</p>
          <h3>{{ tableData.filter(d => d.status === 2).length || 0 }}</h3>
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
        <el-table-column prop="orderSn" label="调度单号" min-width="160" align="center">
          <template #default="scope">
            <span class="order-sn">{{ scope.row.orderSn }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="requiredCategory" label="需求物资" min-width="120" align="center">
          <template #default="scope">
            <el-tag size="small" effect="plain" type="warning" class="custom-tag-orange">
              {{ scope.row.requiredCategory }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="紧急度" min-width="100" align="center">
          <template #default="scope">
            <span :class="['urgency-badge', scope.row.urgencyLevel >= 8 ? 'high' : 'normal']">
              Lv.{{ scope.row.urgencyLevel }}
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="deliveryMethod" label="履约模式" min-width="130" align="center">
          <template #default="scope">
            <div class="delivery-type" :class="scope.row.deliveryMethod === 2 ? 'pickup' : 'delivery'">
              {{ scope.row.deliveryMethod === 2 ? '🚶 居民自提' : '🚴 志愿配送' }}
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="实时状态" min-width="120" align="center">
          <template #default="scope">
            <el-tag v-if="scope.row.status === 0" type="danger" effect="light">🔴 待匹配</el-tag>
            <el-tag v-else-if="scope.row.status === 1" type="primary" effect="light">🔵 调度中</el-tag>
            <el-tag v-else-if="scope.row.status === 2" type="success" effect="light">🟢 已送达</el-tag>
            <el-tag v-else type="info" effect="light">⚫ 已取消</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="createTime" label="时间轴" min-width="170" align="center" />

        <el-table-column label="指挥中心干预" width="180" fixed="right" align="center">
          <template #default="scope">
            <el-button
                v-if="scope.row.status === 0 || scope.row.status === 1"
                link
                type="danger"
                size="small"
                @click="handleCancel(scope.row)"
            >
              强行取消
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

    <el-dialog v-model="traceVisible" :title="`📦 订单轨迹追踪: ${currentTraceOrder?.orderSn}`" width="500px">
      <div style="padding: 10px 20px;">
        <el-timeline>
          <el-timeline-item timestamp="刚刚" placement="top" type="primary" size="large" :hollow="true">
            <h4>当前状态：{{ getStatusText(currentTraceOrder?.status) }}</h4>
            <p v-if="currentTraceOrder?.status === 1">系统正在通过高德 LBS 监控骑手位置...</p>
          </el-timeline-item>
          <el-timeline-item :timestamp="currentTraceOrder?.createTime" placement="top" type="success">
            <h4>调度引擎已接管</h4>
            <p>订单已生成，成功分配至周边最近物资据点</p>
          </el-timeline-item>
          <el-timeline-item :timestamp="currentTraceOrder?.createTime" placement="top" color="#f97316">
            <h4>受赠方发起紧急求助</h4>
            <p>需求物资：{{ currentTraceOrder?.requiredCategory }} (紧急度 Lv.{{ currentTraceOrder?.urgencyLevel }})</p>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

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

// 🚨 将所有的 Mock 数据提取出来作为全局数据源
const allMockData = reactive([
  { orderId: 1, orderSn: 'REQ20260301A001', requiredCategory: '医疗用品', urgencyLevel: 9, deliveryMethod: 1, status: 0, createTime: '2026-03-01 14:20:00' },
  { orderId: 2, orderSn: 'REQ20260301B022', requiredCategory: '米面粮油', urgencyLevel: 5, deliveryMethod: 2, status: 1, createTime: '2026-03-01 13:15:22' },
  { orderId: 3, orderSn: 'REQ20260301C033', requiredCategory: '应急食品', urgencyLevel: 4, deliveryMethod: 1, status: 2, createTime: '2026-03-01 09:10:05' },
  { orderId: 4, orderSn: 'ORD20260301D044', requiredCategory: '应急装备', urgencyLevel: 10, deliveryMethod: 1, status: 3, createTime: '2026-02-28 23:55:10' },
  { orderId: 5, orderSn: 'REQ20260302E055', requiredCategory: '饮用水', urgencyLevel: 8, deliveryMethod: 1, status: 1, createTime: '2026-03-02 08:30:00' },
])

// 模拟获取数据，并包含强大的【前端数据过滤】逻辑
const fetchData = async () => {
  loading.value = true
  try {
    setTimeout(() => {
      // 1. 根据查询条件进行数据过滤
      let filteredData = allMockData.filter(item => {
        let match = true
        // 模糊搜索单号
        if (queryParams.orderSn && !item.orderSn.includes(queryParams.orderSn)) match = false
        // 精确匹配状态
        if (queryParams.status !== null && queryParams.status !== '' && item.status !== queryParams.status) match = false
        // 精确匹配履约模式
        if (queryParams.deliveryMethod !== null && queryParams.deliveryMethod !== '' && item.deliveryMethod !== queryParams.deliveryMethod) match = false
        return match
      })

      // 2. 赋值给表格展示
      tableData.value = filteredData
      total.value = filteredData.length
      loading.value = false
    }, 400) // 模拟 400ms 的网络加载延迟
  } catch (error) {
    ElMessage.error('获取订单数据失败')
    loading.value = false
  }
}

// 搜索按钮触发
const handleSearch = () => {
  queryParams.pageNum = 1
  fetchData()
}

// 重置按钮触发
const resetQuery = () => {
  queryParams.orderSn = ''
  queryParams.status = null
  queryParams.deliveryMethod = null
  handleSearch()
}

// 强行取消操作
const handleCancel = (row) => {
  ElMessageBox.confirm(`此操作将强制撤销订单 ${row.orderSn}，是否继续？`, '⚠️ 异常干预警告', {
    confirmButtonText: '强制撤销',
    cancelButtonText: '取消',
    type: 'error',
  }).then(() => {
    // 真实修改本地 Mock 数据的状态
    const target = allMockData.find(d => d.orderId === row.orderId)
    if (target) {
      target.status = 3 // 变更为已取消状态
      fetchData() // 重新过滤并刷新表格
      ElMessage.success('订单已强制取消，运力已被释放！')
    }
  }).catch(() => {})
}

// 轨迹追溯操作
const handleTrace = (row) => {
  currentTraceOrder.value = row
  traceVisible.value = true
}

// 状态文本转换工具
const getStatusText = (status) => {
  const map = { 0: '🔴 待匹配异常', 1: '🔵 运送调度中', 2: '🟢 已顺利送达', 3: '⚫ 已强制取消' }
  return map[status] || '未知状态'
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.flow-container {
  padding: 24px;
  background-color: #f1f5f9;
  min-height: calc(100vh - 60px);
  /* 确保内边距不会撑爆屏幕 */
  box-sizing: border-box;
  width: 100%;
  overflow-x: hidden;
}

/* 顶部数据统计卡片 */
.stats-header {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
}
.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 20px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
  transition: transform 0.3s;
}
.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
}
.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}
.stat-icon.emergency { background: #fef2f2; color: #ef4444; }
.stat-icon.dispatching { background: #eff6ff; color: #3b82f6; }
.stat-icon.success { background: #ecfdf5; color: #10b981; }

.stat-info p {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
  font-weight: bold;
}
.stat-info h3 {
  margin: 5px 0 0 0;
  font-size: 1.8rem;
  color: #1e293b;
  font-weight: 900;
}

/* 表格主体容器 */
.table-wrapper {
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
  /* 确保表格容器不溢出外层，并且允许内部自适应滚动 */
  box-sizing: border-box;
  width: 100%;
  overflow-x: auto;
}

/* 搜索栏美化 */
.filter-bar {
  margin-bottom: 20px;
}
.custom-search-btn {
  background: linear-gradient(135deg, #f97316, #ea580c);
  border: none;
  font-weight: bold;
  color: #fff;
}
.custom-search-btn:hover {
  background: linear-gradient(135deg, #ea580c, #c2410c);
  color: #fff;
}

/* 表格样式美化 */
.custom-table {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}
.order-sn {
  font-family: monospace;
  font-weight: bold;
  color: #334155;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 6px;
}

/* 自定义 Orange Tag */
.custom-tag-orange {
  color: #ea580c !important;
  background: #fff7ed !important;
  border-color: #fdba74 !important;
  font-weight: bold;
}

/* 紧急度徽章 */
.urgency-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 900;
}
.urgency-badge.high { background: #fee2e2; color: #ef4444; }
.urgency-badge.normal { background: #f1f5f9; color: #64748b; }

/* 配送方式胶囊 */
.delivery-type {
  font-size: 0.8rem;
  font-weight: bold;
  padding: 4px 12px;
  border-radius: 12px;
  display: inline-block;
}
.delivery-type.delivery { background: #eff6ff; color: #2563eb; }
.delivery-type.pickup { background: #ecfdf5; color: #059669; }

.detail-btn {
  color: #f97316;
  font-weight: bold;
}
.detail-btn:hover {
  color: #ea580c;
}

/* 分页条美化 */
.pagination-container {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}
:deep(.el-pagination.is-background .el-pager li.is-active) {
  background-color: #f97316 !important;
  color: #fff !important;
}
</style>