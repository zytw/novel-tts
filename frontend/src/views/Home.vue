<template>
  <div class="home-page">
    <div class="welcome-section">
      <h1 class="welcome-title">
        <el-icon><Microphone /></el-icon>
        欢迎使用AI小说创作与语音合成平台
      </h1>
      <p class="welcome-subtitle">
        一站式AI小说创作与语音合成解决方案，让创意与声音完美结合
      </p>
    </div>

    <div class="features-section">
      <el-row :gutter="20">
        <el-col :span="8" v-for="feature in features" :key="feature.id">
          <el-card class="feature-card" :body-style="{ padding: '20px' }">
            <div class="feature-icon">
              <el-icon :size="40">
                <component :is="feature.icon" />
              </el-icon>
            </div>
            <h3 class="feature-title">{{ feature.title }}</h3>
            <p class="feature-description">{{ feature.description }}</p>
            <el-button
              type="primary"
              class="feature-button"
              @click="navigateToFeature(feature.route)"
            >
              开始使用
            </el-button>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6" v-for="stat in stats" :key="stat.label">
          <el-card class="stat-card">
            <div class="stat-number">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="workflow-section">
      <h2 class="section-title">使用流程</h2>
      <el-steps :active="1" align-center>
        <el-step title="配置AI模型" description="选择和配置您喜欢的AI模型">
          <template #icon>
            <el-icon><Setting /></el-icon>
          </template>
        </el-step>
        <el-step title="生成小说内容" description="使用AI创作精彩的小说内容">
          <template #icon>
            <el-icon><EditPen /></el-icon>
          </template>
        </el-step>
        <el-step title="角色分析" description="AI自动分析小说角色和情感">
          <template #icon>
            <el-icon><User /></el-icon>
          </template>
        </el-step>
        <el-step title="语音合成" description="使用INDEX-TTS2生成高质量语音">
          <template #icon>
            <el-icon><Headphone /></el-icon>
          </template>
        </el-step>
        <el-step title="导出成品" description="获得文本、音频和字幕文件">
          <template #icon>
            <el-icon><Download /></el-icon>
          </template>
        </el-step>
      </el-steps>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useModelsStore } from '../store/models'
import {
  Microphone,
  Setting,
  EditPen,
  User,
  Headphone,
  Download,
  DataAnalysis,
  VideoPlay,
  Document
} from '@element-plus/icons-vue'

export default {
  name: 'Home',
  components: {
    Microphone,
    Setting,
    EditPen,
    User,
    Headphone,
    Download,
    DataAnalysis,
    VideoPlay,
    Document
  },
  setup() {
    const router = useRouter()
    const modelsStore = useModelsStore()

    const stats = ref([
      { label: '可用AI模型', value: '0' },
      { label: '创作小说', value: '0' },
      { label: '生成音频', value: '0' },
      { label: '导出文件', value: '0' }
    ])

    const features = ref([
      {
        id: 1,
        title: 'AI模型配置',
        description: '支持多种主流AI模型，自由选择和配置最适合您的创作工具',
        icon: 'Setting',
        route: '/models'
      },
      {
        id: 2,
        title: '小说创作',
        description: '使用先进的AI技术，快速生成高质量的小说内容',
        icon: 'EditPen',
        route: '/novel'
      },
      {
        id: 3,
        title: '语音合成',
        description: '集成INDEX-TTS2，为不同角色生成独特的语音效果',
        icon: 'Headphone',
        route: '/tts'
      }
    ])

    // 加载统计数据
    const loadStats = async () => {
      try {
        await modelsStore.fetchModels()
        stats.value[0].value = modelsStore.models.length.toString()
      } catch (error) {
        console.error('加载统计数据失败:', error)
      }
    }

    // 导航到功能页面
    const navigateToFeature = (route) => {
      router.push(route)
    }

    onMounted(() => {
      loadStats()
    })

    return {
      stats,
      features,
      navigateToFeature
    }
  }
}
</script>

<style scoped>
.home-page {
  max-width: 1200px;
  margin: 0 auto;
}

.welcome-section {
  text-align: center;
  padding: 60px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  margin-bottom: 40px;
  color: white;
}

.welcome-title {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.welcome-subtitle {
  font-size: 18px;
  opacity: 0.9;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

.features-section {
  margin-bottom: 60px;
}

.feature-card {
  height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: transform 0.3s, box-shadow 0.3s;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.feature-icon {
  margin-bottom: 16px;
  color: #667eea;
}

.feature-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #2c3e50;
}

.feature-description {
  color: #606266;
  line-height: 1.6;
  margin-bottom: 20px;
  flex-grow: 1;
}

.feature-button {
  margin-top: auto;
}

.stats-section {
  margin-bottom: 60px;
}

.stat-card {
  text-align: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border: none;
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.workflow-section {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.section-title {
  text-align: center;
  font-size: 28px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 40px;
}

:deep(.el-step__title) {
  font-size: 14px;
  font-weight: 500;
}

:deep(.el-step__description) {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}
</style>