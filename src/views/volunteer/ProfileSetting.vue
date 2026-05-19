<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot"></span> 千人千面成就系统渲染中
    </div>

    <div class="profile-layout" v-loading="loading">
      <el-alert
          v-if="stats.isVerified !== 1 && stats.role !== 4"
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
            <img v-if="stats.avatar" :src="stats.avatar" class="avatar-img" />
            <div v-else class="avatar-placeholder" :class="'role-' + stats.role">{{ defaultAvatar }}</div>
            <div class="avatar-mask"><span class="camera-icon">📷</span></div>
            <input type="file" ref="avatarInput" hidden @change="handleAvatarChange" accept="image/*" />
          </div>
          <div class="hero-user-meta">
            <div class="user-title-row">
              <h2 class="greeting">你好，{{ stats.username || '爱心用户' }}</h2>
              <div class="role-badge-glow">{{ roleNameMap[stats.role] }}</div>
            </div>
          </div>
        </div>

        <div class="hero-right-stats">
          <template v-if="stats.isVerified === 1 || stats.role === 4">
            <template v-if="stats.role === 3">
              <div class="metric-item">
                <span class="metric-value">{{ stats.runningMileage || '0.00' }}</span>
                <span class="metric-label">🏃‍♂️ 减脂里程(km)</span>
              </div>
              <div class="metric-item">
                <span class="metric-value">{{ stats.totalDeliveredOrders || 0 }}</span>
                <span class="metric-label">📦 护航单数</span>
              </div>
              <div class="metric-item last-item">
                <span class="metric-value">{{ stats.creditScore || 100 }}</span>
                <span class="metric-label">🏆 调度信誉分</span>
              </div>
            </template>
            <template v-else-if="stats.role === 1">
              <div class="metric-item">
                <span class="metric-value text-sm">{{ formatUserTag(stats.userTag) }}</span>
                <span class="metric-label">🛡️ 人群标签</span>
              </div>
              <div class="metric-item last-item">
                <span class="metric-value">{{ stats.totalReceivedTimes || 0 }}</span>
                <span class="metric-label">🤝 获援助(次)</span>
              </div>
            </template>
            <template v-else-if="stats.role === 4">
              <div class="metric-item">
                <span class="metric-value text-sm">在线</span>
                <span class="metric-label">📡 节点状态</span>
              </div>
              <div class="metric-item last-item">
                <span class="metric-value text-sm">Root</span>
                <span class="metric-label">🛡️ 权限级别</span>
              </div>
            </template>
          </template>
          <div v-else-if="stats.role !== 4" class="locked-dashboard-mini">
            🔒 资质审核通过后解锁专属档案
          </div>
        </div>
      </div>

      <el-card v-if="stats.role === 3 && stats.isVerified === 1" class="setting-main-card radar-section" shadow="never">
        <div class="block-section-title">⚡ 骑手综合能力评估矩阵</div>
        <p class="section-subtitle">基于 SAW 多因子调度引擎底层数据的多维能力画像</p>
        <div ref="radarChartRef" class="radar-chart-box"></div>
      </el-card>

      <el-card class="setting-main-card" shadow="never">
        <el-tabs v-model="activeTab" class="custom-profile-tabs">

          <el-tab-pane label="👤 基础认证资料" name="profile">
            <el-form :model="profileForm" label-position="top" class="pane-form-padding">
              <div class="block-section-title">📝 个人身份资料</div>

              <el-row :gutter="20">
                <el-col :xs="24" :sm="12">
                  <el-form-item label="注册手机号 (凭证不可改)">
                    <div class="readonly-input-wrapper">
                      <span class="readonly-value">{{ profile.phone }}</span>
                      <el-tag type="success" size="small" effect="plain">已绑定</el-tag>
                    </div>
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="12">
                  <el-form-item label="系统展示名称 / 真实姓名" required>
                    <el-input v-model="profileForm.username" size="large" placeholder="请输入您的姓名" />
                  </el-form-item>
                </el-col>
              </el-row>

              <template v-if="stats.role === 1">
                <el-divider border-style="dashed" />
                <div class="block-section-title">🏠 居住与关怀档案</div>
                <el-form-item label="详细门牌号 (精确到室)" required>
                  <el-input v-model="profileForm.doorNumber" size="large" placeholder="例如：幸福小区3栋2梯402室" />
                </el-form-item>
                <el-row :gutter="20">
                  <el-col :xs="24" :sm="12">
                    <el-form-item label="紧急联系人电话">
                      <el-input v-model="profileForm.emergencyPhone" size="large" placeholder="突发状况时方便骑士联系" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12">
                    <el-form-item label="特定关怀需求 (可多选)">
                      <el-checkbox-group v-model="careTags">
                        <el-checkbox label="行动不便">行动不便</el-checkbox>
                        <el-checkbox label="需特殊用药">需特殊用药</el-checkbox>
                        <el-checkbox label="独居高龄">独居高龄</el-checkbox>
                      </el-checkbox-group>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-form-item label="健康与送达备注">
                  <el-input v-model="profileForm.healthRemark" size="large" placeholder="例如：严重糖尿病(需无糖)，或双目失明需电话联系" />
                </el-form-item>
              </template>

              <template v-if="stats.role === 2">
                <el-divider border-style="dashed" />
                <div class="block-section-title">🏪 商铺档案配置</div>
                <el-form-item label="商铺主营类目" required>
                  <el-select v-model="profileForm.industryType" size="large" style="width: 100%" placeholder="请选择商铺类型">
                    <el-option label="🥩 餐饮生鲜 (热食、盒饭、生鲜蔬菜)" :value="1" />
                    <el-option label="🛒 商超便利 (米面粮油、方便速食、日用品)" :value="2" />
                    <el-option label="💊 医药器械 (常备药、外用急救、医疗耗材)" :value="3" />
                  </el-select>
                </el-form-item>
                <el-form-item label="实体商铺坐标位置" required>
                  <div class="location-picker-box">
                    <div class="loc-display" :class="{ 'has-val': profileForm.currentLon }">
                      <div class="loc-address">{{ profileForm.addressName || '尚未设置坐标，请点击地图选点' }}</div>
                      <div class="loc-coords" v-if="profileForm.currentLon">Lon: {{ profileForm.currentLon }} | Lat: {{ profileForm.currentLat }}</div>
                    </div>
                    <el-button type="primary" plain class="pick-map-btn" @click="openMapDialog">🗺️ 地图选点</el-button>
                  </div>
                </el-form-item>
              </template>

              <template v-if="stats.role !== 4">
                <el-divider border-style="dashed" />
                <div class="block-section-title">🪪 城市生命通道资质核验</div>

                <div class="verification-status-board" :class="{ 'is-verified': stats.isVerified === 1 }">
                  <div class="board-left">
                    <span class="board-icon">{{ stats.isVerified === 1 ? '✅' : '⏳' }}</span>
                    <div class="board-text">
                      <h4>{{ stats.isVerified === 1 ? '资质已核验通过' : '平台审核中 / 未提交' }}</h4>
                      <p>{{ stats.isVerified === 1 ? '您已获得城市互助网络的完整权限，所有调度功能已全面解锁' : '请上传相关凭证，指挥中心将尽快为您办理' }}</p>
                    </div>
                  </div>
                  <div class="board-right" v-if="stats.isVerified === 1">
                    <span class="status-indicator-dot" style="background: #10b981"></span>
                    <span class="status-indicator-text" style="color: #065f46">已核验通过</span>
                  </div>
                </div>

                <div v-if="stats.isVerified !== 1" style="margin-top: 20px;">
                  <el-form-item required :label="stats.role === 1 ? '上传凭证 (身份证 / 低保证 / 残疾证)' : stats.role === 2 ? '上传凭证 (营业执照 / 许可证)' : '上传凭证 (身份证 / 驾驶证)'">
                    <div class="proof-upload-area" @click="triggerProofUpload">
                      <img v-if="profileForm.identityProofUrl" :src="profileForm.identityProofUrl" class="proof-img" />
                      <div v-else class="upload-placeholder">
                        <span class="upload-icon">📄</span><span>点击拍摄或上传您的资质文件</span>
                      </div>
                      <input type="file" ref="proofInput" hidden @change="handleProofChange" accept="image/*" />
                    </div>
                  </el-form-item>
                  <el-button type="primary" size="large" class="btn-submit-audit" @click="handleSubmitAudit" :loading="saving">
                    🚀 资料确认无误，提交审核
                  </el-button>
                </div>
              </template>

              <!-- ✅ FIX-B: 基础资料 Tab 保存按钮 -->
              <div style="display:flex; justify-content:flex-end; margin-top:24px;">
                <el-button size="large" type="primary" class="btn-submit-cta" @click="handleUpdateProfile(false)" :loading="saving">
                  💾 保存基础资料
                </el-button>
              </div>
            </el-form>
          </el-tab-pane>

          <!-- ✅ FIX-3: CVRP仅对已认证骑手开放 -->
          <el-tab-pane v-if="stats.role === 3 && stats.isVerified === 1" label="🛵 运力约束参数" name="cvrp">
            <el-form label-position="top" class="pane-form-padding">
              <div class="block-section-title">📐 CVRP 动态配送载具配置</div>

              <el-row :gutter="20" class="vehicle-grid-row">
                                <!-- ✅ FIX-3: 运力卡片加移动端断点 -->
                <el-col :xs="24" :sm="12" v-for="v in vehicleOptions" :key="v.type" style="margin-bottom: 20px;">
                  <el-card
                      class="vehicle-spec-card"
                      :class="{ 'is-active': profileForm.vehicleType === v.type }"
                      shadow="hover"
                      @click="profileForm.vehicleType = v.type"
                  >
                    <!-- ✅ FIX-A: 激活徽章移入卡片内部 -->
                    <div class="v-card-header-flow">
                      <div class="v-title-meta">
                        <span class="v-emoji-icon">{{ v.icon }}</span>
                        <span class="v-name-title">{{ v.name }}</span>
                        <span class="card-active-badge" v-if="profileForm.vehicleType === v.type">✓ 激活</span>
                      </div>
                      <div class="v-radio-circle"></div>
                    </div>

                    <div class="v-spec-lines-box">
                      <div class="v-spec-line">
                        <span class="v-lbl">🏋️ 重量上限约束</span>
                        <span class="v-val">{{ v.maxWeight }} <span class="v-unit">承重点(约kg)</span></span>
                      </div>
                      <div class="v-spec-line">
                        <span class="v-lbl">📦 体积空间约束</span>
                        <span class="v-val">{{ v.maxVolume }} <span class="v-unit">容积点(约L)</span></span>
                      </div>
                      <div class="v-spec-line border-none">
                        <span class="v-lbl">📍 推荐流转半径</span>
                        <span class="v-val-radius">{{ v.radius }}</span>
                      </div>
                    </div>
                  </el-card>
                </el-col>
              </el-row>

              <el-alert title="系统算法流转提示" type="warning" :closable="false" show-icon style="margin-bottom: 25px;">
                选择的载具类型将直接作为后端 <strong>CVRP 路径规划算法</strong> 与 <strong>SAW 多因子引擎</strong> 的刚性约束限制。若物资超过您载具上限，大厅将自动执行物理拦截。
              </el-alert>

              <el-divider border-style="dashed" />
              <div class="block-section-title">📍 常驻流转与全时服务辖区</div>
              <el-form-item label="默认常驻中心锚点 (算法派单基准点)" required>
                <div class="location-picker-box">
                  <div class="loc-display" :class="{ 'has-val': profileForm.currentLon }">
                    <div class="loc-address">{{ profileForm.addressName || '尚未设置坐标，请点击地图选点' }}</div>
                    <div class="loc-coords" v-if="profileForm.currentLon">Lon: {{ profileForm.currentLon }} | Lat: {{ profileForm.currentLat }}</div>
                  </div>
                  <el-button type="primary" plain class="pick-map-btn" @click="openMapDialog">🗺️ 地图选点</el-button>
                </div>
              </el-form-item>

              <!-- ✅ FIX-B: 运力设置 Tab 保存按钮 -->
              <div style="display:flex; justify-content:flex-end; margin-top:24px;">
                <el-button size="large" type="primary" class="btn-submit-cta" @click="handleUpdateProfile(false)" :loading="saving">
                  💾 保存运力设置
                </el-button>
              </div>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="🔒 账号安全中心" name="security">
            <el-form :model="pwdForm" label-position="top" class="pane-form-padding">
              <div class="block-section-title">🔒 身份访问凭证修改</div>

              <div class="security-card-inner">
                <el-form-item label="当前的登录旧密码">
                  <el-input v-model="pwdForm.oldPassword" type="password" size="large" show-password placeholder="请输入当前密码" />
                </el-form-item>

                <el-row :gutter="20" style="margin-top: 15px;">
                  <el-col :xs="24" :sm="12">
                    <el-form-item label="设置新登录密码">
                      <el-input v-model="pwdForm.newPassword" type="password" size="large" show-password placeholder="请输入新密码" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12">
                    <el-form-item label="确认新登录密码">
                      <el-input v-model="pwdForm.confirmPassword" type="password" size="large" show-password placeholder="再次输入新密码" />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-button type="danger" plain size="large" style="width: 100%; margin-top: 10px;" @click="handleUpdatePassword" :loading="saving">
                  🛡️ 确认修改登录密码
                </el-button>
              </div>
            </el-form>
          </el-tab-pane>

        </el-tabs>

        <!-- ✅ FIX-B: 全局保存按钮已移至各 tab 内部 -->
      </el-card>

    </div>

    <el-dialog
        v-if="[2, 3].includes(stats.role)"
        v-model="mapVisible"
        title="定位常驻服务网格"
        width="95%"
        style="max-width: 750px;"
        @opened="initMap"
        destroy-on-close
        custom-class="map-dialog"
    >
      <div class="map-search-bar">
        <el-autocomplete
            v-model="searchKeyword"
            :fetch-suggestions="querySearchAsync"
            placeholder="请输入详细地址"
            @select="handleSelectPoi"
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
        <button class="map-search-btn" @click="handleSearchAddress">🔍 搜索定位</button>
      </div>
      <div class="map-top-tip"><span class="tip-icon">👆</span> 您可以搜索具体地址，也可以在地图中直接点击</div>
      <div class="selected-address-bar" v-if="tempLoc.address"><strong>当前选中：</strong> {{ tempLoc.address }}</div>
      <div id="amap-container" class="amap-box"></div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="mapVisible = false" round>取消</el-button>
          <el-button type="primary" @click="confirmLocation" :disabled="!tempLoc.lng" round>确认该位置</el-button>
        </span>
      </template>
    </el-dialog>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import AMapLoader from '@amap/amap-jsapi-loader'
