const express = require('express')
const Joi = require('joi')
const path = require('path')
const fs = require('fs').promises
const SubtitleService = require('../src/services/subtitleService')

const router = express.Router()
const subtitleService = new SubtitleService()

// 验证模式
const generateSubtitleSchema = Joi.object({
  segments: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    text: Joi.string().required(),
    character: Joi.string().default('narrator'),
    emotion: Joi.string().default('neutral'),
    type: Joi.string().default('narration'),
    duration: Joi.number().default(0)
  })).required(),
  options: Joi.object({
    format: Joi.string().valid('srt', 'vtt').default('srt'),
    encoding: Joi.string().valid('utf-8', 'utf-16', 'gbk').default('utf-8'),
    maxCharsPerLine: Joi.number().integer().min(20).max(80).default(40),
    maxLinesPerSubtitle: Joi.number().integer().min(1).max(4).default(2),
    minDuration: Joi.number().integer().min(500).max(3000).default(1000),
    maxDuration: Joi.number().integer().min(3000).max(15000).default(7000),
    readingSpeed: Joi.number().min(2).max(10).default(4),
    fadeInDuration: Joi.number().integer().min(0).max(1000).default(0),
    fadeOutDuration: Joi.number().integer().min(0).max(1000).default(0)
  }).default({})
})

const fromTTSSchema = Joi.object({
  novelId: Joi.string().required(),
  ttsResults: Joi.array().items(Joi.object({
    segmentId: Joi.string().required(),
    originalText: Joi.string(),
    text: Joi.string().required(),
    character: Joi.string().default('narrator'),
    emotion: Joi.string().default('neutral'),
    type: Joi.string().default('narration'),
    duration: Joi.number().default(0),
    startTime: Joi.number(),
    endTime: Joi.number(),
    audioFile: Joi.string()
  })).required(),
  options: Joi.object({
    outputFormat: Joi.string().valid('srt', 'vtt', 'both').default('srt'),
    encoding: Joi.string().valid('utf-8', 'gbk', 'utf-16').default('utf-8'),
    maxLineLength: Joi.number().default(42),
    maxDuration: Joi.number().default(7),
    syncMode: Joi.string().valid('accurate', 'estimated', 'hybrid').default('hybrid')
  }).default({})
})

// 初始化字幕服务
router.post('/initialize', async (req, res) => {
  try {
    await subtitleService.initialize()
    res.json({
      success: true,
      message: '字幕服务初始化成功',
      data: {
        outputDir: path.join(process.cwd(), 'data', 'subtitles')
      }
    })
  } catch (error) {
    console.error('字幕服务初始化失败:', error)
    res.status(500).json({
      success: false,
      error: '字幕服务初始化失败',
      details: error.message
    })
  }
})

// 生成字幕文件
router.post('/generate', async (req, res) => {
  try {
    const { error, value } = generateSubtitleSchema.validate(req.body)

    if (error) {
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: error.details
      })
    }

    const { segments, options } = value

    // 生成字幕
    const result = await subtitleService.generateSubtitles(segments, options)

    res.json({
      success: true,
      message: '字幕生成完成',
      data: result
    })
  } catch (error) {
    console.error('字幕生成失败:', error)
    res.status(500).json({
      success: false,
      error: '字幕生成失败',
      details: error.message
    })
  }
})

// 从TTS结果生成字幕
router.post('/generate-from-tts', async (req, res) => {
  try {
    const { error, value } = fromTTSSchema.validate(req.body)

    if (error) {
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: error.details
      })
    }

    const { novelId, ttsResults, options } = value

    // 从TTS结果生成字幕
    const result = await subtitleService.generateSubtitlesFromTTS(ttsResults, options)

    res.json({
      success: true,
      message: '从TTS结果生成字幕完成',
      data: {
        novelId,
        ...result
      }
    })
  } catch (error) {
    console.error('从TTS结果生成字幕失败:', error)
    res.status(500).json({
      success: false,
      error: '从TTS结果生成字幕失败',
      details: error.message
    })
  }
})

// 获取字幕文件列表
router.get('/files', async (req, res) => {
  try {
    const { novelId } = req.query

    const files = await subtitleService.getSubtitleFiles(novelId)

    res.json({
      success: true,
      data: {
        files,
        totalCount: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0)
      }
    })
  } catch (error) {
    console.error('获取字幕文件列表失败:', error)
    res.status(500).json({
      success: false,
      error: '获取字幕文件列表失败',
      details: error.message
    })
  }
})

// 获取字幕文件信息
router.get('/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params
    const files = await subtitleService.getSubtitleFiles()
    const fileInfo = files.find(file => file.filename === filename)

    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        error: '字幕文件不存在'
      })
    }

    // 获取文件内容进行验证
    try {
      const content = await subtitleService.getSubtitleContent(filename)
      const validation = subtitleService.validateSubtitleContent(content)

      res.json({
        success: true,
        data: {
          ...fileInfo,
          validation
        }
      })
    } catch (contentError) {
      res.json({
        success: true,
        data: fileInfo
      })
    }
  } catch (error) {
    console.error('获取字幕文件信息失败:', error)
    res.status(500).json({
      success: false,
      error: '获取字幕文件信息失败',
      details: error.message
    })
  }
})

