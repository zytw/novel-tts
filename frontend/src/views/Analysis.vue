<template>
  <div class="analysis-page">
    <div class="page-header">
      <h2>小说角色分析</h2>
      <el-button type="primary" @click="showAnalysisDialog = true">
        <el-icon><DataAnalysis /></el-icon>
        开始分析
      </el-button>
    </div>

    <!-- 分析历史 -->
    <el-card class="analysis-history" v-loading="loading">
      <template #header>
        <div class="history-header">
          <span>分析历史</span>
          <el-button @click="loadAnalysisHistory">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <div class="history-grid" v-if="analysisHistory.length > 0">
        <el-card
          v-for="item in analysisHistory"
          :key="item.novelId"
          class="analysis-card"
          :body-style="{ padding: '20px' }"
        >
          <div class="card-header">
            <h3 class="novel-title">{{ item.title }}</h3>
            <el-tag :type="getStatusType(item.status)">
              {{ getStatusText(item.status) }}
            </el-tag>
          </div>

          <div class="analysis-progress">
            <div class="progress-info">
              <span>分析进度: {{ getProgressPercentage(item.completedSteps) }}%</span>
            </div>
            <el-progress
              :percentage="getProgressPercentage(item.completedSteps)"
              :status="item.status === 'completed' ? 'success' : ''"
            />
          </div>

          <div class="analysis-steps">
            <div class="step" :class="{ completed: item.hasCharacterAnalysis }">
              <el-icon :class="{ success: item.hasCharacterAnalysis }">
                <User />
              </el-icon>
              <span>角色分析</span>
            </div>
            <div class="step" :class="{ completed: item.hasVoiceConfiguration }">
              <el-icon :class="{ success: item.hasVoiceConfiguration }">
                <Microphone />
              </el-icon>
              <span>音色匹配</span>
            </div>
            <div class="step" :class="{ completed: item.hasTTSScript }">
              <el-icon :class="{ success: item.hasTTSScript }">
                <Document />
              </el-icon>
              <span>脚本生成</span>
            </div>
          </div>

          <div class="analysis-time">
            <span v-if="item.analyzedAt">分析时间: {{ formatDate(item.analyzedAt) }}</span>
            <span v-if="item.scriptGeneratedAt">完成时间: {{ formatDate(item.scriptGeneratedAt) }}</span>
          </div>

          <div class="card-actions">
            <el-button size="small" @click="viewAnalysis(item.novelId)">
              查看详情
            </el-button>
            <el-button
              v-if="item.status !== 'completed'"
              size="small"
              type="warning"
              @click="continueAnalysis(item.novelId)"
            >
              继续分析
            </el-button>
            <el-button
              v-if="item.status === 'completed'"
              size="small"
              type="success"
              @click="viewScript(item.novelId)"
            >
              查看脚本
            </el-button>
            <el-button size="small" type="danger" @click="deleteAnalysis(item.novelId)">
              删除
            </el-button>
          </div>
        </el-card>
      </div>

      <el-empty v-else description="暂无分析记录" />
    </el-card>

    <!-- 开始分析对话框 -->
    <StartAnalysisDialog
      v-model="showAnalysisDialog"
      @submit="handleStartAnalysis"
    />

    <!-- 分析详情对话框 -->
    <AnalysisDetailDialog
      v-model="showDetailDialog"
      :analysis-id="viewingAnalysisId"
      @close="handleDetailClose"
    />

    <!-- 脚本预览对话框 -->
    <ScriptPreviewDialog
      v-model="showScriptDialog"
      :script-id="viewingScriptId"
    />
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  DataAnalysis,
  Refresh,
  User,
  Microphone,
  Document
} from '@element-plus/icons-vue'
import { useAnalysisStore } from '../store/analysis'
import StartAnalysisDialog from '../components/analysis/StartAnalysisDialog.vue'
import AnalysisDetailDialog from '../components/analysis/AnalysisDetailDialog.vue'
import ScriptPreviewDialog from '../components/analysis/ScriptPreviewDialog.vue'

