<template>
  <el-dialog
    v-model="visible"
    title="创建新的小说项目"
    width="600px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
    >
      <el-form-item label="小说标题" prop="title">
        <el-input
          v-model="form.title"
          placeholder="请输入小说标题"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="小说描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="请简要描述小说内容或创作想法"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="创作模板" prop="promptId">
        <el-select
          v-model="form.promptId"
          placeholder="请选择创作模板"
          style="width: 100%"
          @change="handlePromptChange"
          filterable
        >
          <el-option-group
            v-for="category in groupedPrompts"
            :key="category.name"
            :label="category.name"
          >
            <el-option
              v-for="prompt in category.prompts"
              :key="prompt.id"
              :label="prompt.title"
              :value="prompt.id"
            >
              <div class="prompt-option">
                <span class="prompt-title">{{ prompt.title }}</span>
                <span class="prompt-wordcount">{{ prompt.wordCount }}字</span>
              </div>
            </el-option>
          </el-option-group>
        </el-select>
        <div class="form-tip" v-if="selectedPrompt">
          {{ selectedPrompt.description }}
        </div>
      </el-form-item>

      <el-form-item label="AI模型" prop="modelId">
        <el-select
          v-model="form.modelId"
          placeholder="请选择AI模型"
          style="width: 100%"
        >
          <el-option
            v-for="model in availableModels"
            :key="model.id"
            :label="`${model.name} (${model.provider})`"
            :value="model.id"
          >
            <div class="model-option">
              <span class="model-name">{{ model.name }}</span>
              <el-tag size="small" :type="model.apiKey ? 'success' : 'danger'">
                {{ model.apiKey ? '已配置' : '未配置' }}
              </el-tag>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="目标字数" prop="targetWordCount">
        <el-input-number
          v-model="form.targetWordCount"
          :min="100"
          :max="50000"
          :step="500"
          style="width: 100%"
        />
        <div class="form-tip">
          建议字数：短篇1000-5000字，中篇5000-20000字，长篇20000字以上
        </div>
      </el-form-item>

      <el-divider content-position="left">模板参数配置</el-divider>

      <div v-if="selectedPrompt && selectedPrompt.parameters.length > 0">
        <el-form-item
          v-for="param in selectedPrompt.parameters"
          :key="param.name"
          :label="param.name"
          :required="param.required"
        >
          <el-input
            v-if="param.type === 'text'"
            v-model="form.parameters[param.name]"
            :placeholder="param.description"
          />
          <el-input-number
            v-else-if="param.type === 'number'"
            v-model="form.parameters[param.name]"
            :min="1"
            :max="10000"
            style="width: 100%"
          />
          <el-switch
            v-else-if="param.type === 'boolean'"
            v-model="form.parameters[param.name]"
          />
          <div class="form-tip">{{ param.description }}</div>
        </el-form-item>
      </div>

      <div v-else-if="selectedPrompt" class="no-parameters">
        <el-empty
          description="该模板无需额外参数配置"
          :image-size="80"
        />
      </div>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        创建并开始生成
      </el-button>
    </template>
  </el-dialog>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useModelsStore } from '../../store/models'
import { useNovelStore } from '../../store/novel'

export default {
  name: 'CreateNovelDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'submit'],
  setup(props, { emit }) {
    const modelsStore = useModelsStore()
    const novelStore = useNovelStore()

    const formRef = ref()
    const submitting = ref(false)

    const form = ref({
      title: '',
      description: '',
      promptId: '',
      modelId: '',
      targetWordCount: 2000,
      parameters: {}
    })

    const rules = {
      title: [
        { required: true, message: '请输入小说标题', trigger: 'blur' },
        { min: 1, max: 200, message: '标题长度在1到200个字符之间', trigger: 'blur' }
      ],
      description: [
        { max: 500, message: '描述长度不能超过500个字符', trigger: 'blur' }
      ],
      promptId: [
        { required: true, message: '请选择创作模板', trigger: 'change' }
      ],
      modelId: [
        { required: true, message: '请选择AI模型', trigger: 'change' }
      ],
      targetWordCount: [
        { required: true, message: '请输入目标字数', trigger: 'blur' },
        { type: 'number', min: 100, max: 50000, message: '字数范围在100到50000之间', trigger: 'blur' }
      ]
    }

    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
    })

    const availableModels = computed(() => modelsStore.models)
    const prompts = computed(() => novelStore.prompts)

    const groupedPrompts = computed(() => {
      const groups = {}
      prompts.value.forEach(prompt => {
        if (!groups[prompt.category]) {
          groups[prompt.category] = {
            name: prompt.category,
            prompts: []
          }
        }
        groups[prompt.category].prompts.push(prompt)
      })
      return Object.values(groups)
    })

    const selectedPrompt = computed(() => {
      return prompts.value.find(prompt => prompt.id === form.value.promptId) || null
    })

    // 监听prompt变化，更新参数表单
    watch(() => form.value.promptId, (newPromptId) => {
      if (newPromptId && selectedPrompt.value) {
        // 重置参数
        form.value.parameters = {}

        // 设置默认参数值
        selectedPrompt.value.parameters.forEach(param => {
          if (param.type === 'number') {
            form.value.parameters[param.name] = param.name.includes('字数') ? 2000 : 1
          } else if (param.type === 'boolean') {
            form.value.parameters[param.name] = false
          } else {
            form.value.parameters[param.name] = ''
          }
        })
      }
    })

    // 处理prompt选择变化
    const handlePromptChange = () => {
      // 参数表单会通过watch自动更新
    }

    // 处理关闭
    const handleClose = () => {
      visible.value = false
      resetForm()
    }

    // 重置表单
    const resetForm = () => {
      form.value = {
        title: '',
        description: '',
        promptId: '',
        modelId: '',
        targetWordCount: 2000,
        parameters: {}
      }
      if (formRef.value) {
        formRef.value.clearValidate()
      }
    }

    // 处理提交
    const handleSubmit = async () => {
      if (!formRef.value) return

      try {
        await formRef.value.validate()
        submitting.value = true

        const submitData = { ...form.value }

        emit('submit', submitData)
      } catch (error) {
        console.error('表单验证失败:', error)
      } finally {
        submitting.value = false
      }
    }

    // 初始化数据
    const initData = async () => {
      try {
        // 并行加载数据
        await Promise.all([
          modelsStore.fetchModels(),
          novelStore.fetchPrompts()
        ])

        // 设置默认模型
        if (availableModels.value.length > 0) {
          form.value.modelId = modelsStore.defaultModel?.id || availableModels.value[0].id
        }
      } catch (error) {
        console.error('初始化数据失败:', error)
        ElMessage.error('加载数据失败，请刷新页面重试')
      }
    }

    onMounted(() => {
      initData()
    })

    return {
      formRef,
      form,
      rules,
      visible,
      submitting,
      availableModels,
      prompts,
      groupedPrompts,
      selectedPrompt,
      handlePromptChange,
      handleClose,
      handleSubmit
    }
  }
}
</script>

<style scoped>
.prompt-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.prompt-title {
  flex: 1;
}

.prompt-wordcount {
  color: #909399;
  font-size: 12px;
}

.model-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.model-name {
  flex: 1;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

.no-parameters {
  text-align: center;
  padding: 20px 0;
  color: #909399;
}

.el-divider {
  margin: 24px 0 20px 0;
}
</style>
