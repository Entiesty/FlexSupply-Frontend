<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot"></span> 千人千面成就系统渲染中
    </div>

    <div class="profile-container" v-loading="loading">

      <div class="hero-section" :class="roleThemeClass">
        <div class="hero-bg-shapes">
          <div class="shape s1"></div>
          <div class="shape s2"></div>
        </div>

        <div class="hero-content">
          <div class="avatar-wrapper" @click="triggerAvatarUpload">
            <img v-if="stats.avatar" :src="stats.avatar" class="avatar-img" />
            <div v-else class="avatar-placeholder">{{ stats.username?.charAt(0) || 'U' }}</div>
            <div class="avatar-mask">
              <span class="camera-icon">📷</span>
            </div>
            <input type="file" ref="avatarInput" hidden @change="handleAvatarChange" accept="image/*" />
          </div>

          <div class="user-intro">
            <h2 class="greeting">你好，{{ stats.username }}</h2>
            <div class="role-badge-glow">{{ roleNameMap[stats.role] }}</div>
          </div>
        </div>

        <div v-if="stats.role === 3" class="dashboard-cards volunteer-board">
          <div class="data-card fitness-card">
            <div class="card-icon">🏃‍♂️</div>
            <div class="card-info">
              <p>累计有氧减脂里程</p>
              <h3>{{ stats.runningMileage || '0.00' }} <span>km</span></h3>
            </div>
          </div>
          <div class="data-card">
            <div class="card-icon">📦</div>
            <div class="card-info">
              <p>护航履约单数</p>
              <h3>{{ stats.totalDeliveredOrders || 0 }} <span>单</span></h3>
            </div>
          </div>
          <div class="data-card score-card">
            <div class="card-icon">🏆</div>
            <div class="card-info">
              <p>城市信誉星级评分</p>
              <h3>{{ stats.creditScore || 100 }} <span>分</span></h3>
            </div>
          </div>
        </div>

        <div v-else-if="stats.role === 2" class="dashboard-cards merchant-board">
          <div class="data-card">
            <div class="card-icon">💝</div>
            <div class="card-info">
              <p>累计捐赠物资批次</p>
              <h3>{{ stats.totalDonatedGoods || 0 }} <span>批</span></h3>
            </div>
          </div>
          <div class="data-card heart-card">
            <div class="card-icon">🌟</div>
            <div class="card-info">
              <p>累计温暖城市人次</p>
              <h3>{{ stats.totalHelpCount || 0 }} <span>人次</span></h3>
            </div>
          </div>
        </div>

        <div v-else-if="stats.role === 1" class="dashboard-cards recipient-board">
          <div class="data-card">
            <div class="card-icon">🛡️</div>
            <div class="card-info">
              <p>专属人群关怀标签</p>
              <h3>{{ formatUserTag(stats.userTag) }}</h3>
            </div>
          </div>
          <div class="data-card">
            <div class="card-icon">🤝</div>
            <div class="card-info">
              <p>累计获得援助次数</p>
              <h3>{{ stats.totalReceivedTimes || 0 }} <span>次</span></h3>
            </div>
          </div>
        </div>
      </div>

      <div v-if="stats.role === 3" class="radar-section">
        <div class="radar-header">
          <h3>⚡ 骑手综合能力评估矩阵</h3>
          <p>基于多因子调度引擎底层数据的多维能力画像</p>
        </div>
        <div ref="radarChartRef" class="radar-chart-box"></div>
      </div>

      <div class="settings-grid">
        <div class="setting-card">
          <div class="card-header">
            <h3>📝 基础身份资料</h3>
          </div>
          <div class="card-body">
            <div class="info-row">
              <label>注册手机号 (凭证不可改)</label>
              <input type="text" :value="profile.phone" disabled class="input-disabled" />
            </div>
            <div class="info-row">
              <label>系统展示名称 / 真实姓名</label>
              <input type="text" v-model="profileForm.username" placeholder="请输入您的姓名" class="input-normal" />
            </div>
            <button class="save-btn" @click="handleUpdateProfile">💾 保存基础资料</button>
          </div>
        </div>

        <div class="setting-card alert-card">
          <div class="card-header">
            <h3>🔒 安全密钥设置</h3>
          </div>
          <div class="card-body">
            <div class="info-row">
              <label>当前使用的旧密码</label>
              <input type="password" v-model="pwdForm.oldPassword" placeholder="请输入原密码" class="input-normal" />
            </div>
            <div class="info-row">
              <label>启用新密码</label>
              <input type="password" v-model="pwdForm.newPassword" placeholder="请输入新密码 (至少6位)" class="input-normal" />
            </div>
            <div class="info-row">
              <label>二次确认新密码</label>
              <input type="password" v-model="pwdForm.confirmPassword" placeholder="请再次输入新密码" class="input-normal" />
            </div>
            <button class="save-btn warning-btn" @click="handleUpdatePassword">🛡️ 确认修改密码</button>
          </div>
        </div>
      </div>

    </div>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
