<template>
  <aside class="side-menu">
    <div class="logo-zone" @click="goToHome">
      <img src="/apple-touch-icon.png" class="logo-img" alt="logo">
      <h1 class="logo-text">暖心食光<br/><span class="sub">智慧互助调度中心</span></h1>
    </div>

    <nav class="menu-list">
      <div
          v-for="item in visibleMenus"
          :key="item.name"
          class="menu-item"
          :class="{
            active: route.path === item.path,
            'is-locked': item.requiresAuth && currentUser.isVerified === 0
          }"
          @click="handleMenuClick(item)"
      >
        <div class="menu-content">
          <span class="m-icon">{{ item.icon }}</span>
          <span class="m-name">{{ item.name }}</span>
        </div>
        <span v-if="item.requiresAuth && currentUser.isVerified === 0" class="lock-icon">🔒</span>
      </div>

      <div class="menu-item verify-btn" v-if="currentUser.role === 4" @click="triggerVerifyPickup">
        <div class="menu-content">
          <span class="m-icon">🎫</span>
          <span class="m-name">线下扫码 / 验码核销</span>
        </div>
      </div>
    </nav>

    <div class="user-profile">
      <div class="avatar-dynamic">
        <img v-if="currentUser.avatar && currentUser.avatar.startsWith('http')"
             :src="currentUser.avatar" class="avatar-img" alt="avatar" />
        <span v-else class="avatar-emoji">{{ currentUser.avatar || '👤' }}</span>
      </div>

      <div class="u-info">
        <div class="u-name" :title="currentUser.username">{{ currentUser.username }}</div>
        <div class="u-role" :style="{ color: currentUser.isVerified === 1 ? '#10b981' : '#f59e0b' }">
          {{ roleName }}
          <span v-if="currentUser.isVerified === 0" style="font-size:12px">(审核中)</span>
        </div>
      </div>

      <el-tooltip content="退出系统" placement="top" effect="light">
        <button class="logout-mini-btn" @click="handleLogout">
          🚪
        </button>
      </el-tooltip>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { logout } from '@/api/auth'
import { getUserProfile } from '@/api/user'
import { verifyPickup } from '@/api/trade'

// 🚨 触发线下核销的全局弹窗逻辑 (重构文案与样式注入)
const triggerVerifyPickup = () => {
  ElMessageBox.prompt(
      '请输入居民出示的 6 位专属取件码，完成物理世界的最后一米交接：',
      '🎫 线下物资核销',
      {
        confirmButtonText: '确认无误，立即核销',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入 6 位数字取件码',
        inputPattern: /^\d{6}$/,
        inputErrorMessage: '格式错误：必须为 6 位纯数字',
        customClass: 'dopamine-msg-box', // 注入魔法样式
        center: true, // 居中显示
        showClose: false // 隐藏原生的右上角关闭按钮
      }
  ).then(async ({ value }) => {
    try {
      await verifyPickup(value)
      ElMessage.success({
        message: `🎉 核销成功！凭证码 ${value} 对应的物资已物理交接完毕，订单已圆满闭环。`,
        duration: 4000
      })
    } catch (error) {}
  }).catch(() => {})
}

const router = useRouter()
const route = useRoute()

const currentUser = ref({
  userId: localStorage.getItem('userId') || '',
  username: localStorage.getItem('username') || '调度员',
  role: parseInt(localStorage.getItem('userRole') || '3'),
  isVerified: 0,
  deliveryType: 0
})

const sysMode = ref(localStorage.getItem('sysMode') || 'NORMAL')

const roleMap = { 1: '受赠长者', 2: '爱心商家', 3: '城市护航骑士', 4: '指挥中心' }
const roleName = computed(() => roleMap[currentUser.value.role] || '未知角色')

// SOS舱入口: EMERGENCY时全员可见, NORMAL时仅deliveryType=1(仅上门)可见
const allMenus = computed(() => {
  const isEmergency = sysMode.value === 'EMERGENCY'
  const dt = currentUser.value.deliveryType
  const showSos = currentUser.value.role === 1 && (isEmergency || dt === 1)
  const showMarket = currentUser.value.role === 1 && dt === 0 && !isEmergency

  return [
    { name: '实时调度大屏', icon: '🗺️️', path: '/map', roles: [3, 4], requiresAuth: true },
    ...(showSos ? [{ name: isEmergency ? '🚨 紧急呼救大舱' : '预约上门配送', icon: isEmergency ? '🚨' : '📦', path: '/sos', roles: [1], requiresAuth: false }] : []),
    { name: '物资捐赠大厅', icon: '💝', path: '/merchant/donate', roles: [2], requiresAuth: true },
    ...(showMarket ? [{ name: '日常食物银行', icon: '🏪', path: '/market', roles: [1], requiresAuth: true }] : []),
    { name: '我的配送任务', icon: '🚴', path: '/my-tasks', roles: [3], requiresAuth: true },
    { name: '我的捐赠记录', icon: '📦', path: '/merchant/history', roles: [2], requiresAuth: true },
    { name: 'CSR社会责任战报', icon: '🏅', path: '/merchant/csr', roles: [2], requiresAuth: true },
    { name: '我的受赠档案', icon: '📜', path: '/recipient/history', roles: [1], requiresAuth: true },
    { name: '城市信誉资产', icon: '🏆', path: '/volunteer/credit', roles: [3], requiresAuth: true },
    { name: '全局订单流转', icon: '📊', path: '/flow', roles: [4], requiresAuth: true },
    { name: '异常预警监控', icon: '🚨', path: '/admin/exception-monitor', roles: [4], requiresAuth: true },
    { name: '物理据点管理', icon: '🏥', path: '/admin/stations', roles: [4], requiresAuth: true },
    { name: '全域用户台账', icon: '👥', path: '/admin/users', roles: [4], requiresAuth: true },
    { name: '入驻材料审核', icon: '🛡️', path: '/admin/review', roles: [4], requiresAuth: true },
    { name: '调度引擎调参', icon: '⚙️', path: '/config', roles: [4], requiresAuth: true },
    { name: '个人账号设置', icon: '👤', path: '/volunteer/profile', roles: [1, 2, 3, 4], requiresAuth: false }
  ]
})

