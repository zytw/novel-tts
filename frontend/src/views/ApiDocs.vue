<template>
  <div class="api-docs">
    <div class="docs-header">
      <h1>API 文档</h1>
      <p class="docs-subtitle">
        AI小说创作与语音合成平台 RESTful API 接口文档
      </p>

      <div class="header-actions">
        <el-button @click="downloadSwagger" type="primary" icon="Download">
          下载 OpenAPI 规范
        </el-button>
        <el-button @click="testApi" type="success" icon="Connection">
          API 在线测试
        </el-button>
        <el-button @click="refreshDocs" icon="Refresh" :loading="loading">
          刷新文档
        </el-button>
      </div>
    </div>

    <el-card class="base-info-card">
      <template #header>
        <div class="section-header">
          <el-icon><InfoFilled /></el-icon>
          基本信息
        </div>
      </template>

      <el-row :gutter="24">
        <el-col :span="8">
          <div class="info-item">
            <div class="info-label">Base URL</div>
            <div class="info-value">{{ baseUrl }}</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="info-item">
            <div class="info-label">API 版本</div>
            <div class="info-value">{{ apiInfo.version }}</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="info-item">
            <div class="info-label">认证方式</div>
            <div class="info-value">Bearer Token</div>
          </div>
        </el-col>
      </el-row>

      <el-divider />

      <div class="auth-section">
        <h4>认证说明</h4>
        <p>所有API请求需要在请求头中包含认证Token：</p>
        <el-input
          v-model="authHeader"
          readonly
          class="auth-input"
        >
          <template #prepend>Authorization</template>
        </el-input>
      </div>
    </el-card>

    <el-card class="endpoints-card">
      <template #header>
        <div class="section-header">
          <el-icon><List /></el-icon>
          API 接口列表
        </div>
      </template>

      <div class="endpoint-categories">
        <el-tabs v-model="activeCategory" @tab-change="handleCategoryChange">
          <el-tab-pane
            v-for="category in apiCategories"
            :key="category.key"
            :label="category.name"
            :name="category.key"
          >
            <div class="category-endpoints">
              <div
                v-for="endpoint in category.endpoints"
                :key="endpoint.path"
                class="endpoint-item"
              >
                <div class="endpoint-header" @click="toggleEndpoint(endpoint)">
                  <div class="endpoint-method">
                    <el-tag :type="getMethodTagType(endpoint.method)" size="small">
                      {{ endpoint.method }}
                    </el-tag>
                  </div>
                  <div class="endpoint-path">{{ endpoint.path }}</div>
                  <div class="endpoint-summary">{{ endpoint.summary }}</div>
                  <el-icon class="expand-icon" :class="{ expanded: endpoint.expanded }">
                    <ArrowDown />
                  </el-icon>
                </div>

                <el-collapse-transition>
                  <div v-show="endpoint.expanded" class="endpoint-details">
                    <div class="endpoint-description">
                      <h5>接口描述</h5>
                      <p>{{ endpoint.description }}</p>
                    </div>

                    <div v-if="endpoint.parameters && endpoint.parameters.length > 0" class="endpoint-parameters">
                      <h5>请求参数</h5>
                      <el-table :data="endpoint.parameters" size="small">
                        <el-table-column prop="name" label="参数名" width="150" />
                        <el-table-column prop="type" label="类型" width="100">
                          <template #default="{ row }">
                            <el-tag size="small">{{ row.type }}</el-tag>
                          </template>
                        </el-table-column>
                        <el-table-column prop="required" label="必需" width="80">
                          <template #default="{ row }">
                            <el-tag :type="row.required ? 'danger' : 'info'" size="small">
                              {{ row.required ? '是' : '否' }}
                            </el-tag>
                          </template>
                        </el-table-column>
                        <el-table-column prop="description" label="说明" />
                      </el-table>
                    </div>

                    <div v-if="endpoint.responses" class="endpoint-responses">
                      <h5>响应示例</h5>
                      <div
                        v-for="(response, status) in endpoint.responses"
                        :key="status"
                        class="response-item"
                      >
                        <div class="response-status">
                          <el-tag :type="getStatusTagType(status)" size="small">
                            {{ status }}
                          </el-tag>
                          <span class="response-description">{{ response.description }}</span>
                        </div>
                        <pre class="response-example">{{ JSON.stringify(response.example, null, 2) }}</pre>
                      </div>
                    </div>

                    <div class="endpoint-actions">
                      <el-button @click="testEndpoint(endpoint)" size="small" type="primary">
                        测试接口
                      </el-button>
                      <el-button @click="copyEndpoint(endpoint)" size="small" type="default">
                        复制URL
                      </el-button>
                    </div>
                  </div>
                </el-collapse-transition>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-card>

    <!-- API测试对话框 -->
    <el-dialog
      v-model="testDialogVisible"
      title="API 接口测试"
      width="80%"
      :close-on-click-modal="false"
    >
      <div v-if="testEndpoint" class="test-interface">
        <div class="test-header">
          <el-tag :type="getMethodTagType(testEndpoint.method)">
            {{ testEndpoint.method }}
          </el-tag>
          <span class="test-path">{{ testEndpoint.path }}</span>
        </div>

        <div class="test-parameters">
          <h4>请求参数</h4>
          <el-form :model="testParams" label-width="120px">
            <el-form-item
              v-for="param in testEndpoint.parameters"
              :key="param.name"
              :label="param.name"
              :required="param.required"
            >
              <el-input
                v-model="testParams[param.name]"
                :placeholder="param.description || `请输入${param.name}`"
                :type="param.type === 'file' ? 'file' : 'text'"
              />
            </el-form-item>
          </el-form>
        </div>

        <div class="test-actions">
          <el-button @click="executeTest" type="primary" :loading="testLoading">
            发送请求
          </el-button>
          <el-button @click="resetTest">重置</el-button>
        </div>

        <div v-if="testResult" class="test-result">
          <h4>响应结果</h4>
          <div class="result-header">
            <el-tag :type="getStatusTagType(testResult.status)">
              {{ testResult.status }} {{ testResult.statusText }}
            </el-tag>
            <span class="response-time">响应时间: {{ testResult.responseTime }}ms</span>
          </div>
          <pre class="result-body">{{ JSON.stringify(testResult.data, null, 2) }}</pre>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { APIClient } from '../services/api'