import { getUserProfile, updateUserProfile, updatePassword, getDashboardStats, updateAvatar } from '@/api/user'
import { uploadFile } from '@/api/common'

// ==================== 全局状态 ====================
const loading = ref(false)
const saving = ref(false)
const profile = ref({})
const stats = ref({})
const avatarInput = ref(null)
const proofInput = ref(null)
const radarChartRef = ref(null)
let myRadarChart = null

const activeTab = ref('profile')

// ==================== 常量 ====================
const roleNameMap = { 1: '👴 重点关怀对象', 2: '🏪 城市爱心合伙人', 3: '🚴 核心护航骑手', 4: '👨‍💻 指挥中心 Root' }

const roleThemeClass = computed(() => {
  const map = { 1: 'theme-recipient', 2: 'theme-merchant', 3: 'theme-volunteer', 4: 'theme-admin' }
  return map[stats.value.role] || 'theme-volunteer'
})

const defaultAvatar = computed(() => {
  const role = stats.value.role
  if (role === 2) {
    const industryIcons = { 1: '🍖', 2: '🛒', 3: '💊', 4: '👗' }
    return industryIcons[profileForm.industryType] || '🏪'
  }
  return { 1: '👴', 3: '🚴', 4: '🛡️' }[role] || '🙂'
})

