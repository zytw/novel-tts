<template>
  <div class="file-output">
    <div class="page-header">
      <h1>文件输出管理</h1>
      <p>管理生成的小说文件、音频文件和字幕文件</p>
    </div>

    <!-- 统计信息 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-number">{{ stats.totalFiles }}</div>
              <div class="stats-label">总文件数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon">
              <el-icon><FolderOpened /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-number">{{ formatFileSize(stats.totalSize) }}</div>
              <div class="stats-label">总大小</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon">
              <el-icon><Files /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-number">{{ Object.keys(stats.typeDistribution).length }}</div>
              <div class="stats-label">文件类型</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-number">{{ stats.recentFiles?.length || 0 }}</div>
              <div class="stats-label">最近文件</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 操作工具栏 -->
    <el-card class="toolbar-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button
            type="primary"
            @click="showGenerateDialog = true"
            :icon="Plus"
          >
            生成小说文件
          </el-button>
          <el-button
            type="success"
            @click="showPackageDialog = true"
            :icon="Collection"
          >
            创建音频包
          </el-button>
          <el-button
            type="warning"
            @click="cleanupTempFiles"
            :loading="cleanupLoading"
            :icon="Delete"
          >
            清理临时文件
          </el-button>
        </div>
        <div class="toolbar-right">
          <el-input
            v-model="searchQuery"
            placeholder="搜索文件..."
            clearable
            @input="searchFiles"
            style="width: 200px; margin-right: 12px;"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select
            v-model="filterType"
            placeholder="文件类型"
            clearable
            @change="loadFiles"
            style="width: 120px; margin-right: 12px;"
          >
            <el-option label="文本" value="text" />
            <el-option label="音频" value="audio" />
            <el-option label="字幕" value="subtitle" />
            <el-option label="压缩包" value="archive" />
          </el-select>
          <el-select
            v-model="sortBy"
            @change="loadFiles"
            style="width: 120px; margin-right: 12px;"
          >
            <el-option label="创建时间" value="createdAt" />
            <el-option label="文件名" value="filename" />
            <el-option label="文件大小" value="size" />
          </el-select>
          <el-select
            v-model="sortOrder"
            @change="loadFiles"
            style="width: 100px;"
          >
            <el-option label="降序" value="desc" />
            <el-option label="升序" value="asc" />
          </el-select>
        </div>
      </div>
    </el-card>

    <!-- 文件列表 -->
    <el-card class="files-card">
      <div class="files-header">
        <span>文件列表 ({{ files.length }} 个文件)</span>
        <div class="files-actions">
          <el-button
            v-if="selectedFiles.length > 0"
            type="danger"
            size="small"
            @click="batchDeleteFiles"
            :icon="Delete"
          >
            批量删除 ({{ selectedFiles.length }})
          </el-button>
          <el-button
            v-if="selectedFiles.length > 0"
            type="primary"
            size="small"
            @click="batchDownloadFiles"
            :icon="Download"
          >
            批量下载 ({{ selectedFiles.length }})
          </el-button>
          <el-button
            size="small"
            @click="loadFiles"
            :icon="Refresh"
            :loading="filesLoading"
          >
            刷新
          </el-button>
        </div>
      </div>

      <el-table
        :data="files"
        v-loading="filesLoading"
        @selection-change="handleSelectionChange"
        stripe
        style="width: 100%"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column label="文件名" min-width="200">
          <template #default="{ row }">
            <div class="file-name">
              <el-icon class="file-icon">
                <component :is="getFileIcon(row.format)" />
              </el-icon>
              <span>{{ row.filename }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="格式" width="80">
          <template #default="{ row }">
            <el-tag size="small" plain>{{ row.format.toUpperCase() }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="120">
          <template #default="{ row }">
            {{ formatFileSize(row.size) }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="previewFile(row)"
              :icon="View"
            >
              预览
            </el-button>
            <el-button
              type="success"
              size="small"
              @click="downloadFile(row)"
              :icon="Download"
            >
              下载
            </el-button>
            <el-button
              type="warning"
              size="small"
              @click="renameFile(row)"
              :icon="Edit"
            >
              重命名
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="deleteFile(row)"
              :icon="Delete"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 生成小说文件对话框 -->
    <el-dialog
      v-model="showGenerateDialog"
      title="生成小说文件"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="generateFormRef"
        :model="generateForm"
        :rules="generateRules"
        label-width="100px"
      >
        <el-form-item label="小说标题" prop="title">
          <el-input v-model="generateForm.title" placeholder="请输入小说标题" />
        </el-form-item>
        <el-form-item label="作者" prop="author">
          <el-input v-model="generateForm.author" placeholder="请输入作者名" />
        </el-form-item>
        <el-form-item label="简介" prop="description">
          <el-input
            v-model="generateForm.description"
            type="textarea"
            :rows="2"
            placeholder="请输入小说简介"
          />
        </el-form-item>
        <el-form-item label="文件格式" prop="format">
          <el-select v-model="generateForm.format" style="width: 100%">
            <el-option label="纯文本 (TXT)" value="txt" />
            <el-option label="Markdown (MD)" value="md" />
          </el-select>
        </el-form-item>
        <el-form-item label="包含元数据">
          <el-switch v-model="generateForm.includeMetadata" />
        </el-form-item>
        <el-form-item label="章节分隔符" prop="chapterSeparator">
          <el-input v-model="generateForm.chapterSeparator" placeholder="章节分隔符" />
        </el-form-item>
        <el-form-item label="小说内容" prop="content">
          <el-input
            v-model="generateForm.content"
            type="textarea"
            :rows="6"
            placeholder="请输入小说内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showGenerateDialog = false">取消</el-button>
          <el-button
            type="primary"
            @click="generateNovelText"
            :loading="generateLoading"
          >
            生成文件
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 创建音频包对话框 -->
    <el-dialog
      v-model="showPackageDialog"
      title="创建音频小说包"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="packageFormRef"
        :model="packageForm"
        :rules="packageRules"
        label-width="100px"
      >
        <el-form-item label="小说标题" prop="title">
          <el-input v-model="packageForm.title" placeholder="请输入小说标题" />
        </el-form-item>
        <el-form-item label="作者" prop="author">
          <el-input v-model="packageForm.author" placeholder="请输入作者名" />
        </el-form-item>
        <el-form-item label="音频格式">
          <el-select v-model="packageForm.audioFormat" style="width: 200px">
            <el-option label="MP3" value="mp3" />
            <el-option label="WAV" value="wav" />
            <el-option label="AAC" value="aac" />
            <el-option label="M4A" value="m4a" />
          </el-select>
        </el-form-item>
        <el-form-item label="压缩级别">
          <el-slider
            v-model="packageForm.compressionLevel"
            :min="1"
            :max="9"
            :step="1"
            show-input
            style="width: 300px"
          />
        </el-form-item>
        <el-form-item label="包含选项">
          <el-checkbox-group v-model="packageForm.includes">
            <el-checkbox label="textFile">包含文本文件</el-checkbox>
            <el-checkbox label="coverImage">包含封面图片</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="音频文件">
          <div class="audio-files">
            <div
              v-for="(audioFile, index) in packageForm.audioFiles"
              :key="index"
              class="audio-file-item"
            >
              <el-input
                v-model="audioFile.path"
                placeholder="音频文件路径"
                style="margin-bottom: 8px"
              />
              <el-button
                type="danger"
                size="small"
                @click="removeAudioFile(index)"
                :icon="Delete"
              >
                删除
              </el-button>
            </div>
            <el-button
              type="primary"
              size="small"
              @click="addAudioFile"
              :icon="Plus"
            >
              添加音频文件
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showPackageDialog = false">取消</el-button>
          <el-button
            type="success"
            @click="createAudioPackage"
            :loading="packageLoading"
          >
            创建音频包
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 文件预览对话框 -->
    <el-dialog
      v-model="showPreviewDialog"
      :title="`预览文件: ${previewFile?.filename}`"
      width="80%"
      :close-on-click-modal="false"
    >
      <div class="file-preview">
        <div class="preview-header">
          <div class="file-info">
            <span>文件名: {{ previewFile?.filename }}</span>
            <span>大小: {{ formatFileSize(previewFile?.size) }}</span>
            <span>类型: {{ getTypeLabel(previewFile?.type) }}</span>
          </div>
          <div class="preview-actions">
            <el-button @click="downloadFile(previewFile)" :icon="Download">
              下载
            </el-button>
          </div>
        </div>
        <div class="preview-content">
          <el-input
            v-model="previewContent"
            type="textarea"
            :rows="20"
            readonly
            placeholder="文件内容..."
          />
        </div>
        <div class="preview-pagination" v-if="previewPageInfo">
          <el-pagination
            v-model:current-page="previewPageInfo.currentPage"
            :page-size="previewPageInfo.pageSize"
            :total="previewPageInfo.totalLines"
            layout="prev, pager, next, total"
            @current-change="loadPreviewContent"
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Delete,
  Edit,
  View,
  Download,
  Search,
  Refresh,
  Document,
  FolderOpened,
  Files,
  Clock,
  Collection,
  VideoPlay,
  Headphones,
  Picture,
  Folder,
  DataBoard
} from '@element-plus/icons-vue'

// 响应式数据
const files = ref([])
const selectedFiles = ref([])
const stats = ref({
  totalFiles: 0,
  totalSize: 0,
  typeDistribution: {},
  recentFiles: []
})

// 筛选和排序
const searchQuery = ref('')
const filterType = ref('')
const sortBy = ref('createdAt')
const sortOrder = ref('desc')

// 加载状态
const filesLoading = ref(false)
const generateLoading = ref(false)
const packageLoading = ref(false)
const cleanupLoading = ref(false)

// 对话框状态
const showGenerateDialog = ref(false)
const showPackageDialog = ref(false)
const showPreviewDialog = ref(false)

// 表单数据
const generateForm = reactive({
  title: '',
  author: '',
  description: '',
  format: 'txt',
  includeMetadata: true,
  chapterSeparator: '\n---\n',
  content: ''
})

const packageForm = reactive({
  title: '',
  author: '',
  audioFormat: 'mp3',
  compressionLevel: 6,
  includes: ['textFile', 'coverImage'],
  audioFiles: []
})

// 预览相关
const previewFile = ref(null)
const previewContent = ref('')
const previewPageInfo = ref(null)

// 表单验证规则
const generateRules = {
  title: [{ required: true, message: '请输入小说标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入小说内容', trigger: 'blur' }]
}

const packageRules = {
  title: [{ required: true, message: '请输入小说标题', trigger: 'blur' }]
}

// API 基础 URL
const API_BASE = '/api/file-output'

// 生命周期
onMounted(() => {
  loadStats()
  loadFiles()
})

// 加载文件列表
const loadFiles = async () => {
  filesLoading.value = true
  try {
    const params = new URLSearchParams({
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    })

    if (filterType.value) params.append('type', filterType.value)
    if (searchQuery.value) params.append('search', searchQuery.value)

    const response = await fetch(`${API_BASE}/files?${params}`)
    const result = await response.json()

    if (result.success) {
      files.value = result.data.files
    } else {
      ElMessage.error(result.error || '加载文件列表失败')
    }
  } catch (error) {
    console.error('加载文件列表失败:', error)
    ElMessage.error('加载文件列表失败')
  } finally {
    filesLoading.value = false
  }
}

// 加载统计信息
const loadStats = async () => {
  try {
    const response = await fetch(`${API_BASE}/stats`)
    const result = await response.json()

    if (result.success) {
      stats.value = result.data
    }
  } catch (error) {
    console.error('加载统计信息失败:', error)
  }
}

// 搜索文件
const searchFiles = () => {
  clearTimeout(searchFiles.debounce)
  searchFiles.debounce = setTimeout(loadFiles, 300)
}

// 生成小说文本文件
const generateNovelText = async () => {
  generateLoading.value = true
  try {
    const response = await fetch(`${API_BASE}/generate-novel-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        novelData: {
          title: generateForm.title,
          author: generateForm.author,
          description: generateForm.description,
          content: generateForm.content
        },
        options: {
          format: generateForm.format,
          includeMetadata: generateForm.includeMetadata,
          chapterSeparator: generateForm.chapterSeparator
        }
      })
    })

    const result = await response.json()

    if (result.success) {
      ElMessage.success('小说文件生成完成')
      showGenerateDialog.value = false
      loadFiles()
      loadStats()
    } else {
      ElMessage.error(result.error || '生成小说文件失败')
    }
  } catch (error) {
    console.error('生成小说文件失败:', error)
    ElMessage.error('生成小说文件失败')
  } finally {
    generateLoading.value = false
  }
}

// 创建音频包
const createAudioPackage = async () => {
  packageLoading.value = true
  try {
    const response = await fetch(`${API_BASE}/create-audio-package`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        novelData: {
          title: packageForm.title,
          author: packageForm.author
        },
        audioFiles: packageForm.audioFiles,
        options: {
          includeTextFile: packageForm.includes.includes('textFile'),
          includeCoverImage: packageForm.includes.includes('coverImage'),
          audioFormat: packageForm.audioFormat,
          compressionLevel: packageForm.compressionLevel
        }
      })
    })

    const result = await response.json()

    if (result.success) {
      ElMessage.success('音频包创建完成')
      showPackageDialog.value = false
      loadFiles()
      loadStats()
    } else {
      ElMessage.error(result.error || '创建音频包失败')
    }
  } catch (error) {
    console.error('创建音频包失败:', error)
    ElMessage.error('创建音频包失败')
  } finally {
    packageLoading.value = false
  }
}

// 下载文件
const downloadFile = (file) => {
  window.open(`${API_BASE}/files/${file.filename}/download`, '_blank')
}

// 预览文件
const previewFile = async (file) => {
  previewFile.value = file

  // 只预览文本类文件
  if (!['text', 'subtitle'].includes(file.type) && !['txt', 'md', 'srt', 'vtt'].includes(file.format)) {
    ElMessage.warning('该文件类型不支持预览，请直接下载查看')
    return
  }

  try {
    const response = await fetch(`${API_BASE}/files/${file.filename}/preview?page=1&pageSize=1000`)
    const result = await response.json()

    if (result.success) {
      previewContent.value = result.data.content
      previewPageInfo.value = result.data.pageInfo
      showPreviewDialog.value = true
    } else {
      ElMessage.error(result.error || '预览文件失败')
    }
  } catch (error) {
    console.error('预览文件失败:', error)
    ElMessage.error('预览文件失败')
  }
}

// 删除文件
const deleteFile = async (file) => {
  try {
    await ElMessageBox.confirm(`确定要删除文件 "${file.filename}" 吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const response = await fetch(`${API_BASE}/files/${file.filename}`, {
      method: 'DELETE'
    })

    const result = await response.json()

    if (result.success) {
      ElMessage.success('文件删除成功')
      loadFiles()
      loadStats()
    } else {
      ElMessage.error(result.error || '删除文件失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除文件失败:', error)
      ElMessage.error('删除文件失败')
    }
  }
}

// 重命名文件
const renameFile = async (file) => {
  try {
    const { value: newFilename } = await ElMessageBox.prompt(
      `重命名文件: ${file.filename}`,
      '重命名文件',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /.+/,
        inputErrorMessage: '文件名不能为空'
      }
    )

    const response = await fetch(`${API_BASE}/files/${file.filename}/rename`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newFilename })
    })

    const result = await response.json()

    if (result.success) {
      ElMessage.success('文件重命名成功')
      loadFiles()
    } else {
      ElMessage.error(result.error || '重命名文件失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重命名文件失败:', error)
      ElMessage.error('重命名文件失败')
    }
  }
}

