<template>
  <div class="tts-page">
    <el-card>
      <template #header>
        <h2>语音合成</h2>
      </template>
      <div class="coming-soon">
        <el-icon size="80"><Headphone /></el-icon>
        <h3>功能开发中</h3>
        <p>INDEX-TTS2语音合成功能即将上线，敬请期待！</p>
        <el-button type="primary" @click="$router.push('/models')">
          先去配置AI模型
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
import { Headphone } from '@element-plus/icons-vue'

export default {
  name: 'TTS',
  components: {
    Headphone
  }
}
</script>

<style scoped>
.coming-soon {
  text-align: center;
  padding: 60px 20px;
  color: #909399;
}

.coming-soon .el-icon {
  color: #667eea;
  margin-bottom: 20px;
}

.coming-soon h3 {
  font-size: 24px;
  margin-bottom: 12px;
  color: #606266;
}

.coming-soon p {
  font-size: 16px;
  margin-bottom: 24px;
}
</style>