// ==================== CVRP 载具数据 ====================
const vehicleOptions = [
  { type: 1, icon: '🚶', name: '步行 / 跑步', maxWeight: '≤ 2', maxVolume: '≤ 2', radius: '< 2 km' },
  { type: 2, icon: '🚴', name: '单车 / 自行车', maxWeight: '≤ 4', maxVolume: '≤ 5', radius: '< 5 km' },
  { type: 3, icon: '🛵', name: '电动自行车', maxWeight: '≤ 10', maxVolume: '≤ 15', radius: '< 10 km' },
  { type: 4, icon: '🚗', name: '汽车 / 小货车', maxWeight: '≤ 100', maxVolume: '≤ 100', radius: '不限距离' },
]

// ==================== 表单数据 ====================
const profileForm = reactive({
  username: '', currentLon: '', currentLat: '', addressName: '',
  doorNumber: '', emergencyPhone: '', healthRemark: '',
  identityProofUrl: '', vehicleType: 1, industryType: '', userTag: '',
})
const careTags = ref([])
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

// ==================== 高德地图逻辑 ====================
const mapVisible = ref(false)
let mapInstance = null, markerInstance = null, geocoderInstance = null, autoCompleteInstance = null
const searchKeyword = ref('')
const tempLoc = reactive({ lng: '', lat: '', address: '' })

