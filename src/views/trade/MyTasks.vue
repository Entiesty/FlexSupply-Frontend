<template>
  <div class="app-layout">
    <SideMenu/>

    <main class="main-content">
      <div class="top-status">
        <span class="pulse-dot"></span> 骑手调度终端在线 · 保持通讯畅通
      </div>

      <div class="tasks-container">
        <header class="page-header">
          <h2 class="title">🚴 骑手工作台</h2>
          <div class="credit-badge">我的信誉：<span class="score">{{ myCredit }}</span></div>
        </header>

        <div class="tabs">
          <div class="tab-item" :class="{ active: activeTab === 'available' }" @click="switchTab('available')">
            抢单大厅 <span class="badge" v-if="availableCount">{{ availableCount }}</span>
          </div>
          <div class="tab-item" :class="{ active: activeTab === 'delivering' }" @click="switchTab('delivering')">
            待配送
          </div>
          <div class="tab-item" :class="{ active: activeTab === 'completed' }" @click="switchTab('completed')">已完成
          </div>
        </div>

        <div class="task-list" v-loading="loading">
          <el-empty v-if="taskList.length === 0" description="暂无相关任务哦~"/>

          <div class="task-card" v-for="item in taskList" :key="item.id || item.orderId || item.taskId">
            <div class="card-header">
              <span class="order-no">订单号: {{ item.orderNo || item.orderSn || 'ORD-SYS-NEW' }}</span>
              <span class="urgency" :class="'level-' + (item.urgencyLevel || 1)">
                {{ getUrgencyText(item.urgencyLevel) }}
              </span>
            </div>

            <div class="card-body">
              <div class="location-box">
                <div class="loc-item">
                  <span class="icon from">取</span>
                  <div class="loc-text">
                    <div class="loc-name">{{ item.stationName || '社区中心物资站' }}</div>
                    <div class="loc-user">{{ item.stationAddress || '等待系统分配位置' }}</div>
                  </div>
                </div>
                <div class="loc-line"></div>
                <div class="loc-item">
                  <span class="icon to">送</span>
                  <div class="loc-text">
                    <div class="loc-name">{{ item.receiverAddress || '受赠方地址' }}</div>
                    <div class="loc-user">{{ item.receiverName || '求助者' }} · 距您约 {{ item.distance || 1.5 }} km
                    </div>
                  </div>
                </div>
              </div>

              <div class="material-info">
                📦 物资要求：<span class="m-highlight">{{
                  item.requiredCategory || item.materialName || '综合救助包'
                }}</span>
              </div>
            </div>

            <div class="card-footer">
              <button v-if="activeTab === 'available'" class="action-btn grab-btn" @click="handleGrab(item)">
                ⚡ 立即抢单
              </button>

              <button v-if="activeTab === 'delivering'" class="action-btn complete-btn" @click="handleComplete(item)">
                ✅ 确认送达
              </button>

              <span v-if="activeTab === 'completed'" class="status-text success">🎉 已核销，信誉分 +10</span>
            </div>
          </div>
        </div>

        <transition name="bounce">
          <div class="clay-overlay" v-if="showClayPopup">
            <div class="clay-card">
              <div class="clay-icon">🏆</div>
              <h3 class="clay-title">送达成功！</h3>
              <p class="clay-desc">感谢您的爱心传递</p>
              <div class="clay-score">+10 信誉分</div>
              <button class="clay-btn" @click="closePopup">继续接单</button>
            </div>
          </div>
        </transition>
      </div>
    </main>
  </div>
</template>

<script setup>
import {ref, onMounted} from 'vue'
import {ElMessage} from 'element-plus'
// 🚨 注意引入路径：使用全局绝对路径 @ 确保不会因为目录层级报错
import SideMenu from '@/views/dispatch/components/SideMenu.vue'
import { getAvailableOrders, grabTask, getMyTasks, checkOutTask } from '@/api/trade'

const activeTab = ref('available')
const loading = ref(false)
const taskList = ref([])
const availableCount = ref(0)
const myCredit = ref(120)

