<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot" style="background: #f97316; box-shadow: 0 0 8px #f97316;"></span>
      审核中心 · 数据通道已加密
    </div>

    <div class="admin-wrapper" style="max-width: 1400px; width: 100%; margin: 0 auto;">
      <div class="flow-container">

        <header class="page-header">
          <h2>🛡️ 入驻资质审核</h2>
          <p>审核工作台 · 快捷键: Enter=通过 Backspace=驳回</p>
        </header>

        <div class="stats-header">
          <div class="stat-card" v-for="role in [1, 2, 3]" :key="role">
            <div class="stat-icon" :class="getRoleTheme(role)">{{ getRoleIcon(role) }}</div>
            <div class="stat-info">
              <p>{{ getRoleName(role) }}待审队列</p>
              <h3>{{ roleCounts[role] || 0 }} <span class="unit">人</span></h3>
            </div>
          </div>
        </div>

        <div class="table-wrapper" v-loading="loading">
          <div class="filter-bar">
            <div class="role-filter-tabs">
              <button v-for="tab in filterTabs" :key="tab.value"
                      :class="['filter-tab', { active: activeRoleFilter === tab.value }]"
                      @click="activeRoleFilter = tab.value">
                {{ tab.label }} <span class="tab-count">{{ tab.value === 'all' ? total : (roleCounts[tab.value] || 0) }}</span>
              </button>
            </div>
          </div>

          <el-table
              :data="filteredTableData"
              style="width: 100%"
              class="custom-table"
              :header-cell-style="{ background: '#f8fafc', color: '#475569', fontWeight: 'bold' }">

            <template #empty>
              <div class="empty-state">
                <span class="empty-icon">✅</span>
                <p>所有用户资质均已核验完毕</p>
                <span class="empty-sub">引擎正在实时监听新注册用户...</span>
              </div>
            </template>

            <el-table-column label="角色身份" width="120" align="center">
              <template #default="{ row }">
                <div class="biz-badge" :class="getRoleClass(row.role)">
                  {{ getRoleName(row.role) }}
                </div>
              </template>
            </el-table-column>

            <el-table-column prop="userId" label="入驻ID" width="100" align="center">
              <template #default="{ row }"><span class="order-sn">#{{ row.userId }}</span></template>
            </el-table-column>

            <el-table-column label="申请人画像" width="180">
              <template #default="{ row }">
                <div class="user-cell">
                  <div class="u-name">{{ row.username }}</div>
                  <div class="u-phone">{{ row.phone }}</div>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="审核清单" min-width="240">
              <template #default="{ row }">
                <div class="checklist">
                  <span :class="['check-item', 'clickable', row.identityProofUrl ? 'ok' : 'fail']"
                        @click.stop="row.identityProofUrl && openProofPreview(row.identityProofUrl)">
                    {{ row.identityProofUrl ? '✅' : '⬜' }}
                    凭证{{ row.identityProofUrl ? '已传 (点击查看)' : '未传' }}
                  </span>
                  <span :class="['check-item', row.currentLon ? 'ok' : 'fail']">
                    {{ row.currentLon ? '✅' : '⬜' }}
                    <template v-if="row.currentLon">
                      <template v-if="row.role === 1 && row.doorNumber">{{ row.doorNumber }}</template>
                      <template v-else-if="resolvedAddresses[row.userId]">{{ resolvedAddresses[row.userId] }}</template>
                      <template v-else>已定位</template>
                    </template>
                    <template v-else>坐标缺失</template>
                  </span>
                  <template v-if="row.role === 3">
                    <span :class="['check-item', row.vehicleType ? 'ok' : 'fail']">
                      {{ row.vehicleType ? '✅' : '⬜' }}
                      {{ formatVehicle(row.vehicleType) || '载具未设' }}
                    </span>
                  </template>
                  <template v-if="row.role === 2">
                    <span :class="['check-item', row.industryType ? 'ok' : 'fail']">
                      {{ row.industryType ? '✅' : '⬜' }}
                      {{ formatIndustry(row.industryType) || '业态未选' }}
                    </span>
                  </template>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="核验干预" width="110" align="center" fixed="right">
              <template #default="{ row }">
                <div class="action-btn-group">
                  <el-button size="small" type="success" plain @click.stop="quickPass(row)" :loading="submitting">
                    ✅ 通过
                  </el-button>
                  <el-button size="small" type="danger" plain @click.stop="openReject(row)">
                    ⛔ 驳回
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-container" v-if="total > 0">
            <el-pagination
                v-model:current-page="queryParams.pageNum"
                v-model:page-size="queryParams.pageSize"
                :page-sizes="[10, 20, 50]"
                :background="true"
                layout="total, sizes, prev, pager, next"
                :total="total"
                @size-change="fetchData"
                @current-change="fetchData"/>
          </div>
        </div>
      </div>

      <el-dialog v-model="proofPreviewVisible" title="🪪 资质凭证核验" width="600px" destroy-on-close center>
        <div style="text-align: center;">
          <el-image v-if="proofPreviewUrl" :src="proofPreviewUrl" :preview-src-list="[proofPreviewUrl]"
                    preview-teleported fit="contain" style="max-height: 450px; border-radius: 12px;" />
          <div v-else style="padding: 60px 0; color: #94a3b8; font-weight: bold;">该用户尚未上传资质凭证</div>
        </div>
      </el-dialog>

      <el-dialog v-model="rejectDialogVisible" title="⛔ 拦截驳回" width="440px" custom-class="dopamine-msg-box" destroy-on-close>
        <el-form label-position="top">
          <el-form-item label="请下发引擎阻断原因">
            <el-select v-model="rejectReason" style="width: 100%" size="large">
              <el-option label="📄 资质凭证模糊/不清晰" value="凭证模糊" />
              <el-option label="🏠 地址信息严重缺失" value="地址缺失" />
              <el-option label="📍 涉嫌虚拟定位或坐标异常" value="坐标异常" />
              <el-option label="🔄 历史信誉不良或信息矛盾" value="风险拦截" />
              <el-option label="📋 其他原因" value="其他" />
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="rejectDialogVisible = false" round>暂不处理</el-button>
          <el-button type="danger" @click="confirmReject" :loading="submitting" round>确认执行阻断</el-button>
        </template>
      </el-dialog>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AMapLoader from '@amap/amap-jsapi-loader'
