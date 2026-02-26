<template>
  <el-container class="layout-container">
    <el-header class="app-header">
      <div class="logo">社区“食物银行”及应急物资调度系统</div>
      <div class="user-info">admin (软件工程-大四)</div>
    </el-header>

    <el-main class="app-main">
      <LbsMap />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import LbsMap from './components/LbsMap.vue'
</script>

<style>
/* 全局重置，让地图铺满全屏 */
body, html, #app {
  margin: 0;
  padding: 0;
  height: 100%;
}

.layout-container {
  height: 100vh;
}

.app-header {
  background-color: #409EFF;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.app-main {
  padding: 0 !important; /* 地图需要零边距 */
  overflow: hidden;
}
</style>