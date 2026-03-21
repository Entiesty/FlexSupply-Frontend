<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot" style="background: #3b82f6; box-shadow: 0 0 8px #3b82f6;"></span>
      全局物资流转追踪中心 · 数据通道已加密
    </div>

    <div class="admin-wrapper" style="max-width: 1400px; width: 100%; margin: 0 auto;">
      <div class="flow-container" style="padding: 0; min-height: auto; background: transparent;">

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
              <p>当前页面已闭环</p>
              <h3>{{ tableData.filter(d => d.status === 3).length }} <span class="unit">单</span></h3>
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
                <el-select v-model="queryParams.status" placeholder="全部状态" clearable style="width: 160px">
                  <el-option label="0-待匹配/待取货" :value="0" />
                  <el-option label="1-流转中/运送中" :value="1" />
                  <el-option label="2-已送达/已入库" :value="2" />
                  <el-option label="3-履约完结/已发完" :value="3" />
                  <el-option label="4-强制取消/商家自送" :value="4" />
                </el-select>
              </el-form-item>
              <el-form-item label="履约模式">
                <el-select v-model="queryParams.deliveryMethod" placeholder="全部模式" clearable style="width: 140px">
                  <el-option label="志愿者配送" :value="1" />
                  <el-option label="居民自提/商家自送" :value="2" />
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
                <div class="biz-badge" :class="getBizClass(scope.row.orderSn)">
                  {{ getBizText(scope.row.orderSn) }}
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

            <el-table-column label="紧急度" min-width="110" align="center">
              <template #default="scope">
                <div v-if="scope.row.orderSn.startsWith('DON')" class="urgency-badge don-tag">
                  [-] 捐赠入库
                </div>
                <div v-else-if="scope.row.orderSn.startsWith('REQ')" class="urgency-badge normal">
                  [Lv.{{ scope.row.urgencyLevel }}] 常规
                </div>
                <div v-else class="urgency-badge high">
                  [Lv.{{ scope.row.urgencyLevel }}] 紧急
                </div>
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
                <template v-if="scope.row.orderSn.startsWith('DON')">
                  <el-tag v-if="scope.row.status === 0" type="danger" effect="light">🟡 待取货在店</el-tag>
                  <el-tag v-else-if="scope.row.status === 1" type="primary" effect="light">🔵 干线运送中</el-tag>
                  <el-tag v-else-if="scope.row.status === 2" type="success" effect="light" style="color: #059669; background: #d1fae5; border-color: #a7f3d0;">
                    🟢 已抵达入库
                  </el-tag>
                  <el-tag v-else-if="scope.row.status === 3" type="success" effect="dark" style="background-color: #10b981; border-color: #10b981;">
                    🟢 物资已发完
                  </el-tag>
                  <el-tag v-else-if="scope.row.status === 4" type="warning" effect="light">🟣 商家自送中</el-tag>
                  <el-tag v-else type="info" effect="light">⚫ 捐赠已取消</el-tag>
                </template>

                <template v-else>
                  <el-tag v-if="scope.row.status === 0" type="danger" effect="light">🟡 待匹配运力</el-tag>
                  <el-tag v-else-if="scope.row.status === 1" type="primary" effect="light">
                    {{ scope.row.deliveryMethod === 2 ? '🔵 待线下提货' : '🔵 调度流转中' }}
                  </el-tag>
                  <el-tag v-else-if="scope.row.status === 2" type="warning" effect="dark" style="background-color: #f59e0b; border-color: #f59e0b;">
                    🟠 已送达待评
                  </el-tag>
                  <el-tag v-else-if="scope.row.status === 3" type="success" effect="dark" style="background-color: #10b981; border-color: #10b981;">
                    🟢 履约已完结
                  </el-tag>
                  <el-tag v-else-if="scope.row.status === 4" type="info" effect="dark">⚫ 已强制取消</el-tag>
                  <el-tag v-else type="info" effect="light">⚫ 未知状态</el-tag>
                </template>
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
                <span class="value">{{ currentTraceOrder?.deliveryMethod === 2 ? '🚶 居民自提/自送' : '🚴 志愿配送' }}</span>
              </div>
            </div>

            <el-timeline class="custom-timeline">
              <el-timeline-item :timestamp="currentTraceOrder?.createTime" color="#3b82f6" size="large">
                <h4 class="tl-title">
                  {{ currentTraceOrder?.orderSn?.startsWith('DON') ? '🏪 爱心商家发起捐赠入库' :
                    (currentTraceOrder?.orderSn?.startsWith('SOS') ? '🚨 弱势群体发起紧急呼救' : '👴 普通市民发起日常申领') }}
                </h4>
                <p class="tl-desc">调度中枢已成功捕获需求单号正式落库</p>
              </el-timeline-item>

              <el-timeline-item v-if="currentTraceOrder?.status === 4 && !currentTraceOrder?.orderSn?.startsWith('DON')" color="#ef4444" size="large">
                <h4 class="tl-title error-text">🚨 订单已被指挥中心强制终止</h4>
                <p class="tl-desc">运力已释放且本次调度任务永久关闭</p>
              </el-timeline-item>

              <template v-else>
                <template v-if="currentTraceOrder?.orderSn?.startsWith('DON')">
                  <el-timeline-item v-if="currentTraceOrder?.status === 4" color="#f97316" size="large">
                    <h4 class="tl-title">🚗 商家自送流转中</h4>
                    <p class="tl-desc">商家正在亲自护送物资前往据点入库</p>
                  </el-timeline-item>
                  <el-timeline-item v-else-if="currentTraceOrder?.status >= 1" color="#3b82f6" size="large">
                    <h4 class="tl-title">🚴 干线运输进行中</h4>
                    <p class="tl-desc">骑士已接单并正前往社区分发中心</p>
                  </el-timeline-item>

                  <el-timeline-item :color="currentTraceOrder?.status >= 2 ? '#10b981' : '#e2e8f0'" :hollow="currentTraceOrder?.status < 2" size="large">
                    <h4 class="tl-title" :class="{'pending-text': currentTraceOrder?.status < 2}">
                      {{ currentTraceOrder?.status >= 2 ? '🏥 物资已入库驿站' : '⏳ 系统正等待物资入库' }}
                    </h4>
                    <p class="tl-desc" v-if="currentTraceOrder?.status >= 2">物资已安全存入分发中心等待市民申领</p>
                  </el-timeline-item>

                  <el-timeline-item :color="currentTraceOrder?.status === 3 ? '#10b981' : '#e2e8f0'" :hollow="currentTraceOrder?.status < 3" size="large">
                    <h4 class="tl-title" :class="{'pending-text': currentTraceOrder?.status < 3}">
                      {{ currentTraceOrder?.status === 3 ? '🟢 物资已全部分发完毕' : '⏳ 系统正等待物资消耗流转' }}
                    </h4>
                  </el-timeline-item>
                </template>

                <template v-else>
                  <el-timeline-item color="#10b981">
                    <h4 class="tl-title">🧠 引擎智能分拨完成</h4>
                    <p class="tl-desc">已自动测算 LBS 空间距离并就近锁定资源据点</p>
                  </el-timeline-item>

                  <el-timeline-item v-if="currentTraceOrder?.deliveryMethod === 1"
                                    :color="currentTraceOrder?.status >= 1 ? '#f97316' : '#e2e8f0'"
                                    :hollow="currentTraceOrder?.status < 1">
                    <h4 class="tl-title" :class="{'pending-text': currentTraceOrder?.status < 1}">
                      {{ currentTraceOrder?.status >= 1 ? '⚡ 志愿者已接单响应' : '⏳ 雷达广播正呼叫周边运力' }}
                    </h4>
                    <p class="tl-desc" v-if="currentTraceOrder?.status >= 1">护航者正按照最优导航路线派送物资</p>
                  </el-timeline-item>

                  <el-timeline-item :color="currentTraceOrder?.status >= 2 ? '#10b981' : '#e2e8f0'"
                                    :hollow="currentTraceOrder?.status < 2"
                                    size="large">
                    <h4 class="tl-title" :class="{'pending-text': currentTraceOrder?.status < 2}">
                      {{ currentTraceOrder?.status >= 2 ? '✅ 物资已安全送达' : '⏳ 履约端正等待最终物理核销' }}
                    </h4>
                    <p class="tl-desc" v-if="currentTraceOrder?.status >= 2">
                      {{ currentTraceOrder?.status === 3 ? '物理交接完成且受助市民已评价，履约完美闭环' : '物理交接完成，正等待受助市民评价闭环' }}
                    </p>
                  </el-timeline-item>
                </template>
              </template>

            </el-timeline>
          </div>
        </el-dialog>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
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