// 引入刚刚补齐的接口
import { getUserProfile, updateUserProfile, updatePassword, getDashboardStats, updateAvatar } from '@/api/user'
import { uploadFile } from '@/api/common' // 引入在 Auth.vue 中已验证过的上传接口

const loading = ref(false)
const profile = ref({})
const stats = ref({}) // 千人千面大盘数据

const avatarInput = ref(null)
const radarChartRef = ref(null)
let myRadarChart = null

const roleNameMap = {
  1: '👴 重点关怀对象',
  2: '🏪 城市爱心合伙人',
  3: '🚴 核心护航骑手',
  4: '👨‍💻 指挥中心 Root'
}

const roleThemeClass = computed(() => {
  const map = { 1: 'theme-recipient', 2: 'theme-merchant', 3: 'theme-volunteer', 4: 'theme-admin' }
  return map[stats.value.role] || 'theme-volunteer'
})

const profileForm = reactive({ username: '' })
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

// 翻译受赠方群体标签
const formatUserTag = (tag) => {
  const map = { 'ELDERLY': '需照顾老人', 'DISABLED': '残障人士', 'SAN_WORKER': '环卫工人', 'NORMAL': '普通求助者' }
  return map[tag] || tag || '普通用户'
}

const fetchAllData = async () => {
  loading.value = true
  try {
    // 并发请求基础资料与大盘数据
    const [profileRes, statsRes] = await Promise.all([
      getUserProfile(),
      getDashboardStats()
    ])

    profile.value = profileRes.data
    profileForm.username = profileRes.data.username
    stats.value = statsRes.data

    // 如果是志愿者，渲染雷达图
    if (stats.value.role === 3) {
      nextTick(() => initRadarChart())
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// 🚴 志愿者雷达图渲染逻辑
const initRadarChart = () => {
  if (!radarChartRef.value) return
  if (!myRadarChart) myRadarChart = echarts.init(radarChartRef.value)

  // 基于真实数据计算衍生能力维度 (营造高级感)
  const credit = stats.value.creditScore || 100
  const orders = stats.value.totalDeliveredOrders || 0
  const mileage = parseFloat(stats.value.runningMileage || 0)

  const option = {
    color: ['#f97316'],
    tooltip: { trigger: 'item' },
    radar: {
      indicator: [
        { name: '信誉可靠度', max: 150 },
        { name: '运力活跃度', max: Math.max(orders + 10, 50) },
        { name: '减脂/环保贡献', max: Math.max(mileage + 10, 50) },
        { name: '按时履约率', max: 100 },
        { name: '高难工单响应', max: 100 }
      ],
      splitArea: { areaStyle: { color: ['rgba(249, 115, 22, 0.02)', 'rgba(249, 115, 22, 0.05)', 'rgba(249, 115, 22, 0.08)', 'rgba(249, 115, 22, 0.11)'] } },
      axisLine: { lineStyle: { color: 'rgba(249, 115, 22, 0.2)' } },
      splitLine: { lineStyle: { color: 'rgba(249, 115, 22, 0.2)' } },
      name: { textStyle: { color: '#475569', fontWeight: 'bold', fontSize: 13, padding: [3, 5] } }
    },
    series: [{
      name: '能力画像',
      type: 'radar',
      data: [{
        // 动态数据填充
        value: [credit, orders, mileage, Math.min(credit, 100), Math.min(orders * 5, 95)],
        name: '当前综合评估',
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(249, 115, 22, 0.6)' }, { offset: 1, color: 'rgba(249, 115, 22, 0.1)' }]) },
        lineStyle: { width: 3, color: '#ea580c' },
        itemStyle: { color: '#ea580c', borderColor: '#fff', borderWidth: 2 }
      }]
    }]
  }
  myRadarChart.setOption(option)
}

// ================= 头像上传闭环 =================
const triggerAvatarUpload = () => {
  if (avatarInput.value) avatarInput.value.click()
}

const handleAvatarChange = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) return ElMessage.warning('头像大小不能超过 2MB')

  loading.value = true
  try {
    // 1. 上传图片到 MinIO (复用你的 FileController)
    const uploadRes = await uploadFile(file)
    const avatarUrl = uploadRes.data

    // 2. 将 URL 更新到用户表
    await updateAvatar(avatarUrl)

    // 3. 更新本地视图
    stats.value.avatar = avatarUrl
    ElMessage.success('全新头像已装备！')
  } catch (error) {
    console.error('头像上传失败', error)
  } finally {
    loading.value = false
    e.target.value = '' // 清空 input
  }
}

// ================= 基础资料保存 =================
const handleUpdateProfile = async () => {
  if (!profileForm.username.trim()) return ElMessage.warning('姓名不能为空')
  try {
    await updateUserProfile({ username: profileForm.username })
    ElMessage.success('基础资料更新成功')
    localStorage.setItem('username', profileForm.username)
    stats.value.username = profileForm.username
  } catch (e) { console.error(e) }
}

// ================= 密码保存 =================
const handleUpdatePassword = async () => {
  if (!pwdForm.oldPassword || !pwdForm.newPassword) return ElMessage.warning('密码填写不完整')
  if (pwdForm.newPassword !== pwdForm.confirmPassword) return ElMessage.warning('两次输入的新密码不一致')
  if (pwdForm.newPassword.length < 6) return ElMessage.warning('新密码长度不能小于6位')

  try {
    await updatePassword({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword })
    ElMessage.success('密码修改成功，请牢记新密码！')
    pwdForm.oldPassword = ''; pwdForm.newPassword = ''; pwdForm.confirmPassword = '';
  } catch (e) { console.error(e) }
}

onMounted(() => {
  fetchAllData()
  window.addEventListener('resize', () => { if (myRadarChart) myRadarChart.resize() })
})
</script>

<style scoped>
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 40px; background: #f1f5f9; overflow-y: auto; height: 100vh; box-sizing: border-box; }

.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); }
.pulse-dot { width: 8px; height: 8px; background: #8b5cf6; border-radius: 50%; box-shadow: 0 0 8px #8b5cf6; animation: pulse-purple 2s infinite; }
@keyframes pulse-purple { 0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(139, 92, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); } }

