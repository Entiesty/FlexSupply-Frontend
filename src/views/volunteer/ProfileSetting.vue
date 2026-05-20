<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot" :class="isVerifiedStatus ? 'dot-active' : 'dot-warn'"></span>
      {{ isVerifiedStatus ? '全局互助网络节点已激活 · 数据通道安全加密' : '生命通道风控引擎动态感知中' }}
    </div>

    <div class="profile-layout" v-loading="loading">
      <el-alert
          v-if="!isVerifiedStatus && userRole !== 4"
          :title="unverifiedTip.title"
          type="warning"
          :closable="false"
          show-icon
          class="unverified-banner"
      >
        <template #default>{{ unverifiedTip.desc }}</template>
      </el-alert>

      <div class="profile-hero-banner" :class="roleThemeClass">
        <div class="hero-left-zone">
          <div class="avatar-wrapper" @click="triggerAvatarUpload">
            <img v-if="form.avatar" :src="form.avatar" class="avatar-img" />
            <div v-else class="avatar-placeholder">{{ defaultAvatarIcon }}</div>
            <div class="avatar-mask"><span class="camera-icon">📷</span></div>
            <input type="file" ref="avatarInput" hidden @change="handleAvatarChange" accept="image/*" />
          </div>
          <div class="hero-user-meta">
            <div class="user-title-row">
              <h2 class="greeting">你好，{{ form.username || '未知节点' }}</h2>
              <div class="role-badge-glow">{{ roleNameMap[userRole] }}</div>
            </div>
          </div>
        </div>

        <div class="hero-right-stats">
          <template v-if="isVerifiedStatus || userRole === 4">
            <template v-if="userRole === 3">
              <div class="metric-item">
                <span class="metric-value">{{ dashboardStats.runningMileage || '0.00' }}</span>
                <span class="metric-label">🏃‍♂️ 护航里程 (km)</span>
              </div>
              <div class="metric-item">
                <span class="metric-value">{{ dashboardStats.totalDeliveredOrders || 0 }}</span>
                <span class="metric-label">📦 履约闭环单数</span>
              </div>
              <div class="metric-item last-item">
                <span class="metric-value">{{ dashboardStats.creditScore || 100 }}</span>
                <span class="metric-label">🏆 调度信誉分</span>
              </div>
            </template>
            <template v-else-if="userRole === 1">
              <div class="metric-item">
                <span class="metric-value text-sm">{{ formatUserTag(form.userTag) }}</span>
                <span class="metric-label">🛡️ 人群关怀标签</span>
              </div>
              <div class="metric-item last-item">
                <span class="metric-value">{{ dashboardStats.totalReceivedTimes || 0 }}</span>
                <span class="metric-label">🤝 获援助次数</span>
              </div>
            </template>
            <template v-else-if="userRole === 4">
              <div class="metric-item">
                <span class="metric-value text-sm">在线监控</span>
                <span class="metric-label">📡 节点状态</span>
              </div>
              <div class="metric-item last-item">
                <span class="metric-value text-sm">Root</span>
                <span class="metric-label">🛡️ 权限级别</span>
              </div>
            </template>
          </template>
          <div v-else class="locked-dashboard-mini">
            🔒 资质风控核验通过后解锁完整业务看板
          </div>
        </div>
      </div>

      <el-card v-if="userRole === 3 && isVerifiedStatus" class="setting-main-card radar-section" shadow="never">
        <div class="block-section-title">⚡ 骑手综合能力评估矩阵</div>
        <p class="section-subtitle">基于 SAW 多因子调度引擎底层数据的多维能力画像</p>
        <div ref="radarChartRef" class="radar-chart-box"></div>
      </el-card>

      <el-card class="setting-main-card" shadow="never">
        <el-tabs v-model="activeTab" class="custom-profile-tabs">

          <el-tab-pane label="👤 基础资料与认证" name="profile">
            <el-form :model="form" label-position="top" class="pane-form-padding">
              <div class="block-section-title">📝 节点基本信息</div>
              <el-row :gutter="20">
                <el-col :xs="24" :sm="12">
                  <el-form-item label="通讯特征码 (不可更改手机号)">
                    <div class="readonly-input-wrapper">
                      <span class="readonly-value">{{ form.phone || '未绑定' }}</span>
                      <el-tag type="success" size="small" effect="plain">已绑定鉴权通道</el-tag>
                    </div>
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="12">
                  <el-form-item label="系统展示名称 / 真实姓名" required>
                    <el-input v-model="form.username" size="large" placeholder="请输入姓名" />
                  </el-form-item>
                </el-col>
              </el-row>

              <template v-if="userRole === 1">
                <el-divider border-style="dashed" />
                <div class="block-section-title">🏠 居住与配送档案</div>
                <el-form-item label="📍 精准地理围栏坐标 (多因子算力基准)" required>
                  <div class="location-picker-box">
                    <div class="loc-display" :class="{ 'has-val': form.currentLon }">
                      <div class="loc-address">{{ form.addressName || '尚未设置地理坐标，请调起地图定位点' }}</div>
                      <div class="loc-coords" v-if="form.currentLon">经度: {{ form.currentLon }} | 纬度: {{ form.currentLat }}</div>
                    </div>
                    <el-button type="primary" plain class="pick-map-btn" @click="openMapDialog">🗺️ 地图定位</el-button>
                  </div>
                </el-form-item>
                <el-form-item label="详细门牌号 (保障末端精确物理核销)">
                  <el-input v-model="form.doorNumber" size="large" placeholder="例如：12号楼4单元601室" />
                </el-form-item>
                <el-form-item label="🚪 当前流转履约模式">
                  <div class="delivery-edit-box">
                    <el-radio-group v-model="form.deliveryType" class="delivery-radio-group">
                      <el-radio :value="0" border class="custom-radio-card">
                        <span class="radio-emoji">🏪</span>
                        <span class="radio-label">我可以自行前往社区食物银行取货</span>
                      </el-radio>
                      <el-radio :value="1" border class="custom-radio-card">
                        <span class="radio-emoji">🚪</span>
                        <span class="radio-label">我行动严重受限，申请全权送货上门</span>
                      </el-radio>
                    </el-radio-group>
                  </div>
                </el-form-item>
              </template>

              <template v-if="userRole === 2">
                <el-divider border-style="dashed" />
                <div class="block-section-title">🏪 物理商铺画像配置</div>
                <el-form-item label="物资供应主营类目" required>
                  <el-select v-model="form.industryType" size="large" style="width: 100%" placeholder="请选定业态类型">
                    <el-option label="🥩 餐饮生鲜 (热食、盒饭、生鲜蔬菜)" :value="1" />
                    <el-option label="🛒 商超便利 (米面粮油、方便速食、日用品)" :value="2" />
                    <el-option label="💊 医药器械 (常备药、外用急救、医疗耗材)" :value="3" />
                  </el-select>
                </el-form-item>
                <el-form-item label="商铺物理LBS锚点位置" required>
                  <div class="location-picker-box">
                    <div class="loc-display" :class="{ 'has-val': form.currentLon }">
                      <div class="loc-address">{{ form.addressName || '尚未设置物理选点' }}</div>
                      <div class="loc-coords" v-if="form.currentLon">经度: {{ form.currentLon }} | 纬度: {{ form.currentLat }}</div>
                    </div>
                    <el-button type="primary" plain class="pick-map-btn" @click="openMapDialog">🗺️ 地图选点</el-button>
                  </div>
                </el-form-item>
              </template>

              <template v-if="userRole !== 4">
                <el-divider border-style="dashed" />
                <div class="block-section-title">🪪 城市多维生命线凭证核验</div>

                <div class="verification-status-board" :class="{ 'is-verified': isVerifiedStatus }">
                  <div class="board-left">
                    <span class="board-icon">{{ isVerifiedStatus ? '✅' : '⏳' }}</span>
                    <div class="board-text">
                      <h4>{{ isVerifiedStatus ? '数据可信度认证：核验放行' : '风控排查中 / 凭证未提交' }}</h4>
                      <p>{{ isVerifiedStatus ? '全时智能调度引擎已为您注入高置信度通行凭证，功能全面释放。' : '请在下方上传权威核验影像资料，以便系统中心迅速备案。' }}</p>
                    </div>
                  </div>
                  <div class="board-right">
                    <span class="status-indicator-dot" :style="{ background: isVerifiedStatus ? '#10b981' : '#ef4444' }"></span>
                    <span class="status-indicator-text" :style="{ color: isVerifiedStatus ? '#065f46' : '#991b1b' }">
                      {{ isVerifiedStatus ? '放行通过' : '等待核验' }}
                    </span>
                  </div>
                </div>

                <div v-if="!isVerifiedStatus" style="margin-top: 20px;">
                  <el-form-item required label="资质文件影印件">
                    <div class="proof-upload-area" @click="triggerProofUpload">
                      <img v-if="form.identityProofUrl" :src="form.identityProofUrl" class="proof-img" />
                      <div v-else class="upload-placeholder">
                        <span class="upload-icon">📄</span>
                        <span>点击调取本机摄像头或选取凭证文件</span>
                      </div>
                      <input type="file" ref="proofInput" hidden @change="handleProofChange" accept="image/*" />
                    </div>
                  </el-form-item>
                  <el-button type="danger" size="large" class="btn-submit-cta" style="width:100%; margin-top:12px;" @click="saveProfileData(true)" :loading="saving" :disabled="!form.identityProofUrl">
                    🚀 资料确认无误，提交指挥中心审核
                  </el-button>
                </div>
              </template>

              <div class="form-action-bar">
                <el-button size="large" type="primary" class="btn-submit-cta" @click="saveProfileData(false)" :loading="saving">
                  💾 保存基础资料
                </el-button>
              </div>
            </el-form>
          </el-tab-pane>

          <el-tab-pane v-if="userRole === 3" label="🛵 运力容量约束" name="cvrp">
            <el-form label-position="top" class="pane-form-padding">
              <div class="block-section-title">📐 CVRP 动态配送载具容量矩阵</div>

              <el-row :gutter="20" class="vehicle-grid-row">
                <el-col :xs="24" :sm="12" v-for="v in vehicleOptions" :key="v.type" style="margin-bottom: 20px;">
                  <div class="vehicle-spec-card" :class="{ 'is-active': Number(form.vehicleType) === v.type }" @click="form.vehicleType = v.type">
                    <div class="v-card-header-flow">
                      <div class="v-title-meta">
                        <span class="v-emoji-icon">{{ v.icon }}</span>
                        <span class="v-name-title">{{ v.name }}</span>
                        <span class="card-active-badge" v-if="Number(form.vehicleType) === v.type">当前选定</span>
                      </div>
                      <div class="v-radio-circle"></div>
                    </div>
                    <div class="v-spec-lines-box">
                      <div class="v-spec-line">
                        <span class="v-lbl">🏋️ 重量上限约束</span>
                        <span class="v-val">{{ v.maxWeight }} <span class="v-unit">重载点(kg)</span></span>
                      </div>
                      <div class="v-spec-line">
                        <span class="v-lbl">📦 体积空间约束</span>
                        <span class="v-val">{{ v.maxVolume }} <span class="v-unit">容积点(L)</span></span>
                      </div>
                      <div class="v-spec-line border-none">
                        <span class="v-lbl">📍 推荐流转半径</span>
                        <span class="v-val-radius">{{ v.radius }}</span>
                      </div>
                    </div>
                  </div>
                </el-col>
              </el-row>

              <el-alert title="SAW & CVRP 核心引擎刚性风控提示" type="info" :closable="false" show-icon style="margin-bottom: 25px;">
                此处配置将作为后端 <strong>CVRP 算法路径编排</strong> 与 <strong>SAW 多因子匹配</strong> 的硬性常数限制。自由调整载具<strong>完全不触发</strong>重新审核，系统会自动重算空间阻抗。
              </el-alert>

              <el-divider border-style="dashed" />
              <div class="block-section-title">📍 常驻分拨中心基准锚点</div>
              <el-form-item label="默认待命及接收广播物理位置" required>
                <div class="location-picker-box">
                  <div class="loc-display" :class="{ 'has-val': form.currentLon }">
                    <div class="loc-address">{{ form.addressName || '未完成锚点绑定' }}</div>
                    <div class="loc-coords" v-if="form.currentLon">经度: {{ form.currentLon }} | 纬度: {{ form.currentLat }}</div>
                  </div>
                  <el-button type="primary" plain class="pick-map-btn" @click="openMapDialog">🗺️ 地图选点</el-button>
                </div>
              </el-form-item>

              <div class="form-action-bar">
                <el-button size="large" type="primary" class="btn-submit-cta" @click="saveVehicleConfig" :loading="saving">
                  ⚡ 立即同步运力常数
                </el-button>
              </div>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="🔒 安全与凭证" name="security">
            <el-form :model="pwdForm" label-position="top" class="pane-form-padding">
              <div class="block-section-title">🔒 身份认证盾牌升级</div>
              <div class="security-card-inner">
                <el-form-item label="输入当前有效的旧访问密码">
                  <el-input v-model="pwdForm.oldPassword" type="password" size="large" show-password placeholder="请输入旧密码" />
                </el-form-item>
                <el-row :gutter="20" style="margin-top: 15px;">
                  <el-col :xs="24" :sm="12">
                    <el-form-item label="设定全新复杂访问令牌">
                      <el-input v-model="pwdForm.newPassword" type="password" size="large" show-password placeholder="请输入新密码" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12">
                    <el-form-item label="确认全新访问令牌">
                      <el-input v-model="pwdForm.confirmPassword" type="password" size="large" show-password placeholder="请再次键入新密码" />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-button type="danger" plain size="large" style="width: 100%; margin-top: 15px; font-weight: bold;" @click="handleUpdatePassword" :loading="saving">
                  🛡️ 重置系统通信密码
                </el-button>
              </div>
            </el-form>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </div>

    <el-dialog
        v-if="[1, 2, 3].includes(userRole)"
        v-model="mapVisible"
        title="物理服务网格几何寻址"
        width="95%"
        style="max-width: 750px;"
        @opened="initAmapEngine"
        destroy-on-close
        custom-class="map-dialog"
    >
      <div class="map-search-bar">
        <el-autocomplete
            v-model="searchKeyword"
            :fetch-suggestions="queryMapPoiAsync"
            placeholder="请输入地名/关键字进行空间碰撞..."
            @select="handlePoiSelected"
            class="map-search-input-wrap"
            value-key="name"
            :trigger-on-focus="false"
            clearable
            @keyup.enter="handleSearchAddress"
        >
          <template #default="{ item }">
            <div class="custom-poi-item">
              <div class="poi-name">{{ item.name }}</div>
              <div class="poi-address">{{ item.district }}{{ item.address }}</div>
            </div>
          </template>
        </el-autocomplete>
        <button class="map-search-btn" @click="handleSearchAddress">🔍 碰撞比对</button>
      </div>
      <div class="selected-address-bar" v-if="tempLoc.address"><strong>当前捕捉坐标：</strong> {{ tempLoc.address }}</div>
      <div id="amap-container" class="amap-box"></div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="mapVisible = false" round>阻断退出</el-button>
          <el-button type="primary" @click="confirmGeoPosition" :disabled="!tempLoc.lng" round>注入该LBS坐标</el-button>
        </span>
      </template>
    </el-dialog>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import * as echarts from 'echarts'
