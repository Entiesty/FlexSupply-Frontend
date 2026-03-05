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
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SideMenu from '@/views/dispatch/components/SideMenu.vue'

const route = useRoute()

// 控制哪些页面不需要侧边栏 (登录页、老人求助页)
// 只有登录页不需要侧边栏，其他所有角色页面都纳入系统大布局
const showMenu = computed(() => {
  const noMenuPaths = ['/auth', '/']
  return !noMenuPaths.includes(route.path)
})
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