const showClayPopup = ref(false)

const switchTab = (tab) => {
  activeTab.value = tab
  fetchData()
}

const getUrgencyText = (level) => {
  const map = {1: '普通', 2: '较急', 3: '十万火急'}
  return map[level] || '普通'
}

const fetchData = async () => {
  loading.value = true
  taskList.value = []
  try {
    if (activeTab.value === 'available') {
      const res = await getAvailableOrders()
      taskList.value = res.data.records || res.data || []
      availableCount.value = taskList.value.length
    } else if (activeTab.value === 'delivering') {
      const res = await getMyTasks(1) // 1为待配送
      taskList.value = res.data.records || res.data || []
    } else if (activeTab.value === 'completed') {
      const res = await getMyTasks(3) // 3为已完成
      taskList.value = res.data.records || res.data || []
    }
  } catch (e) {
    console.error('获取列表失败', e)
  } finally {
    loading.value = false
  }
}

const handleGrab = async (item) => {
  try {
    const id = item.id || item.orderId
    await grabTask(id)
    ElMessage.success('抢单成功！快去配送吧')
    switchTab('delivering')
  } catch (e) {
    ElMessage.warning('抢单失败：可能已被他人抢走')
  }
}

const handleComplete = async (item) => {
  try {
    const id = item.id || item.taskId
    await checkOutTask(id)
    showClayPopup.value = true
    myCredit.value += 10
  } catch (e) {
    console.error('核销失败', e)
  }
}

