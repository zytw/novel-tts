<template>
  <div class="subtitle-management">
    <div class="page-header">
      <h1>字幕管理</h1>
      <p>生成和管理SRT字幕文件，支持与TTS语音合成同步</p>
    </div>

    <el-row :gutter="20">
      <!-- 左侧：字幕生成面板 -->
      <el-col :span="16">
        <el-card class="subtitle-generator">
          <template #header>
            <div class="card-header">
              <span>字幕生成</span>
              <el-button
                type="primary"
                @click="showGenerateDialog = true"
                :disabled="!selectedSegments.length"
              >
                生成字幕
              </el-button>
            </div>
          </template>

          <!-- 小说选择 -->
          <div class="novel-selection">
            <el-form :inline="true">
              <el-form-item label="选择小说:">
                <el-select
                  v-model="selectedNovelId"
                  placeholder="请选择小说"
                  @change="handleNovelChange"
                  style="width: 300px"
                >
                  <el-option
                    v-for="novel in novels"
                    :key="novel.id"
                    :label="novel.title"
                    :value="novel.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button @click="loadNovels" :loading="loadingNovels">
                  刷新小说列表
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <!-- 文本段落列表 -->
          <div class="segments-container" v-if="selectedNovelId">
            <div class="segments-header">
              <h3>文本段落</h3>
              <div class="segments-actions">
                <el-button
                  size="small"
                  @click="selectAllSegments"
                >
                  全选
                </el-button>
                <el-button
                  size="small"
                  @click="clearSegments"
                >
                  清空选择
                </el-button>
              </div>
            </div>

            <el-table
              :data="segments"
              @selection-change="handleSegmentSelection"
              max-height="400"
            >
              <el-table-column type="selection" width="55" />
              <el-table-column prop="id" label="段落ID" width="100" />
              <el-table-column prop="character" label="角色" width="120">
                <template #default="{ row }">
                  <el-tag
                    :type="getCharacterTagType(row.character)"
                    size="small"
                  >
                    {{ row.character || '叙述者' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="text" label="文本内容" min-width="300">
                <template #default="{ row }">
                  <el-tooltip :content="row.text" placement="top">
                    <div class="text-ellipsis">{{ row.text }}</div>
                  </el-tooltip>
                </template>
              </el-table-column>
              <el-table-column prop="emotion" label="情感" width="100">
                <template #default="{ row }">
                  <el-tag size="small">{{ row.emotion || '中性' }}</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>

        <!-- 字幕文件列表 -->
        <el-card class="subtitle-files" style="margin-top: 20px">
          <template #header>
            <div class="card-header">
              <span>字幕文件</span>
              <el-button @click="loadSubtitleFiles" :loading="loadingFiles">
                刷新
              </el-button>
            </div>
          </template>

          <el-table :data="subtitleFiles" v-loading="loadingFiles">
            <el-table-column prop="filename" label="文件名" min-width="200">
              <template #default="{ row }">
                <div class="filename-cell">
                  <el-icon><Document /></el-icon>
                  <span>{{ row.filename }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="format" label="格式" width="80">
              <template #default="{ row }">
                <el-tag :type="row.format === 'srt' ? 'success' : 'info'" size="small">
                  {{ row.format.toUpperCase() }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="size" label="大小" width="100">
              <template #default="{ row }">
                {{ formatFileSize(row.size) }}
              </template>
            </el-table-column>
            <el-table-column prop="created" label="创建时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.created) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button
                  size="small"
                  type="primary"
                  @click="previewSubtitle(row)"
                >
                  预览
                </el-button>
                <el-button
                  size="small"
                  type="success"
                  @click="downloadSubtitle(row)"
                >
                  下载
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  @click="deleteSubtitle(row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 右侧：统计和设置 -->
      <el-col :span="8">
        <!-- 字幕统计 -->
        <el-card class="subtitle-stats">
          <template #header>
            <span>统计信息</span>
          </template>

          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ subtitleStats.totalFiles }}</div>
              <div class="stat-label">字幕文件数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ formatFileSize(subtitleStats.totalSize) }}</div>
              <div class="stat-label">总文件大小</div>
            </div>
          </div>

          <el-divider />

          <div class="format-stats">
            <h4>格式分布</h4>
            <div class="format-item" v-for="(count, format) in subtitleStats.formats" :key="format">
              <el-tag :type="format === 'srt' ? 'success' : 'info'" size="small">
                {{ format.toUpperCase() }}
              </el-tag>
              <span class="format-count">{{ count }}</span>
            </div>
          </div>
        </el-card>

        <!-- 字幕设置 -->
        <el-card class="subtitle-settings" style="margin-top: 20px">
          <template #header>
            <span>字幕设置</span>
          </template>

          <el-form :model="subtitleOptions" label-width="120px" size="small">
            <el-form-item label="格式:">
              <el-select v-model="subtitleOptions.format" style="width: 100%">
                <el-option label="SRT" value="srt" />
                <el-option label="WebVTT" value="vtt" />
              </el-select>
            </el-form-item>

            <el-form-item label="字符编码:">
              <el-select v-model="subtitleOptions.encoding" style="width: 100%">
                <el-option label="UTF-8" value="utf-8" />
                <el-option label="GBK" value="gbk" />
                <el-option label="UTF-16" value="utf-16" />
              </el-select>
            </el-form-item>

            <el-form-item label="每行字符数:">
              <el-input-number
                v-model="subtitleOptions.maxCharsPerLine"
                :min="20"
                :max="80"
                style="width: 100%"
              />
            </el-form-item>

            <el-form-item label="最大行数:">
              <el-input-number
                v-model="subtitleOptions.maxLinesPerSubtitle"
                :min="1"
                :max="4"
                style="width: 100%"
              />
            </el-form-item>

            <el-form-item label="最小时长:">
              <el-input-number
                v-model="subtitleOptions.minDuration"
                :min="500"
                :max="3000"
                :step="100"
                style="width: 100%"
              >
                <template #suffix>ms</template>
              </el-input-number>
            </el-form-item>

            <el-form-item label="最大时长:">
              <el-input-number
                v-model="subtitleOptions.maxDuration"
                :min="3000"
                :max="15000"
                :step="500"
                style="width: 100%"
              >
                <template #suffix>ms</template>
              </el-input-number>
            </el-form-item>

            <el-form-item label="阅读速度:">
              <el-input-number
                v-model="subtitleOptions.readingSpeed"
                :min="2"
                :max="10"
                :step="0.5"
                style="width: 100%"
              >
                <template #suffix>字/秒</template>
              </el-input-number>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <!-- 生成字幕对话框 -->
    <el-dialog
      v-model="showGenerateDialog"
      title="生成字幕"
      width="600px"
      @close="resetGenerateDialog"
    >
      <div class="generate-dialog-content">
        <el-alert
          v-if="selectedSegments.length === 0"
          title="请先选择要生成字幕的文本段落"
          type="warning"
          :closable="false"
        />

        <div v-else>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="选定段落数">
              {{ selectedSegments.length }}
            </el-descriptions-item>
            <el-descriptions-item label="输出格式">
              {{ subtitleOptions.format.toUpperCase() }}
            </el-descriptions-item>
            <el-descriptions-item label="字符编码">
              {{ subtitleOptions.encoding.toUpperCase() }}
            </el-descriptions-item>
            <el-descriptions-item label="预计字幕数">
              {{ estimateSubtitleCount() }}
            </el-descriptions-item>
          </el-descriptions>

          <div class="preview-section" style="margin-top: 20px">
            <h4>预览选中文本</h4>
            <el-table :data="selectedSegments.slice(0, 3)" max-height="200">
              <el-table-column prop="character" label="角色" width="100" />
              <el-table-column prop="text" label="文本内容" />
            </el-table>
            <div v-if="selectedSegments.length > 3" class="preview-more">
              还有 {{ selectedSegments.length - 3 }} 个段落...
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showGenerateDialog = false">取消</el-button>
        <el-button
          type="primary"
          @click="generateSubtitles"
          :loading="generating"
          :disabled="selectedSegments.length === 0"
        >
          生成字幕
        </el-button>
      </template>
    </el-dialog>

    <!-- 字幕预览对话框 -->
    <el-dialog
      v-model="showPreviewDialog"
      :title="`字幕预览 - ${currentSubtitle?.filename}`"
      width="80%"
      fullscreen
    >
      <div class="preview-dialog-content" v-loading="previewLoading">
        <div class="preview-header">
          <div class="preview-info">
            <el-tag :type="currentSubtitle?.format === 'srt' ? 'success' : 'info'">
              {{ currentSubtitle?.format?.toUpperCase() }}
            </el-tag>
            <span>文件大小: {{ formatFileSize(currentSubtitle?.size) }}</span>
            <span>创建时间: {{ formatDate(currentSubtitle?.created) }}</span>
          </div>
          <div class="preview-actions">
            <el-button @click="downloadSubtitle(currentSubtitle)" type="primary">
              下载
            </el-button>
          </div>
        </div>

        <el-divider />

        <div class="subtitle-preview" v-if="previewData.subtitles">
          <div class="preview-controls">
            <el-form :inline="true">
              <el-form-item label="时间偏移:">
                <el-input-number
                  v-model="previewTimeOffset"
                  :min="-60"
                  :max="60"
                  @change="updatePreview"
                >
                  <template #suffix>秒</template>
                </el-input-number>
              </el-form-item>
              <el-form-item label="播放速度:">
                <el-input-number
                  v-model="previewPlaybackSpeed"
                  :min="0.5"
                  :max="2"
                  :step="0.1"
                  @change="updatePreview"
                />
              </el-form-item>
            </el-form>
          </div>

          <div class="subtitle-list">
            <div
              v-for="(subtitle, index) in previewData.subtitles"
              :key="index"
              class="subtitle-item"
            >
              <div class="subtitle-number">{{ subtitle.index }}</div>
              <div class="subtitle-time">
                {{ formatTime(subtitle.startTime) }} --> {{ formatTime(subtitle.endTime) }}
              </div>
              <div class="subtitle-text">{{ subtitle.text }}</div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document } from '@element-plus/icons-vue'

