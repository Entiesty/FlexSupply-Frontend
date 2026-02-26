/// <reference types="vite/client" />

// 1. 扩展全局 Window 接口，用于高德地图安全密钥挂载
interface Window {
    _AMapSecurityConfig: {
        securityJsCode: string;
    };
}

// 2. 定义环境变量的智能提示 (IntelliSense)
interface ImportMetaEnv {
    readonly VITE_AMAP_KEY: string;
    readonly VITE_AMAP_SECURITY_CODE: string;
    readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}