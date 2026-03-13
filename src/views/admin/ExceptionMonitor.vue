<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot"></span> 城市应急调度中心 · 异常监控雷达
    </div>

    <div class="admin-wrapper">
      <header class="page-header">
        <div class="header-title-row">
          <div class="alert-icon pulse-red">🚨</div>
          <div>
            <h2>异常预警监控台</h2>
            <p>实时监控调度引擎滞留单，保障城市物资生命通道绝对畅通</p>
          </div>
        </div>
      </header>

      <div class="board-content" v-loading="loading">
        <div v-if="exceptionList.length === 0" class="all-clear-state glass-panel">
          <div class="green-radar"></div>
          <h3 class="text-green">引擎全速运转中，暂无物资断供异常</h3>
          <p>全城各节点物资充沛，智能调度匹配顺畅</p>
        </div>

        <div v-else class="exception-grid">
          <div class="exception-card" v-for="order in exceptionList" :key="order.orderId">
            <div class="card-header">
              <span class="urgency-badge" :class="order.urgencyLevel >= 8 ? 'high' : 'normal'">
                优先级: Lv.{{ order.urgencyLevel }}
              </span>
              <span class="time-elapsed">滞留时间: <b>{{ calculateElapsedMinutes(order.createTime) }}</b> 分钟</span>
            </div>

            <div class="card-body">
              <h3 class="goods-name">{{ order.goodsName || order.requiredCategory }}</h3>
              <p class="order-sn">追溯单号：{{ order.orderSn }}</p>

              <div class="reason-box">
                <span class="reason-label">⚠️ 引擎拦截死因：</span>
                <span class="reason-text">{{ order.exceptionReason || '系统暂无库存或无人接单' }}</span>
              </div>
            </div>

            <div class="card-actions">
              <button class="action-btn call-merchant" @click="handleCallMerchant(order)">
                📢 周边商铺紧急定向募捐
              </button>
              <div class="action-row">
                <button class="action-btn call-user" @click="handleCallUser(order)">
                  📞 联系求助人
                </button>
                <button class="action-btn force-cancel" @click="handleForceCancel(order.orderId)">
                  ✂️ 强制终止撤单
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { cancelDemand, getExceptionMonitorList } from '@/api/trade'
// 🚨 引入我们在 dispatch.js 里写好的真实 LBS 广播接口
import { triggerEmergencyBroadcast } from '@/api/dispatch'

const loading = ref(false)
const exceptionList = ref([])
let pollTimer = null

const fetchExceptionList = async () => {
  try {
    const res = await getExceptionMonitorList()
    if (res.data) exceptionList.value = res.data
  } catch (error) {
    console.error('获取异常面板数据失败', error)
  }
}

const calculateElapsedMinutes = (createTimeStr) => {
  if (!createTimeStr) return 0
  const createTime = new Date(createTimeStr).getTime()
  const now = new Date().getTime()
  return Math.floor((now - createTime) / 1000 / 60)
}

// 🚀 核心升级：接入真实的 LBS 广播闭环，并支持【降级策略展示与终极熔断 Fail-Fast】
const handleCallMerchant = (order) => {
  ElMessageBox.confirm(
      `系统将向订单坐标方圆 3 公里内的爱心商铺发送全屏紧急弹窗，请求定向捐赠【${order.requiredCategory}】。是否执行？`,
      '📢 触发定向紧急募捐',
      { confirmButtonText: '授权发布警报', cancelButtonText: '取消', type: 'warning', customClass: 'dopamine-msg-box' }
  ).then(async () => {
    try {
      loading.value = true

      // 发起真实后端请求，触发 LBS 空间检索与广播！
      const res = await triggerEmergencyBroadcast(order.orderId)

      // 🛡️ 核心亮点：捕获并展示降级状态
      if (res.data.isDegraded) {
        ElNotification.warning({
          title: '⚠️ 触发 LBS 扩圈降级机制',
          message: `<div style="font-size: 1.05rem; margin-top:5px;">方圆 3 公里内无响应商铺。<br/>系统已自动启动降级预案，将波纹范围扩大至 <b>${res.data.radius} 公里</b>，成功锁定 <b>${res.data.notifiedCount}</b> 家备用商铺！</div>`,
          dangerouslyUseHTMLString: true,
          duration: 10000
        })
      } else {
        // 正常最优解展示
        ElNotification.success({
          title: '✅ 广播精准送达',
          message: `<div style="font-size: 1.1rem; margin-top:5px;">已成功向周边方圆 3 公里内的 <b>${res.data.notifiedCount}</b> 家商铺发送紧急求捐指令！</div>`,
          dangerouslyUseHTMLString: true,
          duration: 6000
        })
      }

    } catch (e) {
      // 🚨 终极熔断：10公里依然无商家，触碰物理边界，Fail-Fast 报错！
      ElMessage.error({ message: e.response?.data?.message || '终极熔断：周边暂无入网商铺', duration: 5000 })
    } finally {
      loading.value = false
    }
  }).catch(() => {})
}