.profile-container { max-width: 900px; width: 100%; margin: 0 auto; padding-bottom: 50px; }

/* 🌟 Hero Section 千人千面看板 */
.hero-section { position: relative; border-radius: 28px; padding: 40px; color: #fff; overflow: hidden; margin-bottom: 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); transition: all 0.5s ease; }
.theme-volunteer { background: linear-gradient(135deg, #f97316, #ea580c); }
.theme-merchant { background: linear-gradient(135deg, #10b981, #059669); }
.theme-recipient { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.theme-admin { background: linear-gradient(135deg, #1e293b, #0f172a); }

.hero-bg-shapes .shape { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.1); filter: blur(40px); }
.hero-bg-shapes .s1 { width: 300px; height: 300px; top: -100px; right: -50px; }
.hero-bg-shapes .s2 { width: 200px; height: 200px; bottom: -50px; left: 10%; }

.hero-content { position: relative; z-index: 10; display: flex; align-items: center; gap: 30px; margin-bottom: 35px; }

/* 头像交互区 */
.avatar-wrapper { position: relative; width: 100px; height: 100px; border-radius: 50%; border: 4px solid rgba(255,255,255,0.3); cursor: pointer; overflow: hidden; background: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); transition: 0.3s; flex-shrink: 0; }
.avatar-wrapper:hover { border-color: #fff; transform: scale(1.05); }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder { font-size: 3rem; font-weight: 900; color: #94a3b8; }
.avatar-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.3s; }
.avatar-wrapper:hover .avatar-mask { opacity: 1; }
.camera-icon { font-size: 1.5rem; }

.user-intro .greeting { margin: 0 0 10px 0; font-size: 2.2rem; font-weight: 900; letter-spacing: 1px; }
.role-badge-glow { display: inline-block; padding: 6px 16px; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border-radius: 20px; font-weight: bold; font-size: 0.95rem; border: 1px solid rgba(255,255,255,0.4); }

/* 数据卡片 */
.dashboard-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; position: relative; z-index: 10; }
.data-card { background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; padding: 20px; display: flex; align-items: center; gap: 15px; transition: 0.3s; }
.data-card:hover { background: rgba(255,255,255,0.25); transform: translateY(-5px); }
.card-icon { font-size: 2.2rem; background: rgba(255,255,255,0.2); width: 55px; height: 55px; display: flex; align-items: center; justify-content: center; border-radius: 16px; }
.card-info p { margin: 0 0 5px 0; font-size: 0.85rem; opacity: 0.9; font-weight: bold; }
.card-info h3 { margin: 0; font-size: 1.8rem; font-weight: 900; }
.card-info h3 span { font-size: 1rem; opacity: 0.8; font-weight: normal; }

/* 🌟 雷达图专属样式 */
.radar-section { background: #fff; border-radius: 28px; padding: 30px; margin-bottom: 30px; box-shadow: 0 15px 35px rgba(0,0,0,0.04); border: 1px solid #fff; }
.radar-header h3 { margin: 0 0 5px 0; color: #1e293b; font-size: 1.4rem; font-weight: 900; }
.radar-header p { margin: 0; color: #64748b; font-size: 0.95rem; }
.radar-chart-box { width: 100%; height: 350px; margin-top: 10px; }

/* 🌟 基础设置卡片体系 */
.settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
@media (max-width: 768px) { .settings-grid { grid-template-columns: 1fr; } }

.setting-card { background: #fff; border-radius: 24px; padding: 30px; box-shadow: 0 15px 35px rgba(0,0,0,0.04); border: 1px solid #fff; display: flex; flex-direction: column; }
.card-header h3 { margin: 0 0 20px 0; color: #334155; font-size: 1.2rem; font-weight: 800; border-bottom: 2px dashed #f1f5f9; padding-bottom: 15px; }

.info-row { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
.info-row label { font-size: 0.85rem; color: #64748b; font-weight: bold; }

.input-normal, .input-disabled { width: 100%; box-sizing: border-box; padding: 14px 18px; border-radius: 14px; border: 2px solid #e2e8f0; font-size: 1rem; transition: all 0.3s; outline: none; background: #f8fafc; color: #1e293b; }
.input-normal:focus { background: #fff; border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
.input-disabled { color: #94a3b8; cursor: not-allowed; opacity: 0.7; }

.save-btn { margin-top: auto; width: 100%; padding: 16px; border: none; border-radius: 14px; background: #1e293b; color: white; font-weight: 900; font-size: 1.05rem; cursor: pointer; transition: all 0.3s; box-shadow: 0 8px 20px rgba(30, 41, 59, 0.2); }
.save-btn:hover { transform: translateY(-3px); box-shadow: 0 12px 25px rgba(30, 41, 59, 0.3); }

.warning-btn { background: #fff; color: #ef4444; border: 2px solid #ef4444; box-shadow: none; }
.warning-btn:hover { background: #ef4444; color: #fff; box-shadow: 0 10px 25px rgba(239, 68, 68, 0.25); border-color: transparent; }
</style>