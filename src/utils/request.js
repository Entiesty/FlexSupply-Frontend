import axios from 'axios'
import { ElMessage } from 'element-plus'

const service = axios.create({
    baseURL: 'http://localhost:8080/api',
    timeout: 10000
})

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

service.interceptors.response.use(
    response => {
        const res = response.data
        if (res.code !== 200) {
            ElMessage({ message: res.message || '系统繁忙', type: 'warning', duration: 3000, plain: true })
            return Promise.reject(new Error(res.message || 'Error'))
        }
        return res
    },
    error => {
        if (error.response && error.response.status === 401) {
            ElMessage.error('登录已过期，请重新验证身份')
            localStorage.removeItem('ACCESS_TOKEN')
            localStorage.removeItem('userRole')
            window.location.href = '/auth' // 🚨 踢回到 Auth
        } else {
            ElMessage.error('网络异常，请检查后端是否启动')
        }
        return Promise.reject(error)
    }
)

export default service