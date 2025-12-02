const express = require('express')
const Joi = require('joi')
const path = require('path')
const fs = require('fs').promises
const crypto = require('crypto')
const TTSService = require('../src/services/ttsService')
// const { useAnalysisStore } = require('../src/store/analysis')

const router = express.Router()
const ttsService = new TTSService()

// 验证模式
const generateSpeechSchema = Joi.object({
  novelId: Joi.string().required(),
  segmentIds: Joi.array().items(Joi.string()).optional(),
  voiceConfig: Joi.object().optional(),
  options: Joi.object({
    format: Joi.string().valid('wav', 'mp3').default('wav'),
    quality: Joi.string().valid('low', 'medium', 'high').default('medium'),
    mergeOutput: Joi.boolean().default(true)
  }).default({})
})

const batchGenerateSchema = Joi.object({
  novelId: Joi.string().required(),
  segments: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    text: Joi.string().required(),
    character: Joi.string().required(),
    emotion: Joi.string().default('neutral'),
    type: Joi.string().default('narration'),
    duration: Joi.number().default(0)
  })).required(),
  voiceConfig: Joi.object().required(),
  outputOptions: Joi.object({
    format: Joi.string().valid('wav', 'mp3').default('wav'),
    sampleRate: Joi.number().valid(22050, 44100).default(22050),
    bitDepth: Joi.number().valid(16, 24).default(16),
    merge: Joi.boolean().default(true)
  }).default({})
})

const audioMergeSchema = Joi.object({
  audioFiles: Joi.array().items(Joi.object({
    path: Joi.string().required(),
    duration: Joi.number().required(),
    segmentId: Joi.string().required()
  })).required(),
  outputPath: Joi.string().required(),
  format: Joi.string().valid('wav', 'mp3').default('wav')
})

// 初始化TTS服务
router.post('/initialize', async (req, res) => {
  try {
    await ttsService.initialize()
    res.json({
      success: true,
      message: 'TTS服务初始化成功',
      data: ttsService.getStatus()
    })
  } catch (error) {
    console.error('TTS服务初始化失败:', error)
    res.status(500).json({
      success: false,
      error: 'TTS服务初始化失败',
      details: error.message
    })
  }
})

// 获取TTS服务状态
router.get('/status', async (req, res) => {
  try {
    const status = ttsService.getStatus()
    res.json({
      success: true,
      data: status
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取TTS服务状态失败',
      details: error.message
    })
  }
})

// 为单个段落生成语音
router.post('/generate/:segmentId', async (req, res) => {
  try {
    const { segmentId } = req.params
    const { novelId, voiceConfig, options } = req.body

    // 验证输入参数
    const { error, value } = generateSpeechSchema.validate({
      novelId,
      voiceConfig,
      options
    })

    if (error) {
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: error.details
      })
    }

    // 获取段落信息
    const segment = await getSegmentById(novelId, segmentId)
    if (!segment) {
      return res.status(404).json({
        success: false,
        error: '段落不存在'
      })
    }

    // 创建输出目录
    const outputDir = path.join(process.cwd(), 'data', 'audio', novelId)
    await fs.mkdir(outputDir, { recursive: true })

    // 生成语音
    const result = await ttsService.generateSpeechForSegment(
      segment,
      voiceConfig,
      outputDir
    )

    res.json({
      success: true,
      message: '语音生成完成',
      data: result
    })
  } catch (error) {
    console.error('语音生成失败:', error)
    res.status(500).json({
      success: false,
      error: '语音生成失败',
      details: error.message
    })
  }
})

