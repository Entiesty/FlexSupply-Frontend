<template>
  <main class="main-content">
    <div class="top-status"><span class="pulse-dot"></span> 千人千面成就系统渲染中</div>

    <div class="profile-container" v-loading="loading">
      <div class="hero-section" :class="roleThemeClass">
        <div class="hero-bg-shapes"><div class="shape s1"></div><div class="shape s2"></div></div>
        <div class="hero-content">
          <div class="avatar-wrapper" @click="triggerAvatarUpload">
            <img v-if="stats.avatar" :src="stats.avatar" class="avatar-img" />
            <div v-else class="avatar-placeholder">{{ stats.username?.charAt(0) || 'U' }}</div>
            <div class="avatar-mask"><span class="camera-icon">📷</span></div>
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
        <div class="radar-header"><h3>⚡ 骑手综合能力评估矩阵</h3><p>基于多因子调度引擎底层数据的多维能力画像</p></div>
        <div ref="radarChartRef" class="radar-chart-box"></div>
      </div>

      <div class="settings-grid">
        <div class="setting-card">
          <div class="card-header"><h3>📝 基础身份资料</h3></div>
          <div class="card-body">
            <div class="info-row"><label>注册手机号 (凭证不可改)</label><input type="text" :value="profile.phone" disabled class="input-disabled" /></div>
            <div class="info-row"><label>系统展示名称 / 真实姓名</label><input type="text" v-model="profileForm.username" class="input-normal" /></div>

            <template v-if="[1, 2, 3].includes(stats.role)">
              <div class="inner-divider"></div>
              <div class="info-row">
                <label>{{ stats.role === 3 ? '📍 常驻服务辖区' : (stats.role === 2 ? '📍 实体商铺位置' : '📍 家庭住址') }}</label>
                <div class="location-picker-box">
                  <div class="loc-display" :class="{'has-val': profileForm.currentLon}">
                    <div class="loc-address">{{ profileForm.addressName || '尚未设置坐标' }}</div>
                    <div class="loc-coords" v-if="profileForm.currentLon">Lon: {{ profileForm.currentLon }} | Lat: {{ profileForm.currentLat }}</div>
                  </div>
                  <button type="button" class="pick-map-btn" @click="openMapDialog">🗺️ 地图选点</button>
                </div>
              </div>
            </template>

            <template v-if="stats.role === 3">
              <div class="info-row" style="margin-top: 15px;">
                <label>🛵 您的主力交通工具 (决定系统派单范围与重量限制)</label>
                <select v-model="profileForm.vehicleType" class="input-normal" style="cursor: pointer; background: #fff7ed; border-color: #fdba74; color: #ea580c; font-weight: bold;">
                  <option :value="1">🚶 步行 / 跑步 (适合同小区互助 &lt;2km)</option>
                  <option :value="2">🚴 共享单车 / 自行车 (适合周边代买 &lt;5km)</option>
                  <option :value="3">🛵 电动自行车 (适合跨区与偏重物资)</option>
                  <option :value="4">🚗 汽车 / 小货车 (适合大仓调拨与极重物资)</option>
                </select>
              </div>
            </template>

            <template v-if="stats.role === 1">
              <div class="info-row"><label>🏠 详细门牌号 (精确到室)</label><input type="text" v-model="profileForm.doorNumber" class="input-normal" /></div>
              <div class="info-row"><label>☎️ 紧急联系人电话</label><input type="text" v-model="profileForm.emergencyPhone" class="input-normal" /></div>
              <div class="info-row"><label>❤️ 健康与送达备注</label><input type="text" v-model="profileForm.healthRemark" class="input-normal" /></div>
            </template>

            <button type="button" class="save-btn" @click="handleUpdateProfile">💾 保存基础资料</button>
          </div>
        </div>

        <div class="setting-card auth-card">
          <div class="card-header"><h3>📜 平台入驻资质认证</h3></div>
          <div class="card-body">
            <div class="auth-status-box" :class="stats.isVerified === 1 ? 'status-pass' : 'status-pending'">
              <div class="auth-icon">{{ stats.isVerified === 1 ? '✅' : '⏳' }}</div>
              <div class="auth-text">
                <h4>{{ stats.isVerified === 1 ? '资质已核验通过' : '平台审核中 / 未提交' }}</h4>
                <p>{{ stats.isVerified === 1 ? '您已获得完整调度权限' : '请上传凭证，指挥中心将尽快办理' }}</p>
              </div>
            </div>
            <div class="info-row">
              <label>上传凭证照片</label>
              <div class="proof-upload-area" @click="triggerProofUpload">
                <img v-if="profileForm.identityProofUrl" :src="profileForm.identityProofUrl" class="proof-img" />
                <div v-else class="upload-placeholder"><span class="upload-icon">📄</span><span>点击拍摄或上传</span></div>
                <input type="file" ref="proofInput" hidden @change="handleProofChange" accept="image/*" />
              </div>
            </div>
            <button type="button" class="save-btn auth-btn" @click="handleUpdateProfile" :disabled="stats.isVerified === 1">
              {{ stats.isVerified === 1 ? '已通过，无需修改' : '🚀 提交审核' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="mapVisible" title="定位常驻服务网格" width="750px" @opened="initMap" destroy-on-close custom-class="map-dialog">
      <div class="map-search-bar">
        <el-autocomplete v-model="searchKeyword" :fetch-suggestions="querySearchAsync" placeholder="请输入详细地址" @select="handleSelectPoi" class="map-search-input-wrap" value-key="name" :trigger-on-focus="false" clearable @keyup.enter="handleSearchAddress">
          <template #default="{ item }"><div class="custom-poi-item"><div class="poi-name">{{ item.name }}</div><div class="poi-address">{{ item.district }}{{ item.address }}</div></div></template>
        </el-autocomplete>
        <button class="map-search-btn" @click="handleSearchAddress">🔍 搜索定位</button>
      </div>
      <div class="selected-address-bar" v-if="tempLoc.address"><strong>当前选中：</strong> {{ tempLoc.address }}</div>
      <div id="amap-container" class="amap-box"></div>
      <template #footer>
        <span class="dialog-footer"><el-button @click="mapVisible = false" round>取消</el-button><el-button type="primary" @click="confirmLocation" :disabled="!tempLoc.lng" round>确认该位置</el-button></span>
      </template>
    </el-dialog>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import AMapLoader from '@amap/amap-jsapi-loader'
import { getUserProfile, updateUserProfile, getDashboardStats, updateAvatar } from '@/api/user'
import { uploadFile } from '@/api/common'

const loading = ref(false)
const profile = ref({})
const stats = ref({})

const avatarInput = ref(null)
const proofInput = ref(null)
const radarChartRef = ref(null)
let myRadarChart = null

const roleNameMap = { 1: '👴 重点关怀对象', 2: '🏪 城市爱心合伙人', 3: '🚴 核心护航骑手', 4: '👨‍💻 指挥中心 Root' }
const roleThemeClass = computed(() => {
  const map = { 1: 'theme-recipient', 2: 'theme-merchant', 3: 'theme-volunteer', 4: 'theme-admin' }
  return map[stats.value.role] || 'theme-volunteer'
})

// 🚨 增加 vehicleType 初始值
const profileForm = reactive({
  username: '', currentLon: '', currentLat: '', addressName: '',
  doorNumber: '', emergencyPhone: '', healthRemark: '',
  identityProofUrl: '', vehicleType: 1
})
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

const mapVisible = ref(false)
let mapInstance = null, markerInstance = null, geocoderInstance = null, autoCompleteInstance = null
const searchKeyword = ref('')
const tempLoc = reactive({ lng: '', lat: '', address: '' })

const openMapDialog = () => { tempLoc.lng = profileForm.currentLon; tempLoc.lat = profileForm.currentLat; tempLoc.address = profileForm.addressName; searchKeyword.value = ''; mapVisible.value = true }
const querySearchAsync = (q, cb) => { if(!q||!autoCompleteInstance){cb([]);return} autoCompleteInstance.search(q, (status, res) => { cb(status==='complete'&&res.tips?res.tips.filter(i=>i.location):[]) }) }
const handleSelectPoi = (poi) => { if(poi&&poi.location){ updateMapByLocation(poi.location.getLng(), poi.location.getLat(), (poi.district||'')+(poi.address||'')+(poi.name||'')); searchKeyword.value=poi.name; ElMessage.success('已定位') } }
const handleSearchAddress = () => { if(!searchKeyword.value.trim())return ElMessage.warning('请输入'); geocoderInstance.getLocation(searchKeyword.value, (s, r)=>{ if(s==='complete'&&r.info==='OK'&&r.geocodes.length>0){ const b=r.geocodes[0]; updateMapByLocation(b.location.getLng(),b.location.getLat(),b.formattedAddress); ElMessage.success('定位成功')} }) }
const updateMapByLocation = (lng, lat, addr) => { tempLoc.lng=lng; tempLoc.lat=lat; tempLoc.address=addr; mapInstance.setZoomAndCenter(16, [lng,lat], false, 1000); if(markerInstance) markerInstance.setPosition([lng,lat]); else { markerInstance=new AMap.Marker({position:[lng,lat]}); mapInstance.add(markerInstance); } }
const resolveAddressFromCoords = (lng, lat) => { window._AMapSecurityConfig = { securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE }; AMapLoader.load({ key: import.meta.env.VITE_AMAP_KEY, version: "2.0", plugins: ['AMap.Geocoder'] }).then((AMap) => { new AMap.Geocoder({radius:1000,extensions:"all"}).getAddress([lng, lat], (s, r) => { profileForm.addressName = s==='complete'&&r.info==='OK' ? r.regeocode.formattedAddress : '已绑定坐标' }) }) }
const initMap = () => { window._AMapSecurityConfig = { securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE }; AMapLoader.load({ key: import.meta.env.VITE_AMAP_KEY, version: "2.0", plugins: ['AMap.Geocoder','AMap.AutoComplete','AMap.Geolocation'] }).then((AMap) => { const hasSaved = tempLoc.lng&&tempLoc.lat; mapInstance = new AMap.Map("amap-container", {viewMode:"2D",zoom:15,center:hasSaved?[tempLoc.lng,tempLoc.lat]:[118.8334,24.9806]}); geocoderInstance = new AMap.Geocoder({radius:1000,extensions:"all"}); autoCompleteInstance = new AMap.AutoComplete({}); if(hasSaved){ markerInstance = new AMap.Marker({position:[tempLoc.lng,tempLoc.lat]}); mapInstance.add(markerInstance); } else { const geolocation = new AMap.Geolocation({enableHighAccuracy:true,timeout:5000,buttonPosition:'RB',buttonOffset:new AMap.Pixel(10,20),zoomToAccuracy:true}); mapInstance.addControl(geolocation); geolocation.getCurrentPosition((s,r)=>{ if(s==='complete'){ ElMessage.success('📍 吸附当前位置'); geocoderInstance.getAddress([r.position.lng,r.position.lat], (gs,gr)=>{ updateMapByLocation(r.position.lng,r.position.lat, gs==='complete'?gr.regeocode.formattedAddress:'坐标'); }) } }); } mapInstance.on('click', (e)=>{ geocoderInstance.getAddress([e.lnglat.getLng(),e.lnglat.getLat()], (s,r)=>{ updateMapByLocation(e.lnglat.getLng(),e.lnglat.getLat(), s==='complete'?r.regeocode.formattedAddress:'未知区域'); }) }) }) }
const confirmLocation = () => { profileForm.currentLon=tempLoc.lng; profileForm.currentLat=tempLoc.lat; profileForm.addressName=tempLoc.address; mapVisible.value=false }

const formatUserTag = (tag) => { const m = {'ELDERLY':'需照顾老人','DISABLED':'残障人士','SAN_WORKER':'环卫工人','NORMAL':'普通求助者'}; return m[tag] || tag || '普通用户' }

const fetchAllData = async () => {
  loading.value = true
  try {
    const [profileRes, statsRes] = await Promise.all([ getUserProfile(), getDashboardStats() ])
    profile.value = profileRes.data
    profileForm.username = profileRes.data.username
    profileForm.currentLon = profileRes.data.currentLon || ''
    profileForm.currentLat = profileRes.data.currentLat || ''
    profileForm.doorNumber = profileRes.data.doorNumber || ''
    profileForm.emergencyPhone = profileRes.data.emergencyPhone || ''
    profileForm.healthRemark = profileRes.data.healthRemark || ''
    profileForm.identityProofUrl = profileRes.data.identityProofUrl || ''
    // 🚨 回显载具类型，后端如果没有返回默认 1
    profileForm.vehicleType = profileRes.data.vehicleType || 1

    if (profileForm.currentLon) { profileForm.addressName = '正在解析卫星定位...'; resolveAddressFromCoords(profileForm.currentLon, profileForm.currentLat) }
    stats.value = statsRes.data
    if (stats.value.role === 3) nextTick(() => initRadarChart())
  } catch (e) { } finally { loading.value = false }
}

const initRadarChart = () => { if (!radarChartRef.value) return; if (!myRadarChart) myRadarChart = echarts.init(radarChartRef.value); const credit=stats.value.creditScore||100; const orders=stats.value.totalDeliveredOrders||0; const mileage=parseFloat(stats.value.runningMileage||0); myRadarChart.setOption({ color: ['#f97316'], tooltip: {trigger:'item'}, radar: { indicator: [{name:'信誉可靠度',max:150}, {name:'运力活跃度',max:Math.max(orders+10,50)}, {name:'减脂贡献',max:Math.max(mileage+10,50)}, {name:'履约率',max:100}, {name:'高难工单',max:100}], name: {textStyle:{color:'#475569',fontWeight:'bold'}} }, series: [{ type: 'radar', data: [{ value: [credit,orders,mileage,Math.min(credit,100),Math.min(orders*5,95)], name: '综合评估', areaStyle: {color:'rgba(249, 115, 22, 0.4)'}, lineStyle: {width:2,color:'#ea580c'}, itemStyle: {color:'#ea580c'} }] }] }) }

const triggerAvatarUpload = () => { if(avatarInput.value) avatarInput.value.click() }
const handleAvatarChange = async(e) => { const f=e.target.files[0]; if(!f)return; loading.value=true; try{ const r=await uploadFile(f); await updateAvatar(r.data); stats.value.avatar=r.data; ElMessage.success('头像上传成功') }catch(e){}finally{loading.value=false;e.target.value=''} }

const triggerProofUpload = () => { if(stats.value.isVerified===1) return ElMessage.info('资质已审核通过'); if(proofInput.value) proofInput.value.click() }
const handleProofChange = async(e) => { const f=e.target.files[0]; if(!f)return; loading.value=true; try{ const r=await uploadFile(f); profileForm.identityProofUrl=r.data; ElMessage.success('凭证上传成功') }catch(e){}finally{loading.value=false;e.target.value=''} }

const handleUpdateProfile = async () => {
  if (!profileForm.username.trim()) return ElMessage.warning('姓名不能为空')

  const payload = {
    username: profileForm.username,
    identityProofUrl: profileForm.identityProofUrl,
    vehicleType: profileForm.vehicleType // 🚨 提交时带上载具
  }

  if ([1, 2, 3].includes(stats.value.role)) {
    if (!profileForm.currentLon) return ElMessage.warning('请定位坐标')
    payload.currentLon = parseFloat(profileForm.currentLon)
    payload.currentLat = parseFloat(profileForm.currentLat)
  }

  if (stats.value.role === 1) {
    if (!profileForm.doorNumber) return ElMessage.warning('门牌号必填')
    payload.doorNumber = profileForm.doorNumber; payload.emergencyPhone = profileForm.emergencyPhone; payload.healthRemark = profileForm.healthRemark
  }

  try {
    await updateUserProfile(payload)
    ElMessage.success('资料信息更新成功！')
    localStorage.setItem('username', profileForm.username)
    stats.value.username = profileForm.username
    fetchAllData()
  } catch (e) { }
}

onMounted(() => { fetchAllData(); window.addEventListener('resize', () => { if(myRadarChart) myRadarChart.resize() }) })
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

.inner-divider { height: 1px; background: #e2e8f0; margin: 10px 0 25px 0; }
.location-picker-box { display: flex; align-items: stretch; gap: 15px; margin-top: 5px; }
.loc-display { flex: 1; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; padding: 12px 18px; display: flex; flex-direction: column; justify-content: center; transition: 0.3s;}
.loc-display.has-val { background: #f0fdf4; border: 2px solid #86efac; border-style: solid;}
.loc-address { font-size: 0.95rem; color: #64748b; font-weight: bold; }
.loc-display.has-val .loc-address { color: #166534; font-size: 1rem;}
.loc-coords { font-family: monospace; font-size: 0.8rem; color: #10b981; margin-top: 4px; font-weight: bold;}

.pick-map-btn { background: #fff; border: 2px solid #3b82f6; color: #3b82f6; font-weight: 900; border-radius: 14px; padding: 0 20px; cursor: pointer; transition: 0.2s; white-space: nowrap; box-shadow: 0 4px 10px rgba(59,130,246,0.1); }
.pick-map-btn:hover { background: #3b82f6; color: #fff; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(59,130,246,0.25);}

.map-search-bar { display: flex; gap: 10px; margin-bottom: 15px; }
.map-search-input-wrap { flex: 1; }
:deep(.map-search-input-wrap .el-input__wrapper) { border-radius: 10px; box-shadow: 0 0 0 2px #e2e8f0 inset; padding: 4px 15px; }
:deep(.map-search-input-wrap .el-input__wrapper.is-focus) { box-shadow: 0 0 0 2px #3b82f6 inset !important; }

.map-search-btn { padding: 0 20px; background: #3b82f6; color: #fff; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; transition: 0.2s;}
.map-search-btn:hover { background: #2563eb; }

.map-top-tip { background: #fff7ed; color: #ea580c; padding: 10px 15px; border-radius: 8px; font-size: 0.9rem; font-weight: bold; margin-bottom: 15px; }
.selected-address-bar { background: #f1f5f9; padding: 12px 15px; border-radius: 8px; margin-bottom: 15px; color: #1e293b; font-size: 0.95rem; border-left: 4px solid #3b82f6;}
.amap-box { width: 100%; height: 380px; border-radius: 12px; overflow: hidden; border: 2px solid #e2e8f0; }

.custom-poi-item { line-height: 1.4; padding: 5px 0; }
.poi-name { font-weight: bold; color: #1e293b; font-size: 0.95rem; text-overflow: ellipsis; overflow: hidden; }
.poi-address { font-size: 0.75rem; color: #94a3b8; text-overflow: ellipsis; overflow: hidden; margin-top: 2px; }

:deep(.map-dialog) { border-radius: 20px; overflow: hidden; }
:deep(.map-dialog .el-dialog__header) { background: #f8fafc; font-weight: 900; border-bottom: 1px solid #f1f5f9; padding: 20px 25px; margin: 0;}
:deep(.map-dialog .el-dialog__body) { padding: 25px; }

.auth-card { border: 2px dashed #cbd5e1; background: #f8fafc; }
.auth-status-box { display: flex; align-items: center; gap: 15px; padding: 18px; border-radius: 16px; margin-bottom: 25px; }
.status-pending { background: #fff7ed; border: 1px solid #fdba74; }
.status-pending .auth-icon { background: #ffedd5; text-shadow: 0 2px 4px rgba(249, 115, 22, 0.3); }
.status-pending h4 { color: #ea580c; }
.status-pass { background: #ecfdf5; border: 1px solid #6ee7b7; }
.status-pass .auth-icon { background: #d1fae5; text-shadow: 0 2px 4px rgba(16, 185, 129, 0.3); }
.status-pass h4 { color: #059669; }

.auth-icon { font-size: 2rem; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.auth-text h4 { margin: 0 0 5px 0; font-size: 1.1rem; font-weight: 900; }
.auth-text p { margin: 0; font-size: 0.85rem; color: #64748b; font-weight: bold; line-height: 1.4; }

.proof-upload-area { border: 2px dashed #cbd5e1; border-radius: 16px; height: 160px; display: flex; align-items: center; justify-content: center; background: #fff; cursor: pointer; overflow: hidden; transition: 0.3s; position: relative; }
.proof-upload-area:hover { border-color: #3b82f6; background: #eff6ff; }
.proof-img { width: 100%; height: 100%; object-fit: contain; background: #f1f5f9; }
.upload-placeholder { display: flex; flex-direction: column; align-items: center; color: #94a3b8; font-weight: bold; }
.upload-icon { font-size: 2.5rem; margin-bottom: 10px; opacity: 0.8; }
.auth-btn:disabled { background: #cbd5e1; cursor: not-allowed; box-shadow: none; color: #fff; }
</style>