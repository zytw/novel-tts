const express = require('express')
const Joi = require('joi')
const AnalysisService = require('../src/services/analysisService')

const router = express.Router()
const analysisService = new AnalysisService()

// 验证模式
const analysisOptionsSchema = Joi.object({
  force: Joi.boolean().default(false),
  modelId: Joi.string().optional()
})

const voiceMatchOptionsSchema = Joi.object({
  modelId: Joi.string().optional(),
  customPreferences: Joi.object().default({})
})

// POST /api/analysis/novels/:id/characters - 分析小说角色
router.post('/novels/:id/characters', async (req, res) => {
  try {
    const { id } = req.params
    const { error, value } = analysisOptionsSchema.validate(req.body)

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      })
    }

    const result = await analysisService.analyzeNovelCharacters(id, value)

    if (result.success) {
      res.json({
        success: true,
        message: '角色分析完成',
        data: {
          novelId: id,
          analysis: result.analysis,
          modelUsed: result.modelUsed,
          isCached: result.isCached
        }
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

// POST /api/analysis/novels/:id/voice-matching - 音色匹配
router.post('/novels/:id/voice-matching', async (req, res) => {
  try {
    const { id } = req.params
    const { analysis, options = {} } = req.body

    if (!analysis) {
      return res.status(400).json({
        success: false,
        error: '角色分析结果是必需的'
      })
    }

    const { error, value } = voiceMatchOptionsSchema.validate(options)

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      })
    }

    const result = await analysisService.matchVoiceProfiles(id, analysis, value)

    if (result.success) {
      res.json({
        success: true,
        message: '音色匹配完成',
        data: {
          novelId: id,
          configuration: result.configuration,
          modelUsed: result.modelUsed
        }
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

// POST /api/analysis/novels/:id/script - 生成TTS脚本
router.post('/novels/:id/script', async (req, res) => {
  try {
    const { id } = req.params
    const { analysis, voiceConfiguration } = req.body

    if (!analysis) {
      return res.status(400).json({
        success: false,
        error: '角色分析结果是必需的'
      })
    }

    if (!voiceConfiguration) {
      return res.status(400).json({
        success: false,
        error: '音色配置是必需的'
      })
    }

    const result = await analysisService.generateTTSScript(id, analysis, voiceConfiguration)

    if (result.success) {
      res.json({
        success: true,
        message: 'TTS脚本生成完成',
        data: {
          novelId: id,
          script: result.script
        }
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

// GET /api/analysis/novels/:id/analysis - 获取完整的分析结果
router.get('/novels/:id/analysis', async (req, res) => {
  try {
    const { id } = req.params
    const NovelService = require('../src/services/novelService')
    const novelService = new NovelService()

    const novel = await novelService.getNovelById(id)
    if (!novel) {
      return res.status(404).json({
        success: false,
        error: `小说 ${id} 不存在`
      })
    }

    const analysisResult = {
      novelId: id,
      title: novel.title,
      status: 'pending',
      characterAnalysis: novel.characterAnalysis || null,
      voiceConfiguration: novel.voiceConfiguration || null,
      ttsScript: novel.ttsScript || null,
      analysisStatus: novel.analysisStatus || 'pending',
      voiceConfigStatus: novel.voiceConfigStatus || 'pending',
      scriptStatus: novel.scriptStatus || 'pending',
      analyzedAt: novel.analyzedAt || null,
      voiceConfiguredAt: novel.voiceConfiguredAt || null,
      scriptGeneratedAt: novel.scriptGeneratedAt || null
    }

    // 检查完成状态
    const completedSteps = []
    if (novel.characterAnalysis) completedSteps.push('character_analysis')
    if (novel.voiceConfiguration) completedSteps.push('voice_matching')
    if (novel.ttsScript) completedSteps.push('script_generation')

    if (completedSteps.length === 3) {
      analysisResult.status = 'completed'
    } else if (completedSteps.length > 0) {
      analysisResult.status = 'in_progress'
    }

    res.json({
      success: true,
      data: analysisResult
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

// POST /api/analysis/novels/:id/complete - 完整分析流程（角色分析+音色匹配+脚本生成）
router.post('/novels/:id/complete', async (req, res) => {
  try {
    const { id } = req.params
    const { options = {} } = req.body

    // 步骤1: 角色分析
    console.log(`开始角色分析: ${id}`)
    const analysisResult = await analysisService.analyzeNovelCharacters(id, {
      force: options.force || false,
      modelId: options.modelId
    })

    if (!analysisResult.success) {
      throw new Error(`角色分析失败: ${analysisResult.error}`)
    }

    // 步骤2: 音色匹配
    console.log(`开始音色匹配: ${id}`)
    const voiceResult = await analysisService.matchVoiceProfiles(
      id,
      analysisResult.analysis,
      {
        modelId: options.modelId,
        customPreferences: options.customPreferences
      }
    )

    if (!voiceResult.success) {
      throw new Error(`音色匹配失败: ${voiceResult.error}`)
    }

    // 步骤3: 生成TTS脚本
    console.log(`开始生成TTS脚本: ${id}`)
    const scriptResult = await analysisService.generateTTSScript(
      id,
      analysisResult.analysis,
      voiceResult.configuration
    )

    if (!scriptResult.success) {
      throw new Error(`TTS脚本生成失败: ${scriptResult.error}`)
    }

    res.json({
      success: true,
      message: '完整分析流程完成',
      data: {
        novelId: id,
        analysis: analysisResult.analysis,
        voiceConfiguration: voiceResult.configuration,
        script: scriptResult.script,
        completedSteps: ['character_analysis', 'voice_matching', 'script_generation'],
        completedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      step: error.message.includes('失败') ? error.message.split(':')[0] : 'unknown'
    })
  }
})

// GET /api/analysis/voice-profiles - 获取可用的音色配置模板
router.get('/voice-profiles', async (req, res) => {
  try {
    // 提供预定义的音色配置模板
    const voiceProfiles = {
      narrator: {
        name: "叙述者",
        description: "中性叙述声音，适合长时间聆听",
        voiceProfile: {
          tone: "neutral",
          pitch: "medium",
          speed: "normal",
          volume: "normal",
          emotion: "calm",
          clarity: "clear"
        }
      },
      male_protagonist: {
        name: "男性主角",
        description: "年轻男性主角的标准音色",
        voiceProfile: {
          tone: "warm",
          pitch: "medium_high",
          speed: "normal",
          volume: "normal",
          emotion: "friendly",
          clarity: "clear"
        }
      },
      female_protagonist: {
        name: "女性主角",
        description: "年轻女性主角的标准音色",
        voiceProfile: {
          tone: "gentle",
          pitch: "medium",
          speed: "normal",
          volume: "soft",
          emotion: "warm",
          clarity: "clear"
        }
      },
      elderly_male: {
        name: "老年男性",
        description: "沉稳的老年男性音色",
        voiceProfile: {
          tone: "serious",
          pitch: "low",
          speed: "slow",
          volume: "normal",
          emotion: "calm",
          clarity: "clear"
        }
      },
      elderly_female: {
        name: "老年女性",
        description: "温和的老年女性音色",
        voiceProfile: {
          tone: "gentle",
          pitch: "medium_low",
          speed: "slow",
          volume: "soft",
          emotion: "warm",
          clarity: "clear"
        }
      },
      child: {
        name: "儿童",
        description: "活泼的儿童音色",
        voiceProfile: {
          tone: "cheerful",
          pitch: "high",
          speed: "fast",
          volume: "normal",
          emotion: "happy",
          clarity: "clear"
        }
      },
      villain: {
        name: "反派角色",
        description: "深沉的反派角色音色",
        voiceProfile: {
          tone: "cold",
          pitch: "low",
          speed: "slow",
          volume: "loud",
          emotion: "serious",
          clarity: "clear"
        }
      }
    }

    res.json({
      success: true,
      data: voiceProfiles
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/analysis/analysis-history - 获取分析历史记录
router.get('/analysis-history', async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query

    // 这里应该从数据库查询历史记录，现在是模拟实现
    const NovelService = require('../src/services/novelService')
    const novelService = new NovelService()

    const novels = await novelService.getNovelList({ sortBy: 'updatedAt' })

    // 过滤有分析结果的小说
    const analyzedNovels = novels.filter(novel =>
      novel.characterAnalysis || novel.voiceConfiguration || novel.ttsScript
    )

    // 分页处理
    const startIndex = parseInt(offset)
    const endIndex = startIndex + parseInt(limit)
    const paginatedResults = analyzedNovels.slice(startIndex, endIndex)

    const history = paginatedResults.map(novel => ({
      novelId: novel.id,
      title: novel.title,
      hasCharacterAnalysis: !!novel.characterAnalysis,
      hasVoiceConfiguration: !!novel.voiceConfiguration,
      hasTTSScript: !!novel.ttsScript,
      analyzedAt: novel.analyzedAt,
      voiceConfiguredAt: novel.voiceConfiguredAt,
      scriptGeneratedAt: novel.scriptGeneratedAt,
      status: novel.ttsScript ? 'completed' :
             novel.voiceConfiguration ? 'voice_matched' :
             novel.characterAnalysis ? 'analyzed' : 'pending'
    }))

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          total: analyzedNovels.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: endIndex < analyzedNovels.length
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

// DELETE /api/analysis/novels/:id/analysis - 删除分析结果
router.delete('/novels/:id/analysis', async (req, res) => {
  try {
    const { id } = req.params
    const NovelService = require('../src/services/novelService')
    const novelService = new NovelService()

    const novel = await novelService.getNovelById(id)
    if (!novel) {
      return res.status(404).json({
        success: false,
        error: `小说 ${id} 不存在`
      })
    }

    // 清除分析相关数据
    novel.characterAnalysis = null
    novel.voiceConfiguration = null
    novel.ttsScript = null
    novel.analysisStatus = 'pending'
    novel.voiceConfigStatus = 'pending'
    novel.scriptStatus = 'pending'
    novel.analyzedAt = null
    novel.voiceConfiguredAt = null
    novel.scriptGeneratedAt = null

    await novelService.saveNovel(novel)

    res.json({
      success: true,
      message: '分析结果已清除'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

module.exports = router