// 批量生成语音
router.post('/batch-generate', async (req, res) => {
  try {
    const { novelId, segments, voiceConfig, outputOptions } = req.body

    // 验证输入参数
    const { error, value } = batchGenerateSchema.validate({
      novelId,
      segments,
      voiceConfig,
      outputOptions
    })

    if (error) {
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: error.details
      })
    }

    // 创建输出目录
    const outputDir = path.join(process.cwd(), 'data', 'audio', novelId)
    await fs.mkdir(outputDir, { recursive: true })

    // 设置进度回调
    const sessionId = crypto.randomUUID()
    ttsService.setProgressCallback((progress) => {
      // 这里可以通过WebSocket或其他方式推送进度给前端
      console.log(`生成进度 (${sessionId}):`, progress)
    })

    // 批量生成语音
    const results = await ttsService.generateSpeechBatch(
      segments,
      voiceConfig,
      outputDir
    )

    // 如果需要合并输出
    let mergedOutput = null
    if (outputOptions.merge) {
      const audioFiles = results
        .filter(result => result.status === 'completed')
        .map(result => ({
          path: result.outputPath,
          duration: result.duration,
          segmentId: result.segmentId
        }))

      if (audioFiles.length > 0) {
        const mergedPath = path.join(outputDir, `merged_${Date.now()}.${outputOptions.format}`)
        mergedOutput = await ttsService.mergeAudioFiles(audioFiles, mergedPath)
      }
    }

    res.json({
      success: true,
      message: '批量语音生成完成',
      data: {
        sessionId,
        totalSegments: segments.length,
        successCount: results.filter(r => r.status === 'completed').length,
        failureCount: results.filter(r => r.status === 'failed').length,
        results,
        mergedOutput
      }
    })
  } catch (error) {
    console.error('批量语音生成失败:', error)
    res.status(500).json({
      success: false,
      error: '批量语音生成失败',
      details: error.message
    })
  }
})

// 合并音频文件
router.post('/merge', async (req, res) => {
  try {
    const { audioFiles, outputPath, format } = req.body

    // 验证输入参数
    const { error, value } = audioMergeSchema.validate({
      audioFiles,
      outputPath,
      format
    })

    if (error) {
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: error.details
      })
    }

    // 确保输出目录存在
    const outputDir = path.dirname(outputPath)
    await fs.mkdir(outputDir, { recursive: true })

    // 合并音频文件
    const result = await ttsService.mergeAudioFiles(audioFiles, outputPath)

    res.json({
      success: true,
      message: '音频合并完成',
      data: result
    })
  } catch (error) {
    console.error('音频合并失败:', error)
    res.status(500).json({
      success: false,
      error: '音频合并失败',
      details: error.message
    })
  }
})

// 获取音频文件信息
router.get('/audio/:audioId', async (req, res) => {
  try {
    const { audioId } = req.params
    const audioPath = path.join(process.cwd(), 'data', 'audio', audioId)

    // 检查文件是否存在
    await fs.access(audioPath)

    // 获取文件信息
    const stats = await fs.stat(audioPath)

    res.json({
      success: true,
      data: {
        audioId,
        path: audioPath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        format: path.extname(audioPath).slice(1)
      }
    })
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({
        success: false,
        error: '音频文件不存在'
      })
    } else {
      res.status(500).json({
        success: false,
        error: '获取音频文件信息失败',
        details: error.message
      })
    }
  }
})

// 下载音频文件
router.get('/download/:audioId', async (req, res) => {
  try {
    const { audioId } = req.params
    const audioPath = path.join(process.cwd(), 'data', 'audio', audioId)

    // 检查文件是否存在
    await fs.access(audioPath)

    // 设置响应头
    const filename = path.basename(audioPath)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Type', 'audio/wav')

    // 发送文件
    res.sendFile(audioPath)
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({
        success: false,
        error: '音频文件不存在'
      })
    } else {
      res.status(500).json({
        success: false,
        error: '下载音频文件失败',
        details: error.message
      })
    }
  }
})

// 获取小说的音频生成历史
router.get('/history/:novelId', async (req, res) => {
  try {
    const { novelId } = req.params
    const audioDir = path.join(process.cwd(), 'data', 'audio', novelId)

    // 检查目录是否存在
    try {
      await fs.access(audioDir)
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.json({
          success: true,
          data: {
            novelId,
            audioFiles: [],
            totalSize: 0,
            totalDuration: 0
          }
        })
      }
      throw error
    }

    // 列出音频文件
    const files = await fs.readdir(audioDir)
    const audioFiles = []

    for (const file of files) {
      if (file.endsWith('.wav') || file.endsWith('.mp3')) {
        const filePath = path.join(audioDir, file)
        const stats = await fs.stat(filePath)

        audioFiles.push({
          id: file,
          filename: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        })
      }
    }

    res.json({
      success: true,
      data: {
        novelId,
        audioFiles: audioFiles.sort((a, b) => b.created - a.created),
        totalSize: audioFiles.reduce((sum, file) => sum + file.size, 0),
        totalDuration: audioFiles.length // 这里应该计算实际音频时长
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取音频历史失败',
      details: error.message
    })
  }
})

