<template>
  <aside class="side-menu">
    <div class="logo-zone">
      <span class="logo-emoji">🏪</span>
      <h1 class="logo-text">食物银行<br/><span class="sub">智慧调度大脑</span></h1>
    </div>

    <nav class="menu-list">
      <div class="menu-item active">
        <span class="m-icon">🗺️</span> 实时调度大屏
      </div>
      <div class="menu-item">
        <span class="m-icon">📦</span> 订单流水管理
      </div>
      <div class="menu-item">
        <span class="m-icon">🏥</span> 物资据点监控
      </div>
      <div class="menu-item">
        <span class="m-icon">🧑‍🤝‍🧑</span> 志愿者总览
      </div>
      <div class="menu-item">
        <span class="m-icon">⚙️</span> 系统算法配置
      </div>
    </nav>

    <div class="user-profile">
      <div class="avatar">👨‍✈️</div>
      <div class="u-info">
        <div class="u-name">王牌调度员</div>
        <div class="u-role">高级志愿者 · 在线</div>
      </div>
    </div>
  </aside>
</template>

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