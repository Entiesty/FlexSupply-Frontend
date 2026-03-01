<template>
  <div class="sos-container">
    <header class="sos-header">
      <div class="user-info">
        <span class="avatar">👴</span>
        <div class="greeting">
          <h2>张大爷，您好！</h2>
          <p>请问今天需要什么帮助？</p>
        </div>
      </div>
      <div class="location-badge">
        📍 幸福小区 3 栋 (已定位)
      </div>
    </header>

    <main class="sos-main">
      <div class="sos-card urgent" @click="handleHelp('医疗包', 3, '紧急用药')" v-loading="loading === '医疗包'">
        <div class="card-icon">💊</div>
        <div class="card-text">
          <h3>我需要药</h3>
          <p>速效救心丸 / 降压药 / 医疗急救包</p>
        </div>
        <div class="sos-btn">SOS</div>
      </div>

      <div class="sos-card food" @click="handleHelp('速食品', 2, '一日三餐')" v-loading="loading === '速食品'">
        <div class="card-icon">🍚</div>
        <div class="card-text">
          <h3>我要吃饭</h3>
          <p>热乎饭菜 / 米面粮油 / 饮用水</p>
        </div>
        <div class="sos-btn">求助</div>
      </div>

      <div class="sos-card warm" @click="handleHelp('防寒衣物', 1, '防寒保暖')" v-loading="loading === '防寒衣物'">
        <div class="card-icon">🧥</div>
        <div class="card-text">
          <h3>我有点冷</h3>
          <p>棉衣 / 被褥 / 保暖贴</p>
        </div>
        <div class="sos-btn">求助</div>
      </div>
    </main>

    <footer class="sos-footer">
      <p>社区热线: <strong>0592-1234567</strong></p>
      <p class="safe-tip">点击卡片后，志愿者将飞奔向您！</p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { publishDemand } from '@/api/trade'

const loading = ref('')

// 模拟老人的真实坐标 (稍微偏离一点驿站，方便地图显示)
const mockLon = 118.192000
const mockLat = 24.496000
const mockAddress = '幸福小区 3 栋'

const handleHelp = async (category, urgency, title) => {
  loading.value = category
  try {
    // 组装发给后端的求助数据
    const demandData = {
      requiredCategory: category,
      urgencyLevel: urgency,
      targetLon: mockLon,
      targetLat: mockLat,
      receiverAddress: mockAddress
    }

    await publishDemand(demandData)

    // 超大字体的成功提示，照顾老人视力
    ElNotification({
      title: '✅ 求助发送成功！',
      message: `<div style="font-size: 1.1rem; margin-top: 10px;">您需要的 <b>【${title}】</b> 已经发送至社区指挥大屏！<br/><br/>请您安心在家等待，志愿者马上就来！</div>`,
      dangerouslyUseHTMLString: true,
      type: 'success',
      duration: 8000
    })
  } catch (e) {
    console.error('求助失败', e)
    ElMessage.error('网络不太好，请打社区电话求助哦')
  } finally {
    loading.value = ''
  }
}
</script>

<style scoped>
/* 极简适老化移动端 UI */
.sos-container {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background: #f8fafc;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.sos-header { margin-bottom: 30px; }
.user-info { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; }
.avatar { font-size: 3.5rem; background: #fff; border-radius: 50%; padding: 5px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.greeting h2 { margin: 0 0 5px; font-size: 1.6rem; color: #1e293b; font-weight: 900; }
.greeting p { margin: 0; font-size: 1.1rem; color: #64748b; }
.location-badge { background: #e0f2fe; color: #0284c7; padding: 10px 15px; border-radius: 12px; font-weight: bold; font-size: 1.1rem; width: fit-content; }

.sos-main { display: flex; flex-direction: column; gap: 20px; flex: 1; }

/* 超大卡片设计 */
.sos-card {
  display: flex; align-items: center; background: #fff; border-radius: 24px; padding: 25px 20px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.06); cursor: pointer; transition: transform 0.2s;
  border: 2px solid transparent;
}
.sos-card:active { transform: scale(0.96); }

.card-icon { font-size: 3.5rem; margin-right: 15px; }
.card-text { flex: 1; }
.card-text h3 { margin: 0 0 8px; font-size: 1.8rem; font-weight: 900; }
.card-text p { margin: 0; font-size: 1rem; color: #64748b; line-height: 1.4; }

.sos-btn {
  padding: 15px 20px; border-radius: 16px; font-size: 1.2rem; font-weight: 900; color: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* 颜色区分紧急度 */
.urgent { border-color: #ffe4e6; background: #fff1f2; }
.urgent h3 { color: #e11d48; }
.urgent .sos-btn { background: #e11d48; }

.food { border-color: #fef3c7; background: #fffbeb; }
.food h3 { color: #d97706; }
.food .sos-btn { background: #d97706; }

.warm { border-color: #e0f2fe; background: #f0f9ff; }
.warm h3 { color: #0284c7; }
.warm .sos-btn { background: #0284c7; }

.sos-footer { text-align: center; margin-top: 40px; padding-bottom: 20px; }
.sos-footer p { margin: 5px 0; font-size: 1.2rem; color: #475569; }
.safe-tip { color: #10b981 !important; font-weight: bold; }
</style>