// 删除音频文件
router.delete('/audio/:audioId', async (req, res) => {
  try {
    const { audioId } = req.params
    const audioPath = path.join(process.cwd(), 'data', 'audio', audioId)

    // 删除文件
    await fs.unlink(audioPath)

    res.json({
      success: true,
      message: '音频文件删除成功'
    })
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({
        success: false,
        error: '音频文件不存在'
      })
    } else {
      res.status(500).json({
        success: false,
        error: '删除音频文件失败',
        details: error.message
      })
    }
  }
})

// 为小说生成完整音频
router.post('/generate-novel/:novelId', async (req, res) => {
  try {
    const { novelId } = req.params
    const { options = {} } = req.body

    console.log(`开始为小说 ${novelId} 生成完整音频`)

    // 初始化TTS服务
    await ttsService.initialize()

    // 生成完整音频
    const result = await ttsService.generateNovelAudio(novelId, options)

    res.json({
      success: true,
      message: '小说音频生成完成',
      data: {
        novelId,
        audioFile: result.audioFile,
        duration: result.duration,
        segments: result.segments,
        metadata: result.metadata
      }
    })

  } catch (error) {
    console.error(`小说 ${req.params.novelId} 音频生成失败:`, error.message)
    res.status(500).json({
      success: false,
      error: '小说音频生成失败',
      details: error.message
    })
  }
})

// 从TTS脚本生成音频
router.post('/generate-from-script/:novelId', async (req, res) => {
  try {
    const { novelId } = req.params
    const { ttsScript, options = {} } = req.body

    if (!ttsScript || !ttsScript.segments) {
      return res.status(400).json({
        success: false,
        error: 'TTS脚本格式不正确'
      })
    }

    console.log(`从TTS脚本为小说 ${novelId} 生成音频，段落数: ${ttsScript.segments.length}`)

    // 初始化TTS服务
    await ttsService.initialize()

    // 生成音频
    const result = await ttsService.generateAudioFromScript(ttsScript, {
      ...options,
      novelId
    })

    res.json({
      success: true,
      message: '音频生成完成',
      data: {
        novelId,
        audioFile: result.audioFile,
        duration: result.duration,
        metadata: result.metadata,
        segments: result.metadata.segments
      }
    })

  } catch (error) {
    console.error(`从TTS脚本生成音频失败:`, error.message)
    res.status(500).json({
      success: false,
      error: '音频生成失败',
      details: error.message
    })
  }
})

// 获取TTS语音选项
router.get('/voice-options', async (req, res) => {
  try {
    const voiceOptions = await ttsService.getVoiceOptions()
    res.json({
      success: true,
      data: voiceOptions
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取语音选项失败',
      details: error.message
    })
  }
})

// 获取TTS系统状态
router.get('/system-status', async (req, res) => {
  try {
    const systemStatus = await ttsService.getSystemStatus()
    res.json({
      success: true,
      data: systemStatus
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取系统状态失败',
      details: error.message
    })
  }
})

// 清理临时文件
router.post('/cleanup', async (req, res) => {
  try {
    await ttsService.cleanup()
    res.json({
      success: true,
      message: '临时文件清理完成'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '清理临时文件失败',
      details: error.message
    })
  }
})

