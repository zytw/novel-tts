<template>
  <div id="app">
    <el-container class="app-container">
      <el-header class="app-header">
        <div class="header-content">
          <h1 class="app-title">
            <el-icon><Microphone /></el-icon>
            AI小说创作与语音合成
          </h1>
          <nav class="nav-menu">
            <router-link to="/" class="nav-item">首页</router-link>
            <router-link to="/models" class="nav-item">AI模型配置</router-link>
            <router-link to="/novel" class="nav-item">小说生成</router-link>
            <router-link to="/tts" class="nav-item">语音合成</router-link>
          </nav>
        </div>
      </el-header>

      <el-main class="app-main">
        <router-view />
      </el-main>

      <el-footer class="app-footer">
        <p>&copy; 2025 AI小说创作与语音合成平台</p>
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
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  background-color: #f5f5f5;
}

#app {
  min-height: 100vh;
}

.app-container {
  min-height: 100vh;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
}

.app-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 600;
}

.nav-menu {
  display: flex;
  gap: 30px;
}

.nav-item {
  color: white;
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.3s;
  padding: 8px 16px;
  border-radius: 4px;
}

.nav-item:hover {
  opacity: 0.8;
  background-color: rgba(255, 255, 255, 0.1);
}

.nav-item.router-link-active {
  background-color: rgba(255, 255, 255, 0.2);
}

.app-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 120px);
}

.app-footer {
  background-color: #333;
  color: white;
  text-align: center;
  padding: 20px;
}
</style>