const openMapDialog = () => {
  tempLoc.lng = profileForm.currentLon; tempLoc.lat = profileForm.currentLat
  tempLoc.address = profileForm.addressName; searchKeyword.value = ''; mapVisible.value = true
}
const querySearchAsync = (q, cb) => {
  if (!q || !autoCompleteInstance) { cb([]); return }
  autoCompleteInstance.search(q, (s, r) => { cb(s === 'complete' && r.tips ? r.tips.filter(i => i.location) : []) })
}
const handleSelectPoi = (poi) => {
  if (poi && poi.location) {
    updateMapByLocation(poi.location.getLng(), poi.location.getLat(), (poi.district || '') + (poi.address || '') + (poi.name || ''))
    searchKeyword.value = poi.name; ElMessage.success('已定位')
  }
}
const handleSearchAddress = () => {
  if (!searchKeyword.value.trim()) return ElMessage.warning('请输入地址')
  geocoderInstance.getLocation(searchKeyword.value, (s, r) => {
    if (s === 'complete' && r.info === 'OK' && r.geocodes.length > 0) {
      const b = r.geocodes[0]; updateMapByLocation(b.location.getLng(), b.location.getLat(), b.formattedAddress)
      ElMessage.success('定位成功')
    }
  })
}
const updateMapByLocation = (lng, lat, addr) => {
  tempLoc.lng = lng; tempLoc.lat = lat; tempLoc.address = addr
  mapInstance.setZoomAndCenter(16, [lng, lat], false, 1000)
  if (markerInstance) markerInstance.setPosition([lng, lat])
  else { markerInstance = new AMap.Marker({ position: [lng, lat] }); mapInstance.add(markerInstance) }
}
const resolveAddressFromCoords = (lng, lat) => {
  window._AMapSecurityConfig = { securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE }
  AMapLoader.load({ key: import.meta.env.VITE_AMAP_KEY, version: "2.0", plugins: ['AMap.Geocoder'] }).then((AMap) => {
    new AMap.Geocoder({ radius: 1000, extensions: "all" }).getAddress([lng, lat], (s, r) => {
      profileForm.addressName = s === 'complete' && r.info === 'OK' ? r.regeocode.formattedAddress : '已绑定卫星坐标'
    })
  })
}
const initMap = () => {
  window._AMapSecurityConfig = { securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE }
  AMapLoader.load({ key: import.meta.env.VITE_AMAP_KEY, version: "2.0", plugins: ['AMap.Geocoder', 'AMap.AutoComplete', 'AMap.Geolocation'] }).then((AMap) => {
    const hasSaved = tempLoc.lng && tempLoc.lat
    mapInstance = new AMap.Map("amap-container", {
      viewMode: "2D", zoom: 15,
      center: hasSaved ? [tempLoc.lng, tempLoc.lat] : [118.084761, 24.620538]
    })
    geocoderInstance = new AMap.Geocoder({ radius: 1000, extensions: "all" })
    autoCompleteInstance = new AMap.AutoComplete({})
    if (hasSaved) {
      markerInstance = new AMap.Marker({ position: [tempLoc.lng, tempLoc.lat] })
      mapInstance.add(markerInstance)
    } else {
      const geolocation = new AMap.Geolocation({ enableHighAccuracy: true, timeout: 5000, buttonPosition: 'RB', buttonOffset: new AMap.Pixel(10, 20), zoomToAccuracy: true })
      mapInstance.addControl(geolocation)
      geolocation.getCurrentPosition((s, r) => {
        if (s === 'complete') {
          ElMessage.success('📍 自动吸附至当前位置')
          geocoderInstance.getAddress([r.position.lng, r.position.lat], (gs, gr) => {
            updateMapByLocation(r.position.lng, r.position.lat, gs === 'complete' ? gr.regeocode.formattedAddress : '坐标')
          })
        }
      })
    }
    mapInstance.on('click', (e) => {
      geocoderInstance.getAddress([e.lnglat.getLng(), e.lnglat.getLat()], (s, r) => {
        updateMapByLocation(e.lnglat.getLng(), e.lnglat.getLat(), s === 'complete' ? r.regeocode.formattedAddress : '未知区域')
      })
    })
  })
}
const confirmLocation = () => {
  profileForm.currentLon = tempLoc.lng; profileForm.currentLat = tempLoc.lat
  profileForm.addressName = tempLoc.address; mapVisible.value = false
}

