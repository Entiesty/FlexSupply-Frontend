<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot"></span> 千人千面成就系统渲染中
    </div>

    <div class="profile-container" v-loading="loading">

      <div class="hero-section" :class="roleThemeClass">
        <div class="hero-bg-shapes">
          <div class="shape s1"></div>
          <div class="shape s2"></div>
        </div>

        <div class="hero-content">
          <div class="avatar-wrapper" @click="triggerAvatarUpload">
            <img v-if="stats.avatar" :src="stats.avatar" class="avatar-img" />
            <div v-else class="avatar-placeholder">{{ stats.username?.charAt(0) || 'U' }}</div>
            <div class="avatar-mask">
              <span class="camera-icon">📷</span>
            </div>
            <input type="file" ref="avatarInput" hidden @change="handleAvatarChange" accept="image/*" />
          </div>

          <div class="user-intro">
            <h2 class="greeting">你好，{{ stats.username }}</h2>
            <div class="role-badge-glow">{{ roleNameMap[stats.role] }}</div>
          </div>
        </div>

        <div v-if="stats.role === 3" class="dashboard-cards volunteer-board">
          <div class="data-card fitness-card"><div class="card-icon">🏃‍♂️</div><div class="card-info"><p>累计有氧减脂里程</p><h3>{{ stats.runningMileage || '0.00' }} <span>km</span></h3></div></div>
          <div class="data-card"><div class="card-icon">📦</div><div class="card-info"><p>护航履约单数</p><h3>{{ stats.totalDeliveredOrders || 0 }} <span>单</span></h3></div></div>
          <div class="data-card score-card"><div class="card-icon">🏆</div><div class="card-info"><p>城市信誉星级评分</p><h3>{{ stats.creditScore || 100 }} <span>分</span></h3></div></div>
        </div>

        <div v-else-if="stats.role === 2" class="dashboard-cards merchant-board">
          <div class="data-card"><div class="card-icon">💝</div><div class="card-info"><p>累计捐赠物资批次</p><h3>{{ stats.totalDonatedGoods || 0 }} <span>批</span></h3></div></div>
          <div class="data-card heart-card"><div class="card-icon">🌟</div><div class="card-info"><p>累计温暖城市人次</p><h3>{{ stats.totalHelpCount || 0 }} <span>人次</span></h3></div></div>
        </div>

        <div v-else-if="stats.role === 1" class="dashboard-cards recipient-board">
          <div class="data-card"><div class="card-icon">🛡️</div><div class="card-info"><p>专属人群关怀标签</p><h3>{{ formatUserTag(stats.userTag) }}</h3></div></div>
          <div class="data-card"><div class="card-icon">🤝</div><div class="card-info"><p>累计获得援助次数</p><h3>{{ stats.totalReceivedTimes || 0 }} <span>次</span></h3></div></div>
        </div>
      </div>

      <div v-if="stats.role === 3" class="radar-section">
        <div class="radar-header">
          <h3>⚡ 骑手综合能力评估矩阵</h3>
          <p>基于多因子调度引擎底层数据的多维能力画像</p>
        </div>
        <div ref="radarChartRef" class="radar-chart-box"></div>
      </div>

      <div class="settings-grid">
        <div class="setting-card">
          <div class="card-header">
            <h3>📝 基础身份资料</h3>
          </div>
          <div class="card-body">
            <div class="info-row">
              <label>注册手机号 (凭证不可改)</label>
              <input type="text" :value="profile.phone" disabled class="input-disabled" />
            </div>
            <div class="info-row">
              <label>系统展示名称 / 真实姓名</label>
              <input type="text" v-model="profileForm.username" placeholder="请输入您的姓名" class="input-normal" />
            </div>

            <template v-if="stats.role === 3 || stats.role === 2">
              <div class="inner-divider"></div>
              <div class="info-row">
                <label>{{ stats.role === 3 ? '📍 常驻服务辖区 (算法派单基准点)' : '📍 实体商铺位置 (系统上门取货精准坐标)' }}</label>
                <div class="location-picker-box">
                  <div class="loc-display" :class="{'has-val': profileForm.currentLon}">
                    <div class="loc-address">{{ profileForm.addressName || '尚未设置坐标，请点击右侧按钮进行地图选点' }}</div>
                    <div class="loc-coords" v-if="profileForm.currentLon">
                      Lon: {{ profileForm.currentLon }} | Lat: {{ profileForm.currentLat }}
                    </div>
                  </div>
                  <button type="button" class="pick-map-btn" @click="openMapDialog">🗺️ 地图选点</button>
                </div>
              </div>
            </template>

            <button type="button" class="save-btn" @click="handleUpdateProfile">💾 保存基础资料</button>
          </div>
        </div>

        <div class="setting-card alert-card">
          <div class="card-header">
            <h3>🔒 安全密钥设置</h3>
          </div>
          <div class="card-body">
            <div class="info-row"><label>当前使用的旧密码</label><input type="password" v-model="pwdForm.oldPassword" placeholder="请输入原密码" class="input-normal" /></div>
            <div class="info-row"><label>启用新密码</label><input type="password" v-model="pwdForm.newPassword" placeholder="请输入新密码 (至少6位)" class="input-normal" /></div>
            <div class="info-row"><label>二次确认新密码</label><input type="password" v-model="pwdForm.confirmPassword" placeholder="请再次输入新密码" class="input-normal" /></div>
            <button type="button" class="save-btn warning-btn" @click="handleUpdatePassword">🛡️ 确认修改密码</button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="mapVisible" title="定位常驻服务网格" width="750px" @opened="initMap" destroy-on-close custom-class="map-dialog">

      <div class="map-search-bar">
        <el-autocomplete
            v-model="searchKeyword"
            :fetch-suggestions="querySearchAsync"
            placeholder="请输入详细地址 (边打字边出精准提示)"
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

      <div class="map-top-tip" style="margin-top: 10px;">
        <span class="tip-icon">👆</span> 您可以搜索具体地址，也可以在下方地图中直接点击选点
      </div>

      <div class="selected-address-bar" v-if="tempLoc.address">
        <strong>当前选中：</strong> {{ tempLoc.address }}
      </div>

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

