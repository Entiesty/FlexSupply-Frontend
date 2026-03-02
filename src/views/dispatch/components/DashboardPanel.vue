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
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getBaseMetrics, getCategoryStock, getVolunteerRank } from '@/api/dispatch'

const metrics = ref({})
const rankList = ref([])
const chartRef = ref(null)
let myChart = null
let refreshTimer = null

// 📦 核心算法：Top N 数据降噪聚合
const processPieData = (rawData, topN = 4) => {
  if (!rawData || rawData.length === 0) return []

  // 1. 按库存数量降序排列
  const sorted = [...rawData].sort((a, b) => b.totalStock - a.totalStock)

  // 2. 如果种类本来就不多于设定值，直接格式化返回
  if (sorted.length <= topN) {
    return sorted.map(item => ({ value: item.totalStock, name: item.categoryName }))
  }

  // 3. 截取前 N 名作为核心数据
  const topData = sorted.slice(0, topN).map(item => ({ value: item.totalStock, name: item.categoryName }))

  // 4. 将剩下的所有物资库存相加，归入“其他”
  const othersValue = sorted.slice(topN).reduce((sum, item) => sum + item.totalStock, 0)

  // 5. 追加“其他”项，并赋予低调的颜色
  topData.push({
    value: othersValue,
    name: '其他',
    itemStyle: { color: '#cbd5e1' }
  })

  return topData
}

// 初始化图表
const initChart = (dataList) => {
  if (!chartRef.value) return
  if (!myChart) myChart = echarts.init(chartRef.value)

  // 调用降噪算法（面板较窄，取 Top 4 最合适）
  const finalData = processPieData(dataList, 4)

  const totalStock = finalData.reduce((sum, item) => sum + item.value, 0)

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 件 ({d}%)',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: 8,
      textStyle: { color: '#334155', fontSize: 12 }
    },
    legend: {
      orient: 'horizontal',
      // 🚨 隔离核心 1：不准图例从底部往上长！
      // 强制要求图例从容器 58% 的高度开始，向下排列！
      top: '58%',
      left: 'center',
      itemWidth: 8,
      itemHeight: 8,
      icon: 'circle',
      itemGap: 10, // 稍微缩小一点图例间距
      formatter: (name) => {
        const item = finalData.find(i => i.name === name)
        if (!item) return name
        const percent = totalStock > 0 ? ((item.value / totalStock) * 100).toFixed(1) : 0
        return `{title|${name}} {val|${item.value}件} {pct|(${percent}%)}`
      },
      textStyle: {
        rich: {
          title: {
            width: 70,
            overflow: 'truncate',
            color: '#475569',
            fontSize: 11,
            fontWeight: 'bold'
          },
          val: {
            color: '#3b82f6',
            fontSize: 11,
            fontWeight: '900'
          },
          pct: {
            color: '#94a3b8',
            fontSize: 10
          }
        }
      }
    },
    color: ['#f97316', '#3b82f6', '#10b981', '#f43f5e', '#cbd5e1'],
    series: [
      {
        name: '物资占比',
        type: 'pie',
        // 🚨 隔离核心 2：饼图的圆心锁死在上方 30% 处，半径最大不超过 45%
        // 这意味着饼图的最下沿绝对不会超过容器的 52.5%！完美避开下方 58% 开始的图例。
        radius: ['30%', '45%'],
        center: ['50%', '30%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: { show: false },
        labelLine: { show: false },
        data: finalData
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
/* 样式保持不变，只贴核心部分防丢 */
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