// ==================== 数据获取 ====================
const formatUserTag = (tag) => {
  const m = { 'ELDERLY': '老人', 'DISABLED': '残疾', 'SAN_WORKER': '环卫', 'NORMAL': '普通' }
  return m[tag] || tag || '普通'
}

const fetchAllData = async () => {
  loading.value = true
  try {
    const [profileRes, statsRes] = await Promise.all([getUserProfile(), getDashboardStats()])
    profile.value = profileRes.data
    /* ✅ FIX-1: 精确提取dashboard字段，防止null覆盖profile核心字段 */
    const d = statsRes.data || {};
    stats.value = {
      ...profileRes.data,
      creditScore: d.creditScore,
      totalDeliveredOrders: d.totalDeliveredOrders,
      runningMileage: d.runningMileage,
      totalReceivedTimes: d.totalReceivedTimes
    }

    profileForm.username = profileRes.data.username || ''
    profileForm.currentLon = profileRes.data.currentLon || ''
    profileForm.currentLat = profileRes.data.currentLat || ''
    profileForm.doorNumber = profileRes.data.doorNumber || ''
    profileForm.emergencyPhone = profileRes.data.emergencyPhone || ''
    profileForm.healthRemark = profileRes.data.healthRemark || ''
    profileForm.identityProofUrl = profileRes.data.identityProofUrl || ''
    profileForm.vehicleType = profileRes.data.vehicleType || 1
    profileForm.industryType = profileRes.data.industryType || ''
    profileForm.userTag = profileRes.data.userTag || ''
    careTags.value = profileForm.userTag ? profileForm.userTag.split(',').filter(t => t.trim()) : []

    if (profileForm.currentLon && profileForm.currentLat) {
      profileForm.addressName = '正在解析...'
      resolveAddressFromCoords(profileForm.currentLon, profileForm.currentLat)
    }
    if (stats.value.role === 3 && stats.value.isVerified === 1) nextTick(() => initRadarChart())
    if (stats.value.role === 3 && stats.value.isVerified === 1) activeTab.value = 'cvrp'
  } catch (e) { ElMessage.error('数据加载失败，请刷新重试') } finally { loading.value = false }
}

const initRadarChart = () => {
  if (!radarChartRef.value) return
  if (!myRadarChart) myRadarChart = echarts.init(radarChartRef.value)
  const credit = stats.value.creditScore || 100
  const orders = stats.value.totalDeliveredOrders || 0
  const mileage = parseFloat(stats.value.runningMileage || 0)
  myRadarChart.setOption({
    color: ['#f97316'],
    tooltip: { trigger: 'item' },
    radar: {
      indicator: [
        { name: '信誉可靠度', max: 150 },
        { name: '运力活跃度', max: Math.max(orders + 10, 50) },
        { name: '减脂贡献', max: Math.max(mileage + 10, 50) },
        { name: '履约率', max: 100 },
        { name: '高难工单', max: 100 },
      ],
      name: { textStyle: { color: '#475569', fontWeight: 'bold' } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: [credit, orders, mileage, Math.min(credit, 100), Math.min(orders * 5, 95)],
        name: '综合评估',
        areaStyle: { color: 'rgba(249, 115, 22, 0.4)' },
        lineStyle: { width: 2, color: '#ea580c' },
        itemStyle: { color: '#ea580c' },
      }],
    }],
  })
}

// ==================== 头像与资质上传 ====================
const triggerAvatarUpload = () => { if (avatarInput.value) avatarInput.value.click() }
const handleAvatarChange = async (e) => {
  const f = e.target.files[0]; if (!f) return
  loading.value = true
  try {
    const r = await uploadFile(f); await updateAvatar(r.data)
    stats.value.avatar = r.data; ElMessage.success('头像上传成功')
  } catch (err) { ElMessage.error('头像上传失败') } finally { loading.value = false; e.target.value = '' }
}

const triggerProofUpload = () => {
  if (stats.value.isVerified === 1) return ElMessage.info('资质已通过，无需重复上传')
  if (proofInput.value) proofInput.value.click()
}
const handleProofChange = async (e) => {
  const f = e.target.files[0]; if (!f) return
  loading.value = true
  try {
    const r = await uploadFile(f); profileForm.identityProofUrl = r.data
    ElMessage.success('凭证照片暂存成功！请点击下方按钮提交。')
  } catch (err) { ElMessage.error('凭证上传失败') } finally { loading.value = false; e.target.value = '' }
}

