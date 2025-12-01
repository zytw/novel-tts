const express = require('express');
const Joi = require('joi');
const AIModel = require('../src/models/aiModel');

const router = express.Router();
const aiModel = new AIModel();

// 验证模式
const modelSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().required(),
  provider: Joi.string().required(),
  type: Joi.string().default('text-generation'),
  apiKey: Joi.string().optional(),
  settings: Joi.object().default({})
});

const updateModelSchema = Joi.object({
  name: Joi.string().optional(),
  provider: Joi.string().optional(),
  type: Joi.string().optional(),
  apiKey: Joi.string().optional(),
  settings: Joi.object().optional()
});

// GET /api/models - 获取所有模型
router.get('/', (req, res) => {
  try {
    const modelsData = aiModel.getAllModels();
    res.json({
      success: true,
      data: modelsData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/models/default - 获取默认模型
router.get('/default', (req, res) => {
  try {
    const defaultModel = aiModel.getDefaultModel();
    if (!defaultModel) {
      return res.status(404).json({
        success: false,
        error: 'No default model configured'
      });
    }

    res.json({
      success: true,
      data: defaultModel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/models/default - 设置默认模型
router.put('/default', (req, res) => {
  try {
    const { modelId } = req.body;

    if (!modelId) {
      return res.status(400).json({
        success: false,
        error: 'Model ID is required'
      });
    }

    const defaultModelId = aiModel.setDefaultModel(modelId);

    // 保存配置
    aiModel.saveConfig();

    res.json({
      success: true,
      message: `Default model set to ${modelId}`,
      data: { defaultModel: defaultModelId }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/models/:id - 获取特定模型
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const model = aiModel.getModelById(id);

    if (!model) {
      return res.status(404).json({
        success: false,
        error: `Model with ID ${id} not found`
      });
    }

    res.json({
      success: true,
      data: model
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/models - 添加新模型
router.post('/', (req, res) => {
  try {
    const { error, value } = modelSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    aiModel.validateModel(value);
    const newModel = aiModel.addModel(value);

    // 保存配置
    aiModel.saveConfig();

    res.status(201).json({
      success: true,
      message: 'Model added successfully',
      data: newModel
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/models/:id - 更新模型
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateModelSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const updatedModel = aiModel.updateModel(id, value);

    // 保存配置
    aiModel.saveConfig();

    res.json({
      success: true,
      message: 'Model updated successfully',
      data: updatedModel
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/models/:id - 删除模型
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deletedModel = aiModel.deleteModel(id);

    // 保存配置
    aiModel.saveConfig();

    res.json({
      success: true,
      message: 'Model deleted successfully',
      data: deletedModel
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;