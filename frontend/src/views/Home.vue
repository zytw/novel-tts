<template>
  <div class="home-page">
    <!-- 英雄区域 -->
    <section class="hero-section">
      <div class="hero-bg">
        <div class="sound-sphere"></div>
        <div class="text-particles">
          <div class="particle" v-for="n in 20" :key="n" :style="getParticleStyle(n)"></div>
        </div>
      </div>

      <div class="hero-content">
        <div class="hero-text">
          <div class="hero-badge">
            <span class="badge-text">🔥 全新 AI 体验</span>
          </div>
          <h1 class="hero-title">
            <span class="title-main">SoundStory</span>
            <span class="title-accent">AI</span>
          </h1>
          <p class="hero-subtitle">
            声波叙事 · 让每一个故事都有独特的声音
          </p>
          <p class="hero-description">
            融合尖端AI技术，打造从文字到声音的完整创作链路
            <br>
            为你的故事注入灵魂，让角色真正"活"起来
          </p>

          <div class="hero-actions">
            <button class="action-btn primary" @click="navigateToFeature('/novel')">
              <span class="btn-icon">✨</span>
              <span class="btn-text">开始创作</span>
              <div class="btn-glow"></div>
            </button>
            <button class="action-btn secondary" @click="navigateToFeature('/models')">
              <span class="btn-icon">⚙️</span>
              <span class="btn-text">配置模型</span>
            </button>
          </div>
        </div>

        <div class="hero-visual">
          <div class="sound-visualizer">
            <div class="visualizer-ring ring-1"></div>
            <div class="visualizer-ring ring-2"></div>
            <div class="visualizer-ring ring-3"></div>
            <div class="visualizer-core">
              <el-icon><Microphone /></el-icon>
            </div>
            <div class="sound-bars">
              <div class="bar" v-for="n in 5" :key="n" :style="getBarStyle(n)"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 统计数据区域 -->
    <section class="stats-section">
      <div class="stats-container">
        <div class="stat-item" v-for="stat in stats" :key="stat.label">
          <div class="stat-icon">
            <span>{{ stat.icon }}</span>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
          <div class="stat-glow"></div>
        </div>
      </div>
    </section>

    <!-- 核心功能区域 -->
    <section class="features-section">
      <div class="section-header">
        <div class="section-badge">核心功能</div>
        <h2 class="section-title">
          <span class="title-gradient">完整创作链路</span>
        </h2>
        <p class="section-subtitle">从灵感到成品，一站式AI小说创作解决方案</p>
      </div>

      <div class="features-grid">
        <div class="feature-card" v-for="feature in features" :key="feature.id" @click="navigateToFeature(feature.route)">
          <div class="feature-glow"></div>
          <div class="feature-bg"></div>
          <div class="feature-content">
            <div class="feature-icon">
              <span class="icon-emoji">{{ feature.emoji }}</span>
              <div class="icon-particles">
                <div class="particle" v-for="n in 6" :key="n"></div>
              </div>
            </div>
            <h3 class="feature-title">{{ feature.title }}</h3>
            <p class="feature-description">{{ feature.description }}</p>
            <div class="feature-link">
              <span>立即体验</span>
              <div class="link-arrow">→</div>
            </div>
          </div>
          <div class="feature-overlay"></div>
        </div>
      </div>
    </section>

    <!-- 工作流程区域 -->
    <section class="workflow-section">
      <div class="section-header">
        <div class="section-badge">创作流程</div>
        <h2 class="section-title">
          <span class="title-gradient">五步成章</span>
        </h2>
        <p class="section-subtitle">简单几步，完成从文字到声音的神奇转换</p>
      </div>

      <div class="workflow-container">
        <div class="workflow-line"></div>
        <div class="workflow-steps">
          <div class="workflow-step" v-for="(step, index) in workflowSteps" :key="index">
            <div class="step-number">{{ index + 1 }}</div>
            <div class="step-content">
              <div class="step-icon">{{ step.emoji }}</div>
              <h3 class="step-title">{{ step.title }}</h3>
              <p class="step-description">{{ step.description }}</p>
            </div>
            <div class="step-connector" v-if="index < workflowSteps.length - 1">
              <div class="connector-line"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 系统状态区域 -->
    <section class="status-section">
      <div class="section-header">
        <div class="section-badge">系统监控</div>
        <h2 class="section-title">
          <span class="title-gradient">实时状态</span>
        </h2>
        <p class="section-subtitle">确保您的创作过程顺畅无阻</p>
      </div>

      <div class="status-container">
        <ApiStatus />
      </div>
    </section>

    <!-- 底部行动区域 -->
    <section class="cta-section">
      <div class="cta-content">
        <div class="cta-text">
          <h2 class="cta-title">准备好开始您的AI创作之旅了吗？</h2>
          <p class="cta-subtitle">加入数万名创作者，体验前所未有的小说创作方式</p>
        </div>
        <div class="cta-actions">
          <button class="cta-btn primary" @click="navigateToFeature('/novel')">
            <span>立即开始</span>
            <div class="btn-particles"></div>
          </button>
          <button class="cta-btn secondary" @click="navigateToFeature('/docs')">
            <span>查看文档</span>
          </button>
        </div>
      </div>
      <div class="cta-bg">
        <div class="cta-gradient"></div>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useModelsStore } from '../store/models'
