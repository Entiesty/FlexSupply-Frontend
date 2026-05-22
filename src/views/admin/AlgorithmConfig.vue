<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot"></span> 算法配置 · 管理员权限
    </div>

    <div class="config-wrapper" v-loading="loading">
      <header class="page-header">
        <h2>⚙️ 多因子调度算法调参引擎</h2>
        <p>动态控制 LBS 距离、紧急度、信誉与弱势群体权重的底层逻辑</p>
      </header>

      <div class="engine-panel">
        <!-- 极简双轨状态机 -->
        <div class="state-machine-box">
          <div class="sm-header">
            <h3>⚙️ 全局平急状态机控制台</h3>
            <span class="current-state-badge" :class="'state-' + form.sysMode.toLowerCase()">
              当前: {{ stateLabel(form.sysMode) }}
            </span>
          </div>
          <div class="sm-actions">
            <button class="sm-btn normal-btn" :disabled="form.sysMode === 'NORMAL'"
                    @click="handleSwitchMode('NORMAL')">
              🟢 恢复常态模式
            </button>
            <button class="sm-btn emergency-btn" :disabled="form.sysMode === 'EMERGENCY'"
                    @click="handleSwitchMode('EMERGENCY')">
              🚨 激活应急模式
            </button>
          </div>
          <el-alert v-if="form.sysMode === 'NORMAL'" title="🟢 常态模式运行中" type="success"
            description="Hub & Spoke 驿站中转, SAW距离优先(wDist=35%), 无配给限制, 日常物资自由流通。"
            :closable="false" show-icon style="margin-top: 15px;" />
          <el-alert v-if="form.sysMode === 'EMERGENCY'" title="🔴 应急模式已激活" type="error"
            description="P2P直达优先, SAW紧急度优先(wUrgency=45%), 配给制+防挤兑+LBS雷达自动广播已全部启动。"
            :closable="false" show-icon style="margin-top: 15px;" />
        </div>

        <div class="weights-box">
          <div class="weight-header">
            <h3>多因子权重分配控制台</h3>
            <div class="total-checker" :class="{ error: totalWeight !== 100 }">
              当前总和: {{ totalWeight }}%
              <span v-if="totalWeight !== 100" class="err-msg"> (必须等于 100%)</span>
            </div>
          </div>

          <p class="slider-tip">💡 提示：模式切换时将自动应用最佳预设权重。下方滑块仅用于当前模式的特殊情况微调。</p>

          <div class="slider-group">
            <div class="slider-item">
              <label>🚴 LBS 空间距离权重 <span>(w_dist: {{ form.wDist }}%)</span></label>
              <el-slider v-model="form.wDist" :step="5" show-stops/>
            </div>
            <div class="slider-item">
              <label>🔥 订单紧急度权重 <span>(w_urgency: {{ form.wUrgency }}%)</span></label>
              <el-slider v-model="form.wUrgency" :step="5" show-stops/>
            </div>
            <div class="slider-item">
              <label>🏆 志愿者信誉加权 <span>(w_credit: {{ form.wCredit }}%)</span></label>
              <el-slider v-model="form.wCredit" :step="5" show-stops/>
            </div>
            <div class="slider-item">
              <label>👴 弱势群体标签保护权重 <span>(w_tag: {{ form.wTag }}%)</span></label>
              <el-slider v-model="form.wTag" :step="5" show-stops/>
            </div>
            <div class="slider-item">
              <label>📅 物资临期偏好 (FEFO) <span>(w_expiration: {{ form.wExpiration }}%)</span></label>
              <el-slider v-model="form.wExpiration" :step="5" show-stops/>
            </div>
            <div class="slider-item">
              <label>📦 据点库存偏好 <span>(w_stock: {{ form.wStock }}%)</span></label>
              <el-slider v-model="form.wStock" :step="5" show-stops/>
            </div>
          </div>
        </div>

        <div class="action-footer">
          <button class="save-btn" @click="handleSave" :disabled="totalWeight !== 100">
            <span class="icon">💾</span> 热更新引擎并保存
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getCurrentConfig, updateConfig, switchMode } from '@/api/config'

const loading = ref(false)

const form = reactive({
  sysMode: 'NORMAL',
  wDist: 35,
  wUrgency: 20,
  wCredit: 15,
  wTag: 15,
  wExpiration: 10,
  wStock: 5
})

const stateLabel = (mode) => {
  const map = { 'NORMAL': '🟢 常态模式', 'EMERGENCY': '🔴 应急模式' }
  return map[mode] || mode
}

const totalWeight = computed(() => form.wDist + form.wUrgency + form.wCredit + form.wTag + form.wExpiration + form.wStock)

