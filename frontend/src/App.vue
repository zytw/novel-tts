<template>
  <div id="app">
    <div class="app-background">
      <div class="aurora-bg"></div>
      <div class="sound-waves">
        <div class="wave wave-1"></div>
        <div class="wave wave-2"></div>
        <div class="wave wave-3"></div>
      </div>
    </div>

    <el-container class="app-container">
      <!-- 顶部导航栏 -->
      <el-header class="app-header">
        <div class="header-glass">
          <div class="header-content">
            <div class="brand-section">
              <div class="logo-container">
                <div class="sound-logo">
                  <el-icon><Microphone /></el-icon>
                  <div class="sound-ring"></div>
                </div>
                <h1 class="app-title">SoundStory AI</h1>
              </div>
              <p class="brand-subtitle">声波叙事 · AI创作平台</p>
            </div>

            <nav class="nav-menu">
              <router-link to="/" class="nav-item" data-text="首页">
                <span class="nav-icon">🏠</span>
                <span class="nav-text">首页</span>
                <div class="nav-indicator"></div>
              </router-link>
              <router-link to="/models" class="nav-item" data-text="AI模型">
                <span class="nav-icon">🤖</span>
                <span class="nav-text">模型配置</span>
                <div class="nav-indicator"></div>
              </router-link>
              <router-link to="/novel" class="nav-item" data-text="小说创作">
                <span class="nav-icon">✍️</span>
                <span class="nav-text">小说生成</span>
                <div class="nav-indicator"></div>
              </router-link>
              <router-link to="/analysis" class="nav-item" data-text="角色分析">
                <span class="nav-icon">🎭</span>
                <span class="nav-text">角色分析</span>
                <div class="nav-indicator"></div>
              </router-link>
              <router-link to="/tts" class="nav-item" data-text="语音合成">
                <span class="nav-icon">🎙️</span>
                <span class="nav-text">语音合成</span>
                <div class="nav-indicator"></div>
              </router-link>
              <router-link to="/subtitle" class="nav-item" data-text="字幕生成">
                <span class="nav-icon">📝</span>
                <span class="nav-text">字幕生成</span>
                <div class="nav-indicator"></div>
              </router-link>
              <router-link to="/file-output" class="nav-item" data-text="文件输出">
                <span class="nav-icon">📦</span>
                <span class="nav-text">文件输出</span>
                <div class="nav-indicator"></div>
              </router-link>
            </nav>
          </div>
        </div>
      </el-header>

      <!-- 主内容区域 -->
      <el-main class="app-main">
        <div class="content-wrapper">
          <router-view />
        </div>
      </el-main>

      <!-- 底部信息栏 -->
      <el-footer class="app-footer">
        <div class="footer-glass">
          <div class="footer-content">
            <div class="footer-info">
              <p>&copy; 2025 SoundStory AI - 声波叙事平台</p>
              <p class="footer-motto">让每一个故事都有独特的声音</p>
            </div>
            <div class="footer-links">
              <span class="footer-link">API文档</span>
              <span class="footer-divider">|</span>
              <span class="footer-link">使用指南</span>
              <span class="footer-divider">|</span>
              <span class="footer-link">关于我们</span>
            </div>
          </div>
        </div>
      </el-footer>
    </el-container>
  </div>
</template>

<script>
import { Microphone } from '@element-plus/icons-vue'

export default {
  name: 'App',
  components: {
    Microphone
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --secondary-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  --aurora-gradient: linear-gradient(135deg, #1e3c72 0%, #2a5298 25%, #7e8ba3 50%, #b8c6db 75%, #f5f7fa 100%);
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.8);
  --text-muted: rgba(255, 255, 255, 0.6);
  --neon-blue: #00d4ff;
  --neon-purple: #9d4edd;
  --neon-pink: #ff006e;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0a0a0a;
  color: var(--text-primary);
  overflow-x: hidden;
}

#app {
  min-height: 100vh;
  position: relative;
}

/* 动态背景 */
.app-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  overflow: hidden;
}

.aurora-bg {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: var(--aurora-gradient);
  opacity: 0.1;
  animation: aurora-rotate 30s linear infinite;
  filter: blur(100px);
}

@keyframes aurora-rotate {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.2); }
  100% { transform: rotate(360deg) scale(1); }
}

/* 声波动画 */
.sound-waves {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 300px;
  opacity: 0.3;
}

.wave {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg,
    transparent,
    var(--neon-blue) 10%,
    var(--neon-purple) 50%,
    var(--neon-pink) 90%,
    transparent
  );
  animation: wave-motion 8s ease-in-out infinite;
}

