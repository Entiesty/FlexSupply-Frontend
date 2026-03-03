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
          :class="{ active: route.path === item.path }"
          @click="router.push(item.path)"
      >
        <span class="m-icon">{{ item.icon }}</span> {{ item.name }}
      </div>
    </nav>

    <div class="user-profile">
      <div class="avatar">👨‍✈️</div>
      <div class="u-info">
        <div class="u-name">{{ currentUser.username }}</div>
        <div class="u-role">{{ roleName }} · 在线</div>
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
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { logout } from '@/api/auth' // 🚨 引入你 auth.js 里的登出接口

const router = useRouter()
const route = useRoute()

const goToHome = () => {
  router.push('/map')
}

// 建议真实场景下把 userId 也存入 localStorage，这里假设你登录时存了
const currentUser = ref({
  userId: localStorage.getItem('userId') || '',
  username: localStorage.getItem('username') || '王牌调度员',
  role: parseInt(localStorage.getItem('userRole') || '3')
})

const roleMap = {
  1: '受赠用户',
  2: '合作商家',
  3: '高级志愿者',
  4: '系统管理员'
}

const roleName = computed(() => roleMap[currentUser.value.role] || '未知角色')

const allMenus = [
  { name: '实时调度大屏', icon: '🗺️', path: '/map', roles: [3, 4] },
  // 👇 加上这一行，把入口开放给管理员
  { name: '资质风控审核', icon: '🛡️', path: '/admin/review', roles: [4] },
  { name: '我的配送任务', icon: '🚴', path: '/my-tasks', roles: [3] },
  { name: '我的荣誉档案', icon: '🏆', path: '/volunteer/credit', roles: [3] },
  { name: '全盘订单流转', icon: '📦', path: '/flow', roles: [4] },
  { name: '系统算法配置', icon: '⚙️', path: '/config', roles: [4] },
  { name: '全域用户治理', icon: '👥', path: '/admin/users', roles: [4] },
  { name: '账号设置中心', icon: '👤', path: '/volunteer/profile', roles: [2, 3, 4] }
]

const visibleMenus = computed(() => {
  return allMenus.filter(menu => menu.roles.includes(currentUser.value.role))
})

// 🚨 完整的安全退出闭环逻辑
const handleLogout = () => {
  ElMessageBox.confirm('确定要退出当前账号吗？', '提示', {
    confirmButtonText: '确定退出',
    cancelButtonText: '暂不退出',
    type: 'warning'
  }).then(async () => {
    try {
      // 1. 尝试调用后端清空 Token 白名单/会话
      if (currentUser.value.userId) {
        await logout(currentUser.value.userId)
      }
    } catch (e) {
      console.warn('后端登出接口异常，但前端将强制清除本地会话', e)
    } finally {
      // 2. 必须清理前端所有会话凭证
      localStorage.removeItem('ACCESS_TOKEN')
      localStorage.removeItem('userRole')
      localStorage.removeItem('username')
      localStorage.removeItem('userId')

      ElMessage.success('已安全退出')
      // 3. 拦截回登录页
      router.replace('/auth')
    }
  }).catch(() => {})
}
</script>

<style scoped>
/* 原有的样式完全保留 */
.side-menu {
  width: 260px;
  height: 100vh;
  background: #fff;
  border-right: 1px solid rgba(249, 115, 22, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 200;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.02);
}

.logo-zone {
  padding: 30px 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  transition: opacity 0.3s ease;
}

.logo-zone:hover {
  opacity: 0.85;
}

.logo-img {
  width: 52px;
  height: 52px;
  background: #fff;
  padding: 4px;
  border-radius: 16px;
  box-shadow: 0 8px 18px rgba(249, 115, 22, 0.18);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.logo-img:hover {
  transform: scale(1.1) rotate(5deg);
}

.logo-text {
  font-size: 1.1rem;
  color: #1e293b;
  font-weight: 900;
  line-height: 1.3;
  margin: 0;
}

.logo-text .sub {
  font-size: 0.8rem;
  color: #f97316;
  font-weight: bold;
}

.menu-list {
  flex: 1;
  padding: 0 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.menu-item {
  padding: 14px 20px;
  border-radius: 14px;
  color: #64748b;
  font-weight: bold;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: 0.3s;
}

.menu-item:hover {
  background: #f8fafc;
  color: #1e293b;
}

.menu-item.active {
  background: #f97316;
  color: #fff;
  box-shadow: 0 8px 20px rgba(249, 115, 22, 0.25);
}

.m-icon {
  font-size: 1.2rem;
}

.user-profile {
  padding: 20px;
  margin: 20px;
  background: #f8fafc;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #f1f5f9;
  position: relative; /* 🚨 让内部元素可以使用绝对定位 */
}

.avatar {
  font-size: 1.8rem;
  background: #fff;
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.u-info {
  flex: 1;
  overflow: hidden;
}

.u-info .u-name {
  font-weight: 800;
  color: #1e293b;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.u-info .u-role {
  font-size: 0.75rem;
  color: #10b981;
  font-weight: bold;
  margin-top: 2px;
}

/* 🚨 退出登录按钮样式 */
.logout-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #fee2e2;
  color: #ef4444;
}
</style>