import ApiStatus from '../components/ApiStatus.vue'
import { Microphone } from '@element-plus/icons-vue'

export default {
  name: 'HomePage',
  components: {
    ApiStatus,
    Microphone
  },
  setup() {
    const router = useRouter()
    const modelsStore = useModelsStore()

    const stats = ref([
      {
        label: '可用AI模型',
        value: '0',
        icon: '🤖'
      },
      {
        label: '创作小说',
        value: '0',
        icon: '📚'
      },
      {
        label: '生成音频',
        value: '0',
        icon: '🎵'
      },
      {
        label: '导出文件',
        value: '0',
        icon: '📦'
      }
    ])

    const features = ref([
      {
        id: 1,
        title: 'AI模型配置',
        description: '支持GPT、Claude、本地大模型等多种AI引擎，自由配置参数获得最佳创作效果',
        emoji: '⚙️',
        route: '/models'
      },
      {
        id: 2,
        title: '智能小说创作',
        description: '基于深度学习的创意写作引擎，自动生成情节、对话和角色发展',
        emoji: '✍️',
        route: '/novel'
      },
      {
        id: 3,
        title: '角色智能分析',
        description: 'AI驱动的角色性格分析，为每个角色匹配最合适的音色和语调',
        emoji: '🎭',
        route: '/analysis'
      },
      {
        id: 4,
        title: '专业语音合成',
        description: '集成INDEX-TTS2引擎，支持情感化语音合成和多角色声音定制',
        emoji: '🎙️',
        route: '/tts'
      },
      {
        id: 5,
        title: '智能字幕生成',
        description: '自动生成精确的时间轴字幕，支持多种格式和样式自定义',
        emoji: '📝',
        route: '/subtitle'
      },
      {
        id: 6,
        title: '批量文件输出',
        description: '一键导出音频、文本、字幕等完整资源，支持云端存储和本地下载',
        emoji: '📦',
        route: '/file-output'
      }
    ])

    const workflowSteps = ref([
      {
        title: '配置AI模型',
        description: '选择合适的AI引擎，配置创作参数和风格设置',
        emoji: '⚙️'
      },
      {
        title: '创作小说内容',
        description: '输入创意或大纲，AI自动生成完整的小说章节',
        emoji: '✍️'
      },
      {
        title: '角色分析',
        description: '智能分析角色性格，匹配个性化语音特征',
        emoji: '🎭'
      },
      {
        title: '语音合成',
        description: '高质量TTS合成，为每个角色赋予独特声音',
        emoji: '🎙️'
      },
      {
        title: '导出成品',
        description: '生成完整的音频小说和配套字幕文件',
        emoji: '📦'
      }
    ])

    // 加载统计数据
    const loadStats = async () => {
      try {
        await modelsStore.fetchModels()
        stats.value[0].value = modelsStore.models.length.toString()
        // 模拟其他统计数据
        stats.value[1].value = Math.floor(Math.random() * 50) + 10
        stats.value[2].value = Math.floor(Math.random() * 200) + 50
        stats.value[3].value = Math.floor(Math.random() * 500) + 100
      } catch (error) {
        console.error('加载统计数据失败:', error)
      }
    }

    // 导航到功能页面
    const navigateToFeature = (route) => {
      router.push(route)
    }

    // 生成粒子样式
    const getParticleStyle = (index) => {
      const positions = [
        { top: '10%', left: '20%' },
        { top: '30%', left: '80%' },
        { top: '60%', left: '15%' },
        { top: '80%', left: '70%' },
        { top: '25%', left: '50%' }
      ]
      const pos = positions[index % positions.length]
      return {
        ...pos,
        animationDelay: `${index * 0.2}s`,
        animationDuration: `${3 + (index % 3)}s`
      }
    }

    // 生成音频条样式
    const getBarStyle = (index) => {
      const heights = [20, 35, 50, 40, 25]
      const delays = [0, 0.1, 0.2, 0.3, 0.4]
      return {
        height: `${heights[index - 1]}%`,
        animationDelay: `${delays[index - 1]}s`
      }
    }

    onMounted(() => {
      loadStats()
    })

    return {
      stats,
      features,
      workflowSteps,
      navigateToFeature,
      getParticleStyle,
      getBarStyle
    }
  }
}
</script>

