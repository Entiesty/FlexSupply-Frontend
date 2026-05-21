# 核心行为准则 (Karpathy Guidelines)

1. 编码前思考：不要假设。不要隐藏困惑。如果不确定，先提问；呈现多种解释；适时提出异议。
2. 简洁优先：用最少的代码解决问题。不要过度推测；不要添加要求之外的功能；禁止为一次性代码创建抽象。
3. 精准修改：只改必须改的地方，只清理自己造成的混乱。严禁顺手“改进”相邻代码、严禁重构没坏的模块；保持现有代码风格。
4. 目标驱动执行：定义成功标准，循环验证直到达成。将指令式任务转化为可验证的目标。

# 基础设施与框架限制 (Project Context & Stack)

* 核心技术栈: Vue 3.5.25 (严格使用 Composition API 和 `<script setup>`) + TypeScript 5.9.3
* 构建工具: Vite 7.3.1
* 状态管理与路由: Pinia 3.0.4 + Vue Router 4.6.4
* UI 组件库: Element Plus 2.13.2 (所有新页面的表单、弹窗等 UI 元素，必须优先调用 el- 组件，禁止手搓原生标签)
* 地图与可视化: 高德地图 JSAPI (`@amap/amap-jsapi-loader`) + ECharts 6.0

# Frontend 编码规范 (绝对铁律)

## 1. 组件与状态管理模式
* Setup 语法糖: 强制使用 `<script setup>` 语法。
* 响应式定义: 一般基础变量必须使用 `ref()` 定义；表单对象或结构化数据模型才使用 `reactive()`。

## 2. API 请求与网络封装
* 入参规范: 导出具名函数时，GET 请求或简单的 POST 参数必须使用 `params` 包装；JSON Body 体传参必须使用 `data` 包装。
* 统一拦截: 依赖 `utils/request.js` 中的 axios 实例。收到 401 状态码时，直接依赖全局拦截器踢回登录页，业务代码中禁止重复写 401 处理逻辑。
* 响应处理: API 请求必须处理统一的响应体，提取真实的 `data` 字段。

## 3. 错误处理与用户提示 (UI)
* 常规报错: 捕获到的业务异常，必须通过 Element Plus 的 `ElMessage.error()` 进行气泡提示。
* 二次确认: 涉及敏感操作（如审核、派单），必须使用 `ElMessageBox.confirm()` 弹出确认框。
* 全局推送: 对于 WebSocket 推送过来的 SOS 或紧急调度消息，强制使用 `ElNotification` 进行右侧悬浮全局强提醒。

## 4. 路由守卫与权限 (RBAC)
* 权限校验: 配置路由时，必须依赖 `meta.roles` 数组声明访问权限。
* 状态读取: 守卫拦截需通过 `localStorage.getItem('userRole')` 进行前端层面的第一道拦截。页面级组件全部采用 lazy import。

## 5. WebSocket 实时通信
* 全局单例: 依赖 `App.vue` 中建立的全局 WS 连接，必须包含断线重连机制。
* 内存管理: 组件销毁前必须清理监听器，防止内存泄漏。

## 6. 全局事件总线 (window CustomEvent)

系统使用 `window.dispatchEvent(CustomEvent)` 实现跨组件实时通信，不引入额外依赖：

| 事件名 | 派发者 | 监听者 | 用途 |
|--------|--------|--------|------|
| `mode-changed` | App.vue (WS收到 MODE_CHANGED) | SideMenu/ ElderlySOS/ FoodBankMarket/ dispatch/index/ AlgorithmConfig/ MerchantDonate/ EmergencyRadar | 平急模式切换，各页面联动 |
| `audit-status-changed` | App.vue + ProfileSetting | SideMenu/ ElderlySOS/ dispatch/index/ AdminReview/ ProfileSetting | 审核状态变更，解锁/锁定 |
| `user-info-updated` | ProfileSetting (保存后) | SideMenu | 同步 deliveryType/username 到侧边栏 |
| `refresh-orders` | App.vue (WS收到各类订单事件) | OrderFlow/ AdminReview/ MerchantHistory/ FoodBankMarket/ dispatch/index | 订单列表自动刷新 |

**规范**：
- 所有 `addEventListener` 必须在 `onUnmounted` 中 `removeEventListener`
- 监听器必须提取为命名函数引用，不要传匿名函数
- 不要在多处修改同一状态——保持单一数据源（WebSocket 驱动）

## 7. 模式切换前端规则

- `/market` (FoodBankMarket)：应急模式立即跳转 `/sos` + localStorage 3s 轮询兜底
- `/sos` (ElderlySOS)：应急→平时 + deliveryType=0 显示"自助提取已恢复"横幅
- `/map` (dispatch/index)：切换时清空 `pendingOrder/result/autoDispatchedOrderId` + `map.clearMap()` + `fetchMapOrders()`
- `/config` (AlgorithmConfig)：`toggleSysMode` 不抢跑修改 `form.sysMode`，等待 WebSocket 事件统一驱动
- SideMenu：`showSos` 对所有 role=1 开放，`showMarket` 仅 NORMAL + deliveryType=0

## 8. 审核冻结 UI 规范

- **未审核用户**：SideMenu 菜单项 `requiresAuth: true` → 点击弹 "🔒 系统权限受限"
- **ElderlySOS**：未审核时显示红色 `freeze-banner` + 四张卡片 `is-frozen` (灰色不可点击)
- **dispatch/index**：未审核时显示 `.lock-screen` 遮罩
- **例外**：`/volunteer/profile` 始终可访问（用户需进去上传凭证）