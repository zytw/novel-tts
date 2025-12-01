<template>
  <el-dialog
    v-model="visible"
    :title="novel?.title || '小说编辑器'"
    width="90%"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="editor-container" v-loading="loading">
      <!-- 工具栏 -->
      <div class="editor-toolbar">
        <div class="toolbar-left">
          <el-button-group>
            <el-button
              :type="currentView === 'edit' ? 'primary' : ''"
              @click="currentView = 'edit'"
            >
              编辑内容
            </el-button>
            <el-button
              :type="currentView === 'preview' ? 'primary' : ''"
              @click="currentView = 'preview'"
            >
              预览效果
            </el-button>
            <el-button
              :type="currentView === 'versions' ? 'primary' : ''"
              @click="currentView = 'versions'"
            >
              版本历史
            </el-button>
          </el-button-group>
        </div>

        <div class="toolbar-right">
          <div class="word-count">
            字数: {{ currentContent.length }} / {{ novel?.targetWordCount }}
          </div>
          <el-button @click="showParametersDialog = true">
            <el-icon><Setting /></el-icon>
            参数设置
          </el-button>
        </div>
      </div>

      <!-- 编辑视图 -->
      <div v-show="currentView === 'edit'" class="edit-view">
        <el-input
          v-model="content"
          type="textarea"
          :rows="20"
          placeholder="在这里编辑您的小说内容..."
          @input="handleContentChange"
        />
        <div class="edit-actions">
          <el-button @click="handleSave" :loading="saving">
            <el-icon><Document /></el-icon>
            保存修改
          </el-button>
          <el-button type="warning" @click="handleRegenerate">
            <el-icon><Refresh /></el-icon>
            重新生成
          </el-button>
        </div>
      </div>

      <!-- 预览视图 -->
      <div v-show="currentView === 'preview'" class="preview-view">
        <div class="preview-content">
          <h2>{{ novel?.title }}</h2>
          <p v-if="novel?.description" class="preview-description">{{ novel.description }}</p>
          <div class="preview-text">{{ currentContent || '暂无内容' }}</div>
        </div>
      </div>

      <!-- 版本历史视图 -->
      <div v-show="currentView === 'versions'" class="versions-view">
        <div class="versions-list" v-loading="versionsLoading">
          <div
            v-for="version in versions"
            :key="version.id"
            class="version-item"
            :class="{ active: version.isCurrent }"
          >
            <div class="version-header">
              <div class="version-info">
                <span class="version-number">版本 {{ version.versionNumber }}</span>
                <el-tag size="small" :type="getVersionType(version.type)">
                  {{ getVersionText(version.type) }}
                </el-tag>
                <span class="version-time">{{ formatTime(version.createdAt) }}</span>
              </div>
              <div class="version-actions">
                <el-button
                  v-if="!version.isCurrent"
                  size="small"
                  @click="handleRestoreVersion(version.id)"
                >
                  恢复此版本
                </el-button>
                <el-button
                  size="small"
                  @click="handlePreviewVersion(version)"
                >
                  查看内容
                </el-button>
              </div>
            </div>
            <div class="version-stats">
              字数: {{ version.wordCount }}
              <span v-if="version.reason" class="version-reason">
                原因: {{ version.reason }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button
          v-if="novel?.status === 'draft' && currentContent"
          type="success"
          @click="handleConfirm"
        >
          确认完成
        </el-button>
        <el-dropdown @command="handleExport" v-if="currentContent">
          <el-button type="primary">
            导出文件 <el-icon><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="txt">纯文本 (.txt)</el-dropdown-item>
              <el-dropdown-item command="md">Markdown (.md)</el-dropdown-item>
              <el-dropdown-item command="html">网页 (.html)</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </template>

    <!-- 参数设置对话框 -->
    <ParametersDialog
      v-model="showParametersDialog"
      :novel="novel"
      @update="handleParametersUpdate"
    />

    <!-- 版本预览对话框 -->
    <VersionPreviewDialog
      v-model="showVersionPreviewDialog"
      :version="previewingVersion"
    />
  </el-dialog>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Setting,
  Document,
  Refresh,
  ArrowDown
} from '@element-plus/icons-vue'
import { useNovelStore } from '../../store/novel'
import ParametersDialog from './ParametersDialog.vue'
import VersionPreviewDialog from './VersionPreviewDialog.vue'

