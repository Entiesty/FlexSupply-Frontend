<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot"></span> 全域用户治理引擎在线 · Admin-01
    </div>

    <div class="admin-wrapper">
      <header class="page-header">
        <h2>👥 全域用户治理大厅</h2>
        <p>动态管控弱势群体标签、入驻商家资质与志愿者信誉体系</p>
      </header>

      <div class="glass-panel">
        <div class="role-tabs">
          <div class="tab-item" :class="{ active: currentRole === 1 }" @click="switchRole(1)">👴 受赠方管控</div>
          <div class="tab-item" :class="{ active: currentRole === 2 }" @click="switchRole(2)">🏪 商家库管理</div>
          <div class="tab-item" :class="{ active: currentRole === 3 }" @click="switchRole(3)">🚴 志愿者调度</div>
        </div>

        <div class="toolbar">
          <input v-model="keyword" type="text" class="search-input" placeholder="输入姓名或手机号检索..." @keyup.enter="fetchData" />
          <button class="search-btn" @click="fetchData">检索</button>
        </div>

        <el-table :data="userList" style="width: 100%" class="custom-table" v-loading="loading">
          <el-table-column prop="userId" label="用户ID" width="100" align="center">
            <template #default="scope"><span class="id-badge">#{{ scope.row.userId }}</span></template>
          </el-table-column>

          <el-table-column prop="username" label="姓名/名称" min-width="150" />
          <el-table-column prop="phone" label="联系电话" width="150" />

          <el-table-column label="证明材料" width="100" align="center">
            <template #default="scope">
              <el-image
                  v-if="scope.row.identityProofUrl"
                  style="width: 45px; height: 45px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer;"
                  :src="scope.row.identityProofUrl"
                  :preview-src-list="[scope.row.identityProofUrl]"
                  preview-teleported
                  fit="cover"
              />
              <span v-else style="color: #94a3b8; font-size: 0.8rem;">未上传</span>
            </template>
          </el-table-column>

          <el-table-column label="账号状态" width="100" align="center">
            <template #default="scope">
              <span :class="scope.row.status === 1 ? 'text-green' : 'text-red'">
                {{ scope.row.status === 1 ? '正常' : '已封禁' }}
              </span>
            </template>
          </el-table-column>

          <template v-if="currentRole === 1">
            <el-table-column label="身份标签" width="150">
              <template #default="scope">
                <span class="tag-badge">{{ scope.row.userTag }}</span>
              </template>
            </el-table-column>

            <el-table-column label="核验状态" width="120" align="center">
              <template #default="scope">
                <span :class="scope.row.isVerified === 1 ? 'text-green' : 'text-red'">
                  {{ scope.row.isVerified === 1 ? '已核实' : '未核实' }}
                </span>
              </template>
            </el-table-column>
          </template>

          <template v-if="currentRole === 3">
            <el-table-column label="当前信誉分" width="120" align="center">
              <template #default="scope">
                <span class="credit-text">{{ scope.row.creditScore }} 分</span>
              </template>
            </el-table-column>
          </template>

          <el-table-column label="高权限指令" width="220" align="center" fixed="right">
            <template #default="scope">
              <button v-if="currentRole === 1" class="action-btn btn-pass" @click="handleEditTag(scope.row)">打标/核验</button>

              <button v-if="currentRole === 2 && scope.row.status !== 0" class="action-btn btn-reject" @click="handleRejectMerchant(scope.row.userId)">强制清退</button>
              <span v-else-if="currentRole === 2 && scope.row.status === 0" style="color: #ef4444; font-weight: bold; font-size: 0.85rem; padding: 0 10px;">🚫 已执行清退</span>

              <template v-if="currentRole === 3">
                <button class="action-btn btn-pass" @click="handleCredit(scope.row.userId, 10)">奖励</button>
                <button class="action-btn btn-reject" @click="handleCredit(scope.row.userId, -20)">处罚</button>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUserList, updateUserTag, updateUserCredit, auditMerchant, evictUser } from '@/api/admin'

const loading = ref(false)
const userList = ref([])
const currentRole = ref(1)
const keyword = ref('')