// 获取业务线配色 class
const getBizClass = (sn) => {
  if (!sn) return 'req-type'
  if (sn.startsWith('DON')) return 'don-type'
  if (sn.startsWith('SOS')) return 'sos-type'
  return 'req-type'
}

// 获取业务线文字
const getBizText = (sn) => {
  if (!sn) return '🟢 日常申领'
  if (sn.startsWith('DON')) return '🔵 捐赠入库'
  if (sn.startsWith('SOS')) return '🔴 紧急呼救'
  return '🟢 日常申领'
}

// ========================================================
// 🎧 事件总线监听：响应全局 WebSocket 的刷新指令
// ========================================================
onMounted(() => {
  fetchData()
  // 一旦 App.vue 收到新订单广播并抛出该事件，立刻触发 fetchData 刷新表格数据
  window.addEventListener('refresh-orders', fetchData)
})

onBeforeUnmount(() => {
  // 离开页面时注销监听器，防止内存泄漏与重复触发
  window.removeEventListener('refresh-orders', fetchData)
})
</script>

<style scoped>
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 40px; background: #f1f5f9; overflow-y: auto; height: 100vh; box-sizing: border-box;}
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); }
.pulse-dot { animation: pulse-blue 2s infinite; border-radius: 50%; width: 8px; height: 8px; }
@keyframes pulse-blue { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }

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

