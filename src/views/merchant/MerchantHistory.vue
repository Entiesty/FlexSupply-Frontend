<template>
  <div class="app-layout">
    <SideMenu />
    <main class="main-content">
      <div class="top-status">
        <span class="pulse-dot"></span>
        物资全链路溯源 | 信誉分 <strong>{{ myCreditScore }}</strong>
      </div>

      <div class="history-wrapper">
        <header class="page-header">
          <h2>📜 我的捐赠记录</h2>
          <p>每一份爱心都有迹可循，实时追踪物资流转状态</p>
        </header>

        <!-- 工具栏 -->
        <div class="toolbar">
          <el-input v-model="queryParams.goodsName" placeholder="输入物资名称检索..." clearable
            :prefix-icon="Search" @keyup.enter="fetchData" @clear="fetchData" class="toolbar-search" />
          <el-select v-model="queryParams.status" placeholder="流转状态" clearable @change="fetchData" class="toolbar-select">
            <el-option :value="null" label="全部状态" />
            <el-option :value="0" label="待取货" />
            <el-option :value="1" label="运送中" />
            <el-option :value="4" label="商家自送中" />
            <el-option :value="2" label="已入库" />
            <el-option :value="3" label="已发完" />
          </el-select>
          <el-button type="primary" @click="fetchData">检索</el-button>
        </div>

        <!-- 自送中横幅 -->
        <div v-if="activeDeliveries.length > 0" class="active-banner">
          <span class="live-dot"></span> 您有 {{ activeDeliveries.length }} 批物资正在亲自护送中
        </div>

        <!-- 卡片列表 -->
        <div class="card-list" v-loading="loading">
          <el-empty v-if="!loading && historyDeliveries.length === 0" description="暂无捐赠记录" />

          <div class="item-card" v-for="row in historyDeliveries" :key="row.goodsId" :class="{ 'is-active': row.status === 4 }">
            <!-- Header -->
            <div class="card-hd">
              <h3 class="card-name" :title="row.goodsName">{{ cleanGoodsName(row.goodsName) }}</h3>
              <el-tag :type="statusTagType(row.status)" effect="plain" size="small">{{ getStatusText(row.status) }}</el-tag>
            </div>

            <!-- Body -->
            <div class="card-bd">
              <div class="meta-row">
                <span class="meta-label">物资大类</span>
                <span class="meta-value">{{ row.category || '未分类' }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">捐赠数量</span>
                <span class="meta-value">{{ row.stock }} {{ row.unit || '件' }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">流转去向</span>
                <span class="meta-value">{{ getDestinationText(row) }}</span>
              </div>
            </div>

            <!-- Footer -->
            <div class="card-ft">
              <span class="card-time" v-if="row.createTime">{{ row.createTime?.replace('T', ' ').substring(0, 16) }}</span>
              <span v-else></span>
              <div class="card-actions">
                <el-button size="small" @click="openTrace(row)">📍 物资追踪</el-button>
                <el-dropdown v-if="row.status === 0" trigger="click" @command="(cmd) => handleCardAction(cmd, row)">
                  <el-button size="small">···</el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="start">🚗 开始自送</el-dropdown-item>
                      <el-dropdown-item command="revoke" divided style="color: #ef4444;">❌ 撤销</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
        </div>

        <div class="pagination-wrap" v-if="total > 0">
          <el-pagination background layout="total, prev, pager, next"
            :total="total" :page-size="queryParams.pageSize"
            v-model:current-page="queryParams.pageNum" @current-change="fetchData" />
        </div>
      </div>
    </main>

    <el-dialog v-model="traceVisible" title="📦 捐赠物资履约追踪" width="90%" style="max-width: 650px; border-radius: 24px;" custom-class="trace-dialog">
      <div class="trace-container" v-if="currentTraceItem">

        <div class="trace-summary">
          <div class="summary-item">
            <span class="label">追踪物资：</span>
            <span class="value goods-name-trace">{{ cleanGoodsName(currentTraceItem.goodsName) }}</span>
            <span class="value goods-count">剩余 <strong style="font-size:1.2em">{{ currentTraceItem.stock }}</strong> {{ currentTraceItem.unit || '份' }}</span>
          </div>
          <div class="summary-item">
            <span class="label">目标驿站：</span>
            <span class="value">🏥 {{ currentTraceItem.stationName || '系统算法分配中...' }}</span>
          </div>
        </div>

        <el-timeline class="custom-timeline">
          <el-timeline-item :timestamp="currentTraceItem.createTime || '近期'" color="#3b82f6" size="large">
            <h4 class="tl-title">💝 感谢您的爱心捐赠</h4>
            <p class="tl-desc">您的捐赠意向已录入城市调度大盘，正在匹配运力。</p>
          </el-timeline-item>

          <el-timeline-item
              :color="currentTraceItem.status === 1 || currentTraceItem.status === 4 || currentTraceItem.status >= 2 ? '#f97316' : '#e2e8f0'"
              :hollow="currentTraceItem.status === 0">
            <h4 class="tl-title" :class="{'pending-text': currentTraceItem.status === 0}">
              {{ currentTraceItem.status === 4 ? '🚗 您正在亲自护送物资前往驿站' : (currentTraceItem.status >= 1 ? '🚴 城市护航骑士已接单取货' : '⏳ 调度引擎正在呼叫骑士/等待自送...') }}
            </h4>
            <p class="tl-desc" v-if="currentTraceItem.status === 1 || currentTraceItem.status === 4">正在全力保障您的爱心物资安全抵达目的地。</p>
          </el-timeline-item>

          <el-timeline-item
              :color="currentTraceItem.status >= 2 ? '#10b981' : '#e2e8f0'"
              :hollow="currentTraceItem.status < 2"
              size="large">
            <h4 class="tl-title" :class="{'pending-text': currentTraceItem.status < 2}">
              <template v-if="currentTraceItem.status >= 2">
                {{ currentTraceItem.stationName ? `🏥 物资已安全抵达驿站入库` : '🚀 急态绿色通道：跳过驿站中转直达现场' }}
              </template>
              <template v-else>
                ⏳ 等待物资入库食物银行驿站/直达现场...
              </template>
            </h4>
            <p class="tl-desc" v-if="currentTraceItem.status >= 2">
              {{ currentTraceItem.stationName ? '工作人员已清点，物资正在陆续流转至有需要的市民手中。' : '触发紧急 P2P 调度模式，骑士将物资直接交接至求助市民。' }}
            </p>
          </el-timeline-item>

          <el-timeline-item
              v-if="currentTraceItem.status === 3"
              color="#ef4444"
              size="large">
            <h4 class="tl-title">🎉 物资已全部分发核销完毕！</h4>
            <p class="tl-desc">这份物资已经在这个城市中化作了一道微光，再次代表社区感谢您的善举！</p>
          </el-timeline-item>
        </el-timeline>

        <transition name="fade-slide">
          <div class="distribution-details" v-if="currentTraceItem.status >= 2">
            <div class="dist-header">
              <h4 class="dist-title">👥 受助市民申领与反哺记录</h4>
              <span class="dist-privacy-tip"><i class="el-icon-lock"></i> 隐私脱敏保护</span>
            </div>

            <div class="dist-list" v-loading="distLoading">
              <div v-if="!distLoading && distributionList.length === 0" class="dist-empty">
                <span class="empty-emoji">📦</span>
                <p>物资已静候在货架上，暂无受助人提取，请耐心等待。</p>
              </div>

              <div class="dist-item" v-for="(item, index) in distributionList" :key="index">
                <div class="dist-user">
                  <span class="dist-avatar">👤</span>
                  <div class="dist-u-info">
                    <span class="dist-name">
                      {{ item.recipientName }}
                      <span class="dist-tag">{{ item.recipientTag }}</span>
                    </span>
                    <span class="dist-time">于 {{ item.createTime?.replace('T', ' ') }} 申领了 <strong>{{ item.goodsCount }}</strong> {{ currentTraceItem.unit || '份' }}</span>
                  </div>
                </div>

                <div class="dist-rating-box">
                  <template v-if="item.status === 3 && item.rating">
                    <div class="rating-stars">
                      <span style="color: #f59e0b" v-for="s in item.rating" :key="s">★</span><span style="color: #e2e8f0" v-for="s in (5 - item.rating)" :key="s+5">★</span>
                    </div>
                    <div class="rating-comment" v-if="item.comment">"{{ item.comment }}"</div>
                  </template>
                  <template v-else>
                    <div class="rating-wait">
                      <span class="wait-icon">⏳</span> 待送达/体验后评价...
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </transition>

      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import SideMenu from '@/views/dispatch/components/SideMenu.vue'
import { getMerchantGoodsPage, revokeGoods, startSelfDelivery } from '@/api/resource'
import { getUserProfile } from '@/api/user'
import { getGoodsDistribution } from '@/api/trade'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const myCreditScore = ref(100)

const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  goodsName: '',
  status: null
})

