<template>
  <div :class="showMenu ? 'app-layout' : 'app-root'">

    <SideMenu v-if="showMenu" />

    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component"/>
      </transition>
    </router-view>

  </div>
</template>

<script setup>
// 👇 1. 扩充了 vue 和 element-plus 的引入
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElNotification } from 'element-plus'
import SideMenu from '@/views/dispatch/components/SideMenu.vue'

const route = useRoute()

// 控制哪些页面不需要侧边栏 (登录页、老人求助页)
// 只有登录页不需要侧边栏，其他所有角色页面都纳入系统大布局
const showMenu = computed(() => {
  const noMenuPaths = ['/auth', '/']
  return !noMenuPaths.includes(route.path)
})

// 👇 2. 新增：全局 WebSocket 监听逻辑（核心！）
let ws = null

const initGlobalWebSocket = () => {
  // 从本地存储拿取登录用户信息
  const userInfoStr = localStorage.getItem('userInfo')
  if (!userInfoStr) return

  const userInfo = JSON.parse(userInfoStr)
  if (!userInfo.userId) return

  // 动态拼接 WebSocket 地址连上后端
  const wsUrl = `ws://localhost:8080/ws/sos/${userInfo.userId}`
  ws = new WebSocket(wsUrl)

  ws.onopen = () => console.log('✅ 战时通讯雷达已全局连接')

  ws.onmessage = (event) => {
    // 🚨 收到后端传来的喜报，立刻在右上角弹出不可忽视的绿色通知！
    ElNotification({
      title: '🚨 紧急调度大盘通知',
      message: event.data,
      type: 'success',
      duration: 0, // 0 表示永不自动消失，确保老人一定能看到
      position: 'top-right'
    })
  }

  ws.onclose = () => console.log('❌ 战时通讯雷达已断开')
}

onMounted(() => {
  initGlobalWebSocket()
})

onUnmounted(() => {
  if (ws) ws.close()
})
// 👆 新增逻辑结束
</script>

<style>
/* 🚨 100% 还原你原来的 :root 颜色主题，一字不改 */
:root {
  /* 核心：清新多巴胺配色 */
  --c-primary: #f97316;
  --c-primary-dark: #ea580c;
  --c-primary-light: #fb923c;
  --c-bg-page: #f8fafc;

  /* 强化文字对比度 */
  --c-text: #1e293b;
  --c-text-sub: #64748b;

  /* 增加投影深度，让卡片在白底上更有层次感 */
  --shadow-fresh: 0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 8px 15px -6px rgba(0, 0, 0, 0.05);
  --border-light: 1px solid rgba(249, 115, 22, 0.12);

  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--c-bg-page);
}

.app-root {
  width: 100%;
  height: 100%;
}

/* 🚨 唯一的新增：把你原本写在每个页面里的左右 Flex 布局大框架提取到这里 */
/* 仅负责排版菜单和右侧区域的平铺，绝不干扰你内部的 padding */
.app-layout {
  position: fixed;
  inset: 0;
  display: flex;
  width: 100vw;
  height: 100vh;
  background: #f1f5f9;
  overflow: hidden;
}

/* 页面平滑切换动画保持你的原样 */
.page-enter-active, .page-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.page-enter-from {
  opacity: 0;
  transform: scale(1.01);
}

.page-leave-to {
  opacity: 0;
  transform: scale(0.99);
}
</style>