/* 业务徽章样式 (三线隔离) */
.biz-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 900; letter-spacing: 1px; }
.don-type { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
.req-type { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
.sos-type { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; box-shadow: 0 0 8px rgba(239, 68, 68, 0.2);}

/* 紧急度统一标牌 */
.urgency-badge { display: inline-block; padding: 4px 10px; border-radius: 10px; font-size: 0.8rem; font-weight: 900; }
.urgency-badge.high { background: #fee2e2; color: #ef4444; animation: blink 2s infinite; border: 1px solid #fca5a5;}
.urgency-badge.normal { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;}
.urgency-badge.don-tag { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; font-weight: bold;}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }

.delivery-type { font-size: 0.8rem; font-weight: bold; padding: 4px 12px; border-radius: 12px; display: inline-block; }
.delivery-type.delivery { background: #eff6ff; color: #2563eb; }
.delivery-type.pickup { background: #ecfdf5; color: #059669; }

.detail-btn { color: #f97316; font-weight: bold; }
.detail-btn:hover { color: #ea580c; }
.pagination-container { margin-top: 24px; display: flex; justify-content: flex-end; }
:deep(.el-pagination.is-background .el-pager li.is-active) { background-color: #f97316 !important; color: #fff !important; }

.goods-info-cell { display: flex; flex-direction: column; gap: 6px; text-align: left; padding-left: 10px; }
.goods-main { display: flex; align-items: center; gap: 8px; }
.g-name { font-weight: 900; color: #1e293b; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }
.g-count { background: #fef2f2; color: #ef4444; padding: 2px 6px; border-radius: 8px; font-family: monospace; font-weight: 900; font-size: 0.8rem; border: 1px solid #fecaca; }
.custom-tag-cat { border-color: #cbd5e1 !important; color: #64748b !important; font-weight: bold; }

/* ================= 轨迹溯源弹窗专属 UI ================= */
.trace-container { padding: 0 5px; }
.trace-summary { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 20px; margin-bottom: 30px; display: flex; flex-direction: column; gap: 12px; }
.summary-item { display: flex; align-items: center; font-size: 0.95rem; }
.summary-item .label { color: #64748b; width: 80px; font-weight: bold;}
.summary-item .goods-name { font-weight: 900; color: #1e293b; font-size: 1.15rem; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 12px;}
.summary-item .goods-count { background: #fff7ed; color: #ea580c; padding: 4px 10px; border-radius: 8px; font-weight: 900; border: 1px solid #fdba74; }

.custom-timeline { padding-left: 10px; margin-top: 10px;}
.tl-title { margin: 0 0 6px 0; font-size: 1.1rem; color: #1e293b; font-weight: 900; }
.tl-desc { margin: 0; font-size: 0.9rem; color: #64748b; line-height: 1.5; font-weight: bold;}
.pending-text { color: #94a3b8 !important; }
.error-text { color: #ef4444; }

:deep(.el-timeline-item__node--large) { width: 16px; height: 16px; left: -2px; }
:deep(.el-timeline-item__wrapper) { padding-left: 28px; top: -4px; }
:deep(.el-dialog__header) { padding: 20px 25px; border-bottom: 1px solid #f1f5f9;}
:deep(.el-dialog__title) { font-weight: 900; color: #1e293b; }
</style>