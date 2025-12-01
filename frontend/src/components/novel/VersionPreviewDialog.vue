<template>
  <el-dialog
    v-model="visible"
    :title="`版本 ${version?.versionNumber || ''} 预览`"
    width="70%"
  >
    <div v-if="version" class="version-preview">
      <div class="version-header">
        <div class="version-info">
          <el-tag :type="getVersionType(version.type)">
            {{ getVersionText(version.type) }}
          </el-tag>
          <span class="version-time">{{ formatTime(version.createdAt) }}</span>
        </div>
        <div class="version-stats">
          字数: {{ version.wordCount }}
        </div>
      </div>

      <div class="version-content">
        <pre>{{ version.content }}</pre>
      </div>
    </div>

    <div v-else class="no-content">
      <el-empty description="无版本内容" />
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'VersionPreviewDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    version: {
      type: Object,
      default: null
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
    })

    const handleClose = () => {
      visible.value = false
    }

    const getVersionType = (type) => {
      const typeMap = {
        generated: 'primary',
        edit: 'success',
        restore: 'warning',
        final: 'info'
      }
      return typeMap[type] || ''
    }

    const getVersionText = (type) => {
      const textMap = {
        generated: 'AI生成',
        edit: '手动编辑',
        restore: '版本恢复',
        final: '最终确认'
      }
      return textMap[type] || type
    }

    const formatTime = (timeString) => {
      return new Date(timeString).toLocaleString('zh-CN')
    }

    return {
      visible,
      handleClose,
      getVersionType,
      getVersionText,
      formatTime
    }
  }
}
</script>

<style scoped>
.version-preview {
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e4e7ed;
}

.version-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.version-time {
  color: #909399;
  font-size: 14px;
}

.version-stats {
  color: #606266;
  font-size: 14px;
}

.version-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
}

.version-content pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.8;
  font-family: 'Microsoft YaHei', sans-serif;
  margin: 0;
  color: #2c3e50;
}

.no-content {
  text-align: center;
  padding: 40px 0;
}
</style>
