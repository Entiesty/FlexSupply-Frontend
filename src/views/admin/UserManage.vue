<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot"></span> 全域数字资产盘点监控中 · Admin-01
    </div>

    <div class="admin-wrapper">
      <header class="page-header">
        <div class="header-icon">👥</div>
        <div class="header-text">
          <h2>全域用户管理台账</h2>
          <p>对已入驻系统的核心角色进行动态管控与事后风控干预</p>
        </div>
      </header>

      <div class="glass-panel">
        <div class="role-tabs">
          <div class="tab-item" :class="{ active: currentRole === 1 }" @click="switchRole(1)">👴 受赠关怀名录</div>
          <div class="tab-item" :class="{ active: currentRole === 2 }" @click="switchRole(2)">🏪 合作商家矩阵</div>
          <div class="tab-item" :class="{ active: currentRole === 3 }" @click="switchRole(3)">🚴 骑士运力大盘</div>
          <div class="tab-item" :class="{ active: currentRole === 4 }" @click="switchRole(4)">🛡️ 指挥中心节点</div>
        </div>

        <div class="toolbar">
          <input v-model="keyword" type="text" class="search-input" placeholder="输入姓名或手机号进行精确追溯..." @keyup.enter="fetchData" />
          <button class="search-btn" @click="fetchData">检索档案</button>
        </div>

        <el-table :data="userList" style="width: 100%" class="custom-table" v-loading="loading" :empty-text="'✨ 暂无相关档案，快去邀请用户入驻吧！'">
          <el-table-column prop="userId" label="档案号" min-width="100" align="center">
            <template #default="scope"><span class="id-badge">#{{ scope.row.userId }}</span></template>
          </el-table-column>

          <el-table-column prop="username" label="登记名 / 企业名称" min-width="180" align="center">
            <template #default="scope"><span class="company-name">{{ scope.row.username }}</span></template>
          </el-table-column>

          <el-table-column prop="phone" label="联系方式" min-width="140" align="center">
            <template #default="scope"><span class="phone-text">{{ scope.row.phone }}</span></template>
          </el-table-column>

          <el-table-column label="身份缩影" min-width="100" align="center">
            <template #default="scope">
              <el-avatar :size="40" :src="scope.row.avatar || scope.row.identityProofUrl" style="box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 2px solid #fff;" />
            </template>
          </el-table-column>

          <el-table-column label="活跃状态" min-width="120" align="center">
            <template #default="scope">
              <div class="status-dot-wrap">
                <span class="status-dot" :class="scope.row.status === 1 ? 'dot-active' : 'dot-banned'"></span>
                <span class="status-text" :class="scope.row.status === 1 ? 'text-green' : 'text-red'">
                  {{ scope.row.status === 1 ? '活跃中' : '已封禁' }}
                </span>
              </div>
            </template>
          </el-table-column>

          <template v-if="currentRole === 1">
            <el-table-column label="引擎画像标签" min-width="160" align="center">
              <template #default="scope">
                <span class="tag-badge">{{ scope.row.userTag || '暂无标签' }}</span>
              </template>
            </el-table-column>
          </template>

          <template v-if="currentRole === 3">
            <el-table-column label="信誉力评级" min-width="120" align="center">
              <template #default="scope">
                <span class="credit-text">{{ scope.row.creditScore }} 分</span>
              </template>
            </el-table-column>
          </template>

          <el-table-column label="风控干预指令" min-width="240" align="center" fixed="right">
            <template #default="scope">
              <button v-if="currentRole === 1" class="action-btn btn-edit" @click="handleEditTag(scope.row)">🏷️ 修改标签</button>

              <button v-if="currentRole === 2 && scope.row.status !== 0" class="action-btn btn-reject" @click="handleRejectMerchant(scope.row.userId)">🚫 强制清退</button>
              <span v-else-if="currentRole === 2 && scope.row.status === 0" class="banned-mark">⚠️ 资产已熔断</span>

              <template v-if="currentRole === 3">
                <button class="action-btn btn-edit" @click="handleCredit(scope.row.userId, 10)">🎖️ 奖励</button>
                <button class="action-btn btn-reject" @click="handleCredit(scope.row.userId, -20)">⚔️ 处罚</button>
              </template>

              <template v-if="currentRole === 4">
                <span style="color: #94a3b8; font-size: 0.85rem; font-weight: bold;">🛡️ 底座节点不可干预</span>
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
import { getUserList, updateUserTag, updateUserCredit, evictUser } from '@/api/admin'

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
    const res = await getUserList({ role: currentRole.value, keyword: keyword.value, pageNum: 1, pageSize: 50, isVerified: 1 })
    userList.value = res.data.records || []
  } catch (e) {} finally { loading.value = false }
}

const handleEditTag = (row) => {
  ElMessageBox.prompt('重塑该受赠方的系统画像标签 (决定了多因子匹配的权重)：', '🏷️ 修改人群标签', {
    confirmButtonText: '确定保存', cancelButtonText: '取消', inputValue: row.userTag, customClass: 'dopamine-msg-box'
  }).then(async ({ value }) => {
    if (!value) return
    try {
      await updateUserTag(row.userId, value, 1)
      ElMessage.success('画像标签修正完成，调度引擎将按新标签算力执行！')
      fetchData()
    } catch (e) {}
  }).catch(() => {})
}

