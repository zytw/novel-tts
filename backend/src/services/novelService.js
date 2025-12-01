const fs = require('fs-extra')
const path = require('path')
const AIService = require('./aiService')
const { v4: uuidv4 } = require('uuid')

class NovelService {
  constructor() {
    this.aiService = new AIService()
    this.novelsDir = path.join(__dirname, '../../../data/novels')
    this.ensureDirectories()
  }

  /**
   * 确保必要的目录存在
   */
  async ensureDirectories() {
    await fs.ensureDir(this.novelsDir)
  }

  /**
   * 创建新的小说项目
   * @param {Object} options - 创建选项
   * @returns {Object} 小说项目信息
   */
  async createNovel(options) {
    const {
      title,
      description = '',
      promptId,
      modelId,
      parameters = {},
      targetWordCount = 2000
    } = options

    const novelId = uuidv4()
    const timestamp = new Date().toISOString()

    const novel = {
      id: novelId,
      title,
      description,
      promptId,
      modelId,
      parameters,
      targetWordCount,
      status: 'draft',
      content: '',
      currentWordCount: 0,
      versions: [],
      createdAt: timestamp,
      updatedAt: timestamp
    }

    // 保存到文件系统
    const filePath = path.join(this.novelsDir, `${novelId}.json`)
    await fs.writeJson(filePath, novel, { spaces: 2 })

    return novel
  }

  /**
   * 开始生成小说内容
   * @param {string} novelId - 小说ID
   * @param {Object} options - 生成选项
   * @returns {Object} 生成任务信息
   */
  async startGeneration(novelId, options = {}) {
    try {
      // 获取小说信息
      const novel = await this.getNovelById(novelId)
      if (!novel) {
        throw new Error(`小说 ${novelId} 不存在`)
      }

      if (novel.status === 'generating') {
        throw new Error('小说正在生成中，请等待当前任务完成')
      }

      // 更新状态为生成中
      novel.status = 'generating'
      novel.updatedAt = new Date().toISOString()
      await this.saveNovel(novel)

      // 开始AI生成
      const progressCallback = async (progress) => {
        // 更新生成进度
        novel.currentWordCount = progress.currentWordCount
        novel.content = this.aiService.activeGenerations.get(progress.generationId)?.content || ''

        // 保存进度
        await this.saveNovel(novel)
      }

      const generationResult = await this.aiService.generateNovel({
        promptId: novel.promptId,
        modelId: novel.modelId,
        parameters: { ...novel.parameters, ...options.parameters },
        targetWordCount: novel.targetWordCount,
        onProgress: progressCallback
      })

      if (generationResult.success) {
        // 保存生成的内容作为第一个版本
        novel.content = generationResult.content
        novel.currentWordCount = generationResult.wordCount
        novel.status = 'draft'
        novel.versions.push({
          id: uuidv4(),
          content: generationResult.content,
          wordCount: generationResult.wordCount,
          createdAt: new Date().toISOString(),
          type: 'generated'
        })

        // 更新小说信息
        await this.saveNovel(novel)

        return {
          success: true,
          novelId,
          generationId: generationResult.generationId,
          wordCount: generationResult.wordCount,
          content: generationResult.content
        }
      } else {
        // 生成失败
        novel.status = 'error'
        await this.saveNovel(novel)

        return {
          success: false,
          novelId,
          error: generationResult.error
        }
      }

    } catch (error) {
      // 更新状态为错误
      try {
        const novel = await this.getNovelById(novelId)
        if (novel) {
          novel.status = 'error'
          novel.error = error.message
          await this.saveNovel(novel)
        }
      } catch (saveError) {
        console.error('Failed to save error status:', saveError)
      }

      throw error
    }
  }

  /**
   * 获取小说生成状态
   * @param {string} novelId - 小说ID
   * @returns {Object} 生成状态
   */
  async getGenerationStatus(novelId) {
    const novel = await this.getNovelById(novelId)
    if (!novel) {
      throw new Error(`小说 ${novelId} 不存在`)
    }

    return {
      novelId,
      status: novel.status,
      currentWordCount: novel.currentWordCount,
      targetWordCount: novel.targetWordCount,
      progress: novel.targetWordCount > 0
        ? Math.min((novel.currentWordCount / novel.targetWordCount) * 100, 100)
        : 0,
      lastUpdated: novel.updatedAt
    }
  }

