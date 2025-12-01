<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑AI模型' : '添加AI模型'"
    width="600px"
    @close="handleClose"
  >
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
          <el-option label "代码生成" value="code-generation" />
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
        <div class="form-tip">
          API密钥将加密存储，确保数据安全
        </div>
      </el-form-item>

      <el-divider content-position="left">高级设置</el-divider>

      <el-form-item label="温度参数">
        <el-slider
          v-model="form.settings.temperature"
          :min="0"
          :max="2"
          :step="0.1"
          show-input
          :show-input-controls="false"
        />
        <div class="form-tip">
          控制生成文本的随机性，值越高越随机
        </div>
      </el-form-item>

      <el-form-item label="最大令牌数">
        <el-input-number
          v-model="form.settings.maxTokens"
          :min="1"
          :max="8192"
          :step="1"
          style="width: 100%"
        />
        <div class="form-tip">
          生成文本的最大长度限制
        </div>
      </el-form-item>

      <el-form-item label="Top P">
        <el-slider
          v-model="form.settings.topP"
          :min="0"
          :max="1"
          :step="0.05"
          show-input
          :show-input-controls="false"
        />
        <div class="form-tip">
          核采样参数，控制词汇选择的多样性
        </div>
      </el-form-item>

      <el-form-item label="频率惩罚">
        <el-slider
          v-model="form.settings.frequencyPenalty"
          :min="-2"
          :max="2"
          :step="0.1"
          show-input
          :show-input-controls="false"
        />
        <div class="form-tip">
          降低重复词汇的频率
        </div>
      </el-form-item>

      <el-form-item label="存在惩罚">
        <el-slider
          v-model="form.settings.presencePenalty"
          :min="-2"
          :max="2"
          :step="0.1"
          show-input
          :show-input-controls="false"
        />
        <div class="form-tip">
          鼓励谈论新话题
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        {{ isEdit ? '更新' : '添加' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script>
import { ref, computed, watch, nextTick } from 'vue'

export default {
  name: 'ModelDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    model: {
      type: Object,
      default: null
    }
  },
  emits: ['update:modelValue', 'submit'],
  setup(props, { emit }) {
    const formRef = ref()
    const submitting = ref(false)

    const form = ref({
      id: '',
      name: '',
      provider: '',
      type: 'text-generation',
      apiKey: '',
      settings: {
        temperature: 0.7,
        maxTokens: 2048,
        topP: 0.9,
        frequencyPenalty: 0,
        presencePenalty: 0
      }
    })

    const rules = {
      id: [
        { required: true, message: '请输入模型ID', trigger: 'blur' },
        { pattern: /^[a-zA-Z0-9_-]+$/, message: '模型ID只能包含字母、数字、下划线和连字符', trigger: 'blur' }
      ],
      name: [
        { required: true, message: '请输入模型名称', trigger: 'blur' },
        { min: 2, max: 50, message: '模型名称长度在2到50个字符之间', trigger: 'blur' }
      ],
      provider: [
        { required: true, message: '请选择提供商', trigger: 'change' }
      ],
      type: [
        { required: true, message: '请选择模型类型', trigger: 'change' }
      ]
    }

    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
    })

    const isEdit = computed(() => !!props.model)

    // 监听model变化，更新表单数据
    watch(() => props.model, (newModel) => {
      if (newModel) {
        form.value = {
          id: newModel.id || '',
          name: newModel.name || '',
          provider: newModel.provider || '',
          type: newModel.type || 'text-generation',
          apiKey: '',
          settings: {
            temperature: newModel.settings?.temperature ?? 0.7,
            maxTokens: newModel.settings?.maxTokens ?? 2048,
            topP: newModel.settings?.topP ?? 0.9,
            frequencyPenalty: newModel.settings?.frequencyPenalty ?? 0,
            presencePenalty: newModel.settings?.presencePenalty ?? 0
          }
        }
      } else {
        resetForm()
      }
    }, { immediate: true })

    // 重置表单
    const resetForm = () => {
      form.value = {
        id: '',
        name: '',
        provider: '',
        type: 'text-generation',
        apiKey: '',
        settings: {
          temperature: 0.7,
          maxTokens: 2048,
          topP: 0.9,
          frequencyPenalty: 0,
          presencePenalty: 0
        }
      }
    }

    // 处理关闭
    const handleClose = () => {
      visible.value = false
      nextTick(() => {
        resetForm()
        if (formRef.value) {
          formRef.value.clearValidate()
        }
      })
    }

    // 处理提交
    const handleSubmit = async () => {
      if (!formRef.value) return

      try {
        await formRef.value.validate()
        submitting.value = true

        const submitData = { ...form.value }

        // 如果API密钥为空且是编辑模式，则不传递apiKey字段
        if (isEdit.value && !submitData.apiKey) {
          delete submitData.apiKey
        }

        emit('submit', submitData)
      } catch (error) {
        console.error('表单验证失败:', error)
      } finally {
        submitting.value = false
      }
    }

    return {
      formRef,
      form,
      rules,
      visible,
      isEdit,
      submitting,
      handleClose,
      handleSubmit
    }
  }
}
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

.el-divider {
  margin: 24px 0 16px 0;
}
</style>