import AMapLoader from '@amap/amap-jsapi-loader'
import { getUserProfile, updateUserProfile, updatePassword, getDashboardStats, updateAvatar } from '@/api/user'
import { uploadFile } from '@/api/common'

// 核心单向响应式数据状态源 (全扁平收拢，拒绝交叉覆盖)
const loading = ref(false)
const saving = ref(false)
const activeTab = ref('profile')
const radarChartRef = ref(null)
const avatarInput = ref(null)
const proofInput = ref(null)
let myRadarChart = null

const serverRawProfile = ref({})
const dashboardStats = ref({ creditScore: 100, totalDeliveredOrders: 0, runningMileage: '0.00', totalReceivedTimes: 0 })

// 统一表单实体
const form = reactive({
  username: '', currentLon: '', currentLat: '', addressName: '',
  doorNumber: '', identityProofUrl: '', vehicleType: 1, industryType: '',
  deliveryType: 0, avatar: '', phone: '', userTag: 'NORMAL'
})
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

// 核心高内聚类型推断
const userRole = computed(() => Number(serverRawProfile.value.role || localStorage.getItem('userRole') || 0))
const isVerifiedStatus = ref(false)

const roleNameMap = { 1: '👴 应急受赠关怀对象', 2: '🏪 社区公益爱心合伙人', 3: '🚴 核心生命线护航骑士', 4: '👨‍💻 核心决策指挥中心' }
const roleThemeClass = computed(() => {
  const map = { 1: 'theme-recipient', 2: 'theme-merchant', 3: 'theme-volunteer', 4: 'theme-admin' }
  return map[userRole.value] || 'theme-volunteer'
})
const defaultAvatarIcon = computed(() => ({ 1: '👴', 2: '🏪', 3: '🚴', 4: '🛡️' }[userRole.value] || '👤'))

