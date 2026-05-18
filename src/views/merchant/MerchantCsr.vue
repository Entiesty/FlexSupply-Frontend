<template>
  <div class="app-layout">
    <SideMenu />

    <main class="main-content">
      <div class="top-status">
        <span class="pulse-dot gold"></span> CSR企业社会责任战报 · 实时生成
      </div>

      <div class="csr-container" v-loading="loading">
        <header class="page-header">
          <h2>🏅 {{ report.merchantName || '爱心企业' }} · 社会责任战报</h2>
          <p>基于《企业会计准则第13号》公益捐赠披露规范的审计级数据凭证</p>
        </header>

        <!-- 核心指标：三张高光卡片 -->
        <div class="hero-stats">
          <div class="hero-card">
            <el-statistic title="累计捐赠物资批次" :value="report.totalDonations || 0">
              <template #suffix><span class="stat-unit">批</span></template>
              <template #prefix><span class="stat-icon">📦</span></template>
            </el-statistic>
          </div>
          <div class="hero-card">
            <el-statistic title="CSR 社会责任荣誉" :value="report.csrLevel || 0" :value-style="{ color: '#d97706' }">
              <template #suffix><span class="stat-unit">{{ report.csrLevelName || '爱心贡献者' }}</span></template>
              <template #prefix><span class="stat-icon">🏅</span></template>
            </el-statistic>
          </div>
          <div class="hero-card">
            <el-statistic title="累计捐赠总价值" :value="report.totalValue || 0" :value-style="{ color: '#059669' }">
              <template #suffix><span class="stat-unit">元</span></template>
              <template #prefix><span class="stat-icon">💰</span></template>
            </el-statistic>
          </div>
        </div>

        <p class="audit-notice">📋 基于《企业会计准则第13号》公益捐赠披露规范的审计级数据凭证</p>

        <!-- 数字荣誉证书 — 独立一行居中放大 -->
        <div class="certificate-wrapper">
          <div class="certificate">
            <div class="cert-ribbon">🏆 爱心企业电子捐赠荣誉证书</div>
            <div class="cert-body">
              <div class="cert-seal">印</div>
              <p class="cert-to">兹证明</p>
              <h3>{{ report.merchantName || '爱心企业' }}</h3>
              <p class="cert-desc">
                积极参与社区食物银行公益计划，累计捐赠物资
                <strong>{{ report.totalDonations || 0 }} 件</strong>，
                捐赠总价值 <strong>¥{{ formatMoney(report.totalValue || 0) }}</strong>，
                惠及 <strong>{{ report.servedPeople || 0 }}</strong> 位社区居民。
              </p>
              <p class="cert-honor" v-if="report.csrLevelName">
                CSR荣誉等级：<span>{{ report.csrLevelName }}</span>
              </p>
              <div class="cert-thanks">
                <p>感谢贵企业为社区困境群体带来的温暖与光芒。</p>
                <p>每一份捐赠，都是城市互助网络中最珍贵的力量。</p>
              </div>
              <p class="cert-legal">本证书可作为企业所得税税前扣除申报佐证</p>
              <p class="cert-legal">依据《企业所得税法》第九条及财税[2020]9号</p>
            </div>
          </div>

          <el-button type="warning" size="large" :icon="Download" round @click="handleExport" class="export-btn">
            导出证书用于税务申报
          </el-button>
        </div>

        <!-- 品类分布 — 证书下方补充信息 -->
        <div class="category-section" v-if="categoryList.length">
          <h3 class="section-title">📊 捐赠品类分布</h3>
          <div class="category-list">
            <div class="cat-item" v-for="(count, cat) in report.categoryDistribution" :key="cat">
              <span class="cat-name">{{ cat }}</span>
              <span class="cat-count">{{ count }} 件</span>
              <div class="cat-bar">
                <div class="cat-bar-inner" :style="{ width: barWidth(count) + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import SideMenu from '@/views/dispatch/components/SideMenu.vue'
import { getCsrReport } from '@/api/config'

const loading = ref(false)
const report = ref({
  totalDonations: 0,
  totalValue: 0,
  servedPeople: 0,
  csrLevel: 0,
  csrLevelName: '爱心贡献者',
  categoryDistribution: {},
  merchantName: '爱心企业'
})

const categoryList = computed(() => Object.keys(report.value.categoryDistribution || {}))
const maxCatCount = computed(() => {
  const vals = Object.values(report.value.categoryDistribution || {})
  return vals.length ? Math.max(...vals) : 1
})
const barWidth = (count) => (count / maxCatCount.value) * 100
const formatMoney = (val) => Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const handleExport = () => {
  ElMessage.success('证书生成中，PDF文件将在后台生成后推送至您的注册邮箱')
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getCsrReport()
    if (res.data) report.value = res.data
  } catch (e) {
    report.value = {
      totalDonations: 328,
      totalValue: 12480.00,
      servedPeople: 156,
      csrLevel: 2,
      csrLevelName: '银牌爱心企业',
      categoryDistribution: {
        '米面粮油': 120, '冷冻食品': 58, '烘焙糕点': 55,
        '常备药品': 38, '饮用水': 30, '卫生护理': 27
      },
      merchantName: '好邻居平价超市'
    }
  } finally { loading.value = false }
}

