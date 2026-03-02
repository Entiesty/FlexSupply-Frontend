<template>
  <div class="dispatch-control">
    <aside v-if="!isMissionActive" class="action-card">
      <div class="card-label">待处理调度需求</div>
      <div class="task-box">
        <div v-if="!result" class="empty-placeholder">
          {{ userRole === 4 ? '点击下方开启智能匹配' : '正在监听调度中心派单...' }}
        </div>
        <div v-else class="task-detail">
          <div class="task-row"><span class="t-key">单号:</span><span class="t-val">{{ result?.orderSn || 'ORD-NEW' }}</span></div>
          <div class="task-row"><span class="t-key">物资:</span><span class="t-val">{{ result?.goodsName || result?.requiredCategory || '应急物资' }}</span></div>

          <div class="task-row">
            <span class="t-key">模式:</span>
            <span class="t-val" :style="{ color: pendingOrder?.deliveryMethod === 2 ? '#10b981' : '#3b82f6' }">
              {{ pendingOrder?.deliveryMethod === 2 ? '🚶 居民自提' : '🚴 志愿者配送' }}
            </span>
          </div>
          <div class="task-row"><span class="t-key">紧急:</span><span class="t-val t-urgent">等级 {{ result?.urgencyLevel || 10 }}</span></div>
        </div>
      </div>

      <template v-if="userRole === 4">
        <template v-if="pendingOrder?.deliveryMethod === 2">
          <button class="dispatch-btn pickup-btn" @click="$emit('notify-pickup')">
            📍 锁定物资并下发自提路线
          </button>
        </template>
        <template v-else>
          <button class="dispatch-btn" :disabled="loading" @click="$emit('dispatch')">
            <span v-if="loading" class="btn-loader"></span>{{ loading ? '引擎计算中...' : '🎯 启动智能调度算法' }}
          </button>
          <button v-if="result" class="fallback-btn" @click="$emit('switch-pickup')">
            ⚠️ {{ fallbackCountdown > 0 ? `等待 ${fallbackCountdown}s 后自动转自提，也可手动提前干预` : '已超时！请立即转自提兜底' }}
          </button>
        </template>
      </template>

      <template v-else>
        <button v-if="pendingOrder?.deliveryMethod === 2" class="dispatch-btn waiting-btn" disabled>
          此单为市民自提，无需配送
        </button>
        <button v-else class="dispatch-btn waiting-btn" disabled>
          <span class="btn-loader"></span>正在接收算法指令...
        </button>
      </template>
    </aside>

    <transition name="mission-slide">
      <aside v-if="isMissionActive" class="mission-board">
        <div class="mb-head"><span class="mb-tag">🚀 任务进行中</span><span class="mb-id">{{ activeOrder?.orderSn }}</span></div>
        <div class="mb-body">
          <h3 class="mb-title">{{ activeOrder?.stationName }}</h3>
          <p class="mb-addr">📍 {{ activeOrder?.address }}</p>
          <div class="mb-timer"><span class="timer-label">预计抵达时间</span><span class="timer-val">{{ activeOrder?.eta }}</span></div>
        </div>
        <div class="mb-footer">
          <button class="contact-btn">📞 联系据点</button>
          <button class="finish-btn" @click="$emit('finish')">完成配送</button>
        </div>
      </aside>
    </transition>

    <transition name="drawer-slide">
      <div v-if="result && !isMissionActive" class="result-drawer" :class="{ 'shake-error': isError }">
        <div class="res-content">
          <div class="res-tag">BEST MATCH 最佳匹配</div>
          <h2 class="res-title">{{ result?.station?.stationName || result?.stationName || '目标据点' }}</h2>
          <div class="res-stats">
            <div class="stat-item">🚴 距离 <strong>{{ result?.distance || 1500 }}</strong> 米</div>
            <div class="stat-item">⏱️ 耗时 <strong>{{ result?.duration ? Math.ceil(result.duration / 60) : 10 }}</strong> 分</div>
            <div class="stat-item">📊 评分 <strong>{{ result?.finalScore ? result.finalScore.toFixed(2) : '99.00' }}</strong></div>
          </div>
        </div>
        <div class="res-action">
          <div v-if="userRole === 4" class="admin-monitor-status">
            <span class="status-dot blink"></span> 最优方案已生成，正在呼叫志愿者...
          </div>
          <button v-else class="grab-btn" @click="$emit('grab')">
            ⚡ 确认响应 · 立即抢单
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
defineProps({
  userRole: Number,
  pendingOrder: Object,
  loading: Boolean,
  result: Object,
  isMissionActive: Boolean,
  activeOrder: Object,
  isError: Boolean,
  fallbackCountdown: Number // 🚨 接收倒计时数字
})
defineEmits(['dispatch', 'grab', 'finish', 'notify-pickup', 'switch-pickup'])
</script>