const loading = ref(false)
const profile = ref({})
const stats = ref({})

const avatarInput = ref(null)
const radarChartRef = ref(null)
let myRadarChart = null

const roleNameMap = { 1: '👴 重点关怀对象', 2: '🏪 城市爱心合伙人', 3: '🚴 核心护航骑手', 4: '👨‍💻 指挥中心 Root' }
const roleThemeClass = computed(() => {
  const map = { 1: 'theme-recipient', 2: 'theme-merchant', 3: 'theme-volunteer', 4: 'theme-admin' }
  return map[stats.value.role] || 'theme-volunteer'
})

const profileForm = reactive({ username: '', currentLon: '', currentLat: '', addressName: '' })
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

// ================= 高德地图核心逻辑 =================
const mapVisible = ref(false)
let mapInstance = null
let markerInstance = null
let geocoderInstance = null
let autoCompleteInstance = null

const searchKeyword = ref('')
const tempLoc = reactive({ lng: '', lat: '', address: '' })

const openMapDialog = () => {
  tempLoc.lng = profileForm.currentLon
  tempLoc.lat = profileForm.currentLat
  tempLoc.address = profileForm.addressName
  searchKeyword.value = ''
  mapVisible.value = true
}

// 供 Element Plus 调用的异步下拉查询方法
const querySearchAsync = (queryString, cb) => {
  if (!queryString || !autoCompleteInstance) {
    cb([])
    return
  }
  // 底层静默调用高德的搜索 API
  autoCompleteInstance.search(queryString, (status, result) => {
    if (status === 'complete' && result.tips) {
      // 过滤掉那些没有具体经纬度坐标的无效脏数据
      const validTips = result.tips.filter(item => item.location)
      cb(validTips)
    } else {
      cb([])
    }
  })
}

// 处理用户在下拉框中选中某一项的事件
const handleSelectPoi = (poi) => {
  if (poi && poi.location) {
    const addressName = (poi.district || '') + (poi.address || '') + (poi.name || '')
    updateMapByLocation(poi.location.getLng(), poi.location.getLat(), addressName)
    searchKeyword.value = poi.name
    ElMessage.success('已自动定位至选中地点！')
  }
}