<style scoped>
.home-page {
  width: 100%;
  overflow-x: hidden;
}

/* 英雄区域 */
.hero-section {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
}

.sound-sphere {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, var(--neon-blue) 0%, transparent 70%);
  opacity: 0.1;
  animation: sphere-pulse 8s ease-in-out infinite;
  filter: blur(80px);
}

@keyframes sphere-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.1; }
  50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.2; }
}

.text-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: var(--neon-blue);
  border-radius: 50%;
  animation: particle-float 6s ease-in-out infinite;
  filter: drop-shadow(0 0 10px var(--neon-blue));
}

@keyframes particle-float {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.8; }
  50% { transform: translateY(-50px) scale(1.2); opacity: 1; }
}

.hero-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
  max-width: 1400px;
  width: 100%;
  padding: 0 40px;
  position: relative;
  z-index: 1;
}

.hero-text {
  animation: slide-in-left 1s ease-out;
}

@keyframes slide-in-left {
  from { opacity: 0; transform: translateX(-50px); }
  to { opacity: 1; transform: translateX(0); }
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 20px;
  margin-bottom: 24px;
  animation: badge-glow 2s ease-in-out infinite;
}

@keyframes badge-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(255, 107, 107, 0.3); }
  50% { box-shadow: 0 0 30px rgba(255, 107, 107, 0.5); }
}

.badge-text {
  font-size: 12px;
  font-weight: 600;
  color: #ff6b6b;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.hero-title {
  font-size: clamp(48px, 8vw, 72px);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 24px;
  font-family: 'Inter', sans-serif;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-main {
  color: var(--text-primary);
  background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.title-accent {
  background: linear-gradient(135deg, var(--neon-blue), var(--neon-purple));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: accent-pulse 3s ease-in-out infinite;
}

@keyframes accent-pulse {
  0%, 100% { filter: drop-shadow(0 0 20px var(--neon-blue)); }
  50% { filter: drop-shadow(0 0 30px var(--neon-purple)); }
}

.hero-subtitle {
  font-size: 20px;
  color: var(--text-secondary);
  margin-bottom: 20px;
  font-weight: 500;
  letter-spacing: 1px;
}

.hero-description {
  font-size: 16px;
  color: var(--text-muted);
  line-height: 1.8;
  margin-bottom: 40px;
}

.hero-actions {
  display: flex;
  gap: 20px;
  align-items: center;
}

.action-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 32px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--neon-blue), var(--neon-purple));
  color: white;
}

.action-btn.secondary {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 40px rgba(0, 212, 255, 0.3);
}

.btn-icon {
  font-size: 18px;
}

.btn-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.action-btn:hover .btn-glow {
  opacity: 1;
}

.hero-visual {
  display: flex;
  justify-content: center;
  align-items: center;
  animation: slide-in-right 1s ease-out;
}

@keyframes slide-in-right {
  from { opacity: 0; transform: translateX(50px); }
  to { opacity: 1; transform: translateX(0); }
}

.sound-visualizer {
  position: relative;
  width: 300px;
  height: 300px;
}

.visualizer-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border: 2px solid var(--neon-blue);
  border-radius: 50%;
  opacity: 0.6;
}

.ring-1 {
  width: 100px;
  height: 100px;
  animation: ring-expand 3s ease-in-out infinite;
}

.ring-2 {
  width: 150px;
  height: 150px;
  animation: ring-expand 3s ease-in-out infinite 1s;
}

.ring-3 {
  width: 200px;
  height: 200px;
  animation: ring-expand 3s ease-in-out infinite 2s;
}

@keyframes ring-expand {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
  50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.3; }
}