const vehicleOptions = [
  { type: 1, icon: '🚶', name: '轻量运力：步行 / 跑步', maxWeight: '≤ 2', maxVolume: '≤ 2', radius: '< 2 km' },
  { type: 2, icon: '🚴', name: '标准运力：单车 / 自行车', maxWeight: '≤ 4', maxVolume: '≤ 5', radius: '< 5 km' },
  { type: 3, icon: '🛵', name: '高频运力：动力电瓶车', maxWeight: '≤ 10', maxVolume: '≤ 15', radius: '< 10 km' },
  { type: 4, icon: '🚗', name: '全天候运力：燃油/新能源汽车', maxWeight: '≤ 100', maxVolume: '≤ 100', radius: '城际全域覆盖' },
]

// 高德地图隔离状态池
const mapVisible = ref(false)
const searchKeyword = ref('')
const tempLoc = reactive({ lng: '', lat: '', address: '' })
let mapInstance = null, markerInstance = null, geocoderInstance = null, autoCompleteInstance = null

// ==================== 几何寻址核心引擎 ====================
const openMapDialog = () => {
  tempLoc.lng = form.currentLon; tempLoc.lat = form.currentLat; tempLoc.address = form.addressName
  searchKeyword.value = ''; mapVisible.value = true
}
const queryMapPoiAsync = (q, cb) => {
  if (!q || !autoCompleteInstance) return cb([])
  autoCompleteInstance.search(q, (status, result) => {
    cb(status === 'complete' && result.tips ? result.tips.filter(i => i.location) : [])
  })
}
const handlePoiSelected = (poi) => {
  if (poi && poi.location) {
    syncMapPoint(poi.location.getLng(), poi.location.getLat(), (poi.district || '') + (poi.address || '') + (poi.name || ''))
    searchKeyword.value = poi.name
  }
}
const handleSearchAddress = () => {
  if (!searchKeyword.value.trim()) return
  geocoderInstance.getLocation(searchKeyword.value, (status, result) => {
    if (status === 'complete' && result.info === 'OK' && result.geocodes.length > 0) {
      const geo = result.geocodes[0]
      syncMapPoint(geo.location.getLng(), geo.location.getLat(), geo.formattedAddress)
    }
  })
}
const syncMapPoint = (lng, lat, address) => {
  tempLoc.lng = lng; tempLoc.lat = lat; tempLoc.address = address
  mapInstance.setZoomAndCenter(16, [lng, lat], false, 600)
  if (markerInstance) markerInstance.setPosition([lng, lat])
  else { markerInstance = new AMap.Marker({ position: [lng, lat] }); mapInstance.add(markerInstance) }
}
const reverseGeocode = (lng, lat) => {
  window._AMapSecurityConfig = { securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE }
  AMapLoader.load({ key: import.meta.env.VITE_AMAP_KEY, version: "2.0", plugins: ['AMap.Geocoder'] }).then((AMap) => {
    new AMap.Geocoder({ radius: 1000 }).getAddress([lng, lat], (status, result) => {
      form.addressName = (status === 'complete' && result.info === 'OK') ? result.regeocode.formattedAddress : '互助网络物理锁点'
    })
  })
}
const initAmapEngine = () => {
  window._AMapSecurityConfig = { securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE }
  AMapLoader.load({ key: import.meta.env.VITE_AMAP_KEY, version: "2.0", plugins: ['AMap.Geocoder', 'AMap.AutoComplete', 'AMap.Geolocation'] }).then((AMap) => {
    const hasPoint = tempLoc.lng && tempLoc.lat
    mapInstance = new AMap.Map("amap-container", {
      viewMode: "2D", zoom: 15, center: hasPoint ? [tempLoc.lng, tempLoc.lat] : [118.084761, 24.620538]
    })
    geocoderInstance = new AMap.Geocoder({ radius: 1000 })
    autoCompleteInstance = new AMap.AutoComplete({})

    if (hasPoint) {
      markerInstance = new AMap.Marker({ position: [tempLoc.lng, tempLoc.lat] }); mapInstance.add(markerInstance)
    } else {
      const geoLoc = new AMap.Geolocation({ enableHighAccuracy: true, timeout: 5000, buttonPosition: 'RB', zoomToAccuracy: true })
      mapInstance.addControl(geoLoc)
      geoLoc.getCurrentPosition((status, res) => {
        if (status === 'complete') {
          geocoderInstance.getAddress([res.position.lng, res.position.lat], (gs, gr) => {
            syncMapPoint(res.position.lng, res.position.lat, gs === 'complete' ? gr.regeocode.formattedAddress : '精确几何锚点')
          })
        }
      })
    }
    mapInstance.on('click', (e) => {
      geocoderInstance.getAddress([e.lnglat.getLng(), e.lnglat.getLat()], (status, result) => {
        syncMapPoint(e.lnglat.getLng(), e.lnglat.getLat(), status === 'complete' ? result.regeocode.formattedAddress : '未知空间节点')
      })
    })
  })
}
const confirmGeoPosition = () => {
  form.currentLon = tempLoc.lng; form.currentLat = tempLoc.lat; form.addressName = tempLoc.address; mapVisible.value = false
}