<style scoped>
/* 原有基础样式 */
.dispatch-control { pointer-events: none; }
.dispatch-control > * { pointer-events: auto; }
.action-card { position: absolute; top: 80px; right: 30px; left: auto; z-index: 100; width: 280px; background: #fff; border-radius: 24px; padding: 24px; border: 1px solid rgba(249, 115, 22, 0.15); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06); }
.empty-placeholder { color: #94a3b8; font-size: 0.85rem; padding: 15px 0; text-align: center; border: 1px dashed #e2e8f0; border-radius: 12px; }
.card-label { font-size: 0.75rem; color: #f97316; font-weight: 800; margin-bottom: 15px; }
.task-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.85rem; color: #64748b; }
.t-val { font-weight: 700; color: #1e293b; }
.t-urgent { color: #ef4444; }
.dispatch-btn { width: 100%; padding: 14px; border-radius: 14px; border: none; background: #f97316; color: #fff; font-weight: 800; cursor: pointer; transition: 0.3s; margin-top: 10px; }
.dispatch-btn:hover { background: #ea580c; transform: translateY(-2px); box-shadow: 0 8px 15px rgba(249, 115, 22, 0.2); }
.waiting-btn { background: #cbd5e1 !important; color: #475569 !important; cursor: not-allowed !important; transform: none !important; box-shadow: none !important; }
.waiting-btn .btn-loader { border-color: rgba(71, 85, 105, 0.3); border-top-color: #475569; }

/* 🚨 新增：自提与熔断按钮专属样式 */
.pickup-btn { background: #10b981; }
.pickup-btn:hover { background: #059669; }
.fallback-btn { width: 100%; padding: 10px; margin-top: 10px; border: 1px dashed #ef4444; background: #fef2f2; color: #ef4444; border-radius: 12px; font-size: 0.8rem; cursor: pointer; transition: 0.3s; font-weight: bold;}
.fallback-btn:hover { background: #fee2e2; }

/* 状态展示区与动画样式 */
.admin-monitor-status { padding: 12px 20px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; color: #475569; font-size: 0.9rem; font-weight: bold; display: flex; align-items: center; gap: 10px; }
.status-dot.blink { width: 10px; height: 10px; background: #3b82f6; border-radius: 50%; animation: fade 1s infinite alternate; }
@keyframes fade { from { opacity: 0.3; } to { opacity: 1; transform: scale(1.2); } }
.mission-board { position: absolute; top: 80px; right: 30px; left: auto; z-index: 105; width: 320px; background: #fff; border-radius: 24px; padding: 24px; border: 2px solid #f97316; box-shadow: 0 20px 40px rgba(249, 115, 22, 0.15); }
.mb-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.mb-tag { font-size: 0.75rem; color: #f97316; font-weight: 900; background: #fff7ed; padding: 4px 10px; border-radius: 8px; }
.mb-id { font-size: 0.7rem; color: #94a3b8; }
.mb-title { font-size: 1.1rem; color: #1e293b; font-weight: bold; margin-bottom: 8px; }
.mb-addr { font-size: 0.85rem; color: #64748b; margin-bottom: 15px; }
.mb-timer { background: #fff7ed; padding: 12px; border-radius: 12px; text-align: center; }
.timer-label { font-size: 0.7rem; color: #f97316; }
.timer-val { display: block; font-size: 1.4rem; font-weight: 900; color: #ea580c; }
.mb-footer { display: flex; gap: 10px; margin-top: 20px; }
.contact-btn, .finish-btn { flex: 1; padding: 12px; border-radius: 12px; font-weight: bold; cursor: pointer; }
.contact-btn { background: #fff; border: 1.5px solid #f97316; color: #f97316; }
.finish-btn { background: #f97316; border: none; color: #fff; }
.result-drawer { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); width: 700px; z-index: 100; background: #fff; border-radius: 24px; padding: 25px 40px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15); border: 2px solid transparent; transition: 0.3s; }
.res-tag { font-size: 0.7rem; color: #10b981; font-weight: 900; }
.res-title { font-size: 1.5rem; color: #1e293b; margin: 5px 0 10px; font-weight: 800; }
.res-stats { display: flex; gap: 20px; font-size: 0.85rem; color: #64748b; }
.res-stats strong { color: #f97316; font-size: 1rem; }
.grab-btn { padding: 16px 30px; background: #f97316; color: #fff; border: none; border-radius: 16px; font-weight: 800; cursor: pointer; transition: 0.3s; font-size: 1rem; }
.grab-btn:hover { background: #ea580c; transform: scale(1.05); }
@keyframes shake { 0%, 100% { transform: translate(-50%, 0); } 25% { transform: translate(-52%, 0); } 75% { transform: translate(-48%, 0); } }
.shake-error { animation: shake 0.4s ease-in-out; border-color: #ef4444 !important; box-shadow: 0 0 30px rgba(239, 68, 68, 0.3) !important; }
.drawer-slide-enter-active, .mission-slide-enter-active { transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.drawer-slide-enter-from { transform: translate(-50%, 150%); opacity: 0; }
.mission-slide-enter-from { transform: translateX(120%); opacity: 0; }
.btn-loader { display: inline-block; width: 14px; height: 14px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>