const traceVisible = ref(false)
const currentTraceItem = ref(null)
const distributionList = ref([])
const distLoading = ref(false)

const activeDeliveries = computed(() => tableData.value.filter(item => item.status === 4))
const historyDeliveries = computed(() => {
  if (queryParams.value.status === 4) return tableData.value
  return tableData.value.filter(item => item.status !== 4)
})

const getStatusText = (status) => {
  const map = { 0: '待取货', 1: '运送中', 2: '已入库', 3: '已发完', 4: '商家自送中' }
  return map[status] || '未知'
}

const statusTagType = (status) => {
  const map = { 0: 'warning', 1: '', 2: 'success', 3: 'info', 4: 'warning' }
  return map[status] || 'info'
}

const handleCardAction = (cmd, row) => {
  if (cmd === 'start') handleStart(row)
  else if (cmd === 'revoke') handleRevoke(row)
}

const cleanGoodsName = (name) => {
  if (!name) return '未知物资'
  return name.replace(/^急需：/, '').replace(/\[.*?\]\s*/, '')
}

const getDestinationText = (row) => {
  if (row.stationName) return `📍 ${row.stationName}`
  if (row.status === 2 || row.status === 3) return '🚀 定向直供 (跳过驿站直达市民)'
  return '🧠 调度引擎分配中...'
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getMerchantGoodsPage(queryParams.value)
    tableData.value = res.data.records || []
    total.value = res.data.total || 0
  } catch (e) {
    console.error('获取记录失败', e)
  } finally {
    loading.value = false
  }
}