const handleCallUser = (order) => {
  ElMessageBox.alert(
      `<strong>求助市民：</strong> 系统用户 ID ${order.destId} <br/><br/>
     <strong>处置建议：</strong> 请指挥中心立刻致电该市民，安抚情绪并直接指派周边网格员前往物理干预。`,
      '📞 获取紧急联系档案',
      { dangerouslyUseHTMLString: true, confirmButtonText: '已核实处理', customClass: 'dopamine-msg-box' }
  )
}

const handleForceCancel = (orderId) => {
  ElMessageBox.confirm(
      '强行终止后，该求助将从调度大盘中永久抹除！请务必确保该困难已被【线下人工方式】妥善解决。',
      '✂️ 强制终止确认',
      { confirmButtonText: '已妥善解决，抹除该单', cancelButtonText: '暂不操作', type: 'error', customClass: 'dopamine-msg-box' }
  ).then(async () => {
    try {
      loading.value = true
      await cancelDemand(orderId)
      ElMessage.success('异常订单已成功强行阻断并撤销！')
      await fetchExceptionList()
    } catch (e) {} finally {
      loading.value = false
    }
  }).catch(() => {})
}

onMounted(() => {
  fetchExceptionList()
  pollTimer = setInterval(fetchExceptionList, 10000)
})

onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })
</script>

<style scoped>
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 40px; background: #f1f5f9; min-height: 100vh; overflow-y: auto;}
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.8rem; color: #ef4444; font-weight: bold; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); }
.pulse-dot { width: 8px; height: 8px; background: #ef4444; border-radius: 50%; box-shadow: 0 0 8px #ef4444; animation: pulse-red 2s infinite; }
@keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }

.admin-wrapper { max-width: 1200px; margin: 0 auto; width: 100%; }

.page-header { margin-bottom: 30px; }
.header-title-row { display: flex; align-items: center; gap: 20px;}
.alert-icon { font-size: 2.5rem; background: #fef2f2; border-radius: 18px; padding: 12px; border: 2px solid #fecaca;}
.page-header h2 { color: #1e293b; font-size: 2.2rem; margin: 0 0 8px 0; font-weight: 900; letter-spacing: 1px; }
.page-header p { color: #64748b; font-size: 1.1rem; margin: 0; }

.glass-panel { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 24px; padding: 40px; box-shadow: 0 15px 35px rgba(0,0,0,0.04); border: 1px solid #fff; }

.all-clear-state { text-align: center; padding: 80px 0; }
.text-green { color: #10b981; font-size: 1.8rem; font-weight: 900; margin: 20px 0 10px;}
.green-radar { width: 90px; height: 90px; margin: 0 auto; border-radius: 50%; border: 4px solid #d1fae5; border-top-color: #10b981; animation: spin-radar 2s linear infinite;}
@keyframes spin-radar { 100% { transform: rotate(360deg); } }

.exception-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 25px; }
.exception-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; position: relative; transition: 0.3s; box-shadow: 0 8px 20px rgba(0,0,0,0.03);}
.exception-card:hover { transform: translateY(-5px); border-color: #fca5a5; box-shadow: 0 15px 35px rgba(239, 68, 68, 0.1);}
.exception-card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 5px; background: linear-gradient(90deg, #ef4444, #f97316); }

.card-header { display: flex; justify-content: space-between; padding: 18px 22px; background: #f8fafc; border-bottom: 1px dashed #f1f5f9;}
.urgency-badge { padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 900; }
.urgency-badge.high { background: #fee2e2; color: #ef4444; animation: blink 2s infinite; }
.urgency-badge.normal { background: #fff7ed; color: #ea580c; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

.time-elapsed { color: #64748b; font-size: 0.95rem; font-weight: bold;}
.time-elapsed b { color: #ef4444; font-size: 1.2rem;}

.card-body { padding: 22px; }
.goods-name { margin: 0 0 8px; font-size: 1.4rem; color: #1e293b; font-weight: 900;}
.order-sn { color: #94a3b8; font-family: monospace; font-size: 0.95rem; margin-bottom: 20px; font-weight: bold;}

.reason-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 0 12px 12px 0;}
.reason-label { display: block; color: #ef4444; font-size: 0.85rem; margin-bottom: 6px; font-weight: 900;}
.reason-text { color: #7f1d1d; font-size: 1.05rem; font-weight: bold; line-height: 1.4;}

.card-actions { display: flex; flex-direction: column; gap: 12px; padding: 0 22px 22px;}
.action-row { display: flex; gap: 12px; }
.action-btn { flex: 1; padding: 14px; border: none; border-radius: 12px; font-size: 0.95rem; font-weight: 900; cursor: pointer; transition: 0.2s; }
.action-btn:active { transform: scale(0.96); }

.call-merchant { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);}
.call-merchant:hover { box-shadow: 0 6px 15px rgba(59, 130, 246, 0.4); filter: brightness(1.1);}

.call-user { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
.call-user:hover { background: #e2e8f0; color: #1e293b;}

.force-cancel { background: #fff; border: 1px solid #fca5a5; color: #ef4444;}
.force-cancel:hover { background: #fef2f2; border-color: #ef4444;}
</style>