const fetchConfig = async () => {
  loading.value = true
  try {
    const res = await getCurrentConfig()
    if (res.data) {
      form.sysMode = res.data.sysMode
      form.wDist = res.data.wDist * 100
      form.wUrgency = res.data.wUrgency * 100
      form.wCredit = res.data.wCredit * 100
      form.wTag = res.data.wTag * 100
      form.wExpiration = (res.data.wExpiration || 0) * 100
      form.wStock = (res.data.wStock || 0) * 100
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// 全局模式切换监听 —— 单一数据源：WebSocket 事件驱动，不本地抢先修改状态
const handleModeChange = (e) => {
  if (e.detail?.mode && form.sysMode !== e.detail.mode) {
    form.sysMode = e.detail.mode
    fetchConfig()
    ElMessage.success(`系统已同步至: ${stateLabel(e.detail.mode)}，权重已自动拉取最新预设`)
  }
}

const handleSwitchMode = async (targetMode) => {
  if (totalWeight.value !== 100) {
    ElMessage.warning(`当前权重总和为 ${totalWeight.value}%，请先将权重调整为 100% 再切换模式`)
    return
  }
  ElMessageBox.confirm(
    `确定将系统模式切换至【${stateLabel(targetMode)}】吗？此操作将立即改变全局 SAW 权重、配给制与 LBS 广播策略。`,
    '双轨状态机操作',
    { confirmButtonText: '确认切换', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    try {
      await switchMode({ targetMode })
      ElMessage.success('模式切换指令已下发，正在等待全网同步...')
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '状态机切换失败')
    }
  }).catch(() => {})
}

const handleSave = () => {
  if (totalWeight.value !== 100) {
    ElMessage.warning(`当前权重总和为 ${totalWeight.value}%，必须严格等于 100% 才能提交`)
    return
  }

  ElMessageBox.confirm('确定要热更新调度引擎的底层权重吗？', '高权限警报', {
    confirmButtonText: '执行覆盖',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    loading.value = true
    try {
      const payload = {
        sysMode: form.sysMode,
        wDist: (form.wDist / 100).toFixed(2),
        wUrgency: (form.wUrgency / 100).toFixed(2),
        wCredit: (form.wCredit / 100).toFixed(2),
        wTag: (form.wTag / 100).toFixed(2),
        wExpiration: (form.wExpiration / 100).toFixed(2),
        wStock: (form.wStock / 100).toFixed(2)
      }
      await updateConfig(payload)
      ElMessage.success('引擎权重热更新完毕！')
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }).catch(() => {})
}

onMounted(() => {
  fetchConfig()
  window.addEventListener('mode-changed', handleModeChange)
})

onUnmounted(() => {
  window.removeEventListener('mode-changed', handleModeChange)
})
</script>

<style scoped>
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  padding: 40px;
}

.top-status {
  position: absolute;
  top: 20px;
  right: 30px;
  z-index: 100;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.75rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
  box-shadow: 0 0 8px #ef4444;
  animation: pulse-red 2s infinite;
}

@keyframes pulse-red {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.config-wrapper {
  max-width: 900px;
  margin: 20px auto 0;
  width: 100%;
}

.page-header h2 {
  color: #1e293b;
  font-size: 2.2rem;
  margin: 0 0 8px 0;
  font-weight: 900;
  letter-spacing: 1px;
}

.page-header p {
  color: #64748b;
  font-size: 1.1rem;
  margin: 0 0 30px 0;
}

.engine-panel {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

/* ===== 应急状态机控制台 ===== */
.state-machine-box {
  padding: 30px;
  background: #fff;
  border-bottom: 2px dashed #e2e8f0;
}

.sm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.sm-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.3rem;
  font-weight: 900;
}

.current-state-badge {
  padding: 6px 16px;
  border-radius: 20px;
  font-weight: 900;
  font-size: 0.85rem;
}

.current-state-badge.state-normal {
  background: #ecfdf5;
  color: #059669;
}

.current-state-badge.state-emergency {
  background: #fef2f2;
  color: #dc2626;
}

.sm-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;
  justify-content: center;
}

.sm-btn {
  padding: 10px 18px;
  border-radius: 12px;
  border: none;
  font-weight: 900;
  font-size: 0.85rem;
  cursor: pointer;
  transition: 0.3s;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.sm-btn:disabled {
  background: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
  box-shadow: none;
}

.sm-btn.emergency-btn:not(:disabled) {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.sm-btn.emergency-btn:hover:not(:disabled) {
  background: #fee2e2;
  transform: translateY(-2px);
}

.sm-btn.normal-btn:not(:disabled) {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.sm-btn.normal-btn:hover:not(:disabled) {
  background: #d1fae5;
  transform: translateY(-2px);
}

/* ===== 权重控制台 ===== */
.weights-box {
  padding: 30px;
}

.weight-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.weight-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.3rem;
  font-weight: 900;
}

.total-checker {
  background: #ecfdf5;
  color: #10b981;
  padding: 8px 16px;
  border-radius: 12px;
  font-weight: 900;
  font-size: 1.1rem;
  border: 1px solid #d1fae5;
  transition: 0.3s;
}

.total-checker.error {
  background: #fef2f2;
  color: #ef4444;
  border-color: #fee2e2;
}

.err-msg {
  font-size: 0.85rem;
  font-weight: normal;
}

.slider-tip {
  font-size: 0.85rem;
  color: #f59e0b;
  margin-bottom: 20px;
  font-weight: bold;
  background: #fffbeb;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #fde68a;
}

.slider-group {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.slider-item label {
  display: flex;
  justify-content: space-between;
  font-weight: bold;
  color: #334155;
  margin-bottom: 5px;
  font-size: 1rem;
}

.slider-item label span {
  color: #f97316;
  font-family: monospace;
  font-size: 1.1rem;
}

:deep(.el-slider__bar) {
  background-color: #f97316;
}

:deep(.el-slider__button) {
  border-color: #f97316;
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.4);
}

/* ===== 操作底栏 ===== */
.action-footer {
  padding: 25px 30px;
  background: #fff;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
}

.save-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 30px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #1e293b, #0f172a);
  color: #fff;
  font-size: 1.1rem;
  font-weight: 900;
  cursor: pointer;
  transition: 0.3s;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.3);
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 25px rgba(15, 23, 42, 0.4);
}

.save-btn:disabled {
  background: #cbd5e1;
  color: #f8fafc;
  cursor: not-allowed;
  box-shadow: none;
}
</style>
