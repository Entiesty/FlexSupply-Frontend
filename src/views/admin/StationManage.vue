<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot"></span> 城市物理据点调度网络
    </div>

    <div class="admin-wrapper">
      <header class="page-header">
        <h2>🏥 物理据点管理</h2>
        <p>维护全城“食物银行”与应急枢纽，构建坚实的物资流转地基</p>
      </header>

      <div class="glass-panel">
        <div class="toolbar">
          <div class="search-zone">
            <input type="text" class="search-input" placeholder="检索据点名称..." disabled title="预留功能" />
          </div>
          <button class="action-btn btn-primary" @click="openAddDialog">
            <span class="icon">➕</span> 设立新据点
          </button>
        </div>

        <el-table :data="tableData" style="width: 100%" class="custom-table" v-loading="loading" empty-text="暂无据点数据，请先设立">

          <el-table-column prop="stationName" label="据点名称" min-width="220">
            <template #default="scope">
              <span class="station-name">{{ scope.row.stationName }}</span>
              <div class="tags-wrapper">
                <span v-if="scope.row.isEmergencyHub === 1" class="hub-tag emergency">🚨 核心应急枢纽</span>
                <span v-else class="hub-tag normal">🟢 普通社区网点</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="address" label="物理地址" min-width="250" />

          <el-table-column label="LBS 坐标 (经度 / 纬度)" width="220" align="center">
            <template #default="scope">
              <div class="coord-box">
                <span class="coord">Lon: {{ scope.row.longitude }}</span>
                <span class="coord">Lat: {{ scope.row.latitude }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="managerId" label="负责人ID" width="100" align="center">
            <template #default="scope">
              <span class="manager-badge">#{{ scope.row.managerId || '未分配' }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="createTime" label="设立时间" width="180" align="center" />
        </el-table>

        <div class="pagination-wrap" v-if="total > 0">
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

    <el-dialog v-model="dialogVisible" title="设立新物理据点" width="550px" custom-class="admin-dialog">
      <el-form :model="form" label-width="110px" @submit.prevent class="modern-form">
        <el-form-item label="据点名称" required>
          <el-input v-model="form.stationName" placeholder="例如：阳光社区爱心总站" clearable></el-input>
        </el-form-item>

        <el-form-item label="详细地址" required>
          <el-input v-model="form.address" placeholder="输入真实物理地址" clearable></el-input>
        </el-form-item>

        <div class="form-row">
          <el-form-item label="经度 (Lon)" required class="flex-1">
            <el-input v-model="form.longitude" type="number" placeholder="如: 120.15507"></el-input>
          </el-form-item>
          <el-form-item label="纬度 (Lat)" required class="flex-1">
            <el-input v-model="form.latitude" type="number" placeholder="如: 30.27408"></el-input>
          </el-form-item>
        </div>
        <p class="form-tip">精确的 LBS 坐标是系统智能调度与运力派单的核心依据。</p>

        <el-form-item label="平急两用属性">
          <el-radio-group v-model="form.isEmergencyHub">
            <el-radio :label="0">普通社区网点 (平时)</el-radio>
            <el-radio :label="1">核心应急枢纽 (灾时特保)</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="负责人 ID">
          <el-input v-model="form.managerId" type="number" placeholder="输入关联的系统用户 ID (可选)"></el-input>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false" round>取消</el-button>
          <el-button type="primary" @click="submitAdd" :loading="submitting" round>
            确认设立并入网
          </el-button>
        </span>
      </template>
    </el-dialog>

  </main>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getStationPage, addStation } from '@/api/resource' // 引入你 resource.js 中已写好的接口

// ================= 数据状态 =================
const loading = ref(false)
const tableData = ref([])
const total = ref(0)

const queryParams = ref({
  pageNum: 1,
  pageSize: 10
})

// 弹窗表单状态
const dialogVisible = ref(false)
const submitting = ref(false)
const form = reactive({
  stationName: '',
  address: '',
  longitude: '',
  latitude: '',
  isEmergencyHub: 0,
  managerId: ''
})

// ================= 核心逻辑 =================
// 1. 获取分页数据
const fetchData = async () => {
  loading.value = true
  try {
    const res = await getStationPage(queryParams.value)
    tableData.value = res.data.records || []
    total.value = res.data.total || 0
  } catch (error) {
    console.error('获取据点列表失败', error)
    ElMessage.error('无法拉取物理据点数据')
  } finally {
    loading.value = false
  }
}

