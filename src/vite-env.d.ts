/// <reference types="vite/client" />

interface Window {
    _AMapSecurityConfig: {
        securityJsCode: string;
    };
}

interface ImportMetaEnv {
    readonly VITE_AMAP_KEY: string;
    readonly VITE_AMAP_SECURITY_CODE: string;
    readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// 🚨 必须保留此段，让 TS 识别 .vue 文件
declare module "*.vue" {
    import type { DefineComponent } from "vue";
    const component: DefineComponent<{}, {}, any>;
    export default component;
}