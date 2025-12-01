<template>
  <div class="novel-page">
    <div class="page-header">
      <h2>AI小说生成</h2>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        创建新小说
      </el-button>
    </div>

    <!-- 小说列表 -->
    <el-card class="novel-list" v-loading="loading">
      <template #header>
        <div class="list-header">
          <span>我的小说</span>
          <div class="filter-controls">
            <el-select v-model="filterStatus" placeholder="筛选状态" @change="loadNovelList">
              <el-option label="全部" value="" />
              <el-option label="草稿" value="draft" />
              <el-option label="生成中" value="generating" />
              <el-option label="已确认" value="confirmed" />
              <el-option label="错误" value="error" />
            </el-select>
            <el-select v-model="sortBy" placeholder="排序方式" @change="loadNovelList">
              <el-option label="更新时间" value="updatedAt" />
              <el-option label="创建时间" value="createdAt" />
              <el-option label="字数" value="wordCount" />
              <el-option label="标题" value="title" />
            </el-select>
          </div>
        </div>
      </template>

      <div class="novel-grid" v-if="novels.length > 0">
        <el-card
          v-for="novel in novels"
          :key="novel.id"
          class="novel-card"
          :body-style="{ padding: '20px' }"
        >
          <div class="novel-header">
            <h3 class="novel-title">{{ novel.title }}</h3>
            <el-tag :type="getStatusType(novel.status)">
              {{ getStatusText(novel.status) }}
            </el-tag>
          </div>

          <p class="novel-description" v-if="novel.description">
            {{ novel.description }}
          </p>

          <div class="novel-stats">
            <div class="stat-item">
              <span class="label">字数:</span>
              <span class="value">{{ novel.currentWordCount }} / {{ novel.targetWordCount }}</span>
            </div>
            <div class="stat-item">
              <span class="label">创建:</span>
              <span class="value">{{ formatDate(novel.createdAt) }}</span>
            </div>
          </div>

          <!-- 生成进度条 -->
          <div v-if="novel.status === 'generating'" class="progress-section">
            <div class="progress-info">
              <span>生成进度: {{ Math.round((novel.currentWordCount / novel.targetWordCount) * 100) }}%</span>
              <el-button size="small" text @click="refreshStatus(novel.id)">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
            <el-progress
              :percentage="Math.min((novel.currentWordCount / novel.targetWordCount) * 100, 100)"
              :status="novel.status === 'error' ? 'exception' : ''"
            />
          </div>

          <div class="novel-actions">
            <el-button size="small" @click="openNovel(novel.id)">
              {{ novel.content ? '继续编辑' : '查看详情' }}
            </el-button>
            <el-button
              v-if="novel.status === 'draft' && novel.content"
              size="small"
              type="success"
              @click="confirmNovel(novel.id)"
            >
              确认
            </el-button>
            <el-button size="small" type="danger" @click="deleteNovel(novel.id)">
              删除
            </el-button>
          </div>
        </el-card>
      </div>

      <el-empty v-else description="暂无小说项目" />
    </el-card>

    <!-- 创建小说对话框 -->
    <CreateNovelDialog
      v-model="showCreateDialog"
      @submit="handleCreateNovel"
    />

    <!-- 小说编辑器对话框 -->
    <NovelEditorDialog
      v-model="showEditorDialog"
      :novel-id="editingNovelId"
      @close="handleEditorClose"
    />
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { useNovelStore } from '../store/novel'
import CreateNovelDialog from '../components/novel/CreateNovelDialog.vue'
import NovelEditorDialog from '../components/novel/NovelEditorDialog.vue'