// 2. 打开新增弹窗并重置表单
const openAddDialog = () => {
  form.stationName = ''
  form.address = ''
  form.longitude = ''
  form.latitude = ''
  form.isEmergencyHub = 0
  form.managerId = ''
  dialogVisible.value = true
}

// 3. 提交新增据点
const submitAdd = async () => {
  // 基础必填校验
  if (!form.stationName || !form.address || !form.longitude || !form.latitude) {
    ElMessage.warning('请完整填写据点名称、地址及坐标！')
    return
  }

  submitting.value = true
  try {
    // 数据类型转换保护
    const payload = {
      ...form,
      longitude: parseFloat(form.longitude),
      latitude: parseFloat(form.latitude),
      managerId: form.managerId ? parseInt(form.managerId) : null
    }

    await addStation(payload)
    ElMessage.success('🎉 物理据点设立成功，已接入全局调度网络！')
    dialogVisible.value = false
    fetchData() // 刷新大表
  } catch (error) {
    console.error('新增据点失败', error)
    ElMessage.error('新增失败，请检查数据格式')
  } finally {
    submitting.value = false
  }
}

// 初始化钩子
onMounted(() => {
  fetchData()
})
</script>

<style scoped>
/* =========== 框架布局对齐 =========== */
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 40px; background: #f1f5f9; min-height: 100vh; overflow-y: auto;}
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.8rem; color: #10b981; font-weight: bold; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); }
.pulse-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; animation: pulse-green 2s infinite; }
@keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

.admin-wrapper { max-width: 1200px; margin: 0 auto; width: 100%; padding-bottom: 50px;}
.page-header h2 { color: #1e293b; font-size: 2.2rem; margin: 0 0 8px 0; font-weight: 900; letter-spacing: 1px; }
.page-header p { color: #64748b; font-size: 1.1rem; margin: 0 0 30px 0; }

.glass-panel { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 24px; padding: 30px; box-shadow: 0 15px 35px rgba(0,0,0,0.06); border: 1px solid #fff; }

/* =========== 工具栏 =========== */
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.search-input { padding: 12px 18px; border: 2px solid #e2e8f0; border-radius: 12px; outline: none; transition: 0.3s; font-size: 1rem; color: #475569; background: #f8fafc; min-width: 250px; cursor: not-allowed; opacity: 0.6;}
.btn-primary { background: linear-gradient(135deg, #3b82f6, #2563eb); color: #fff; border: none; padding: 12px 24px; border-radius: 14px; font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 1rem; box-shadow: 0 6px 15px rgba(59, 130, 246, 0.25);}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(59, 130, 246, 0.35); }

/* =========== 表格样式深度定制 =========== */
:deep(.el-table) { border-radius: 16px; overflow: hidden; --el-table-border-color: transparent; }
:deep(.el-table th.el-table__cell) { background-color: #f8fafc; color: #475569; font-weight: 900; font-size: 0.95rem; padding: 18px 0; border-bottom: 2px solid #f1f5f9; }
:deep(.el-table td.el-table__cell) { padding: 18px 0; border-bottom: 1px dashed #f1f5f9; color: #334155; }
:deep(.el-table__inner-wrapper::before) { display: none; }

.station-name { font-weight: 900; font-size: 1.1rem; color: #1e293b; display: block; }
.tags-wrapper { margin-top: 6px; }
.hub-tag { font-size: 0.75rem; padding: 3px 8px; border-radius: 6px; font-weight: bold; }
.hub-tag.normal { background: #f1f5f9; color: #64748b; }
.hub-tag.emergency { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }

.coord-box { display: flex; flex-direction: column; gap: 4px; font-family: monospace; font-size: 0.95rem; color: #94a3b8; }
.manager-badge { background: #fff7ed; color: #ea580c; padding: 4px 10px; border-radius: 8px; font-weight: bold; font-family: monospace; font-size: 0.9rem;}

.pagination-wrap { display: flex; justify-content: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9; }

/* =========== 弹窗表单样式 =========== */
.form-row { display: flex; gap: 15px; }
.flex-1 { flex: 1; }
.form-tip { font-size: 0.8rem; color: #94a3b8; padding-left: 110px; margin-top: -12px; margin-bottom: 18px; font-style: italic; }
:deep(.el-dialog) { border-radius: 20px; overflow: hidden; }
:deep(.el-dialog__header) { background: #f8fafc; padding: 20px 25px; margin-right: 0; border-bottom: 1px solid #f1f5f9; font-weight: 900; }
</style>