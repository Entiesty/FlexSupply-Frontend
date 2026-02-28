<template>
  <div class="dashboard-panel">
    <div class="panel-header">
      <span class="pulse-dot"></span> 全城实时调度数据
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="m-label">今日新增求助</div>
        <div class="m-value urgent">{{ metrics.todayNewOrders || 0 }}</div>
      </div>
      <div class="metric-card">
        <div class="m-label">今日完成派送</div>
        <div class="m-value success">{{ metrics.todayCompletedOrders || 0 }}</div>
      </div>
      <div class="metric-card">
        <div class="m-label">全网可用库存</div>
        <div class="m-value stock">{{ metrics.totalStock || 0 }}</div>
      </div>
    </div>

    <div class="chart-container">
      <div class="chart-title">📊 物资储备结构分析</div>
      <div ref="chartRef" class="echarts-box"></div>
    </div>

    <div class="rank-container">
      <div class="chart-title">🏆 志愿者信誉光荣榜</div>
      <ul class="rank-list">
        <li v-for="(item, index) in rankList" :key="index" class="rank-item">
          <span class="r-index" :class="'top' + (index + 1)">{{ index + 1 }}</span>
          <span class="r-name">{{ item.volunteerName }}</span>
          <span class="r-score">{{ item.creditScore }} 分</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getBaseMetrics, getCategoryStock, getVolunteerRank } from '@/api/dashboard'

const metrics = ref({})
const rankList = ref([])
const chartRef = ref(null)
let myChart = null
let refreshTimer = null

// 初始化图表
const initChart = (dataList) => {
  if (!chartRef.value) return
  if (!myChart) myChart = echarts.init(chartRef.value)

  const option = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: '0%', left: 'center', textStyle: { color: '#64748b', fontSize: 11 } },
    color: ['#f97316', '#3b82f6', '#10b981', '#f43f5e', '#8b5cf6'],
    series: [
      {
        name: '物资占比',
        type: 'pie',
        radius: ['45%', '70%'], // 环形图设置
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: { show: false, position: 'center' },
        emphasis: {
          label: { show: true, fontSize: '14', fontWeight: 'bold', color: '#1e293b' }
        },
        labelLine: { show: false },
        data: dataList.map(item => ({
          value: item.totalStock,
          name: item.categoryName
        }))
      }
    ]
  }
  myChart.setOption(option)
}

// 抓取全部大屏数据
const fetchAllData = async () => {
  try {
    const [metricsRes, stockRes, rankRes] = await Promise.all([
      getBaseMetrics(),
      getCategoryStock(),
      getVolunteerRank()
    ])

    metrics.value = metricsRes.data
    rankList.value = rankRes.data

    // 如果有图表数据，则渲染图表
    if (stockRes.data && stockRes.data.length > 0) {
      nextTick(() => initChart(stockRes.data))
    }
  } catch (e) {
    console.error('获取大屏数据失败', e)
  }
}

onMounted(() => {
  fetchAllData()
  // 每 30 秒无感刷新一次大屏数据
  refreshTimer = setInterval(fetchAllData, 30000)

  // 监听窗口缩放，自动重绘图表防止变形
  window.addEventListener('resize', () => {
    if (myChart) myChart.resize()
  })
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (myChart) myChart.dispose()
})
</script>

<style scoped>
.dashboard-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 320px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.08);
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel-header {
  font-size: 1rem;
  font-weight: 900;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 10px;
}

.pulse-dot {
  width: 10px;
  height: 10px;
  background: #3b82f6;
  border-radius: 50%;
  box-shadow: 0 0 10px #3b82f6;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
  70% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
  100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
}

/* 数字指标卡片 */
.metrics-grid {
  display: flex;
  gap: 10px;
  justify-content: space-between;
}
.metric-card {
  flex: 1;
  background: #f8fafc;
  padding: 10px;
  border-radius: 12px;
  text-align: center;
  border: 1px solid #f1f5f9;
}
.m-label { font-size: 0.7rem; color: #64748b; margin-bottom: 5px; }
.m-value { font-size: 1.2rem; font-weight: 900; font-family: Impact, sans-serif; }
.urgent { color: #f43f5e; }
.success { color: #10b981; }
.stock { color: #3b82f6; }

/* ECharts 图表 */
.chart-container { background: #fff; border-radius: 12px; padding: 15px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.02); }
.chart-title { font-size: 0.85rem; font-weight: bold; color: #475569; margin-bottom: 10px; padding-left: 5px; }
.echarts-box { width: 100%; height: 200px; }

/* 排行榜 */
.rank-container { background: #fff; border-radius: 12px; padding: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.02); }
.rank-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.rank-item { display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; padding: 6px 0; border-bottom: 1px dashed #f1f5f9; }
.rank-item:last-child { border-bottom: none; }

.r-index { display: inline-flex; width: 20px; height: 20px; background: #e2e8f0; color: #64748b; align-items: center; justify-content: center; border-radius: 6px; font-weight: bold; font-size: 0.75rem;}
.top1 { background: #fef08a; color: #a16207; }
.top2 { background: #e2e8f0; color: #475569; }
.top3 { background: #fed7aa; color: #9a3412; }

.r-name { flex: 1; margin: 0 10px; color: #334155; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
.r-score { color: #f97316; font-weight: 900; }
</style>