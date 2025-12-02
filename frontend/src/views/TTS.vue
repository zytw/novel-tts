<template>
  <div class="tts-page">
    <div class="page-header">
      <h2>语音合成</h2>
      <div class="header-actions">
        <el-button @click="showSettingsDialog = true">
          <el-icon><Setting /></el-icon>
          TTS设置
        </el-button>
      </div>
    </div>

    <!-- TTS状态概览 -->
    <el-card class="status-overview" v-loading="loading">
      <template #header>
        <div class="overview-header">
          <span>TTS服务状态</span>
          <el-button @click="checkTTSStatus" size="small">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <div class="status-grid">
        <div class="status-item">
          <div class="status-label">服务状态</div>
          <el-tag :type="ttsStatus.initialized ? 'success' : 'danger'">
            {{ ttsStatus.initialized ? '已初始化' : '未初始化' }}
          </el-tag>
        </div>
        <div class="status-item">
          <div class="status-label">输出目录</div>
          <span class="status-value">{{ ttsStatus.outputDir || 'N/A' }}</span>
        </div>
        <div class="status-item">
          <div class="status-label">Python环境</div>
          <el-tag :type="ttsStatus.pythonPath ? 'success' : 'danger'">
            {{ ttsStatus.pythonPath ? '已配置' : '未配置' }}
          </el-tag>
        </div>
      </div>

      <div class="status-actions" v-if="!ttsStatus.initialized">
        <el-button type="primary" @click="initializeTTS" :loading="initializing">
          初始化TTS服务
        </el-button>
      </div>
    </el-card>

    <!-- 小说选择 -->
    <el-card class="novel-selection">
      <template #header>
        <span>选择小说</span>
      </template>

      <el-form :model="selectedNovel" label-width="100px">
        <el-form-item label="小说">
          <el-select
            v-model="selectedNovel.id"
            placeholder="请选择要生成语音的小说"
            style="width: 100%"
            @change="handleNovelChange"
          >
            <el-option
              v-for="novel in availableNovels"
              :key="novel.id"
              :label="novel.title"
              :value="novel.id"
            >
              <div class="novel-option">
                <div class="novel-info">
                  <span class="novel-title">{{ novel.title }}</span>
                  <span class="novel-status">{{ novel.status }}</span>
                </div>
                <div class="novel-stats">
                  字数: {{ novel.currentWordCount }}
                </div>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item v-if="selectedNovel.id && novelAudioStatus">
          <div class="novel-audio-status">
            <span class="status-label">音频状态: </span>
            <el-tag :type="getAudioStatusTag(novelAudioStatus.audioStatus)">
              {{ getAudioStatusText(novelAudioStatus.audioStatus) }}
            </el-tag>
            <span v-if="novelAudioStatus.audioGeneration" class="audio-info">
              时长: {{ formatDuration(novelAudioStatus.audioGeneration.duration) }}
              格式: {{ novelAudioStatus.audioGeneration.format }}
            </span>
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 快速操作 -->
    <el-card v-if="selectedNovel.id" class="quick-actions">
      <template #header>
        <span>快速操作</span>
      </template>

      <div class="action-buttons">
        <div class="generation-options">
          <el-checkbox v-model="generateSubtitles" label="同步生成SRT字幕" />
          <el-select v-if="generateSubtitles" v-model="subtitleFormat" placeholder="字幕格式" size="small" style="width: 120px; margin-left: 10px;">
            <el-option label="SRT" value="srt" />
            <el-option label="VTT" value="vtt" />
            <el-option label="两种格式" value="both" />
          </el-select>
        </div>

        <el-button
          type="success"
          size="large"
          @click="generateCompleteNovelAudio"
          :loading="generatingComplete"
          :disabled="!canGenerateComplete"
        >
          <el-icon><VideoPlay /></el-icon>
          {{ generateSubtitles ? '生成音频和字幕' : '生成完整小说音频' }}
        </el-button>

        <el-button
          v-if="novelAudioStatus && novelAudioStatus.audioStatus === 'completed'"
          @click="downloadCompleteAudio"
        >
          <el-icon><Download /></el-icon>
          下载完整音频
        </el-button>

        <el-button
          v-if="novelAudioStatus && novelAudioStatus.audioStatus === 'completed'"
          @click="playCompleteAudio"
        >
          <el-icon><Headset /></el-icon>
          播放完整音频
        </el-button>

        <el-button
          v-if="subtitleResult && subtitleResult.srtFile"
          @click="downloadSubtitles"
          type="primary"
          plain
        >
          <el-icon><Document /></el-icon>
          下载字幕文件
        </el-button>

        <el-button
          v-if="subtitleResult && subtitleResult.srtFile"
          @click="viewSubtitles"
          type="info"
          plain
        >
          <el-icon><View /></el-icon>
          查看字幕
        </el-button>
      </div>
    </el-card>

    <!-- TTS控制面板 -->
    <div v-if="selectedNovel.id" class="tts-control-panel">
      <!-- 段落列表 -->
      <el-card class="segments-panel">
        <template #header>
          <div class="segments-header">
            <span>脚本段落</span>
            <div class="header-actions">
              <el-button
                size="small"
                @click="selectAllSegments"
                :disabled="!segments.length"
              >
                全选
              </el-button>
              <el-button
                size="small"
                @click="clearSelection"
                :disabled="!selectedSegments.length"
              >
                清空
              </el-button>
            </div>
          </div>
        </template>

        <div class="segments-list">
          <div
            v-for="segment in segments"
            :key="segment.id"
            class="segment-item"
            :class="{ selected: selectedSegments.includes(segment.id) }"
          >
            <div class="segment-checkbox">
              <el-checkbox
                v-model="selectedSegments"
                :label="segment.id"
                @change="handleSegmentSelection"
              />
            </div>
            <div class="segment-info">
              <div class="segment-header">
                <span class="segment-number">#{{ segment.number }}</span>
                <el-tag :type="getSegmentTypeTag(segment.type)" size="small">
                  {{ getSegmentTypeText(segment.type) }}
                </el-tag>
                <el-tag v-if="segment.character !== 'narrator'" size="small">
                  {{ getCharacterName(segment.character) }}
                </el-tag>
              </div>
              <div class="segment-content">
                {{ segment.text }}
              </div>
              <div class="segment-meta">
                <span class="duration">时长: {{ formatDuration(segment.duration) }}</span>
                <span class="character" v-if="segment.character !== 'narrator'">
                  角色: {{ getCharacterName(segment.character) }}
                </span>
              </div>
            </div>
            <div class="segment-status">
              <el-tag
                v-if="getSegmentStatus(segment.id)"
                :type="getSegmentStatus(segment.id) === 'completed' ? 'success' : 'warning'"
                size="small"
              >
                {{ getSegmentStatusText(getSegmentStatus(segment.id)) }}
              </el-tag>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 音色配置 -->
      <el-card class="voice-config-panel">
        <template #header>
          <span>音色配置</span>
        </template>

        <div class="voice-configs">
          <!-- 叙述者音色 -->
          <div class="voice-item">
            <h4>叙述者</h4>
            <div class="voice-profile">
              <div class="profile-row">
                <label>语气:</label>
                <el-select v-model="voiceConfig.narrator.tone" size="small">
                  <el-option label="中性" value="neutral" />
                  <el-option label="温暖" value="warm" />
                  <el-option label="严肃" value="serious" />
                  <el-option label="愉快" value="cheerful" />
                  <el-option label="温和" value="gentle" />
                </el-select>
              </div>
              <div class="profile-row">
                <label>情感:</label>
                <el-select v-model="voiceConfig.narrator.emotion" size="small">
                  <el-option label="中性" value="neutral" />
                  <el-option label="平静" value="calm" />
                  <el-option label="友善" value="friendly" />
                  <el-option label="严肃" value="serious" />
                </el-select>
              </div>
              <div class="profile-row">
                <label>语速:</label>
                <el-select v-model="voiceConfig.narrator.speed" size="small">
                  <el-option label="慢速" value="slow" />
                  <el-option label="正常" value="normal" />
                  <el-option label="快速" value="fast" />
                </el-select>
              </div>
            </div>
          </div>

          <!-- 角色音色 -->
          <div
            v-for="character in characters"
            :key="character.id"
            class="voice-item"
          >
            <h4>{{ character.name }}</h4>
            <div class="voice-profile">
              <div class="profile-row">
                <label>语气:</label>
                <el-select v-model="character.voiceConfig.tone" size="small">
                  <el-option label="中性" value="neutral" />
                  <el-option label="温暖" value="warm" />
                  <el-option label="严肃" value="serious" />
                  <el-option label="愉快" value="cheerful" />
                  <el-option label="温和" value="gentle" />
                </el-select>
              </div>
              <div class="profile-row">
                <label>情感:</label>
                <el-select v-model="character.voiceConfig.emotion" size="small">
                  <el-option label="中性" value="neutral" />
                  <el-option label="快乐" value="happy" />
                  <el-option label="悲伤" value="sad" />
                  <el-option label="愤怒" value="angry" />
                  <el-option label="惊讶" value="surprised" />
                  <el-option label="恐惧" value="fear" />
                  <el-option label="平静" value="calm" />
                </el-select>
              </div>
              <div class="profile-row">
                <label>语速:</label>
                <el-select v-model="character.voiceConfig.speed" size="small">
                  <el-option label="慢速" value="slow" />
                  <el-option label="正常" value="normal" />
                  <el-option label="快速" value="fast" />
                </el-select>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 输出选项 -->
      <el-card class="output-options">
        <template #header>
          <span>输出选项</span>
        </template>

        <el-form :model="outputOptions" label-width="120px">
          <el-form-item label="音频格式">
            <el-radio-group v-model="outputOptions.format">
              <el-radio label="wav">WAV</el-radio>
              <el-radio label="mp3">MP3</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="音质">
            <el-radio-group v-model="outputOptions.quality">
              <el-radio label="low">低质量</el-radio>
              <el-radio label="medium">中等质量</el-radio>
              <el-radio label="high">高质量</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="合并输出">
            <el-switch v-model="outputOptions.merge" />
          </el-form-item>
          <el-form-item label="采样率" v-if="outputOptions.format === 'wav'">
            <el-select v-model="outputOptions.sampleRate">
              <el-option label="22050 Hz" :value="22050" />
              <el-option label="44100 Hz" :value="44100" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 操作按钮 -->
      <div class="action-panel">
        <el-button
          type="primary"
          size="large"
          @click="generateSpeech"
          :loading="generating"
          :disabled="!canGenerate"
        >
          <el-icon><Microphone /></el-icon>
          生成语音
        </el-button>
        <el-button
          v-if="audioHistory.length"
          @click="showAudioDialog = true"
        >
          <el-icon><Headset /></el-icon>
          查看音频
        </el-button>
      </div>

      <!-- 生成进度 -->
      <el-card v-if="generating" class="progress-panel">
        <template #header>
          <span>生成进度</span>
        </template>

        <div class="progress-content">
          <el-progress
            :percentage="generationProgress.percentage"
            :status="generationProgress.status"
          />
          <div class="progress-info">
            <span>{{ generationProgress.current }}/{{ generationProgress.total }}</span>
            <span v-if="generationProgress.currentSegment">
              当前: {{ generationProgress.currentSegment }}
            </span>
          </div>
        </div>
      </el-card>
    </div>

    <!-- TTS设置对话框 -->
    <el-dialog
      v-model="showSettingsDialog"
      title="TTS设置"
      width="600px"
    >
      <el-form :model="ttsSettings" label-width="120px">
        <el-form-item label="Python路径">
          <el-input
            v-model="ttsSettings.pythonPath"
            placeholder="Python可执行文件路径"
          />
        </el-form-item>
        <el-form-item label="输出目录">
          <el-input
            v-model="ttsSettings.outputDir"
            placeholder="音频文件输出目录"
          />
        </el-form-item>
        <el-form-item label="临时目录">
          <el-input
            v-model="ttsSettings.tempDir"
            placeholder="临时文件目录"
          />
        </el-form-item>
        <el-form-item label="GPU加速">
          <el-switch v-model="ttsSettings.useGPU" />
        </el-form-item>
        <el-form-item label="并行处理">
          <el-switch v-model="ttsSettings.parallel" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showSettingsDialog = false">取消</el-button>
        <el-button type="primary" @click="saveSettings">保存设置</el-button>
      </template>
    </el-dialog>

    <!-- 音频文件对话框 -->
    <el-dialog
      v-model="showAudioDialog"
      title="音频文件"
      width="80%"
    >
      <div class="audio-list">
        <div
          v-for="audio in audioHistory"
          :key="audio.id"
          class="audio-item"
        >
          <div class="audio-info">
            <div class="audio-name">{{ audio.filename }}</div>
            <div class="audio-meta">
              <span>大小: {{ formatFileSize(audio.size) }}</span>
              <span>创建时间: {{ formatDate(audio.created) }}</span>
            </div>
          </div>
          <div class="audio-actions">
            <el-button size="small" @click="playAudio(audio)">
              <el-icon><VideoPlay /></el-icon>
              播放
            </el-button>
            <el-button size="small" @click="downloadAudio(audio)">
              <el-icon><Download /></el-icon>
              下载
            </el-button>
            <el-button size="small" type="danger" @click="deleteAudio(audio)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showAudioDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 字幕预览对话框 -->
    <el-dialog
      v-model="showSubtitleDialog"
      title="字幕预览"
      width="90%"
      top="2vh"
    >
      <div class="subtitle-preview" v-if="subtitleContent">
        <div class="preview-controls">
          <el-select v-model="previewFormat" @change="loadSubtitleContent" size="small" style="width: 100px;">
            <el-option label="SRT" value="srt" />
            <el-option label="VTT" value="vtt" />
          </el-select>
          <el-button @click="copySubtitleContent" size="small" type="primary" plain>
            <el-icon><DocumentCopy /></el-icon>
            复制内容
          </el-button>
          <el-button @click="downloadCurrentSubtitle" size="small">
            <el-icon><Download /></el-icon>
            下载当前格式
          </el-button>
        </div>

        <div class="subtitle-content">
          <pre>{{ subtitleContent }}</pre>
        </div>

        <div class="subtitle-info" v-if="subtitleResult">
          <el-descriptions title="字幕信息" :column="2" border size="small">
            <el-descriptions-item label="文件格式">{{ previewFormat.toUpperCase() }}</el-descriptions-item>
            <el-descriptions-item label="段落数量">{{ subtitleResult.segmentsCount || 0 }}</el-descriptions-item>
            <el-descriptions-item label="总时长">{{ formatDuration(subtitleResult.totalDuration || 0) }}</el-descriptions-item>
            <el-descriptions-item label="文件大小">{{ formatFileSize(subtitleResult.fileSize || 0) }}</el-descriptions-item>
            <el-descriptions-item label="同步准确性" :span="2">
              <el-tag :type="subtitleValidation?.isAccurate ? 'success' : 'warning'">
                {{ subtitleValidation?.isAccurate ? '精确同步' : '可能存在偏差' }}
              </el-tag>
              <span v-if="subtitleValidation?.statistics?.issues" style="margin-left: 10px;">
                发现 {{ subtitleValidation.statistics.issues }} 个时间轴问题
              </span>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <template #footer>
        <el-button @click="showSubtitleDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Setting,
  Refresh,
  Microphone,
  Headset,
  VideoPlay,
  Download,
  Delete
} from '@element-plus/icons-vue'
import { useNovelStore } from '../store/novel'
import { useAnalysisStore } from '../store/analysis'