// 批量删除文件
const batchDeleteFiles = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedFiles.value.length} 个文件吗？`,
      '确认批量删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const filenames = selectedFiles.value.map(file => file.filename)
    const response = await fetch(`${API_BASE}/files`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filenames })
    })

    const result = await response.json()

    if (result.success) {
      ElMessage.success(`成功删除 ${result.data.deleted.length} 个文件`)
      selectedFiles.value = []
      loadFiles()
      loadStats()
    } else {
      ElMessage.error(result.error || '批量删除文件失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除文件失败:', error)
      ElMessage.error('批量删除文件失败')
    }
  }
}

// 批量下载文件
const batchDownloadFiles = async () => {
  try {
    const filenames = selectedFiles.value.map(file => file.filename)

    const response = await fetch(`${API_BASE}/files/batch-download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filenames })
    })

    if (response.ok) {
      // 创建下载链接
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `batch_download_${Date.now()}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      ElMessage.success('批量下载开始')
    } else {
      const result = await response.json()
      ElMessage.error(result.error || '批量下载失败')
    }
  } catch (error) {
    console.error('批量下载失败:', error)
    ElMessage.error('批量下载失败')
  }
}

// 清理临时文件
const cleanupTempFiles = async () => {
  cleanupLoading.value = true
  try {
    const response = await fetch(`${API_BASE}/cleanup`, {
      method: 'POST'
    })

    const result = await response.json()

    if (result.success) {
      ElMessage.success(`清理完成，删除了 ${result.data.deletedCount} 个临时文件`)
    } else {
      ElMessage.error(result.error || '清理临时文件失败')
    }
  } catch (error) {
    console.error('清理临时文件失败:', error)
    ElMessage.error('清理临时文件失败')
  } finally {
    cleanupLoading.value = false
  }
}

// 选择变化处理
const handleSelectionChange = (selection) => {
  selectedFiles.value = selection
}

// 添加音频文件
const addAudioFile = () => {
  packageForm.audioFiles.push({ path: '', filename: '' })
}

// 删除音频文件
const removeAudioFile = (index) => {
  packageForm.audioFiles.splice(index, 1)
}

// 加载预览内容（分页）
const loadPreviewContent = async (page) => {
  if (!previewFile.value) return

  try {
    const response = await fetch(
      `${API_BASE}/files/${previewFile.value.filename}/preview?page=${page}&pageSize=1000`
    )
    const result = await response.json()

    if (result.success) {
      previewContent.value = result.data.content
      previewPageInfo.value = result.data.pageInfo
    }
  } catch (error) {
    console.error('加载预览内容失败:', error)
  }
}

// 工具函数
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const getFileIcon = (format) => {
  const iconMap = {
    txt: Document,
    md: Document,
    srt: VideoPlay,
    vtt: VideoPlay,
    mp3: Headphones,
    wav: Headphones,
    aac: Headphones,
    m4a: Headphones,
    zip: Folder,
    tar: Folder,
    gz: Folder
  }
  return iconMap[format] || DataBoard
}

const getTypeTagType = (type) => {
  const typeMap = {
    text: 'primary',
    audio: 'success',
    subtitle: 'warning',
    archive: 'info'
  }
  return typeMap[type] || ''
}

const getTypeLabel = (type) => {
  const labelMap = {
    text: '文本',
    audio: '音频',
    subtitle: '字幕',
    archive: '压缩包'
  }
  return labelMap[type] || type
}
</script>

<style scoped>
.file-output {
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.stats-row {
  margin-bottom: 24px;
}

.stats-card {
  height: 100px;
}

.stats-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stats-icon {
  font-size: 40px;
  color: #409eff;
  margin-right: 16px;
}

.stats-info {
  flex: 1;
}

.stats-number {
  font-size: 24px;
  font-weight: 600;
  line-height: 1;
  margin-bottom: 4px;
}

.stats-label {
  font-size: 14px;
  color: #666;
}

.toolbar-card {
  margin-bottom: 24px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-left {
  display: flex;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.files-card {
  margin-bottom: 24px;
}

.files-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-weight: 600;
}

.files-actions {
  display: flex;
  gap: 8px;
}

.file-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-icon {
  color: #409eff;
}

.audio-files {
  width: 100%;
}

.audio-file-item {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.file-preview {
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e4e7ed;
}

.file-info {
  display: flex;
  gap: 24px;
  font-size: 14px;
  color: #666;
}

.preview-content {
  flex: 1;
  margin-bottom: 16px;
}

.preview-pagination {
  display: flex;
  justify-content: center;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}
</style>