// 生成音频并同步创建字幕
router.post('/generate-with-subtitles/:novelId', async (req, res) => {
  try {
    const { novelId } = req.params
    const { ttsScript, subtitleOptions = {}, audioOptions = {} } = req.body

    if (!ttsScript || !ttsScript.segments) {
      return res.status(400).json({
        success: false,
        error: 'TTS脚本格式不正确'
      })
    }

    console.log(`开始为小说 ${novelId} 生成音频和同步字幕`)

    // 初始化TTS服务
    await ttsService.initialize()

    // 1. 生成音频
    const audioResult = await ttsService.generateAudioFromScript(ttsScript, {
      ...audioOptions,
      novelId
    })

    // 2. 从音频生成结果创建同步字幕
    const SubtitleService = require('../src/services/subtitleService')
    const subtitleService = new SubtitleService()

    // 将音频结果转换为TTS结果格式用于字幕生成
    const ttsResultsForSubtitle = audioResult.segments.map(segment => ({
      segmentId: segment.id,
      originalText: segment.text,
      text: segment.text,
      character: segment.character,
      emotion: segment.emotion,
      type: segment.type,
      startTime: segment.startTime,
      endTime: segment.endTime,
      duration: segment.duration,
      audioFile: segment.audioFile
    }))

    // 3. 生成同步字幕
    const subtitleResult = await subtitleService.generateSubtitlesFromTTS(
      ttsResultsForSubtitle,
      {
        ...subtitleOptions,
        syncMode: 'accurate', // 使用精确时间同步
        outputFormat: 'srt'
      }
    )

    // 4. 验证同步准确性
    const validation = subtitleService.validateTimingAccuracy(
      subtitleResult.segments,
      ttsResultsForSubtitle
    )

    res.json({
      success: true,
      message: '音频和同步字幕生成完成',
      data: {
        novelId,
        audio: {
          audioFile: audioResult.audioFile,
          duration: audioResult.duration,
          segments: audioResult.segments,
          metadata: audioResult.metadata
        },
        subtitles: {
          srtFile: subtitleResult.srtFile,
          vttFile: subtitleResult.vttFile,
          segments: subtitleResult.segments,
          metadata: subtitleResult.metadata
        },
        synchronization: {
          isAccurate: validation.isAccurate,
          totalSegments: validation.statistics.totalSegments,
          totalDuration: validation.statistics.totalDuration,
          averageDuration: validation.statistics.averageDuration,
          issues: validation.statistics.gaps.length + validation.statistics.overlaps.length
        }
      }
    })

  } catch (error) {
    console.error(`生成音频和同步字幕失败:`, error.message)
    res.status(500).json({
      success: false,
      error: '生成音频和同步字幕失败',
      details: error.message
    })
  }
})

// 为已有音频生成同步字幕
router.post('/sync-subtitles/:novelId', async (req, res) => {
  try {
    const { novelId } = req.params
    const { audioSegments, subtitleOptions = {} } = req.body

    if (!audioSegments || !Array.isArray(audioSegments)) {
      return res.status(400).json({
        success: false,
        error: '音频段落数据格式不正确'
      })
    }

    console.log(`为小说 ${novelId} 的已有音频生成同步字幕`)

    // 初始化字幕服务
    const SubtitleService = require('../src/services/subtitleService')
    const subtitleService = new SubtitleService()

    // 生成同步字幕
    const subtitleResult = await subtitleService.generateSubtitlesFromTTS(
      audioSegments,
      {
        ...subtitleOptions,
        syncMode: 'accurate',
        outputFormat: 'both'
      }
    )

    // 验证同步准确性
    const validation = subtitleService.validateTimingAccuracy(
      subtitleResult.segments,
      audioSegments
    )

    res.json({
      success: true,
      message: '同步字幕生成完成',
      data: {
        novelId,
        subtitles: subtitleResult,
        validation: validation
      }
    })

  } catch (error) {
    console.error(`生成同步字幕失败:`, error.message)
    res.status(500).json({
      success: false,
      error: '生成同步字幕失败',
      details: error.message
    })
  }
})

// 辅助函数：根据ID获取段落信息
async function getSegmentById(novelId, segmentId) {
  try {
    // 这里应该从分析结果中获取段落信息
    // 暂时返回模拟数据
    return {
      id: segmentId,
      text: '这是一个测试段落',
      character: 'narrator',
      emotion: 'neutral',
      type: 'narration',
      duration: 5.0
    }
  } catch (error) {
    throw new Error(`获取段落信息失败: ${error.message}`)
  }
}

module.exports = router