  /**
   * 更新小说内容
   * @param {string} novelId - 小说ID
   * @param {string} content - 新内容
   * @param {string} changeReason - 修改原因
   * @returns {Object} 更新结果
   */
  async updateNovelContent(novelId, content, changeReason = '') {
    try {
      const novel = await this.getNovelById(novelId)
      if (!novel) {
        throw new Error(`小说 ${novelId} 不存在`)
      }

      // 保存旧版本
      if (novel.content && novel.content !== content) {
        novel.versions.push({
          id: uuidv4(),
          content: novel.content,
          wordCount: novel.content.length,
          createdAt: new Date().toISOString(),
          type: 'edit',
          reason: changeReason
        })
      }

      // 更新内容
      novel.content = content
      novel.currentWordCount = content.length
      novel.updatedAt = new Date().toISOString()

      await this.saveNovel(novel)

      return {
        success: true,
        wordCount: content.length,
        versionsCount: novel.versions.length
      }

    } catch (error) {
      throw new Error(`更新内容失败: ${error.message}`)
    }
  }

  /**
   * 获取小说版本列表
   * @param {string} novelId - 小说ID
   * @returns {Array} 版本列表
   */
  async getNovelVersions(novelId) {
    const novel = await this.getNovelById(novelId)
    if (!novel) {
      throw new Error(`小说 ${novelId} 不存在`)
    }

    return novel.versions.map((version, index) => ({
      ...version,
      versionNumber: index + 1,
      isCurrent: version.id === novel.versions[novel.versions.length - 1]?.id
    }))
  }

  /**
   * 恢复到指定版本
   * @param {string} novelId - 小说ID
   * @param {string} versionId - 版本ID
   * @returns {Object} 恢复结果
   */
  async restoreVersion(novelId, versionId) {
    try {
      const novel = await this.getNovelById(novelId)
      if (!novel) {
        throw new Error(`小说 ${novelId} 不存在`)
      }

      const version = novel.versions.find(v => v.id === versionId)
      if (!version) {
        throw new Error(`版本 ${versionId} 不存在`)
      }

      // 保存当前状态作为新版本
      if (novel.content !== version.content) {
        novel.versions.push({
          id: uuidv4(),
          content: novel.content,
          wordCount: novel.content.length,
          createdAt: new Date().toISOString(),
          type: 'restore',
          reason: `恢复到版本 ${versionId}`
        })
      }

      // 恢复内容
      novel.content = version.content
      novel.currentWordCount = version.content.length
      novel.updatedAt = new Date().toISOString()

      await this.saveNovel(novel)

      return {
        success: true,
        wordCount: version.content.length,
        restoredVersionId: versionId
      }

    } catch (error) {
      throw new Error(`恢复版本失败: ${error.message}`)
    }
  }

  /**
   * 确认并保存最终版本
   * @param {string} novelId - 小说ID
   * @returns {Object} 保存结果
   */
  async confirmNovel(novelId) {
    try {
      const novel = await this.getNovelById(novelId)
      if (!novel) {
        throw new Error(`小说 ${novelId} 不存在`)
      }

      if (novel.status === 'confirmed') {
        throw new Error('小说已经确认过了')
      }

      if (!novel.content || novel.content.length === 0) {
        throw new Error('小说内容为空，无法确认')
      }

      // 更新状态
      novel.status = 'confirmed'
      novel.confirmedAt = new Date().toISOString()
      novel.updatedAt = new Date().toISOString()

      // 保存最终版本
      novel.versions.push({
        id: uuidv4(),
        content: novel.content,
        wordCount: novel.content.length,
        createdAt: novel.confirmedAt,
        type: 'final',
        reason: '最终确认版本'
      })

      await this.saveNovel(novel)

      return {
        success: true,
        confirmedAt: novel.confirmedAt,
        wordCount: novel.content.length
      }

    } catch (error) {
      throw new Error(`确认小说失败: ${error.message}`)
    }
  }

