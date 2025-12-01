<template>
  <el-dialog
    v-model="visible"
    title="开始角色分析"
    width="600px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
    >
      <el-form-item label="选择小说" prop="novelId">
        <el-select
          v-model="form.novelId"
          placeholder="请选择要分析的小说"
          style="width: 100%"
          filterable
          @change="handleNovelChange"
        >
          <el-option
            v-for="novel in availableNovels"
            :key="novel.id"
            :label="novel.title"
            :value="novel.id"
          >
            <div class="novel-option">
              <div class="novel-info">
                <span class="novel-title">{{ novel.title }}</span>
                <span class="novel-status">{{ novel.status }}</span>
              </div>
              <div class="novel-stats">
                字数: {{ novel.currentWordCount }}
              </div>
            </div>
          </el-option>
        </el-select>
        <div class="form-tip" v-if="selectedNovel">
          已确认的小说可以进行完整分析，未确认的小说将先进行分析。
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

      <el-form-item label="分析选项">
        <el-checkbox v-model="form.options.force">
          强制重新分析（覆盖已有结果）
        </el-checkbox>
        <div class="form-tip">
          开启此选项将重新进行完整分析，可能需要更多时间。
        </div>
      </el-form-item>

      <el-form-item label="音色偏好">
        <el-checkbox-group v-model="form.preferences">
          <el-checkbox label="auto_distribute">自动分配音色</el-checkbox>
          <el-checkbox label="gender_balance">性别平衡</el-checkbox>
          <el-checkbox label="age_diversity">年龄多样性</el-checkbox>
          <el-checkbox label="emotion_rich">情感丰富度</el-checkbox>
        </el-checkbox-group>
        <div class="form-tip">
          这些偏好将影响音色匹配的结果。
        </div>
      </el-form-item>

      <el-divider content-position="left">分析流程预览</el-divider>

      <div class="analysis-flow">
        <div class="flow-step">
          <el-icon><User /></el-icon>
          <div class="step-content">
            <h4>角色分析</h4>
            <p>AI分析小说文本，识别主要角色和特征</p>
          </div>
        </div>

        <div class="flow-step">
          <el-icon><Microphone /></el-icon>
          <div class="step-content">
            <h4>音色匹配</h4>
            <p>根据角色特征匹配最适合的音色参数</p>
          </div>
        </div>

        <div class="flow-step">
          <el-icon><Document /></el-icon>
          <div class="step-content">
            <h4>脚本生成</h4>
            <p>生成标准化的TTS语音合成脚本</p>
          </div>
        </div>
      </div>

      <el-alert
        v-if="selectedNovel && selectedNovel.currentWordCount === 0"
        title="提示"
        type="warning"
        show-icon
        :closable="false"
      >
        该小说暂无内容，请先生成小说内容再进行分析。
      </el-alert>

      <el-alert
        v-if="estimatedTime"
        title="预计分析时间"
        type="info"
        show-icon
        :closable="false"
      >
        预计需要 {{ estimatedTime }} 分钟完成完整分析流程。
      </el-alert>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button
        type="primary"
        @click="handleSubmit"
        :loading="submitting"
        :disabled="!canSubmit"
      >
        开始分析
      </el-button>
    </template>
  </el-dialog>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { User, Microphone, Document } from '@element-plus/icons-vue'
import { useNovelStore } from '../../store/novel'
import { useModelsStore } from '../../store/models'

export default {
  name: 'StartAnalysisDialog',
  components: {
    User,
    Microphone,
    Document
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'submit'],
  setup(props, { emit }) {
    const novelStore = useNovelStore()
    const modelsStore = useModelsStore()

    const formRef = ref()
    const submitting = ref(false)

    const form = ref({
      novelId: '',
      modelId: '',
      options: {
        force: false
      },
      preferences: []
    })

    const rules = {
      novelId: [
        { required: true, message: '请选择要分析的小说', trigger: 'change' }
      ],
      modelId: [
        { required: true, message: '请选择AI模型', trigger: 'change' }
      ]
    }

    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
    })

    const availableNovels = computed(() => {
      // 只显示已确认或有大内容的小说
      return novelStore.novels.filter(novel =>
        novel.status === 'confirmed' || novel.currentWordCount > 1000
      )
    })

    const availableModels = computed(() => modelsStore.models)
    const selectedNovel = computed(() => {
      return availableNovels.value.find(novel => novel.id === form.value.novelId)
    })

    const canSubmit = computed(() => {
      return form.value.novelId &&
             form.value.modelId &&
             selectedNovel.value &&
             selectedNovel.value.currentWordCount > 0
    })

    const estimatedTime = computed(() => {
      if (!selectedNovel.value) return null
      const wordCount = selectedNovel.value.currentWordCount
      // 假设每1000字需要1分钟
      return Math.ceil(wordCount / 1000) + 2 // 额外2分钟处理时间
    })

    // 监听小说选择变化
    watch(() => form.value.novelId, (newNovelId) => {
      if (newNovelId && selectedNovel.value) {
        // 可以在这里更新其他相关字段
      }
    })

    // 初始化数据
    const initData = async () => {
      try {
        // 并行加载数据
        await Promise.all([
          novelStore.fetchNovels(),
          modelsStore.fetchModels()
        ])

        // 设置默认模型
        if (availableModels.value.length > 0) {
          form.value.modelId = modelsStore.defaultModel?.id || availableModels.value[0].id
        }
      } catch (error) {
        console.error('初始化数据失败:', error)
      }
    }

    // 处理小说选择
    const handleNovelChange = () => {
      // 可以在这里添加额外的逻辑
    }

    // 处理关闭
    const handleClose = () => {
      visible.value = false
      resetForm()
    }

    // 重置表单
    const resetForm = () => {
      form.value = {
        novelId: '',
        modelId: '',
        options: {
          force: false
        },
        preferences: []
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

        const submitData = {
          novelId: form.value.novelId,
          modelId: form.value.modelId,
          options: form.value.options,
          preferences: {
            auto_distribute: form.value.preferences.includes('auto_distribute'),
            gender_balance: form.value.preferences.includes('gender_balance'),
            age_diversity: form.value.preferences.includes('age_diversity'),
            emotion_rich: form.value.preferences.includes('emotion_rich')
          }
        }

        emit('submit', submitData)
        handleClose()
      } catch (error) {
        console.error('表单验证失败:', error)
      } finally {
        submitting.value = false
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
      availableNovels,
      availableModels,
      selectedNovel,
      canSubmit,
      estimatedTime,
      handleNovelChange,
      handleClose,
      resetForm,
      handleSubmit
    }
  }
}
</script>

<style scoped>
.novel-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.novel-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.novel-title {
  font-weight: 600;
  color: #2c3e50;
}

.novel-status {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.novel-stats {
  font-size: 12px;
  color: #606266;
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

.analysis-flow {
  display: flex;
  justify-content: space-between;
  margin: 16px 0;
}

.flow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  flex: 1;
  padding: 16px 8px;
}

.flow-step .el-icon {
  font-size: 24px;
  color: #409eff;
  margin-bottom: 8px;
}

.step-content h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #2c3e50;
}

.step-content p {
  margin: 0;
  font-size: 12px;
  color: #606266;
  line-height: 1.4;
}

.el-alert {
  margin-top: 16px;
}

.el-divider {
  margin: 20px 0 16px 0;
}
</style>