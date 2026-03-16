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
      <div class="chart-title">🌹 储备品类丰富度分析</div>
      <div ref="chartRef" class="echarts-box" style="width: 100%; height: 280px;"></div>
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
import { ref, onMounted, onUnmounted, nextTick, shallowRef } from 'vue'
import * as echarts from 'echarts'
import { getBaseMetrics, getCategoryStock, getVolunteerRank } from '@/api/dispatch'

const metrics = ref({})
const rankList = ref([])
const chartRef = ref(null)

// 🚨 核心修复：使用 shallowRef 管理 ECharts 实例，避免 Vue 深度代理导致性能爆炸
const chartInstance = shallowRef(null)
let refreshTimer = null

const processPieData = (rawData, topN = 4) => {
  if (!rawData || rawData.length === 0) return []
  const sorted = [...rawData].sort((a, b) => b.totalStock - a.totalStock)
  if (sorted.length <= topN) {
    return sorted.map(item => ({ value: item.totalStock, name: item.categoryName }))
  }
  const topData = sorted.slice(0, topN).map(item => ({ value: item.totalStock, name: item.categoryName }))
  const othersValue = sorted.slice(topN).reduce((sum, item) => sum + item.totalStock, 0)
  topData.push({
    value: othersValue,
    name: '其他',
    itemStyle: { color: '#cbd5e1' }
  })
  return topData
}

const initChart = (dataList) => {
  if (!chartRef.value) return
  // 初始化挂载
  if (!chartInstance.value) {
    chartInstance.value = echarts.init(chartRef.value)
  }

  const finalData = processPieData(dataList, 4)
  finalData.sort((a, b) => a.value - b.value)

  const totalStock = finalData.reduce((sum, item) => sum + item.value, 0)

  const option = {
    color: ['#8b5cf6', '#10b981', '#f97316', '#ef4444', '#3b82f6'],
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc', fontSize: 13 },
      formatter: function (params) {
        return `
          <div style="font-weight:900;margin-bottom:6px;">${params.name}</div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="display:inline-block;border-radius:50%;width:8px;height:8px;background-color:${params.color};"></span>
            <span style="color:#cbd5e1;">当前储备：</span>
            <span style="color:#f97316;font-weight:900;font-size:1.2rem;">${params.value}</span>
            <span style="color:#94a3b8;font-size:0.8rem;">批次</span>
          </div>
          <div style="color:#94a3b8;font-size:0.85rem;margin-top:4px;padding-left:14px;">
            占比架构：${params.percent}%
          </div>
        `;
      }
    },
    legend: {
      orient: 'horizontal',
      top: '68%',
      left: 'center',
      itemWidth: 10,
      itemHeight: 10,
      icon: 'circle',
      itemGap: 12,
      formatter: (name) => {
        const item = finalData.find(i => i.name === name)
        if (!item) return name
        const percent = totalStock > 0 ? ((item.value / totalStock) * 100).toFixed(1) : 0
        return `{title|${name}} {val|${item.value}批} {pct|(${percent}%)}`
      },
      textStyle: {
        rich: {
          title: { width: 68, color: '#475569', fontSize: 11, fontWeight: 'bold' },
          val: { color: '#3b82f6', fontSize: 11, fontWeight: '900' },
          pct: { color: '#94a3b8', fontSize: 10 }
        }
      }
    },
    series: [
      {
        name: '储备丰富度',
        type: 'pie',
        roseType: 'radius',
        radius: ['15%', '60%'],
        center: ['50%', '35%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#ffffff',
          borderWidth: 2,
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.05)'
        },
        label: { show: false },
        labelLine: { show: false },
        data: finalData
      }
    ]
  }
  chartInstance.value.setOption(option)
}

const fetchAllData = async () => {
  try {
    const [metricsRes, stockRes, rankRes] = await Promise.all([
      getBaseMetrics(),
      getCategoryStock(),
      getVolunteerRank()
    ])

    metrics.value = metricsRes.data
    rankList.value = rankRes.data

    if (stockRes.data && stockRes.data.length > 0) {
      nextTick(() => initChart(stockRes.data))
    }
  } catch (e) {
    console.error('获取大屏数据失败', e)
  }
}

// 🚨 核心修复：独立的 resize 回调方法
const handleResize = () => {
  if (chartInstance.value) {
    chartInstance.value.resize()
  }
}

onMounted(() => {
  fetchAllData()
  refreshTimer = setInterval(fetchAllData, 30000)

  // 绑定浏览器窗口缩放监听
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)

  // 卸载监听和实例，防止内存泄露
  window.removeEventListener('resize', handleResize)
  if (chartInstance.value) {
    chartInstance.value.dispose()
    chartInstance.value = null
  }
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

.panel-header { font-size: 1rem; font-weight: 900; color: #1e293b; display: flex; align-items: center; gap: 10px; }
.pulse-dot { width: 10px; height: 10px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 10px #3b82f6; animation: pulse 2s infinite; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); } 70% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }

.metrics-grid { display: flex; gap: 10px; justify-content: space-between; }
.metric-card { flex: 1; background: #f8fafc; padding: 10px; border-radius: 12px; text-align: center; border: 1px solid #f1f5f9; }
.m-label { font-size: 0.7rem; color: #64748b; margin-bottom: 5px; }
.m-value { font-size: 1.2rem; font-weight: 900; font-family: Impact, sans-serif; }
.urgent { color: #f43f5e; }
.success { color: #10b981; }
.stock { color: #3b82f6; }

.chart-container { background: #fff; border-radius: 12px; padding: 15px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.02); }
.chart-title { font-size: 0.85rem; font-weight: bold; color: #475569; margin-bottom: 10px; padding-left: 5px; }
.echarts-box { width: 100%; height: 200px; }

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