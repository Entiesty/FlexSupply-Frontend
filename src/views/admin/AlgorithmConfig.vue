<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot"></span> 调度大脑引擎核心层 · Root 权限
    </div>

    <div class="config-wrapper" v-loading="loading">
      <header class="page-header">
        <h2>⚙️ 多因子调度算法调参引擎</h2>
        <p>动态控制 LBS 距离、紧急度、信誉与弱势群体权重的底层逻辑</p>
      </header>

      <div class="engine-panel">
        <!-- 应急状态机控制台 -->
        <div class="state-machine-box">
          <div class="sm-header">
            <h3>🛡️ 应急模式全生命周期状态机</h3>
            <span class="current-state-badge" :class="'state-' + form.sysMode.toLowerCase()">
              当前: {{ stateLabel(form.sysMode) }}
            </span>
          </div>
          <el-steps :active="activeStep" align-center finish-status="success" process-status="process">
            <el-step title="常态" description="NORMAL" />
            <el-step title="预警冻结" description="WARNING_FREEZE" />
            <el-step title="紧急响应" description="EMERGENCY_RESPONSE" />
            <el-step title="恢复期" description="RECOVERY" />
          </el-steps>
          <div class="sm-actions">
            <button class="sm-btn freeze" :disabled="form.sysMode !== 'NORMAL'"
                    @click="handleSwitchMode('WARNING_FREEZE')">
              ⚠️ 进入预警冻结
            </button>
            <button class="sm-btn emergency-btn" :disabled="form.sysMode !== 'WARNING_FREEZE'"
                    @click="handleSwitchMode('EMERGENCY_RESPONSE')">
              🚨 激活紧急响应
            </button>
            <button class="sm-btn recover" :disabled="form.sysMode !== 'EMERGENCY_RESPONSE'"
                    @click="handleSwitchMode('RECOVERY')">
              🩹 转入恢复期
            </button>
            <button class="sm-btn normal-btn" :disabled="form.sysMode !== 'RECOVERY' && form.sysMode !== 'WARNING_FREEZE'"
                    @click="handleSwitchMode('NORMAL')">
              🕊️ 恢复常态
            </button>
          </div>
          <el-alert v-if="form.sysMode === 'WARNING_FREEZE'" title="⚠️ 预警冻结生效中" type="warning"
            description="非应急物资已从任务大厅隐退，仅战备物资保持流通。志愿者收到待命通知。"
            :closable="false" show-icon style="margin-top: 15px;" />
          <el-alert v-if="form.sysMode === 'EMERGENCY_RESPONSE'" title="🔴 紧急响应已激活" type="error"
            description="全量物资已解锁，战时配给制与运力补贴已启动。L0直达优先，SAW权重自动切换至紧急预设。"
            :closable="false" show-icon style="margin-top: 15px;" />
          <el-alert v-if="form.sysMode === 'RECOVERY'" title="🟢 灾后恢复期" type="success"
            description="物资流通恢复常态，历史补贴结算通道限时开放中。建议在30天内完成灾后补贴清算后切回常态模式。"
            :closable="false" show-icon style="margin-top: 15px;" />
        </div>

        <div class="mode-switch-box">
          <div class="mode-label">
            <h3>系统运行模式 (平急两用切换)</h3>
            <p>切换将自动应用预设的权重模板</p>
          </div>
          <div class="mode-toggles">
            <button class="mode-btn normal" :class="{ active: form.sysMode === 'NORMAL' }"
                    @click="applyPreset('NORMAL')">
              🕊️ 平时模式 (距离优先)
            </button>
            <button class="mode-btn emergency" :class="{ active: form.sysMode === 'EMERGENCY' }"
                    @click="applyPreset('EMERGENCY')">
              🚨 急时模式 (紧急度/弱势优先)
            </button>
          </div>
        </div>

        <div class="weights-box">
          <div class="weight-header">
            <h3>多因子权重分配控制台</h3>
            <div class="total-checker" :class="{ error: totalWeight !== 100 }">
              当前总和: {{ totalWeight }}%
              <span v-if="totalWeight !== 100" class="err-msg"> (必须等于 100%)</span>
            </div>
          </div>

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
import {ref, reactive, computed, onMounted} from 'vue'
import {ElMessage, ElMessageBox} from 'element-plus'
import {getCurrentConfig, updateConfig, switchMode, preCheckMode} from '@/api/config'

const loading = ref(false)

const form = reactive({
  sysMode: 'NORMAL',
  wDist: 80,
  wUrgency: 5,
  wCredit: 5,
  wTag: 10
})

const stepMap = { 'NORMAL': 0, 'WARNING_FREEZE': 1, 'EMERGENCY_RESPONSE': 2, 'RECOVERY': 3 }
const activeStep = computed(() => stepMap[form.sysMode] ?? 0)

