import { defineStore } from 'pinia'
import { api } from '../services/api'

export const useAnalysisStore = defineStore('analysis', {
  state: () => ({
    analysisHistory: [],
    voiceProfiles: [],
    currentAnalysis: null,
    loading: false,
    error: null
  }),

  getters: {
    getAnalysisById: (state) => (novelId) => {
      return state.analysisHistory.find(item => item.novelId === novelId) || null
    },

    hasCompletedAnalysis: (state) => (novelId) => {
      const analysis = state.analysisHistory.find(item => item.novelId === novelId)
      return analysis && analysis.status === 'completed'
    },

    getAnalysisProgress: (state) => (novelId) => {
      const analysis = state.analysisHistory.find(item => item.novelId === novelId)
      if (!analysis) return 0

      const steps = ['character_analysis', 'voice_matching', 'script_generation']
      const completedSteps = analysis.completedSteps || []
      return (completedSteps.length / steps.length) * 100
    }
  },

  actions: {
    // 分析小说角色
    async analyzeCharacters(novelId, options = {}) {
      this.loading = true
      this.error = null

      try {
        const response = await api.post(`/analysis/novels/${novelId}/characters`, options)

        const analysisData = response.data.data

        // 更新历史记录
        const existingIndex = this.analysisHistory.findIndex(item => item.novelId === novelId)
        const analysisItem = {
          novelId,
          title: analysisData.analysis?.analysis_summary?.total_characters || '未知',
          status: 'analyzed',
          hasCharacterAnalysis: true,
          hasVoiceConfiguration: false,
          hasTTSScript: false,
          analysis: analysisData.analysis,
          voiceConfiguration: null,
          ttsScript: null,
          completedSteps: ['character_analysis'],
          analyzedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        if (existingIndex >= 0) {
          this.analysisHistory[existingIndex] = { ...this.analysisHistory[existingIndex], ...analysisItem }
        } else {
          this.analysisHistory.unshift(analysisItem)
        }

        return response.data.data
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    // 音色匹配
    async matchVoiceProfiles(novelId, analysis, options = {}) {
      this.loading = true
      this.error = null

      try {
        const response = await api.post(`/analysis/novels/${novelId}/voice-matching`, {
          analysis,
          options
        })

        const voiceConfig = response.data.data

        // 更新历史记录
        const existingIndex = this.analysisHistory.findIndex(item => item.novelId === novelId)
        if (existingIndex >= 0) {
          this.analysisHistory[existingIndex] = {
            ...this.analysisHistory[existingIndex],
            hasVoiceConfiguration: true,
            voiceConfiguration: voiceConfig.configuration,
            completedSteps: [...(this.analysisHistory[existingIndex].completedSteps || []), 'voice_matching'],
            voiceConfiguredAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: this.analysisHistory[existingIndex].hasTTSScript ? 'completed' : 'voice_matched'
          }
        }

        return response.data.data
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    // 生成TTS脚本
    async generateTTSScript(novelId, analysis, voiceConfiguration) {
      this.loading = true
      this.error = null

      try {
        const response = await api.post(`/analysis/novels/${novelId}/script`, {
          analysis,
          voiceConfiguration
        })

        const script = response.data.data

        // 更新历史记录
        const existingIndex = this.analysisHistory.findIndex(item => item.novelId === novelId)
        if (existingIndex >= 0) {
          this.analysisHistory[existingIndex] = {
            ...this.analysisHistory[existingIndex],
            hasTTSScript: true,
            ttsScript: script.script,
            completedSteps: ['character_analysis', 'voice_matching', 'script_generation'],
            scriptGeneratedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'completed'
          }
        }

        return response.data.data
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    // 完整分析流程
    async performCompleteAnalysis(novelId, options = {}) {
      this.loading = true
      this.error = null

      try {
        const response = await api.post(`/analysis/novels/${novelId}/complete`, { options })

        const completeData = response.data.data

        // 更新历史记录
        const existingIndex = this.analysisHistory.findIndex(item => item.novelId === novelId)
        const analysisItem = {
          novelId,
          title: completeData.analysis?.analysis_summary?.total_characters || '未知',
          status: 'completed',
          hasCharacterAnalysis: true,
          hasVoiceConfiguration: true,
          hasTTSScript: true,
          analysis: completeData.analysis,
          voiceConfiguration: completeData.voiceConfiguration,
          ttsScript: completeData.script,
          completedSteps: completeData.completedSteps,
          analyzedAt: new Date().toISOString(),
          voiceConfiguredAt: new Date().toISOString(),
          scriptGeneratedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        if (existingIndex >= 0) {
          this.analysisHistory[existingIndex] = analysisItem
        } else {
          this.analysisHistory.unshift(analysisItem)
        }

        return response.data.data
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    // 获取分析结果
    async fetchAnalysisResult(novelId) {
      this.loading = true
      this.error = null

      try {
        const response = await api.get(`/analysis/novels/${novelId}/analysis`)
        const analysisData = response.data.data

        // 更新历史记录
        const existingIndex = this.analysisHistory.findIndex(item => item.novelId === novelId)
        if (existingIndex >= 0) {
          this.analysisHistory[existingIndex] = {
            ...this.analysisHistory[existingIndex],
            ...analysisData
          }
        } else {
          this.analysisHistory.unshift({
            ...analysisData,
            completedSteps: []
          })
        }

        return analysisData
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    // 获取分析历史
    async fetchAnalysisHistory(options = {}) {
      this.loading = true
      this.error = null

      try {
        const params = new URLSearchParams()
        if (options.limit) params.append('limit', options.limit)
        if (options.offset) params.append('offset', options.offset)

        const response = await api.get(`/analysis/analysis-history?${params.toString()}`)
        this.analysisHistory = response.data.data.history

        return response.data.data
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    // 获取音色配置模板
    async fetchVoiceProfiles() {
      this.loading = true
      this.error = null

      try {
        const response = await api.get('/analysis/voice-profiles')
        this.voiceProfiles = response.data.data
        return response.data.data
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    // 删除分析结果
    async deleteAnalysisResult(novelId) {
      this.loading = true
      this.error = null

      try {
        await api.delete(`/analysis/novels/${novelId}/analysis`)

        // 从历史记录中移除
        this.analysisHistory = this.analysisHistory.filter(item => item.novelId !== novelId)

        return { success: true }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    // 设置当前分析
    setCurrentAnalysis(analysis) {
      this.currentAnalysis = analysis
    },

    // 清除当前分析
    clearCurrentAnalysis() {
      this.currentAnalysis = null
    },

    // 清除错误
    clearError() {
      this.error = null
    },

    // 重置状态
    resetState() {
      this.analysisHistory = []
      this.voiceProfiles = []
      this.currentAnalysis = null
      this.loading = false
      this.error = null
    }
  }
})