// 保留硬搜索能力 (应对用户直接敲击回车或点击搜索按钮)
const handleSearchAddress = () => {
  if (!searchKeyword.value.trim()) return ElMessage.warning('请输入要搜索的地址信息')
  if (!geocoderInstance || !mapInstance) return ElMessage.error('地图组件未完全就绪，请稍后再试')

  geocoderInstance.getLocation(searchKeyword.value, (status, result) => {
    if (status === 'complete' && result.info === 'OK' && result.geocodes.length > 0) {
      const bestMatch = result.geocodes[0]
      updateMapByLocation(bestMatch.location.getLng(), bestMatch.location.getLat(), bestMatch.formattedAddress)
      ElMessage.success('精准定位成功！')
    } else {
      ElMessage.warning('无法在地图上找到该地址，请尝试输入更详细的地址')
    }
  })
}

// 统一的地图状态更新与飞跃方法
const updateMapByLocation = (lng, lat, addressStr) => {
  tempLoc.lng = lng
  tempLoc.lat = lat
  tempLoc.address = addressStr

  mapInstance.setZoomAndCenter(16, [lng, lat], false, 1000)

  if (markerInstance) {
    markerInstance.setPosition([lng, lat])
  } else {
    markerInstance = new AMap.Marker({ position: [lng, lat] })
    mapInstance.add(markerInstance)
  }
}

// 根据经纬度，静默调用高德API反向解析出中文地址
const resolveAddressFromCoords = (lng, lat) => {
  window._AMapSecurityConfig = {
    securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE,
  }
  AMapLoader.load({
    key: import.meta.env.VITE_AMAP_KEY,
    version: "2.0",
    plugins: ['AMap.Geocoder']
  }).then((AMap) => {
    const geocoder = new AMap.Geocoder({ radius: 1000, extensions: "all" })
    geocoder.getAddress([lng, lat], (status, result) => {
      if (status === 'complete' && result.info === 'OK') {
        // 成功解析出中文地址，替换掉那句难看的提示语！
        profileForm.addressName = result.regeocode.formattedAddress
        // 同时把弹窗里的临时变量也同步一下
        tempLoc.address = result.regeocode.formattedAddress
      } else {
        profileForm.addressName = '已绑定卫星坐标 (具体街道解析失败)'
      }
    })
  }).catch(e => {
    console.error('高德逆地理编码引擎静默加载失败', e)
  })
}

const initMap = () => {
  window._AMapSecurityConfig = {
    securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE,
  }

  AMapLoader.load({
    key: import.meta.env.VITE_AMAP_KEY,
    version: "2.0",
    plugins: ['AMap.Geocoder', 'AMap.AutoComplete']
  }).then((AMap) => {
    const centerPoint = (tempLoc.lng && tempLoc.lat)
        ? [tempLoc.lng, tempLoc.lat]
        : [118.833400, 24.980600]

    mapInstance = new AMap.Map("amap-container", {
      viewMode: "2D",
      zoom: 15,
      center: centerPoint
    })

    geocoderInstance = new AMap.Geocoder({ radius: 1000, extensions: "all" })

    // 初始化高德的 AutoComplete (纯数据模式，不绑定 UI)
    autoCompleteInstance = new AMap.AutoComplete({})

    if (tempLoc.lng) {
      markerInstance = new AMap.Marker({ position: centerPoint })
      mapInstance.add(markerInstance)
    }

    mapInstance.on('click', (e) => {
      const lng = e.lnglat.getLng()
      const lat = e.lnglat.getLat()

      geocoderInstance.getAddress([lng, lat], (status, result) => {
        let addr = '该区域暂无详细街道信息'
        if (status === 'complete' && result.info === 'OK') {
          addr = result.regeocode.formattedAddress
        }
        updateMapByLocation(lng, lat, addr)
      })
    })
  }).catch(e => {
    console.error('高德地图加载失败', e)
    ElMessage.error('地图引擎初始化失败，请检查高德Key配置')
  })
}

const confirmLocation = () => {
  profileForm.currentLon = tempLoc.lng
  profileForm.currentLat = tempLoc.lat
  profileForm.addressName = tempLoc.address
  mapVisible.value = false
}
// =================================================