const switchRole = (role) => {
  currentRole.value = role
  keyword.value = ''
  fetchData()
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getUserList({ role: currentRole.value, keyword: keyword.value, pageNum: 1, pageSize: 50 })
    userList.value = res.data.records || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// ================= 高权限操作区 =================

// 1. 受赠方打标 (带自定义弹窗样式)
const handleEditTag = (row) => {
  ElMessageBox.prompt('请输入新的身份标签 (如: NORMAL, ELDERLY, DISABLED)', '🛡️ 特权标签核验', {
    confirmButtonText: '核实验过并打标',
    cancelButtonText: '取消',
    inputValue: row.userTag,
    customClass: 'dopamine-msg-box' // 应用拟物化弹窗样式
  }).then(async ({ value }) => {
    if (!value) return
    try {
      await updateUserTag(row.userId, value, 1)
      ElMessage.success('特权标签写入成功！多因子算法已生效。')
      fetchData()
    } catch (e) {}
  }).catch(() => {})
}

// 2. 志愿者信誉干预 (🚨 修复 2：强制输入变动事由留痕)
const handleCredit = (userId, scoreChange) => {
  const actionName = scoreChange > 0 ? `奖励 ${scoreChange} 分` : `处罚扣除 ${Math.abs(scoreChange)} 分`

  ElMessageBox.prompt(`请输入对该骑手执行 [${actionName}] 的具体原因：`, '🏆 信誉人工干预', {
    confirmButtonText: '确定执行',
    cancelButtonText: '取消',
    inputPattern: /\S+/, // 必须输入可见字符
    inputErrorMessage: '操作原因不能为空（需记录至流水账本以备对账）',
    type: scoreChange > 0 ? 'success' : 'warning',
    customClass: 'dopamine-msg-box'
  }).then(async ({ value }) => {
    try {
      // ⚠️ 将 value(事由) 传给后端接口，写入 fb_credit_log
      await updateUserCredit(userId, scoreChange, value)
      ElMessage.success(`操作成功：已记入信誉流水账本！`)
      fetchData()
    } catch (e) {}
  }).catch(() => {})
}

// 3. 强制清退违规商家
const handleRejectMerchant = (userId) => {
  ElMessageBox.confirm('强制清退该商家？其发布的所有未接单物资将被拦截并下架。', '🚨 高危操作确认', {
    confirmButtonText: '确认清退',
    cancelButtonText: '暂不处理',
    type: 'error',
    customClass: 'dopamine-msg-box'
  }).then(async () => {
    try {
      // 🚨 核心修复：把 auditMerchant(userId, -1) 换成真正的熔断接口！
      await evictUser(userId)
      ElMessage.success('已清退该违规商家，未履约的单子和库存已全线熔断！')
      fetchData()
    } catch (e) {}
  }).catch(() => {})
}

onMounted(() => fetchData())
</script>

<style scoped>
/* 骨架与框架样式保持完美的原状 */
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 40px; }
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); }
.pulse-dot { width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 8px #3b82f6; animation: pulse-blue 2s infinite; }
@keyframes pulse-blue { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }

.admin-wrapper { max-width: 1100px; margin: 20px auto 0; width: 100%; }
.page-header h2 { color: #1e293b; font-size: 2.2rem; margin: 0 0 8px 0; font-weight: 900; letter-spacing: 1px; }
.page-header p { color: #64748b; font-size: 1.1rem; margin: 0 0 25px 0; }

.glass-panel { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 24px; padding: 25px; box-shadow: 0 15px 35px rgba(0,0,0,0.06); border: 1px solid #f8fafc; }

/* 动态 Tab */
.role-tabs { display: flex; gap: 15px; margin-bottom: 25px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }
.tab-item { padding: 10px 20px; font-size: 1.05rem; font-weight: 900; color: #94a3b8; cursor: pointer; transition: 0.3s; border-radius: 12px; }
.tab-item:hover { background: #f8fafc; color: #475569; }
.tab-item.active { background: #f97316; color: #fff; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.25); }

/* 搜索栏 */
.toolbar { display: flex; gap: 15px; margin-bottom: 20px; }
.search-input { flex: 1; padding: 12px 18px; border: 2px solid #e2e8f0; border-radius: 12px; outline: none; transition: 0.3s; font-size: 1rem; }
.search-input:focus { border-color: #f97316; }
.search-btn { background: #1e293b; color: #fff; border: none; padding: 0 25px; border-radius: 12px; font-weight: 900; cursor: pointer; transition: 0.2s; }
.search-btn:hover { background: #0f172a; transform: translateY(-2px); }

/* 表格深度美化 */
:deep(.el-table) { border-radius: 16px; overflow: hidden; --el-table-border-color: transparent; }
:deep(.el-table th.el-table__cell) { background-color: #f8fafc; color: #475569; font-weight: 900; padding: 16px 0; border-bottom: 2px solid #f1f5f9; }
:deep(.el-table td.el-table__cell) { padding: 16px 0; border-bottom: 1px dashed #f1f5f9; color: #334155; }
:deep(.el-table__inner-wrapper::before) { display: none; }

.id-badge { background: #f1f5f9; padding: 6px 12px; border-radius: 8px; font-weight: 900; color: #64748b; font-size: 0.9rem; }
.tag-badge { background: #e0e7ff; color: #4f46e5; padding: 6px 12px; border-radius: 8px; font-weight: bold; font-size: 0.85rem; }
.credit-text { font-family: monospace; font-size: 1.1rem; color: #f97316; font-weight: 900; }
.text-green { color: #10b981; font-weight: bold; }
.text-red { color: #ef4444; font-weight: bold; }

/* 操作按钮 */
.action-btn { border: none; padding: 8px 15px; border-radius: 8px; font-weight: 900; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; margin: 0 4px; }
.btn-pass { background: #ecfdf5; color: #10b981; border: 1px solid #d1fae5; }
.btn-pass:hover { background: #10b981; color: white; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2); }
.btn-reject { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
.btn-reject:hover { background: #ef4444; color: white; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(239, 68, 68, 0.2); }
</style>

<style>
.dopamine-msg-box {
  border-radius: 20px !important;
  padding: 25px !important;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1) !important;
  border: 1px solid #f1f5f9 !important;
  font-family: inherit !important;
}

.dopamine-msg-box .el-message-box__title {
  font-weight: 900 !important;
  font-size: 1.3rem !important;
  color: #1e293b !important;
}

.dopamine-msg-box .el-message-box__content {
  font-size: 1.05rem !important;
  color: #475569 !important;
  margin-top: 10px !important;
}

.dopamine-msg-box .el-input__wrapper {
  border-radius: 12px !important;
  padding: 8px 15px !important;
  box-shadow: 0 0 0 1px #e2e8f0 inset !important;
}

.dopamine-msg-box .el-input__wrapper.is-focus {
  box-shadow: 0 0 0 2px #f97316 inset !important;
}

.dopamine-msg-box .el-button {
  border-radius: 12px !important;
  font-weight: 800 !important;
  padding: 10px 20px !important;
  transition: all 0.2s !important;
}

.dopamine-msg-box .el-button--primary {
  background: linear-gradient(135deg, #f97316, #ea580c) !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3) !important;
}

.dopamine-msg-box .el-button--primary:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 15px rgba(249, 115, 22, 0.4) !important;
}
</style>