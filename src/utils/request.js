import axios from 'axios'
import { ElMessage } from 'element-plus'

const service = axios.create({
    baseURL: 'http://localhost:8080/api',
    timeout: 10000
})

// 请求拦截器：自动携带 Token
service.interceptors.request.use(
    config => {
        const token = localStorage.getItem('ACCESS_TOKEN')
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`
        }
        return config
    },
    error => Promise.reject(error)
)

// 响应拦截器：统一处理提示
service.interceptors.response.use(
    response => {
        const res = response.data
        // 如果后端返回 code 不是 200 (比如：手慢了，订单被抢)
        if (res.code !== 200) {
            ElMessage({
                message: res.message || '系统繁忙',
                type: 'warning', // 统一使用温馨的橙黄色警告
                duration: 3000,
                plain: true,
            })
            return Promise.reject(new Error(res.message || 'Error'))
        }
        return res
    },
    error => {
        if (error.response && error.response.status === 401) {
            ElMessage.error('登录已过期，请重新登录')
            localStorage.removeItem('ACCESS_TOKEN')
            window.location.href = '/login'
        } else {
            ElMessage.error('网络异常，请检查后端是否启动')
        }
        return Promise.reject(error)
    }
)

export default service