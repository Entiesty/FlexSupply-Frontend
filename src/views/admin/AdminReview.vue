<template>
  <main class="main-content" @keydown="handleHotkey" tabindex="0">
    <div class="top-status">
      <span class="pulse-dot" style="background: #f97316; box-shadow: 0 0 8px #f97316;"></span>
      平台高权限核验引擎运行中 · 数据通道已加密
    </div>

    <div class="admin-wrapper" style="max-width: 1400px; width: 100%; margin: 0 auto;">
      <div class="flow-container">

        <header class="page-header">
          <h2>🛡️ 资质风控与核验中心</h2>
          <p>基于信誉分与多维画像的一站式核验工作台 · 快捷键: Enter=通过 Backspace=驳回</p>
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
              highlight-current-row
              @row-click="openDrawer"
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

            <el-table-column label="申请人画像" min-width="160">
              <template #default="{ row }">
                <div class="user-cell">
                  <div class="u-name">{{ row.username }}</div>
                  <div class="u-phone">{{ row.phone }}</div>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="信誉/风险指标 (系统判定)" min-width="220">
              <template #default="{ row }">
                <div class="summary-row">
                  <span class="urgency-badge" :class="row.credit_score >= 80 ? 'normal' : 'high'">
                    {{ row.credit_score >= 80 ? '🟢' : '🔴' }} 信誉分: {{ row.credit_score || 100 }}
                  </span>

                  <span v-if="row.role === 1 && row.health_remark" class="urgency-badge high">
                    ⚠ {{ row.health_remark.substring(0, 8) }}...
                  </span>
                  <span v-else-if="row.role === 2" class="urgency-badge don-tag">
                    {{ formatIndustry(row.industryType) }}
                  </span>
                  <span v-else-if="row.role === 3" class="urgency-badge don-tag">
                    {{ formatVehicle(row.vehicleType) }}
                  </span>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="LBS 坐标" width="100" align="center">
              <template #default="{ row }">
                <span v-if="row.currentLon" style="color: #10b981; font-weight: bold;">📍 已绑定</span>
                <span v-else style="color: #ef4444; font-weight: bold;">⚠ 缺失</span>
              </template>
            </el-table-column>

            <el-table-column label="资质凭证" width="100" align="center">
              <template #default="{ row }">
                <span v-if="row.identityProofUrl" class="has-proof">📄 已传</span>
                <span v-else class="no-proof">✗ 缺失</span>
              </template>
            </el-table-column>

            <el-table-column label="核验干预" width="160" align="center" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" class="detail-btn" @click.stop="quickPass(row)">
                  🚀 快速通过
                </el-button>
                <el-button link type="danger" size="small" @click.stop="openReject(row)">
                  驳回
                </el-button>
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

      <el-drawer v-model="drawerVisible" size="550px" custom-class="trace-dialog" destroy-on-close>
        <template #header>
          <div class="drawer-header-custom" v-if="currentAuditUser">
            <div class="stat-icon" :class="getRoleTheme(currentAuditUser.role)">{{ getRoleIcon(currentAuditUser.role) }}</div>
            <div class="dh-meta">
              <div class="dh-name">{{ currentAuditUser.username }}</div>
              <div class="dh-sub">📱 {{ currentAuditUser.phone }} | ID: #{{ currentAuditUser.userId }}</div>
            </div>
            <div class="biz-badge" :class="getRoleClass(currentAuditUser.role)">{{ getRoleName(currentAuditUser.role) }}</div>
          </div>
        </template>

        <template v-if="currentAuditUser">
          <div class="trace-container">
            <div class="trace-summary">
              <div class="summary-item">
                <span class="label">引擎信誉评级：</span>
                <span class="value goods-name" :style="{ color: currentAuditUser.credit_score >= 80 ? '#10b981' : '#ef4444' }">
                  {{ currentAuditUser.credit_score || 100 }} 分
                </span>
              </div>

              <div class="summary-item" v-if="currentAuditUser.role === 3">
                <span class="label">平台时间币：</span>
                <span class="value goods-count">🪙 {{ currentAuditUser.time_coin || 0 }} 枚</span>
                <span class="label" style="margin-left: 15px;">累计里程：</span>
                <span class="value goods-count">🚴 {{ currentAuditUser.total_mileage || 0 }} km</span>
              </div>

              <div class="summary-item" v-if="currentAuditUser.role === 2">
                <span class="label">CSR 等级：</span>
                <span class="value goods-count">⭐ Lv.{{ currentAuditUser.csr_level || 0 }}</span>
                <span class="label" style="margin-left: 15px;">累计捐赠：</span>
                <span class="value goods-count">📦 {{ currentAuditUser.total_donations || 0 }} 笔</span>
              </div>
            </div>

            <el-timeline class="custom-timeline">
              <el-timeline-item v-if="currentAuditUser.role === 1" color="#ef4444" size="large">
                <h4 class="tl-title">🚨 履约与健康风险画像</h4>
                <p class="tl-desc">
                  <strong>健康备注：</strong><span :class="{'error-text': currentAuditUser.health_remark}">{{ currentAuditUser.health_remark || '无特殊情况' }}</span><br/>
                  <strong>紧急联系：</strong>{{ currentAuditUser.emergency_phone || '未预留' }}<br/>
                  <strong>配送门牌：</strong>{{ currentAuditUser.doorNumber || '未填写详细门牌' }}
                </p>
              </el-timeline-item>

              <el-timeline-item color="#3b82f6" size="large">
                <h4 class="tl-title">🪪 资质凭证核验</h4>
                <div class="proof-viewer">
                  <el-image v-if="currentAuditUser.identityProofUrl"
                            :src="currentAuditUser.identityProofUrl"
                            :preview-src-list="[currentAuditUser.identityProofUrl]"
                            preview-teleported fit="contain" class="proof-large" />
                  <div v-else class="no-proof-large">⚠ 引擎未捕获到该用户的资质影像凭证</div>
                </div>
              </el-timeline-item>

              <el-timeline-item v-if="currentAuditUser.role === 1" color="#f97316" size="large">
                <h4 class="tl-title">⚙️ 平台决策与赋权参数</h4>
                <div style="margin-top: 10px; padding-right: 15px;">
                  <el-form :model="auditForm" label-position="top">
                    <el-form-item label="强制关怀标签 (影响调度引擎权重)">
                      <el-select v-model="auditForm.userTag" style="width: 100%">
                        <el-option label="🟢 普通求助者 (权重基数)" value="NORMAL" />
                        <el-option label="👴 需照顾老人 (高调度优先级)" value="ELDERLY" />
                        <el-option label="👩‍🦽 残障行动不便 (极高调度优先级)" value="DISABLED" />
                        <el-option label="🧹 环卫/特种工人 (常规补偿)" value="SAN_WORKER" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="基准履约模式">
                      <el-radio-group v-model="auditForm.deliveryType">
                        <el-radio :value="0" border>🏪 可自取</el-radio>
                        <el-radio :value="1" border>🚪 仅限上门</el-radio>
                      </el-radio-group>
                    </el-form-item>
                  </el-form>
                </div>
              </el-timeline-item>
            </el-timeline>

            <div class="drawer-actions">
              <el-button type="primary" size="large" class="btn-pass-final" @click="handlePassInDrawer" :loading="submitting">
                ✅ 确认无误，下发通行权限
              </el-button>
              <el-button size="large" class="btn-reject-final" @click="openReject(currentAuditUser)" :loading="submitting">
                ⛔ 拦截驳回
              </el-button>
            </div>
          </div>
        </template>
      </el-drawer>

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
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAuditPage, submitAudit, updateUserTag } from '@/api/admin'

