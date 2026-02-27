<template>
  <div class="my-tasks-container">
    <h2 class="page-title">🚴 我的配送任务</h2>

    <div v-if="taskState === 2" class="task-executing-card">
      <div class="status-header">
        <span class="pulsing-dot"></span> 正在火速配送中...
      </div>
      <div class="task-info">
        <p>📦 目标：将温暖送达社区受赠方</p>
        <p>📍 单号：{{ currentTaskId }}</p>
        <p>🚴 状态：已取货，前往目的地</p>
      </div>

      <button class="finish-btn" @click="handleCompleteDelivery">
        ✅ 我已当面交接，确认送达
      </button>
    </div>

    <div v-else class="task-completed-card">
      <h3>✨ 当前暂无执行中的任务</h3>
      <p>休息一下，或者去“实时调度大屏”寻找新的调度任务吧！</p>
      <button class="reset-btn" @click="goToMap">去地图找单</button>
    </div>
  </div>
</template>

<script setup>
import { ref, h } from 'vue'
import { useRouter } from 'vue-router'
import { ElNotification, ElMessage } from 'element-plus'
// import request from '@/utils/request' // 记得解开这个注释

const router = useRouter()

// 模拟状态：现实中应该在 onMounted 时向后端请求“我当前正在执行的任务”
const currentTaskId = ref('TASK-20260227-001')
const taskState = ref(2) // 2代表正在配送中

// 确认送达
const handleCompleteDelivery = async () => {
  try {
    // 假设这是真实接口调用
    // const res = await request.post(`/dispatch/task/checkout?taskId=1`) // 传真实的taskId

    // 模拟接口成功
    taskState.value = 3
    showRewardAnimation()

  } catch (error) {
    console.error('送达请求异常', error)
  }
}

// 专属粘土风奖励弹窗
const showRewardAnimation = () => {
  ElNotification({
    title: '🎉 配送圆满完成！',
    message: h('div', { style: 'display: flex; align-items: center; gap: 15px; margin-top: 10px;' }, [
      h('img', {
        src: '/apple-touch-icon.png', // 🚨 你的俏皮笑脸图标
        style: 'width: 50px; height: 50px; border-radius: 12px; box-shadow: 0 4px 12px rgba(249,115,22,0.3);'
      }),
      h('div', null, [
        h('div', { style: 'color: #1e293b; font-size: 14px; margin-bottom: 4px;' }, '感谢你的爱心传递'),
        h('div', { style: 'color: #f97316; font-weight: 900; font-size: 18px;' }, '信誉分 +5 🌟')
      ])
    ]),
    type: 'success',
    duration: 4500,
    position: 'top-right'
  })
}

const goToMap = () => {
  router.push('/map')
}
</script>

<style scoped>
.my-tasks-container {
  padding: 30px;
  background-color: #f8fafc;
  min-height: 100vh;
}

.page-title {
  color: #1e293b;
  margin-bottom: 20px;
}

.task-executing-card {
  background: #fff;
  border: 2px solid #f97316;
  border-radius: 16px;
  padding: 25px;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(249, 115, 22, 0.1);
}

.status-header {
  font-size: 18px;
  font-weight: 900;
  color: #f97316;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

/* 呼吸灯动画 */
.pulsing-dot {
  width: 12px;
  height: 12px;
  background-color: #f97316;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7); }
  70% { box-shadow: 0 0 0 12px rgba(249, 115, 22, 0); }
  100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
}

.task-info p {
  margin: 10px 0;
  color: #475569;
  font-size: 15px;
  font-weight: bold;
}

.finish-btn {
  width: 100%;
  margin-top: 20px;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: white;
  border: none;
  padding: 15px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.finish-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(234, 88, 12, 0.3);
}

.task-completed-card {
  text-align: center;
  padding: 40px;
  background: #fff;
  border-radius: 16px;
  color: #64748b;
  max-width: 500px;
  border: 1px dashed #cbd5e1;
}

.reset-btn {
  margin-top: 20px;
  background: #f97316;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}
</style>