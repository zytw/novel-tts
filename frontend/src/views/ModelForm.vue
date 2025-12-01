<template>
  <div class="model-form">
    <div class="form-header">
      <h2>{{ isEdit ? '编辑AI模型' : '添加AI模型' }}</h2>
      <el-button @click="goBack">返回</el-button>
    </div>

    <el-card class="form-card">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
      >
        <el-form-item label="模型ID" prop="id">
          <el-input
            v-model="form.id"
            placeholder="请输入模型ID，如: gpt-4"
            :disabled="isEdit"
          />
          <div class="form-tip">
            模型ID用于唯一标识模型，只能包含字母、数字、下划线和连字符
          </div>
        </el-form-item>

        <el-form-item label="模型名称" prop="name">
          <el-input
            v-model="form.name"
            placeholder="请输入模型名称，如: GPT-4"
          />
        </el-form-item>

        <el-form-item label="提供商" prop="provider">
          <el-select
            v-model="form.provider"
            placeholder="请选择AI提供商"
            style="width: 100%"
          >
            <el-option label="OpenAI" value="OpenAI" />
            <el-option label="Anthropic" value="Anthropic" />
            <el-option label="Google" value="Google" />
            <el-option label="Alibaba" value="Alibaba" />
            <el-option label="百度" value="百度" />
            <el-option label="腾讯" value="腾讯" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>

        <el-form-item label="模型类型" prop="type">
          <el-select
            v-model="form.type"
            placeholder="请选择模型类型"
            style="width: 100%"
          >
            <el-option label="文本生成" value="text-generation" />
            <el-option label="对话模型" value="chat" />
            <el-option label="代码生成" value="code-generation" />
            <el-option label="图像生成" value="image-generation" />
            <el-option label="语音合成" value="text-to-speech" />
          </el-select>
        </el-form-item>

        <el-form-item label="API密钥" prop="apiKey">
          <el-input
            v-model="form.apiKey"
            type="password"
            placeholder="请输入API密钥"
            show-password
          />
        </el-form-item>

        <el-form-item label="API端点" prop="endpoint">
          <el-input
            v-model="form.endpoint"
            placeholder="请输入API端点URL"
          />
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入模型描述"
          />
        </el-form-item>

        <el-form-item label="启用状态">
          <el-switch v-model="form.enabled" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSave">
            {{ isEdit ? '保存' : '添加' }}
          </el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

export default {
  name: 'ModelForm',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const formRef = ref()

    const form = reactive({
      id: '',
      name: '',
      provider: '',
      type: '',
      apiKey: '',
      endpoint: '',
      description: '',
      enabled: true
    })

    const rules = {
      id: [
        { required: true, message: '请输入模型ID', trigger: 'blur' },
        { pattern: /^[a-zA-Z0-9_-]+$/, message: '模型ID只能包含字母、数字、下划线和连字符', trigger: 'blur' }
      ],
      name: [
        { required: true, message: '请输入模型名称', trigger: 'blur' }
      ],
      provider: [
        { required: true, message: '请选择提供商', trigger: 'change' }
      ],
      type: [
        { required: true, message: '请选择模型类型', trigger: 'change' }
      ],
      apiKey: [
        { required: true, message: '请输入API密钥', trigger: 'blur' }
      ],
      endpoint: [
        { required: true, message: '请输入API端点', trigger: 'blur' },
        { type: 'url', message: '请输入有效的URL', trigger: 'blur' }
      ]
    }

    const isEdit = computed(() => route.name === 'EditModel')
    const modelId = computed(() => route.params.id)

    const handleSave = async () => {
      if (!formRef.value) return

      try {
        await formRef.value.validate()

        const apiUrl = isEdit.value
          ? `/api/models/${modelId.value}`
          : '/api/models'

        const method = isEdit.value ? 'PUT' : 'POST'

        const response = await fetch(apiUrl, {
          method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(form)
        })

        if (response.ok) {
          ElMessage.success(isEdit.value ? '模型更新成功' : '模型添加成功')
          router.push('/models')
        } else {
          const error = await response.json()
          ElMessage.error(error.message || '保存失败')
        }
      } catch (error) {
        if (error.message) {
          ElMessage.error('表单验证失败，请检查输入')
        } else {
          ElMessage.error('保存失败，请稍后重试')
        }
      }
    }

    const handleReset = () => {
      if (formRef.value) {
        formRef.value.resetFields()
      }
    }

    const goBack = () => {
      router.push('/models')
    }

    const loadModel = async (id) => {
      try {
        const response = await fetch(`/api/models/${id}`)
        if (response.ok) {
          const model = await response.json()
          Object.assign(form, model.data)
        }
      } catch (error) {
        console.error('加载模型失败:', error)
        ElMessage.error('加载模型失败')
      }
    }

    onMounted(() => {
      if (isEdit.value && modelId.value) {
        loadModel(modelId.value)
      }
    })

    return {
      form,
      rules,
      formRef,
      isEdit,
      handleSave,
      handleReset,
      goBack
    }
  }
}
</script>

<style scoped>
.model-form {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.form-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}
</style>