// 获取字幕文件内容
router.get('/files/:filename/content', async (req, res) => {
  try {
    const { filename } = req.params
    const content = await subtitleService.getSubtitleContent(filename)

    // 验证内容
    const validation = subtitleService.validateSubtitleContent(content)

    res.set({
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `inline; filename="${filename}"`
    })

    res.send(content)
  } catch (error) {
    console.error('获取字幕文件内容失败:', error)
    if (error.message.includes('不存在')) {
      res.status(404).json({
        success: false,
        error: '字幕文件不存在'
      })
    } else {
      res.status(500).json({
        success: false,
        error: '获取字幕文件内容失败',
        details: error.message
      })
    }
  }
})

// 下载字幕文件
router.get('/files/:filename/download', async (req, res) => {
  try {
    const { filename } = req.params
    const files = await subtitleService.getSubtitleFiles()
    const fileInfo = files.find(file => file.filename === filename)

    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        error: '字幕文件不存在'
      })
    }

    const content = await subtitleService.getSubtitleContent(filename)

    // 设置响应头
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')

    res.send(content)
  } catch (error) {
    console.error('下载字幕文件失败:', error)
    if (error.message.includes('不存在')) {
      res.status(404).json({
        success: false,
        error: '字幕文件不存在'
      })
    } else {
      res.status(500).json({
        success: false,
        error: '下载字幕文件失败',
        details: error.message
      })
    }
  }
})

// 验证字幕文件
router.post('/validate', async (req, res) => {
  try {
    const { content } = req.body

    if (!content) {
      return res.status(400).json({
        success: false,
        error: '请提供字幕文件内容'
      })
    }

    const validation = subtitleService.validateSubtitleContent(content)

    res.json({
      success: true,
      data: validation
    })
  } catch (error) {
    console.error('验证字幕文件失败:', error)
    res.status(500).json({
      success: false,
      error: '验证字幕文件失败',
      details: error.message
    })
  }
})

// 删除字幕文件
router.delete('/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params

    const result = await subtitleService.deleteSubtitleFile(filename)

    res.json(result)
  } catch (error) {
    console.error('删除字幕文件失败:', error)
    if (error.message.includes('不存在')) {
      res.status(404).json({
        success: false,
        error: '字幕文件不存在'
      })
    } else {
      res.status(500).json({
        success: false,
        error: '删除字幕文件失败',
        details: error.message
      })
    }
  }
})

// 获取字幕统计信息
router.get('/stats', async (req, res) => {
  try {
    const files = await subtitleService.getSubtitleFiles()

    const stats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      formats: {},
      sizeDistribution: {
        small: 0,    // < 1KB
        medium: 0,   // 1KB - 10KB
        large: 0     // > 10KB
      }
    }

    // 统计格式分布和大小分布
    files.forEach(file => {
      // 格式统计
      const format = file.format
      stats.formats[format] = (stats.formats[format] || 0) + 1

      // 大小统计
      if (file.size < 1024) {
        stats.sizeDistribution.small++
      } else if (file.size < 10240) {
        stats.sizeDistribution.medium++
      } else {
        stats.sizeDistribution.large++
      }
    })

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('获取字幕统计信息失败:', error)
    res.status(500).json({
      success: false,
      error: '获取字幕统计信息失败',
      details: error.message
    })
  }
})

// 预览字幕文件（带时间轴转换）
router.get('/files/:filename/preview', async (req, res) => {
  try {
    const { filename } = req.params
    const { timeOffset = 0, playbackSpeed = 1 } = req.query

    const content = await subtitleService.getSubtitleContent(filename)
    const validation = subtitleService.validateSubtitleContent(content)

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: '字幕文件格式无效',
        details: validation.error
      })
    }

    // 解析SRT内容并应用时间偏移
    const lines = content.split('\n')
    const previewData = []
    let currentSubtitle = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      if (!line) continue

      // 检查是否为序号行
      if (/^\d+$/.test(line)) {
        if (currentSubtitle) {
          previewData.push(currentSubtitle)
        }
        currentSubtitle = { index: parseInt(line), text: '' }
        continue
      }

      // 检查是否为时间轴行
      if (line.includes('-->') && /^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/.test(line)) {
        if (currentSubtitle) {
          const [startTime, endTime] = line.split(' --> ')

          // 转换为毫秒
          const startMs = parseSRTTime(startTime)
          const endMs = parseSRTTime(endTime)

          // 应用时间偏移和播放速度
          currentSubtitle.startTime = Math.max(0, (startMs + parseInt(timeOffset) * 1000) / playbackSpeed)
          currentSubtitle.endTime = Math.max(0, (endMs + parseInt(timeOffset) * 1000) / playbackSpeed)
          currentSubtitle.originalStartTime = startMs
          currentSubtitle.originalEndTime = endMs
        }
        continue
      }

      // 文本内容
      if (currentSubtitle && line) {
        if (currentSubtitle.text) {
          currentSubtitle.text += '\n' + line
        } else {
          currentSubtitle.text = line
        }
      }
    }

    // 添加最后一个字幕
    if (currentSubtitle) {
      previewData.push(currentSubtitle)
    }

    res.json({
      success: true,
      data: {
        filename,
        timeOffset: parseInt(timeOffset),
        playbackSpeed: parseFloat(playbackSpeed),
        subtitles: previewData,
        totalSubtitles: previewData.length,
        validation
      }
    })
  } catch (error) {
    console.error('预览字幕文件失败:', error)
    res.status(500).json({
      success: false,
      error: '预览字幕文件失败',
      details: error.message
    })
  }
})

// 辅助函数：解析SRT时间为毫秒
function parseSRTTime(timeStr) {
  const [time, ms] = timeStr.split(',')
  const [hours, minutes, seconds] = time.split(':').map(Number)
  return (hours * 3600 + minutes * 60 + seconds) * 1000 + parseInt(ms)
}

module.exports = router