export default {
  name: 'TTS',
  components: {
    Setting,
    Refresh,
    Microphone,
    Headset,
    VideoPlay,
    Download,
    Delete
  },
  setup() {
    const novelStore = useNovelStore()
    const analysisStore = useAnalysisStore()

    // 响应式数据
    const loading = ref(false)
    const initializing = ref(false)
    const generating = ref(false)
    const generatingComplete = ref(false)
    const showSettingsDialog = ref(false)
    const showAudioDialog = ref(false)
    const showSubtitleDialog = ref(false)

    // 字幕相关状态
    const generateSubtitles = ref(true)
    const subtitleFormat = ref('srt')
    const previewFormat = ref('srt')
    const subtitleResult = ref(null)
    const subtitleContent = ref('')
    const subtitleValidation = ref(null)

    const selectedNovel = ref({ id: '', title: '' })
    const segments = ref([])
    const selectedSegments = ref([])
    const characters = ref([])
    const novelAudioStatus = ref(null)
    const voiceConfig = ref({
      narrator: {
        tone: 'neutral',
        emotion: 'calm',
        speed: 'normal'
      }
    })

    const outputOptions = ref({
      format: 'wav',
      quality: 'medium',
      merge: true,
      sampleRate: 22050
    })

    const ttsStatus = ref({
      initialized: false,
      outputDir: '',
      tempDir: '',
      pythonPath: ''
    })

    const ttsSettings = ref({
      pythonPath: '',
      outputDir: '',
      tempDir: '',
      useGPU: true,
      parallel: true
    })

    const generationProgress = ref({
      percentage: 0,
      current: 0,
      total: 0,
      currentSegment: '',
      status: ''
    })

    const audioHistory = ref([])

    // 计算属性
    const availableNovels = computed(() => {
      return analysisStore.analysisHistory.filter(
        analysis => analysis.status === 'completed' && analysis.ttsScript
      )
    })

    const canGenerate = computed(() => {
      return selectedNovel.value.id &&
             selectedSegments.value.length > 0 &&
             ttsStatus.value.initialized &&
             !generating.value
    })

    const canGenerateComplete = computed(() => {
      return selectedNovel.value.id &&
             ttsStatus.value.initialized &&
             !generating.value &&
             !generatingComplete.value
    })

    // 方法
    const initializeTTS = async () => {
      initializing.value = true
      try {
        const response = await fetch('/api/tts/initialize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        const result = await response.json()
        if (result.success) {
          ElMessage.success('TTS服务初始化成功')
          ttsStatus.value = result.data
        } else {
          ElMessage.error(result.error || '初始化失败')
        }
      } catch (error) {
        console.error('初始化TTS服务失败:', error)
        ElMessage.error('初始化TTS服务失败')
      } finally {
        initializing.value = false
      }
    }

    const checkTTSStatus = async () => {
      try {
        const response = await fetch('/api/tts/status')
        const result = await response.json()
        if (result.success) {
          ttsStatus.value = result.data
        }
      } catch (error) {
        console.error('获取TTS状态失败:', error)
      }
    }

    const handleNovelChange = async (novelId) => {
      if (!novelId) {
        segments.value = []
        selectedSegments.value = []
        characters.value = []
        novelAudioStatus.value = null
        return
      }

      loading.value = true
      try {
        // 获取小说分析结果
        const analysis = analysisStore.getAnalysisById(novelId)
        if (analysis && analysis.ttsScript) {
          segments.value = analysis.ttsScript.segments.map((segment, index) => ({
            ...segment,
            number: index + 1,
            status: 'pending'
          }))

          characters.value = analysis.ttsScript.characters.map(character => ({
            ...character,
            voiceConfig: {
              tone: 'neutral',
              emotion: 'neutral',
              speed: 'normal'
            }
          }))

          // 加载音色配置
          if (analysis.voiceConfiguration) {
            loadVoiceConfig(analysis.voiceConfiguration)
          }

          // 获取小说音频状态
          await loadNovelAudioStatus(novelId)

          // 加载音频历史
          await loadAudioHistory(novelId)
        }
      } catch (error) {
        console.error('加载小说数据失败:', error)
        ElMessage.error('加载小说数据失败')
      } finally {
        loading.value = false
      }
    }

    const loadVoiceConfig = (voiceConfiguration) => {
      if (voiceConfiguration.voice_configuration) {
        const config = voiceConfiguration.voice_configuration

        // 加载叙述者配置
        if (config.narrator) {
          voiceConfig.value.narrator = {
            tone: config.narrator.voice_profile?.tone || 'neutral',
            emotion: config.narrator.voice_profile?.emotion || 'calm',
            speed: config.narrator.voice_profile?.speed || 'normal'
          }
        }

        // 加载角色配置
        if (config.characters) {
          config.characters.forEach(char => {
            const character = characters.value.find(c => c.id === char.character_id)
            if (character) {
              character.voiceConfig = {
                tone: char.voice_profile?.tone || 'neutral',
                emotion: char.voice_profile?.emotion || 'neutral',
                speed: char.voice_profile?.speed || 'normal'
              }
            }
          })
        }
      }
    }

    const loadAudioHistory = async (novelId) => {
      try {
        const response = await fetch(`/api/tts/history/${novelId}`)
        const result = await response.json()
        if (result.success) {
          audioHistory.value = result.data.audioFiles
        }
      } catch (error) {
        console.error('加载音频历史失败:', error)
      }
    }

    const loadNovelAudioStatus = async (novelId) => {
      try {
        const response = await fetch(`/api/analysis/novels/${novelId}/analysis`)
        const result = await response.json()
        if (result.success && result.data.novel) {
          novelAudioStatus.value = result.data.novel
        }
      } catch (error) {
        console.error('加载小说音频状态失败:', error)
      }
    }

    const selectAllSegments = () => {
      selectedSegments.value = segments.value.map(segment => segment.id)
    }

    const clearSelection = () => {
      selectedSegments.value = []
    }

    const handleSegmentSelection = () => {
      // 处理选择变化
    }

    const generateSpeech = async () => {
      if (!canGenerate.value) return

      generating.value = true
      generationProgress.value = {
        percentage: 0,
        current: 0,
        total: selectedSegments.value.length,
        currentSegment: '',
        status: 'active'
      }

      try {
        // 准备生成参数
        const selectedSegmentsData = segments.value.filter(segment =>
          selectedSegments.value.includes(segment.id)
        )

        const payload = {
          novelId: selectedNovel.value.id,
          segments: selectedSegmentsData,
          voiceConfig: {
            narrator: voiceConfig.value.narrator,
            characters: characters.value.map(character => ({
              character_id: character.id,
              character_name: character.name,
              voice_profile: {
                tone: character.voiceConfig.tone,
                emotion: character.voiceConfig.emotion,
                speed: character.voiceConfig.speed
              }
            }))
          },
          outputOptions: {
            format: outputOptions.value.format,
            quality: outputOptions.value.quality,
            merge: outputOptions.value.merge,
            sampleRate: outputOptions.value.sampleRate
          }
        }

        const response = await fetch('/api/tts/batch-generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        const result = await response.json()
        if (result.success) {
          ElMessage.success(`语音生成完成！成功: ${result.data.successCount}, 失败: ${result.data.failureCount}`)

          // 更新段落状态
          result.data.results.forEach(result => {
            const segment = segments.value.find(s => s.id === result.segmentId)
            if (segment) {
              segment.status = result.status
            }
          })

          // 重新加载音频历史
          await loadAudioHistory(selectedNovel.value.id)
        } else {
          ElMessage.error(result.error || '语音生成失败')
        }
      } catch (error) {
        console.error('语音生成失败:', error)
        ElMessage.error('语音生成失败')
      } finally {
        generating.value = false
        generationProgress.value = {
          percentage: 0,
          current: 0,
          total: 0,
          currentSegment: '',
          status: ''
        }
      }
    }

    const playAudio = (audio) => {
      // 实现音频播放功能
      const audioPath = `/api/tts/download/${audio.id}`
      window.open(audioPath, '_blank')
    }

    const downloadAudio = (audio) => {
      // 实现音频下载功能
      const audioPath = `/api/tts/download/${audio.id}`
      const link = document.createElement('a')
      link.href = audioPath
      link.download = audio.filename
      link.click()
    }

    const deleteAudio = async (audio) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除音频文件 "${audio.filename}"吗？`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        const response = await fetch(`/api/tts/audio/${audio.id}`, {
          method: 'DELETE'
        })

        const result = await response.json()
        if (result.success) {
          ElMessage.success('删除成功')
          // 重新加载音频历史
          await loadAudioHistory(selectedNovel.value.id)
        } else {
          ElMessage.error(result.error || '删除失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除失败')
        }
      }
    }

    const saveSettings = async () => {
      try {
        // 保存设置到本地存储或后端
        localStorage.setItem('ttsSettings', JSON.stringify(ttsSettings.value))
        ElMessage.success('设置保存成功')
        showSettingsDialog.value = false
      } catch (error) {
        ElMessage.error('设置保存失败')
      }
    }

    const generateCompleteNovelAudio = async () => {
      generatingComplete.value = true

      try {
        let response

        if (generateSubtitles.value) {
          // 使用同步生成音频和字幕的接口
          response = await fetch(`/api/tts/generate-with-subtitles/${selectedNovel.value.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ttsScript: novelAudioStatus.value?.ttsScript || await getTTSScript(),
              subtitleOptions: {
                outputFormat: subtitleFormat.value,
                encoding: 'utf-8',
                syncMode: 'accurate'
              },
              audioOptions: {
                format: outputOptions.value.format,
                quality: outputOptions.value.quality,
                sampleRate: outputOptions.value.sampleRate
              }
            })
          })
        } else {
          // 仅生成音频
          response = await fetch(`/api/tts/generate-novel/${selectedNovel.value.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              options: {
                format: outputOptions.value.format,
                quality: outputOptions.value.quality,
                sampleRate: outputOptions.value.sampleRate
              }
            })
          })
        }

        const result = await response.json()
        if (result.success) {
          if (generateSubtitles.value) {
            // 处理音频和字幕生成结果
            const { audio, subtitles, synchronization } = result.data

            ElMessage.success(`音频和字幕生成完成！音频时长: ${formatDuration(audio.duration)}, 同步准确性: ${synchronization.isAccurate ? '精确' : '有偏差'}`)

            // 更新音频状态
            novelAudioStatus.value = {
              audioStatus: 'completed',
              audioFile: audio.audioFile,
              duration: audio.duration,
              segments: audio.segments
            }

            // 保存字幕结果
            subtitleResult.value = subtitles
            subtitleValidation.value = synchronization

            // 重新加载小说音频状态
            await loadNovelAudioStatus(selectedNovel.value.id)

            // 重新加载音频历史
            await loadAudioHistory(selectedNovel.value.id)
          } else {
            // 仅音频生成结果
            ElMessage.success(`完整小说音频生成完成！时长: ${formatDuration(result.data.duration)}`)

            // 重新加载小说音频状态
            await loadNovelAudioStatus(selectedNovel.value.id)

            // 重新加载音频历史
            await loadAudioHistory(selectedNovel.value.id)
          }
        } else {
          ElMessage.error(result.error || '生成失败')
        }
      } catch (error) {
        console.error('生成失败:', error)
        ElMessage.error('生成失败，请检查网络连接')
      } finally {
        generatingComplete.value = false
      }
    }

    const downloadCompleteAudio = () => {
      if (novelAudioStatus.value && novelAudioStatus.value.audioGeneration) {
        const audioFile = novelAudioStatus.value.audioGeneration.audioFile
        const fileName = audioFile.split('/').pop() // Get basename
        const fileExt = fileName.split('.').pop() // Get extension
        const link = document.createElement('a')
        link.href = `/api/tts/download/${fileName}`
        link.download = `${selectedNovel.value.title}_完整音频.${fileExt}`
        link.click()
      }
    }

    const playCompleteAudio = () => {
      if (novelAudioStatus.value && novelAudioStatus.value.audioGeneration) {
        const audioFile = novelAudioStatus.value.audioGeneration.audioFile
        const fileName = audioFile.split('/').pop() // Get basename
        const audioPath = `/api/tts/download/${fileName}`
        window.open(audioPath, '_blank')
      }
    }

    // 辅助函数
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
      const characterData = characters.value.find(c => c.id === character)
      return characterData ? characterData.name : character
    }

    const getSegmentStatus = (segmentId) => {
      const segment = segments.value.find(s => s.id === segmentId)
      return segment ? segment.status : null
    }

    const getSegmentStatusText = (status) => {
      const statusMap = {
        pending: '待生成',
        processing: '生成中',
        completed: '已完成',
        failed: '生成失败'
      }
      return statusMap[status] || status
    }

    const formatDuration = (seconds) => {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = Math.floor(seconds % 60)
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString('zh-CN')
    }

    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    // 字幕相关方法
    const getTTSScript = async () => {
      try {
        const response = await fetch(`/api/analysis/tts-script/${selectedNovel.value.id}`)
        const result = await response.json()
        return result.success ? result.data.ttsScript : null
      } catch (error) {
        console.error('获取TTS脚本失败:', error)
        return null
      }
    }

    const viewSubtitles = async () => {
      if (!subtitleResult.value) return

      showSubtitleDialog.value = true
      await loadSubtitleContent()
    }

    const downloadSubtitles = () => {
      if (!subtitleResult.value) return

      const { srtFile, vttFile } = subtitleResult.value
      const format = subtitleFormat.value

      let downloadUrl, filename
      if (format === 'srt' && srtFile) {
        downloadUrl = `/api/subtitle/download/${srtFile.split('/').pop()}`
        filename = `subtitles_${selectedNovel.value.id}.srt`
      } else if (format === 'vtt' && vttFile) {
        downloadUrl = `/api/subtitle/download/${vttFile.split('/').pop()}`
        filename = `subtitles_${selectedNovel.value.id}.vtt`
      } else {
        ElMessage.error('当前格式的字幕文件不存在')
        return
      }

      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      link.click()
    }

    const downloadCurrentSubtitle = () => {
      if (!subtitleContent.value) return

      const blob = new Blob([subtitleContent.value], {
        type: previewFormat.value === 'srt' ? 'text/plain' : 'text/vtt'
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `subtitles_${selectedNovel.value.id}.${previewFormat.value}`
      link.click()
      URL.revokeObjectURL(url)
    }

    const copySubtitleContent = async () => {
      if (!subtitleContent.value) return

      try {
        await navigator.clipboard.writeText(subtitleContent.value)
        ElMessage.success('字幕内容已复制到剪贴板')
      } catch (error) {
        console.error('复制失败:', error)
        ElMessage.error('复制失败')
      }
    }

    const loadSubtitleContent = async () => {
      if (!subtitleResult.value) return

      try {
        const format = previewFormat.value
        const filename = format === 'srt' ? subtitleResult.value.srtFile?.split('/').pop() : subtitleResult.value.vttFile?.split('/').pop()

        if (!filename) {
          ElMessage.error(`${format.toUpperCase()}格式字幕文件不存在`)
          return
        }

        const response = await fetch(`/api/subtitle/content/${filename}`)
        const result = await response.json()

        if (result.success) {
          subtitleContent.value = result.data.content
        } else {
          ElMessage.error('加载字幕内容失败')
        }
      } catch (error) {
        console.error('加载字幕内容失败:', error)
        ElMessage.error('加载字幕内容失败')
      }
    }

    const getAudioStatusTag = (status) => {
      const statusMap = {
        not_started: 'info',
        processing: 'warning',
        completed: 'success',
        failed: 'danger'
      }
      return statusMap[status] || 'info'
    }

    const getAudioStatusText = (status) => {
      const textMap = {
        not_started: '未开始',
        processing: '处理中',
        completed: '已完成',
        failed: '生成失败'
      }
      return textMap[status] || status
    }

    // 监听器
    watch(ttsSettings, (newSettings) => {
      // 设置变化时的处理
    }, { deep: true })

    // 生命周期
    onMounted(async () => {
      // 加载设置
      const savedSettings = localStorage.getItem('ttsSettings')
      if (savedSettings) {
        Object.assign(ttsSettings.value, JSON.parse(savedSettings))
      }

      // 检查TTS状态
      await checkTTSStatus()
    })

    return {
      loading,
      initializing,
      generating,
      generatingComplete,
      showSettingsDialog,
      showAudioDialog,
      selectedNovel,
      segments,
      selectedSegments,
      characters,
      novelAudioStatus,
      voiceConfig,
      outputOptions,
      ttsStatus,
      ttsSettings,
      generationProgress,
      audioHistory,
      availableNovels,
      canGenerate,
      canGenerateComplete,
      initializeTTS,
      checkTTSStatus,
      handleNovelChange,
      loadNovelAudioStatus,
      selectAllSegments,
      clearSelection,
      handleSegmentSelection,
      generateSpeech,
      generateCompleteNovelAudio,
      playAudio,
      downloadAudio,
      deleteAudio,
      downloadCompleteAudio,
      playCompleteAudio,
      saveSettings,
      getSegmentTypeTag,
      getSegmentTypeText,
      getCharacterName,
      getSegmentStatus,
      getSegmentStatusText,
      getAudioStatusTag,
      getAudioStatusText,
      formatDuration,
      formatDate,
      formatFileSize,
      // 字幕相关方法
      viewSubtitles,
      downloadSubtitles,
      downloadCurrentSubtitle,
      copySubtitleContent,
      loadSubtitleContent,
      getTTSScript
    }
  }
}
</script>

<style scoped>
.tts-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #333;
}

.status-overview {
  margin-bottom: 20px;
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-label {
  font-weight: 600;
  color: #606266;
}

.status-value {
  color: #2c3e50;
  word-break: break-all;
}

.status-actions {
  text-align: center;
}

.novel-selection {
  margin-bottom: 20px;
}

.novel-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.novel-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.novel-title {
  font-weight: 600;
  color: #2c3e50;
}

.novel-status {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.novel-stats {
  font-size: 12px;
  color: #606266;
}

.tts-control-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.segments-panel,
.voice-config-panel,
.output-options,
.progress-panel {
  margin-bottom: 20px;
}

.segments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.segments-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
}

.segment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.segment-item:last-child {
  border-bottom: none;
}

.segment-item.selected {
  background-color: #f0f9ff;
}

.segment-checkbox {
  flex-shrink: 0;
}

.segment-info {
  flex: 1;
  min-width: 0;
}

.segment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.segment-number {
  font-weight: 600;
  color: #606266;
}

.segment-content {
  color: #2c3e50;
  line-height: 1.4;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.segment-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #909399;
}

.segment-status {
  flex-shrink: 0;
}

.voice-configs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.voice-item {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 16px;
}

.voice-item h4 {
  margin: 0 0 12px 0;
  color: #2c3e50;
}

.voice-profile {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-row label {
  min-width: 60px;
  font-weight: 500;
  color: #606266;
}

.action-panel {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin: 20px 0;
}

.progress-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #606266;
}

.audio-list {
  max-height: 400px;
  overflow-y: auto;
}

.audio-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.audio-item:last-child {
  border-bottom: none;
}

.audio-info {
  flex: 1;
}

.audio-name {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.audio-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
}

.audio-actions {
  display: flex;
  gap: 8px;
}

.novel-audio-status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.status-label {
  font-weight: 500;
  color: #606266;
}

.audio-info {
  font-size: 12px;
  color: #909399;
}

.quick-actions {
  margin-bottom: 20px;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.action-buttons .el-button {
  margin: 4px;
}

.generation-options {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  gap: 16px;
}

.subtitle-preview {
  max-height: 70vh;
  overflow-y: auto;
}

.preview-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.subtitle-content {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.subtitle-content pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.subtitle-info {
  margin-top: 16px;
}
</style>
