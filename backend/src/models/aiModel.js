const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

class AIModel {
  constructor() {
    this.configPath = path.join(__dirname, '../../../ai-models.json');
    this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
    this.models = [];
    this.defaultModel = null;
    this.loadConfig();
  }

  // 加载配置文件
  async loadConfig() {
    try {
      const configData = await fs.readJson(this.configPath);
      this.models = configData.available_models || [];
      this.defaultModel = configData.default_model || null;
    } catch (error) {
      console.error('Failed to load AI models config:', error);
      this.models = [];
      this.defaultModel = null;
    }
  }

  // 保存配置文件
  async saveConfig() {
    try {
      const configData = {
        available_models: this.models,
        default_model: this.defaultModel
      };
      await fs.writeJson(this.configPath, configData, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Failed to save AI models config:', error);
      return false;
    }
  }

  // 加密API密钥
  encryptApiKey(apiKey) {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  // 解密API密钥
  decryptApiKey(encryptedApiKey) {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encryptedApiKey, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      return null;
    }
  }

  // 获取所有模型
  getAllModels() {
    return {
      models: this.models,
      default: this.defaultModel
    };
  }

  // 根据ID获取模型
  getModelById(id) {
    return this.models.find(model => model.id === id);
  }

  // 添加新模型
  addModel(modelData) {
    const { id, name, provider, type, apiKey, settings = {} } = modelData;

    // 检查ID是否已存在
    if (this.getModelById(id)) {
      throw new Error(`Model with ID ${id} already exists`);
    }

    const newModel = {
      id,
      name,
      provider,
      type: type || 'text-generation',
      settings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 如果提供API密钥，则加密存储
    if (apiKey) {
      newModel.apiKey = this.encryptApiKey(apiKey);
    }

    this.models.push(newModel);
    return newModel;
  }

  // 更新模型
  updateModel(id, updateData) {
    const modelIndex = this.models.findIndex(model => model.id === id);

    if (modelIndex === -1) {
      throw new Error(`Model with ID ${id} not found`);
    }

    const updatedModel = {
      ...this.models[modelIndex],
      ...updateData,
      id, // 确保ID不被修改
      updatedAt: new Date().toISOString()
    };

    // 如果更新API密钥，则重新加密
    if (updateData.apiKey) {
      updatedModel.apiKey = this.encryptApiKey(updateData.apiKey);
    }

    this.models[modelIndex] = updatedModel;
    return updatedModel;
  }

  // 删除模型
  deleteModel(id) {
    const modelIndex = this.models.findIndex(model => model.id === id);

    if (modelIndex === -1) {
      throw new Error(`Model with ID ${id} not found`);
    }

    const deletedModel = this.models.splice(modelIndex, 1)[0];

    // 如果删除的是默认模型，则清除默认设置
    if (this.defaultModel === id) {
      this.defaultModel = this.models.length > 0 ? this.models[0].id : null;
    }

    return deletedModel;
  }

  // 设置默认模型
  setDefaultModel(id) {
    if (!this.getModelById(id)) {
      throw new Error(`Model with ID ${id} not found`);
    }

    this.defaultModel = id;
    return this.defaultModel;
  }

  // 获取默认模型
  getDefaultModel() {
    if (!this.defaultModel) {
      return null;
    }

    const model = this.getModelById(this.defaultModel);
    if (!model) {
      return null;
    }

    // 解密API密钥（如果存在）
    const result = { ...model };
    if (model.apiKey) {
      result.apiKey = this.decryptApiKey(model.apiKey);
    }

    return result;
  }

  // 验证模型配置
  validateModel(modelData) {
    const requiredFields = ['id', 'name', 'provider'];
    const missingFields = requiredFields.filter(field => !modelData[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // 验证ID格式
    if (!/^[a-zA-Z0-9_-]+$/.test(modelData.id)) {
      throw new Error('Model ID must contain only letters, numbers, hyphens and underscores');
    }

    return true;
  }
}

module.exports = AIModel;