const openTrace = async (row) => {
  currentTraceItem.value = row
  traceVisible.value = true

  if (row.status >= 2) {
    distributionList.value = []
    distLoading.value = true
    try {
      const res = await getGoodsDistribution(row.goodsId)
      distributionList.value = res.data || []
    } catch (e) {
      console.error('获取领取明细失败', e)
    } finally {
      distLoading.value = false
    }
  }
}

const handleRevoke = (row) => {
  ElMessageBox.confirm(
      `确定要撤销【${cleanGoodsName(row.goodsName)}】的捐赠吗？撤销后该物资将从全城调度大盘中移除。`,
      '撤销防呆确认',
      { confirmButtonText: '确认撤销', cancelButtonText: '保留', type: 'warning' }
  ).then(async () => {
    loading.value = true
    try {
      await revokeGoods(row.goodsId)
      ElMessage.success('撤销成功，已从大盘移除')
      fetchData()
    } catch (e) {} finally { loading.value = false }
  }).catch(() => {})
}

const handleStart = async (row) => {
  ElMessageBox.confirm('确认亲自护送这批物资吗？系统将为您开启自送护航通道。', '启动自送', {
    confirmButtonText: '开始自送', cancelButtonText: '取消', type: 'warning'
  }).then(async () => {
    loading.value = true
    try {
      await startSelfDelivery(row.goodsId)
      ElMessage.success('自送通道已开启！请尽快护送物资前往终点。')
      await fetchData()
    } catch (e) {} finally { loading.value = false }
  }).catch(() => {})
}

// === 🚨 滑动解锁逻辑 ===
const startSlide = (e, goodsId) => {
  if (slideSuccessMap.value[goodsId]) return // 已经成功的不允许再滑
  isDragging = true
  currentGoodsId = goodsId
  startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX

  window.addEventListener('mousemove', onSlideMove)
  window.addEventListener('touchmove', onSlideMove, { passive: false })
  window.addEventListener('mouseup', endSlide)
  window.addEventListener('touchend', endSlide)
}

const onSlideMove = (e) => {
  if (!isDragging) return
  if (e.type.includes('touch')) e.preventDefault() // 防止页面滚动
  const currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX
  let moveX = currentX - startX

  if (moveX < 0) moveX = 0
  if (moveX > maxSlideWidth) moveX = maxSlideWidth

  slideProgressMap.value[currentGoodsId] = moveX
}

