<template>
  <main class="main-content" @keydown="handleHotkey">
    <div class="top-status">
      <span class="pulse-dot"></span> 平台高权限核验引擎运行中 · 节点: Admin-01
    </div>

    <div class="admin-wrapper">
      <header class="page-header">
        <h2>🛡️ 资质风控审核中心</h2>
        <p>点击行展开决策抽屉 · 快捷键: Enter=通过 Backspace=驳回</p>
      </header>

      <div class="glass-panel" v-loading="loading">
        <!-- ✅ UI-1: 统计看板 + 角色筛选 -->
        <div class="stats-summary">
          <div class="stat-card"><span class="stat-num recipient">{{ roleCounts[1] || 0 }}</span><span class="stat-lbl">受赠方待审</span></div>
          <div class="stat-card"><span class="stat-num merchant">{{ roleCounts[2] || 0 }}</span><span class="stat-lbl">商家待审</span></div>
          <div class="stat-card"><span class="stat-num volunteer">{{ roleCounts[3] || 0 }}</span><span class="stat-lbl">骑手待审</span></div>
        </div>
        <div class="role-filter-tabs">
          <button v-for="tab in filterTabs" :key="tab.value" :class="['filter-tab', { active: activeRoleFilter === tab.value }]" @click="activeRoleFilter = tab.value">{{ tab.label }} {{ tab.value === 'all' ? total : (roleCounts[tab.value] || 0) }}</button>
        </div>

        <el-table :data="filteredTableData" style="width: 100%" class="custom-table" highlight-current-row @row-click="openDrawer">
          <template #empty>
            <div class="empty-state">
              <span class="empty-icon">✅</span>
              <p>所有用户资质均已审核完毕</p>
              <span class="empty-sub">新注册用户将自动出现在此队列中</span>
            </div>
          </template>

          <el-table-column prop="userId" label="入驻ID" width="90" align="center">
            <template #default="scope"><span class="id-badge"># {{ scope.row.userId }}</span></template>
          </el-table-column>

          <el-table-column label="角色" width="100" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.role === 1" type="warning" effect="dark" round size="small">受赠方</el-tag>
              <el-tag v-else-if="scope.row.role === 2" type="success" effect="dark" round size="small">商家</el-tag>
              <el-tag v-else-if="scope.row.role === 3" type="info" effect="dark" round size="small">志愿者</el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="username" label="申请人" min-width="130">
            <template #default="scope">
              <div class="company-name">{{ scope.row.username }}</div>
              <div class="phone-text">{{ scope.row.phone }}</div>
            </template>
          </el-table-column>

          <el-table-column label="关键摘要" min-width="200">
            <template #default="scope">
              <div class="summary-row">
                <template v-if="scope.row.role === 1">
                  <span :class="scope.row.deliveryType === 1 ? 'tag-need' : 'tag-self'">{{ scope.row.deliveryType === 1 ? '🚪 需上门' : '🏪 可自取' }}</span>
                  <span v-if="scope.row.currentLon" class="tag-ok">📍 有坐标</span>
                  <span v-else class="tag-warn">⚠ 无坐标</span>
                  <span v-if="riskFlag(scope.row)" class="tag-risk">⚠ 建议电话核实</span>
                </template>
                <template v-else-if="scope.row.role === 2">
                  <span class="tag-ok">{{ formatIndustry(scope.row.industryType) }}</span>
                </template>
                <template v-else-if="scope.row.role === 3">
                  <span class="tag-ok">{{ formatVehicle(scope.row.vehicleType) }}</span>
                </template>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="凭证" width="80" align="center">
            <template #default="scope">
              <span v-if="scope.row.identityProofUrl" class="has-proof">📄 已传</span>
              <span v-else class="no-proof">✗ 缺失</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="140" align="center" fixed="right">
            <template #default="scope">
              <el-button type="primary" size="small" class="btn-quick-pass" @click.stop="quickPass(scope.row)">✓ 通过</el-button>
              <!-- ✅ UI-2: 驳回加文字标签 -->
              <el-button size="small" class="btn-quick-reject" @click.stop="openReject(scope.row)">驳回</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrap" v-if="total > 0">
          <el-pagination background layout="total, prev, pager, next" :total="total" :page-size="queryParams.pageSize" v-model:current-page="queryParams.pageNum" @current-change="fetchData"/>
        </div>
      </div>

      <!-- ✅ UI-3: 审核决策抽屉 + 自定义header + 审核完整度 -->
      <el-drawer v-model="drawerVisible" size="520px" custom-class="audit-drawer" destroy-on-close>
        <template #header>
          <div class="drawer-header-custom" v-if="currentAuditUser">
            <div class="dh-avatar" :class="'role-' + currentAuditUser.role">{{ { 1: '👴', 2: '🏪', 3: '🛵' }[currentAuditUser.role] }}</div>
            <div class="dh-meta">
              <div class="dh-name">{{ currentAuditUser.username }}<el-tag v-if="currentAuditUser.role===1" type="warning" effect="dark" size="small" round style="margin-left:8px;">受赠方</el-tag><el-tag v-else-if="currentAuditUser.role===2" type="success" effect="dark" size="small" round style="margin-left:8px;">商家</el-tag><el-tag v-else-if="currentAuditUser.role===3" type="info" effect="dark" size="small" round style="margin-left:8px;">骑手</el-tag></div>
              <div class="dh-sub">📱 {{ currentAuditUser.phone }} · #{{ currentAuditUser.userId }}</div>
            </div>
            <div class="dh-counter">第 {{ tableData.indexOf(currentAuditUser) + 1 }} / {{ tableData.length }}</div>
          </div>
          <div class="drawer-completeness" v-if="currentAuditUser">
            <div class="completeness-row"><span>审核完整度</span><span :style="{ color: auditCompleteness < 60 ? '#ef4444' : '#f97316', fontWeight: 700 }">{{ auditCompleteness }}%</span></div>
            <div class="completeness-track"><div class="completeness-fill" :style="{ width: auditCompleteness + '%', background: auditCompleteness < 60 ? '#ef4444' : '#f97316' }"></div></div>
          </div>
        </template>
        <template v-if="currentAuditUser">
          <div class="drawer-body">
            <!-- 身份信息 -->
            <div class="drawer-section">
              <h4>👤 申请人信息</h4>
              <div class="info-grid">
                <div class="info-item"><span class="info-lbl">姓名</span><span class="info-val">{{ currentAuditUser.username }}</span></div>
                <div class="info-item"><span class="info-lbl">手机</span><span class="info-val mono">{{ currentAuditUser.phone }}</span></div>
                <div class="info-item"><span class="info-lbl">角色</span><span class="info-val">{{ roleLabel(currentAuditUser.role) }}</span></div>
                <div class="info-item"><span class="info-lbl">ID</span><span class="info-val mono">#{{ currentAuditUser.userId }}</span></div>
              </div>
            </div>

            <!-- 受赠方专属档案 -->
            <div class="drawer-section" v-if="currentAuditUser.role === 1">
              <h4>🏠 配送与地址档案</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-lbl">配送偏好</span>
                  <span class="info-val" :style="{ color: currentAuditUser.deliveryType === 1 ? '#ea580c' : '#059669', fontWeight: 900 }">
                    {{ currentAuditUser.deliveryType === 1 ? '🚪 需送货上门' : '🏪 可自行取货' }}
                  </span>
                </div>
                <div class="info-item"><span class="info-lbl">门牌</span><span class="info-val">{{ currentAuditUser.doorNumber || '未填' }}</span></div>
                <div class="info-item full-width" v-if="currentAuditUser.currentLon">
                  <span class="info-lbl">坐标</span>
                  <a :href="'https://uri.amap.com/marker?position=' + currentAuditUser.currentLon + ',' + currentAuditUser.currentLat" target="_blank" class="map-link">🗺️ 在地图中查看位置</a>
                </div>
                <div class="info-item full-width" v-else>
                  <span class="info-lbl">坐标</span><span class="info-val" style="color:#ef4444;">⚠ 未设置家庭坐标</span>
                </div>
              </div>
              <!-- 风险警示 -->
              <el-alert v-if="riskFlag(currentAuditUser)" :title="riskFlag(currentAuditUser)" type="warning" :closable="false" show-icon class="risk-alert" />
            </div>

            <!-- 商家档案 -->
            <div class="drawer-section" v-if="currentAuditUser.role === 2">
              <h4>🏪 商家档案</h4>
              <div class="info-grid">
                <div class="info-item"><span class="info-lbl">业态</span><span class="info-val">{{ formatIndustry(currentAuditUser.industryType) }}</span></div>
                <div class="info-item"><span class="info-lbl">坐标</span><span class="info-val">{{ currentAuditUser.currentLon ? '✅ 已绑定' : '⚠ 缺失' }}</span></div>
              </div>
            </div>

            <!-- 骑手档案 -->
            <div class="drawer-section" v-if="currentAuditUser.role === 3">
              <h4>🛵 骑手档案</h4>
              <div class="info-grid">
                <div class="info-item"><span class="info-lbl">载具</span><span class="info-val" style="color:#ea580c;font-weight:900;">{{ formatVehicle(currentAuditUser.vehicleType) }}</span></div>
                <div class="info-item"><span class="info-lbl">坐标</span><span class="info-val">{{ currentAuditUser.currentLon ? '✅ 已绑定' : '⚠ 缺失' }}</span></div>
              </div>
            </div>

            <!-- 资质凭证 -->
            <div class="drawer-section">
              <h4>🪪 资质凭证</h4>
              <!-- ✅ UI-4: 资质凭证 + 工具栏 -->
              <div class="proof-viewer">
                <div class="proof-toolbar"><span>📄 资质凭证</span><span class="proof-hint" v-if="currentAuditUser.identityProofUrl">🔍 点击图片可放大</span></div>
                <el-image v-if="currentAuditUser.identityProofUrl" :src="currentAuditUser.identityProofUrl" :preview-src-list="[currentAuditUser.identityProofUrl]" preview-teleported fit="contain" class="proof-large" />
                <div v-else class="no-proof-large">⚠ 该用户尚未上传资质凭证</div>
              </div>
            </div>

            <!-- 受赠方赋权表单 -->
            <div class="drawer-section" v-if="currentAuditUser.role === 1">
              <h4>⚙️ 核定赋权</h4>
              <el-form :model="auditForm" label-position="top" size="large">
                <el-form-item label="关怀身份标签">
                  <el-select v-model="auditForm.userTag" style="width: 100%">
                    <el-option label="🟢 普通求助者" value="NORMAL" />
                    <el-option label="👴 需照顾老人 (高龄/独居/慢性病)" value="ELDERLY" />
                    <el-option label="👩‍🦽 残障人士 (行动不便)" value="DISABLED" />
                    <el-option label="🧹 环卫/特种工人" value="SAN_WORKER" />
                  </el-select>
                </el-form-item>
                <el-form-item label="配送方式">
                  <el-radio-group v-model="auditForm.deliveryType">
                    <el-radio :value="0" border class="audit-radio">🏪 可自取</el-radio>
                    <el-radio :value="1" border class="audit-radio">🚪 仅上门</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-form>
            </div>

            <!-- 决策按钮 -->
            <div class="drawer-actions">
              <el-button type="primary" size="large" class="btn-pass-final" @click="handlePassInDrawer" :loading="submitting">
                ✅ 审核通过并赋权
              </el-button>
              <el-button size="large" class="btn-reject-final" @click="openReject(currentAuditUser)" :loading="submitting">
                ⛔ 驳回申请
              </el-button>
            </div>
          </div>
        </template>
      </el-drawer>

      <!-- 驳回原因对话框 -->
      <el-dialog v-model="rejectDialogVisible" title="⛔ 驳回原因" width="440px" custom-class="dopamine-msg-box" destroy-on-close>
        <el-form label-position="top">
          <el-form-item label="请选择驳回原因">
            <el-select v-model="rejectReason" style="width: 100%" size="large">
              <el-option label="📄 资质凭证模糊/不清晰" value="凭证模糊" />
              <el-option label="🏠 地址信息不完整" value="地址缺失" />
              <el-option label="📍 坐标未设置或异常" value="坐标异常" />
              <el-option label="📞 电话号码无法核实" value="电话无效" />
              <el-option label="🔄 信息前后不一致" value="信息矛盾" />
              <el-option label="📋 其他原因" value="其他" />
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="rejectDialogVisible = false" round>取消</el-button>
          <el-button type="danger" @click="confirmReject" :loading="submitting" round>确认驳回</el-button>
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

