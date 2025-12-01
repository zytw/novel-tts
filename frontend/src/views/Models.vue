<template>
  <div class="models-page">
    <div class="page-header">
      <h2>AI模型配置管理</h2>
      <el-button type="primary" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon>
        添加模型
      </el-button>
    </div>

    <!-- 默认模型卡片 -->
    <el-card class="default-model-card" v-if="defaultModel">
      <template #header>
        <div class="card-header">
          <span>默认AI模型</span>
          <el-tag type="success">当前使用</el-tag>
        </div>
      </template>
      <div class="model-info">
        <h3>{{ defaultModel.name }}</h3>
        <p><strong>提供商:</strong> {{ defaultModel.provider }}</p>
        <p><strong>类型:</strong> {{ defaultModel.type }}</p>
        <p><strong>API密钥:</strong> {{ defaultModel.apiKey ? '已配置' : '未配置' }}</p>
      </div>
      <div class="model-actions">
        <el-button @click="editModel(defaultModel)">编辑</el-button>
        <el-button type="primary" @click="showChangeDefaultDialog = true">
          更换默认模型
        </el-button>
      </div>
    </el-card>

    <!-- 模型列表 -->
    <el-card class="models-list">
      <template #header>
        <span>所有AI模型</span>
      </template>

      <el-table :data="models" style="width: 100%" v-loading="loading">
        <el-table-column prop="name" label="模型名称" width="200" />
        <el-table-column prop="provider" label="提供商" width="150" />
        <el-table-column prop="type" label="类型" width="150" />
        <el-table-column label="API密钥" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.apiKey ? 'success' : 'danger'">
              {{ scope.row.apiKey ? '已配置' : '未配置' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="默认模型" width="120">
          <template #default="scope">
            <el-tag v-if="scope.row.id === defaultModel?.id" type="success">是</el-tag>
            <el-button v-else size="small" @click="setDefaultModel(scope.row.id)">
              设为默认
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button size="small" @click="editModel(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteModel(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加模型对话框 -->
    <ModelDialog
      v-model="showAddDialog"
      :model="null"
      @submit="handleAddModel"
    />

    <!-- 编辑模型对话框 -->
    <ModelDialog
      v-model="showEditDialog"
      :model="editingModel"
      @submit="handleEditModel"
    />

    <!-- 更换默认模型对话框 -->
    <el-dialog v-model="showChangeDefaultDialog" title="更换默认模型" width="400px">
      <el-form @submit.prevent="changeDefaultModel">
        <el-form-item label="选择默认模型">
          <el-select v-model="newDefaultModelId" placeholder="请选择模型">
            <el-option
              v-for="model in models"
              :key="model.id"
              :label="model.name"
              :value="model.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showChangeDefaultDialog = false">取消</el-button>
        <el-button type="primary" @click="changeDefaultModel">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useModelsStore } from '../store/models'
import ModelDialog from '../components/ModelDialog.vue'

export default {
  name: 'Models',
  components: {
    Plus,
    ModelDialog
  },
  setup() {
    const modelsStore = useModelsStore()

    const loading = ref(false)
    const showAddDialog = ref(false)
    const showEditDialog = ref(false)
    const showChangeDefaultDialog = ref(false)
    const editingModel = ref(null)
    const newDefaultModelId = ref('')

    const models = computed(() => modelsStore.models)
    const defaultModel = computed(() => modelsStore.defaultModel)

    // 加载模型数据
    const loadModels = async () => {
      loading.value = true
      try {
        await modelsStore.fetchModels()
      } catch (error) {
        ElMessage.error('加载模型数据失败: ' + error.message)
      } finally {
        loading.value = false
      }
    }

    // 添加模型
    const handleAddModel = async (modelData) => {
      try {
        await modelsStore.addModel(modelData)
        ElMessage.success('模型添加成功')
        showAddDialog.value = false
        await loadModels()
      } catch (error) {
        ElMessage.error('添加模型失败: ' + error.message)
      }
    }

    // 编辑模型
    const handleEditModel = async (modelData) => {
      try {
        await modelsStore.updateModel(editingModel.value.id, modelData)
        ElMessage.success('模型更新成功')
        showEditDialog.value = false
        editingModel.value = null
        await loadModels()
      } catch (error) {
        ElMessage.error('更新模型失败: ' + error.message)
      }
    }

    // 删除模型
    const deleteModel = async (model) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除模型 "${model.name}" 吗？`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        await modelsStore.deleteModel(model.id)
        ElMessage.success('模型删除成功')
        await loadModels()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除模型失败: ' + error.message)
        }
      }
    }

    // 设置默认模型
    const setDefaultModel = async (modelId) => {
      try {
        await modelsStore.setDefaultModel(modelId)
        ElMessage.success('默认模型设置成功')
        await loadModels()
      } catch (error) {
        ElMessage.error('设置默认模型失败: ' + error.message)
      }
    }

    // 更换默认模型
    const changeDefaultModel = async () => {
      if (!newDefaultModelId.value) {
        ElMessage.warning('请选择一个模型')
        return
      }

      try {
        await modelsStore.setDefaultModel(newDefaultModelId.value)
        ElMessage.success('默认模型更换成功')
        showChangeDefaultDialog.value = false
        newDefaultModelId.value = ''
        await loadModels()
      } catch (error) {
        ElMessage.error('更换默认模型失败: ' + error.message)
      }
    }

    // 编辑模型
    const editModel = (model) => {
      editingModel.value = { ...model }
      showEditDialog.value = true
    }

    onMounted(() => {
      loadModels()
    })

    return {
      loading,
      models,
      defaultModel,
      showAddDialog,
      showEditDialog,
      showChangeDefaultDialog,
      editingModel,
      newDefaultModelId,
      handleAddModel,
      handleEditModel,
      deleteModel,
      setDefaultModel,
      changeDefaultModel,
      editModel
    }
  }
}
</script>

<style scoped>
.models-page {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #333;
}

.default-model-card {
  margin-bottom: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.model-info {
  margin-bottom: 20px;
}

.model-info h3 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.model-info p {
  margin: 5px 0;
  color: #606266;
}

.model-actions {
  display: flex;
  gap: 10px;
}

.models-list {
  background: white;
}

.el-table {
  margin-top: 10px;
}
</style>