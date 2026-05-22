<template>
  <div class="app-layout">
    <SideMenu />

    <main class="main-content">
      <div class="top-status">
        <span class="pulse-dot"></span> 信用积分引擎实时测算中...
      </div>

      <div class="credit-container">
        <!-- 荣誉卡片 -->
        <div class="honor-card">
          <div class="card-bg-glow"></div>
          <div class="card-body">
            <!-- 左侧：信誉分 + 等级 -->
            <div class="card-left">
              <div class="level-badge">🎖️ {{ dashboardData.levelName }}</div>
              <h2 class="score-number">{{ dashboardData.creditScore }} <span class="unit">分</span></h2>
              <p class="beat-text">超越全城 <strong>{{ dashboardData.beatPercentage }}%</strong> 的{{ userRole === 2 ? '爱心商铺' : '护航骑士' }}</p>
            </div>

            <!-- 分隔线 -->
            <div class="card-divider"></div>

            <!-- 右侧：时间币 + 实际效果 -->
            <div class="card-right">
              <div class="time-coin-row">
                <span class="tc-icon">⏳</span>
                <div>
                  <div class="tc-value">{{ dashboardData.timeCoin || 0 }} <span class="tc-unit">时间币</span></div>
                  <div class="tc-sub">累计护航 {{ (dashboardData.totalMileage || 0).toFixed(1) }} km</div>
                </div>
              </div>
              <div class="boost-info">
                <span class="boost-icon">📈</span>
                <span>接单优先级已提升 <strong>+{{ priorityBoost }}%</strong></span>
              </div>
              <p class="card-footnote">时间币不兑换实物——作为调度引擎的隐性加权因子，社会资本回馈</p>
            </div>
          </div>

          <!-- 等级进度条 -->
          <div class="progress-box">
            <div class="p-labels">
              <span>当前: {{ dashboardData.levelName }}</span>
              <span>下一等级: {{ nextLevelScore }} 分</span>
            </div>
            <div class="progress-bar">
              <div class="progress-inner" :style="{ width: progressPercent + '%' }"></div>
            </div>
          </div>
        </div>

        <!-- 双Tab流水 -->
        <div class="logs-section" v-loading="loading">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="信誉分明细" name="credit">
              <el-empty v-if="creditLogs.length === 0" description="暂无积分流水" />
              <div class="log-list" v-else>
                <div class="log-item" v-for="log in creditLogs" :key="log.logId">
                  <div class="log-icon" :class="log.changeValue > 0 ? 'plus' : 'minus'">
                    {{ log.changeValue > 0 ? '⭐' : '⚠️' }}
                  </div>
                  <div class="log-detail">
                    <div class="log-reason">{{ log.reason || '系统信誉分结算' }}</div>
                    <div class="log-meta">
                      <span class="log-time"><el-icon><Clock /></el-icon> {{ formatDate(log.createTime) }}</span>
                      <span class="log-order" v-if="log.orderId">
                        <el-icon><Ticket /></el-icon> {{ log.orderSn || `SYS-${10000 + log.orderId}` }}
                      </span>
                    </div>
                  </div>
                  <div class="log-score" :class="log.changeValue > 0 ? 'text-green' : 'text-red'">
                    {{ log.changeValue > 0 ? '+' : '' }}{{ log.changeValue }}
                    <span class="score-unit">分</span>
                  </div>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="时间币明细" name="timecoin">
              <el-empty v-if="timeCoinLogs.length === 0" description="完成配送后自动获得时间币" />
              <div class="log-list" v-else>
                <div class="log-item" v-for="log in timeCoinLogs" :key="log.logId">
                  <div class="log-icon time-coin-icon">⏳</div>
                  <div class="log-detail">
                    <div class="log-reason">{{ log.reason || '时间银行存入' }}</div>
                    <div class="log-meta">
                      <span class="log-time"><el-icon><Clock /></el-icon> {{ formatDate(log.createTime) }}</span>
                      <span class="log-order" v-if="log.orderId">
                        <el-icon><Ticket /></el-icon> {{ log.orderSn || `配送单-${10000 + log.orderId}` }}
                      </span>
                    </div>
                  </div>
                  <div class="log-score text-green">
                    +{{ log.changeValue }}
                    <span class="score-unit">币</span>
                  </div>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import SideMenu from '@/views/dispatch/components/SideMenu.vue'
import { getCreditDashboard, getCreditLogs } from '@/api/volunteer'
import { getUserProfile } from '@/api/user'
import { Clock, Ticket } from '@element-plus/icons-vue'

const loading = ref(false)
const activeTab = ref('credit')
const dashboardData = ref({ creditScore: 100, beatPercentage: 0, levelName: '青铜微光', timeCoin: 0, totalMileage: 0 })
const allLogs = ref([])
const userRole = ref(3)

const creditLogs = computed(() => allLogs.value.filter(l => l.logType !== 2))
const timeCoinLogs = computed(() => allLogs.value.filter(l => l.logType === 2))

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