export default {
  name: 'Analysis',
  components: {
    DataAnalysis,
    Refresh,
    User,
    Microphone,
    Document,
    StartAnalysisDialog,
    AnalysisDetailDialog,
    ScriptPreviewDialog
  },
  setup() {
    const analysisStore = useAnalysisStore()

    const loading = ref(false)
    const showAnalysisDialog = ref(false)
    const showDetailDialog = ref(false)
    const showScriptDialog = ref(false)
    const viewingAnalysisId = ref('')
    const viewingScriptId = ref('')

    const analysisHistory = computed(() => analysisStore.analysisHistory)

    // 加载分析历史
    const loadAnalysisHistory = async () => {
      loading.value = true
      try {
        await analysisStore.fetchAnalysisHistory()
      } catch (error) {
        ElMessage.error('加载分析历史失败: ' + error.message)
      } finally {
        loading.value = false
      }
    }

    // 开始分析
    const handleStartAnalysis = async (analysisData) => {
      try {
        loading.value = true
        await analysisStore.performCompleteAnalysis(
          analysisData.novelId,
          analysisData.options
        )

        ElMessage.success('分析完成！')
        showAnalysisDialog.value = false
        await loadAnalysisHistory()
      } catch (error) {
        ElMessage.error('分析失败: ' + error.message)
      } finally {
        loading.value = false
      }
    }

    // 查看分析详情
    const viewAnalysis = (novelId) => {
      viewingAnalysisId.value = novelId
      showDetailDialog.value = true
    }

    // 继续分析
    const continueAnalysis = async (novelId) => {
      try {
        loading.value = true
        await analysisStore.performCompleteAnalysis(novelId, {
          force: true
        })

        ElMessage.success('分析完成！')
        await loadAnalysisHistory()
      } catch (error) {
        ElMessage.error('分析失败: ' + error.message)
      } finally {
        loading.value = false
      }
    }

    // 查看脚本
    const viewScript = (novelId) => {
      viewingScriptId.value = novelId
      showScriptDialog.value = true
    }

    // 删除分析结果
    const deleteAnalysis = async (novelId) => {
      try {
        await ElMessageBox.confirm(
          '确定要删除这个分析结果吗？此操作不可恢复。',
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        await analysisStore.deleteAnalysisResult(novelId)
        ElMessage.success('删除成功')
        await loadAnalysisHistory()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除失败: ' + error.message)
        }
      }
    }

    // 关闭详情对话框
    const handleDetailClose = () => {
      viewingAnalysisId.value = ''
      showDetailDialog.value = false
    }

    // 获取状态类型
    const getStatusType = (status) => {
      const typeMap = {
        pending: '',
        analyzed: 'warning',
        voice_matched: 'info',
        completed: 'success'
      }
      return typeMap[status] || ''
    }

    // 获取状态文本
    const getStatusText = (status) => {
      const textMap = {
        pending: '待分析',
        analyzed: '已分析',
        voice_matched: '音色匹配',
        completed: '已完成'
      }
      return textMap[status] || status
    }

    // 获取进度百分比
    const getProgressPercentage = (completedSteps) => {
      const steps = ['character_analysis', 'voice_matching', 'script_generation']
      if (!completedSteps || !Array.isArray(completedSteps)) {
        return 0
      }
      return Math.round((completedSteps.length / steps.length) * 100)
    }

    // 格式化日期
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('zh-CN')
    }

    onMounted(() => {
      loadAnalysisHistory()
    })

    return {
      loading,
      analysisHistory,
      showAnalysisDialog,
      showDetailDialog,
      showScriptDialog,
      viewingAnalysisId,
      viewingScriptId,
      loadAnalysisHistory,
      handleStartAnalysis,
      viewAnalysis,
      continueAnalysis,
      viewScript,
      deleteAnalysis,
      handleDetailClose,
      getStatusType,
      getStatusText,
      getProgressPercentage,
      formatDate
    }
  }
}
</script>

<style scoped>
.analysis-page {
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

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.analysis-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.analysis-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.novel-title {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
  font-weight: 600;
  line-height: 1.4;
}

.analysis-progress {
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

.analysis-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  color: #909399;
  transition: color 0.2s;
}

.step.completed {
  color: #67c23a;
}

.step .el-icon {
  margin-bottom: 4px;
  font-size: 20px;
}

.step .el-icon.success {
  color: #67c23a;
}

.analysis-time {
  font-size: 12px;
  color: #909399;
  margin-bottom: 16px;
  line-height: 1.4;
}

.analysis-time span {
  display: block;
}

.card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.card-actions .el-button {
  flex: 1;
  min-width: 80px;
}
</style>