/* ✅ UI-1: 筛选 + 统计 */
const activeRoleFilter = ref('all')
const filterTabs = [
  { label: '全部', value: 'all' },
  { label: '受赠方', value: 1 },
  { label: '商家', value: 2 },
  { label: '骑手', value: 3 },
]
const roleCounts = computed(() => {
  const counts = {}
  tableData.value.forEach(r => { counts[r.role] = (counts[r.role] || 0) + 1 })
  return counts
})
const filteredTableData = computed(() =>
  activeRoleFilter.value === 'all' ? tableData.value : tableData.value.filter(r => r.role === activeRoleFilter.value)
)

/* ✅ UI-3: 审核完整度 */
const auditCompleteness = computed(() => {
  const u = currentAuditUser.value
  if (!u) return 0
  let score = 0
  if (u.username) score += 25
  if (u.identityProofUrl) score += 35
  if (u.currentLon) score += 25
  if (u.role === 1 && u.doorNumber) score += 15
  if (u.role !== 1) score += 15
  return Math.min(score, 100)
})

const formatVehicle = (type) => {
  const map = { 1: '🚶 步行', 2: '🚴 单车', 3: '🛵 电瓶车', 4: '🚗 汽车' }
  return map[type] || '未分配'
}
const formatIndustry = (type) => {
  const map = { 1: '餐饮生鲜', 2: '商超便利', 3: '医药器械', 4: '服饰百货' }
  return map[type] || '综合业态'
}
const roleLabel = (r) => ({ 1: '受赠方', 2: '商家', 3: '志愿者' }[r] || '')