export default {
  name: 'Novel',
  components: {
    Plus,
    Refresh,
    CreateNovelDialog,
    NovelEditorDialog
  },
  setup() {
    const novelStore = useNovelStore()

    const loading = ref(false)
    const showCreateDialog = ref(false)
    const showEditorDialog = ref(false)
    const editingNovelId = ref('')
    const filterStatus = ref('')
    const sortBy = ref('updatedAt')

    const novels = computed(() => novelStore.novels)

    // 加载小说列表
    const loadNovelList = async () => {
      loading.value = true
      try {
        await novelStore.fetchNovels({
          status: filterStatus.value,
          sortBy: sortBy.value
        })
      } catch (error) {
        ElMessage.error('加载小说列表失败: ' + error.message)
      } finally {
        loading.value = false
      }
    }

    // 创建小说
    const handleCreateNovel = async (novelData) => {
      try {
        await novelStore.createNovel(novelData)
        ElMessage.success('小说项目创建成功')
        showCreateDialog.value = false
        await loadNovelList()
      } catch (error) {
        ElMessage.error('创建小说失败: ' + error.message)
      }
    }

    // 打开小说编辑器
    const openNovel = (novelId) => {
      editingNovelId.value = novelId
      showEditorDialog.value = true
    }

    // 关闭编辑器
    const handleEditorClose = () => {
      editingNovelId.value = ''
      showEditorDialog.value = false
      loadNovelList() // 重新加载列表以更新状态
    }

    // 刷新单个小说状态
    const refreshStatus = async (novelId) => {
      try {
        await novelStore.fetchNovelStatus(novelId)
      } catch (error) {
        ElMessage.error('刷新状态失败: ' + error.message)
      }
    }

    // 确认小说
    const confirmNovel = async (novelId) => {
      try {
        await ElMessageBox.confirm(
          '确认后小说将进入下一步处理流程，确定要确认吗？',
          '确认小说',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        await novelStore.confirmNovel(novelId)
        ElMessage.success('小说确认成功')
        await loadNovelList()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('确认小说失败: ' + error.message)
        }
      }
    }

    // 删除小说
    const deleteNovel = async (novelId) => {
      try {
        await ElMessageBox.confirm(
          '确定要删除这个小说项目吗？此操作不可恢复。',
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        await novelStore.deleteNovel(novelId)
        ElMessage.success('小说删除成功')
        await loadNovelList()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除小说失败: ' + error.message)
        }
      }
    }

    // 获取状态类型
    const getStatusType = (status) => {
      const typeMap = {
        draft: '',
        generating: 'warning',
        confirmed: 'success',
        error: 'danger'
      }
      return typeMap[status] || ''
    }

    // 获取状态文本
    const getStatusText = (status) => {
      const textMap = {
        draft: '草稿',
        generating: '生成中',
        confirmed: '已确认',
        error: '错误'
      }
      return textMap[status] || status
    }

    // 格式化日期
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('zh-CN')
    }

    onMounted(() => {
      loadNovelList()

      // 定期刷新生成中的小说状态
      const interval = setInterval(() => {
        const generatingNovels = novels.value.filter(novel => novel.status === 'generating')
        if (generatingNovels.length > 0) {
          loadNovelList()
        }
      }, 5000) // 每5秒刷新一次

      // 组件卸载时清除定时器
      onBeforeUnmount(() => {
        clearInterval(interval)
      })
    })

    return {
      loading,
      novels,
      showCreateDialog,
      showEditorDialog,
      editingNovelId,
      filterStatus,
      sortBy,
      loadNovelList,
      handleCreateNovel,
      openNovel,
      handleEditorClose,
      refreshStatus,
      confirmNovel,
      deleteNovel,
      getStatusType,
      getStatusText,
      formatDate
    }
  }
}
</script>

<style scoped>
.novel-page {
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

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-controls {
  display: flex;
  gap: 12px;
}

.novel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.novel-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.novel-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.novel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.novel-title {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
  font-weight: 600;
  line-height: 1.4;
}

.novel-description {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.novel-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 8px 0;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
}

.stat-item .label {
  color: #909399;
  margin-bottom: 4px;
}

.stat-item .value {
  color: #606266;
  font-weight: 500;
}

.progress-section {
  margin-bottom: 16px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
}

.novel-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.novel-actions .el-button {
  flex: 1;
  min-width: 80px;
}
</style>