const loading = ref(false)
const submitting = ref(false)
const tableData = ref([])
const total = ref(0)
const queryParams = ref({ pageNum: 1, pageSize: 10 })

const drawerVisible = ref(false)
const rejectDialogVisible = ref(false)
const rejectReason = ref('')
const currentAuditUser = ref(null)
const currentRejectUser = ref(null)
const auditForm = reactive({ userTag: 'ELDERLY', deliveryType: 0 })

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

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getAuditPage(queryParams.value)
    tableData.value = res.data.records || []
    total.value = res.data.total || 0
  } catch (e) {
    ElMessage.error('引擎数据抓取失败')
  } finally {
    loading.value = false
  }
}

const openDrawer = (row) => {
  currentAuditUser.value = row
  auditForm.userTag = row.userTag || 'ELDERLY'
  auditForm.deliveryType = row.deliveryType != null ? row.deliveryType : 0
  drawerVisible.value = true
}

const quickPass = async (row) => {
  if (row.role === 1) { openDrawer(row); return }
  try {
    await ElMessageBox.confirm(`确认放行节点 [${row.username}] 的入驻请求？`, '🚀 引擎快速干预', { confirmButtonText: '强制通过', type: 'success' })
    loading.value = true
    await submitAudit(row.userId, true, row.deliveryType)
    ElMessage.success('已下发通行指令')
    fetchData()
  } catch (e) {} finally { loading.value = false }
}