// 风险判定: 门牌含高危关键词 → 警示标签
const riskFlag = (row) => {
  if (row.role !== 1) return ''
  const txt = (row.doorNumber || '') + (row.healthRemark || '')
  const flags = []
  if (/(顶楼|无电梯|高楼|6[楼层层]|[7-9]楼|10楼)/.test(txt)) flags.push('高层/无电梯，配送难度高')
  if (/(高龄|独居|偏瘫|卧床|轮椅|残疾|双目失明|术后)/.test(txt)) flags.push('行动严重受限，需电话确认')
  if (flags.length) return '⚠ 建议电话核实：' + flags.join('；')
  return ''
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getAuditPage(queryParams.value)
    tableData.value = res.data.records || []
    total.value = res.data.total || 0
  } catch (e) { ElMessage.error('操作失败') } finally { loading.value = false }
}

// 点击行 → 打开抽屉
const openDrawer = (row) => {
  currentAuditUser.value = row
  auditForm.userTag = row.userTag || 'ELDERLY'
  auditForm.deliveryType = row.deliveryType != null ? row.deliveryType : 0
  drawerVisible.value = true
}

// 快速通过 (非受赠方)
const quickPass = async (row) => {
  if (row.role === 1) { openDrawer(row); return }
  try {
    await ElMessageBox.confirm(`确认通过 [${row.username}] 的资质审核？`, '快速通过', { confirmButtonText: '确认', type: 'success', customClass: 'dopamine-msg-box' })
    loading.value = true
    await submitAudit(row.userId, true, row.deliveryType)
    ElMessage.success('已通过')
    fetchData()
  } catch (e) {} finally { loading.value = false }
}