const handleCredit = (userId, scoreChange) => {
  const actionName = scoreChange > 0 ? `奖励 ${scoreChange} 分` : `处罚扣除 ${Math.abs(scoreChange)} 分`
  ElMessageBox.prompt(`正在对运力进行信誉干预 [${actionName}]，请输入记账事由：`, '🏆 信誉资产清算', {
    confirmButtonText: '确认记账', cancelButtonText: '取消',
    inputPattern: /\S+/, inputErrorMessage: '审计要求：必须填写干预原因',
    type: scoreChange > 0 ? 'success' : 'warning', customClass: 'dopamine-msg-box'
  }).then(async ({ value }) => {
    try {
      await updateUserCredit(userId, scoreChange, value)
      ElMessage.success(`干预指令生效：流水已计入系统账本！`)
      fetchData()
    } catch (e) {}
  }).catch(() => {})
}

const handleRejectMerchant = (userId) => {
  ElMessageBox.confirm('极其危险！清退商家将瞬间冻结其名下未接单库存，并撤销其相关派发工单！', '☢️ 物理熔断与网络隔离', {
    confirmButtonText: '强制清退', cancelButtonText: '取消', type: 'error', customClass: 'dopamine-msg-box'
  }).then(async () => {
    try {
      await evictUser(userId)
      ElMessage.success('清退完毕！该节点及附属资产已被彻底熔断。')
      fetchData()
    } catch (e) {}
  }).catch(() => {})
}

onMounted(() => fetchData())
</script>

<style scoped>
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 40px; background: #f1f5f9; overflow-y: auto; height: 100vh; box-sizing: border-box;}
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); }
.pulse-dot { width: 8px; height: 8px; background: #f97316; border-radius: 50%; box-shadow: 0 0 8px #f97316; animation: pulse-orange 2s infinite; }
@keyframes pulse-orange { 0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(249, 115, 22, 0); } 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); } }

.admin-wrapper { max-width: 1200px; margin: 0 auto; width: 100%; padding-bottom: 50px; }
.page-header { display: flex; align-items: center; gap: 20px; margin-bottom: 25px; }
.header-icon { font-size: 2.8rem; background: #fff; padding: 15px; border-radius: 20px; box-shadow: 0 10px 25px rgba(249, 115, 22, 0.15); }
.header-text h2 { color: #1e293b; font-size: 2rem; margin: 0 0 8px 0; font-weight: 900; }
.header-text p { color: #64748b; font-size: 1.05rem; margin: 0; }

.glass-panel { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); border-radius: 24px; padding: 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.04); border: 1px solid #fff; }

.role-tabs { display: flex; gap: 10px; margin-bottom: 25px; background: #f1f5f9; padding: 6px; border-radius: 16px; width: fit-content; flex-wrap: wrap;}
.tab-item { padding: 10px 25px; font-size: 1.05rem; font-weight: 900; color: #64748b; cursor: pointer; transition: 0.3s; border-radius: 12px; user-select: none; }
.tab-item:hover { color: #1e293b; }
.tab-item.active { background: #fff; color: #ea580c; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }

.toolbar { display: flex; gap: 15px; margin-bottom: 20px; }
.search-input { flex: 1; max-width: 400px; padding: 14px 18px; border: 2px solid #e2e8f0; border-radius: 14px; outline: none; transition: 0.3s; font-size: 1rem; font-weight: bold; background: #f8fafc; color: #1e293b; }
.search-input:focus { border-color: #f97316; background: #fff; box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1); }
.search-btn { background: #1e293b; color: #fff; border: none; padding: 0 30px; border-radius: 14px; font-weight: 900; cursor: pointer; transition: 0.3s; font-size: 1.05rem;}
.search-btn:hover { background: #0f172a; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(15, 23, 42, 0.2); }

/* 表格深度美化 */
:deep(.custom-table) { border-radius: 16px; overflow: hidden; --el-table-border-color: transparent; }
:deep(.custom-table th.el-table__cell) { background-color: #f8fafc; color: #475569; font-weight: 900; font-size: 0.95rem; padding: 18px 0; text-align: center !important; }
:deep(.custom-table td.el-table__cell) { padding: 12px 0; border-bottom: 1px dashed #e2e8f0; color: #334155; text-align: center !important; }
:deep(.el-table__inner-wrapper::before) { display: none; }

.id-badge { background: #f1f5f9; padding: 6px 12px; border-radius: 8px; font-weight: 900; color: #64748b; font-size: 0.9rem; font-family: monospace;}
.company-name { font-weight: 900; font-size: 1.05rem; color: #0f172a; }
.phone-text { font-family: monospace; font-size: 1rem; color: #64748b; font-weight: bold; }

.status-dot-wrap { display: flex; align-items: center; justify-content: center; gap: 8px; background: #f8fafc; padding: 4px 10px; border-radius: 20px; width: fit-content; margin: 0 auto; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.dot-active { background: #10b981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.5); }
.dot-banned { background: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.5); }
.text-green { color: #10b981; font-weight: bold; font-size: 0.85rem;}
.text-red { color: #ef4444; font-weight: bold; font-size: 0.85rem;}

.tag-badge { background: #fff7ed; color: #ea580c; border: 1px dashed #fdba74; padding: 6px 12px; border-radius: 8px; font-weight: 900; font-size: 0.85rem; }
.credit-text { font-family: monospace; font-size: 1.2rem; color: #ea580c; font-weight: 900; }
.banned-mark { font-weight: 900; color: #ef4444; font-size: 0.9rem; background: #fef2f2; padding: 6px 12px; border-radius: 8px; border: 1px solid #fecaca;}

.action-btn { border: none; padding: 8px 16px; border-radius: 10px; font-weight: 900; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; margin: 0 4px; }
.btn-edit { background: #f1f5f9; color: #3b82f6; }
.btn-edit:hover { background: #eff6ff; color: #2563eb; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(59, 130, 246, 0.15); }
.btn-reject { background: #fff; color: #ef4444; border: 2px solid #fecaca; }
.btn-reject:hover { background: #fef2f2; border-color: #ef4444; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(239, 68, 68, 0.15); }
</style>