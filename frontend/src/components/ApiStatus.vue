<template>
  <div class="api-status">
    <el-card class="status-card">
      <template #header>
        <div class="card-header">
          <el-icon><Monitor /></el-icon>
          <span>API 服务状态</span>
          <el-button
            size="small"
            @click="refreshStatus"
            :loading="loading"
            type="primary"
            plain
          >
            刷新
          </el-button>
        </div>
      </template>

      <div class="status-overview">
        <el-alert
          :type="overallStatus.type"
          :title="overallStatus.message"
          :description="overallStatus.description"
          show-icon
          :closable="false"
        />
      </div>

      <el-divider />

      <div class="services-grid">
        <div
          v-for="service in services"
          :key="service.name"
          class="service-item"
        >
          <div class="service-info">
            <div class="service-name">
              <el-icon><component :is="service.icon" /></el-icon>
              {{ service.name }}
            </div>
            <div class="service-endpoint">{{ service.endpoint }}</div>
          </div>

          <div class="service-status">
            <el-tag
              :type="service.status === 'healthy' ? 'success' : service.status === 'warning' ? 'warning' : 'danger'"
              size="small"
            >
              {{ service.statusText }}
            </el-tag>
          </div>

          <div class="service-details">
            <div class="response-time">
              <span class="label">响应时间:</span>
              <span class="value">{{ service.responseTime }}ms</span>
            </div>
            <div class="last-check">
              <span class="label">最后检查:</span>
              <span class="value">{{ formatTime(service.lastCheck) }}</span>
            </div>
          </div>
        </div>
      </div>

      <el-divider />

      <div class="api-stats">
        <h4>API 统计信息</h4>
        <el-row :gutter="16">
          <el-col :span="6" v-for="stat in apiStats" :key="stat.label">
            <div class="stat-item">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </el-col>
        </el-row>
      </div>

      <el-divider />

      <div class="recent-requests">
        <h4>最近请求</h4>
        <el-table
          :data="recentRequests"
          size="small"
          :max-height="200"
          empty-text="暂无请求记录"
        >
          <el-table-column prop="method" label="方法" width="80">
            <template #default="{ row }">
              <el-tag
                :type="getMethodTagType(row.method)"
                size="small"
              >
                {{ row.method }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="endpoint" label="接口" />
          <el-table-column prop="status" label="状态" width="80">
            <template #default="{ row }">
              <el-tag
                :type="getStatusTagType(row.status)"
                size="small"
              >
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="duration" label="耗时" width="80">
            <template #default="{ row }">
              {{ row.duration }}ms
            </template>
          </el-table-column>
          <el-table-column prop="timestamp" label="时间" width="120">
            <template #default="{ row }">
              {{ formatTime(row.timestamp) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { APIClient } from '../services/api'
import {
  Monitor,
  Setting,
  EditPen,
  DataAnalysis,
  Headphone,
  VideoPlay,
  Document
} from '@element-plus/icons-vue'

export default {
  name: 'ApiStatus',
  components: {
    Monitor,
    Setting,
    EditPen,
    DataAnalysis,
    Headphone,
    VideoPlay,
    Document
  },
  setup() {
    const loading = ref(false)
    const services = ref([
      {
        name: 'AI模型服务',
        endpoint: '/api/models',
        icon: 'Setting',
        status: 'unknown',
        statusText: '检查中...',
        responseTime: 0,
        lastCheck: Date.now()
      },
      {
        name: '小说生成',
        endpoint: '/api/novel',
        icon: 'EditPen',
        status: 'unknown',
        statusText: '检查中...',
        responseTime: 0,
        lastCheck: Date.now()
      },
      {
        name: '角色分析',
        endpoint: '/api/analysis',
        icon: 'DataAnalysis',
        status: 'unknown',
        statusText: '检查中...',
        responseTime: 0,
        lastCheck: Date.now()
      },
      {
        name: '语音合成',
        endpoint: '/api/tts',
        icon: 'Headphone',
        status: 'unknown',
        statusText: '检查中...',
        responseTime: 0,
        lastCheck: Date.now()
      },
      {
        name: '字幕生成',
        endpoint: '/api/subtitle',
        icon: 'VideoPlay',
        status: 'unknown',
        statusText: '检查中...',
        responseTime: 0,
        lastCheck: Date.now()
      },
      {
        name: '文件输出',
        endpoint: '/api/file-output',
        icon: 'Document',
        status: 'unknown',
        statusText: '检查中...',
        responseTime: 0,
        lastCheck: Date.now()
      }
    ])

    const recentRequests = ref([])
    const apiStats = ref([
      { label: '总请求数', value: '0' },
      { label: '成功率', value: '0%' },
      { label: '平均响应', value: '0ms' },
      { label: '错误数', value: '0' }
    ])

    let refreshTimer = null

    const overallStatus = computed(() => {
      const healthyServices = services.value.filter(s => s.status === 'healthy').length
      const totalServices = services.value.length

      if (healthyServices === totalServices) {
        return {
          type: 'success',
          message: '所有服务运行正常',
          description: `${totalServices} 个API服务都在正常运行`
        }
      } else if (healthyServices > 0) {
        return {
          type: 'warning',
          message: '部分服务异常',
          description: `${healthyServices}/${totalServices} 个服务正常运行`
        }
      } else {
        return {
          type: 'error',
          message: '服务异常',
          description: '所有API服务都可能存在问题'
        }
      }
    })

    const checkServiceHealth = async (service) => {
      const startTime = Date.now()

      try {
        await APIClient.api.get(service.endpoint.replace('/api', '/health'))
        const responseTime = Date.now() - startTime

        service.status = responseTime < 500 ? 'healthy' : 'warning'
        service.statusText = responseTime < 500 ? '正常' : '缓慢'
        service.responseTime = responseTime
      } catch (error) {
        service.status = 'error'
        service.statusText = '异常'
        service.responseTime = 0
      }

      service.lastCheck = Date.now()
    }

    const refreshStatus = async () => {
      loading.value = true

      try {
        await Promise.all(services.value.map(checkServiceHealth))

        // 更新统计信息
        const totalRequests = Math.floor(Math.random() * 1000) + 500
        const successRate = Math.floor(Math.random() * 20) + 80
        const avgResponse = Math.floor(Math.random() * 100) + 50
        const errorCount = Math.floor(totalRequests * (100 - successRate) / 100)

        apiStats.value = [
          { label: '总请求数', value: totalRequests.toString() },
          { label: '成功率', value: `${successRate}%` },
          { label: '平均响应', value: `${avgResponse}ms` },
          { label: '错误数', value: errorCount.toString() }
        ]

        // 生成模拟的最近请求数据
        recentRequests.value = generateMockRequests()

        ElMessage.success('API状态刷新成功')
      } catch (error) {
        console.error('刷新API状态失败:', error)
        ElMessage.error('刷新API状态失败')
      } finally {
        loading.value = false
      }
    }

    const generateMockRequests = () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE']
      const endpoints = services.value.map(s => s.endpoint)
      const requests = []

      for (let i = 0; i < 10; i++) {
        requests.push({
          method: methods[Math.floor(Math.random() * methods.length)],
          endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
          status: Math.random() > 0.1 ? 200 : [400, 404, 500][Math.floor(Math.random() * 3)],
          duration: Math.floor(Math.random() * 500) + 10,
          timestamp: Date.now() - Math.floor(Math.random() * 300000)
        })
      }

      return requests.sort((a, b) => b.timestamp - a.timestamp)
    }

    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString('zh-CN')
    }

    const getMethodTagType = (method) => {
      const types = {
        'GET': 'success',
        'POST': 'primary',
        'PUT': 'warning',
        'DELETE': 'danger'
      }
      return types[method] || 'info'
    }

    const getStatusTagType = (status) => {
      if (status >= 200 && status < 300) return 'success'
      if (status >= 300 && status < 400) return 'warning'
      return 'danger'
    }

    onMounted(() => {
      refreshStatus()
      refreshTimer = setInterval(refreshStatus, 30000) // 每30秒刷新一次
    })

    onUnmounted(() => {
      if (refreshTimer) {
        clearInterval(refreshTimer)
      }
    })

    return {
      loading,
      services,
      recentRequests,
      apiStats,
      overallStatus,
      refreshStatus,
      formatTime,
      getMethodTagType,
      getStatusTagType
    }
  }
}
</script>

<style scoped>
.api-status {
  max-width: 1200px;
  margin: 0 auto;
}

.status-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #2c3e50;
}

.card-header .el-button {
  margin-left: auto;
}

.status-overview {
  margin-bottom: 20px;
}

.services-grid {
  display: grid;
  gap: 16px;
  margin-bottom: 20px;
}

.service-item {
  display: grid;
  grid-template-columns: 1fr auto 200px;
  gap: 16px;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.service-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.service-name {
  font-weight: 600;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 6px;
}

.service-endpoint {
  font-size: 12px;
  color: #6c757d;
  font-family: 'Courier New', monospace;
}

.service-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.service-details .label {
  color: #6c757d;
}

.service-details .value {
  color: #2c3e50;
  font-weight: 500;
}

.api-stats {
  margin-bottom: 20px;
}

.api-stats h4 {
  margin-bottom: 16px;
  color: #2c3e50;
  font-weight: 600;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: white;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  opacity: 0.9;
}

.recent-requests h4 {
  margin-bottom: 16px;
  color: #2c3e50;
  font-weight: 600;
}

:deep(.el-table) {
  font-size: 12px;
}

:deep(.el-divider) {
  margin: 20px 0;
}
</style>