// 抽屉内通过
const handlePassInDrawer = async () => {
  const row = currentAuditUser.value
  if (!row) return
  submitting.value = true
  try {
    if (row.role === 1) {
      await submitAudit(row.userId, true, auditForm.deliveryType)
      await updateUserTag(row.userId, auditForm.userTag, 1)
      ElMessage.success('受赠方审核通过，已载入引擎靶向名单！')
    } else {
      await submitAudit(row.userId, true)
      ElMessage.success('审核通过，权限已开通！')
    }
    dispatchAuditEvent(row.userId, true)
    drawerVisible.value = false
    fetchData()
  } catch (e) { ElMessage.error('操作失败') } finally { submitting.value = false }
}

// 打开驳回对话框
const openReject = (row) => {
  currentRejectUser.value = row
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

// 确认驳回
const confirmReject = async () => {
  if (!rejectReason.value) return ElMessage.warning('请选择驳回原因')
  const row = currentRejectUser.value
  if (!row) return
  submitting.value = true
  try {
    await submitAudit(row.userId, false)
    ElMessage.success(`已驳回 (原因: ${rejectReason.value})`)
    dispatchAuditEvent(row.userId, false)
    rejectDialogVisible.value = false
    if (drawerVisible.value) drawerVisible.value = false
    fetchData()
  } catch (e) { ElMessage.error('操作失败') } finally { submitting.value = false }
}

// 审核结果通知 (模拟后端反馈链)
const dispatchAuditEvent = (userId, passed) => {
  window.dispatchEvent(new CustomEvent('audit-completed', {
    detail: { userId, passed, reason: passed ? '' : rejectReason.value }
  }))
}

// 快捷键
const handleHotkey = (e) => {
  if (!drawerVisible.value || submitting.value) return
  if (e.key === 'Enter') { e.preventDefault(); handlePassInDrawer() }
  if (e.key === 'Backspace') { e.preventDefault(); openReject(currentAuditUser.value) }
}

onMounted(() => { fetchData(); window.addEventListener('refresh-orders', fetchData) })
</script>

<style scoped>
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 40px; background: #f8fafc; min-height: 100vh; overflow-y: auto; }
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255,255,255,0.8); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.pulse-dot { width: 8px; height: 8px; background: #f97316; border-radius: 50%; box-shadow: 0 0 8px #f97316; animation: pulse-orange 2s infinite; }
@keyframes pulse-orange { 0% { box-shadow: 0 0 0 0 rgba(249,115,22,0.4); } 70% { box-shadow: 0 0 0 6px rgba(249,115,22,0); } 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); } }

