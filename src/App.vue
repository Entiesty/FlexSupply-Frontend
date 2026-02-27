<template>
  <main class="app-root">
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </main>
</template>

<style>
:root {
  /* 🚨 核心：清新多巴胺配色 */
  --c-primary:       #f97316;
  --c-primary-dark:  #ea580c;
  --c-primary-light: #fb923c;
  --c-bg-page:       #f8fafc;

  /* 🚨 强化文字对比度 */
  --c-text:          #1e293b;
  --c-text-sub:      #64748b;

  /* 🚨 增加投影深度，让卡片在白底上更有层次感 */
  --shadow-fresh:    0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 8px 15px -6px rgba(0, 0, 0, 0.05);
  --border-light:    1px solid rgba(249, 115, 22, 0.12);

  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body, #app {
  width: 100%; height: 100%; overflow: hidden;
  background: var(--c-bg-page);
}

.app-root { width: 100%; height: 100%; }

/* 页面平滑切换动画 */
.page-enter-active, .page-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.page-enter-from { opacity: 0; transform: scale(1.01); }
.page-leave-to { opacity: 0; transform: scale(0.99); }
</style>