const handlePassInDrawer = async () => {
  const row = currentAuditUser.value
  if (!row) return
  submitting.value = true
  try {
    if (row.role === 1) {
      await submitAudit(row.userId, true, auditForm.deliveryType)
      await updateUserTag(row.userId, auditForm.userTag, 1)
      ElMessage.success('受赠方核验通过，已载入引擎靶向名单！')
    } else {
      await submitAudit(row.userId, true)
      ElMessage.success('核验通过，全局权限已开通！')
    }
    drawerVisible.value = false
    fetchData()
  } catch (e) { ElMessage.error('引擎交互失败') } finally { submitting.value = false }
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
    ElMessage.success(`拦截成功 (阻断原因: ${rejectReason.value})`)
    rejectDialogVisible.value = false
    drawerVisible.value = false
    fetchData()
  } catch (e) { ElMessage.error('引擎交互失败') } finally { submitting.value = false }
}

const handleHotkey = (e) => {
  if (!drawerVisible.value || submitting.value) return
  if (e.key === 'Enter') { e.preventDefault(); handlePassInDrawer() }
  if (e.key === 'Backspace') { e.preventDefault(); openReject(currentAuditUser.value) }
}

onMounted(() => { fetchData() })
</script>

<style scoped>
/* ================= 全局容器规范 (沿用 OrderFlow) ================= */
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 40px; background: #f1f5f9; overflow-y: auto; height: 100vh; box-sizing: border-box; outline: none;}
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); }
.pulse-dot { animation: pulse-blue 2s infinite; border-radius: 50%; width: 8px; height: 8px; }
@keyframes pulse-blue { 0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(249, 115, 22, 0); } 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); } }

