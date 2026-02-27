<template>
  <aside class="side-menu">
    <div class="logo-zone">
      <span class="logo-emoji">🏪</span>
      <h1 class="logo-text">食物银行<br/><span class="sub">智慧调度大脑</span></h1>
    </div>

    <nav class="menu-list">
      <div
          v-for="item in visibleMenus"
          :key="item.name"
          class="menu-item"
          :class="{ active: item.active }"
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
import {ref, computed} from 'vue'

// 🚨 模拟当前登录用户 (真实场景应从 Vuex/Pinia 或 localStorage 中读取)
// 1:受赠方, 2:供应商家, 3:志愿者, 4:管理员
const currentUser = ref({
  username: '王牌调度员',
  role: 3 // 当前是志愿者
})

// 角色名称映射字典
const roleMap = {
  1: '受赠用户',
  2: '合作商家',
  3: '高级志愿者',
  4: '系统管理员'
}

const roleName = computed(() => roleMap[currentUser.value.role] || '未知角色')

// 🚨 核心：定义完整的系统菜单，并为每个菜单打上权限标签 (roles)
const allMenus = [
  {name: '实时调度大屏', icon: '🗺️', active: true, roles: [3, 4]}, // 志愿者和管理员可见
  {name: '我的配送任务', icon: '🚴', active: false, roles: [3]},    // 仅志愿者可见
  {name: '全盘订单流转', icon: '📦', active: false, roles: [4]},    // 仅管理员可见
  {name: '物资据点监控', icon: '🏥', active: false, roles: [4]},    // 仅管理员可见
  {name: '志愿者信誉库', icon: '🧑‍🤝‍🧑', active: false, roles: [4]},    // 仅管理员可见
  {name: '系统算法配置', icon: '⚙️', active: false, roles: [4]}     // 仅管理员可见
]

// 🚨 根据当前用户的 role，过滤出他有权限看到的菜单
const visibleMenus = computed(() => {
  return allMenus.filter(menu => menu.roles.includes(currentUser.value.role))
})
</script>

<style scoped>
/* 样式保持完全不变，复用你之前的完美 CSS 即可 */
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
}

.logo-emoji {
  font-size: 2.5rem;
  background: #fff7ed;
  padding: 10px;
  border-radius: 20px;
  box-shadow: 0 8px 15px rgba(249, 115, 22, 0.1);
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