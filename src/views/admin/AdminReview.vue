<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot"></span> 平台高权限核验引擎运行中 · 节点: Admin-01
    </div>

    <div class="admin-wrapper">
      <header class="page-header">
        <h2>🛡️ 资质风控审核中心</h2>
        <p>严格把控城市物资供给与受赠源头，确保平台生态安全</p>
      </header>

      <div class="glass-panel" v-loading="loading">
        <el-table :data="tableData" style="width: 100%" class="custom-table" :empty-text="'✨ 当前所有用户资质均已审核完毕'">

          <el-table-column prop="userId" label="入驻ID" min-width="90" align="center">
            <template #default="scope"><span class="id-badge"># {{ scope.row.userId }}</span></template>
          </el-table-column>

          <el-table-column label="申请角色" min-width="140" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.role === 1" type="warning" effect="dark" round>受赠方</el-tag>
              <el-tag v-else-if="scope.row.role === 2" type="success" effect="dark" round>爱心商家</el-tag>
              <el-tag v-else-if="scope.row.role === 3" type="info" effect="dark" round>志愿者</el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="username" label="申请人 / 机构名称" min-width="160" align="center">
            <template #default="scope">
              <div class="company-name">{{ scope.row.username }}</div>
              <div class="phone-text">{{ scope.row.phone }}</div>
            </template>
          </el-table-column>

          <el-table-column label="专有档案信息 (审核依据)" min-width="240">
            <template #default="scope">
              <div class="detail-box">
                <template v-if="scope.row.role === 1">
                  <div class="d-row"><span class="d-icon">🏠</span> 门牌: {{ scope.row.doorNumber || '未填写' }}</div>
                  <div class="d-row" v-if="scope.row.emergencyPhone"><span class="d-icon">☎️</span> 紧急: {{ scope.row.emergencyPhone }}</div>
                  <div class="d-row d-alert" v-if="scope.row.healthRemark"><span class="d-icon">❤️</span> 备注: {{ scope.row.healthRemark }}</div>
                </template>

                <template v-if="scope.row.role === 2">
                  <div class="d-row"><span class="d-icon">🏢</span> 业态: {{ formatIndustry(scope.row.industryType) }}</div>
                  <div class="d-row"><span class="d-icon">📍</span> LBS基站: {{ scope.row.currentLon ? '坐标已绑定' : '坐标缺失' }}</div>
                </template>

                <template v-if="scope.row.role === 3">
                  <div class="d-row"><span class="d-icon">🛵</span> 载具: <strong style="color:#ea580c">{{ formatVehicle(scope.row.vehicleType) }}</strong></div>
                  <div class="d-row"><span class="d-icon">📍</span> 常驻区域: {{ scope.row.currentLon ? '坐标已绑定' : '坐标缺失' }}</div>
                </template>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="资质凭证" min-width="120" align="center">
            <template #default="scope">
              <el-image
                  v-if="scope.row.identityProofUrl"
                  class="proof-thumb"
                  :src="scope.row.identityProofUrl"
                  :preview-src-list="[scope.row.identityProofUrl]"
                  preview-teleported
                  fit="cover"
              />
              <span v-else class="no-img">未上传</span>
            </template>
          </el-table-column>

          <el-table-column label="决策指令" min-width="220" align="center" fixed="right">
            <template #default="scope">
              <button class="action-btn btn-pass" @click="handlePass(scope.row)">通过</button>
              <button class="action-btn btn-reject" @click="handleReject(scope.row.userId)">驳回</button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrap" v-if="total > 0">
          <el-pagination background layout="total, prev, pager, next" :total="total" :page-size="queryParams.pageSize" v-model:current-page="queryParams.pageNum" @current-change="fetchData"/>
        </div>
      </div>

      <el-dialog v-model="tagDialogVisible" title="🛡️ 审核通过并赋权" width="550px" custom-class="dopamine-msg-box" destroy-on-close>
        <div class="audit-tag-section" v-if="currentAuditUser?.role === 1">
          <el-alert
              title="💡 身份核定提示"
              type="warning"
              description="该用户为【重点关怀对象】。请结合其填写的健康备注与资质凭证，核定最终的调度身份。算法将依此进行物资靶向匹配！"
              show-icon
              :closable="false"
              style="margin-bottom: 25px; border-radius: 12px;"
          />
          <el-form :model="auditForm" label-position="top">
            <el-form-item label="核定关怀身份 (调度引擎将据此匹配物资)" required>
              <el-select v-model="auditForm.userTag" placeholder="请选择核定后的身份标签" style="width: 100%" size="large">
                <el-option label="🟢 普通求助者 (无特殊照看需求)" value="NORMAL"></el-option>
                <el-option label="👴 需照顾老人 (高龄/独居/慢性病)" value="ELDERLY"></el-option>
                <el-option label="👩‍🦽 残障人士 (行动不便/特保/过敏)" value="DISABLED"></el-option>
                <el-option label="🧹 环卫/特种工人 (户外高强度)" value="SAN_WORKER"></el-option>
              </el-select>
            </el-form-item>
          </el-form>
        </div>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="tagDialogVisible = false" round>取消</el-button>
            <el-button type="primary" @click="submitTagAndPass" :loading="submittingTag" round style="background: linear-gradient(135deg, #1e293b, #0f172a); border: none;">确认打标并放行</el-button>
          </span>
        </template>
      </el-dialog>

    </div>
  </main>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAuditPage, submitAudit, updateUserTag } from '@/api/admin' // 🚨 确保有 updateUserTag

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const queryParams = ref({ pageNum: 1, pageSize: 10 })

