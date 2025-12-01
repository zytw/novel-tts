import axios from 'axios'
import { ElMessage, ElNotification } from 'element-plus'

/**
 * API 服务模块
 * 统一管理前后端 API 通信
 */

// 创建 axios 实例
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'development' ? '/api' : '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 添加请求ID
    config.headers['X-Request-ID'] = generateRequestId()

    // 添加时间戳防止缓存
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }

    // 添加认证token（如果有）
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data
    })

    return config
  },
  (error) => {
    console.error('❌ Request Error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    const { config, data } = response
    console.log(`✅ API Response: ${config.method?.toUpperCase()} ${config.url}`, data)

    // 统一处理API响应格式
    if (data.success === false) {
      throw new APIError(data.error || '操作失败', data.code, data.details)
    }

    return data
  },
  (error) => {
    console.error('❌ Response Error:', error)

    // 处理网络错误
    if (!error.response) {
      ElMessage.error('网络连接失败，请检查网络设置')
      return Promise.reject(error)
    }

    const { status, data } = error.response

    // 处理不同HTTP状态码
    switch (status) {
    case 400:
      ElMessage.error(data.error || '请求参数错误')
      break
    case 401:
      ElMessage.error('身份验证失败，请重新登录')
      // 清除token并跳转到登录页
      localStorage.removeItem('auth_token')
      // 这里可以添加路由跳转逻辑
      break
    case 403:
      ElMessage.error('权限不足，无法访问该资源')
      break
    case 404:
      ElMessage.error('请求的资源不存在')
      break
    case 429:
      ElMessage.error('请求过于频繁，请稍后再试')
      break
    case 500:
      ElMessage.error('服务器内部错误，请稍后再试')
      break
    default:
      ElMessage.error(`请求失败 (${status})`)
    }

    return Promise.reject(new APIError(
      data.error || error.message,
      data.code || `HTTP_${status}`,
      data.details
    ))
  }
)

/**
 * API 错误类
 */
class APIError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', details = null) {
    super(message)
    this.name = 'APIError'
    this.code = code
    this.details = details
  }
}

/**
 * 生成请求ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * API 服务类
 */
class APIService {
  constructor() {
    this.api = api
  }

  /**
   * 处理文件上传
   */
  async uploadFile(file, onProgress = null) {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await this.api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: onProgress
      })
      return response.data
    } catch (error) {
      throw new APIError('文件上传失败', 'UPLOAD_FAILED', error.details)
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(url, filename = null) {
    try {
      const response = await this.api.get(url, {
        responseType: 'blob'
      })

      // 创建下载链接
      const blob = new Blob([response.data])
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename || `download_${Date.now()}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      return { success: true }
    } catch (error) {
      throw new APIError('文件下载失败', 'DOWNLOAD_FAILED', error.details)
    }
  }

  /**
   * 批量操作
   */
  async batchRequest(requests, options = {}) {
    const { parallel = true, stopOnError = false } = options

    if (parallel) {
      // 并行执行
      let results = []
      try {
        results = await Promise.all(
          requests.map(req => this.api[req.method.toLowerCase()](req.url, req.data))
        )
        return results.map(res => res.data)
      } catch (error) {
        if (stopOnError) throw error
        return results.map(res => res.data)
      }
    } else {
      // 串行执行
      const results = []
      for (const req of requests) {
        try {
          const result = await this.api[req.method.toLowerCase()](req.url, req.data)
          results.push(result.data)
        } catch (error) {
          if (stopOnError) throw error
          results.push({ error: error.message })
        }
      }
      return results
    }
  }

  /**
   * 分页请求
   */
  async paginatedRequest(url, params = {}, pageSize = 20) {
    let page = 1
    let allData = []
    let hasMore = true

    while (hasMore) {
      const response = await this.api.get(url, {
        params: {
          ...params,
          page,
          pageSize
        }
      })

      const { data, pagination } = response.data
      allData = allData.concat(data)

      hasMore = pagination && pagination.hasMore
      page++
    }

    return {
      data: allData,
      total: allData.length,
      page: Math.ceil(allData.length / pageSize)
    }
  }

  /**
   * 通用请求方法
   */
  async request(config) {
    try {
      const response = await this.api.request(config)
      return response
    } catch (error) {
      console.error('API Request Failed:', error)
      throw error
    }
  }

  // 具体的API方法将由各个模块的service类实现
}

/**
 * 消息提示工具
 */
export const MessageUtils = {
  success: (message, options = {}) => {
    ElMessage.success({
      message,
      duration: 3000,
      ...options
    })
  },

  error: (message, options = {}) => {
    ElMessage.error({
      message,
      duration: 5000,
      ...options
    })
  },

  warning: (message, options = {}) => {
    ElMessage.warning({
      message,
      duration: 4000,
      ...options
    })
  },

  info: (message, options = {}) => {
    ElMessage.info({
      message,
      duration: 3000,
      ...options
    })
  },

  notify: (title, message, type = 'info', options = {}) => {
    ElNotification({
      title,
      message,
      type,
      duration: 5000,
      ...options
    })
  }
}

/**
 * 本地存储工具
 */
export const StorageUtils = {
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Storage set error:', error)
    }
  },

  get: (key, defaultValue = null) => {
    try {
      const value = localStorage.getItem(key)
      return value ? JSON.parse(value) : defaultValue
    } catch (error) {
      console.error('Storage get error:', error)
      return defaultValue
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Storage remove error:', error)
    }
  },

  clear: () => {
    try {
      localStorage.clear()
    } catch (error) {
      console.error('Storage clear error:', error)
    }
  }
}

/**
 * 格式化工具
 */
export const FormatUtils = {
  fileSize: (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  dateTime: (dateString, format = 'full') => {
    const date = new Date(dateString)
    switch (format) {
    case 'date':
      return date.toLocaleDateString('zh-CN')
    case 'time':
      return date.toLocaleTimeString('zh-CN')
    case 'short':
      return date.toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    default:
      return date.toLocaleString('zh-CN')
    }
  },

  duration: (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }
  }
}

// 创建全局API实例
export const APIClient = new APIService()

// 导出API实例和相关工具
export default api
export { APIError, APIService }
