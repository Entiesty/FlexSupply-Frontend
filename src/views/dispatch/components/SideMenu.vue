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
    </div>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router' // 🚨 引入路由钩子

const router = useRouter()
const route = useRoute() // 用于获取当前所在路径

// 🚨 定义点击 Logo 返回首页的方法
const goToHome = () => {
  router.push('/map')
}

// 当前登录用户数据 (角色 ID 参考：3-志愿者, 4-管理员)
const currentUser = ref({
  // 建议在 Login 成功后从 localStorage 读取真实数据
  username: localStorage.getItem('username') || '王牌调度员',
  role: parseInt(localStorage.getItem('userRole') || '3')
})

// 角色名称映射字典
const roleMap = {
  1: '受赠用户',
  2: '合作商家',
  3: '高级志愿者',
  4: '系统管理员'
}

const roleName = computed(() => roleMap[currentUser.value.role] || '未知角色')

// 🚨 定义完整的系统菜单与权限控制，加入 path 属性
const allMenus = [
  { name: '实时调度大屏', icon: '🗺️', path: '/map', roles: [3, 4] },
  { name: '我的配送任务', icon: '🚴', path: '/my-tasks', roles: [3] },
  // 🚀 新增：志愿者专属的荣誉档案！
  { name: '我的荣誉档案', icon: '🏆', path: '/volunteer/credit', roles: [3] },
  { name: '全盘订单流转', icon: '📦', path: '/flow', roles: [4] },
  { name: '系统算法配置', icon: '⚙️', path: '/config', roles: [4] }
]

// 根据当前用户角色动态过滤菜单
const visibleMenus = computed(() => {
  return allMenus.filter(menu => menu.roles.includes(currentUser.value.role))
})
</script>

<style scoped>
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

/* 🚨 修改 Logo 区域交互，增加小手和点击反馈 */
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

/* 活泼俏皮的 Logo 图片样式 */
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
}

.u-info .u-name {
  font-weight: 800;
  color: #1e293b;
  font-size: 0.9rem;
}

.u-info .u-role {
  font-size: 0.75rem;
  color: #10b981;
  font-weight: bold;
  margin-top: 2px;
}
</style>