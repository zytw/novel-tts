<template>
  <div class="novel-page">
    <el-card>
      <template #header>
        <h2>AI小说生成</h2>
      </template>
      <div class="coming-soon">
        <el-icon size="80"><EditPen /></el-icon>
        <h3>功能开发中</h3>
        <p>AI小说生成功能即将上线，敬请期待！</p>
        <el-button type="primary" @click="$router.push('/models')">
          先去配置AI模型
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
import { EditPen } from '@element-plus/icons-vue'

export default {
  name: 'Novel',
  components: {
    EditPen
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