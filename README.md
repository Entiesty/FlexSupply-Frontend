FlexSupply-Frontend — 社区物资平急两用动态调度平台项目简介FlexSupply 是一款直击城市社区物资网络割裂痛点的“平急两用”调度平台前端系统。平时作为食物银行精准匹配供需，灾时可通过全局指令热切换为应急保供系统。本项目基于 Vue 3 (Composition API) + TypeScript + Vite 构建，深度契合现代单页应用 (SPA) 架构。前端不仅承担了复杂的四角色权限流转（受赠方、商家、骑手、指挥中心），更重点攻克了基于 WebSocket 的高并发消息分发、基于高德地图引擎的 LBS 实时调度大屏，以及动态权重多因子算法（SAW）的可视化调参等核心前端工程难题。技术栈与核心依赖核心领域技术选型备注说明框架底座Vue 3.5.25 + TypeScript 5.9.3严格 <script setup> 模式，保障类型安全构建与路由Vite 7.3.1 + Vue Router 4.6.4路由懒加载与前端 RBAC 权限拦截状态管理Pinia 3.0.4 + Event Bus单一数据源与原生 CustomEvent 结合机制实时通信原生 WebSocket API心跳保活、断线重连、防抖与状态追赶机制地图引擎高德地图 JSAPI 2.0@amap/amap-jsapi-loader，承载千人千面拓扑图UI 与可视化Element Plus + ECharts 6.0响应式组件与全局异常监控大屏核心架构设计与亮点一、 WebSocket 实时通信与状态驱动系统抛弃了传统的轮询机制，采用 WebSocket 单一数据源 + 全局事件总线 构建响应式更新体系：容灾设计：内置 30 秒 PING 心跳保活与 5 秒断线自动重连，重连后主动触发状态追赶机制，确保弱网环境下的数据最终一致性。流量削峰：前端在 refresh-orders 渲染链路中植入 300ms 防抖防护，有效抵御极端突发灾害下的消息洪峰刷屏。P2P 强拦截干预：针对骑手角色设计三级拦截器。在收到紧急指令时，前端结合骑手当前状态（忙碌互斥）与运力硬约束（体积/重量超载拦截）进行前置判断，必要时强制弹窗打断，引导骑手直达救援点。二、 平急两用双轨状态机 (Dual-Mode State Machine)系统在前端深度隔离了两套截然不同的调度 UI 与交互逻辑，实现秒级热切换：常态模式 (NORMAL)：Hub & Spoke 中转拓扑，开启食物银行自提通道，UI 侧重于物资临期展示与驿站库存流转。应急模式 (EMERGENCY)：P2P 直达优先，强阻断自提通道（全部转为强制配送）。自动唤起商家端的应急求助雷达，启动周边定向募捐广播。三、 SAW 智能调度引擎可视化控制台为指挥中心提供了多因子权重（Simple Additive Weighting）的动态调参面板，支持对距离、紧急度、志愿者信誉、物资保质期（FEFO）与驿站库存五大维度进行归一化实时调节。前端内置了 Haversine 公式计算球面距离，作为 LBS 降级与兜底策略：$$a = \sin^2\left(\frac{\Delta lat}{2}\right) + \cos(lat_1) \cdot \cos(lat_2) \cdot \sin^2\left(\frac{\Delta lon}{2}\right)$$$$c = 2 \cdot \text{atan2}(\sqrt{a}, \sqrt{1-a})$$$$d = R \cdot c$$结合漂移保护算法，当用户 GPS 异常或跨区漂移幅度过大时，系统自动触发降级锚点，保障调度大屏不白屏、不崩溃。四、 动态权限控制与 RBAC 模型依托 localStorage 与 Vue Router 路由守卫 beforeEach 钩子，前端实现了细粒度的四角色体系鉴权：Role 1 受赠方：求助矩阵与履约追踪。冻结态下进行 UI 置灰与拦截。Role 2 商家：捐赠工作台、应急雷达与 CSR 社会责任数据看板。Role 3 骑手：抢单大厅、LBS 路径导航与信誉体系。Role 4 指挥中心：全局高德调度大屏、异常预警与动态算法配置。高德地图 LBS 调度大屏实践调度大屏（/map）是本系统的视觉与业务核心。双段路径分层渲染：采用 AMap.Riding 引擎，将单次调度拆分为接驾段（A→B）与履约段（B→C），通过 zIndex 与色彩对比（蓝/绿）直观展示物流干线。脉动标注体系：定制 sos-pulse-marker 与 don-pulse-marker 动效，结合胶囊样式文字标签，实现海量订单在可视区域内的防碰撞与高亮警示。快速开始1. 环境准备确保已安装 Node.js，并在根目录配置 .env.development 环境变量：代码段VITE_AMAP_KEY=你的高德地图_JSAPI_Key
VITE_AMAP_SECURITY_CODE=你的高德地图安全密钥
2. 启动项目Bash# 安装依赖
npm install

# 启动本地 Vite 开发服务器
npm run dev
前端默认运行在 127.0.0.1:5173。注：本项目 HTTP 接口与 WebSocket 服务强依赖于 Java 后端核心服务，请确保后端服务在 localhost:8080 端口正常运行，否则 Axios 全局拦截器将提示网络异常。3. 生产构建Bashnpm run build
npm run preview
目录架构概览Plaintextfood-bank-frontend/
├── src/
│   ├── main.ts                   # 应用入口
│   ├── App.vue                   # 根组件（WebSocket 单例 + 事件总线驱动）
│   ├── router/                   # Vue Router 路由与权限守卫
│   ├── utils/request.js          # Axios 实例与 JWT 拦截器
│   ├── api/                      # 业务接口分层模块 (auth, trade, dispatch 等)
│   └── views/
│       ├── dispatch/index.vue    # 高德地图全局调度大屏
│       ├── sos/                  # 受赠方求助业务线
│       ├── merchant/             # 商家应急响应与捐赠雷达
│       ├── trade/                # 骑手任务大厅
│       ├── volunteer/            # 志愿者信誉中心
│       └── admin/                # 指挥中心控制台 (包含算法配置与监控)
└── vite.config.ts                # 构建配置
