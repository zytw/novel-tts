const fs = require('fs').promises
const path = require('path')

class SubtitleService {
  constructor() {
    this.outputDir = path.join(process.cwd(), 'data', 'subtitles')
  }

  /**
   * 初始化字幕服务
   */
  async initialize() {
    try {
      // 确保输出目录存在
      await this.ensureDirectory(this.outputDir)
      console.log('字幕服务初始化成功')
    } catch (error) {
      console.error('字幕服务初始化失败:', error)
      throw error
    }
  }

  /**
   * 确保目录存在
   */
  async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath)
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(dirPath, { recursive: true })
      }
    }
  }

  /**
   * 生成SRT字幕文件
   * @param {Array} segments - 文本段落数组
   * @param {Object} options - 生成选项
   * @returns {Object} 生成结果
   */
  async generateSubtitles(segments, options = {}) {
    const {
      format = 'srt',
      encoding = 'utf-8',
      maxCharsPerLine = 40,
      maxLinesPerSubtitle = 2,
      minDuration = 1000, // 最小显示时间（毫秒）
      maxDuration = 7000, // 最大显示时间（毫秒）
      readingSpeed = 4, // 每秒阅读字符数（中文）
      fadeInDuration = 0,
      fadeOutDuration = 0
    } = options

    try {
      // 确保输出目录存在
      await this.ensureDirectory(this.outputDir)

      // 处理段落并计算时间轴
      const processedSegments = this.processSegments(segments, {
        maxCharsPerLine,
        maxLinesPerSubtitle,
        minDuration,
        maxDuration,
        readingSpeed,
        fadeInDuration,
        fadeOutDuration
      })

      // 根据格式生成字幕
      let content
      let fileExtension

      switch (format.toLowerCase()) {
        case 'srt':
          content = this.generateSRTContent(processedSegments)
          fileExtension = '.srt'
          break
        case 'vtt':
          content = this.generateVTTContent(processedSegments)
          fileExtension = '.vtt'
          break
        default:
          throw new Error(`不支持的字幕格式: ${format}`)
      }

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `subtitle_${timestamp}${fileExtension}`
      const outputPath = path.join(this.outputDir, filename)

      // 写入文件
      await fs.writeFile(outputPath, content, encoding)

      return {
        success: true,
        filename,
        outputPath,
        format,
        encoding,
        segmentsCount: processedSegments.length,
        totalDuration: this.calculateTotalDuration(processedSegments),
        fileSize: (await fs.stat(outputPath)).size
      }
    } catch (error) {
      console.error('字幕生成失败:', error)
      throw error
    }
  }

  /**
   * 处理段落并计算时间轴
   * @param {Array} segments - 原始段落
   * @param {Object} options - 处理选项
   * @returns {Array} 处理后的段落
   */
  processSegments(segments, options) {
    const processed = []
    let currentTime = 0

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]

      // 分割长文本为多个字幕块
      const subtitleBlocks = this.splitTextForSubtitle(segment.text, options)

      subtitleBlocks.forEach((block, blockIndex) => {
        // 计算显示时长
        const duration = this.calculateDisplayDuration(block, options)

        // 确保字幕不重叠
        const adjustedDuration = Math.min(duration, options.maxDuration)

        const subtitleSegment = {
          id: processed.length + 1,
          text: block.trim(),
          startTime: currentTime,
          endTime: currentTime + adjustedDuration,
          duration: adjustedDuration,
          character: segment.character || 'narrator',
          emotion: segment.emotion || 'neutral',
          type: segment.type || 'narration'
        }

        processed.push(subtitleSegment)
        currentTime += adjustedDuration
      })
    }

    return processed
  }

  /**
   * 将文本分割为适合字幕的块
   * @param {string} text - 原始文本
   * @param {Object} options - 分割选项
   * @returns {Array} 分割后的文本块
   */
  splitTextForSubtitle(text, options) {
    const { maxCharsPerLine, maxLinesPerSubtitle } = options

    // 移除多余空白字符
    text = text.replace(/\s+/g, ' ').trim()

    if (text.length <= maxCharsPerLine) {
      return [text]
    }

    const blocks = []
    let remainingText = text

    while (remainingText.length > 0) {
      const maxLength = maxCharsPerLine * maxLinesPerSubtitle

      if (remainingText.length <= maxLength) {
        blocks.push(remainingText)
        break
      }

      // 尝试在句子边界分割
      const sentenceEndings = ['。', '！', '？', '；', '：']
      let cutIndex = -1

      for (let i = maxLength - 10; i < maxLength; i++) {
        if (sentenceEndings.includes(remainingText[i])) {
          cutIndex = i + 1
          break
        }
      }

      // 如果找不到合适的分割点，按长度分割
      if (cutIndex === -1) {
        cutIndex = maxLength
      }

      blocks.push(remainingText.substring(0, cutIndex).trim())
      remainingText = remainingText.substring(cutIndex).trim()
    }

    return blocks
  }

  /**
   * 计算字幕显示时长
   * @param {string} text - 字幕文本
   * @param {Object} options - 计算选项
   * @returns {number} 显示时长（毫秒）
   */
  calculateDisplayDuration(text, options) {
    const { minDuration, maxDuration, readingSpeed } = options

    // 计算基础阅读时间
    const charCount = text.length
    const baseDuration = (charCount / readingSpeed) * 1000 // 转换为毫秒

    // 应用时间限制
    const duration = Math.max(minDuration, Math.min(baseDuration, maxDuration))

    return Math.round(duration)
  }

  /**
   * 生成SRT格式内容
   * @param {Array} segments - 处理后的段落
   * @returns {string} SRT格式内容
   */
  generateSRTContent(segments) {
    let content = ''

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]

      // 序号
      content += `${segment.id}\n`

      // 时间轴
      content += `${this.formatSRTTime(segment.startTime)} --> ${this.formatSRTTime(segment.endTime)}\n`

      // 字幕文本
      content += `${segment.text}\n\n`
    }

    return content.trim()
  }

  /**
   * 生成WebVTT格式内容
   * @param {Array} segments - 处理后的段落
   * @returns {string} WebVTT格式内容
   */
  generateVTTContent(segments) {
    let content = 'WEBVTT\n\n'

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]

      // 时间轴
      content += `${this.formatVTTTime(segment.startTime)} --> ${this.formatVTTTime(segment.endTime)}\n`

      // 字幕文本
      content += `${segment.text}\n\n`
    }

    return content.trim()
  }

  /**
   * 格式化SRT时间
   * @param {number} milliseconds - 毫秒时间
   * @returns {string} 格式化的时间字符串
   */
  formatSRTTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const ms = milliseconds % 1000

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(ms).padStart(3, '0')}`
  }

  /**
   * 格式化WebVTT时间
   * @param {number} milliseconds - 毫秒时间
   * @returns {string} 格式化的时间字符串
   */
  formatVTTTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const ms = milliseconds % 1000

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
  }

  /**
   * 计算总时长
   * @param {Array} segments - 段落数组
   * @returns {number} 总时长（毫秒）
   */
  calculateTotalDuration(segments) {
    if (segments.length === 0) return 0

    const lastSegment = segments[segments.length - 1]
    return lastSegment.endTime
  }

  /**
   * 从TTS结果生成同步字幕
   * @param {Array} ttsResults - TTS生成结果
   * @param {Object} options - 字幕选项
   * @returns {Object} 字幕生成结果
   */
  async generateSubtitlesFromTTS(ttsResults, options = {}) {
    try {
      const segments = ttsResults.map(result => ({
        id: result.segmentId,
        text: result.originalText || result.text || '未提供文本',
        character: result.character || 'narrator',
        emotion: result.emotion || 'neutral',
        type: result.type || 'narration',
        duration: result.duration || 0
      }))

      return await this.generateSubtitles(segments, options)
    } catch (error) {
      console.error('从TTS结果生成字幕失败:', error)
      throw error
    }
  }

  /**
   * 获取字幕文件列表
   * @param {string} novelId - 小说ID（可选）
   * @returns {Array} 字幕文件列表
   */
  async getSubtitleFiles(novelId = null) {
    try {
      await this.ensureDirectory(this.outputDir)

      const files = await fs.readdir(this.outputDir)
      const subtitleFiles = []

      for (const file of files) {
        if (file.endsWith('.srt') || file.endsWith('.vtt')) {
          const filePath = path.join(this.outputDir, file)
          const stats = await fs.stat(filePath)

          subtitleFiles.push({
            id: file,
            filename: file,
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            format: path.extname(file).slice(1)
          })
        }
      }

      return subtitleFiles.sort((a, b) => b.created - a.created)
    } catch (error) {
      console.error('获取字幕文件列表失败:', error)
      throw error
    }
  }

  /**
   * 删除字幕文件
   * @param {string} filename - 文件名
   */
  async deleteSubtitleFile(filename) {
    try {
      const filePath = path.join(this.outputDir, filename)
      await fs.unlink(filePath)
      return { success: true, message: '字幕文件删除成功' }
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('字幕文件不存在')
      }
      throw error
    }
  }

  /**
   * 获取字幕文件内容
   * @param {string} filename - 文件名
   * @returns {string} 文件内容
   */
  async getSubtitleContent(filename) {
    try {
      const filePath = path.join(this.outputDir, filename)
      return await fs.readFile(filePath, 'utf-8')
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('字幕文件不存在')
      }
      throw error
    }
  }

  /**
   * 验证字幕文件格式
   * @param {string} content - 字幕文件内容
   * @returns {Object} 验证结果
   */
  validateSubtitleContent(content) {
    try {
      // 检查是否为有效的SRT格式
      const lines = content.split('\n').filter(line => line.trim())

      if (lines.length === 0) {
        return { valid: false, error: '文件内容为空' }
      }

      let subtitleCount = 0
      let i = 0

      while (i < lines.length) {
        // 检查序号
        const lineNumber = parseInt(lines[i])
        if (isNaN(lineNumber)) {
          return { valid: false, error: `第${i + 1}行：无效的序号格式` }
        }
        i++

        if (i >= lines.length) {
          return { valid: false, error: `第${i}行：缺少时间轴` }
        }

        // 检查时间轴格式
        const timeLine = lines[i]
        const timePattern = /^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/
        if (!timePattern.test(timeLine)) {
          return { valid: false, error: `第${i + 1}行：无效的时间轴格式` }
        }
        i++

        if (i >= lines.length) {
          return { valid: false, error: `第${i}行：缺少字幕文本` }
        }

        // 检查字幕文本
        const text = lines[i]
        if (text.trim().length === 0) {
          return { valid: false, error: `第${i + 1}行：字幕文本为空` }
        }
        i++

        subtitleCount++
      }

      return {
        valid: true,
        subtitleCount,
        message: `验证通过，包含${subtitleCount}条字幕`
      }
    } catch (error) {
      return { valid: false, error: error.message }
    }
  }
}

module.exports = SubtitleService