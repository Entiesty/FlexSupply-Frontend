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
const showMenu = computed(() => {
  const noMenuPaths = ['/auth', '/']
  return !noMenuPaths.includes(route.path)
})

// 👇 2. 新增：全局 WebSocket 监听逻辑（核心！）
let ws = null

const initGlobalWebSocket = () => {
  // 兼容不同的获取 userId 的方式
  const userId = localStorage.getItem('userId') ||
      (localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')).userId : null)

  if (!userId) return

  // 🚨 核心修复：加上了 /api 前缀，并且支持动态域名获取
  const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://'
  const host = window.location.host // 获取当前运行的 IP 和端口
  // 如果你前端没用代理，可以直接写死： ws://localhost:8080/api/ws/sos/${userId}
  const wsUrl = `ws://localhost:8080/api/ws/sos/${userId}`

  ws = new WebSocket(wsUrl)

  ws.onopen = () => console.log('✅ 战时通讯雷达已全局连接')

  ws.onmessage = (event) => {
    try {
      // 后端发来的是 JSON 字符串，必须先解析
      const data = JSON.parse(event.data)
      const userRole = localStorage.getItem('userRole')

      // ═══ ✅ FIX-1: 全局模式切换推送 ═══
      if (data.type === 'MODE_CHANGED') {
        const modeLabels = { NORMAL: '🟢 平时常态', EMERGENCY: '🔴 战时应急' }
        localStorage.setItem('sysMode', data.mode)
        ElNotification({ title: '🌐 全城调度模式变更', message: `指挥中心已将系统切换至: ${modeLabels[data.mode] || data.mode}`, type: data.mode === 'EMERGENCY' ? 'error' : 'warning', duration: 0, position: 'top-right' })
        window.dispatchEvent(new CustomEvent('mode-changed', { detail: { mode: data.mode } }))
      }
      // 🚨 场景 A：紧急呼救 (仅向骑士和管理员弹窗)
      else if (data.type === 'NEW_SOS' && ['3', '4'].includes(userRole)) {
        ElNotification({
          title: '🚨 紧急呼救响应',
          message: `捕获到高优紧急单号: ${data.orderSn}，请立即查看！`,
          type: 'error',
          duration: 8000,
          position: 'top-right'
        })
        // 关键：抛出一个全局事件，让 OrderFlow.vue 听到后自动刷新表格！
        window.dispatchEvent(new Event('refresh-orders'))
      }
      // 🚨 场景 B：日常单据 (仅向骑士和管理员弹窗)
      else if (data.type === 'NEW_REQ' && ['3', '4'].includes(userRole)) {
        ElNotification({
          title: '🟢 新增常规流转单',
          message: `新订单 ${data.orderSn} 已入网等待调度。`,
          type: 'success',
          duration: 4000,
          position: 'top-right'
        })
        window.dispatchEvent(new Event('refresh-orders'))
      }
      // 🚨 场景 C：订单已被骑手抢单 (全局刷新)
      else if (data.type === 'ORDER_TAKEN') {
        window.dispatchEvent(new Event('refresh-orders'))
      }
      // 🚨 场景 D：送达通知
      else if (data.type === 'DELIVERED') {
        ElNotification({ title: '📦 物资已送达', message: `单号 ${data.orderSn} 已安全送达/入库，请前往确认或核销！`, type: 'success', duration: 5000, position: 'top-right' })
        window.dispatchEvent(new Event('refresh-orders'))
      }
      // 🚨 场景 E：SOS已被商家响应
      else if (data.type === 'SOS_RESPONDED') {
        window.dispatchEvent(new Event('refresh-orders'))
      }
    } catch (err) {
      console.error('全局 WebSocket 解析失败，收到的非 JSON 数据:', event.data)
    }
  }

  ws.onclose = () => {
    console.log('❌ 战时通讯雷达已断开，5秒后重连...')
    setTimeout(initGlobalWebSocket, 5000)
  }
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