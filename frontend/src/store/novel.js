import { defineStore } from 'pinia'
import { api } from '../services/api'

export const useNovelStore = defineStore('novel', {
  state: () => ({
    novels: [],
    prompts: [],
    categories: [],
    currentNovel: null,
    loading: false,
    error: null
  }),

  getters: {
    getNovelById: (state) => (id) => {
      return state.novels.find(novel => novel.id === id)
    },

    getPromptById: (state) => (id) => {
      return state.prompts.find(prompt => prompt.id === id)
    },

    generatingNovels: (state) => {
      return state.novels.filter(novel => novel.status === 'generating')
    },

    draftNovels: (state) => {
      return state.novels.filter(novel => novel.status === 'draft')
    },

    confirmedNovels: (state) => {
      return state.novels.filter(novel => novel.status === 'confirmed')
    }
  },

  actions: {
    // 获取小说列表
    async fetchNovels(filters = {}) {
      this.loading = true
      this.error = null

      try {
        const params = new URLSearchParams()
        if (filters.status) params.append('status', filters.status)
        if (filters.sortBy) params.append('sortBy', filters.sortBy)
        if (filters.page) params.append('page', filters.page)
        if (filters.limit) params.append('limit', filters.limit)

        const response = await api.get(`/novel/list?${params.toString()}`)
        this.novels = response.data.data.novels
        return response.data.data
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    // 获取单个小说详情
    async fetchNovel(novelId) {
      this.loading = true
      this.error = null

      try {
        const response = await api.get(`/novel/${novelId}`)
        this.currentNovel = response.data.data

        // 更新列表中的对应项
        const index = this.novels.findIndex(novel => novel.id === novelId)
        if (index !== -1) {
          this.novels[index] = response.data.data
        }

        return response.data.data
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    // 创建小说
    async createNovel(novelData) {
      try {
        const response = await api.post('/novel/create', novelData)
        const newNovel = response.data.data

        // 添加到本地状态
        this.novels.unshift(newNovel)

        return newNovel
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    // 开始生成小说
    async startGeneration(novelId, parameters = {}) {
      try {
        const response = await api.post(`/novel/${novelId}/generate`, { parameters })

        // 更新本地状态
        const novel = this.novels.find(n => n.id === novelId)
        if (novel) {
          novel.status = 'generating'
        }

        return response.data.data
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    // 获取生成状态
    async fetchNovelStatus(novelId) {
      try {
        const response = await api.get(`/novel/${novelId}/status`)
        const statusData = response.data.data

        // 更新本地状态
        const novel = this.novels.find(n => n.id === novelId)
        if (novel) {
          novel.status = statusData.status
          novel.currentWordCount = statusData.currentWordCount
          novel.updatedAt = statusData.lastUpdated
        }

        return statusData
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    // 更新小说内容
    async updateNovelContent(novelId, content, changeReason = '') {
      try {
        const response = await api.put(`/novel/${novelId}/content`, {
          content,
          changeReason
        })

        // 更新本地状态
        const novel = this.novels.find(n => n.id === novelId)
        if (novel) {
          novel.content = content
          novel.currentWordCount = response.data.data.wordCount
          novel.updatedAt = new Date().toISOString()
        }

        if (this.currentNovel && this.currentNovel.id === novelId) {
          this.currentNovel.content = content
          this.currentNovel.currentWordCount = response.data.data.wordCount
          this.currentNovel.updatedAt = new Date().toISOString()
        }

        return response.data.data
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    // 更新生成参数
    async updateNovelParameters(novelId, parameters, targetWordCount) {
      try {
        const response = await api.put(`/novel/${novelId}/parameters`, {
          parameters,
          targetWordCount
        })

        // 更新本地状态
        const novel = this.novels.find(n => n.id === novelId)
        if (novel) {
          novel.parameters = response.data.data.parameters
          novel.targetWordCount = response.data.data.targetWordCount
          novel.updatedAt = new Date().toISOString()
        }

        return response.data.data
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    // 获取版本历史
    async fetchNovelVersions(novelId) {
      try {
        const response = await api.get(`/novel/${novelId}/versions`)
        return response.data.data
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    // 恢复到指定版本
    async restoreVersion(novelId, versionId) {
      try {
        const response = await api.post(`/novel/${novelId}/restore`, {
          versionId
        })

        // 重新获取小说详情以更新内容
        await this.fetchNovel(novelId)

        return response.data.data
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    // 确认小说
    async confirmNovel(novelId) {
      try {
        const response = await api.post(`/novel/${novelId}/confirm`)

        // 更新本地状态
        const novel = this.novels.find(n => n.id === novelId)
        if (novel) {
          novel.status = 'confirmed'
          novel.confirmedAt = response.data.data.confirmedAt
          novel.updatedAt = new Date().toISOString()
        }

        return response.data.data
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    // 重新生成
    async regenerateNovel(novelId, parameters = {}) {
      try {
        const response = await api.post(`/novel/${novelId}/regenerate`, { parameters })

        // 更新本地状态
        const novel = this.novels.find(n => n.id === novelId)
        if (novel) {
          novel.status = 'generating'
          novel.content = ''
          novel.currentWordCount = 0
        }

        return response.data.data
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    // 删除小说
    async deleteNovel(novelId) {
      try {
        await api.delete(`/novel/${novelId}`)

        // 从本地状态中移除
        this.novels = this.novels.filter(novel => novel.id !== novelId)

        if (this.currentNovel && this.currentNovel.id === novelId) {
          this.currentNovel = null
        }
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    // 导出小说
    async exportNovel(novelId, format = 'txt') {
      try {
        const response = await api.get(`/novel/${novelId}/export/${format}`, {
          responseType: 'blob'
        })

        // 创建下载链接
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url

        // 从响应头获取文件名
        const contentDisposition = response.headers['content-disposition']
        let filename = `novel_${novelId}.${format}`
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
          if (filenameMatch.length > 1) {
            filename = filenameMatch[1].replace(/['"]/g, '')
          }
        }

        link.setAttribute('download', filename)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        return { success: true }
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    // 获取prompt模板
    async fetchPrompts(category = null) {
      this.loading = true
      this.error = null

      try {
        const params = category ? `?category=${category}` : ''
        const response = await api.get(`/novel/prompts${params}`)
        this.prompts = response.data.data
        return response.data.data
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    // 获取prompt分类
    async fetchCategories() {
      try {
        const response = await api.get('/novel/categories')
        this.categories = response.data.data
        return response.data.data
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    // 清除错误
    clearError() {
      this.error = null
    },

    // 重置状态
    resetState() {
      this.novels = []
      this.prompts = []
      this.categories = []
      this.currentNovel = null
      this.loading = false
      this.error = null
    }
  }
})