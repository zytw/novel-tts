const express = require('express')
const Joi = require('joi')
const NovelService = require('../src/services/novelService')
const AIService = require('../src/services/aiService')
const PromptLoader = require('../src/utils/promptLoader')

const router = express.Router()
const novelService = new NovelService()
const aiService = new AIService()
const promptLoader = new PromptLoader()

// 验证模式
const createNovelSchema = Joi.object({
  title: Joi.string().required().min(1).max(200),
  description: Joi.string().optional().max(500),
  promptId: Joi.string().required(),
  modelId: Joi.string().required(),
  parameters: Joi.object().default({}),
  targetWordCount: Joi.number().integer().min(100).max(50000).default(2000)
})

const updateNovelSchema = Joi.object({
  content: Joi.string().required().min(1),
  changeReason: Joi.string().optional().max(200)
})

const updateParametersSchema = Joi.object({
  parameters: Joi.object().required(),
  targetWordCount: Joi.number().integer().min(100).max(50000).optional()
})

// GET /api/novel/prompts - 获取可用的prompt模板
router.get('/prompts', async (req, res) => {
  try {
    const { category } = req.query

    let prompts
    if (category) {
      prompts = await promptLoader.getPromptsByCategory(category)
    } else {
      prompts = await promptLoader.getAllPrompts()
    }

    res.json({
      success: true,
      data: prompts
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/novel/categories - 获取prompt分类列表
router.get('/categories', async (req, res) => {
  try {
    const prompts = await promptLoader.getAllPrompts()
    const categories = [...new Set(prompts.map(prompt => prompt.category))]

    res.json({
      success: true,
      data: categories.map(category => ({
        name: category,
        count: prompts.filter(prompt => prompt.category === category).length
      }))
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/novel/list - 获取小说列表
router.get('/list', async (req, res) => {
  try {
    const { status, sortBy, page = 1, limit = 10 } = req.query

    const filters = {}
    if (status) filters.status = status
    if (sortBy) filters.sortBy = sortBy

    const novels = await novelService.getNovelList(filters)

    // 分页处理
    const startIndex = (parseInt(page) - 1) * parseInt(limit)
    const endIndex = startIndex + parseInt(limit)
    const paginatedNovels = novels.slice(startIndex, endIndex)

    res.json({
      success: true,
      data: {
        novels: paginatedNovels,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: novels.length,
          totalPages: Math.ceil(novels.length / parseInt(limit))
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// POST /api/novel/create - 创建新的小说项目
router.post('/create', async (req, res) => {
  try {
    const { error, value } = createNovelSchema.validate(req.body)

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      })
    }

    const novel = await novelService.createNovel(value)

    res.status(201).json({
      success: true,
      message: '小说项目创建成功',
      data: novel
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/novel/:id - 获取小说详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const novel = await novelService.getNovelById(id)

    if (!novel) {
      return res.status(404).json({
        success: false,
        error: `小说 ${id} 不存在`
      })
    }

    res.json({
      success: true,
      data: novel
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// POST /api/novel/:id/generate - 开始生成小说
router.post('/:id/generate', async (req, res) => {
  try {
    const { id } = req.params
    const { parameters = {} } = req.body

    const result = await novelService.startGeneration(id, { parameters })

    if (result.success) {
      res.json({
        success: true,
        message: '小说生成已开始',
        data: result
      })
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      })
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/novel/:id/status - 获取生成状态
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const status = await novelService.getGenerationStatus(id)

    res.json({
      success: true,
      data: status
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

// PUT /api/novel/:id/content - 更新小说内容
router.put('/:id/content', async (req, res) => {
  try {
    const { id } = req.params
    const { error, value } = updateNovelSchema.validate(req.body)

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      })
    }

    const result = await novelService.updateNovelContent(
      id,
      value.content,
      value.changeReason
    )

    res.json({
      success: true,
      message: '内容更新成功',
      data: result
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

// PUT /api/novel/:id/parameters - 更新生成参数
router.put('/:id/parameters', async (req, res) => {
  try {
    const { id } = req.params
    const { error, value } = updateParametersSchema.validate(req.body)

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      })
    }

    const novel = await novelService.getNovelById(id)
    if (!novel) {
      return res.status(404).json({
        success: false,
        error: `小说 ${id} 不存在`
      })
    }

    // 更新参数
    Object.assign(novel.parameters, value.parameters)
    if (value.targetWordCount !== undefined) {
      novel.targetWordCount = value.targetWordCount
    }
    novel.updatedAt = new Date().toISOString()

    await novelService.saveNovel(novel)

    res.json({
      success: true,
      message: '参数更新成功',
      data: {
        parameters: novel.parameters,
        targetWordCount: novel.targetWordCount
      }
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/novel/:id/versions - 获取版本历史
router.get('/:id/versions', async (req, res) => {
  try {
    const { id } = req.params
    const versions = await novelService.getNovelVersions(id)

    res.json({
      success: true,
      data: versions
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

// POST /api/novel/:id/restore - 恢复到指定版本
router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params
    const { versionId } = req.body

    if (!versionId) {
      return res.status(400).json({
        success: false,
        error: '版本ID是必需的'
      })
    }

    const result = await novelService.restoreVersion(id, versionId)

    res.json({
      success: true,
      message: '版本恢复成功',
      data: result
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

// POST /api/novel/:id/confirm - 确认小说
router.post('/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params
    const result = await novelService.confirmNovel(id)

    res.json({
      success: true,
      message: '小说确认成功',
      data: result
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

// DELETE /api/novel/:id - 删除小说
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await novelService.deleteNovel(id)

    res.json({
      success: true,
      message: '小说删除成功'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/novel/:id/export/:format - 导出小说
router.get('/:id/export/:format', async (req, res) => {
  try {
    const { id, format } = req.params
    const supportedFormats = ['txt', 'md', 'html']

    if (!supportedFormats.includes(format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `不支持的导出格式: ${format}`
      })
    }

    const result = await novelService.exportNovel(id, format)

    // 设置响应头
    const mimeType = {
      'txt': 'text/plain',
      'md': 'text/markdown',
      'html': 'text/html'
    }[format.toLowerCase()]

    res.setHeader('Content-Type', mimeType + '; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`)

    // 读取并返回文件内容
    const fs = require('fs-extra')
    const content = await fs.readFile(result.filePath, 'utf-8')
    res.send(content)

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

// POST /api/novel/:id/regenerate - 重新生成
router.post('/:id/regenerate', async (req, res) => {
  try {
    const { id } = req.params
    const { parameters } = req.body

    const novel = await novelService.getNovelById(id)
    if (!novel) {
      return res.status(404).json({
        success: false,
        error: `小说 ${id} 不存在`
      })
    }

    // 保存当前版本
    if (novel.content) {
      novel.versions.push({
        id: require('uuid').v4(),
        content: novel.content,
        wordCount: novel.content.length,
        createdAt: new Date().toISOString(),
        type: 'regenerate',
        reason: '重新生成前保存'
      })
    }

    // 清空当前内容
    novel.content = ''
    novel.currentWordCount = 0
    novel.status = 'draft'
    await novelService.saveNovel(novel)

    // 开始新的生成
    const result = await novelService.startGeneration(id, { parameters })

    if (result.success) {
      res.json({
        success: true,
        message: '重新生成已开始',
        data: result
      })
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      })
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

module.exports = router