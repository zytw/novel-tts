<template>
  <el-dialog
    v-model="visible"
    title="参数设置"
    width="500px"
  >
    <el-form
      ref="formRef"
      :model="form"
      label-width="120px"
    >
      <el-form-item label="目标字数">
        <el-input-number
          v-model="form.targetWordCount"
          :min="100"
          :max="50000"
          :step="500"
          style="width: 100%"
        />
      </el-form-item>

      <el-divider content-position="left">模板参数</el-divider>

      <div v-if="Object.keys(form.parameters).length > 0">
        <el-form-item
          v-for="(value, key) in form.parameters"
          :key="key"
          :label="key"
        >
          <el-input
            v-model="form.parameters[key]"
            :placeholder="`请输入${key}`"
          />
        </el-form-item>
      </div>

      <div v-else class="no-parameters">
        <el-empty description="当前无模板参数" :image-size="60" />
      </div>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleUpdate">更新</el-button>
    </template>
  </el-dialog>
</template>

<script>
import { ref, computed, watch } from 'vue'

export default {
  name: 'ParametersDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    novel: {
      type: Object,
      default: null
    }
  },
  emits: ['update:modelValue', 'update'],
  setup(props, { emit }) {
    const formRef = ref()

    const form = ref({
      targetWordCount: 2000,
      parameters: {}
    })

    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
    })

    // 监听novel变化
    watch(() => props.novel, (newNovel) => {
      if (newNovel) {
        form.value.targetWordCount = newNovel.targetWordCount || 2000
        form.value.parameters = { ...newNovel.parameters }
      }
    }, { immediate: true })

    const handleClose = () => {
      visible.value = false
    }

    const handleUpdate = () => {
      emit('update', {
        parameters: form.value.parameters,
        targetWordCount: form.value.targetWordCount
      })
      handleClose()
    }

    return {
      formRef,
      form,
      visible,
      handleClose,
      handleUpdate
    }
  }
}
</script>

<style scoped>
.no-parameters {
  text-align: center;
  padding: 20px 0;
  color: #909399;
}

.el-divider {
  margin: 20px 0 16px 0;
}
</style>