.wave-1 { animation-delay: 0s; opacity: 1; }
.wave-2 { animation-delay: 2s; opacity: 0.7; height: 1px; }
.wave-3 { animation-delay: 4s; opacity: 0.4; height: 3px; }

@keyframes wave-motion {
  0%, 100% { transform: translateY(0) scaleX(1); }
  50% { transform: translateY(-100px) scaleX(1.1); }
}

/* 应用容器 */
.app-container {
  min-height: 100vh;
  position: relative;
}

/* 顶部导航栏 */
.app-header {
  position: relative;
  padding: 0;
  height: auto;
  background: transparent;
  z-index: 1000;
}

.header-glass {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--glass-border);
  position: relative;
  overflow: hidden;
}

.header-glass::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  animation: header-shine 6s ease-in-out infinite;
}

@keyframes header-shine {
  0% { left: -100%; }
  50%, 100% { left: 100%; }
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 40px;
  position: relative;
  z-index: 1;
}

/* 品牌区域 */
.brand-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sound-logo {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
}

.sound-logo .el-icon {
  font-size: 24px;
  color: var(--neon-blue);
  position: relative;
  z-index: 2;
}

.sound-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  border: 2px solid var(--neon-blue);
  border-radius: 50%;
  animation: ring-pulse 2s ease-in-out infinite;
}

@keyframes ring-pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.3);
    opacity: 0.5;
  }
}

.app-title {
  font-size: 28px;
  font-weight: 800;
  font-family: 'Inter', sans-serif;
  background: linear-gradient(135deg, var(--neon-blue), var(--neon-purple));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  letter-spacing: -0.5px;
}

.brand-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
  margin-left: 64px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

/* 导航菜单 */
.nav-menu {
  display: flex;
  gap: 8px;
  align-items: center;
}

.nav-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px;
  text-decoration: none;
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 13px;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  border: 1px solid transparent;
  min-width: 80px;
}

.nav-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  opacity: 0;
  transition: all 0.3s ease;
  z-index: -1;
}

.nav-item:hover {
  color: var(--text-primary);
  transform: translateY(-2px);
  border-color: var(--glass-border);
}

.nav-item:hover::before {
  opacity: 1;
}

.nav-item.router-link-active {
  color: var(--neon-blue);
  background: rgba(0, 212, 255, 0.1);
  border-color: rgba(0, 212, 255, 0.3);
}

.nav-icon {
  font-size: 18px;
  margin-bottom: 4px;
  filter: drop-shadow(0 0 10px currentColor);
}

.nav-text {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 2px;
  background: var(--neon-blue);
  border-radius: 1px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-item.router-link-active .nav-indicator {
  width: 60%;
  box-shadow: 0 0 20px var(--neon-blue);
}

/* 主内容区域 */
.app-main {
  padding: 0;
  background: transparent;
  position: relative;
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px;
  position: relative;
  z-index: 1;
}

/* 底部信息栏 */
.app-footer {
  padding: 0;
  background: transparent;
  height: auto;
  margin-top: auto;
}

.footer-glass {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--glass-border);
  position: relative;
  overflow: hidden;
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
}

.footer-info p {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 4px;
}

.footer-motto {
  color: var(--text-muted) !important;
  font-size: 12px !important;
  font-style: italic;
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 16px;
}

.footer-link {
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  transition: color 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.footer-link:hover {
  color: var(--neon-blue);
}

.footer-divider {
  color: var(--text-muted);
  opacity: 0.5;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .header-content {
    padding: 20px 30px;
  }

  .content-wrapper {
    padding: 30px;
  }

  .nav-menu {
    gap: 4px;
  }

  .nav-item {
    padding: 10px 16px;
    min-width: 70px;
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 20px;
    padding: 20px;
  }

  .brand-subtitle {
    margin-left: 0;
    text-align: center;
  }

  .nav-menu {
    flex-wrap: wrap;
    justify-content: center;
  }

  .nav-item {
    min-width: 60px;
    padding: 8px 12px;
  }

  .nav-text {
    font-size: 10px;
  }

  .content-wrapper {
    padding: 20px;
  }

  .footer-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .app-title {
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 16px;
  }

  .content-wrapper {
    padding: 16px;
  }

  .nav-menu {
    gap: 2px;
  }

  .nav-item {
    padding: 8px 8px;
    min-width: 50px;
  }

  .nav-icon {
    font-size: 16px;
  }

  .nav-text {
    font-size: 9px;
  }
}

/* Element Plus 样式覆盖 */
.el-header, .el-main, .el-footer {
  padding: 0;
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