import {
  InfoFilled,
  List,
  Download,
  Connection,
  Refresh,
  ArrowDown
} from '@element-plus/icons-vue'

export default {
  name: 'ApiDocs',
  components: {
    InfoFilled,
    List,
    Download,
    Connection,
    Refresh,
    ArrowDown
  },
  setup() {
    const loading = ref(false)
    const testDialogVisible = ref(false)
    const testLoading = ref(false)
    const activeCategory = ref('models')
    const testEndpoint = ref(null)
    const testParams = ref({})
    const testResult = ref(null)

    const apiInfo = ref({
      version: 'v1.0.0',
      title: 'AI小说创作与语音合成API',
      description: '提供AI小说生成、角色分析、语音合成等功能的RESTful API'
    })

    const baseUrl = computed(() => {
      return process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/api'
        : '/api'
    })

    const authHeader = computed(() => {
      const token = localStorage.getItem('auth_token')
      return token ? `Bearer ${token}` : 'Bearer <your-token-here>'
    })

    const apiCategories = ref([
      {
        key: 'models',
        name: 'AI模型管理',
        endpoints: [
          {
            path: '/api/models',
            method: 'GET',
            summary: '获取所有AI模型',
            description: '返回系统中配置的所有可用AI模型列表',
            expanded: false,
            parameters: [],
            responses: {
              '200': {
                description: '成功获取模型列表',
                example: {
                  success: true,
                  data: [
                    {
                      id: 1,
                      name: 'GPT-4',
                      provider: 'OpenAI',
                      type: 'text-generation',
                      status: 'active'
                    }
                  ]
                }
              }
            }
          },
          {
            path: '/api/models',
            method: 'POST',
            summary: '创建AI模型配置',
            description: '添加新的AI模型配置到系统中',
            expanded: false,
            parameters: [
              { name: 'name', type: 'string', required: true, description: '模型名称' },
              { name: 'provider', type: 'string', required: true, description: '提供商' },
              { name: 'apiKey', type: 'string', required: true, description: 'API密钥' }
            ],
            responses: {
              '201': {
                description: '模型创建成功',
                example: {
                  success: true,
                  data: { id: 1, name: 'GPT-4', provider: 'OpenAI' }
                }
              }
            }
          }
        ]
      },
      {
        key: 'novel',
        name: '小说生成',
        endpoints: [
          {
            path: '/api/novel',
            method: 'GET',
            summary: '获取小说列表',
            description: '获取用户创作的所有小说',
            expanded: false,
            parameters: [
              { name: 'page', type: 'number', required: false, description: '页码' },
              { name: 'pageSize', type: 'number', required: false, description: '每页数量' }
            ],
            responses: {
              '200': {
                description: '成功获取小说列表',
                example: {
                  success: true,
                  data: [
                    {
                      id: 1,
                      title: '科幻小说',
                      content: '故事内容...',
                      createdAt: '2024-01-01T00:00:00Z'
                    }
                  ]
                }
              }
            }
          },
          {
            path: '/api/novel/generate',
            method: 'POST',
            summary: '生成小说内容',
            description: '使用AI生成新的小说内容',
            expanded: false,
            parameters: [
              { name: 'prompt', type: 'string', required: true, description: '创作提示' },
              { name: 'modelId', type: 'number', required: true, description: '使用的AI模型ID' },
              { name: 'style', type: 'string', required: false, description: '写作风格' }
            ],
            responses: {
              '200': {
                description: '小说生成成功',
                example: {
                  success: true,
                  data: {
                    id: 1,
                    title: '生成的小说标题',
                    content: '生成的小说内容...',
                    wordCount: 1500
                  }
                }
              }
            }
          }
        ]
      },
      {
        key: 'analysis',
        name: '角色分析',
        endpoints: [
          {
            path: '/api/analysis/analyze',
            method: 'POST',
            summary: '分析小说角色',
            description: '分析小说文本，识别角色并为每个角色分配音色',
            expanded: false,
            parameters: [
              { name: 'novelId', type: 'number', required: true, description: '小说ID' },
              { name: 'analysisType', type: 'string', required: false, description: '分析类型' }
            ],
            responses: {
              '200': {
                description: '角色分析完成',
                example: {
                  success: true,
                  data: {
                    characters: [
                      {
                        name: '主角',
                        gender: 'male',
                        age: 25,
                        personality: '勇敢、坚定',
                        voiceProfile: 'deep-male'
                      }
                    ]
                  }
                }
              }
            }
          }
        ]
      },
      {
        key: 'tts',
        name: '语音合成',
        endpoints: [
          {
            path: '/api/tts/generate',
            method: 'POST',
            summary: '生成语音合成',
            description: '将小说文本转换为语音音频',
            expanded: false,
            parameters: [
              { name: 'novelId', type: 'number', required: true, description: '小说ID' },
              { name: 'analysisId', type: 'number', required: true, description: '角色分析ID' },
              { name: 'voiceSettings', type: 'object', required: false, description: '语音设置' }
            ],
            responses: {
              '200': {
                description: '语音合成完成',
                example: {
                  success: true,
                  data: {
                    audioUrl: '/api/tts/audio/123.mp3',
                    duration: 120,
                    fileSize: '2.5MB'
                  }
                }
              }
            }
          }
        ]
      },
      {
        key: 'subtitle',
        name: '字幕生成',
        endpoints: [
          {
            path: '/api/subtitle/generate',
            method: 'POST',
            summary: '生成字幕文件',
            description: '为音频文件生成SRT字幕',
            expanded: false,
            parameters: [
              { name: 'audioId', type: 'number', required: true, description: '音频文件ID' },
              { name: 'format', type: 'string', required: false, description: '字幕格式 (srt/vtt)' }
            ],
            responses: {
              '200': {
                description: '字幕生成完成',
                example: {
                  success: true,
                  data: {
                    subtitleUrl: '/api/subtitle/file/123.srt',
                    format: 'srt',
                    duration: 120
                  }
                }
              }
            }
          }
        ]
      },
      {
        key: 'file-output',
        name: '文件输出',
        endpoints: [
          {
            path: '/api/file-output/export',
            method: 'POST',
            summary: '导出项目文件',
            description: '导出完整的小说项目，包括文本、音频和字幕',
            expanded: false,
            parameters: [
              { name: 'novelId', type: 'number', required: true, description: '小说ID' },
              { name: 'formats', type: 'array', required: false, description: '导出格式' }
            ],
            responses: {
              '200': {
                description: '文件导出完成',
                example: {
                  success: true,
                  data: {
                    downloadUrl: '/api/file-output/download/project_123.zip',
                    files: [
                      'novel.txt',
                      'audio.mp3',
                      'subtitles.srt'
                    ]
                  }
                }
              }
            }
          }
        ]
      }
    ])

    const toggleEndpoint = (endpoint) => {
      endpoint.expanded = !endpoint.expanded
    }

    const getMethodTagType = (method) => {
      const types = {
        'GET': 'success',
        'POST': 'primary',
        'PUT': 'warning',
        'DELETE': 'danger',
        'PATCH': 'info'
      }
      return types[method] || 'info'
    }

    const getStatusTagType = (status) => {
      const code = parseInt(status)
      if (code >= 200 && code < 300) return 'success'
      if (code >= 300 && code < 400) return 'warning'
      if (code >= 400 && code < 500) return 'warning'
      return 'danger'
    }

    const handleCategoryChange = (category) => {
      activeCategory.value = category
    }

    const testEndpointAction = (endpoint) => {
      testEndpoint.value = endpoint
      testParams.value = {}
      testResult.value = null

      // 初始化参数默认值
      if (endpoint.parameters) {
        endpoint.parameters.forEach(param => {
          if (param.type === 'number') {
            testParams.value[param.name] = param.required ? 1 : ''
          } else {
            testParams.value[param.name] = param.required ? '' : ''
          }
        })
      }

      testDialogVisible.value = true
    }

    const executeTest = async () => {
      if (!testEndpoint.value) return

      testLoading.value = true
      const startTime = Date.now()

      try {
        const config = {
          method: testEndpoint.value.method.toLowerCase(),
          url: testEndpoint.value.path
        }

        if (testEndpoint.value.method !== 'GET') {
          config.data = testParams.value
        } else {
          config.params = testParams.value
        }

        const response = await APIClient.api.request(config)
        const responseTime = Date.now() - startTime

        testResult.value = {
          status: response.status,
          statusText: response.statusText,
          responseTime,
          data: response.data
        }

        ElMessage.success('API测试成功')
      } catch (error) {
        const responseTime = Date.now() - startTime

        testResult.value = {
          status: error.response?.status || 0,
          statusText: error.response?.statusText || error.message,
          responseTime,
          data: error.response?.data || { error: error.message }
        }

        ElMessage.error('API测试失败')
      } finally {
        testLoading.value = false
      }
    }

    const resetTest = () => {
      testParams.value = {}
      testResult.value = null

      if (testEndpoint.value && testEndpoint.value.parameters) {
        testEndpoint.value.parameters.forEach(param => {
          if (param.type === 'number') {
            testParams.value[param.name] = param.required ? 1 : ''
          } else {
            testParams.value[param.name] = param.required ? '' : ''
          }
        })
      }
    }

    const copyEndpoint = (endpoint) => {
      const url = `${baseUrl.value}${endpoint.path}`
      navigator.clipboard.writeText(url).then(() => {
        ElMessage.success('URL已复制到剪贴板')
      }).catch(() => {
        ElMessage.error('复制失败')
      })
    }

    const downloadSwagger = () => {
      const swaggerSpec = {
        openapi: '3.0.0',
        info: {
          title: apiInfo.value.title,
          version: apiInfo.value.version,
          description: apiInfo.value.description
        },
        servers: [
          { url: baseUrl.value, description: 'Development Server' }
        ],
        paths: {}
      }

      // 构建OpenAPI规范
      apiCategories.value.forEach(category => {
        category.endpoints.forEach(endpoint => {
          if (!swaggerSpec.paths[endpoint.path]) {
            swaggerSpec.paths[endpoint.path] = {}
          }

          swaggerSpec.paths[endpoint.path][endpoint.method.toLowerCase()] = {
            summary: endpoint.summary,
            description: endpoint.description,
            responses: endpoint.responses || {}
          }
        })
      })

      const blob = new Blob([JSON.stringify(swaggerSpec, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'api-specification.json'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      ElMessage.success('OpenAPI规范已下载')
    }

    const refreshDocs = async () => {
      loading.value = true
      try {
        // 这里可以实际从服务器获取最新的API文档
        await new Promise(resolve => setTimeout(resolve, 1000))
        ElMessage.success('API文档已刷新')
      } catch (error) {
        ElMessage.error('刷新文档失败')
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      // 初始化时可以自动加载一些数据
    })

    return {
      loading,
      testDialogVisible,
      testLoading,
      activeCategory,
      testEndpoint,
      testParams,
      testResult,
      apiInfo,
      baseUrl,
      authHeader,
      apiCategories,
      toggleEndpoint,
      getMethodTagType,
      getStatusTagType,
      handleCategoryChange,
      testEndpoint: testEndpointAction,
      executeTest,
      resetTest,
      copyEndpoint,
      downloadSwagger,
      refreshDocs
    }
  }
}
</script>

<style scoped>
.api-docs {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.docs-header {
  text-align: center;
  margin-bottom: 40px;
}

.docs-header h1 {
  font-size: 36px;
  color: #2c3e50;
  margin-bottom: 16px;
}

.docs-subtitle {
  font-size: 16px;
  color: #606266;
  margin-bottom: 24px;
}

.header-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.base-info-card {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #2c3e50;
}

.info-item {
  text-align: center;
}

.info-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.info-value {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  font-family: 'Courier New', monospace;
}

.auth-section h4 {
  margin-bottom: 12px;
  color: #2c3e50;
}

.auth-input {
  margin-top: 12px;
}

.endpoints-card {
  margin-bottom: 24px;
}

.endpoint-categories {
  margin-top: 16px;
}

.category-endpoints {
  margin-top: 16px;
}

.endpoint-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
}

.endpoint-header {
  display: grid;
  grid-template-columns: 80px 1fr auto 40px;
  gap: 16px;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  cursor: pointer;
  transition: background-color 0.3s;
}

.endpoint-header:hover {
  background: #f0f2f5;
}

.endpoint-path {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #2c3e50;
}

.endpoint-summary {
  color: #606266;
  font-size: 14px;
}

.expand-icon {
  transition: transform 0.3s;
  color: #909399;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.endpoint-details {
  padding: 20px;
  background: white;
  border-top: 1px solid #e4e7ed;
}

.endpoint-description,
.endpoint-parameters,
.endpoint-responses {
  margin-bottom: 20px;
}

.endpoint-description h5,
.endpoint-parameters h5,
.endpoint-responses h5 {
  margin-bottom: 12px;
  color: #2c3e50;
  font-weight: 600;
}

.response-item {
  margin-bottom: 16px;
}

.response-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.response-description {
  color: #606266;
  font-size: 14px;
}

.response-example {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
  margin: 8px 0 0 0;
}

.endpoint-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #f0f2f5;
}

.test-interface {
  padding: 16px 0;
}

.test-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.test-path {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #2c3e50;
}

.test-parameters {
  margin-bottom: 24px;
}

.test-parameters h4 {
  margin-bottom: 16px;
  color: #2c3e50;
}

.test-actions {
  margin-bottom: 24px;
  text-align: center;
}

.test-result {
  border-top: 1px solid #e4e7ed;
  padding-top: 20px;
}

.test-result h4 {
  margin-bottom: 16px;
  color: #2c3e50;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.response-time {
  color: #909399;
  font-size: 14px;
}

.result-body {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
}

:deep(.el-tabs__header) {
  margin-bottom: 20px;
}

:deep(.el-table) {
  font-size: 12px;
}

:deep(.el-form-item__label) {
  font-size: 14px;
}

:deep(.el-divider) {
  margin: 20px 0;
}
</style>