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

          <el-table-column prop="userId" label="入驻ID" width="100" align="center">
            <template #default="scope">
              <span class="id-badge"># {{ scope.row.userId }}</span>
            </template>
          </el-table-column>

          <el-table-column label="身份 / 人群标签" width="160" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.role === 1" type="warning" effect="dark" round>受赠方</el-tag>
              <el-tag v-else-if="scope.row.role === 2" type="success" effect="dark" round>爱心商家</el-tag>
              <el-tag v-else-if="scope.row.role === 3" type="info" effect="dark" round>志愿者</el-tag>
              <div class="tag-subtext" v-if="scope.row.role === 1">{{ formatUserTag(scope.row.userTag) }}</div>
            </template>
          </el-table-column>

          <el-table-column prop="username" label="真实姓名/企业名称" min-width="180">
            <template #default="scope">
              <span class="company-name">{{ scope.row.username }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="phone" label="联系电话" width="140" align="center">
            <template #default="scope">
              <span class="phone-text">{{ scope.row.phone }}</span>
            </template>
          </el-table-column>

          <el-table-column label="资质凭证" width="120" align="center">
            <template #default="scope">
              <el-image
                  v-if="scope.row.identityProofUrl"
                  style="width: 50px; height: 50px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
                  :src="scope.row.identityProofUrl"
                  :preview-src-list="[scope.row.identityProofUrl]"
                  preview-teleported
                  fit="cover"
              />
              <span v-else class="no-img">未上传</span>
            </template>
          </el-table-column>

          <el-table-column label="操作指令" width="220" align="center" fixed="right">
            <template #default="scope">
              <button class="action-btn btn-pass" @click="handleAudit(scope.row.userId, true)">通过</button>
              <button class="action-btn btn-reject" @click="handleAudit(scope.row.userId, false)">驳回</button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrap">
          <el-pagination
              background
              layout="total, prev, pager, next"
              :total="total"
              :page-size="queryParams.pageSize"
              v-model:current-page="queryParams.pageNum"
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
// 🚨 务必确保你的 api/admin.js 已经按照上一条回复修改了接口路径
import { getAuditPage, submitAudit } from '@/api/admin'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)

const queryParams = ref({
  pageNum: 1,
  pageSize: 10
})

// 翻译受赠方群体标签
const formatUserTag = (tag) => {
  const map = {
    'ELDERLY': '需照顾老人',
    'DISABLED': '残障人士',
    'SAN_WORKER': '环卫工人',
    'NORMAL': '普通求助者'
  }
  return map[tag] || tag
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getAuditPage(queryParams.value)
    // 适配 MyBatis-Plus 的 Page 对象结构
    tableData.value = res.data.records || []
    total.value = res.data.total || 0
  } catch (e) {
    console.error('获取列表失败', e)
  } finally {
    loading.value = false
  }
}

const handleAudit = (userId, isPass) => {
  const actionName = isPass ? '通过' : '驳回'
  const actionType = isPass ? 'success' : 'warning'

  ElMessageBox.confirm(`确定要 ${actionName} 该用户的资质审核吗？`, '高权限流转确认', {
    confirmButtonText: `确定${actionName}`,
    cancelButtonText: '暂不处理',
    type: actionType
  }).then(async () => {
    loading.value = true
    try {
      await submitAudit(userId, isPass)
      ElMessage.success(`指令已执行：审核已${actionName}`)
      fetchData() // 刷新拉取最新列表
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }).catch(() => {})
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
/* 继承全局框架的纯粹间距 */
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 40px; }

/* 右上角呼吸灯监控 */
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); }
.pulse-dot { width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 8px #3b82f6; animation: pulse-blue 2s infinite; }
@keyframes pulse-blue { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }

.admin-wrapper { max-width: 1200px; margin: 20px auto 0; width: 100%; }
.page-header h2 { color: #1e293b; font-size: 2.2rem; margin: 0 0 8px 0; font-weight: 900; letter-spacing: 1px; }
.page-header p { color: #64748b; font-size: 1.1rem; margin: 0 0 30px 0; }

/* 玻璃面板基底 */
.glass-panel { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 24px; padding: 25px; box-shadow: 0 15px 35px rgba(0,0,0,0.06); border: 1px solid #f8fafc; }

/* Element Plus 表格深度美化 */
:deep(.el-table) { border-radius: 16px; overflow: hidden; --el-table-border-color: transparent; }
:deep(.el-table th.el-table__cell) { background-color: #f8fafc; color: #475569; font-weight: 900; font-size: 0.95rem; padding: 18px 0; border-bottom: 2px solid #f1f5f9; }
:deep(.el-table td.el-table__cell) { padding: 15px 0; border-bottom: 1px dashed #f1f5f9; color: #334155; }
:deep(.el-table__inner-wrapper::before) { display: none; }

.id-badge { background: #f1f5f9; padding: 6px 12px; border-radius: 8px; font-weight: 900; color: #64748b; font-size: 0.9rem; }
.company-name { font-weight: 900; font-size: 1.05rem; color: #0f172a; }
.phone-text { font-family: monospace; font-size: 1.05rem; color: #475569; font-weight: bold; }
.tag-subtext { font-size: 0.75rem; color: #94a3b8; margin-top: 4px; font-weight: bold; }
.no-img { font-size: 0.8rem; color: #cbd5e1; }

/* 拟物化操作按钮 */
.action-btn { border: none; padding: 8px 16px; border-radius: 10px; font-weight: 900; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; margin: 0 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.btn-pass { background: #ecfdf5; color: #10b981; border: 1px solid #d1fae5; }
.btn-pass:hover { background: #10b981; color: white; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(16, 185, 129, 0.25); }
.btn-reject { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
.btn-reject:hover { background: #ef4444; color: white; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(239, 68, 68, 0.25); }

/* 分页条居中 */
.pagination-wrap { display: flex; justify-content: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid #f1f5f9; }
</style>