import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建axios实例
const api = axios.create({
  baseURL: process.env.VUE_APP_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证token等
    // const token = localStorage.getItem('token')
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 统一处理成功响应
    return response
  },
  (error) => {
    // 统一处理错误响应
    let message = '请求失败'

    if (error.response) {
      // 服务器返回了错误状态码
      const { status, data } = error.response

      switch (status) {
        case 400:
          message = data.error || '请求参数错误'
          break
        case 401:
          message = '未授权，请重新登录'
          // 可以在这里处理登录过期
          break
        case 403:
          message = '拒绝访问'
          break
        case 404:
          message = '请求的资源不存在'
          break
        case 500:
          message = '服务器内部错误'
          break
        default:
          message = data.error || `请求失败 (${status})`
      }
    } else if (error.request) {
      // 请求已发出，但没有收到响应
      message = '网络连接失败，请检查网络设置'
    } else {
      // 请求配置错误
      message = error.message || '请求配置错误'
    }

    // 显示错误消息
    ElMessage.error(message)

    return Promise.reject(error)
  }
)

export { api }