const visibleMenus = computed(() => allMenus.value.filter(menu => menu.roles.includes(currentUser.value.role)))

onMounted(async () => {
  try {
    const res = await getUserProfile()
    if (res.data) {
      currentUser.value.isVerified = res.data.isVerified
      currentUser.value.username = res.data.username
      currentUser.value.deliveryType = res.data.deliveryType || 0
    }
  } catch (e) {}

  /* 监听个人设置页的用户名变更事件 */
  window.addEventListener('user-info-updated', (e) => {
    currentUser.value.username = e.detail.username
  })
  /* 监听全局模式切换, 侧栏菜单项实时更新 */
  window.addEventListener('mode-changed', (e) => {
    if (e.detail?.mode) {
      sysMode.value = e.detail.mode
      localStorage.setItem('sysMode', e.detail.mode)
    }
  })
})

const goToHome = () => {
  if (currentUser.value.role === 2) router.push('/merchant/donate')
  else if (currentUser.value.role === 1) {
    // deliveryType=1(仅上门)或EMERGENCY模式 → SOS舱; deliveryType=0(自取)+NORMAL → 食物银行
    if (currentUser.value.deliveryType === 1 || sysMode.value === 'EMERGENCY') router.push('/sos')
    else router.push('/market')
  }
  else router.push('/map')
}

const handleMenuClick = (item) => {
  if (item.requiresAuth && currentUser.value.isVerified === 0) {
    ElMessageBox.alert(
        '该模块包含城市核心调度数据，需要指挥中心授权。<br/><br/>👉 <strong>请先前往【个人账号设置】完善基础资料与资质凭证，并等待核验。</strong>',
        '🔒 系统权限受限',
        { confirmButtonText: '去完善资料', dangerouslyUseHTMLString: true, type: 'warning' }
    ).then(() => {
      if (route.path !== '/volunteer/profile') router.push('/volunteer/profile')
    }).catch(() => {})
    return
  }
  router.push(item.path)
}

const handleLogout = () => {
  ElMessageBox.confirm(
      '退出后将无法接收紧急调度与广播指令，确认退出吗？',
      '🚪 退出系统',
      { confirmButtonText: '确认退出', cancelButtonText: '暂不退出', type: 'warning' }
  ).then(async () => {
    try {
      if (currentUser.value.userId) await logout(currentUser.value.userId)
    } catch (e) {
    } finally {
      localStorage.clear()
      ElMessage.success('已安全退出系统')
      window.location.href = '/auth'
    }
  }).catch(() => {})
}
</script>

