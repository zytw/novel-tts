<template>
  <el-dialog
    v-model="visible"
    :title="analysisData?.title ? `${analysisData.title} - 分析详情` : '分析详情'"
    width="80%"
    :close-on-click-modal="false"
  >
    <div class="analysis-detail" v-loading="loading">
      <div v-if="analysisData" class="detail-content">
        <!-- 分析状态概览 -->
        <div class="status-overview">
          <el-descriptions title="分析状态" :column="2" border>
            <el-descriptions-item label="小说标题">
              {{ analysisData.title }}
            </el-descriptions-item>
            <el-descriptions-item label="分析状态">
              <el-tag :type="getStatusType(analysisData.status)">
                {{ getStatusText(analysisData.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="角色数量">
              {{ characterCount }} 个
            </el-descriptions-item>
            <el-descriptions-item label="完成步骤">
              {{ completedSteps }} / 3
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 角色分析结果 -->
        <div v-if="analysisData.analysis" class="section">
          <h3 class="section-title">
            <el-icon><User /></el-icon>
            角色分析结果
          </h3>

          <div class="character-cards" v-if="analysisData.analysis.characters">
            <el-card
              v-for="character in analysisData.analysis.characters"
              :key="character.id"
              class="character-card"
              :body-style="{ padding: '16px' }"
            >
              <div class="character-header">
                <h4 class="character-name">{{ character.name }}</h4>
                <div class="character-badges">
                  <el-tag size="small" :type="getGenderType(character.gender)">
                    {{ getGenderText(character.gender) }}
                  </el-tag>
                  <el-tag size="small" type="info">
                    {{ getAgeText(character.age_range) }}
                  </el-tag>
                </div>
              </div>

              <div class="character-details">
                <div class="detail-row">
                  <span class="label">性格:</span>
                  <div class="personality-tags">
                    <el-tag
                      v-for="trait in character.personality"
                      :key="trait"
                      size="small"
                    >
                      {{ getPersonalityText(trait) }}
                    </el-tag>
                  </div>
                </div>

                <div class="detail-row" v-if="character.dialogue_analysis">
                  <span class="label">对话统计:</span>
                  <span class="value">
                    {{ character.dialogue_analysis.dialogue_count }} 次,
                    {{ character.dialogue_analysis.total_words }} 字
                  </span>
                </div>

                <div class="detail-row" v-if="character.relationships">
                  <span class="label">社交地位:</span>
                  <span class="value">{{ getSocialStatusText(character.relationships.social_status) }}</span>
                </div>
              </div>
            </el-card>
          </div>
        </div>

        <!-- 叙述人分析 -->
        <div v-if="analysisData.analysis?.narrator" class="section">
          <h3 class="section-title">
            <el-icon><Document /></el-icon>
            叙述人分析
          </h3>
          <el-card :body-style="{ padding: '16px' }">
            <div class="narrator-details">
              <div class="detail-row">
                <span class="label">叙述类型:</span>
                <span class="value">{{ getNarratorTypeText(analysisData.analysis.narrator.type) }}</span>
              </div>
              <div class="detail-row" v-if="analysisData.analysis.narrator.style">
                <span class="label">叙述风格:</span>
                <span class="value">
                  {{ getNarratorStyleText(analysisData.analysis.narrator.style) }}
                </span>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 音色配置 -->
        <div v-if="analysisData.voiceConfiguration" class="section">
          <h3 class="section-title">
            <el-icon><Microphone /></el-icon>
            音色配置
          </h3>

          <div class="voice-configs">
            <!-- 叙述者音色 -->
            <el-card class="voice-card" :body-style="{ padding: '16px' }">
              <h4 class="voice-title">
                <el-icon><Document /></el-icon>
                叙述者音色
              </h4>
              <div class="voice-profile">
                <div class="profile-grid">
                  <div class="profile-item">
                    <span class="label">语气:</span>
                    <span class="value">{{ getToneText(analysisData.voiceConfiguration.voice_configuration.narrator.voice_profile.tone) }}</span>
                  </div>
                  <div class="profile-item">
                    <span class="label">音高:</span>
                    <span class="value">{{ getPitchText(analysisData.voiceConfiguration.voice_configuration.narrator.voice_profile.pitch) }}</span>
                  </div>
                  <div class="profile-item">
                    <span class="label">语速:</span>
                    <span class="value">{{ getSpeedText(analysisData.voiceConfiguration.voice_configuration.narrator.voice_profile.speed) }}</span>
                  </div>
                </div>
              </div>
            </el-card>

            <!-- 角色音色 -->
            <div
              v-for="character in (analysisData.voiceConfiguration?.voice_configuration?.characters || [])"
              :key="character.character_id"
              class="voice-card"
              :body-style="{ padding: '16px' }"
            >
              <h4 class="voice-title">
                <el-icon><User /></el-icon>
                {{ character.character_name || character.character_id }}
              </h4>
              <div class="voice-profile">
                <div class="profile-grid">
                  <div class="profile-item">
                    <span class="label">语气:</span>
                    <span class="value">{{ getToneText(character.voice_profile.tone) }}</span>
                  </div>
                  <div class="profile-item">
                    <span class="label">音高:</span>
                    <span class="value">{{ getPitchText(character.voice_profile.pitch) }}</span>
                  </div>
                  <div class="profile-item">
                    <span class="label">语速:</span>
                    <span class="value">{{ getSpeedText(character.voice_profile.speed) }}</span>
                  </div>
                  <div class="profile-item">
                    <span class="label">情感:</span>
                    <span class="value">{{ getEmotionText(character.voice_profile.emotion) }}</span>
                  </div>
                </div>
              </div>
            </el-card>
          </div>
        </div>

        <!-- TTS脚本统计 -->
        <div v-if="analysisData.ttsScript" class="section">
          <h3 class="section-title">
            <el-icon><Document /></el-icon>
            TTS脚本
          </h3>

          <el-card :body-style="{ padding: '16px' }">
            <div class="script-stats">
              <div class="stat-row">
                <span class="label">总段落数:</span>
                <span class="value">{{ analysisData.ttsScript.totalSegments }}</span>
              </div>
              <div class="stat-row">
                <span class="label">预计时长:</span>
                <span class="value">{{ formatDuration(analysisData.ttsScript.totalDuration) }}</span>
              </div>
              <div class="stat-row">
                <span class="label">生成时间:</span>
                <span class="value">{{ formatDate(analysisData.ttsScript.metadata.generatedAt) }}</span>
              </div>
            </div>
          </el-card>
        </div>
      </div>

      <div v-else class="no-content">
        <el-empty description="暂无分析数据" />
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
      <el-button
        v-if="analysisData?.ttsScript"
        type="primary"
        @click="handleViewScript"
      >
        查看脚本
      </el-button>
    </template>
  </el-dialog>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { User, Microphone, Document } from '@element-plus/icons-vue'
import { useAnalysisStore } from '../../store/analysis'

export default {
  name: 'AnalysisDetailDialog',
  components: {
    User,
    Microphone,
    Document
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    analysisId: {
      type: String,
      required: true
    }
  },
  emits: ['update:modelValue', 'close', 'view-script'],
  setup(props, { emit }) {
    const analysisStore = useAnalysisStore()

    const loading = ref(false)
    const analysisData = ref(null)

    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
    })

    const characterCount = computed(() => {
      return analysisData.value?.analysis?.characters?.length || 0
    })

    const completedSteps = computed(() => {
      const analysis = analysisData.value
      let count = 0
      if (analysis?.analysis) count++
      if (analysis?.voiceConfiguration) count++
      if (analysis?.ttsScript) count++
      return count
    })

    // 监听对话框显示
    watch(() => props.modelValue, async (newValue) => {
      if (newValue && props.analysisId) {
        await loadAnalysisData()
      }
    })

    // 加载分析数据
    const loadAnalysisData = async () => {
      loading.value = true
      try {
        await analysisStore.fetchAnalysisResult(props.analysisId)
        analysisData.value = analysisStore.getAnalysisById(props.analysisId)
      } catch (error) {
        console.error('加载分析数据失败:', error)
      } finally {
        loading.value = false
      }
    }

    // 处理查看脚本
    const handleViewScript = () => {
      emit('view-script', props.analysisId)
    }

    // 处理关闭
    const handleClose = () => {
      visible.value = false
      emit('close')
    }

    // 辅助函数
    const getStatusType = (status) => {
      const typeMap = {
        pending: '',
        analyzed: 'warning',
        voice_matched: 'info',
        completed: 'success'
      }
      return typeMap[status] || ''
    }

    const getStatusText = (status) => {
      const textMap = {
        pending: '待分析',
        analyzed: '已分析',
        voice_matched: '音色匹配',
        completed: '已完成'
      }
      return textMap[status] || status
    }

    const getGenderType = (gender) => {
      const typeMap = {
        male: 'primary',
        female: 'success',
        unknown: ''
      }
      return typeMap[gender] || 'info'
    }

    const getGenderText = (gender) => {
      const textMap = {
        male: '男性',
        female: '女性',
        unknown: '未知'
      }
      return textMap[gender] || gender
    }

    const getAgeText = (age) => {
      const textMap = {
        young_adult: '青年',
        adult: '成年',
        middle_aged: '中年',
        elderly: '老年',
        unknown: '未知'
      }
      return textMap[age] || age
    }

    const getPersonalityText = (trait) => {
      const textMap = {
        outgoing: '外向',
        optimistic: '乐观',
        curious: '好奇',
        serious: '严肃',
        gentle: '温和',
        brave: '勇敢',
        calm: '冷静',
        humorous: '幽默'
      }
      return textMap[trait] || trait
    }

    const getSocialStatusText = (status) => {
      const textMap = {
        equal: '平等',
        dominant: '主导',
        subordinate: '从属'
      }
      return textMap[status] || status
    }

    const getNarratorTypeText = (type) => {
      const textMap = {
        first_person: '第一人称',
        third_person_limited: '第三人称限知',
        third_person_omniscient: '第三人称全知'
      }
      return textMap[type] || type
    }

    const getNarratorStyleText = (style) => {
      if (!style) return '未知'
      return `${style.language || ''} ${style.emotion || ''} ${style.pace || ''}`.trim()
    }

    const getToneText = (tone) => {
      const textMap = {
        neutral: '中性',
        warm: '温暖',
        serious: '严肃',
        cheerful: '愉快',
        gentle: '温和'
      }
      return textMap[tone] || tone
    }

    const getPitchText = (pitch) => {
      const textMap = {
        low: '低音',
        medium: '中音',
        high: '高音'
      }
      return textMap[pitch] || pitch
    }

    const getSpeedText = (speed) => {
      const textMap = {
        slow: '慢速',
        normal: '正常',
        fast: '快速'
      }
      return textMap[speed] || speed
    }

    const getEmotionText = (emotion) => {
      const textMap = {
        neutral: '中性',
        friendly: '友善',
        serious: '严肃',
        calm: '平静'
      }
      return textMap[emotion] || emotion
    }

    const formatDuration = (seconds) => {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = Math.floor(seconds % 60)
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString('zh-CN')
    }

    return {
      loading,
      analysisData,
      visible,
      characterCount,
      completedSteps,
      loadAnalysisData,
      handleViewScript,
      handleClose,
      getStatusType,
      getStatusText,
      getGenderType,
      getGenderText,
      getAgeText,
      getPersonalityText,
      getSocialStatusText,
      getNarratorTypeText,
      getNarratorStyleText,
      getToneText,
      getPitchText,
      getSpeedText,
      getEmotionText,
      formatDuration,
      formatDate
    }
  }
}
</script>

<style scoped>
.analysis-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.status-overview {
  margin-bottom: 24px;
}

.character-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.character-card {
  border: 1px solid #e4e7ed;
}

.character-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.character-name {
  margin: 0;
  font-size: 16px;
  color: #2c3e50;
  font-weight: 600;
}

.character-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.character-details {
  font-size: 14px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-row .label {
  color: #909399;
  font-weight: 500;
}

.detail-row .value {
  color: #606266;
}

.personality-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.narrator-details,
.voice-profiles,
.script-stats {
  font-size: 14px;
}

.voice-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 16px;
}

.voice-card {
  border: 1px solid #e4e7ed;
  margin-bottom: 16px;
}

.voice-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.profile-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.profile-item .label {
  color: #909399;
  font-size: 12px;
}

.profile-item .value {
  color: #606266;
  font-size: 12px;
  font-weight: 500;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.stat-row .label {
  color: #909399;
  font-weight: 500;
}

.stat-row .value {
  color: #606266;
}

.no-content {
  text-align: center;
  padding: 40px 0;
  color: #909399;
}
</style>