// ==================== 数据吞吐核心流水线 ====================
const fetchSynchronizedData = async () => {
  loading.value = true
  try {
    const [profileRes, statsRes] = await Promise.all([getUserProfile(), getDashboardStats()])
    serverRawProfile.value = profileRes.data || {}

    // 收拢审核状态优先级：本地常驻锁缓存优先于延迟数据库反应
    const cachedAudit = localStorage.getItem('isVerified')
    if (cachedAudit !== null) {
      isVerifiedStatus.value = cachedAudit === '1'
    } else {
      isVerifiedStatus.value = Number(serverRawProfile.value.isVerified) === 1
    }

    // 单向解构分配表单，断开脏脏的引用关联
    Object.keys(form).forEach(key => {
      if (profileRes.data[key] !== undefined && profileRes.data[key] !== null) {
        form[key] = profileRes.data[key]
      }
    })

    if (statsRes.data) {
      Object.assign(dashboardStats.value, statsRes.data)
    }

    if (form.currentLon && form.currentLat) {
      if (!form.addressName) { form.addressName = '计算物理逆地理中...' }
      reverseGeocode(form.currentLon, form.currentLat)
    }

    if (userRole.value === 3 && isVerifiedStatus.value) {
      nextTick(() => renderCapabilityRadar())
    }
  } catch (err) {
    ElMessage.error('分拨中心数据拉取阻塞')
  } finally {
    loading.value = false
  }
}