.visualizer-core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  background: rgba(0, 212, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 2px solid var(--neon-blue);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.visualizer-core .el-icon {
  font-size: 32px;
  color: var(--neon-blue);
}

.sound-bars {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  height: 60px;
  align-items: flex-end;
}

.bar {
  width: 8px;
  background: linear-gradient(to top, var(--neon-blue), var(--neon-purple));
  border-radius: 4px;
  animation: bar-pulse 1s ease-in-out infinite alternate;
}

@keyframes bar-pulse {
  from { height: 20%; }
  to { height: 100%; }
}

/* 统计数据区域 */
.stats-section {
  padding: 80px 0;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border-top: 1px solid var(--glass-border);
  border-bottom: 1px solid var(--glass-border);
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 40px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 40px;
}

.stat-item {
  position: relative;
  text-align: center;
  padding: 40px 20px;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-5px);
  border-color: var(--neon-blue);
  box-shadow: 0 20px 40px rgba(0, 212, 255, 0.2);
}

.stat-icon {
  font-size: 32px;
  margin-bottom: 16px;
  filter: drop-shadow(0 0 20px currentColor);
}

.stat-number {
  font-size: 48px;
  font-weight: 800;
  color: var(--neon-blue);
  margin-bottom: 8px;
  font-family: 'JetBrains Mono', monospace;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.stat-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, var(--neon-blue) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  filter: blur(100px);
}

.stat-item:hover .stat-glow {
  opacity: 0.1;
}

/* 区域标题样式 */
.section-header {
  text-align: center;
  margin-bottom: 80px;
}

.section-badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 20px;
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 20px;
  margin-bottom: 24px;
  font-size: 12px;
  font-weight: 600;
  color: var(--neon-blue);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.section-title {
  font-size: clamp(36px, 6vw, 48px);
  font-weight: 800;
  margin-bottom: 16px;
  line-height: 1.2;
}

.title-gradient {
  background: linear-gradient(135deg, var(--neon-blue), var(--neon-purple), var(--neon-pink));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.section-subtitle {
  font-size: 18px;
  color: var(--text-muted);
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto;
}

/* 核心功能区域 */
.features-section {
  padding: 120px 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 40px;
}

.feature-card {
  position: relative;
  padding: 40px 30px;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 300px;
  display: flex;
  flex-direction: column;
}

.feature-card:hover {
  transform: translateY(-10px) scale(1.02);
  border-color: var(--neon-blue);
  box-shadow: 0 30px 60px rgba(0, 212, 255, 0.3);
}

.feature-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, var(--neon-blue) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.4s ease;
  filter: blur(100px);
}

.feature-card:hover .feature-glow {
  opacity: 0.15;
}

.feature-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, transparent 0%, rgba(0, 212, 255, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.feature-card:hover .feature-bg {
  opacity: 1;
}

.feature-content {
  position: relative;
  z-index: 2;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.feature-icon {
  position: relative;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: rgba(0, 212, 255, 0.1);
  border: 2px solid rgba(0, 212, 255, 0.3);
  border-radius: 20px;
}

.icon-emoji {
  font-size: 32px;
  filter: drop-shadow(0 0 20px currentColor);
}

.icon-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.icon-particles .particle {
  position: absolute;
  width: 2px;
  height: 2px;
  background: var(--neon-blue);
  border-radius: 50%;
  opacity: 0;
}

.feature-card:hover .icon-particles .particle {
  animation: icon-particle-float 2s ease-out infinite;
}

.icon-particles .particle:nth-child(1) { top: 20%; left: 20%; animation-delay: 0s; }
.icon-particles .particle:nth-child(2) { top: 20%; left: 80%; animation-delay: 0.2s; }
.icon-particles .particle:nth-child(3) { top: 80%; left: 20%; animation-delay: 0.4s; }
.icon-particles .particle:nth-child(4) { top: 80%; left: 80%; animation-delay: 0.6s; }
.icon-particles .particle:nth-child(5) { top: 50%; left: 10%; animation-delay: 0.8s; }
.icon-particles .particle:nth-child(6) { top: 50%; left: 90%; animation-delay: 1s; }

@keyframes icon-particle-float {
  0% { transform: translate(0, 0) scale(0); opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0; }
}

.feature-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
  line-height: 1.3;
}

.feature-description {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: 24px;
  flex-grow: 1;
}

.feature-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--neon-blue);
  font-weight: 600;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.3s ease;
}

.feature-card:hover .feature-link {
  opacity: 1;
  transform: translateY(0);
}

.link-arrow {
  font-size: 18px;
  transition: transform 0.3s ease;
}

.feature-card:hover .link-arrow {
  transform: translateX(5px);
}

.feature-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.feature-card:hover .feature-overlay {
  opacity: 1;
}

/* 工作流程区域 */
.workflow-section {
  padding: 120px 0;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border-top: 1px solid var(--glass-border);
  border-bottom: 1px solid var(--glass-border);
}