// 🚨 新增：高级弹窗控制变量
const tagDialogVisible = ref(false)
const submittingTag = ref(false)
const currentAuditUser = ref(null)
const auditForm = reactive({ userTag: 'ELDERLY' }) // 打开时默认选中老人

// 字典映射
const formatVehicle = (type) => {
  const map = { 1: '🚶 步行', 2: '🚴 单车', 3: '🛵 电瓶车', 4: '🚗 汽车' }
  return map[type] || '未分配'
}
const formatIndustry = (type) => {
  const map = { 1: '餐饮生鲜', 2: '商超便利', 3: '医药器械', 4: '服饰百货' }
  return map[type] || '综合业态'
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getAuditPage(queryParams.value)
    tableData.value = res.data.records || []
    total.value = res.data.total || 0
  } catch (e) {} finally { loading.value = false }
}

// 🚨 核心重写：拦截通过操作，针对受赠方唤起模态框
const handlePass = (row) => {
  if (row.role === 1) {
    currentAuditUser.value = row
    auditForm.userTag = 'ELDERLY' // 每次打开重置默认值
    tagDialogVisible.value = true // 唤起大厂级专属赋权弹窗
  } else {
    // 商家或志愿者的审核逻辑不变
    ElMessageBox.confirm(`确认 [${row.username}] 资质合规，允许其接入调度大盘吗？`, '✅ 资质核验确认', {
      confirmButtonText: '确认通过', cancelButtonText: '取消', type: 'success', customClass: 'dopamine-msg-box'
    }).then(async () => {
      loading.value = true
      try {
        await submitAudit(row.userId, true)
        ElMessage.success('指令已下达，权限已开通！')
        fetchData()
      } catch (e) {} finally { loading.value = false }
    }).catch(() => {})
  }
}

// 🚨 新增：提交打标数据并放行
const submitTagAndPass = async () => {
  if (!auditForm.userTag) return ElMessage.warning('身份标签不能为空')
  submittingTag.value = true
  try {
    // 1. 发送通过指令
    await submitAudit(currentAuditUser.value.userId, true)
    // 2. 写入系统标签
    await updateUserTag(currentAuditUser.value.userId, auditForm.userTag, 1)

    ElMessage.success('受赠方审核通过并成功载入引擎靶向名单！')
    tagDialogVisible.value = false
    fetchData() // 刷新列表
  } catch (e) {
  } finally {
    submittingTag.value = false
  }
}

const handleReject = (userId) => {
  ElMessageBox.confirm('凭证不合格或填写有误？驳回后将要求用户重新提交。', '⛔ 驳回确认', {
    confirmButtonText: '确认驳回', cancelButtonText: '暂不处理', type: 'error', customClass: 'dopamine-msg-box'
  }).then(async () => {
    loading.value = true
    try {
      await submitAudit(userId, false)
      ElMessage.success('已驳回申请，任务已移出队列。')
      fetchData()
    } catch (e) {} finally { loading.value = false }
  }).catch(() => {})
}

onMounted(() => fetchData())
</script>