// ✅ 独立分化的载具参数流转命令（不污染身份认证数据）
const saveVehicleConfig = async () => {
  saving.value = true
  const payload = {
    username: form.username,
    vehicleType: Number(form.vehicleType),
    currentLon: form.currentLon ? parseFloat(form.currentLon) : null,
    currentLat: form.currentLat ? parseFloat(form.currentLat) : null
  }
  try {
    await updateUserProfile(payload)
    // 载具切换不触发审核，清除 localStorage 脏标记，信任服务端真实状态
    localStorage.removeItem('isVerified')
    const fresh = await getUserProfile()
    const realVerified = Number(fresh.data?.isVerified) === 1
    localStorage.setItem('isVerified', realVerified ? '1' : '0')
    isVerifiedStatus.value = realVerified
    ElNotification({ title: 'CVRP 参数同步成功', message: '空间计算阻抗常数重置，算法调度链路无缝无感刷新！', type: 'success' })
    await fetchSynchronizedData()
  } catch (e) {
    ElMessage.error('算法参数推送失败')
  } finally {
    saving.value = false
  }
}

// 基础信息流转命令
const saveProfileData = async (isManualSubmitAudit = false) => {
  if (!form.username.trim()) return ElMessage.warning('系统展示名称不可留空')

  const payload = { username: form.username }
  if (form.identityProofUrl && form.identityProofUrl !== serverRawProfile.value.identityProofUrl) {
    payload.identityProofUrl = form.identityProofUrl
  }
  if ([1, 2, 3].includes(userRole.value) && form.currentLon) {
    payload.currentLon = parseFloat(form.currentLon)
    payload.currentLat = parseFloat(form.currentLat)
  }
  if (userRole.value === 1) {
    payload.doorNumber = form.doorNumber
    payload.deliveryType = Number(form.deliveryType)
  }
  if (userRole.value === 2 && form.industryType !== '') {
    payload.industryType = Number(form.industryType)
  }

  saving.value = true
  try {
    await updateUserProfile(payload)

    // 拦截风控回退断点
    const isTriggeringAudit = (userRole.value === 1 && Number(form.deliveryType) !== Number(serverRawProfile.value.deliveryType)) ||
        (payload.identityProofUrl)

    if (isTriggeringAudit) {
      localStorage.setItem('isVerified', '0')
      isVerifiedStatus.value = false
      ElNotification({ title: '安全风控动态锁死', message: '核心权属参数发生跃迁，节点暂时冻结，等待重新核验！', type: 'warning', duration: 8000 })
    } else {
      ElMessage.success('局部基础特征修改成功')
    }

    ElNotification({ title: 'CVRP 参数同步成功', message: '空间计算阻抗常数重置，算法调度链路无缝无感刷新！', type: 'success' })
    await fetchSynchronizedData()
  } catch (e) {
    ElMessage.error('核心变更指令被拦截')
  } finally {
    saving.value = false
  }
}

