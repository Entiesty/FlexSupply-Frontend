<template>
  <div :class="showMenu ? 'app-layout' : 'app-root'">

    <SideMenu v-if="showMenu" />

    <div class="main-viewport">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component"/>
        </transition>
      </router-view>
    </div>

  </div>
</template>

<script setup>
// 👇 1. 扩充了 vue 和 element-plus 的引入
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElNotification } from 'element-plus'
import SideMenu from '@/views/dispatch/components/SideMenu.vue'

const route = useRoute()
const router = useRouter()

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
      // 🚨 场景 E2：订单被指挥中心撤销 (定向通知受赠方)
      else if (data.type === 'ORDER_CANCELLED' && userRole === '1') {
        ElNotification({
          title: '📋 求助工单已撤销',
          message: data.message || `您的紧急求助 ${data.orderSn || ''} 已被指挥中心取消。`,
          type: 'warning',
          duration: 8000,
          position: 'top-right'
        })
        window.dispatchEvent(new Event('refresh-orders'))
      }
      // 🚨 场景 F：资质审核通过/驳回 (全局刷新)
      else if (data.type === 'AUDIT_PASSED' || data.type === 'AUDIT_REJECTED') {
        const isPassed = data.type === 'AUDIT_PASSED'
        ElNotification({
          title: isPassed ? '🎉 资质审核已通过' : '📋 资质审核结果',
          message: data.message || (isPassed ? '全部调度功能已解锁！' : '请重新上传凭证。'),
          type: isPassed ? 'success' : 'warning',
          duration: isPassed ? 5000 : 8000,
          position: 'top-right'
        })
        // 持久化审核状态 + 通知全局刷新
        localStorage.setItem('isVerified', isPassed ? '1' : '0')
        window.dispatchEvent(new CustomEvent('audit-status-changed', { detail: { isVerified: isPassed ? 1 : 0 } }))

        window.dispatchEvent(new Event('refresh-orders'))
      }
      // 🚨 场景 G：商家已备货，触发 P2P 天降神兵
      else if (data.type === 'URGENT_TASK_READY') {
        const cargo = data.cargoInfo || '未知规格'
        const needHeavy = data.weightLevel >= 3 || data.volumeLevel >= 3
        const needMedium = data.weightLevel >= 2 || data.volumeLevel >= 2

        if (userRole === '3') {
          // 限制 1：状态互斥 — 忙碌骑士不弹强窗，降级为温和通知
          const riderStatus = localStorage.getItem('riderStatus') || 'IDLE'
          if (riderStatus === 'BUSY') {
            ElNotification({
              title: '📦 周边有新的 P2P 紧急物资待取',
              message: `单号 ${data.orderId || ''}，完成当前配送后可前往大屏查看。`,
              type: 'info',
              duration: 5000,
              position: 'top-right'
            })
            return
          }
          // 限制 2：CVRP 运力硬约束 — 重载物资不推送给步行/单车
          const myVehicle = Number(localStorage.getItem('vehicleType') || 1)
          if ((data.weightLevel >= 3 || data.volumeLevel >= 3) && myVehicle < 3) {
            return
          }
          // 通过所有拦截 → 弹出强制接单导航框
          ElMessageBox.confirm(
            `<div style="text-align:center;line-height:1.8;">
              <div style="font-size:3rem;margin-bottom:12px;">🚨</div>
              <div style="font-size:1.2rem;font-weight:900;color:#dc2626;margin-bottom:8px;">爱心商家已备好救命物资</div>
              <div style="color:#475569;">请立即前往商家取件，<br/>点对点直达求助市民手中！</div>
              <div style="margin-top:12px;background:#fef2f2;border-radius:12px;padding:10px;font-size:0.95rem;">
                📦 货物规格：<b style="color:#dc2626;">${cargo}</b>
                ${needHeavy ? '<div style="margin-top:6px;color:#ef4444;font-weight:900;">⚠️ 重载/大件物资，请确认您的车辆能装载！</div>' : ''}
                ${needMedium && !needHeavy ? '<div style="margin-top:6px;color:#f97316;font-weight:bold;">⚡ 标准件，建议电动车配送</div>' : ''}
              </div>
              ${data.orderId ? `<div style="margin-top:10px;font-family:monospace;color:#94a3b8;">调度单号: ${data.orderId}</div>` : ''}
            </div>`,
            '最高指令：P2P紧急救援触发！',
            {
              confirmButtonText: '⚡ 接受指令 · 立即导航',
              cancelButtonText: '稍后处理',
              type: 'warning',
              dangerouslyUseHTMLString: true,
              showClose: false,
              closeOnClickModal: false,
              closeOnPressEscape: false,
              customClass: 'dopamine-msg-box'
            }
          ).then(() => {
            router.push('/map')
          }).catch(() => {})
        } else if (userRole === '4') {
          // 管理员：仅做温和通知，告知 P2P 匹配成功
          ElNotification({
            title: '⚡ P2P 匹配成功',
            message: `紧急单号 ${data.orderId || ''} 已被商家响应，系统正呼叫周边护航骑士。`,
            type: 'success',
            duration: 5000,
            position: 'top-right'
          })
        }
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

/* 右侧主内容视口：占满剩余空间，纵向自动滚动，左侧菜单固定不动 */
.main-viewport {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
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