// ==================== 提交表单 ====================
const handleUpdateProfile = async (isSubmitAudit = false) => {
  const payload = { username: profileForm.username }
  if (profileForm.identityProofUrl && profileForm.identityProofUrl !== profile.value.identityProofUrl) {
    payload.identityProofUrl = profileForm.identityProofUrl
  }
  if ([2, 3].includes(stats.value.role) && profileForm.currentLon) {
    payload.currentLon = parseFloat(profileForm.currentLon)
    payload.currentLat = parseFloat(profileForm.currentLat)
  }
  if (stats.value.role === 1) {
    payload.doorNumber = profileForm.doorNumber; payload.emergencyPhone = profileForm.emergencyPhone
    payload.healthRemark = profileForm.healthRemark; payload.userTag = careTags.value.join(',')
  }
  /* ✅ FIX-2: 防御空字符串导致后端Byte反序列化500 */
  if (stats.value.role === 2 && profileForm.industryType !== '') payload.industryType = profileForm.industryType
  if (stats.value.role === 3) payload.vehicleType = profileForm.vehicleType

  saving.value = true
  try {
    await updateUserProfile(payload)
    localStorage.setItem('username', profileForm.username)
    stats.value.username = profileForm.username
    /* ✅ FIX-4: 派发全局事件通知SideMenu等组件同步更新 */
    window.dispatchEvent(new CustomEvent('user-info-updated', { detail: { username: profileForm.username } }))
    if (!isSubmitAudit) ElMessage.success('全局设置已成功保存！')
    fetchAllData()
    return true
  } catch (e) { return false } finally { saving.value = false }
}

const handleSubmitAudit = async () => {
  if (!profileForm.username.trim()) return ElMessage.warning('请填写系统展示名称 / 真实姓名')
  if ([2, 3].includes(stats.value.role) && !profileForm.currentLon) return ElMessage.warning('LBS 引擎需要基站坐标，请点击【地图选点】！')
  if (stats.value.role === 1 && !profileForm.doorNumber) return ElMessage.warning('请填写详细门牌号，否则无法精准送货上门！')
  if (stats.value.role === 2 && !profileForm.industryType) return ElMessage.warning('请选择您的商铺主营类目！')
  if (!profileForm.identityProofUrl) return ElMessage.warning('请上传您的相关资质凭证图片！')

  const success = await handleUpdateProfile(true)
  if (success) ElMessage.success('🎉 校验通过！您的申请已推送至指挥中心队列。')
}

const unverifiedTip = computed(() => {
  const r = stats.value?.role
  if (r === 1) return { title: "【求助关怀档案】未激活", desc: "请向下滚动完善门牌号并上传身份证明，以便调度网络精准上门！" }
  if (r === 2) return { title: "【爱心商铺入驻】审核中", desc: "请补充商铺定位、主营类目与营业执照，解锁物资捐赠权限！" }
  if (r === 3) return { title: "【城市护航者权限】受限", desc: "请完善载具信息并上传身份凭证，解锁实时抢单系统！" }
  return { title: "【系统权限】受限", desc: "请向下滚动完善基础资料并上传资质凭证。" }
})

// ==================== 密码 ====================
const handleUpdatePassword = async () => {
  if (!pwdForm.oldPassword || !pwdForm.newPassword) return ElMessage.warning('密码填写不完整')
  if (pwdForm.newPassword !== pwdForm.confirmPassword) return ElMessage.warning('两次新密码不一致')
  saving.value = true
  try {
    await updatePassword({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword })
    ElMessage.success('密码修改成功！')
    pwdForm.oldPassword = ''; pwdForm.newPassword = ''; pwdForm.confirmPassword = ''
  } catch (e) { ElMessage.error('密码修改失败，请检查旧密码') } finally { saving.value = false }
}

// ==================== 生命周期 ====================
onMounted(() => {
  fetchAllData()
  window.addEventListener('resize', () => { if (myRadarChart) myRadarChart.resize() })
})
</script>

