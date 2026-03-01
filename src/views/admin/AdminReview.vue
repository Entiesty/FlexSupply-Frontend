<template>
  <div class="app-layout">
    <div class="main-content">

      <div class="top-status">
        <span class="pulse-dot"></span> 平台高权限核验引擎运行中 · 节点: Admin-01
      </div>

      <div class="admin-wrapper">
        <header class="page-header">
          <h2>🛡️ 系统控制中心</h2>
          <p>商户入驻资质审核台，掌控城市物资供给源头</p>
        </header>

        <div class="glass-panel" v-loading="loading">
          <el-table :data="merchants" style="width: 100%" class="custom-table" :empty-text="'暂无数据'">

            <el-table-column prop="userId" label="入驻ID" width="120" align="center">
              <template #default="scope">
                <span class="id-badge"># {{ scope.row.userId }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="username" label="营业执照企业名称" min-width="220">
              <template #default="scope">
                <span class="company-name">{{ scope.row.username }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="phone" label="负责人电话" width="160" align="center" />

            <el-table-column label="注册申请时间" width="200" align="center">
              <template #default="scope">
                <span class="time-text">{{ formatDate(scope.row.createTime) }}</span>
              </template>
            </el-table-column>

            <el-table-column label="当前状态" width="150" align="center">
              <template #default>
                <div class="status-tag">待审核</div>
              </template>
            </el-table-column>

            <el-table-column label="操作" width="220" align="center" fixed="right">
              <template #default="scope">
                <button class="action-btn btn-pass" @click="handleAudit(scope.row.userId, 1)">通过</button>
                <button class="action-btn btn-reject" @click="handleAudit(scope.row.userId, -1)">驳回</button>
              </template>
            </el-table-column>

            <template #empty>
              <div class="empty-state">
                <div class="radar-spinner-mini"></div>
                <h3>队列清空，干得漂亮！</h3>
                <p>所有爱心商家的资质均已核验完毕。</p>
              </div>
            </template>

          </el-table>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPendingMerchants, auditMerchant } from '@/api/admin.js'

const loading = ref(false)
const merchants = ref([])

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getPendingMerchants()
    merchants.value = res.data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleAudit = (userId, pass) => {
  const actionText = pass === 1 ? '通过' : '驳回'
  const confirmType = pass === 1 ? 'success' : 'warning'

  ElMessageBox.confirm(
      `您确定要 ${actionText} 该商家的入驻申请吗？`,
      '高权限操作确认',
      { confirmButtonText: '确定执行', cancelButtonText: '取消', type: confirmType }
  ).then(async () => {
    try {
      await auditMerchant(userId, pass)
      ElMessage.success(`操作成功：已${actionText}`)
      fetchData()
    } catch (e) { console.error(e) }
  }).catch(() => {})
}

onMounted(() => fetchData())
</script>

<style scoped>
/* 继承 index.vue 的底层布局基因 */
.app-layout {
  position: fixed; inset: 0; display: flex; width: 100vw; height: 100vh;
  background: #f1f5f9; overflow-y: auto; overflow-x: hidden;
}
.main-content {
  flex: 1; display: flex; flex-direction: column; position: relative; padding: 40px;
}

/* 顶部状态栏复用 */
.top-status {
  position: absolute; top: 20px; right: 30px; z-index: 100;
  background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px);
  padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; color: #64748b;
  display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}
.pulse-dot {
  width: 8px; height: 8px; background: #f97316; border-radius: 50%; /* 管理员用橙色脉冲 */
  box-shadow: 0 0 8px #f97316; animation: pulse-orange 2s infinite;
}
@keyframes pulse-orange {
  0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(249, 115, 22, 0); }
  100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
}

/* 核心容器 */
.admin-wrapper { max-width: 1200px; margin: 40px auto 0; width: 100%; }
.page-header { margin-bottom: 30px; }
.page-header h2 { color: #1e293b; font-size: 2.2rem; margin: 0 0 8px 0; font-weight: 900; letter-spacing: 1px; }
.page-header p { color: #64748b; font-size: 1.1rem; margin: 0; }

/* 完美复刻 index.vue 的玻璃拟态面板 */
.glass-panel {
  background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px);
  padding: 30px; border-radius: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.06);
}

/* 深度驯化 Element Plus 表格 */
:deep(.custom-table) {
  background: transparent;
  --el-table-border-color: #f1f5f9;
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #475569;
  border-radius: 12px;
  overflow: hidden;
}
:deep(.custom-table th.el-table__cell) { font-weight: 800; border-bottom: 2px solid #e2e8f0; padding: 16px 0; }
:deep(.custom-table td.el-table__cell) { border-bottom: 1px solid #f1f5f9; padding: 16px 0; color: #334155; }
:deep(.custom-table::before) { display: none; /* 隐藏原生底边框 */ }

/* 表格内部元素定制 */
.id-badge { background: #f1f5f9; padding: 4px 10px; border-radius: 8px; font-weight: bold; color: #64748b; font-size: 0.85rem; }
.company-name { font-weight: bold; font-size: 1.05rem; color: #1e293b; }
.time-text { color: #64748b; font-size: 0.9rem; }
.status-tag {
  display: inline-block; background: #fff7ed; color: #f97316;
  padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 0.85rem;
  border: 1px solid #ffedd5;
}

/* 操作按钮 */
.action-btn {
  border: none; padding: 8px 18px; border-radius: 10px; font-weight: bold;
  cursor: pointer; transition: all 0.2s; font-size: 0.9rem; margin: 0 5px;
}
.btn-pass { background: #ecfdf5; color: #10b981; }
.btn-pass:hover { background: #10b981; color: white; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2); }
.btn-reject { background: #fef2f2; color: #ef4444; }
.btn-reject:hover { background: #ef4444; color: white; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(239, 68, 68, 0.2); }

/* 空状态复刻 */
.empty-state { padding: 60px 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.empty-state h3 { color: #1e293b; margin: 20px 0 5px 0; font-size: 1.3rem; }
.empty-state p { color: #64748b; font-size: 0.95rem; }
.radar-spinner-mini {
  width: 40px; height: 40px; border: 4px solid #f1f5f9; border-top-color: #10b981;
  border-radius: 50%; animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>