<style scoped>
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 40px; background: #f8fafc; }
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); }
.pulse-dot { width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 8px #3b82f6; animation: pulse-blue 2s infinite; }
@keyframes pulse-blue { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }

.admin-wrapper { max-width: 1200px; margin: 20px auto 0; width: 100%; }
.page-header h2 { color: #1e293b; font-size: 2.2rem; margin: 0 0 8px 0; font-weight: 900; letter-spacing: 1px; }
.page-header p { color: #64748b; font-size: 1.1rem; margin: 0 0 30px 0; }

.glass-panel { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 24px; padding: 25px; box-shadow: 0 15px 35px rgba(0,0,0,0.04); border: 1px solid #fff; }

/* 🌟 表格样式增强 */
:deep(.custom-table) { border-radius: 16px; overflow: hidden; --el-table-border-color: transparent; }
:deep(.custom-table th.el-table__cell) { background-color: #f1f5f9; color: #475569; font-weight: 900; font-size: 0.95rem; padding: 18px 0; text-align: center !important; }
:deep(.custom-table td.el-table__cell) { padding: 15px 0; border-bottom: 1px dashed #e2e8f0; color: #334155; }
:deep(.el-table__inner-wrapper::before) { display: none; }

.id-badge { background: #f1f5f9; padding: 6px 12px; border-radius: 8px; font-weight: 900; color: #64748b; font-size: 0.9rem; font-family: monospace; }
.company-name { font-weight: 900; font-size: 1.05rem; color: #0f172a; margin-bottom: 4px; }
.phone-text { font-family: monospace; font-size: 0.9rem; color: #94a3b8; font-weight: bold; }

/* 🚨 详情信息块样式 */
.detail-box { text-align: left; background: #f8fafc; padding: 10px 15px; border-radius: 12px; border: 1px solid #e2e8f0; display: inline-block; min-width: 200px; }
.d-row { font-size: 0.85rem; color: #475569; margin-bottom: 4px; font-weight: bold; }
.d-row:last-child { margin-bottom: 0; }
.d-icon { opacity: 0.8; margin-right: 4px; }
.d-alert { color: #ef4444; background: #fef2f2; padding: 2px 6px; border-radius: 6px; display: inline-block; margin-top: 4px; }

.proof-thumb { width: 60px; height: 60px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); cursor: zoom-in; transition: 0.3s; }
.proof-thumb:hover { transform: scale(1.1); box-shadow: 0 6px 16px rgba(0,0,0,0.15); }
.no-img { font-size: 0.8rem; color: #cbd5e1; font-weight: bold; }

.action-btn { border: none; padding: 10px 20px; border-radius: 10px; font-weight: 900; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; margin: 0 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.btn-pass { background: #1e293b; color: #fff; }
.btn-pass:hover { background: #0f172a; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(15, 23, 42, 0.25); }
.btn-reject { background: #fff; color: #ef4444; border: 2px solid #fecaca; }
.btn-reject:hover { background: #fef2f2; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(239, 68, 68, 0.25); }

.pagination-wrap { display: flex; justify-content: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid #f1f5f9; }
</style>

<style>
/* 共用高级弹窗样式 */
.dopamine-msg-box { border-radius: 20px !important; padding: 25px !important; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1) !important; border: 1px solid #f1f5f9 !important; font-family: inherit !important; }
.dopamine-msg-box .el-message-box__title { font-weight: 900 !important; font-size: 1.3rem !important; color: #1e293b !important; }
.dopamine-msg-box .el-message-box__content { font-size: 1.05rem !important; color: #475569 !important; margin-top: 10px !important; }
.dopamine-msg-box .el-input__wrapper { border-radius: 12px !important; padding: 8px 15px !important; box-shadow: 0 0 0 2px #e2e8f0 inset !important; }
.dopamine-msg-box .el-input__wrapper.is-focus { box-shadow: 0 0 0 2px #f97316 inset !important; }
.dopamine-msg-box .el-button { border-radius: 12px !important; font-weight: 800 !important; padding: 10px 20px !important; transition: all 0.2s !important; }
.dopamine-msg-box .el-button--primary { background: linear-gradient(135deg, #1e293b, #0f172a) !important; border: none !important; box-shadow: 0 4px 12px rgba(30, 41, 59, 0.3) !important; }
.dopamine-msg-box .el-button--primary:hover { transform: translateY(-2px) !important; box-shadow: 0 6px 15px rgba(30, 41, 59, 0.4) !important; }
</style>