// 头像及凭证文件处理
const triggerAvatarUpload = () => avatarInput.value?.click()
const handleAvatarChange = async (e) => {
  const file = e.target.files[0]; if (!file) return
  loading.value = true
  try {
    const res = await uploadFile(file)
    await updateAvatar(res.data)
    form.avatar = res.data
    ElMessage.success('节点视效指纹上传成功')
  } catch (err) { ElMessage.error('上传链路断开') } finally { loading.value = false; e.target.value = '' }
}
const triggerProofUpload = () => {
  if (isVerifiedStatus.value) return ElMessage.info('节点已核验放行，无须重复叠加凭证')
  proofInput.value?.click()
}
const handleProofChange = async (e) => {
  const file = e.target.files[0]; if (!file) return
  loading.value = true
  try {
    const res = await uploadFile(file)
    form.identityProofUrl = res.data
    ElMessage.success('可信证明就绪，点击下方按钮激活同步链路！')
  } catch (err) { ElMessage.error('证明文件解析故障') } finally { loading.value = false; e.target.value = '' }
}

const handleUpdatePassword = async () => {
  if (!pwdForm.oldPassword || !pwdForm.newPassword) return ElMessage.warning('密钥矩阵残缺')
  if (pwdForm.newPassword !== pwdForm.confirmPassword) return ElMessage.warning('双向散列令牌碰撞不一致')
  saving.value = true
  try {
    await updatePassword({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword })
    ElMessage.success('底层密钥变更成功')
    pwdForm.oldPassword = ''; pwdForm.newPassword = ''; pwdForm.confirmPassword = ''
  } catch (e) { ElMessage.error('密码校验未通过') } finally { saving.value = false }
}

// 能力矩阵可视化 (ECharts 空间阻抗测算)
const renderCapabilityRadar = () => {
  if (!radarChartRef.value) return
  if (!myRadarChart) myRadarChart = echarts.init(radarChartRef.value)
  const score = dashboardStats.value.creditScore || 100
  const orders = dashboardStats.value.totalDeliveredOrders || 0
  const km = parseFloat(dashboardStats.value.runningMileage || 0)

  myRadarChart.setOption({
    color: ['#f97316'], tooltip: { trigger: 'item' },
    radar: {
      indicator: [
        { name: '信誉可靠度(SAW)', max: 120 },
        { name: '高负载履约(CVRP)', max: Math.max(orders + 10, 40) },
        { name: '减脂贡献里程', max: Math.max(km + 5, 30) },
        { name: '物理响应延迟', max: 100 },
        { name: '全地形覆盖力', max: 100 },
      ],
      name: { textStyle: { color: '#475569', fontWeight: 'bold' } }
    },
    series: [{
      type: 'radar',
      data: [{
        value: [score, orders, km, Math.min(score, 100), Math.min(orders * 4, 90)],
        name: '节点特征参数', areaStyle: { color: 'rgba(249, 115, 22, 0.25)' },
        lineStyle: { width: 2, color: '#ea580c' }, itemStyle: { color: '#ea580c' }
      }]
    }]
  })
}

const formatUserTag = (tag) => ({ 'ELDERLY': '重点关怀高龄老人', 'DISABLED': '行动障碍残障者', 'SAN_WORKER': '特种环卫核心保障', 'NORMAL': '常规公共申领人' }[tag] || '待识别画像')
const unverifiedTip = computed(() => {
  const tips = {
    1: { title: "⚠️ 求助关怀档案未激活", desc: "请补充完门牌号、地理选点并上传弱势证明，以便调度中心进行多因子定位，骑士将执行点对点关怀配送。" },
    2: { title: "⚠️ 社区商铺档案处于静默态", desc: "请上传完整的工商代码凭证/营业执照，并在地图中定锚，以释放商超临期物资捐赠总线权限。" },
    3: { title: "⚠️ 护航者运力枢纽处于闭锁状态", desc: "请在基础资料中上传权威个人凭证影印件（身份证或驾驶证），解锁指挥大厅实时异步抢单数据通道。" }
  }
  return tips[userRole.value] || { title: "⚠️ 通信节点受限", desc: "请联系管理员释放或下发身份令牌。" }
})

onMounted(() => {
  fetchSynchronizedData()
  window.addEventListener('resize', () => myRadarChart?.resize())
  window.addEventListener('audit-status-changed', (e) => {
    if (e.detail?.isVerified !== undefined) {
      isVerifiedStatus.value = e.detail.isVerified === 1
      fetchSynchronizedData()
    }
  })
})
</script>

<style scoped>
/* ================= 全局现代设计规范（继承自 OrderFlow） ================= */
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 40px; background: #f1f5f9; overflow-y: auto; height: 100vh; box-sizing: border-box; }
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); padding: 8px 18px; border-radius: 20px; font-size: 0.75rem; color: #475569; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); font-weight: bold; border: 1px solid rgba(255,255,255,0.7); }
.pulse-dot { border-radius: 50%; width: 8px; height: 8px; }
.dot-active { background: #10b981; box-shadow: 0 0 8px #10b981; animation: pulse-green 2s infinite; }
.dot-warn { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; animation: pulse-yellow 2s infinite; }

@keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); } 70% { box-shadow: 0 0 0 6px rgba(16,185,129,0); } 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); } }
@keyframes pulse-yellow { 0% { box-shadow: 0 0 0 0 rgba(245,158,11,0.4); } 70% { box-shadow: 0 0 0 6px rgba(245,158,11,0); } 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); } }

