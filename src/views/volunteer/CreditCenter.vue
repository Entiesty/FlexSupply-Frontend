<template>
  <div class="app-layout">
    <SideMenu />

    <main class="main-content">
      <div class="top-status">
        <span class="pulse-dot"></span> 信用积分引擎实时测算中...
      </div>

      <div class="credit-container">
        <div class="honor-card">
          <div class="card-bg-glow"></div>
          <div class="honor-content">
            <div class="left-info">
              <div class="level-badge">🎖️ {{ dashboardData.levelName }}</div>
              <h2 class="score-number">{{ dashboardData.creditScore }} <span class="unit">分</span></h2>
              <p class="beat-text">您当前的信誉分已击败全城 <strong>{{ dashboardData.beatPercentage }}%</strong> 的爱心志愿者</p>
            </div>
            <div class="right-icon">🏆</div>
          </div>

          <div class="progress-box">
            <div class="p-labels">
              <span>当前: {{ dashboardData.levelName }}</span>
              <span>下一等级解锁: {{ nextLevelScore }} 分</span>
            </div>
            <div class="progress-bar">
              <div class="progress-inner" :style="{ width: progressPercent + '%' }"></div>
            </div>
          </div>
        </div>

        <div class="logs-section" v-loading="loading">
          <h3 class="section-title">📊 积分变动明细</h3>
          <el-empty v-if="logs.length === 0" description="暂无积分流水，快去抢单大厅接单吧！" />

          <div class="log-list" v-else>
            <div class="log-item" v-for="log in logs" :key="log.logId">
              <div class="log-icon" :class="log.changeValue > 0 ? 'plus' : 'minus'">
                {{ log.changeValue > 0 ? '+' : '-' }}
              </div>
              <div class="log-detail">
                <div class="log-reason">{{ log.reason }}</div>
                <div class="log-time">{{ formatDate(log.createTime) }}</div>
                <div class="log-order" v-if="log.orderId">关联订单 ID: {{ log.orderId }}</div>
              </div>
              <div class="log-score" :class="log.changeValue > 0 ? 'text-green' : 'text-red'">
                {{ log.changeValue > 0 ? '+' : '' }}{{ log.changeValue }}
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import SideMenu from '@/views/dispatch/components/SideMenu.vue'
import { getCreditDashboard, getCreditLogs } from '@/api/volunteer'

const loading = ref(false)
const dashboardData = ref({ creditScore: 100, beatPercentage: 0, levelName: '青铜微光' })
const logs = ref([])

// 动态计算进度条逻辑
const nextLevelScore = computed(() => {
  const score = dashboardData.value.creditScore
  if (score < 120) return 120
  if (score < 200) return 200
  if (score < 300) return 300
  return 999 // 满级
})

const progressPercent = computed(() => {
  const score = dashboardData.value.creditScore
  const target = nextLevelScore.value
  if (target === 999) return 100
  return Math.min(100, Math.max(0, (score / target) * 100))
})

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}

const fetchData = async () => {
  loading.value = true
  try {
    const dashRes = await getCreditDashboard()
    dashboardData.value = dashRes.data

    const logRes = await getCreditLogs(1, 50)
    logs.value = logRes.data.records || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchData())
</script>

<style scoped>
.app-layout { position: fixed; inset: 0; display: flex; width: 100vw; height: 100vh; background: #f1f5f9; overflow-y: auto; overflow-x: hidden; }
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 20px; }
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); }
.pulse-dot { width: 8px; height: 8px; background: #f59e0b; border-radius: 50%; box-shadow: 0 0 8px #f59e0b; animation: pulse-yellow 2s infinite; }
@keyframes pulse-yellow { 0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); } 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); } }

.credit-container { max-width: 600px; width: 100%; margin: 40px auto; }

/* 超炫酷的荣誉卡片 */
.honor-card { position: relative; background: #1e293b; border-radius: 24px; padding: 30px; color: #fff; overflow: hidden; box-shadow: 0 15px 35px rgba(30, 41, 59, 0.2); margin-bottom: 30px; }
.card-bg-glow { position: absolute; top: -50%; right: -20%; width: 300px; height: 300px; background: radial-gradient(circle, rgba(245,158,11,0.3) 0%, rgba(245,158,11,0) 70%); border-radius: 50%; }
.honor-content { display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 2; margin-bottom: 25px; }
.level-badge { display: inline-block; background: linear-gradient(135deg, #f59e0b, #ea580c); padding: 6px 14px; border-radius: 20px; font-weight: 900; font-size: 0.85rem; margin-bottom: 10px; box-shadow: 0 4px 10px rgba(245,158,11,0.3); }
.score-number { font-size: 3.5rem; margin: 0; font-weight: 900; letter-spacing: -1px; text-shadow: 0 4px 10px rgba(0,0,0,0.3); }
.unit { font-size: 1.2rem; font-weight: normal; color: #94a3b8; }
.beat-text { font-size: 0.9rem; color: #cbd5e1; margin: 5px 0 0; line-height: 1.5; }
.beat-text strong { color: #fcd34d; font-size: 1.1rem; }
.right-icon { font-size: 5rem; opacity: 0.9; filter: drop-shadow(0 10px 10px rgba(0,0,0,0.3)); transform: rotate(15deg); }

/* 进度条 */
.progress-box { position: relative; z-index: 2; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); }
.p-labels { display: flex; justify-content: space-between; font-size: 0.8rem; color: #94a3b8; margin-bottom: 8px; font-weight: bold; }
.progress-bar { height: 8px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; }
.progress-inner { height: 100%; background: linear-gradient(90deg, #f59e0b, #fbbf24); border-radius: 10px; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); }

/* 流水列表 */
.logs-section { background: #fff; border-radius: 24px; padding: 25px; box-shadow: 0 8px 20px rgba(0,0,0,0.03); }
.section-title { margin: 0 0 20px; font-size: 1.2rem; color: #1e293b; font-weight: 900; }
.log-list { display: flex; flex-direction: column; gap: 15px; }
.log-item { display: flex; align-items: center; gap: 15px; padding-bottom: 15px; border-bottom: 1px dashed #f1f5f9; }
.log-item:last-child { border-bottom: none; padding-bottom: 0; }
.log-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 900; flex-shrink: 0; }
.log-icon.plus { background: #ecfdf5; color: #10b981; }
.log-icon.minus { background: #fef2f2; color: #ef4444; }
.log-detail { flex: 1; }
.log-reason { font-weight: bold; color: #334155; font-size: 1rem; margin-bottom: 4px; }
.log-time { font-size: 0.8rem; color: #94a3b8; }
.log-order { font-size: 0.75rem; color: #cbd5e1; margin-top: 2px; }
.log-score { font-size: 1.4rem; font-weight: 900; }
.text-green { color: #10b981; }
.text-red { color: #ef4444; }
</style>