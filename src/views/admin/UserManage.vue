<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot"></span> 用户管理中心
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
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input v-model="keyword" type="text" class="search-input" placeholder="输入登记名或手机号进行精确追溯..." @keyup.enter="fetchData" />
          </div>
          <button class="search-btn" @click="fetchData">检索档案</button>
        </div>

        <el-table :data="userList" style="width: 100%" class="custom-table" v-loading="loading" :empty-text="'✨ 暂无相关档案，快去邀请用户入驻吧！'">

          <el-table-column prop="userId" label="档案号" width="100" align="center">
            <template #default="scope"><span class="id-badge">#{{ scope.row.userId }}</span></template>
          </el-table-column>

          <el-table-column label="身份缩影" width="90" align="center">
            <template #default="scope">
              <div class="avatar-wrap">
                <img v-if="scope.row.avatar && scope.row.avatar.startsWith('http')" :src="scope.row.avatar" class="real-avatar" />
                <div v-else class="text-avatar" :class="getAvatarColor(scope.row.userId)">
                  {{ scope.row.username ? scope.row.username.charAt(0).toUpperCase() : '👤' }}
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="username" label="登记名 / 机构名" min-width="160" align="left">
            <template #default="scope">
              <div class="user-main-info">
                <span class="company-name" :title="scope.row.username">{{ scope.row.username }}</span>
                <span class="phone-text">📞 {{ scope.row.phone }}</span>
              </div>
            </template>
          </el-table-column>

          <template v-if="currentRole === 1">
            <el-table-column label="配送方式" width="110" align="center">
              <template #default="scope">
                <span :class="scope.row.deliveryType === 1 ? 'tag-need' : 'tag-self'">
                  {{ scope.row.deliveryType === 1 ? '🚪 上门' : '🏪 自取' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="坐标" width="90" align="center">
              <template #default="scope">
                <span v-if="scope.row.currentLon" class="tag-ok">📍 已设</span>
                <span v-else class="tag-warn">⚠ 缺失</span>
              </template>
            </el-table-column>
          </template>

          <template v-if="currentRole === 3">
            <el-table-column label="信誉力评级" min-width="140" align="center">
              <template #default="scope">
                <div class="credit-wrap">
                  <span class="credit-icon">🏆</span>
                  <span class="credit-text" :class="{'danger-credit': scope.row.creditScore < 80}">
                    {{ scope.row.creditScore }} 分
                  </span>
                </div>
              </template>
            </el-table-column>
          </template>

          <el-table-column label="网络流转状态" min-width="120" align="center">
            <template #default="scope">
              <div class="status-dot-wrap" :class="scope.row.status === 1 ? 'is-active' : 'is-banned'">
                <span class="status-dot"></span>
                <span class="status-text">{{ scope.row.status === 1 ? '节点在线' : '已被熔断' }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="风控干预指令" min-width="200" align="center" fixed="right">
            <template #default="scope">
              <div class="action-flex">
                <button v-if="currentRole === 1" class="action-btn btn-edit" @click="handleEditDelivery(scope.row)">🚪 改配送方式</button>

                <template v-if="currentRole === 2">
                  <button v-if="scope.row.status !== 0" class="action-btn btn-reject" @click="handleRejectMerchant(scope.row.userId)">🚫 强制清退</button>
                  <span v-else class="banned-mark">⚠️ 资产已熔断</span>
                </template>

                <template v-if="currentRole === 3">
                  <button class="action-btn btn-success" @click="handleCredit(scope.row.userId, 10)">🎖️ 嘉奖</button>
                  <button class="action-btn btn-reject" @click="handleCredit(scope.row.userId, -20)">⚔️ 追责</button>
                </template>

                <template v-if="currentRole === 4">
                  <span class="admin-safe-mark">🛡️ 底座安全节点</span>
                </template>
              </div>
            </template>
          </el-table-column>

        </el-table>

        <div class="pagination-wrap" v-if="total > 0">
          <el-pagination
              background
              layout="total, prev, pager, next"
              :total="total"
              :page-size="50"
              v-model:current-page="pageNum"
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
import { getUserList, updateUserTag, updateUserCredit, evictUser, submitAudit } from '@/api/admin'

const loading = ref(false)
const userList = ref([])
const total = ref(0)
const pageNum = ref(1)
const currentRole = ref(1)
const keyword = ref('')

// 🧠 核心补充：标签智能字典
// 保留为空, userTag已废弃

// 🎨 核心补充：根据标签动态分配颜色类名
// 🎨 为没有头像的用户动态分配多巴胺背景色
const getAvatarColor = (id) => {
  const colors = ['bg-blue', 'bg-green', 'bg-purple', 'bg-orange', 'bg-pink']
  return colors[id % colors.length]
}

const switchRole = (role) => {
  currentRole.value = role
  keyword.value = ''
  pageNum.value = 1
  fetchData()
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getUserList({ role: currentRole.value, keyword: keyword.value, pageNum: pageNum.value, pageSize: 50, isVerified: 1 })
    userList.value = res.data.records || []
    total.value = res.data.total || 0
  } catch (e) {} finally { loading.value = false }
}

const handleEditDelivery = (row) => {
  const newType = row.deliveryType === 1 ? 0 : 1
  ElMessageBox.confirm(
    `当前: ${row.deliveryType === 1 ? '🚪 仅限上门配送' : '🏪 可自行取货'} → 切换为 ${newType === 1 ? '🚪 仅上门' : '🏪 可自取'}？`,
    '🚪 修改配送方式',
    { confirmButtonText: '确认切换', cancelButtonText: '取消', type: 'warning', customClass: 'dopamine-msg-box' }
  ).then(async () => {
    try {
      await submitAudit(row.userId, true, newType)
      ElMessage.success(`配送方式已切换为: ${newType === 1 ? '🚪 仅上门' : '🏪 可自取'}！`)
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
  ElMessageBox.confirm('极其危险！清退商家将瞬间冻结其名下未接单库存，并撤销其相关派发工单！', '⚠️ 强制清退确认', {
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
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 40px; background: #f8fafc; overflow-y: auto; height: 100vh; box-sizing: border-box;}
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.8rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03); font-weight: bold;}
.pulse-dot { width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 8px #3b82f6; animation: pulse-blue 2s infinite; }
@keyframes pulse-blue { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }

.admin-wrapper { max-width: 1200px; margin: 0 auto; width: 100%; padding-bottom: 50px; }
.page-header { display: flex; align-items: center; gap: 20px; margin-bottom: 25px; }
.header-icon { font-size: 2.8rem; background: #fff; padding: 15px; border-radius: 20px; box-shadow: 0 10px 25px rgba(59, 130, 246, 0.15); }
.header-text h2 { color: #1e293b; font-size: 2rem; margin: 0 0 8px 0; font-weight: 900; }
.header-text p { color: #64748b; font-size: 1.05rem; margin: 0; font-weight: bold;}

.glass-panel { background: rgba(255, 255, 255, 0.98); border-radius: 24px; padding: 30px; box-shadow: 0 15px 35px rgba(0,0,0,0.04); border: 1px solid #fff; }

.role-tabs { display: flex; gap: 10px; margin-bottom: 25px; background: #f1f5f9; padding: 6px; border-radius: 16px; width: fit-content; flex-wrap: wrap;}
.tab-item { padding: 10px 25px; font-size: 1.05rem; font-weight: 900; color: #64748b; cursor: pointer; transition: 0.3s; border-radius: 12px; user-select: none; }
.tab-item:hover { color: #1e293b; }
.tab-item.active { background: #fff; color: #3b82f6; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }

.toolbar { display: flex; gap: 15px; margin-bottom: 25px; align-items: center;}
.search-box { flex: 1; max-width: 400px; position: relative; display: flex; align-items: center;}
.search-icon { position: absolute; left: 16px; color: #94a3b8; font-size: 1.1rem;}
.search-input { width: 100%; padding: 14px 18px 14px 42px; border: 2px solid #e2e8f0; border-radius: 14px; outline: none; transition: 0.3s; font-size: 1rem; font-weight: bold; background: #f8fafc; color: #1e293b; }
.search-input:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
.search-btn { background: #1e293b; color: #fff; border: none; padding: 0 30px; height: 50px; border-radius: 14px; font-weight: 900; cursor: pointer; transition: 0.3s; font-size: 1.05rem;}
.search-btn:hover { background: #0f172a; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(15, 23, 42, 0.2); }

/* 🌟 头像逻辑美化 */
.avatar-wrap { display: flex; justify-content: center; }
.real-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 2px solid #fff;}
.text-avatar { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 900; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 2px solid #fff;}
.bg-blue { background: linear-gradient(135deg, #60a5fa, #3b82f6); }
.bg-green { background: linear-gradient(135deg, #34d399, #10b981); }
.bg-purple { background: linear-gradient(135deg, #c084fc, #a855f7); }
.bg-orange { background: linear-gradient(135deg, #fb923c, #f97316); }
.bg-pink { background: linear-gradient(135deg, #f472b6, #ec4899); }

/* 🌟 用户基础信息排版 */
.user-main-info { display: flex; flex-direction: column; gap: 4px; text-align: left; padding-left: 10px;}
.company-name { font-weight: 900; font-size: 1.05rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
.phone-text { font-family: monospace; font-size: 0.85rem; color: #64748b; font-weight: bold; }

/* 🌟 标签与状态美化 */
.tag-badge { padding: 6px 12px; border-radius: 8px; font-weight: 900; font-size: 0.85rem; border: 1px dashed transparent; display: inline-block; white-space: nowrap;}
.tag-purple { background: #faf5ff; color: #9333ea; border-color: #e9d5ff; }
.tag-red { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
.tag-orange { background: #fff7ed; color: #ea580c; border-color: #ffedd5; }
.tag-gray { background: #f8fafc; color: #64748b; border-color: #e2e8f0; }

.status-dot-wrap { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 12px; border-radius: 20px; width: fit-content; margin: 0 auto; font-size: 0.85rem; font-weight: bold; border: 1px solid transparent;}
.status-dot-wrap.is-active { background: #ecfdf5; color: #059669; border-color: #a7f3d0;}
.status-dot-wrap.is-active .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);}
.status-dot-wrap.is-banned { background: #fef2f2; color: #dc2626; border-color: #fecaca;}
.status-dot-wrap.is-banned .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; }

.id-badge { background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-weight: 900; color: #64748b; font-size: 0.85rem; font-family: monospace;}

.credit-wrap { display: flex; align-items: center; justify-content: center; gap: 6px; background: #fffbeb; padding: 6px 12px; border-radius: 12px; border: 1px solid #fde68a; width: fit-content; margin: 0 auto;}
.credit-text { font-family: monospace; font-size: 1.1rem; color: #d97706; font-weight: 900; }
.danger-credit { color: #ef4444; }

.banned-mark { font-weight: 900; color: #ef4444; font-size: 0.85rem; background: #fef2f2; padding: 8px 14px; border-radius: 8px; border: 1px solid #fecaca;}
.admin-safe-mark { font-size: 0.85rem; color: #94a3b8; font-weight: bold; background: #f8fafc; padding: 6px 12px; border-radius: 8px;}

/* 🌟 操作区按钮 */
.action-flex { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;}
.action-btn { border: none; padding: 8px 14px; border-radius: 10px; font-weight: 900; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; }
.btn-edit { background: #f1f5f9; color: #3b82f6; }
.btn-edit:hover { background: #eff6ff; color: #2563eb; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(59, 130, 246, 0.15); }
.btn-success { background: #ecfdf5; color: #10b981; }
.btn-success:hover { background: #d1fae5; color: #059669; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(16, 185, 129, 0.15); }
.btn-reject { background: #fff; color: #ef4444; border: 1px solid #fecaca; }
.btn-reject:hover { background: #fef2f2; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(239, 68, 68, 0.15); }

/* 表格深度美化 */
:deep(.custom-table) { border-radius: 16px; overflow: hidden; --el-table-border-color: transparent; }
:deep(.custom-table th.el-table__cell) { background-color: #f8fafc; color: #475569; font-weight: 900; font-size: 0.95rem; padding: 18px 0; border-bottom: 2px solid #e2e8f0;}
:deep(.custom-table td.el-table__cell) { padding: 14px 0; border-bottom: 1px dashed #e2e8f0; color: #334155; }
:deep(.el-table__inner-wrapper::before) { display: none; }
:deep(.el-table__empty-block) { min-height: 200px; }
:deep(.el-table__empty-text) { font-weight: 900; color: #94a3b8; font-size: 1.05rem; }

.pagination-wrap { display: flex; justify-content: center; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #e2e8f0; }
</style>