export default {
  name: 'SubtitleView',
  components: {
    Document
  },
  setup() {
    // 响应式数据
    const novels = ref([])
    const segments = ref([])
    const selectedNovelId = ref('')
    const selectedSegments = ref([])
    const subtitleFiles = ref([])
    const loadingNovels = ref(false)
    const loadingFiles = ref(false)
    const generating = ref(false)

    // 对话框状态
    const showGenerateDialog = ref(false)
    const showPreviewDialog = ref(false)

    // 字幕选项
    const subtitleOptions = reactive({
      format: 'srt',
      encoding: 'utf-8',
      maxCharsPerLine: 40,
      maxLinesPerSubtitle: 2,
      minDuration: 1000,
      maxDuration: 7000,
      readingSpeed: 4,
      fadeInDuration: 0,
      fadeOutDuration: 0
    })

    // 统计数据
    const subtitleStats = reactive({
      totalFiles: 0,
      totalSize: 0,
      formats: {}
    })

    // 预览数据
    const currentSubtitle = ref(null)
    const previewData = reactive({
      subtitles: [],
      validation: null
    })
    const previewTimeOffset = ref(0)
    const previewPlaybackSpeed = ref(1)
    const previewLoading = ref(false)

    // 计算属性
    const estimateSubtitleCount = () => {
      return selectedSegments.value.reduce((count, segment) => {
        const textLength = segment.text.length
        const estimatedCount = Math.ceil(textLength / (subtitleOptions.maxCharsPerLine * subtitleOptions.maxLinesPerSubtitle))
        return count + estimatedCount
      }, 0)
    }

    // 方法
    const loadNovels = async () => {
      loadingNovels.value = true
      try {
        const response = await fetch('/api/novel/list')
        const result = await response.json()

        if (result.success) {
          novels.value = result.data.novels
        } else {
          ElMessage.error('加载小说列表失败')
        }
      } catch (error) {
        console.error('加载小说列表失败:', error)
        ElMessage.error('加载小说列表失败')
      } finally {
        loadingNovels.value = false
      }
    }

    const loadSubtitleFiles = async () => {
      loadingFiles.value = true
      try {
        const response = await fetch('/api/subtitle/files')
        const result = await response.json()

        if (result.success) {
          subtitleFiles.value = result.data.files
          await loadSubtitleStats()
        } else {
          ElMessage.error('加载字幕文件失败')
        }
      } catch (error) {
        console.error('加载字幕文件失败:', error)
        ElMessage.error('加载字幕文件失败')
      } finally {
        loadingFiles.value = false
      }
    }

    const loadSubtitleStats = async () => {
      try {
        const response = await fetch('/api/subtitle/stats')
        const result = await response.json()

        if (result.success) {
          Object.assign(subtitleStats, result.data)
        }
      } catch (error) {
        console.error('加载统计信息失败:', error)
      }
    }

    const handleNovelChange = async (novelId) => {
      if (!novelId) {
        segments.value = []
        selectedSegments.value = []
        return
      }

      try {
        const response = await fetch(`/api/analysis/segments/${novelId}`)
        const result = await response.json()

        if (result.success) {
          segments.value = result.data.segments
        } else {
          ElMessage.error('加载段落数据失败')
        }
      } catch (error) {
        console.error('加载段落数据失败:', error)
        ElMessage.error('加载段落数据失败')
      }
    }

    const handleSegmentSelection = (selection) => {
      selectedSegments.value = selection
    }

    const selectAllSegments = () => {
      // 这里需要访问table组件的内部方法，暂时用模拟实现
      ElMessage.info('全选功能需要表格组件支持')
    }

    const clearSegments = () => {
      selectedSegments.value = []
    }

    const getCharacterTagType = (character) => {
      const types = {
        narrator: 'info',
        protagonist: 'success',
        antagonist: 'danger',
        friend: 'warning'
      }
      return types[character] || 'primary'
    }

    const generateSubtitles = async () => {
      if (selectedSegments.value.length === 0) {
        ElMessage.warning('请先选择要生成字幕的段落')
        return
      }

      generating.value = true
      try {
        const response = await fetch('/api/subtitle/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            segments: selectedSegments.value,
            options: subtitleOptions
          })
        })

        const result = await response.json()

        if (result.success) {
          ElMessage.success('字幕生成成功')
          showGenerateDialog.value = false
          await loadSubtitleFiles()
        } else {
          ElMessage.error(result.error || '字幕生成失败')
        }
      } catch (error) {
        console.error('字幕生成失败:', error)
        ElMessage.error('字幕生成失败')
      } finally {
        generating.value = false
      }
    }

    const previewSubtitle = async (subtitle) => {
      currentSubtitle.value = subtitle
      previewLoading.value = true

      try {
        const response = await fetch(`/api/subtitle/files/${subtitle.filename}/preview`)
        const result = await response.json()

        if (result.success) {
          Object.assign(previewData, result.data)
          showPreviewDialog.value = true
        } else {
          ElMessage.error('预览字幕失败')
        }
      } catch (error) {
        console.error('预览字幕失败:', error)
        ElMessage.error('预览字幕失败')
      } finally {
        previewLoading.value = false
      }
    }

    const downloadSubtitle = async (subtitle) => {
      try {
        const response = await fetch(`/api/subtitle/files/${subtitle.filename}/download`)
        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = subtitle.filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          window.URL.revokeObjectURL(url)

          ElMessage.success('下载成功')
        } else {
          ElMessage.error('下载失败')
        }
      } catch (error) {
        console.error('下载失败:', error)
        ElMessage.error('下载失败')
      }
    }

    const deleteSubtitle = async (subtitle) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除字幕文件 "${subtitle.filename}" 吗？`,
          '确认删除',
          {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        const response = await fetch(`/api/subtitle/files/${subtitle.filename}`, {
          method: 'DELETE'
        })

        const result = await response.json()

        if (result.success) {
          ElMessage.success('删除成功')
          await loadSubtitleFiles()
        } else {
          ElMessage.error(result.error || '删除失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除失败:', error)
          ElMessage.error('删除失败')
        }
      }
    }

    const updatePreview = async () => {
      if (!currentSubtitle.value) return

      previewLoading.value = true
      try {
        const response = await fetch(
          `/api/subtitle/files/${currentSubtitle.value.filename}/preview?timeOffset=${previewTimeOffset.value}&playbackSpeed=${previewPlaybackSpeed.value}`
        )
        const result = await response.json()

        if (result.success) {
          Object.assign(previewData, result.data)
        }
      } catch (error) {
        console.error('更新预览失败:', error)
      } finally {
        previewLoading.value = false
      }
    }

    const resetGenerateDialog = () => {
      // 重置对话框状态
    }

    const formatFileSize = (bytes) => {
      if (!bytes) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const formatDate = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN')
    }

    const formatTime = (milliseconds) => {
      const totalSeconds = Math.floor(milliseconds / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      const ms = Math.floor(milliseconds % 1000)

      if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(ms).padStart(3, '0')}`
      }
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(ms).padStart(3, '0')}`
    }

    // 生命周期
    onMounted(() => {
      loadNovels()
      loadSubtitleFiles()
    })

    return {
      // 数据
      novels,
      segments,
      selectedNovelId,
      selectedSegments,
      subtitleFiles,
      loadingNovels,
      loadingFiles,
      generating,
      showGenerateDialog,
      showPreviewDialog,
      subtitleOptions,
      subtitleStats,
      currentSubtitle,
      previewData,
      previewTimeOffset,
      previewPlaybackSpeed,
      previewLoading,

      // 计算属性
      estimateSubtitleCount,

      // 方法
      loadNovels,
      loadSubtitleFiles,
      handleNovelChange,
      handleSegmentSelection,
      selectAllSegments,
      clearSegments,
      getCharacterTagType,
      generateSubtitles,
      previewSubtitle,
      downloadSubtitle,
      deleteSubtitle,
      updatePreview,
      resetGenerateDialog,
      formatFileSize,
      formatDate,
      formatTime
    }
  }
}
</script>

<style scoped>
.subtitle-management {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  color: #2c3e50;
}

.page-header p {
  margin: 0;
  color: #7f8c8d;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.novel-selection {
  margin-bottom: 20px;
}

.segments-container {
  margin-top: 16px;
}

.segments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.segments-header h3 {
  margin: 0;
  color: #2c3e50;
}

.segments-actions {
  display: flex;
  gap: 8px;
}

.text-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.filename-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.subtitle-files {
  margin-top: 20px;
}

.subtitle-stats {
  height: fit-content;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #7f8c8d;
}

.format-stats h4 {
  margin: 0 0 12px 0;
  color: #2c3e50;
}

.format-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.format-count {
  font-weight: bold;
  color: #2c3e50;
}

.subtitle-settings {
  height: fit-content;
}

.generate-dialog-content {
  max-height: 60vh;
  overflow-y: auto;
}

.preview-section {
  border-top: 1px solid #eee;
  padding-top: 16px;
  margin-top: 16px;
}

.preview-section h4 {
  margin: 0 0 12px 0;
  color: #2c3e50;
}

.preview-more {
  text-align: center;
  color: #7f8c8d;
  margin-top: 8px;
}

.preview-dialog-content {
  height: 80vh;
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
}

.preview-info {
  display: flex;
  gap: 16px;
  align-items: center;
}

.preview-controls {
  margin-bottom: 16px;
}

.subtitle-list {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
}

.subtitle-item {
  display: flex;
  gap: 16px;
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.subtitle-item:last-child {
  border-bottom: none;
}

.subtitle-number {
  width: 40px;
  text-align: center;
  font-weight: bold;
  color: #2c3e50;
}

.subtitle-time {
  width: 200px;
  font-family: monospace;
  color: #7f8c8d;
  font-size: 12px;
}

.subtitle-text {
  flex: 1;
  line-height: 1.5;
}
</style>