const endSlide = async () => {
  if (!isDragging) return
  isDragging = false

  const finalProgress = slideProgressMap.value[currentGoodsId] || 0

  // 必须滑到 95% 以上才算成功
  if (finalProgress >= maxSlideWidth * 0.95) {
    slideProgressMap.value[currentGoodsId] = maxSlideWidth
    slideSuccessMap.value[currentGoodsId] = true
    // 触发真实核销接口
    await executeFinishDelivery(currentGoodsId)
  } else {
    // 失败回弹动画
    let backStep = finalProgress
    const anim = setInterval(() => {
      backStep -= 15
      if (backStep <= 0) {
        slideProgressMap.value[currentGoodsId] = 0
        clearInterval(anim)
      } else {
        slideProgressMap.value[currentGoodsId] = backStep
      }
    }, 16)
  }

  window.removeEventListener('mousemove', onSlideMove)
  window.removeEventListener('touchmove', onSlideMove)
  window.removeEventListener('mouseup', endSlide)
  window.removeEventListener('touchend', endSlide)
}

const executeFinishDelivery = async (goodsId) => {
  try {
    await finishSelfDelivery(goodsId)
    ElMessage.success('核销成功，感谢您的亲力亲为！')
    await fetchData()
  } catch (e) {
    // 失败了重置滑块
    slideSuccessMap.value[goodsId] = false
    slideProgressMap.value[goodsId] = 0
  }
}

onMounted(async () => {
  fetchData()
  try {
    const userRes = await getUserProfile()
    if (userRes && userRes.data) myCreditScore.value = userRes.data.creditScore || 100
  } catch (e) {}
})
</script>

<style scoped>
.app-layout { position: fixed; inset: 0; display: flex; width: 100vw; height: 100vh; background: #f8fafc; overflow-y: auto; overflow-x: hidden; }
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 20px; }
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); padding: 10px 18px; border-radius: 20px; font-size: 0.8rem; color: #475569; font-weight: bold; display: flex; align-items: center; gap: 8px; box-shadow: 0 6px 15px rgba(0,0,0,0.05); }
.top-status strong { color: #f97316; font-size: 1.1em; margin-left: 4px; }
.pulse-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; animation: pulse 2s infinite; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); } 70% { box-shadow: 0 0 0 6px rgba(16,185,129,0); } 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); } }