const closePopup = () => {
  showClayPopup.value = false
  switchTab('completed')
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
/* 🚨 最外层采用和大屏 index.vue 极其相似的左右切分布局 */
.app-layout {
  position: fixed;
  inset: 0;
  display: flex;
  width: 100vw;
  height: 100vh;
  background: #f1f5f9;
  overflow-y: auto;
  overflow-x: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  padding: 20px;
}

/* 顶部状态栏复用 */
.top-status {
  position: absolute;
  top: 20px;
  right: 30px;
  z-index: 100;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.75rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border-radius: 50%;
  box-shadow: 0 0 8px #3b82f6;
  animation: pulse-blue 2s infinite;
}

@keyframes pulse-blue {
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(59, 130, 246, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}

/* 🚨 工作台中心区域：限制最大宽度，模拟移动端/平板体验 */
.tasks-container {
  max-width: 600px;
  width: 100%;
  margin: 40px auto; /* 居中显示 */
  background: transparent;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.title {
  font-size: 1.6rem;
  color: #1e293b;
  margin: 0;
  font-weight: 900;
}

.credit-badge {
  background: #ffedd5;
  color: #ea580c;
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 0.9rem;
  border: 1px solid #fed7aa;
}

.score {
  font-size: 1.1rem;
}

/* Tabs 样式 */
.tabs {
  display: flex;
  background: #fff;
  border-radius: 16px;
  padding: 6px;
  margin-bottom: 20px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-weight: bold;
  color: #64748b;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.tab-item.active {
  background: #3b82f6;
  color: #fff;
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
}

.badge {
  position: absolute;
  top: 4px;
  right: 15%;
  background: #ef4444;
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  line-height: 1;
}

/* 任务卡片样式 */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.task-card {
  background: #fff;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
  border: 1px solid #f8fafc;
  transition: transform 0.2s;
}

.task-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  border-bottom: 2px dashed #f1f5f9;
  padding-bottom: 12px;
  margin-bottom: 15px;
  font-size: 0.85rem;
}

.order-no {
  color: #94a3b8;
  font-weight: bold;
}

.urgency {
  font-weight: bold;
  padding: 4px 10px;
  border-radius: 8px;
}

.level-1 {
  background: #ecfdf5;
  color: #10b981;
}

.level-2 {
  background: #fef3c7;
  color: #d97706;
}

.level-3 {
  background: #fee2e2;
  color: #ef4444;
}

.location-box {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 18px;
}

.loc-item {
  display: flex;
  align-items: flex-start;
  gap: 15px;
}

.icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
  flex-shrink: 0;
  z-index: 2;
}

.from {
  background: #3b82f6;
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
}

.to {
  background: #f97316;
  box-shadow: 0 4px 10px rgba(249, 115, 22, 0.3);
}

.loc-line {
  position: absolute;
  left: 13px;
  top: 25px;
  bottom: 25px;
  width: 2px;
  background: #e2e8f0;
  z-index: 1;
}

.loc-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.loc-name {
  font-weight: 900;
  color: #334155;
  font-size: 1.1rem;
}

.loc-user {
  font-size: 0.85rem;
  color: #64748b;
}

.material-info {
  background: #f8fafc;
  padding: 12px 15px;
  border-radius: 12px;
  font-size: 0.9rem;
  color: #475569;
  border: 1px solid #f1f5f9;
}

.m-highlight {
  font-weight: 900;
  color: #ea580c;
}

.card-footer {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
}

.action-btn {
  border: none;
  padding: 12px 28px;
  border-radius: 12px;
  font-weight: 900;
  color: #fff;
  cursor: pointer;
  transition: 0.2s;
  font-size: 1rem;
}

.grab-btn {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.grab-btn:hover {
  box-shadow: 0 6px 18px rgba(59, 130, 246, 0.4);
  transform: scale(1.02);
}

.complete-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.complete-btn:hover {
  box-shadow: 0 6px 18px rgba(16, 185, 129, 0.4);
  transform: scale(1.02);
}

.status-text {
  font-weight: 900;
  font-size: 1rem;
  background: #ecfdf5;
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid #d1fae5;
}

.success {
  color: #10b981;
}

/* 黏土风弹窗保持原样... */
.clay-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.clay-card {
  width: 280px;
  background: #f8fafc;
  border-radius: 36px;
  padding: 30px 20px;
  text-align: center;
  box-shadow: 30px 30px 60px rgba(0, 0, 0, 0.15), -10px -10px 20px rgba(255, 255, 255, 0.8), inset 4px 4px 10px rgba(255, 255, 255, 0.9), inset -4px -4px 15px rgba(0, 0, 0, 0.05);
  border: 4px solid #ffffff;
}

.clay-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 15px;
  background: #ffedd5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  box-shadow: inset 5px 5px 10px rgba(255, 255, 255, 0.8), inset -5px -5px 10px rgba(234, 88, 12, 0.1), 10px 10px 20px rgba(0, 0, 0, 0.05);
}

.clay-title {
  margin: 0 0 5px;
  color: #1e293b;
  font-size: 1.4rem;
  font-weight: 900;
}

.clay-desc {
  margin: 0 0 20px;
  color: #64748b;
  font-size: 0.9rem;
}

.clay-score {
  margin: 0 auto 25px;
  padding: 10px;
  background: #ecfdf5;
  color: #10b981;
  font-weight: 900;
  font-size: 1.5rem;
  border-radius: 16px;
  width: fit-content;
  box-shadow: inset 3px 3px 6px rgba(255, 255, 255, 0.8), inset -3px -3px 6px rgba(16, 185, 129, 0.1);
}

.clay-btn {
  width: 80%;
  padding: 14px;
  border: none;
  border-radius: 20px;
  background: #3b82f6;
  color: white;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 6px 6px 12px rgba(59, 130, 246, 0.3), inset 3px 3px 8px rgba(255, 255, 255, 0.4), inset -3px -3px 8px rgba(0, 0, 0, 0.1);
  transition: 0.2s;
}

.clay-btn:active {
  box-shadow: inset 4px 4px 10px rgba(0, 0, 0, 0.2), inset -4px -4px 10px rgba(255, 255, 255, 0.2);
  transform: scale(0.96);
}

.bounce-enter-active {
  animation: bounce-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.bounce-leave-active {
  animation: bounce-in 0.4s reverse;
}

@keyframes bounce-in {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>