const stateLabel = (mode) => {
  const map = { 'NORMAL': '🕊️ 常态', 'WARNING_FREEZE': '⚠️ 预警冻结期', 'EMERGENCY_RESPONSE': '🚨 紧急响应期', 'RECOVERY': '🩹 恢复期' }
  return map[mode] || mode
}

const totalWeight = computed(() => form.wDist + form.wUrgency + form.wCredit + form.wTag)

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
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleSwitchMode = async (targetMode) => {
  // WARNING_FREEZE 预检：无战备物资时二次确认
  if (targetMode === 'WARNING_FREEZE') {
    try {
      const res = await preCheckMode('WARNING_FREEZE')
      const count = res.data?.emergencyCount || 0
      const warning = res.data?.warning
      const msg = warning
        ? `⚠️ ${warning}。\n\n确定要继续进入预警冻结状态吗？`
        : `当前共有 ${count} 批战备物资储备。\n\n进入预警冻结后，非应急物资将从调度列表隐退。确定继续吗？`

      await ElMessageBox.confirm(msg.replace(/\n/g, '<br/>'), '预警冻结预检', {
        confirmButtonText: '确认进入',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: true
      })
    } catch (e) {
      return // 用户取消
    }
  }

  ElMessageBox.confirm(`确定将系统模式切换至【${stateLabel(targetMode)}】吗？此操作将立即改变全局调度策略与 SAW 算法权重。`, '应急状态机操作', {
    confirmButtonText: '确认切换',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await switchMode({ targetMode })
      form.sysMode = targetMode
      await fetchConfig() // 刷新权重显示
      ElMessage.success(`系统模式已切换至: ${stateLabel(targetMode)}，SAW 权重已自动同步`)
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '状态机切换失败')
    }
  }).catch(() => {})
}

const applyPreset = (mode) => {
  if (mode === 'NORMAL') {
    form.sysMode = 'NORMAL'
    form.wDist = 80; form.wUrgency = 5; form.wCredit = 5; form.wTag = 10;
  } else {
    form.sysMode = 'EMERGENCY'
    form.wDist = 30; form.wUrgency = 40; form.wCredit = 0; form.wTag = 30;
  }
}

const handleSave = () => {
  if (totalWeight.value !== 100) return

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
        wTag: (form.wTag / 100).toFixed(2)
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

onMounted(() => fetchConfig())
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
  0% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
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

/* 应急状态机控制台 */
.state-machine-box { padding: 30px; background: #fff; border-bottom: 2px dashed #e2e8f0; }
.sm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.sm-header h3 { margin: 0; color: #1e293b; font-size: 1.3rem; font-weight: 900; }
.current-state-badge { padding: 6px 16px; border-radius: 20px; font-weight: 900; font-size: 0.85rem; }
.current-state-badge.state-normal { background: #ecfdf5; color: #059669; }
.current-state-badge.state-warning_freeze { background: #fffbeb; color: #d97706; }
.current-state-badge.state-emergency_response { background: #fef2f2; color: #dc2626; }
.current-state-badge.state-recovery { background: #eff6ff; color: #2563eb; }

.sm-actions { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; justify-content: center; }
.sm-btn { padding: 10px 18px; border-radius: 12px; border: none; font-weight: 900; font-size: 0.85rem; cursor: pointer; transition: 0.3s; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.sm-btn:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; box-shadow: none; }
.sm-btn.freeze:not(:disabled) { background: #fffbeb; color: #d97706; border: 1px solid #fcd34d; }
.sm-btn.freeze:hover:not(:disabled) { background: #fef3c7; transform: translateY(-2px); }
.sm-btn.emergency-btn:not(:disabled) { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.sm-btn.emergency-btn:hover:not(:disabled) { background: #fee2e2; transform: translateY(-2px); }
.sm-btn.recover:not(:disabled) { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
.sm-btn.recover:hover:not(:disabled) { background: #dbeafe; transform: translateY(-2px); }
.sm-btn.normal-btn:not(:disabled) { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
.sm-btn.normal-btn:hover:not(:disabled) { background: #d1fae5; transform: translateY(-2px); }

.mode-switch-box {
  padding: 30px;
  background: #f8fafc;
  border-bottom: 2px dashed #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mode-label h3 {
  margin: 0 0 5px;
  color: #1e293b;
  font-size: 1.3rem;
  font-weight: 900;
}

.mode-label p {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}

.mode-toggles {
  display: flex;
  gap: 15px;
}

.mode-btn {
  padding: 12px 20px;
  border-radius: 12px;
  border: 2px solid transparent;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  transition: 0.3s;
  background: #fff;
  color: #64748b;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
}

.mode-btn.normal.active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #2563eb;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
}

.mode-btn.emergency.active {
  border-color: #ef4444;
  background: #fef2f2;
  color: #dc2626;
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2);
}

.weights-box {
  padding: 30px;
}

.weight-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
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

/* 深度修改 Element UI 滑块样式匹配多巴胺主题 */
:deep(.el-slider__bar) {
  background-color: #f97316;
}

:deep(.el-slider__button) {
  border-color: #f97316;
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.4);
}

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