<style scoped>
/* ===== 页面整体基础骨架 ===== */
.main-content {
  flex: 1; display: flex; flex-direction: column; position: relative;
  padding: 30px; background: #f1f5f9; overflow-y: auto; height: 100vh;
}
/* ✅ FIX-2: top-status 改为 sticky 定位 */
.top-status {
  position: sticky; top: 16px; align-self: flex-end;
  margin-left: auto; margin-bottom: -40px; z-index: 100;
  background: rgba(255,255,255,0.8); backdrop-filter: blur(10px);
  padding: 8px 16px; border-radius: 20px; font-size: 0.75rem;
  color: #64748b; display: flex; align-items: center; gap: 8px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}
.pulse-dot {
  width: 8px; height: 8px; background: #8b5cf6; border-radius: 50%;
  box-shadow: 0 0 8px #8b5cf6; animation: pulse-purple 2s infinite;
}
@keyframes pulse-purple {
  0% { box-shadow: 0 0 0 0 rgba(139,92,246,0.4); }
  70% { box-shadow: 0 0 0 6px rgba(139,92,246,0); }
  100% { box-shadow: 0 0 0 0 rgba(139,92,246,0); }
}

.profile-layout {
  max-width: 900px; margin: 0 auto; width: 100%;
}
.unverified-banner { margin-bottom: 20px; border-radius: 12px; }

/* ===== 顶部多角色 Hero 看板 ===== */
.profile-hero-banner {
  border-radius: 16px; padding: 26px 30px; display: flex;
  justify-content: space-between; align-items: center; color: #fff;
  box-shadow: 0 10px 25px rgba(30, 41, 59, 0.12); margin-bottom: 24px;
}
.theme-volunteer { background: linear-gradient(135deg, #f97316, #ea580c); }
.theme-merchant  { background: linear-gradient(135deg, #10b981, #059669); }
.theme-recipient { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.theme-admin     { background: linear-gradient(135deg, #1e293b, #0f172a); }

.hero-left-zone { display: flex; align-items: center; gap: 20px; }
.avatar-wrapper {
  position: relative; width: 68px; height: 68px; border-radius: 50%;
  border: 3px solid rgba(255,255,255,0.3); cursor: pointer; overflow: hidden;
  background: #fff; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 15px rgba(0,0,0,0.15); transition: 0.3s; flex-shrink: 0;
}
.avatar-wrapper:hover { border-color: #fff; transform: scale(1.05); }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder { font-size: 1.8rem; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.avatar-placeholder.role-1 { background: linear-gradient(135deg, #dbeafe, #bfdbfe); }
.avatar-placeholder.role-2 { background: linear-gradient(135deg, #d1fae5, #a7f3d0); }
.avatar-placeholder.role-3 { background: linear-gradient(135deg, #ffedd5, #fed7aa); }
.avatar-placeholder.role-4 { background: linear-gradient(135deg, #e2e8f0, #cbd5e1); }
.avatar-mask {
  position: absolute; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.3s;
}
.avatar-wrapper:hover .avatar-mask { opacity: 1; }
/* ✅ FIX-5: 用户名行溢出保护 */
.user-title-row { display: flex; align-items: center; gap: 6px 10px; flex-wrap: wrap; }
.greeting {
  margin: 0; font-size: 1.4rem; font-weight: 800; letter-spacing: 0.5px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;
}
.role-badge-glow {
  padding: 3px 12px; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px);
  border-radius: 20px; font-weight: bold; font-size: 0.75rem; border: 1px solid rgba(255,255,255,0.4);
}

.hero-right-stats { display: flex; }
.metric-item {
  display: flex; flex-direction: column; align-items: flex-end;
  border-right: 1px solid rgba(255, 255, 255, 0.2); padding-right: 20px; margin-right: 20px;
}
.metric-item.last-item { border-right: none; padding-right: 0; margin-right: 0; }
.metric-value { font-size: 1.5rem; font-weight: 900; }
.metric-value.text-sm { font-size: 1.1rem; padding-top: 5px; }
.metric-label { font-size: 0.75rem; margin-top: 4px; opacity: 0.9; }

.locked-dashboard-mini {
  background: rgba(0,0,0,0.2); padding: 10px 18px; border-radius: 12px;
  font-size: 0.85rem; font-weight: bold; backdrop-filter: blur(5px);
}

/* ===== 雷达图区块 ===== */
.radar-section { margin-bottom: 24px; }
.section-subtitle { margin: 0; color: #64748b; font-size: 0.9rem; margin-top: 5px; }
.radar-chart-box { width: 100%; height: 350px; margin-top: 10px; }

/* ===== 主体表单卡片区 ===== */
.setting-main-card {
  border-radius: 16px; border: 1px solid #f1f5f9;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02) !important; padding: 10px 15px;
}
.block-section-title {
  padding: 0 0 0 12px;
  border-left: 4px solid #f97316;
  font-size: 1.05rem;
  font-weight: 900;
  color: #1e293b;
  margin-top: 10px;
  margin-bottom: 24px;
}
.pane-form-padding { padding: 10px 5px 0 5px; }

/* ===== 只读包装盒样式 ===== */
.readonly-input-wrapper {
  height: 40px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
  display: flex; align-items: center; justify-content: space-between; padding: 0 15px; width: 100%;
}
.readonly-value { font-weight: 700; color: #334155; font-size: 0.95rem; }

/* ===== 资质看板区块 ===== */
.verification-status-board {
  background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px;
  padding: 18px 20px; display: flex; justify-content: space-between; align-items: center;
}
.verification-status-board.is-verified { border-color: #a7f3d0; background: #f0fdf4; }
.board-left { display: flex; align-items: center; gap: 16px; }
.board-icon { font-size: 1.6rem; }
.board-text h4 { margin: 0 0 4px 0; font-size: 0.95rem; font-weight: 900; color: #1e293b; }
.board-text p { margin: 0; font-size: 0.8rem; color: #64748b; }
.board-right {
  display: flex; align-items: center; gap: 8px; background: #ffffff; padding: 6px 14px;
  border-radius: 100px; border: 1px solid #e2e8f0; box-shadow: 0 2px 6px rgba(0,0,0,0.02);
}
.status-indicator-dot { width: 7px; height: 7px; border-radius: 50%; }
.status-indicator-text { font-size: 0.8rem; font-weight: 800; }

.proof-upload-area {
  border: 2px dashed #cbd5e1; border-radius: 12px; height: 190px;
  display: flex; align-items: center; justify-content: center;
  background: #f8fafc; cursor: pointer; overflow: hidden; transition: 0.3s; width: 100%;
}
.proof-upload-area:hover { border-color: #f97316; background: #fff7ed; }
.proof-img { width: 100%; height: 100%; object-fit: contain; background: #f1f5f9; }
.upload-placeholder { display: flex; flex-direction: column; align-items: center; color: #94a3b8; font-weight: 600; }
.upload-icon { font-size: 2.2rem; margin-bottom: 8px; opacity: 0.8; }
.btn-submit-audit { width: 100%; margin-top: 15px; font-weight: 700; border-radius: 12px; }

/* ===== 核心：2x2 运力卡片矩阵 ===== */
.vehicle-spec-card {
  border-radius: 12px; border: 1.5px solid #e2e8f0; cursor: pointer;
  position: relative; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
:deep(.vehicle-spec-card .el-card__body) { padding: 18px 20px !important; }
.vehicle-spec-card:hover { transform: translateY(-3px); border-color: #fdba74; }
.vehicle-spec-card.is-active { border-color: #f97316; background: #fffcf9; box-shadow: 0 6px 18px rgba(249, 115, 22, 0.06); }
.v-card-header-flow { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.v-title-meta { display: flex; align-items: center; gap: 10px; }
.v-emoji-icon { font-size: 1.3rem; }
.v-name-title { font-weight: 900; font-size: 0.95rem; color: #1e293b; }
.vehicle-spec-card.is-active .v-name-title { color: #ea580c; }
.v-radio-circle { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #cbd5e1; position: relative; }
.vehicle-spec-card.is-active .v-radio-circle { border-color: #f97316; background: #f97316; }
.vehicle-spec-card.is-active .v-radio-circle::after { content: ''; position: absolute; width: 5px; height: 5px; background: #ffffff; border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%); }
.v-spec-lines-box { display: flex; flex-direction: column; gap: 8px; }
.v-spec-line { display: flex; justify-content: space-between; font-size: 0.82rem; border-bottom: 1px dotted #f1f5f9; padding-bottom: 6px; }
.v-spec-line.border-none { border-bottom: none; padding-bottom: 0; }
.v-lbl { color: #64748b; }
.v-val { font-weight: 800; color: #334155; }
.v-unit { font-size: 0.72rem; color: #94a3b8; font-weight: normal; }
.v-val-radius { color: #f97316; font-weight: 800; }
/* ✅ FIX-A: 激活徽章改为内联badge */
.card-active-badge {
  background: #f97316; color: white; font-size: 0.68rem;
  font-weight: bold; padding: 2px 8px; border-radius: 10px;
}

/* ===== 地图与表单增强 ===== */
/* ✅ FIX-4: 地图选点区域高度协调 */
.location-picker-box { display: flex; align-items: center; gap: 12px; width: 100%; }
.loc-display {
  flex: 1; min-height: 54px; background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 8px;
  padding: 8px 14px; display: flex; flex-direction: column; justify-content: center; transition: 0.3s;
}
.loc-display.has-val { background: #f0fdf4; border: 1.5px solid #86efac; }
.loc-address { font-size: 0.95rem; color: #64748b; font-weight: 600; }
.loc-display.has-val .loc-address { color: #166534; }
.loc-coords { font-family: monospace; font-size: 0.75rem; color: #10b981; margin-top: 2px; font-weight: 700; }
.pick-map-btn { min-height: 54px; border-radius: 8px; font-weight: 700; }

.security-card-inner { background: #fafafa; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; }

/* ===== 卡片底部操作栏 ===== */
/* ✅ FIX-C: 全局操作栏 CSS 已随 DOM 移除 */
.btn-submit-cta { font-weight: 700; border-radius: 8px; background: #f97316 !important; border: none !important; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2); }
.btn-submit-cta:hover { background: #ea580c !important; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(249, 115, 22, 0.3); }

/* ===== Element Plus 品牌橙全局覆盖 ===== */
:deep(.el-tabs__item.is-active) { color: #f97316 !important; font-weight: 900 !important; }
:deep(.el-tabs__item:hover) { color: #fb923c !important; }
:deep(.el-tabs__active-bar) { background-color: #f97316 !important; height: 2.5px !important; }
:deep(.el-tabs__nav-wrap::after) { height: 1px !important; background-color: #e2e8f0 !important; }
:deep(.el-form-item__label) { font-weight: 700 !important; color: #475569 !important; padding-bottom: 6px !important; font-size: 0.85rem !important; }
:deep(.el-input__wrapper.is-focus) { box-shadow: 0 0 0 1px #f97316 inset !important; }

/* ===== 地图弹窗相关 ===== */
.map-search-bar { display: flex; gap: 10px; margin-bottom: 15px; }
.map-search-input-wrap { flex: 1; }
.map-search-btn { padding: 0 20px; background: #f97316; color: #fff; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; transition: 0.2s; }
.map-top-tip { background: #fff7ed; color: #ea580c; padding: 10px 15px; border-radius: 8px; font-size: 0.9rem; font-weight: 600; margin-bottom: 15px; }
.selected-address-bar { background: #f1f5f9; padding: 12px 15px; border-radius: 8px; margin-bottom: 15px; color: #1e293b; font-size: 0.95rem; border-left: 4px solid #f97316; }
.amap-box { width: 100%; height: 380px; border-radius: 12px; overflow: hidden; border: 2px solid #e2e8f0; }
.custom-poi-item { line-height: 1.4; padding: 5px 0; }
.poi-name { font-weight: 700; color: #1e293b; font-size: 0.95rem; }
.poi-address { font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }
:deep(.map-dialog) { border-radius: 20px; overflow: hidden; }
:deep(.map-dialog .el-dialog__header) { background: #f8fafc; font-weight: 900; border-bottom: 1px solid #f1f5f9; padding: 20px 25px; margin: 0; }
:deep(.map-dialog .el-dialog__body) { padding: 25px; }

/* ✅ FIX-6: 移动端外层 padding 补全 */
@media screen and (max-width: 768px) {
  .main-content { padding: 15px; }
  .profile-hero-banner { flex-direction: column; align-items: flex-start; gap: 16px; padding: 18px 16px; }
  .hero-right-stats { width: 100%; justify-content: flex-start; }
  .metric-item { align-items: flex-start; }
  .amap-box { height: 350px !important; }
}
</style>