.history-wrapper { max-width: 900px; width: 100%; margin: 40px auto; padding-bottom: 50px; }
.page-header { margin-bottom: 24px; }
.page-header h2 { color: #1e293b; font-size: 1.8rem; margin: 0 0 8px; font-weight: 900; }
.page-header p { color: #64748b; font-size: 1rem; margin: 0; }

/* 工具栏 */
.toolbar { display: flex; gap: 12px; margin-bottom: 20px; align-items: center; }
.toolbar-search { flex: 1; min-width: 200px; }
.toolbar-select { width: 160px; flex-shrink: 0; }

/* 自送横幅 */
.active-banner { background: #fefce8; border: 1px solid #fde68a; border-radius: 12px; padding: 12px 20px; margin-bottom: 20px; font-weight: 900; color: #a16207; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; }
.live-dot { width: 8px; height: 8px; background: #f59e0b; border-radius: 50%; animation: pulse 1.5s infinite; }

/* 卡片 */
.card-list { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.item-card { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden; display: flex; flex-direction: column; transition: 0.2s; }
.item-card:hover { border-color: #e2e8f0; box-shadow: 0 8px 20px rgba(0,0,0,0.05); }
.item-card.is-active { border-left: 3px solid #f97316; }

.card-hd { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f8fafc; }
.card-name { margin: 0; font-size: 1.05rem; color: #1e293b; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; margin-right: 12px; }

.card-bd { padding: 16px 20px; flex: 1; display: flex; flex-direction: column; gap: 8px; }
.meta-row { display: flex; justify-content: space-between; align-items: center; }
.meta-label { font-size: 0.8rem; color: #94a3b8; font-weight: bold; }
.meta-value { font-size: 0.9rem; color: #475569; font-weight: bold; text-align: right; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.card-ft { padding: 12px 20px; border-top: 1px solid #f8fafc; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.card-time { font-size: 0.78rem; color: #94a3b8; }
.card-actions { display: flex; gap: 6px; align-items: center; }

.pagination-wrap { display: flex; justify-content: center; margin-top: 30px; }

/* 弹窗样式保留 */
.trace-container { padding: 0 5px; }
.trace-summary { background: linear-gradient(to right, #f8fafc, #f1f5f9); border: 2px dashed #cbd5e1; border-radius: 16px; padding: 20px; margin-bottom: 30px; display: flex; flex-direction: column; gap: 12px; }
.summary-item { display: flex; align-items: center; font-size: 0.95rem; }
.summary-item .label { color: #64748b; width: 80px; font-weight: bold; }
.summary-item .goods-name-trace { font-weight: 900; color: #1e293b; font-size: 1.15rem; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 12px; }
.summary-item .goods-count { background: #fff7ed; color: #ea580c; padding: 4px 10px; border-radius: 8px; font-weight: bold; border: 1px solid #fdba74; }
.custom-timeline { padding-left: 10px; margin-top: 10px; }
.tl-title { margin: 0 0 6px; font-size: 1.1rem; color: #1e293b; font-weight: 900; }
.tl-desc { margin: 0; font-size: 0.9rem; color: #64748b; line-height: 1.5; font-weight: bold; }
.pending-text { color: #94a3b8 !important; }
.distribution-details { margin-top: 30px; border-top: 2px dashed #e2e8f0; padding-top: 25px; }
.dist-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 0 5px; }
.dist-title { margin: 0; font-size: 1.1rem; color: #1e293b; font-weight: 900; display: flex; align-items: center; gap: 6px; }
.dist-privacy-tip { font-size: 0.8rem; color: #10b981; background: #ecfdf5; padding: 4px 10px; border-radius: 8px; font-weight: bold; border: 1px solid #a7f3d0; }
.dist-list { display: flex; flex-direction: column; gap: 15px; max-height: 350px; overflow-y: auto; padding-right: 8px; margin-right: -8px; }
.dist-list::-webkit-scrollbar { width: 6px; }
.dist-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
.dist-empty { text-align: center; padding: 30px 0; color: #94a3b8; background: #f8fafc; border-radius: 16px; border: 1px dashed #cbd5e1; }
.dist-empty .empty-emoji { font-size: 3rem; margin-bottom: 10px; display: block; opacity: 0.8; }
.dist-empty p { margin: 0; font-size: 0.95rem; font-weight: bold; }
.dist-item { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; transition: 0.2s; display: flex; align-items: center; justify-content: space-between; gap: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.02); }
.dist-item:hover { border-color: #cbd5e1; box-shadow: 0 6px 15px rgba(0,0,0,0.05); }
.dist-user { display: flex; align-items: center; gap: 15px; flex: 1; overflow: hidden; }
.dist-avatar { width: 44px; height: 44px; background: linear-gradient(135deg, #e0f2fe, #bae6fd); color: #0284c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; box-shadow: 0 2px 6px rgba(2,132,199,0.15); }
.dist-u-info { display: flex; flex-direction: column; overflow: hidden; }
.dist-name { font-weight: 900; color: #334155; font-size: 1.05rem; display: flex; align-items: center; gap: 8px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
.dist-tag { font-size: 0.7rem; background: #eff6ff; color: #3b82f6; padding: 2px 8px; border-radius: 6px; font-weight: bold; border: 1px solid #bfdbfe; flex-shrink: 0; }
.dist-time { font-size: 0.85rem; color: #64748b; margin-top: 4px; }
.dist-time strong { color: #f97316; font-weight: 900; }
.dist-rating-box { background: #f8fafc; padding: 10px 16px; border-radius: 12px; min-width: 140px; display: flex; flex-direction: column; justify-content: center; align-items: flex-end; }
.rating-stars { font-size: 1.2rem; letter-spacing: 2px; line-height: 1; margin-bottom: 6px; }
.rating-comment { font-size: 0.85rem; color: #475569; font-weight: bold; font-style: italic; max-width: 180px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
.rating-wait { font-size: 0.85rem; color: #94a3b8; font-weight: bold; display: flex; align-items: center; gap: 4px; }

:deep(.el-timeline-item__node--large) { width: 16px; height: 16px; left: -2px; }
:deep(.el-timeline-item__wrapper) { padding-left: 28px; top: -4px; }

@media screen and (max-width: 768px) {
  .main-content { padding: 12px; }
  .toolbar { flex-direction: column; }
  .toolbar-select { width: 100%; }
  .card-list { grid-template-columns: 1fr; }
  .dist-item { flex-direction: column; align-items: stretch; }
}
</style>