.admin-wrapper { max-width: 1200px; margin: 20px auto 0; width: 100%; }
.page-header h2 { color: #1e293b; font-size: 2.2rem; margin: 0 0 8px 0; font-weight: 900; letter-spacing: 1px; }
.page-header p { color: #64748b; font-size: 1rem; margin: 0 0 30px 0; }

.glass-panel { background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-radius: 24px; padding: 20px 25px; box-shadow: 0 15px 35px rgba(0,0,0,0.04); border: 1px solid #fff; }

:deep(.custom-table) { border-radius: 16px; overflow: hidden; }
:deep(.custom-table th.el-table__cell) { background: #f1f5f9; color: #475569; font-weight: 900; font-size: 0.9rem; padding: 14px 0; text-align: center !important; }
:deep(.custom-table td.el-table__cell) { padding: 12px 0; border-bottom: 1px dashed #e2e8f0; cursor: pointer; }
:deep(.custom-table .el-table__row:hover) { background: #fff7ed; }

.id-badge { background: #f1f5f9; padding: 4px 10px; border-radius: 8px; font-weight: 900; color: #64748b; font-size: 0.85rem; font-family: monospace; }
.company-name { font-weight: 800; font-size: 1rem; color: #0f172a; }
.phone-text { font-family: monospace; font-size: 0.82rem; color: #94a3b8; font-weight: 600; margin-top: 2px; }

.summary-row { display: flex; flex-wrap: wrap; gap: 6px; }
.tag-need { background: #fff7ed; color: #ea580c; padding: 2px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; border: 1px solid #fdba74; }
.tag-self { background: #ecfdf5; color: #059669; padding: 2px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; border: 1px solid #6ee7b7; }
.tag-ok { background: #f1f5f9; color: #475569; padding: 2px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 600; }
.tag-warn { background: #fef2f2; color: #ef4444; padding: 2px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; border: 1px solid #fca5a5; }
.tag-risk { background: #fffbeb; color: #b45309; padding: 2px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; border: 1px solid #fde68a; }

.has-proof { color: #059669; font-weight: 700; font-size: 0.85rem; }
.no-proof { color: #ef4444; font-weight: 700; font-size: 0.85rem; }

.btn-quick-pass { background: #f97316 !important; border: none !important; font-weight: 800 !important; }
.btn-quick-pass:hover { background: #ea580c !important; }
/* ✅ UI-2: 驳回按钮红色描边 */
.btn-quick-reject { color: #ef4444 !important; border: 1px solid #fca5a5 !important; background: #fff !important; font-weight: 700; }
.btn-quick-reject:hover { background: #fef2f2 !important; border-color: #f87171 !important; }

.pagination-wrap { display: flex; justify-content: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid #f1f5f9; }
.empty-state { text-align: center; padding: 40px 0; }
.empty-icon { font-size: 3rem; display: block; margin-bottom: 12px; }
.empty-state p { margin: 0 0 6px; font-size: 1rem; font-weight: 900; color: #475569; }
.empty-sub { font-size: 0.8rem; color: #94a3b8; }
.map-link { color: #3b82f6; text-decoration: none; font-weight: 700; font-size: 0.85rem; border-bottom: 1px dashed #93c5fd; }
.map-link:hover { color: #2563eb; }

/* ✅ UI-1: 统计看板 */
.stats-summary { display: flex; gap: 12px; margin-bottom: 18px; }
.stat-card { flex: 1; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 14px; padding: 14px 16px; text-align: center; }
.stat-num { display: block; font-size: 1.8rem; font-weight: 900; line-height: 1; }
.stat-num.recipient { color: #ea580c; }
.stat-num.merchant { color: #059669; }
.stat-num.volunteer { color: #6366f1; }
.stat-lbl { display: block; font-size: 0.78rem; color: #94a3b8; margin-top: 5px; font-weight: 600; }
.role-filter-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.filter-tab { padding: 6px 16px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: 1px solid #e2e8f0; color: #64748b; background: #fff; transition: all 0.2s; }
.filter-tab.active { background: #fff7ed; color: #ea580c; border-color: #fdba74; }
.filter-tab:hover:not(.active) { border-color: #cbd5e1; background: #f8fafc; }

/* ✅ UI-3: 抽屉自定义header */
.drawer-header-custom { display: flex; align-items: center; gap: 14px; padding-bottom: 14px; }
.dh-avatar { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0; }
.dh-avatar.role-1 { background: #fff7ed; }
.dh-avatar.role-2 { background: #f0fdf4; }
.dh-avatar.role-3 { background: #f5f3ff; }
.dh-name { font-size: 1rem; font-weight: 900; color: #0f172a; display: flex; align-items: center; }
.dh-sub { font-size: 0.8rem; color: #94a3b8; font-family: monospace; margin-top: 3px; }
.dh-counter { margin-left: auto; font-size: 0.78rem; color: #94a3b8; font-weight: 700; white-space: nowrap; }
.drawer-completeness { margin-top: 12px; }
.completeness-row { display: flex; justify-content: space-between; font-size: 0.78rem; color: #94a3b8; margin-bottom: 6px; }
.completeness-track { height: 5px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
.completeness-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }

/* ✅ UI-4: 资质凭证工具栏 */
.proof-viewer { border: 1.5px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #fff; }
.proof-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; font-size: 0.82rem; font-weight: 700; color: #475569; }
.proof-hint { font-size: 0.75rem; color: #94a3b8; font-weight: 500; }
.proof-large { max-height: 280px; display: block; width: 100%; padding: 12px; cursor: zoom-in; }

/* ========== 抽屉样式 ========== */
:deep(.audit-drawer) { border-radius: 20px 0 0 20px !important; }
:deep(.audit-drawer .el-drawer__header) { margin-bottom: 0; padding: 24px 28px; border-bottom: 1px solid #f1f5f9; font-weight: 900; font-size: 1.2rem; }
:deep(.audit-drawer .el-drawer__body) { padding: 0; }

/* ✅ UI-5: 底部负margin修正 */
.drawer-body { padding: 24px 28px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
.drawer-section { background: #f8fafc; border-radius: 14px; padding: 18px 20px; border: 1px solid #f1f5f9; }
.drawer-section h4 { margin: 0 0 14px 0; font-size: 0.95rem; color: #1e293b; font-weight: 900; }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.info-item { display: flex; flex-direction: column; gap: 4px; }
.info-item.full-width { grid-column: 1 / -1; }
.info-lbl { font-size: 0.75rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; }
.info-val { font-size: 0.92rem; color: #334155; font-weight: 600; }
.info-val.mono { font-family: monospace; }

.risk-alert { margin-top: 12px; border-radius: 8px; font-weight: 700; }

.proof-viewer { border: 2px dashed #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; background: #fff; }
.proof-large { max-height: 300px; border-radius: 8px; cursor: zoom-in; }
.no-proof-large { color: #94a3b8; font-weight: 700; padding: 40px 0; }

.audit-radio { margin-bottom: 8px !important; }

.drawer-actions { position: sticky; bottom: 0; background: #fff; padding: 16px 28px; border-top: 1px solid #f1f5f9; display: flex; gap: 12px; box-shadow: 0 -4px 16px rgba(0,0,0,0.04); }
.btn-pass-final { flex: 2; background: linear-gradient(135deg, #f97316, #ea580c) !important; border: none !important; font-weight: 900 !important; box-shadow: 0 6px 18px rgba(249,115,22,0.3) !important; border-radius: 12px !important; }
.btn-pass-final:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(249,115,22,0.4) !important; }
.btn-reject-final { flex: 1; border: 1.5px solid #e2e8f0 !important; color: #64748b !important; font-weight: 700; border-radius: 12px !important; }
.btn-reject-final:hover { color: #ef4444 !important; border-color: #fca5a5 !important; background: #fef2f2 !important; }
</style>

<style>
.dopamine-msg-box { border-radius: 20px !important; padding: 25px !important; box-shadow: 0 25px 50px rgba(0,0,0,0.1) !important; border: 1px solid #f1f5f9 !important; font-family: inherit !important; }
.dopamine-msg-box .el-message-box__title { font-weight: 900 !important; font-size: 1.3rem !important; color: #1e293b !important; }
.dopamine-msg-box .el-message-box__content { font-size: 1.05rem !important; color: #475569 !important; margin-top: 10px !important; }
.dopamine-msg-box .el-input__wrapper { border-radius: 12px !important; padding: 8px 15px !important; }
.dopamine-msg-box .el-button { border-radius: 12px !important; font-weight: 800 !important; padding: 10px 20px !important; }
</style>