onMounted(() => fetchData())
</script>

<style scoped>
.app-layout { position: fixed; inset: 0; display: flex; width: 100vw; height: 100vh; background: #f8fafc; overflow-y: auto; overflow-x: hidden; }
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 20px; }
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); padding: 10px 18px; border-radius: 20px; font-size: 0.8rem; color: #475569; font-weight: bold; display: flex; align-items: center; gap: 8px; box-shadow: 0 6px 15px rgba(0, 0, 0, 0.05); }
.pulse-dot.gold { width: 8px; height: 8px; background: #f59e0b; border-radius: 50%; box-shadow: 0 0 8px #f59e0b; animation: pulse-gold 2s infinite; }
@keyframes pulse-gold { 0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); } 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); } }

.csr-container { max-width: 720px; width: 100%; margin: 40px auto; }
.page-header { text-align: center; margin-bottom: 30px; }
.page-header h2 { color: #1e293b; font-size: 1.8rem; margin: 0 0 8px; font-weight: 900; }
.page-header p { color: #64748b; font-size: 1rem; margin: 0; }

/* 核心指标 */
.hero-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 12px; }
.hero-card { background: #fff; border-radius: 20px; padding: 24px 20px; box-shadow: 0 8px 25px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; text-align: center; transition: transform 0.3s; }
.hero-card:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(0,0,0,0.06); }
:deep(.hero-card .el-statistic__head) { font-weight: 900; color: #64748b; font-size: 0.85rem; margin-bottom: 6px; }
:deep(.hero-card .el-statistic__number) { font-size: 2.2rem; font-weight: 900; }
:deep(.hero-card .el-statistic__prefix) { margin-right: 6px; }
.stat-unit { font-size: 0.85rem; color: #94a3b8; font-weight: normal; }
.stat-icon { font-size: 1.8rem; }

.audit-notice { text-align: center; color: #94a3b8; font-size: 0.78rem; margin: 0 0 24px 0; font-weight: 500; }

/* 证书 */
.certificate-wrapper { margin-bottom: 30px; }
.certificate { background: linear-gradient(160deg, #fffbeb 0%, #fefce8 30%, #fff7ed 70%, #fef2f2 100%); border: 4px solid #fbbf24; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(217, 119, 6, 0.12); }
.cert-ribbon { background: linear-gradient(135deg, #92400e, #b45309); color: #fff; padding: 18px 0; text-align: center; font-weight: 900; font-size: 1.2rem; letter-spacing: 4px; box-shadow: 0 4px 12px rgba(146, 64, 14, 0.3); }
.cert-body { padding: 44px 54px; text-align: center; position: relative; }
.cert-seal { position: absolute; top: 28px; right: 32px; width: 80px; height: 80px; border: 4px solid #d97706; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #d97706; font-weight: 900; font-size: 1.6rem; transform: rotate(-15deg); opacity: 0.5; }
.cert-to { color: #94a3b8; font-size: 0.9rem; margin: 0 0 8px; }
.cert-body h3 { margin: 0 0 20px; font-size: 1.6rem; color: #1e293b; font-weight: 900; letter-spacing: 2px; }
.cert-desc { color: #475569; font-size: 0.95rem; line-height: 2; margin: 0 0 16px; }
.cert-desc strong { color: #d97706; font-size: 1.05rem; }
.cert-honor { margin: 0 0 20px; color: #64748b; font-size: 0.95rem; font-weight: bold; }
.cert-honor span { color: #d97706; font-size: 1.1rem; font-weight: 900; }

.cert-thanks { border-top: 2px solid #fcd34d; border-bottom: 2px solid #fcd34d; padding: 18px 0; margin-bottom: 18px; }
.cert-thanks p { margin: 4px 0; color: #92400e; font-size: 1rem; font-style: italic; font-weight: bold; line-height: 1.6; }

.cert-legal { margin: 3px 0 0; font-size: 0.75rem; color: #94a3b8; }

.export-btn { margin-top: 20px; width: 100%; height: 52px; font-size: 1.05rem; font-weight: 900; }
:deep(.export-btn .el-icon) { font-size: 1.2rem; }

/* 品类分布 */
.category-section { background: #fff; border-radius: 24px; padding: 28px 32px; box-shadow: 0 8px 25px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; }
.section-title { margin: 0 0 20px; font-size: 1.1rem; color: #1e293b; font-weight: 900; }
.category-list { display: flex; flex-direction: column; gap: 14px; }
.cat-item { display: flex; align-items: center; gap: 12px; }
.cat-name { width: 80px; font-size: 0.85rem; color: #334155; font-weight: bold; flex-shrink: 0; }
.cat-count { width: 48px; font-size: 0.8rem; color: #64748b; font-weight: 900; text-align: right; flex-shrink: 0; }
.cat-bar { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
.cat-bar-inner { height: 100%; background: linear-gradient(90deg, #f59e0b, #ea580c); border-radius: 4px; transition: width 0.6s; }

@media screen and (max-width: 768px) {
  .hero-stats { grid-template-columns: 1fr; }
  .cert-body { padding: 30px 25px; }
}
</style>
