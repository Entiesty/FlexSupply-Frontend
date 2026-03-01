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
import {getCurrentConfig, updateConfig} from '@/api/config'

const loading = ref(false)

// 前端展示用百分比(整数)，提交后端时除以 100 变小数
const form = reactive({
  sysMode: 'NORMAL',
  wDist: 80,
  wUrgency: 5,
  wCredit: 5,
  wTag: 10
})

const totalWeight = computed(() => {
  return form.wDist + form.wUrgency + form.wCredit + form.wTag
})

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

// 模拟毕设中的“平急两用”一键切换预设模板
const applyPreset = (mode) => {
  if (mode === 'NORMAL') {
    form.sysMode = 'NORMAL'
    form.wDist = 80;
    form.wUrgency = 5;
    form.wCredit = 5;
    form.wTag = 10;
  } else {
    form.sysMode = 'EMERGENCY'
    // 灾时模式：距离变得不那么重要，弱势群体保护和紧急度拉满
    form.wDist = 30;
    form.wUrgency = 40;
    form.wCredit = 0;
    form.wTag = 30;
  }
}

const handleSave = () => {
  if (totalWeight.value !== 100) return

  ElMessageBox.confirm('确定要热更新调度引擎的底层权重吗？该操作将立即影响后续所有订单的派发逻辑。', '高权限警报', {
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
  }).catch(() => {
  })
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