  /**
   * 获取小说详情
   * @param {string} novelId - 小说ID
   * @returns {Object} 小说详情
   */
  async getNovelById(novelId) {
    try {
      const filePath = path.join(this.novelsDir, `${novelId}.json`)
      return await fs.readJson(filePath)
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null
      }
      throw error
    }
  }

  /**
   * 获取小说列表
   * @param {Object} filters - 过滤条件
   * @returns {Array} 小说列表
   */
  async getNovelList(filters = {}) {
    try {
      const files = await fs.readdir(this.novelsDir)
      const novelFiles = files.filter(file => file.endsWith('.json'))

      let novels = []

      for (const file of novelFiles) {
        try {
          const filePath = path.join(this.novelsDir, file)
          const novel = await fs.readJson(filePath)
          novels.push({
            id: novel.id,
            title: novel.title,
            description: novel.description,
            status: novel.status,
            currentWordCount: novel.currentWordCount,
            targetWordCount: novel.targetWordCount,
            createdAt: novel.createdAt,
            updatedAt: novel.updatedAt,
            confirmedAt: novel.confirmedAt
          })
        } catch (error) {
          console.error(`Failed to read novel file ${file}:`, error)
        }
      }

      // 应用过滤条件
      if (filters.status) {
        novels = novels.filter(novel => novel.status === filters.status)
      }

      if (filters.sortBy) {
        novels.sort((a, b) => {
          switch (filters.sortBy) {
            case 'createdAt':
              return new Date(b.createdAt) - new Date(a.createdAt)
            case 'updatedAt':
              return new Date(b.updatedAt) - new Date(a.updatedAt)
            case 'wordCount':
              return b.currentWordCount - a.currentWordCount
            case 'title':
              return a.title.localeCompare(b.title)
            default:
              return 0
          }
        })
      } else {
        // 默认按更新时间排序
        novels.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      }

      return novels

    } catch (error) {
      console.error('Failed to get novel list:', error)
      return []
    }
  }

  /**
   * 删除小说
   * @param {string} novelId - 小说ID
   * @returns {boolean} 是否删除成功
   */
  async deleteNovel(novelId) {
    try {
      const filePath = path.join(this.novelsDir, `${novelId}.json`)
      await fs.remove(filePath)
      return true
    } catch (error) {
      if (error.code === 'ENOENT') {
        return true // 文件不存在也算作删除成功
      }
      throw error
    }
  }

  /**
   * 保存小说到文件
   * @param {Object} novel - 小说对象
   * @returns {boolean} 是否保存成功
   */
  async saveNovel(novel) {
    try {
      const filePath = path.join(this.novelsDir, `${novel.id}.json`)
      await fs.writeJson(filePath, novel, { spaces: 2 })
      return true
    } catch (error) {
      console.error(`Failed to save novel ${novel.id}:`, error)
      return false
    }
  }

  /**
   * 导出小说为文本文件
   * @param {string} novelId - 小说ID
   * @param {string} format - 导出格式
   * @returns {Object} 导出结果
   */
  async exportNovel(novelId, format = 'txt') {
    try {
      const novel = await this.getNovelById(novelId)
      if (!novel) {
        throw new Error(`小说 ${novelId} 不存在`)
      }

      if (!novel.content) {
        throw new Error('小说内容为空，无法导出')
      }

      const exportDir = path.join(this.novelsDir, 'exports')
      await fs.ensureDir(exportDir)

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `${novel.title}_${novelId}_${timestamp}.${format}`
      const filePath = path.join(exportDir, filename)

      let exportContent = ''

      switch (format.toLowerCase()) {
        case 'txt':
          exportContent = this.formatAsTxt(novel)
          break
        case 'md':
          exportContent = this.formatAsMarkdown(novel)
          break
        case 'html':
          exportContent = this.formatAsHtml(novel)
          break
        default:
          throw new Error(`不支持的导出格式: ${format}`)
      }

      await fs.writeFile(filePath, exportContent, 'utf-8')

      return {
        success: true,
        filename,
        filePath,
        format,
        size: Buffer.byteLength(exportContent, 'utf-8')
      }

    } catch (error) {
      throw new Error(`导出小说失败: ${error.message}`)
    }
  }

  /**
   * 格式化为纯文本
   */
  formatAsTxt(novel) {
    return `${novel.title}

${'='.repeat(novel.title.length)}

${novel.description}

${'-' .repeat(50)}

字数: ${novel.content.length}
创建时间: ${novel.createdAt}
更新时间: ${novel.updatedAt}

${'-'.repeat(50)}

${novel.content}`
  }

  /**
   * 格式化为Markdown
   */
  formatAsMarkdown(novel) {
    return `# ${novel.title}

${novel.description}

---

**字数**: ${novel.content.length}
**创建时间**: ${novel.createdAt}
**更新时间**: ${novel.updatedAt}

---

${novel.content.replace(/\n\n/g, '\n\n\n')}`
  }

  /**
   * 格式化为HTML
   */
  formatAsHtml(novel) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${novel.title}</title>
    <style>
        body { font-family: 'Microsoft YaHei', sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .meta { color: #666; margin: 20px 0; }
        .content { white-space: pre-line; text-align: justify; }
    </style>
</head>
<body>
    <h1>${novel.title}</h1>
    <div class="meta">
        <p>${novel.description}</p>
        <p><strong>字数:</strong> ${novel.content.length}</p>
        <p><strong>创建时间:</strong> ${novel.createdAt}</p>
        <p><strong>更新时间:</strong> ${novel.updatedAt}</p>
    </div>
    <hr>
    <div class="content">${novel.content}</div>
</body>
</html>`
  }
}

module.exports = NovelService