.workflow-container {
  position: relative;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 40px;
}

.workflow-line {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, var(--neon-blue) 0%, var(--neon-purple) 50%, var(--neon-pink) 100%);
  transform: translateY(-50%);
  opacity: 0.3;
  z-index: 1;
}

.workflow-steps {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 40px;
  position: relative;
  z-index: 2;
}

.workflow-step {
  text-align: center;
  position: relative;
}

.step-number {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 24px;
  background: var(--neon-blue);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}

.step-content {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 40px 20px;
  transition: all 0.3s ease;
}

.step-content:hover {
  transform: translateY(-5px);
  border-color: var(--neon-blue);
  box-shadow: 0 20px 40px rgba(0, 212, 255, 0.2);
}

.step-icon {
  font-size: 40px;
  margin-bottom: 16px;
  filter: drop-shadow(0 0 20px currentColor);
}

.step-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
  line-height: 1.3;
}

.step-description {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.step-connector {
  position: absolute;
  top: 50%;
  right: -40px;
  width: 40px;
  height: 2px;
  background: var(--neon-blue);
  opacity: 0.3;
  z-index: 1;
}

.connector-line {
  width: 100%;
  height: 100%;
  background: inherit;
  position: relative;
}

.connector-line::after {
  content: '';
  position: absolute;
  right: -4px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid var(--neon-blue);
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
}

/* 系统状态区域 */
.status-section {
  padding: 120px 0;
}

.status-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 40px;
}

/* 底部行动区域 */
.cta-section {
  position: relative;
  padding: 120px 0;
  overflow: hidden;
}

.cta-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
}

.cta-gradient {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--neon-blue) 0%, var(--neon-purple) 50%, var(--neon-pink) 100%);
  opacity: 0.1;
  filter: blur(100px);
}

.cta-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 40px;
  position: relative;
  z-index: 1;
}

.cta-text {
  max-width: 600px;
}

.cta-title {
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 16px;
  line-height: 1.2;
}

.cta-subtitle {
  font-size: 18px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.cta-actions {
  display: flex;
  gap: 20px;
}

.cta-btn {
  position: relative;
  padding: 20px 40px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.cta-btn.primary {
  background: linear-gradient(135deg, var(--neon-blue), var(--neon-purple));
  color: white;
}

.cta-btn.secondary {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
}

.cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 40px rgba(0, 212, 255, 0.3);
}

.btn-particles {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.cta-btn:hover .btn-particles::before,
.cta-btn:hover .btn-particles::after {
  content: '';
  position: absolute;
  width: 4px;
  height: 4px;
  background: white;
  border-radius: 50%;
  animation: btn-particle-burst 0.6s ease-out;
}

.cta-btn:hover .btn-particles::before {
  top: 20%;
  left: 30%;
}

.cta-btn:hover .btn-particles::after {
  top: 80%;
  right: 30%;
}

@keyframes btn-particle-burst {
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(20); opacity: 0; }
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .hero-content {
    grid-template-columns: 1fr;
    gap: 60px;
    text-align: center;
  }

  .features-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 30px;
  }

  .workflow-steps {
    grid-template-columns: repeat(3, 1fr);
  }

  .workflow-steps .workflow-step:nth-child(4),
  .workflow-steps .workflow-step:nth-child(5) {
    margin-top: 60px;
  }

  .step-connector {
    display: none;
  }

  .stats-container {
    grid-template-columns: repeat(2, 1fr);
  }

  .cta-content {
    flex-direction: column;
    gap: 40px;
    text-align: center;
  }
}

@media (max-width: 768px) {
  .hero-content,
  .section-header,
  .features-grid,
  .workflow-container,
  .status-container,
  .cta-content {
    padding: 0 20px;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .workflow-steps {
    grid-template-columns: 1fr;
    gap: 30px;
  }

  .workflow-step {
    margin-top: 0;
  }

  .stats-container {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .hero-actions {
    flex-direction: column;
    gap: 16px;
  }

  .cta-actions {
    flex-direction: column;
    gap: 16px;
  }

  .workflow-line {
    display: none;
  }
}

@media (max-width: 480px) {
  .hero-section {
    min-height: 80vh;
    padding: 40px 0;
  }

  .features-section,
  .workflow-section,
  .status-section {
    padding: 80px 0;
  }

  .cta-section {
    padding: 80px 0;
  }

  .sound-visualizer {
    width: 200px;
    height: 200px;
  }

  .hero-title {
    font-size: clamp(36px, 8vw, 48px);
  }
}
</style>