export default {
  name: 'NovelEditorDialog',
  components: {
    Setting,
    Document,
    Refresh,
    ArrowDown,
    ParametersDialog,
    VersionPreviewDialog
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    novelId: {
      type: String,
      required: true
    }
  },
  emits: ['update:modelValue', 'close'],
  setup(props, { emit }) {
    const novelStore = useNovelStore()

    const loading = ref(false)
    const saving = ref(false)
    const versionsLoading = ref(false)
    const currentView = ref('edit')
    const content = ref('')
    const versions = ref([])
    const showParametersDialog = ref(false)
    const showVersionPreviewDialog = ref(false)
    const previewingVersion = ref(null)

    const novel = computed(() => novelStore.currentNovel)
    const currentContent = computed(() => {
      return currentView.value === 'versions' && previewingVersion.value
        ? previewingVersion.value.content
        : content.value
    })

    // 监听对话框显示
    watch(() => props.modelValue, async (newValue) => {
      if (newValue && props.novelId) {
        await loadNovelData()
      }
    })

    // 加载小说数据
    const loadNovelData = async () => {
      loading.value = true
      try {
        await novelStore.fetchNovel(props.novelId)
        content.value = novel.value?.content || ''
        await loadVersions()
      } catch (error) {
        ElMessage.error('加载小说数据失败: ' + error.message)
      } finally {
        loading.value = false
      }
    }

    // 加载版本历史
    const loadVersions = async () => {
      versionsLoading.value = true
      try {
        versions.value = await novelStore.fetchNovelVersions(props.novelId)
      } catch (error) {
        console.error('加载版本历史失败:', error)
      } finally {
        versionsLoading.value = false
      }
    }

    // 处理内容变化
    const handleContentChange = () => {
      // 可以在这里添加自动保存逻辑
    }

    // 保存内容
    const handleSave = async () => {
      if (!props.novelId) return

      saving.value = true
      try {
        const changeReason = '手动编辑保存'
        await novelStore.updateNovelContent(props.novelId, content.value, changeReason)
        ElMessage.success('保存成功')
        await loadVersions() // 重新加载版本历史
      } catch (error) {
        ElMessage.error('保存失败: ' + error.message)
      } finally {
        saving.value = false
      }
    }

    // 重新生成
    const handleRegenerate = async () => {
      if (!props.novelId) return

      try {
        await ElMessageBox.confirm(
          '重新生成将覆盖当前内容，确定要继续吗？',
          '确认重新生成',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        loading.value = true
        await novelStore.regenerateNovel(props.novelId)
        ElMessage.success('重新生成已开始')
        await loadNovelData()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('重新生成失败: ' + error.message)
        }
      } finally {
        loading.value = false
      }
    }

    // 恢复版本
    const handleRestoreVersion = async (versionId) => {
      try {
        await ElMessageBox.confirm(
          '恢复到此版本将覆盖当前内容，确定要继续吗？',
          '确认恢复版本',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        await novelStore.restoreVersion(props.novelId, versionId)
        ElMessage.success('版本恢复成功')
        await loadNovelData()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('恢复版本失败: ' + error.message)
        }
      }
    }

    // 预览版本
    const handlePreviewVersion = (version) => {
      previewingVersion.value = version
      showVersionPreviewDialog.value = true
    }

    // 更新参数
    const handleParametersUpdate = async (parameters) => {
      try {
        await novelStore.updateNovelParameters(
          props.novelId,
          parameters.parameters,
          parameters.targetWordCount
        )
        ElMessage.success('参数更新成功')
        await loadNovelData()
      } catch (error) {
        ElMessage.error('更新参数失败: ' + error.message)
      }
    }

    // 确认完成
    const handleConfirm = async () => {
      if (!props.novelId) return

      try {
        await ElMessageBox.confirm(
          '确认后小说将进入下一步处理流程，确定要确认吗？',
          '确认完成',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        await novelStore.confirmNovel(props.novelId)
        ElMessage.success('小说确认成功')
        await loadNovelData()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('确认失败: ' + error.message)
        }
      }
    }

    // 导出文件
    const handleExport = async (format) => {
      try {
        await novelStore.exportNovel(props.novelId, format)
        ElMessage.success('文件导出成功')
      } catch (error) {
        ElMessage.error('导出失败: ' + error.message)
      }
    }

    // 关闭对话框
    const handleClose = () => {
      visible.value = false
      emit('close')
    }

    // 获取版本类型
    const getVersionType = (type) => {
      const typeMap = {
        generated: 'primary',
        edit: 'success',
        restore: 'warning',
        final: 'info'
      }
      return typeMap[type] || ''
    }

    // 获取版本文本
    const getVersionText = (type) => {
      const textMap = {
        generated: 'AI生成',
        edit: '手动编辑',
        restore: '版本恢复',
        final: '最终确认'
      }
      return textMap[type] || type
    }

    // 格式化时间
    const formatTime = (timeString) => {
      return new Date(timeString).toLocaleString('zh-CN')
    }

    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
    })

    return {
      loading,
      saving,
      versionsLoading,
      currentView,
      content,
      versions,
      showParametersDialog,
      showVersionPreviewDialog,
      previewingVersion,
      novel,
      currentContent,
      visible,
      handleContentChange,
      handleSave,
      handleRegenerate,
      handleRestoreVersion,
      handlePreviewVersion,
      handleParametersUpdate,
      handleConfirm,
      handleExport,
      handleClose,
      getVersionType,
      getVersionText,
      formatTime
    }
  }
}
</script>

<style scoped>
.editor-container {
  min-height: 500px;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.word-count {
  font-size: 14px;
  color: #606266;
}

.edit-view {
  margin-bottom: 16px;
}

.edit-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.preview-view {
  padding: 20px;
  background: #fafafa;
  border-radius: 6px;
  max-height: 600px;
  overflow-y: auto;
}

.preview-content h2 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.preview-description {
  color: #606266;
  font-style: italic;
  margin-bottom: 20px;
}

.preview-text {
  line-height: 1.8;
  white-space: pre-wrap;
  color: #2c3e50;
}

.versions-view {
  max-height: 600px;
  overflow-y: auto;
}

.versions-list {
  padding: 8px 0;
}

.version-item {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  transition: all 0.2s;
}

.version-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.version-item.active {
  border-color: #409eff;
  background: #f0f9ff;
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.version-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-number {
  font-weight: 600;
  color: #2c3e50;
}

.version-time {
  font-size: 12px;
  color: #909399;
}

.version-actions {
  display: flex;
  gap: 8px;
}

.version-stats {
  font-size: 14px;
  color: #606266;
}

.version-reason {
  margin-left: 12px;
  color: #909399;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
</style>