.profile-layout { max-width: 1000px; margin: 15px auto 0; width: 100%; }
.unverified-banner { border-radius: 14px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(245,158,11,0.05); border: 1px solid #fed7aa; }

/* ================= 1. 高立体多功能卡片层 ================= */
.profile-hero-banner { border-radius: 24px; padding: 30px 40px; display: flex; justify-content: space-between; align-items: center; color: #fff; box-shadow: 0 12px 30px rgba(30,41,59,0.15); margin-bottom: 24px; position: relative; overflow: hidden; }
.profile-hero-banner::before { content: ''; position: absolute; inset: 0; background: linear-gradient(45deg, rgba(255,255,255,0.05), transparent); pointer-events: none; }
.theme-volunteer { background: linear-gradient(135deg, #f97316, #ea580c); }
.theme-merchant { background: linear-gradient(135deg, #10b981, #059669); }
.theme-recipient { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.theme-admin { background: linear-gradient(135deg, #1e293b, #0f172a); }

.hero-left-zone { display: flex; align-items: center; gap: 24px; }
.avatar-wrapper { position: relative; width: 76px; height: 76px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.4); cursor: pointer; overflow: hidden; background: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(0,0,0,0.15); transition: all 0.3s cubic-bezier(0.4,0,0.2,1); flex-shrink: 0; }
.avatar-wrapper:hover { border-color: #fff; transform: scale(1.05) rotate(5deg); }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder { font-size: 2.2rem; display: flex; align-items: center; justify-content: center; background: #f1f5f9; width: 100%; height: 100%; }
.avatar-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.25s; }
.avatar-wrapper:hover .avatar-mask { opacity: 1; }
.camera-icon { font-size: 1.2rem; }

.user-title-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.greeting { margin: 0; font-size: 1.6rem; font-weight: 900; letter-spacing: 0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px; }
.role-badge-glow { padding: 4px 14px; background: rgba(255,255,255,0.18); backdrop-filter: blur(8px); border-radius: 20px; font-weight: 900; font-size: 0.78rem; border: 1px solid rgba(255,255,255,0.35); box-shadow: 0 4px 10px rgba(0,0,0,0.05); }

.hero-right-stats { display: flex; align-items: center; }
.metric-item { display: flex; flex-direction: column; align-items: flex-end; border-right: 1px solid rgba(255, 255, 255, 0.25); padding-right: 24px; margin-right: 24px; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.metric-item.last-item { border-right: none; padding-right: 0; margin-right: 0; }
.metric-value { font-size: 1.7rem; font-weight: 900; font-family: monospace; line-height: 1.1; }
.metric-value.text-sm { font-size: 1.1rem; font-weight: bold; }
.metric-label { font-size: 0.78rem; margin-top: 6px; opacity: 0.85; font-weight: bold; }
.locked-dashboard-mini { background: rgba(0,0,0,0.22); padding: 12px 20px; border-radius: 14px; font-size: 0.85rem; font-weight: bold; backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.1); }

/* ================= 2. 核心大舱控制面板 ================= */
.setting-main-card { background: #fff; border-radius: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.01) !important; padding: 15px 20px; }
.block-section-title { padding-left: 14px; border-left: 5px solid #ea580c; font-size: 1.1rem; font-weight: 900; color: #1e293b; margin: 12px 0 20px 0; letter-spacing: 0.5px; }
.section-subtitle { margin: -12px 0 20px 0; color: #64748b; font-size: 0.88rem; font-weight: bold; }
.radar-chart-box { width: 100%; height: 350px; }
.radar-section { margin-bottom: 24px; }
.pane-form-padding { padding: 10px 8px 0; }

.readonly-input-wrapper { height: 48px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; width: 100%; border-left: 4px solid #cbd5e1; }
.readonly-value { font-family: monospace; font-weight: bold; color: #334155; font-size: 1rem; }

/* ================= 3. 2x2 CVRP 容量卡片拓扑 ================= */
.vehicle-spec-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 20px; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); position: relative; }
.vehicle-spec-card:hover { transform: translateY(-3px); border-color: #cbd5e1; box-shadow: 0 8px 20px rgba(0,0,0,0.03); }
.vehicle-spec-card.is-active { border-color: #ea580c; background: #fffcf9; box-shadow: 0 6px 18px rgba(234, 88, 12, 0.06); }
.v-card-header-flow { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.v-title-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.v-emoji-icon { font-size: 1.4rem; }
.v-name-title { font-weight: 900; font-size: 0.95rem; color: #1e293b; }
.vehicle-spec-card.is-active .v-name-title { color: #ea580c; }
.card-active-badge { background: #ea580c; color: #fff; font-size: 0.68rem; font-weight: bold; padding: 2px 8px; border-radius: 8px; }
.v-radio-circle { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #cbd5e1; position: relative; transition: all 0.2s; }
.vehicle-spec-card.is-active .v-radio-circle { border-color: #ea580c; background: #ea580c; }
.vehicle-spec-card.is-active .v-radio-circle::after { content: ''; position: absolute; width: 6px; height: 6px; background: #fff; border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%); }

.v-spec-lines-box { display: flex; flex-direction: column; gap: 8px; }
.v-spec-line { display: flex; justify-content: space-between; font-size: 0.85rem; border-bottom: 1px dashed #f1f5f9; padding-bottom: 6px; font-weight: 600; }
.v-spec-line.border-none { border-bottom: none; padding-bottom: 0; }
.v-lbl { color: #64748b; }
.v-val { font-weight: bold; color: #334155; font-family: monospace; }
.v-unit { font-size: 0.72rem; color: #94a3b8; font-weight: normal; }
.v-val-radius { color: #ea580c; font-weight: 900; }

/* ================= 4. SaaS 级网格定位控制 ================= */
.location-picker-box { display: flex; align-items: center; gap: 14px; width: 100%; }
.loc-display { flex: 1; min-height: 54px; background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 12px; padding: 10px 16px; display: flex; flex-direction: column; justify-content: center; transition: all 0.25s; }
.loc-display.has-val { background: #f0fdf4; border: 1.5px solid #86efac; border-left: 5px solid #10b981; }
.loc-address { font-size: 0.95rem; color: #475569; font-weight: bold; }
.loc-display.has-val .loc-address { color: #166534; }
.loc-coords { font-family: monospace; font-size: 0.78rem; color: #10b981; margin-top: 3px; font-weight: bold; }
.pick-map-btn { min-height: 54px; border-radius: 12px; font-weight: bold; transition: all 0.2s; }

/* 配送单选卡片 */
.delivery-radio-group { display: flex; flex-direction: column; gap: 12px; width: 100%; }
.custom-radio-card { margin: 0 !important; height: auto !important; padding: 18px 20px !important; border-radius: 14px !important; border: 1.5px solid #e2e8f0 !important; display: flex; align-items: center; transition: all 0.2s; width: 100%; }
.custom-radio-card.is-checked { border-color: #3b82f6 !important; background: #f0f6ff !important; }
.radio-emoji { font-size: 1.4rem; margin-right: 12px; }
.radio-label { font-weight: bold; color: #334155; font-size: 0.95rem; }
:deep(.custom-radio-card .el-radio__label) { display: flex; align-items: center; padding-left: 6px; }

/* 资质底板 */
.verification-status-board { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; display: flex; justify-content: space-between; align-items: center; gap: 15px; }
.verification-status-board.is-verified { border-color: #a7f3d0; background: #f0fdf4; border-left: 5px solid #10b981; }
.board-left { display: flex; align-items: center; gap: 16px; }
.board-icon { font-size: 1.8rem; }
.board-text h4 { margin: 0 0 4px 0; font-size: 1rem; font-weight: 900; color: #1e293b; }
.board-text p { margin: 0; font-size: 0.8rem; color: #64748b; font-weight: bold; }
.board-right { display: flex; align-items: center; gap: 8px; background: #fff; padding: 6px 16px; border-radius: 100px; border: 1px solid #e2e8f0; box-shadow: 0 2px 6px rgba(0,0,0,0.02); }
.status-indicator-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-indicator-text { font-size: 0.8rem; font-weight: 900; }

.proof-upload-area { border: 2px dashed #cbd5e1; border-radius: 16px; height: 200px; display: flex; align-items: center; justify-content: center; background: #f8fafc; cursor: pointer; overflow: hidden; transition: all 0.25s; width: 100%; }
.proof-upload-area:hover { border-color: #ea580c; background: #fff7ed; }
.proof-img { width: 100%; height: 100%; object-fit: contain; background: #f8fafc; }
.upload-placeholder { display: flex; flex-direction: column; align-items: center; color: #94a3b8; font-weight: bold; }
.upload-icon { font-size: 2.4rem; margin-bottom: 8px; opacity: 0.8; }

.security-card-inner { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; }
.form-action-bar { display: flex; justify-content: flex-end; margin-top: 30px; padding-top: 15px; border-top: 1px dashed #e2e8f0; }
.btn-submit-cta { font-weight: 900; border-radius: 10px; padding: 12px 28px; font-size: 0.95rem; background: linear-gradient(135deg, #f97316, #ea580c) !important; border: none !important; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.2); transition: all 0.2s; }
.btn-submit-cta:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(234, 88, 12, 0.3); }

/* ================= Element Plus 品牌橙重写 ================= */
:deep(.el-tabs__item.is-active) { color: #ea580c !important; font-weight: 900 !important; font-size: 1rem; }
:deep(.el-tabs__item:hover) { color: #f97316 !important; }
:deep(.el-tabs__active-bar) { background-color: #ea580c !important; height: 3px !important; border-radius: 2px; }
:deep(.el-form-item__label) { font-weight: bold !important; color: #475569 !important; padding-bottom: 8px !important; }
:deep(.el-input__wrapper.is-focus) { box-shadow: 0 0 0 1px #ea580c inset !important; }

/* 地图弹出框 */
.map-search-bar { display: flex; gap: 12px; margin-bottom: 16px; }
.map-search-input-wrap { flex: 1; }
.map-search-btn { padding: 0 24px; background: #ea580c; color: #fff; border: none; border-radius: 12px; font-weight: 900; cursor: pointer; transition: all 0.2s; }
.selected-address-bar { background: #f0f6ff; padding: 14px 18px; border-radius: 12px; margin-bottom: 16px; color: #1e293b; font-size: 0.95rem; border-left: 5px solid #3b82f6; font-weight: bold; }
.amap-box { width: 100%; height: 400px; border-radius: 16px; border: 1px solid #cbd5e1; }
.custom-poi-item { line-height: 1.4; padding: 4px 0; }
.poi-name { font-weight: bold; color: #1e293b; }
.poi-address { font-size: 0.75rem; color: #94a3b8; }
:deep(.map-dialog) { border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.15); }
:deep(.map-dialog .el-dialog__header) { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 22px 30px; margin: 0; }
:deep(.map-dialog .el-dialog__title) { font-weight: 900; color: #1e293b; }

@media screen and (max-width: 768px) {
  .main-content { padding: 20px; }
  .profile-hero-banner { flex-direction: column; align-items: flex-start; gap: 20px; padding: 20px; }
  .hero-right-stats { width: 100%; justify-content: flex-start; flex-wrap: wrap; gap: 15px 0; }
  .metric-item { align-items: flex-start; width: 50%; margin: 0; padding: 0; border: none; }
  .amap-box { height: 320px !important; }
}
</style>