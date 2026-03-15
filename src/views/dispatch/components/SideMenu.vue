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
    </nav>

    <div class="user-profile">
      <div class="avatar">👨‍✈️</div>
      <div class="u-info">
        <div class="u-name">{{ currentUser.username }}</div>
        <div class="u-role" :style="{ color: currentUser.isVerified === 1 ? '#10b981' : '#f59e0b' }">
          {{ roleName }} · {{ currentUser.isVerified === 1 ? '已认证' : '待核验' }}
        </div>
      </div>
      <button class="logout-btn" @click="handleLogout" title="退出登录">
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { logout } from '@/api/auth'
import { getUserProfile } from '@/api/user' // 🚨 引入获取个人信息的 API

const router = useRouter()
const route = useRoute()

// 🚨 扩充 currentUser，增加 isVerified 字段
const currentUser = ref({
  userId: localStorage.getItem('userId') || '',
  username: localStorage.getItem('username') || '调度员',
  role: parseInt(localStorage.getItem('userRole') || '3'),
  isVerified: 0 // 默认未审核，稍后通过接口拉取
})

const roleMap = { 1: '受赠长者', 2: '爱心商家', 3: '城市护航骑士', 4: '指挥中心' }
const roleName = computed(() => roleMap[currentUser.value.role] || '未知角色')

// 🚨 给每个菜单加上 requiresAuth 标识，只有“个人账号设置”不需要权限
const allMenus = [
  { name: '实时调度大屏', icon: '🗺️', path: '/map', roles: [3, 4], requiresAuth: true },
  { name: '异常预警监控', icon: '🚨', path: '/admin/exception-monitor', roles: [4], requiresAuth: true },
  { name: '全局订单流转', icon: '📊', path: '/flow', roles: [4], requiresAuth: true },
  { name: '物理据点管理', icon: '🏥', path: '/admin/stations', roles: [4], requiresAuth: true },
  { name: '全域用户台账', icon: '👥', path: '/admin/users', roles: [4], requiresAuth: true },
  { name: '入驻材料审核', icon: '🛡️', path: '/admin/review', roles: [4], requiresAuth: true },
  { name: '调度引擎调参', icon: '⚙️', path: '/config', roles: [4], requiresAuth: true },
  { name: '我的配送任务', icon: '🚴', path: '/my-tasks', roles: [3], requiresAuth: true },
  { name: '我的信誉档案', icon: '🏆', path: '/volunteer/credit', roles: [3], requiresAuth: true },
  { name: '物资捐赠大厅', icon: '💝', path: '/merchant/donate', roles: [2], requiresAuth: true },
  { name: '我的捐赠记录', icon: '📦', path: '/merchant/history', roles: [2], requiresAuth: true },
  { name: '紧急呼救大舱', icon: '🚨', path: '/sos', roles: [1], requiresAuth: false }, // 老人呼救特殊开绿灯
  { name: '我的受赠档案', icon: '📜', path: '/recipient/history', roles: [1], requiresAuth: true },
  { name: '个人账号设置', icon: '👤', path: '/volunteer/profile', roles: [1, 2, 3, 4], requiresAuth: false } // 任何时候都能进
]

const visibleMenus = computed(() => allMenus.filter(menu => menu.roles.includes(currentUser.value.role)))

// 🚨 每次侧边栏挂载时，静默拉取一下最新状态，更新锁头
onMounted(async () => {
  try {
    const res = await getUserProfile()
    if (res.data) {
      currentUser.value.isVerified = res.data.isVerified
      currentUser.value.username = res.data.username
    }
  } catch (e) {}
})

const goToHome = () => {
  if (currentUser.value.role === 2) router.push('/merchant/donate')
  else if (currentUser.value.role === 1) router.push('/sos')
  else router.push('/map')
}

// 🚨 核心拦截器：如果点击了带锁的菜单，强制拦截并弹窗！
const handleMenuClick = (item) => {
  if (item.requiresAuth && currentUser.value.isVerified === 0) {
    ElMessageBox.alert(
        '该模块包含城市核心调度数据，需要指挥中心授权。<br/><br/>👉 <strong>请先前往【个人账号设置】完善基础资料与资质凭证，并等待核验。</strong>',
        '🔒 系统权限受限',
        {
          confirmButtonText: '去完善资料',
          dangerouslyUseHTMLString: true,
          type: 'warning'
        }
    ).then(() => {
      if (route.path !== '/volunteer/profile') router.push('/volunteer/profile')
    }).catch(() => {})
    return
  }
  router.push(item.path)
}

const handleLogout = () => {
  ElMessageBox.confirm('确定要退出当前账号吗？', '提示', {
    confirmButtonText: '确定退出', cancelButtonText: '暂不退出', type: 'warning'
  }).then(async () => {
    try { if (currentUser.value.userId) await logout(currentUser.value.userId) } catch (e) {} finally {
      localStorage.clear()
      ElMessage.success('已安全退出')
      router.replace('/auth')
    }
  }).catch(() => {})
}
</script>

<style scoped>
/* 继承原样式，只补充锁头的 CSS */
.side-menu { width: 260px; height: 100vh; background: #fff; border-right: 1px solid rgba(249, 115, 22, 0.1); display: flex; flex-direction: column; z-index: 200; box-shadow: 4px 0 20px rgba(0, 0, 0, 0.02); }
.logo-zone { padding: 30px 20px; display: flex; align-items: center; gap: 15px; cursor: pointer; transition: opacity 0.3s ease; }
.logo-zone:hover { opacity: 0.85; }
.logo-img { width: 52px; height: 52px; background: #fff; padding: 4px; border-radius: 16px; box-shadow: 0 8px 18px rgba(249, 115, 22, 0.18); transition: all 0.4s; }
.logo-img:hover { transform: scale(1.1) rotate(5deg); }
.logo-text { font-size: 1.1rem; color: #1e293b; font-weight: 900; line-height: 1.3; margin: 0; }
.logo-text .sub { font-size: 0.8rem; color: #f97316; font-weight: bold; }

.menu-list { flex: 1; padding: 0 15px; display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.menu-item { padding: 14px 20px; border-radius: 14px; color: #64748b; font-weight: bold; font-size: 0.95rem; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: 0.3s; }
.menu-content { display: flex; align-items: center; gap: 12px; }
.menu-item:hover:not(.is-locked) { background: #f8fafc; color: #1e293b; }
.menu-item.active { background: #f97316; color: #fff; box-shadow: 0 8px 20px rgba(249, 115, 22, 0.25); }

/* 🚨 锁定状态的特殊样式 */
.menu-item.is-locked { color: #cbd5e1; cursor: not-allowed; }
.menu-item.is-locked:hover { background: #fef2f2; color: #ef4444; }
.lock-icon { font-size: 1.1rem; opacity: 0.6; }

.m-icon { font-size: 1.2rem; }

.user-profile { padding: 20px; margin: 20px; background: #f8fafc; border-radius: 16px; display: flex; align-items: center; gap: 12px; border: 1px solid #f1f5f9; position: relative; }
.avatar { font-size: 1.8rem; background: #fff; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; border-radius: 12px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); flex-shrink: 0; }
.u-info { flex: 1; overflow: hidden; }
.u-info .u-name { font-weight: 800; color: #1e293b; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.u-info .u-role { font-size: 0.75rem; font-weight: bold; margin-top: 2px; }

.logout-btn { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 8px; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.logout-btn:hover { background: #fee2e2; color: #ef4444; }
</style>