import { getAuditPage, submitAudit } from '@/api/admin'

const loading = ref(false)
const submitting = ref(false)
const resolvedAddresses = reactive({})
let geocoder = null
const tableData = ref([])
const total = ref(0)
const queryParams = ref({ pageNum: 1, pageSize: 10 })

const proofPreviewVisible = ref(false)
const proofPreviewUrl = ref('')
const rejectDialogVisible = ref(false)
const rejectReason = ref('')
const currentRejectUser = ref(null)

const openProofPreview = (url) => {
  proofPreviewUrl.value = url
  proofPreviewVisible.value = true
}

// 筛选与统计
const activeRoleFilter = ref('all')
const filterTabs = [
  { label: '全局大盘', value: 'all' },
  { label: '受赠方', value: 1 },
  { label: '爱心商家', value: 2 },
  { label: '志愿者/骑士', value: 3 },
]

const roleCounts = computed(() => {
  const counts = {}
  tableData.value.forEach(r => { counts[r.role] = (counts[r.role] || 0) + 1 })
  return counts
})

const filteredTableData = computed(() =>
    activeRoleFilter.value === 'all' ? tableData.value : tableData.value.filter(r => r.role === activeRoleFilter.value)
)

// UI 映射工具函数 (参照 OrderFlow)
const getRoleTheme = (r) => ({ 1: 'database', 2: 'success', 3: 'dispatching' }[r] || 'database')
const getRoleClass = (r) => ({ 1: 'req-type', 2: 'don-type', 3: 'sos-type' }[r] || 'req-type')
const getRoleIcon = (r) => ({ 1: '👴', 2: '🏪', 3: '🚴' }[r] || '👤')
const getRoleName = (r) => ({ 1: '受赠方', 2: '爱心商家', 3: '志愿骑士' }[r] || '未知')

