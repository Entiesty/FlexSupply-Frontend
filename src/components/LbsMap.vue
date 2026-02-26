<template>
  <div class="map-container">
    <div id="amap-container" class="amap-wrapper"></div>

    <el-drawer
        v-model="drawerVisible"
        :title="selectedStation?.stationName || '站点详情'"
        direction="rtl"
        size="30%"
    >
      <div v-if="selectedStation" class="station-details">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="核心枢纽状态">
            <el-tag :type="selectedStation.isEmergencyHub === 1 ? 'danger' : 'success'">
              {{ selectedStation.isEmergencyHub === 1 ? '急时核心枢纽' : '常态化补给站' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="详细地址">
            {{ selectedStation.address }}
          </el-descriptions-item>
          <el-descriptions-item label="经度">
            {{ selectedStation.longitude }}
          </el-descriptions-item>
          <el-descriptions-item label="纬度">
            {{ selectedStation.latitude }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="action-bar">
          <el-button type="primary" @click="handleDispatch">发起调度指令</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef } from 'vue';
import AMapLoader from '@amap/amap-jsapi-loader';
import { ElMessage } from 'element-plus';

// --- 1. 数据模型定义 (对应 init_schema.sql 中的 fb_station 表) ---
interface Station {
  stationId: number;
  stationName: string;
  address: string;
  longitude: number;
  latitude: number;
  managerId?: number;
  isEmergencyHub: number;
}

// --- 2. 响应式状态 ---
const map = shallowRef<any>(null); // 使用 shallowRef 避免 Vue 代理整个地图对象造成性能问题
const drawerVisible = ref(false);
const selectedStation = ref<Station | null>(null);

// 模拟从后端获取的据点数据 (后续替换为 Axios 请求)
const mockStations: Station[] = [
  {
    stationId: 1,
    stationName: "阳光社区爱心驿站",
    address: "阳光大道128号附1号",
    longitude: 118.089425, // 模拟福建地区经纬度
    latitude: 24.479833,
    isEmergencyHub: 0
  },
  {
    stationId: 2,
    建设Name: "高新科技园核心调度中心",
    address: "软件园三期A区",
    longitude: 118.040432,
    latitude: 24.613941,
    isEmergencyHub: 1
  }
];

// --- 3. 核心方法 ---
const initMap = async () => {
  try {
    const AMap = await AMapLoader.load({
      key: import.meta.env.VITE_AMAP_KEY,
      version: '2.0',
      plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.Marker'], // 按需加载插件
    });

    map.value = new AMap.Map('amap-container', {
      viewMode: '3D',       // 开启 3D 视角
      zoom: 12,             // 初始缩放级别
      pitch: 45,            // 俯仰角
      center: [118.089425, 24.479833], // 初始化中心点
    });

    // 添加地图控件
    map.value.addControl(new AMap.Scale());
    map.value.addControl(new AMap.ToolBar());

    // 渲染站点标记
    renderMarkers(AMap);

  } catch (error) {
    console.error('地图加载失败:', error);
    ElMessage.error('地图组件加载失败，请检查网络或密钥配置');
  }
};

const renderMarkers = (AMap: any) => {
  mockStations.forEach(station => {
    // 区分核心枢纽和普通站点的图标颜色
    const markerColor = station.isEmergencyHub === 1 ? 'red' : 'blue';

    const marker = new AMap.Marker({
      position: new AMap.LngLat(station.longitude, station.latitude),
      title: station.stationName,
      icon: `https://webapi.amap.com/theme/v1.3/markers/n/mark_${markerColor}.png`
    });

    // 绑定点击事件，唤出侧边栏
    marker.on('click', () => {
      selectedStation.value = station;
      drawerVisible.value = true;
    });

    map.value.add(marker);
  });
};

const handleDispatch = () => {
  ElMessage.success(`准备对【${selectedStation.value?.stationName}】发起调度`);
  // 这里后续对接你的多因子加权决策算法 API
};

// --- 4. 生命周期 ---
onMounted(() => {
  initMap();
});

onUnmounted(() => {
  if (map.value) {
    map.value.destroy(); // 销毁地图，释放内存
  }
});
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100vh; /* 满屏显示 */
}

.amap-wrapper {
  width: 100%;
  height: 100%;
}

.station-details {
  padding: 20px 0;
}

.action-bar {
  margin-top: 30px;
  text-align: center;
}
</style>