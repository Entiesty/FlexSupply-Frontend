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
              <p class="beat-text">您当前的信誉分已超越全城 <strong>{{ dashboardData.beatPercentage }}%</strong> 的{{ userRole === 2 ? '爱心商铺' : '城市护航骑士' }}</p>
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
          <el-empty v-if="logs.length === 0" description="暂无积分流水，快去参与爱心援助吧！" />

          <div class="log-list" v-else>
            <div class="log-item" v-for="log in logs" :key="log.logId">
              <div class="log-icon" :class="log.changeValue > 0 ? 'plus' : 'minus'">
                {{ log.changeValue > 0 ? '⭐' : '⚠️' }}
              </div>

              <div class="log-detail">
                <div class="log-reason">{{ log.reason || '系统信誉分结算' }}</div>

                <div class="log-meta">
                  <span class="log-time">
                    <el-icon><Clock /></el-icon> {{ formatDate(log.createTime) }}
                  </span>
                  <span class="log-order" v-if="log.orderId">
                    <el-icon><Ticket /></el-icon> 护航追溯码: {{ log.orderSn || `SYS-${10000 + log.orderId}` }}
                  </span>
                </div>
              </div>

              <div class="log-score" :class="log.changeValue > 0 ? 'text-green' : 'text-red'">
                {{ log.changeValue > 0 ? '+' : '' }}{{ log.changeValue }}
                <span class="score-unit">分</span>
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
import { getUserProfile } from '@/api/user' // 🚨 新增引入：用于获取用户身份
import { Clock, Ticket } from '@element-plus/icons-vue'

const loading = ref(false)
const dashboardData = ref({ creditScore: 100, beatPercentage: 0, levelName: '青铜微光' })
const logs = ref([])
const userRole = ref(3) // 🚨 新增：默认 3 为骑士，后续接口动态覆盖

const nextLevelScore = computed(() => {
  const score = dashboardData.value.creditScore
  if (score < 120) return 120
  if (score < 200) return 200
  if (score < 300) return 300
  return 999
})

const progressPercent = computed(() => {
  const score = dashboardData.value.creditScore
  const target = nextLevelScore.value
  if (target === 999) return 100
  return Math.min(100, Math.max(0, (score / target) * 100))
})

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${min}`
}

const fetchData = async () => {
  loading.value = true
  try {
    // 🚨 核心逻辑变更：先查出当前操作人的真实角色
    const userRes = await getUserProfile()
    if (userRes.data) {
      userRole.value = userRes.data.role
    }

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
.app-layout { position: fixed; inset: 0; display: flex; width: 100vw; height: 100vh; background: #f8fafc; overflow-y: auto; overflow-x: hidden; }
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 20px; }
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); padding: 10px 18px; border-radius: 20px; font-size: 0.8rem; color: #475569; font-weight: bold; display: flex; align-items: center; gap: 8px; box-shadow: 0 6px 15px rgba(0, 0, 0, 0.05); }
.pulse-dot { width: 8px; height: 8px; background: #f59e0b; border-radius: 50%; box-shadow: 0 0 8px #f59e0b; animation: pulse-yellow 2s infinite; }
@keyframes pulse-yellow { 0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); } 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); } }

.credit-container { max-width: 650px; width: 100%; margin: 50px auto; }

/* 超炫酷的荣誉卡片 */
.honor-card { position: relative; background: #1e293b; border-radius: 28px; padding: 35px; color: #fff; overflow: hidden; box-shadow: 0 20px 40px rgba(30, 41, 59, 0.25); margin-bottom: 35px; }
.card-bg-glow { position: absolute; top: -50%; right: -20%; width: 350px; height: 350px; background: radial-gradient(circle, rgba(245,158,11,0.25) 0%, rgba(245,158,11,0) 70%); border-radius: 50%; }
.honor-content { display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 2; margin-bottom: 25px; }
.level-badge { display: inline-block; background: linear-gradient(135deg, #f59e0b, #ea580c); padding: 6px 16px; border-radius: 20px; font-weight: 900; font-size: 0.9rem; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(245,158,11,0.4); }
.score-number { font-size: 4rem; margin: 0; font-weight: 900; letter-spacing: -1px; text-shadow: 0 4px 10px rgba(0,0,0,0.3); }
.unit { font-size: 1.2rem; font-weight: normal; color: #94a3b8; }
.beat-text { font-size: 0.95rem; color: #cbd5e1; margin: 5px 0 0; line-height: 1.5; }
.beat-text strong { color: #fcd34d; font-size: 1.2rem; }
.right-icon { font-size: 6rem; opacity: 0.9; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.4)); transform: rotate(15deg); }

.progress-box { position: relative; z-index: 2; background: rgba(255,255,255,0.06); padding: 18px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.1); }
.p-labels { display: flex; justify-content: space-between; font-size: 0.85rem; color: #cbd5e1; margin-bottom: 10px; font-weight: bold; }
.progress-bar { height: 10px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; }
.progress-inner { height: 100%; background: linear-gradient(90deg, #fcd34d, #f59e0b); border-radius: 10px; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 0 10px rgba(245,158,11,0.5);}

/* 流水列表样式 */
.logs-section { background: #fff; border-radius: 28px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.04); }
.section-title { margin: 0 0 25px; font-size: 1.3rem; color: #0f172a; font-weight: 900; }
.log-list { display: flex; flex-direction: column; gap: 16px; }

.log-item {
  display: flex;
  align-items: center;
  gap: 18px;
  background: #f8fafc;
  padding: 20px;
  border-radius: 20px;
  border: 1px solid #f1f5f9;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.log-item:hover {
  transform: translateX(6px);
  background: #fff;
  border-color: #e2e8f0;
  box-shadow: 0 8px 20px rgba(0,0,0,0.04);
}

.log-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  flex-shrink: 0;
  box-shadow: inset 0 -3px 0 rgba(0,0,0,0.1);
}
.log-icon.plus { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #d97706; text-shadow: 0 2px 4px rgba(217, 119, 6, 0.2);}
.log-icon.minus { background: linear-gradient(135deg, #fee2e2, #fecaca); color: #ef4444; }

.log-detail { flex: 1; overflow: hidden; }
.log-reason { font-weight: 900; color: #1e293b; font-size: 1.05rem; margin-bottom: 8px; }

.log-meta { display: flex; align-items: center; gap: 15px; flex-wrap: wrap;}
.log-time { font-size: 0.85rem; color: #64748b; font-weight: bold; display: flex; align-items: center; gap: 5px;}

.log-order {
  font-size: 0.8rem;
  color: #2563eb;
  background: #eff6ff;
  padding: 4px 10px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 800;
  border: 1px solid #bfdbfe;
  font-family: monospace;
}

.log-score { font-size: 1.8rem; font-weight: 900; font-family: Impact, sans-serif; letter-spacing: 1px; }
.score-unit { font-size: 0.9rem; font-family: sans-serif; font-weight: bold; margin-left: 2px;}
.text-green { color: #10b981; text-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);}
.text-red { color: #ef4444; }
</style>