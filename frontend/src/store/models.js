import { defineStore } from 'pinia'
import { api } from '../services/api'

export const useModelsStore = defineStore('models', {
  state: () => ({
    models: [],
    defaultModel: null,
    loading: false,
    error: null
  }),

  getters: {
    getModelById: (state) => (id) => {
      return state.models.find(model => model.id === id)
    },

    availableModels: (state) => {
      return state.models.filter(model => model.id !== state.defaultModel?.id)
    }
  },

  actions: {
    // 获取所有模型
    async fetchModels() {
      this.loading = true
      this.error = null

      try {
        const response = await api.get('/models')
        this.models = response.data.data.models
        this.defaultModel = response.data.data.default
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    // 获取默认模型
    async fetchDefaultModel() {
      try {
        const response = await api.get('/models/default')
        this.defaultModel = response.data.data
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    // 添加模型
    async addModel(modelData) {
      try {
        const response = await api.post('/models', modelData)
        const newModel = response.data.data

        // 添加到本地状态
        this.models.push(newModel)

        return newModel
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    // 更新模型
    async updateModel(modelId, updateData) {
      try {
        const response = await api.put(`/models/${modelId}`, updateData)
        const updatedModel = response.data.data

        // 更新本地状态
        const index = this.models.findIndex(model => model.id === modelId)
        if (index !== -1) {
          this.models[index] = updatedModel
        }

        // 如果更新的是默认模型，也要更新defaultModel
        if (this.defaultModel && this.defaultModel.id === modelId) {
          this.defaultModel = updatedModel
        }

        return updatedModel
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    // 删除模型
    async deleteModel(modelId) {
      try {
        await api.delete(`/models/${modelId}`)

        // 从本地状态中移除
        this.models = this.models.filter(model => model.id !== modelId)

        // 如果删除的是默认模型，清除默认设置
        if (this.defaultModel && this.defaultModel.id === modelId) {
          this.defaultModel = this.models.length > 0 ? this.models[0] : null
        }
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    // 设置默认模型
    async setDefaultModel(modelId) {
      try {
        const response = await api.put('/models/default', { modelId })

        // 更新本地状态
        this.defaultModel = this.getModelById(modelId)

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
      this.models = []
      this.defaultModel = null
      this.loading = false
      this.error = null
    }
  }
})