const formatUserTag = (tag) => {
  const map = { 'ELDERLY': '需照顾老人', 'DISABLED': '残障人士', 'SAN_WORKER': '环卫工人', 'NORMAL': '普通求助者' }
  return map[tag] || tag || '普通用户'
}

const fetchAllData = async () => {
  loading.value = true
  try {
    const [profileRes, statsRes] = await Promise.all([ getUserProfile(), getDashboardStats() ])

    profile.value = profileRes.data
    profileForm.username = profileRes.data.username
    profileForm.currentLon = profileRes.data.currentLon || ''
    profileForm.currentLat = profileRes.data.currentLat || ''

    // 只要有坐标，就去翻译它！
    if (profileForm.currentLon && profileForm.currentLat) {
      profileForm.addressName = '正在解析卫星定位...'
      resolveAddressFromCoords(profileForm.currentLon, profileForm.currentLat)
    }

    stats.value = statsRes.data

    if (stats.value.role === 3) {
      nextTick(() => initRadarChart())
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const initRadarChart = () => {
  if (!radarChartRef.value) return
  if (!myRadarChart) myRadarChart = echarts.init(radarChartRef.value)

  const credit = stats.value.creditScore || 100
  const orders = stats.value.totalDeliveredOrders || 0
  const mileage = parseFloat(stats.value.runningMileage || 0)

  const option = {
    color: ['#f97316'],
    tooltip: { trigger: 'item' },
    radar: {
      indicator: [
        { name: '信誉可靠度', max: 150 }, { name: '运力活跃度', max: Math.max(orders + 10, 50) },
        { name: '减脂贡献', max: Math.max(mileage + 10, 50) }, { name: '履约率', max: 100 },
        { name: '高难工单', max: 100 }
      ],
      name: { textStyle: { color: '#475569', fontWeight: 'bold' } }
    },
    series: [{
      type: 'radar',
      data: [{
        value: [credit, orders, mileage, Math.min(credit, 100), Math.min(orders * 5, 95)],
        name: '综合评估',
        areaStyle: { color: 'rgba(249, 115, 22, 0.4)' },
        lineStyle: { width: 2, color: '#ea580c' },
        itemStyle: { color: '#ea580c' }
      }]
    }]
  }
  myRadarChart.setOption(option)
}

const triggerAvatarUpload = () => {
  if (avatarInput.value) avatarInput.value.click()
}

const handleAvatarChange = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  loading.value = true
  try {
    const uploadRes = await uploadFile(file)
    const avatarUrl = uploadRes.data
    await updateAvatar(avatarUrl)
    stats.value.avatar = avatarUrl
    ElMessage.success('头像上传成功！')
  } catch (error) {
    console.error('头像上传失败', error)
  } finally {
    loading.value = false
    e.target.value = ''
  }
}

const handleUpdateProfile = async () => {
  if (!profileForm.username.trim()) return ElMessage.warning('姓名不能为空')
  const payload = { username: profileForm.username }

  // 🚨 核心修复 2：保存提交时，同时兼容商家和骑手
  if (stats.value.role === 3 || stats.value.role === 2) {
    if (!profileForm.currentLon) return ElMessage.warning('请通过地图设置您的精准坐标')
    payload.currentLon = parseFloat(profileForm.currentLon)
    payload.currentLat = parseFloat(profileForm.currentLat)
  }

  try {
    await updateUserProfile(payload)
    ElMessage.success('基础资料与坐标信息更新成功！')
    localStorage.setItem('username', profileForm.username)
    stats.value.username = profileForm.username
  } catch (e) { console.error(e) }
}

const handleUpdatePassword = async () => {
  if (!pwdForm.oldPassword || !pwdForm.newPassword) return ElMessage.warning('密码填写不完整')
  if (pwdForm.newPassword !== pwdForm.confirmPassword) return ElMessage.warning('两次新密码不一致')
  try {
    await updatePassword({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword })
    ElMessage.success('密码修改成功！')
    pwdForm.oldPassword = ''; pwdForm.newPassword = ''; pwdForm.confirmPassword = '';
  } catch (e) { console.error(e) }
}

onMounted(() => {
  fetchAllData()
  window.addEventListener('resize', () => { if (myRadarChart) myRadarChart.resize() })
})
</script>

<style scoped>
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; padding: 40px; background: #f1f5f9; overflow-y: auto; height: 100vh; box-sizing: border-box; }
.top-status { position: absolute; top: 20px; right: 30px; z-index: 100; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); }
.pulse-dot { width: 8px; height: 8px; background: #8b5cf6; border-radius: 50%; box-shadow: 0 0 8px #8b5cf6; animation: pulse-purple 2s infinite; }
@keyframes pulse-purple { 0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(139, 92, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); } }

.profile-container { max-width: 900px; width: 100%; margin: 0 auto; padding-bottom: 50px; }
.hero-section { position: relative; border-radius: 28px; padding: 40px; color: #fff; overflow: hidden; margin-bottom: 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); transition: all 0.5s ease; }
.theme-volunteer { background: linear-gradient(135deg, #f97316, #ea580c); }
.theme-merchant { background: linear-gradient(135deg, #10b981, #059669); }
.theme-recipient { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.theme-admin { background: linear-gradient(135deg, #1e293b, #0f172a); }

.hero-bg-shapes .shape { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.1); filter: blur(40px); }
.hero-bg-shapes .s1 { width: 300px; height: 300px; top: -100px; right: -50px; }
.hero-bg-shapes .s2 { width: 200px; height: 200px; bottom: -50px; left: 10%; }

.hero-content { position: relative; z-index: 10; display: flex; align-items: center; gap: 30px; margin-bottom: 35px; }
.avatar-wrapper { position: relative; width: 100px; height: 100px; border-radius: 50%; border: 4px solid rgba(255,255,255,0.3); cursor: pointer; overflow: hidden; background: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); transition: 0.3s; flex-shrink: 0; }
.avatar-wrapper:hover { border-color: #fff; transform: scale(1.05); }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder { font-size: 3rem; font-weight: 900; color: #94a3b8; }
.avatar-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.3s; }
.avatar-wrapper:hover .avatar-mask { opacity: 1; }
.camera-icon { font-size: 1.5rem; }

.user-intro .greeting { margin: 0 0 10px 0; font-size: 2.2rem; font-weight: 900; letter-spacing: 1px; }
.role-badge-glow { display: inline-block; padding: 6px 16px; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border-radius: 20px; font-weight: bold; font-size: 0.95rem; border: 1px solid rgba(255,255,255,0.4); }

.dashboard-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; position: relative; z-index: 10; }
.data-card { background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; padding: 20px; display: flex; align-items: center; gap: 15px; transition: 0.3s; }
.data-card:hover { background: rgba(255,255,255,0.25); transform: translateY(-5px); }
.card-icon { font-size: 2.2rem; background: rgba(255,255,255,0.2); width: 55px; height: 55px; display: flex; align-items: center; justify-content: center; border-radius: 16px; }
.card-info p { margin: 0 0 5px 0; font-size: 0.85rem; opacity: 0.9; font-weight: bold; }
.card-info h3 { margin: 0; font-size: 1.8rem; font-weight: 900; }
.card-info h3 span { font-size: 1rem; opacity: 0.8; font-weight: normal; }

.radar-section { background: #fff; border-radius: 28px; padding: 30px; margin-bottom: 30px; box-shadow: 0 15px 35px rgba(0,0,0,0.04); border: 1px solid #fff; }
.radar-header h3 { margin: 0 0 5px 0; color: #1e293b; font-size: 1.4rem; font-weight: 900; }
.radar-header p { margin: 0; color: #64748b; font-size: 0.95rem; }
.radar-chart-box { width: 100%; height: 350px; margin-top: 10px; }

.settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
@media (max-width: 768px) { .settings-grid { grid-template-columns: 1fr; } }

.setting-card { background: #fff; border-radius: 24px; padding: 30px; box-shadow: 0 15px 35px rgba(0,0,0,0.04); border: 1px solid #fff; display: flex; flex-direction: column; }
.card-header h3 { margin: 0 0 20px 0; color: #334155; font-size: 1.2rem; font-weight: 800; border-bottom: 2px dashed #f1f5f9; padding-bottom: 15px; }

.info-row { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
.info-row label { font-size: 0.85rem; color: #64748b; font-weight: bold; }

.input-normal, .input-disabled { width: 100%; box-sizing: border-box; padding: 14px 18px; border-radius: 14px; border: 2px solid #e2e8f0; font-size: 1rem; transition: all 0.3s; outline: none; background: #f8fafc; color: #1e293b; }
.input-normal:focus { background: #fff; border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
.input-disabled { color: #94a3b8; cursor: not-allowed; opacity: 0.7; }

.save-btn { margin-top: auto; width: 100%; padding: 16px; border: none; border-radius: 14px; background: #1e293b; color: white; font-weight: 900; font-size: 1.05rem; cursor: pointer; transition: all 0.3s; box-shadow: 0 8px 20px rgba(30, 41, 59, 0.2); }
.save-btn:hover { transform: translateY(-3px); box-shadow: 0 12px 25px rgba(30, 41, 59, 0.3); }
.warning-btn { background: #fff; color: #ef4444; border: 2px solid #ef4444; box-shadow: none; }
.warning-btn:hover { background: #ef4444; color: #fff; box-shadow: 0 10px 25px rgba(239, 68, 68, 0.25); border-color: transparent; }

/* ================= 地图 UI 新增样式 ================= */
.inner-divider { height: 1px; background: #e2e8f0; margin: 10px 0 25px 0; }
.location-picker-box { display: flex; align-items: stretch; gap: 15px; margin-top: 5px; }
.loc-display { flex: 1; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; padding: 12px 18px; display: flex; flex-direction: column; justify-content: center; transition: 0.3s;}
.loc-display.has-val { background: #f0fdf4; border: 2px solid #86efac; border-style: solid;}
.loc-address { font-size: 0.95rem; color: #64748b; font-weight: bold; }
.loc-display.has-val .loc-address { color: #166534; font-size: 1rem;}
.loc-coords { font-family: monospace; font-size: 0.8rem; color: #10b981; margin-top: 4px; font-weight: bold;}

.pick-map-btn { background: #fff; border: 2px solid #3b82f6; color: #3b82f6; font-weight: 900; border-radius: 14px; padding: 0 20px; cursor: pointer; transition: 0.2s; white-space: nowrap; box-shadow: 0 4px 10px rgba(59,130,246,0.1); }
.pick-map-btn:hover { background: #3b82f6; color: #fff; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(59,130,246,0.25);}

/* 👇 搜索栏定制化样式 */
.map-search-bar { display: flex; gap: 10px; margin-bottom: 15px; }
.map-search-input-wrap { flex: 1; }
:deep(.map-search-input-wrap .el-input__wrapper) { border-radius: 10px; box-shadow: 0 0 0 2px #e2e8f0 inset; padding: 4px 15px; }
:deep(.map-search-input-wrap .el-input__wrapper.is-focus) { box-shadow: 0 0 0 2px #3b82f6 inset !important; }

.map-search-btn { padding: 0 20px; background: #3b82f6; color: #fff; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; transition: 0.2s;}
.map-search-btn:hover { background: #2563eb; }

.map-top-tip { background: #fff7ed; color: #ea580c; padding: 10px 15px; border-radius: 8px; font-size: 0.9rem; font-weight: bold; margin-bottom: 15px; }
.selected-address-bar { background: #f1f5f9; padding: 12px 15px; border-radius: 8px; margin-bottom: 15px; color: #1e293b; font-size: 0.95rem; border-left: 4px solid #3b82f6;}
.amap-box { width: 100%; height: 380px; border-radius: 12px; overflow: hidden; border: 2px solid #e2e8f0; }

/* 自定义下拉联想列表的质感 UI */
.custom-poi-item { line-height: 1.4; padding: 5px 0; }
.poi-name { font-weight: bold; color: #1e293b; font-size: 0.95rem; text-overflow: ellipsis; overflow: hidden; }
.poi-address { font-size: 0.75rem; color: #94a3b8; text-overflow: ellipsis; overflow: hidden; margin-top: 2px; }

:deep(.map-dialog) { border-radius: 20px; overflow: hidden; }
:deep(.map-dialog .el-dialog__header) { background: #f8fafc; font-weight: 900; border-bottom: 1px solid #f1f5f9; padding: 20px 25px; margin: 0;}
:deep(.map-dialog .el-dialog__body) { padding: 25px; }
</style>