.flow-container { padding: 0; background-color: transparent; width: 100%; overflow-x: hidden; }
.page-header h2 { color: #1e293b; font-size: 2rem; margin: 0 0 8px 0; font-weight: 900; letter-spacing: 1px; }
.page-header p { color: #64748b; font-size: 0.95rem; margin: 0 0 24px 0; font-weight: bold;}

/* ================= 1. 顶部数据统计卡片 ================= */
.stats-header { display: flex; gap: 20px; margin-bottom: 24px; }
.stat-card { flex: 1; background: #fff; border-radius: 20px; padding: 20px 24px; display: flex; align-items: center; gap: 20px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02); transition: transform 0.3s; }
.stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); }
.stat-icon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 28px; flex-shrink: 0;}
.stat-icon.database { background: #fef2f2; color: #ef4444; }
.stat-icon.dispatching { background: #eff6ff; color: #3b82f6; }
.stat-icon.success { background: #ecfdf5; color: #10b981; }

.stat-info p { margin: 0; font-size: 0.85rem; color: #64748b; font-weight: bold; }
.stat-info h3 { margin: 5px 0 0 0; font-size: 1.8rem; color: #1e293b; font-weight: 900; }
.unit { font-size: 0.9rem; color: #94a3b8; font-weight: normal; }

/* ================= 2. 表格与筛选项 ================= */
.table-wrapper { background: #fff; border-radius: 20px; padding: 24px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02); box-sizing: border-box; width: 100%; overflow-x: auto; }
.filter-bar { margin-bottom: 20px; }
.role-filter-tabs { display: flex; gap: 10px; }
.filter-tab { padding: 8px 18px; border-radius: 20px; font-size: 0.9rem; font-weight: bold; cursor: pointer; border: 1px solid #e2e8f0; color: #64748b; background: #f8fafc; transition: all 0.2s; display: flex; align-items: center; gap: 8px;}
.filter-tab.active { background: #fff7ed; color: #ea580c; border-color: #fdba74; box-shadow: 0 2px 8px rgba(234, 88, 12, 0.1);}
.filter-tab:hover:not(.active) { border-color: #cbd5e1; background: #f1f5f9; }
.tab-count { background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; }
.filter-tab.active .tab-count { background: #ea580c; color: #fff; }

.custom-table { border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
:deep(.custom-table td.el-table__cell) { padding: 14px 0; border-bottom: 1px dashed #e2e8f0; cursor: pointer; }
:deep(.custom-table .el-table__row:hover) { background: #f8fafc; }

.order-sn { font-family: monospace; font-weight: bold; color: #334155; background: #f1f5f9; padding: 4px 8px; border-radius: 6px; }
.user-cell { display: flex; flex-direction: column; gap: 4px; }
.u-name { font-weight: 900; color: #1e293b; font-size: 0.95rem; }
.u-phone { font-family: monospace; font-size: 0.8rem; color: #64748b; font-weight: bold; }

/* 业务徽章样式 */
.biz-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 900; letter-spacing: 1px; }
.req-type { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; } /* 受赠方 */
.don-type { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; } /* 商家 */
.sos-type { background: #f5f3ff; color: #7c3aed; border: 1px solid #c4b5fd; } /* 骑士 */

/* 紧急度统一标牌 */
.summary-row { display: flex; flex-wrap: wrap; gap: 6px; }
.urgency-badge { display: inline-block; padding: 4px 10px; border-radius: 10px; font-size: 0.8rem; font-weight: 900; }
.urgency-badge.high { background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5;}
.urgency-badge.normal { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;}
.urgency-badge.don-tag { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }

.has-proof { color: #059669; font-weight: bold; background: #d1fae5; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem;}
.no-proof { color: #ef4444; font-weight: bold; background: #fee2e2; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem;}

.detail-btn { font-weight: bold; }
.pagination-container { margin-top: 24px; display: flex; justify-content: flex-end; }
:deep(.el-pagination.is-background .el-pager li.is-active) { background-color: #f97316 !important; color: #fff !important; }

/* 空状态 */
.empty-state { padding: 40px 0; text-align: center; }
.empty-icon { font-size: 3rem; display: block; margin-bottom: 12px; }
.empty-state p { margin: 0 0 6px; font-size: 1.1rem; font-weight: 900; color: #1e293b; }
.empty-sub { font-size: 0.85rem; color: #64748b; font-weight: bold;}

/* ================= 3. 抽屉与 Timeline 专属 UI ================= */
.drawer-header-custom { display: flex; align-items: center; gap: 14px; }
.dh-meta { flex: 1; }
.dh-name { font-size: 1.1rem; font-weight: 900; color: #0f172a; }
.dh-sub { font-size: 0.85rem; color: #64748b; font-family: monospace; margin-top: 4px; font-weight: bold;}

.trace-container { padding: 0 5px 80px; } /* 底部留白给 fixed 按钮 */
.trace-summary { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 20px; margin-bottom: 25px; display: flex; flex-direction: column; gap: 12px; }
.summary-item { display: flex; align-items: center; font-size: 0.95rem; }
.summary-item .label { color: #64748b; font-weight: bold;}
.summary-item .goods-name { font-weight: 900; font-size: 1.15rem; flex: 1; }
.summary-item .goods-count { background: #fff7ed; color: #ea580c; padding: 4px 10px; border-radius: 8px; font-weight: 900; border: 1px solid #fdba74; }

.custom-timeline { padding-left: 10px; }
.tl-title { margin: 0 0 8px 0; font-size: 1.05rem; color: #1e293b; font-weight: 900; }
.tl-desc { margin: 0; font-size: 0.9rem; color: #64748b; line-height: 1.6; }
.error-text { color: #ef4444; font-weight: bold;}

.proof-viewer { border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; background: #fff; text-align: center;}
.proof-large { max-height: 200px; border-radius: 8px; cursor: zoom-in; }
.no-proof-large { color: #94a3b8; font-weight: bold; padding: 30px 0; font-size: 0.9rem;}

.drawer-actions { position: absolute; bottom: 0; left: 0; right: 0; background: #fff; padding: 20px 25px; border-top: 1px solid #f1f5f9; display: flex; gap: 12px; box-shadow: 0 -4px 20px rgba(0,0,0,0.05); z-index: 10;}
.btn-pass-final { flex: 2; background: linear-gradient(135deg, #10b981, #059669) !important; border: none !important; font-weight: 900 !important; box-shadow: 0 6px 15px rgba(16, 185, 129, 0.3) !important; border-radius: 12px !important; }
.btn-pass-final:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4) !important; }
.btn-reject-final { flex: 1; border: 1.5px solid #fca5a5 !important; color: #ef4444 !important; font-weight: bold !important; border-radius: 12px !important; background: #fef2f2 !important;}
.btn-reject-final:hover { background: #fee2e2 !important; border-color: #f87171 !important; }

:deep(.el-timeline-item__node--large) { width: 16px; height: 16px; left: -2px; }
:deep(.el-timeline-item__wrapper) { padding-left: 28px; top: -4px; }
:deep(.el-drawer__header) { padding: 20px 25px; border-bottom: 1px solid #f1f5f9; margin-bottom: 20px;}

/* Msg Box 样式继承 */
<style>
 .dopamine-msg-box { border-radius: 20px !important; padding: 25px !important; box-shadow: 0 25px 50px rgba(0,0,0,0.1) !important; border: 1px solid #f1f5f9 !important; font-family: inherit !important; }
.dopamine-msg-box .el-message-box__title { font-weight: 900 !important; font-size: 1.3rem !important; color: #1e293b !important; }
.dopamine-msg-box .el-message-box__content { font-size: 1.05rem !important; color: #475569 !important; margin-top: 10px !important; }
.dopamine-msg-box .el-button { border-radius: 12px !important; font-weight: 800 !important; padding: 10px 20px !important; }
</style>