// 接单优先级提升百分比 (与后端 MultiFactorDispatchStrategy 公式一致)
const priorityBoost = computed(() => {
  const tc = dashboardData.value.timeCoin || 0
  return (Math.min(tc / 50, 1.0) * 5).toFixed(1)
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
    const userRes = await getUserProfile()
    if (userRes.data) userRole.value = userRes.data.role

    const dashRes = await getCreditDashboard()
    dashboardData.value = dashRes.data

    const logRes = await getCreditLogs(1, 100)
    allLogs.value = logRes.data?.records || []
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

.credit-container { max-width: 680px; width: 100%; margin: 50px auto; }

/* 荣誉卡片 */
.honor-card { position: relative; background: #1e293b; border-radius: 28px; padding: 35px; color: #fff; overflow: hidden; box-shadow: 0 20px 40px rgba(30, 41, 59, 0.25); margin-bottom: 30px; }
.card-bg-glow { position: absolute; top: -50%; right: -20%; width: 350px; height: 350px; background: radial-gradient(circle, rgba(245,158,11,0.25) 0%, rgba(245,158,11,0) 70%); border-radius: 50%; }

.card-body { position: relative; z-index: 2; display: flex; gap: 30px; align-items: stretch; margin-bottom: 20px; }
.card-left { flex: 0 0 auto; min-width: 200px; }
.level-badge { display: inline-block; background: linear-gradient(135deg, #f59e0b, #ea580c); padding: 6px 16px; border-radius: 20px; font-weight: 900; font-size: 0.85rem; margin-bottom: 10px; box-shadow: 0 4px 12px rgba(245,158,11,0.4); }
.score-number { font-size: 3.5rem; margin: 0; font-weight: 900; letter-spacing: -1px; text-shadow: 0 4px 10px rgba(0,0,0,0.3); line-height: 1; }
.unit { font-size: 1.1rem; font-weight: normal; color: #94a3b8; }
.beat-text { font-size: 0.85rem; color: #cbd5e1; margin: 6px 0 0; line-height: 1.4; }
.beat-text strong { color: #fcd34d; font-size: 1.1rem; }

.card-divider { width: 1px; background: rgba(255,255,255,0.12); flex-shrink: 0; }

.card-right { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 12px; }
.time-coin-row { display: flex; align-items: center; gap: 12px; }
.tc-icon { font-size: 2.2rem; }
.tc-value { font-size: 2rem; font-weight: 900; color: #5eead4; line-height: 1.1; }
.tc-unit { font-size: 1rem; color: #99f6e4; font-weight: normal; }
.tc-sub { font-size: 0.85rem; color: #94a3b8; margin-top: 2px; }

.boost-info { background: rgba(94, 234, 212, 0.1); border: 1px solid rgba(94, 234, 212, 0.25); border-radius: 10px; padding: 10px 14px; font-size: 0.9rem; color: #cbd5e1; display: flex; align-items: center; gap: 8px; }
.boost-info strong { color: #5eead4; font-size: 1.1rem; }
.boost-icon { font-size: 1.2rem; }
.card-footnote { margin: 0; font-size: 0.75rem; color: #64748b; font-style: italic; }

.progress-box { position: relative; z-index: 2; background: rgba(255,255,255,0.06); padding: 18px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.1); }
.p-labels { display: flex; justify-content: space-between; font-size: 0.85rem; color: #cbd5e1; margin-bottom: 10px; font-weight: bold; }
.progress-bar { height: 10px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; }
.progress-inner { height: 100%; background: linear-gradient(90deg, #fcd34d, #f59e0b); border-radius: 10px; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 0 10px rgba(245,158,11,0.5); }

/* 流水列表 */
.logs-section { background: #fff; border-radius: 28px; padding: 24px 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.04); min-height: 200px; }
.log-list { display: flex; flex-direction: column; gap: 16px; }

.log-item { display: flex; align-items: center; gap: 18px; background: #f8fafc; padding: 20px; border-radius: 20px; border: 1px solid #f1f5f9; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.log-item:hover { transform: translateX(6px); background: #fff; border-color: #e2e8f0; box-shadow: 0 8px 20px rgba(0,0,0,0.04); }

.log-icon { width: 48px; height: 48px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; flex-shrink: 0; box-shadow: inset 0 -3px 0 rgba(0,0,0,0.1); }
.log-icon.plus { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #d97706; }
.log-icon.minus { background: linear-gradient(135deg, #fee2e2, #fecaca); color: #ef4444; }
.log-icon.time-coin-icon { background: linear-gradient(135deg, #ccfbf1, #99f6e4); color: #0d9488; }

.log-detail { flex: 1; overflow: hidden; }
.log-reason { font-weight: 900; color: #1e293b; font-size: 1.05rem; margin-bottom: 8px; }
.log-meta { display: flex; align-items: center; gap: 15px; flex-wrap: wrap; }
.log-time { font-size: 0.85rem; color: #64748b; font-weight: bold; display: flex; align-items: center; gap: 5px; }
.log-order { font-size: 0.8rem; color: #2563eb; background: #eff6ff; padding: 4px 10px; border-radius: 8px; display: flex; align-items: center; gap: 5px; font-weight: 800; border: 1px solid #bfdbfe; font-family: monospace; }

.log-score { font-size: 1.8rem; font-weight: 900; font-family: Impact, sans-serif; letter-spacing: 1px; }
.score-unit { font-size: 0.9rem; font-family: sans-serif; font-weight: bold; margin-left: 2px; }
.text-green { color: #10b981; }
.text-red { color: #ef4444; }

@media screen and (max-width: 600px) {
  .card-body { flex-direction: column; gap: 20px; }
  .card-divider { width: 100%; height: 1px; }
}
</style>