const formatVehicle = (type) => ({ 1: '🚶 步行', 2: '🚴 单车', 3: '🛵 电瓶车', 4: '🚗 汽车' }[type] || '未分配载具')
const formatIndustry = (type) => ({ 1: '餐饮生鲜', 2: '商超便利', 3: '医药器械', 4: '服饰百货' }[type] || '综合业态')
const initGeocoder = async () => {
  window._AMapSecurityConfig = { securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE }
  try {
    const AMap = await AMapLoader.load({ key: import.meta.env.VITE_AMAP_KEY, version: '2.0', plugins: ['AMap.Geocoder'] })
    geocoder = new AMap.Geocoder({ radius: 1000 })
  } catch (e) { console.warn('高德地理编码加载失败', e) }
}

const resolveUserAddress = (user) => {
  if (!geocoder || !user.currentLon || !user.currentLat || resolvedAddresses[user.userId]) return
  geocoder.getAddress([user.currentLon, user.currentLat], (status, result) => {
    if (status === 'complete' && result.info === 'OK') {
      resolvedAddresses[user.userId] = result.regeocode.formattedAddress
    } else {
      resolvedAddresses[user.userId] = '坐标已绑定（地址解析失败）'
    }
  })
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getAuditPage(queryParams.value)
    tableData.value = res.data.records || []
    total.value = res.data.total || 0
    // 逆地理编码：将坐标解析为人类可读地址
    tableData.value.forEach(user => resolveUserAddress(user))
  } catch (e) {
    ElMessage.error('引擎数据抓取失败')
  } finally {
    loading.value = false
  }
}

const quickPass = async (row) => {
  try {
    await ElMessageBox.confirm(
        `确认放行 [${row.username}]（${getRoleName(row.role)}）的入驻请求？`,
        '🚀 核验放行', { confirmButtonText: '确认通过', type: 'success' }
    )
    submitting.value = true
    await submitAudit(row.userId, true, row.deliveryType)
    ElMessage.success(`${row.username} 已下发通行权限`)
    fetchData()
  } catch (e) {} finally { submitting.value = false }
}

const openReject = (row) => {
  currentRejectUser.value = row
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

const confirmReject = async () => {
  if (!rejectReason.value) return ElMessage.warning('请选择阻断原因')
  const row = currentRejectUser.value
  submitting.value = true
  try {
    await submitAudit(row.userId, false)
    ElMessage.success(`拦截成功 (${rejectReason.value})`)
    rejectDialogVisible.value = false
    fetchData()
  } catch (e) { ElMessage.error('引擎交互失败') } finally { submitting.value = false }
}

const onAuditStatusChanged = () => setTimeout(fetchData, 300)

onMounted(async () => {
  await initGeocoder()
  fetchData()
  window.addEventListener('audit-status-changed', onAuditStatusChanged)
  window.addEventListener('refresh-orders', fetchData)
})

// keep-alive 激活时重新拉数据 + 重新注册（首次 onMounted 已注册，此处幂等）
onActivated(() => {
  fetchData()
  window.addEventListener('audit-status-changed', onAuditStatusChanged)
  window.addEventListener('refresh-orders', fetchData)
})

onDeactivated(() => {
  window.removeEventListener('audit-status-changed', onAuditStatusChanged)
  window.removeEventListener('refresh-orders', fetchData)
})

onUnmounted(() => {
  window.removeEventListener('audit-status-changed', onAuditStatusChanged)
  window.removeEventListener('refresh-orders', fetchData)
})
</script>

<style scoped>
/* ================= 全局容器 ================= */
.main-content {
  flex: 1; display: flex; flex-direction: column; position: relative;
  padding: 40px; background: #f1f5f9; overflow-y: auto; height: 100vh; box-sizing: border-box;
}
.top-status {
  position: absolute; top: 20px; right: 30px; z-index: 100;
  background: rgba(255,255,255,0.85); backdrop-filter: blur(12px);
  padding: 8px 18px; border-radius: 20px; font-size: 0.75rem; color: #64748b;
  display: flex; align-items: center; gap: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  border: 1px solid rgba(255,255,255,0.9);
}
.pulse-dot { animation: pulse-orange 2s infinite; border-radius: 50%; width: 8px; height: 8px; }
@keyframes pulse-orange {
  0%   { box-shadow: 0 0 0 0 rgba(249,115,22,0.5); }
  70%  { box-shadow: 0 0 0 7px rgba(249,115,22,0); }
  100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); }
}