<style scoped>
.side-menu { width: 260px; height: 100vh; background: #fff; border-right: 1px solid rgba(249, 115, 22, 0.1); display: flex; flex-direction: column; z-index: 200; box-shadow: 4px 0 20px rgba(0, 0, 0, 0.02); }
.logo-zone { padding: 30px 20px; display: flex; align-items: center; gap: 15px; cursor: pointer; transition: opacity 0.3s ease; }
.logo-zone:hover { opacity: 0.85; }
.logo-img { width: 52px; height: 52px; background: #fff; padding: 4px; border-radius: 16px; box-shadow: 0 8px 18px rgba(249, 115, 22, 0.18); transition: all 0.4s; }
.logo-img:hover { transform: scale(1.1) rotate(5deg); }
.logo-text { font-size: 1.1rem; color: #1e293b; font-weight: 900; line-height: 1.3; margin: 0; }
.logo-text .sub { font-size: 0.8rem; color: #f97316; font-weight: bold; }

.menu-list { flex: 1; padding: 0 15px; display: flex; flex-direction: column; gap: 8px; margin-top: 10px; overflow-y: auto; }
.menu-item { padding: 14px 20px; border-radius: 14px; color: #64748b; font-weight: bold; font-size: 0.95rem; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: 0.3s; }
.menu-content { display: flex; align-items: center; gap: 12px; }
.menu-item:hover:not(.is-locked) { background: #f8fafc; color: #1e293b; }
.menu-item.active { background: #f97316; color: #fff; box-shadow: 0 8px 20px rgba(249, 115, 22, 0.25); }

.menu-item.is-locked { color: #cbd5e1; cursor: not-allowed; }
.menu-item.is-locked:hover { background: #fef2f2; color: #ef4444; }
.lock-icon { font-size: 1.1rem; opacity: 0.6; }
.m-icon { font-size: 1.2rem; }

.menu-item.verify-btn { margin-top: 15px; background: #ecfdf5; color: #059669; border: 1px dashed #34d399; }
.menu-item.verify-btn:hover { background: #d1fae5; color: #047857; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2); }

.user-profile {
  padding: 15px;
  margin: 15px;
  background: #f8fafc;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #e2e8f0;
  transition: 0.3s;
}
.user-profile:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.avatar-dynamic { width: 42px; height: 42px; border-radius: 50%; overflow: hidden; background: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05); flex-shrink: 0;}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-emoji { font-size: 1.6rem; line-height: 1; }

.u-info { flex: 1; overflow: hidden; display: flex; flex-direction: column; justify-content: center; }
.u-info .u-name { font-weight: 800; color: #1e293b; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.u-info .u-role { font-size: 0.75rem; font-weight: bold; margin-top: 3px; }

.logout-mini-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}
.logout-mini-btn:hover {
  background: #fef2f2;
  border-color: #fca5a5;
  transform: translateX(2px);
  box-shadow: 0 4px 8px rgba(239, 68, 68, 0.15);
}
.logout-mini-btn:active {
  transform: scale(0.95);
}
</style>

<style>
/* ======================================================
   🚨 全局挂载的 Element Plus MessageBox 深度定制 (毛玻璃多巴胺风格)
   ====================================================== */
.dopamine-msg-box {
  width: 420px !important;
  border-radius: 24px !important;
  border: 1px solid rgba(255, 255, 255, 0.8) !important;
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(20px) !important;
  box-shadow: 0 25px 50px -12px rgba(16, 185, 129, 0.15), 0 0 0 1px rgba(16, 185, 129, 0.05) !important;
  padding: 30px !important;
}

.dopamine-msg-box .el-message-box__header {
  padding: 0 0 20px 0 !important;
  text-align: center;
}
.dopamine-msg-box .el-message-box__title {
  font-size: 1.4rem !important;
  font-weight: 900 !important;
  color: #065f46 !important;
  letter-spacing: 1px;
}

.dopamine-msg-box .el-message-box__content {
  padding: 0 !important;
}
.dopamine-msg-box .el-message-box__message {
  text-align: center;
  color: #64748b !important;
  font-size: 1.05rem !important;
  font-weight: bold;
  line-height: 1.6;
  margin-bottom: 25px !important;
}

.dopamine-msg-box .el-input {
  margin-bottom: 10px;
}
.dopamine-msg-box .el-input__wrapper {
  background: #f8fafc !important;
  border-radius: 16px !important;
  box-shadow: 0 0 0 2px #e2e8f0 inset !important;
  padding: 8px 20px !important;
  transition: all 0.3s ease;
}
.dopamine-msg-box .el-input__wrapper.is-focus {
  background: #fff !important;
  box-shadow: 0 0 0 3px #10b981 inset, 0 8px 20px rgba(16, 185, 129, 0.15) !important;
}
.dopamine-msg-box .el-input__inner {
  font-family: 'Courier New', Courier, monospace;
  font-size: 1.8rem !important;
  font-weight: 900 !important;
  color: #059669 !important;
  text-align: center;
  letter-spacing: 8px;
  height: 50px !important;
}
.dopamine-msg-box .el-input__inner::placeholder {
  font-size: 1rem !important;
  letter-spacing: normal;
  color: #cbd5e1 !important;
  font-family: inherit;
}

.dopamine-msg-box .el-message-box__errormsg {
  color: #ef4444 !important;
  font-weight: bold;
  font-size: 0.85rem !important;
  text-align: center;
  margin-top: 8px;
}

.dopamine-msg-box .el-message-box__btns {
  padding: 25px 0 0 0 !important;
  display: flex;
  gap: 15px;
  justify-content: center;
}
.dopamine-msg-box .el-button {
  flex: 1;
  height: 48px !important;
  border-radius: 14px !important;
  font-size: 1.05rem !important;
  font-weight: 900 !important;
  border: none !important;
  transition: all 0.2s ease;
}
.dopamine-msg-box .el-button:first-child {
  background: #f1f5f9 !important;
  color: #64748b !important;
}
.dopamine-msg-box .el-button:first-child:hover {
  background: #e2e8f0 !important;
  color: #1e293b !important;
}
.dopamine-msg-box .el-button--primary {
  background: linear-gradient(135deg, #10b981, #059669) !important;
  color: #fff !important;
  box-shadow: 0 6px 15px rgba(16, 185, 129, 0.3) !important;
}
.dopamine-msg-box .el-button--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(16, 185, 129, 0.4) !important;
}
</style>