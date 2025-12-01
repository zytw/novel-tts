<template>
  <el-dialog
    v-model="visible"
    title="TTS脚本预览"
    width="80%"
    :close-on-click-modal="false"
  >
    <div class="script-preview" v-loading="loading">
      <div v-if="scriptData" class="preview-content">
        <!-- 脚本头部信息 -->
        <div class="script-header">
          <el-descriptions title="脚本信息" :column="2" border>
            <el-descriptions-item label="小说标题">
              {{ scriptData.title }}
            </el-descriptions-item>
            <el-descriptions-item label="总段落数">
              {{ scriptData.totalSegments }}
            </elordinates-item>
            <el-descriptions-item label="总时长">
              {{ formatDuration(scriptData.totalDuration) }}
            </el-descriptions-item>
            <el-descriptions-item label="生成时间">
              {{ formatDate(scriptData.metadata.generatedAt) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 角色列表 -->
        <div class="characters-section">
          <h3 class="section-title">
            <el-icon><User /></el-icon>
            角色列表
          </h3>
          <div class="character-list">
            <div
              v-for="character in scriptData.characters"
              :key="character.id"
              class="character-item"
            >
              <div class="character-info">
                <span class="character-name">{{ character.name }}</span>
                <el-tag size="small">{{ getCharacterType(character.story_importance) }}</el-tag>
              </div>
              <div class="character-voice" v-if="character.voiceProfile">
                <el-tag size="mini" type="info">
                  {{ character.voiceProfile.tone }}
                </el-tag>
                <el-tag size="mini" type="success">
                  {{ character.voiceProfile.pitch }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>

        <!-- 脚本段落 -->
        <div class="script-sections">
          <h3 class="section-title">
            <el-icon><Document /></el-icon>
            脚本段落
          </h3>

          <div class="segments-list">
            <div
              v-for="(segment, index) in scriptData.segments"
              :key="segment.id"
              class="segment-item"
              :class="getSegmentClass(segment)"
            >
              <div class="segment-header">
                <div class="segment-info">
                  <span class="segment-number">#{{ index + 1 }}</span>
                  <el-tag :type="getSegmentTypeTag(segment.type)" size="small">
                    {{ getSegmentTypeText(segment.type) }}
                  </el-tag>
                  <el-tag v-if="segment.character !== 'narrator'" size="small">
                    {{ getCharacterName(segment.character) }}
                  </el-tag>
                  <el-tag v-if="segment.emotion !== 'neutral'" size="small" type="warning">
                    {{ getEmotionText(segment.emotion) }}
                  </el-tag>
                </div>
                <div class="segment-meta">
                  <span class="timestamp">{{ formatTime(segment.timestamp) }}</span>
                  <span class="duration">{{ formatDuration(segment.duration) }}</span>
                </div>
              </div>
              <div class="segment-content">
                {{ segment.text }}
              </div>
            </div>
          </div>
        </div>

        <!-- 语音配置汇总 -->
        <div class="voice-summary" v-if="scriptData.voiceConfiguration">
          <h3 class="section-title">
            <el-icon><Microphone /></el-icon>
            语音配置汇总
          </h3>
          <el-table :data="voiceSummary" stripe>
            <el-table-column prop="name" label="角色名称" width="150" />
            <el-table-column prop="tone" label="语气" width="100" />
            <el-table-column prop="pitch" label="音高" width="80" />
            <el-table-column prop="speed" label="语速" width="80" />
            <el-table-column prop="emotion" label="情感" width="100" />
            <el-table-column prop="segments" label="段落数" width="100" />
            <el-table-column label="操作" width="100">
              <template #default="scope="{ row }">
                <el-button size="small" @click="highlightSegments(row.name)">
                  高亮
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <div v-else class="no-content">
        <el-empty description="暂无脚本数据" />
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="handleExport">
          <el-icon><Download /></el-icon>
          导出脚本
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { User, Document, Microphone, Download } from '@element-plus/icons-vue'
import { useAnalysisStore } from '../../store/analysis'

export default {
  name: 'ScriptPreviewDialog',
  components: {
    User,
    Document,
    Microphone,
    Download
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    scriptId: {
      type: String,
      required: true
    }
  },
  emits: ['update:modelValue', 'close', 'export'],
  setup(props, { emit }) {
    const analysisStore = useAnalysisStore()

    const loading = ref(false)
    const scriptData = ref(null)
    const highlightedSegments = ref(new Set())

    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
    })

    const voiceSummary = computed(() => {
      if (!scriptData.value?.voiceConfiguration?.voice_configuration) {
        return []
      }

      const config = scriptData.value.voiceConfiguration.voice_configuration
      const summary = []

      // 添加叙述者
      summary.push({
        name: '叙述者',
        ...config.narrator.voice_profile,
        segments: scriptData.value.segments?.filter(s => s.character === 'narrator').length || 0
      })

      // 添加角色
      if (config.characters) {
        config.characters.forEach(char => {
          const character = scriptData.value.characters?.find(c => c.id === char.character_id)
          summary.push({
            name: character?.name || char.character_id,
            ...char.voice_profile,
            segments: scriptData.value.segments?.filter(s => s.character === (character?.name || char.character_id)).length || 0
          })
        })
      }

      return summary
    })

    // 监听对话框显示
    watch(() => props.modelValue, async (newValue) => {
      if (newValue && props.scriptId) {
        await loadScriptData()
      }
    })

    // 加载脚本数据
    const loadScriptData = async () => {
      loading.value = true
      try {
        const analysis = analysisStore.getAnalysisById(props.scriptId)
        if (analysis && analysis.ttsScript) {
          scriptData.value = analysis.ttsScript
        } else {
          console.error('未找到脚本数据')
        }
      } catch (error) {
        console.error('加载脚本数据失败:', error)
      } finally {
        loading.value = false
      }
    }

    // 高亮显示段落
    const highlightSegments = (characterName) => {
      if (characterName === '全部') {
        highlightedSegments.value.clear()
      } else {
        // 清除并重新设置
        highlightedSegments.value.clear()
        scriptData.value.segments.forEach(segment => {
          if (segment.character === characterName) {
            highlightedSegments.value.add(segment.id)
          }
        })
      }
    }

    // 处理导出
    const handleExport = () => {
      if (!scriptData.value) return

      const scriptContent = generateScriptText(scriptData.value)
      downloadScript(scriptContent, `${scriptData.value.title}_TTS脚本.txt`)
    }

    // 生成脚本文本
    const generateScriptText = (script) => {
      let text = `${script.title} - TTS语音合成脚本\n\n`
      text += `生成时间: ${formatDate(script.metadata.generatedAt)}\n`
      text += `总段落数: ${script.totalSegments}\n`
      text += `预计时长: ${formatDuration(script.totalDuration)}\n\n`
      text += '='.repeat(50) + '\n\n'

      // 角色信息
      if (script.characters && script.characters.length > 0) {
        text += '角色信息:\n'
        script.characters.forEach((character, index) => {
          text += `${index + 1}. ${character.name} (${character.story_importance})\n`
          if (character.voiceProfile) {
            text += `   音色: ${character.voiceProfile.tone} ${character.voiceProfile.pitch} ${character.voiceProfile.speed}\n`
          }
        })
        text += '\n'
      }

      text += '='.repeat(50) + '\n\n'
      text += '脚本段落:\n\n'

      // 段落内容
      script.segments.forEach((segment, index) => {
        text += `[${index + 1}] ${segment.type.toUpperCase()}`
        if (segment.character && segment.character !== 'narrator') {
          text += ` - ${segment.character}`
        }
        text += ` (${formatTime(segment.timestamp)} - ${formatDuration(segment.duration)})\n\n`
        text += `${segment.text}\n\n`
      })

      return text
    }

    // 下载脚本
    const downloadScript = (content, filename) => {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    }

    // 处理关闭
    const handleClose = () => {
      visible.value = false
      emit('close')
    }

    // 辅助函数
    const getSegmentClass = (segment) => {
      const classes = []
      if (segment.type === 'dialogue') classes.push('dialogue')
      if (segment.type === 'monologue') classes.push('monologue')
      if (highlightedSegments.value.has(segment.id)) classes.push('highlighted')
      return classes.join(' ')
    }

    const getSegmentTypeTag = (type) => {
      const typeMap = {
        narration: '',
        dialogue: 'primary',
        monologue: 'success'
      }
      return typeMap[type] || ''
    }

    const getSegmentTypeText = (type) => {
      const textMap = {
        narration: '叙述',
        dialogue: '对话',
        monologue: '独白'
      }
      return textMap[type] || type
    }

    const getCharacterName = (character) => {
      if (character === 'narrator') return '叙述者'
      return character
    }

    const getCharacterType = (type) => {
      const typeMap = {
        protagonist: 'primary',
        supporting: 'info',
        unknown: ''
      }
      return typeMap[type] || ''
    }

    const getCharacterTypeText = (type) => {
      const textMap = {
        protagonist: '主角',
        supporting: '配角',
        unknown: '未知'
      }
      return textMap[type] || type
    }

    const getEmotionText = (emotion) => {
      const textMap = {
        neutral: '中性',
        happy: '快乐',
        sad: '悲伤',
        angry: '愤怒',
        surprised: '惊讶',
        fear: '恐惧'
      }
      return textMap[emotion] || emotion
    }

    const formatTime = (timestamp) => {
      return timestamp.toFixed(2)
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
      scriptData,
      visible,
      voiceSummary,
      highlightedSegments,
      loadScriptData,
      highlightSegments,
      handleExport,
      handleClose,
      getSegmentClass,
      getSegmentTypeTag,
      getSegmentTypeText,
      getCharacterName,
      getCharacterType,
      getCharacterTypeText,
      getEmotionText,
      formatTime,
      formatDuration,
      formatDate
    }
  }
}
</script>

<style scoped>
.script-preview {
  max-height: 70vh;
  overflow-y: auto;
}

.preview-content {
  padding: 20px;
}

.script-header {
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

.characters-section {
  margin-bottom: 24px;
}

.character-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.character-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #f9f9f9;
}

.character-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.character-name {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.character-voice {
  display: flex;
  gap: 4px;
}

.script-sections {
  margin-bottom: 24px;
}

.segments-list {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  overflow: hidden;
}

.segment-item {
  border-bottom: 1px solid #f0f0f0;
  padding: 16px;
  transition: background-color 0.2s;
}

.segment-item:last-child {
  border-bottom: none;
}

.segment-item.highlighted {
  background-color: #fff7e6;
}

.segment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.segment-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.segment-number {
  font-weight: 600;
  color: #606266;
}

.segment-meta {
  color: #909399;
  display: flex;
  gap: 12px;
}

.segment-content {
  line-height: 1.6;
  color: #2c3e50;
  font-family: 'Microsoft YaHei', sans-serif;
}

.segment-item.dialogue .segment-content {
  border-left: 3px solid #409eff;
  padding-left: 12px;
}

.segment-item.monologue .segment-content {
  border-left: 3px solid #67c23a;
  padding-left: 12px;
  font-style: italic;
}

.voice-summary {
  margin-bottom: 24px;
}

.no-content {
  text-align: center;
  padding: 40px 0;
  color: #909399;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
</style>