.flow-container { padding: 0; background: transparent; width: 100%; overflow-x: hidden; }

/* ================= 页面标题 ================= */
.page-header { margin-bottom: 28px; }
.page-header h2 {
  color: #0f172a; font-size: 1.85rem; margin: 0 0 6px; font-weight: 900; letter-spacing: 0.5px;
}
.page-header p { color: #94a3b8; font-size: 0.85rem; margin: 0; font-weight: 600; letter-spacing: 0.3px; }

/* ================= 1. 顶部统计卡片 ================= */
.stats-header { display: flex; gap: 16px; margin-bottom: 20px; }

.stat-card {
  flex: 1; background: #fff; border-radius: 16px;
  padding: 20px 22px; display: flex; align-items: center; gap: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03);
  border: 1px solid #e8edf2;
  border-left: 4px solid transparent;
  transition: transform 0.22s ease, box-shadow 0.22s ease;
  position: relative; overflow: hidden;
}
.stat-card::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0) 60%, rgba(248,250,252,0.8));
  pointer-events: none;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.07); }

/* 角色主题色 —— 左边框区分 */
.stat-card:nth-child(1) { border-left-color: #10b981; }
.stat-card:nth-child(2) { border-left-color: #3b82f6; }
.stat-card:nth-child(3) { border-left-color: #8b5cf6; }

.stat-icon {
  width: 48px; height: 48px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; flex-shrink: 0;
}
.stat-icon.database    { background: #f0fdf4; }
.stat-icon.success     { background: #eff6ff; }
.stat-icon.dispatching { background: #f5f3ff; }

.stat-info p { margin: 0; font-size: 0.78rem; color: #94a3b8; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
.stat-info h3 { margin: 4px 0 0; font-size: 2rem; color: #0f172a; font-weight: 900; line-height: 1; }
.unit { font-size: 0.85rem; color: #cbd5e1; font-weight: 500; margin-left: 2px; }

/* ================= 2. 表格容器 ================= */
.table-wrapper {
  background: #fff; border-radius: 16px;
  padding: 20px 24px 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03);
  border: 1px solid #e8edf2;
  box-sizing: border-box; width: 100%; overflow-x: auto;
}

/* ================= 筛选 Tab ================= */
.filter-bar { margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid #f1f5f9; }
.role-filter-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.filter-tab {
  padding: 6px 16px; border-radius: 8px; font-size: 0.83rem; font-weight: 700;
  cursor: pointer; border: 1.5px solid #e2e8f0; color: #64748b;
  background: #f8fafc; transition: all 0.18s;
  display: flex; align-items: center; gap: 7px; white-space: nowrap;
}
.filter-tab.active {
  background: #fff7ed; color: #c2410c; border-color: #fb923c;
  box-shadow: 0 2px 8px rgba(234,88,12,0.12);
}
.filter-tab:hover:not(.active) { border-color: #cbd5e1; background: #f1f5f9; color: #334155; }
.tab-count {
  background: #e2e8f0; color: #64748b;
  padding: 1px 7px; border-radius: 6px; font-size: 0.72rem; font-weight: 800;
}
.filter-tab.active .tab-count { background: #ea580c; color: #fff; }

/* ================= 表格主体 ================= */
.custom-table { border-radius: 10px; overflow: hidden; border: 1px solid #e8edf2; }

/* 修复：补上水平 padding，行高更舒适 */
:deep(.custom-table td.el-table__cell) {
  padding: 14px 16px !important;
  border-bottom: 1px solid #f1f5f9 !important;
  vertical-align: middle;
}
:deep(.custom-table th.el-table__cell) {
  padding: 12px 16px !important;
  font-size: 0.78rem !important;
  letter-spacing: 0.5px;
}
:deep(.custom-table .el-table__row:hover > td) { background: #fafbfc !important; }
:deep(.custom-table .el-table__header-wrapper) { border-bottom: 2px solid #e8edf2; }

/* ID 字段 */
.order-sn {
  font-family: 'SF Mono', 'Fira Code', monospace; font-weight: 700;
  color: #475569; background: #f1f5f9;
  padding: 3px 9px; border-radius: 6px; font-size: 0.82rem;
  border: 1px solid #e2e8f0;
  white-space: nowrap;
}

/* 申请人信息 */
.user-cell { display: flex; flex-direction: column; gap: 3px; }
.u-name { font-weight: 800; color: #0f172a; font-size: 0.92rem; }
.u-phone {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.78rem; color: #94a3b8; font-weight: 600;
  letter-spacing: 0.3px;
}

/* 角色徽章 */
.biz-badge {
  display: inline-block; padding: 4px 11px; border-radius: 8px;
  font-size: 0.75rem; font-weight: 800; letter-spacing: 0.5px; white-space: nowrap;
}
.req-type { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
.don-type { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.sos-type { background: #faf5ff; color: #7c3aed; border: 1px solid #ddd6fe; }

/* 审核清单 */
.checklist { display: flex; flex-direction: column; gap: 6px; }
.check-item {
  font-size: 0.8rem; font-weight: 700;
  padding: 4px 10px; border-radius: 6px;
  display: inline-flex; align-items: flex-start; gap: 5px;
  white-space: normal; word-break: break-all;
  width: fit-content; max-width: 100%;
  line-height: 1.4;
}
.check-item.ok { color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; }
.check-item.fail { color: #b91c1c; background: #fff1f2; border: 1px solid #fecdd3; }
.check-item.ok.clickable { cursor: pointer; transition: all 0.15s; }
.check-item.ok.clickable:hover { background: #15803d; color: #fff; border-color: #15803d; }

/* 操作按钮 */
.action-btn-group {
  display: flex; flex-direction: column; gap: 6px; align-items: center;
}
.action-btn-group :deep(.el-button) {
  font-weight: 700; border-radius: 7px;
  width: 88px; font-size: 0.78rem;
  padding: 5px 0 !important;
}

/* 分页 */
.pagination-container { margin-top: 20px; display: flex; justify-content: flex-end; }
:deep(.el-pagination.is-background .el-pager li.is-active) {
  background-color: #ea580c !important; color: #fff !important; border-radius: 7px;
}
:deep(.el-pagination.is-background .el-pager li:not(.is-active):hover) { color: #ea580c !important; }

/* 空状态 */
.empty-state { padding: 60px 0; text-align: center; }
.empty-icon { font-size: 3rem; display: block; margin-bottom: 14px; }
.empty-state p { margin: 0 0 6px; font-size: 1rem; font-weight: 900; color: #1e293b; }
.empty-sub { font-size: 0.82rem; color: #94a3b8; font-weight: 600; }
</style>

<!-- 全局样式（Dialog 圆角等 Element Plus 穿透） -->
<style>
.dopamine-msg-box {
  border-radius: 18px !important;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.1) !important;
  border: 1px solid #f1f5f9 !important;
  font-family: inherit !important;
}
.dopamine-msg-box .el-message-box__title { font-weight: 900 !important; font-size: 1.2rem !important; color: #1e293b !important; }
.dopamine-msg-box .el-message-box__content { font-size: 0.95rem !important; color: #475569 !important; margin-top: 8px !important; }
.dopamine-msg-box .el-button { border-radius: 10px !important; font-weight: 800 !important; padding: 9px 20px !important; }
</style>