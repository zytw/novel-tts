const fs = require('fs-extra')
const path = require('path')

class PromptLoader {
  constructor() {
    this.promptsDir = path.join(__dirname, '../../../prompts')
    this.cache = new Map()
    this.lastModified = new Map()
  }

  /**
   * 获取所有可用的prompt模板
   * @returns {Array} 模板列表
   */
  async getAllPrompts() {
    try {
      const files = await fs.readdir(this.promptsDir)
      const promptFiles = files.filter(file => file.endsWith('.txt'))

      const prompts = []

      for (const file of promptFiles) {
        const filePath = path.join(this.promptsDir, file)
        const stats = await fs.stat(filePath)

        // 检查缓存是否有效
        const lastModified = stats.mtime.getTime()
        const cacheKey = file

        if (this.cache.has(cacheKey) && this.lastModified.get(cacheKey) === lastModified) {
          prompts.push(this.cache.get(cacheKey))
          continue
        }

        try {
          const content = await fs.readFile(filePath, 'utf-8')
          const prompt = this.parsePromptFile(file, content)

          // 缓存结果
          this.cache.set(cacheKey, prompt)
          this.lastModified.set(cacheKey, lastModified)

          prompts.push(prompt)
        } catch (error) {
          console.error(`Failed to read prompt file ${file}:`, error)
        }
      }

      return prompts
    } catch (error) {
      console.error('Failed to load prompts:', error)
      return []
    }
  }

  /**
   * 根据ID获取特定prompt模板
   * @param {string} promptId - 模板ID
   * @returns {Object|null} 模板对象或null
   */
  async getPromptById(promptId) {
    const prompts = await this.getAllPrompts()
    return prompts.find(prompt => prompt.id === promptId) || null
  }

  /**
   * 根据分类获取prompt模板
   * @param {string} category - 分类名称
   * @returns {Array} 模板列表
   */
  async getPromptsByCategory(category) {
    const prompts = await this.getAllPrompts()
    return prompts.filter(prompt => prompt.category === category)
  }

  /**
   * 解析prompt文件内容
   * @param {string} filename - 文件名
   * @param {string} content - 文件内容
   * @returns {Object} 解析后的prompt对象
   */
  parsePromptFile(filename, content) {
    // 提取文件名作为标题
    const baseName = path.basename(filename, '.txt')
    const title = this.formatTitle(baseName)

    // 解析分类
    const category = this.extractCategory(baseName, content)

    // 解析描述
    const description = this.extractDescription(content)

    // 解析参数
    const parameters = this.extractParameters(content)

    // 解析标签
    const tags = this.extractTags(content, baseName)

    return {
      id: this.generateId(baseName),
      filename,
      title,
      category,
      description,
      content: content.trim(),
      parameters,
      tags,
      wordCount: content.length,
      createdAt: new Date().toISOString()
    }
  }

  /**
   * 格式化标题
   * @param {string} baseName - 基础文件名
   * @returns {string} 格式化后的标题
   */
  formatTitle(baseName) {
    // 移除文件扩展名并美化
    const nameMap = {
      'ai xiaoshuo': 'AI小说创作',
      'qinggan xiaoshuo': '情感小说创作',
      'general writing tone': '通用写作风格',
      'my writing editor': '写作编辑助手',
      'essay audit': '文章审核',
      'old article writing': '经典文章创作'
    }

    return nameMap[baseName.toLowerCase()] || baseName
  }

  /**
   * 提取分类
   * @param {string} filename - 文件名
   * @param {string} content - 文件内容
   * @returns {string} 分类名称
   */
  extractCategory(filename, content) {
    const nameLower = filename.toLowerCase()

    if (nameLower.includes('xiaoshuo') || nameLower.includes('小说')) {
      if (nameLower.includes('qinggan') || nameLower.includes('情感')) {
        return '情感小说'
      } else if (nameLower.includes('ai')) {
        return 'AI小说'
      }
      return '小说创作'
    }

    if (nameLower.includes('writing') || nameLower.includes('写作')) {
      if (nameLower.includes('general')) {
        return '通用写作'
      } else if (nameLower.includes('editor')) {
        return '编辑工具'
      } else if (nameLower.includes('old') || nameLower.includes('经典')) {
        return '经典创作'
      }
      return '写作工具'
    }

    if (nameLower.includes('audit') || nameLower.includes('审核')) {
      return '内容审核'
    }

    return '其他'
  }

  /**
   * 提取描述
   * @param {string} content - 文件内容
   * @returns {string} 描述文本
   */
  extractDescription(content) {
    // 寻找第一段非标题的内容作为描述
    const lines = content.split('\n').filter(line => line.trim())

    for (const line of lines) {
      // 跳过标题行
      if (line.startsWith('#') || line.startsWith('##')) {
        continue
      }

      // 跳过太短的行
      if (line.trim().length < 10) {
        continue
      }

      // 清理markdown格式
      const cleanLine = line
        .replace(/\*\*(.*?)\*\*/g, '$1') // 移除加粗
        .replace(/\*(.*?)\*/g, '$1')     // 移除斜体
        .replace(/`(.*?)`/g, '$1')       // 移除代码
        .replace(/^[-*+]\s+/g, '')       // 移除列表标记
        .trim()

      if (cleanLine.length > 10) {
        return cleanLine.length > 200 ? cleanLine.substring(0, 200) + '...' : cleanLine
      }
    }

    return '专业的创作模板，帮助生成高质量内容'
  }

  /**
   * 提取参数
   * @param {string} content - 文件内容
   * @returns {Array} 参数列表
   */
  extractParameters(content) {
    const parameters = []

    // 寻找方括号中的参数
    const matches = content.match(/\[([^\]]+)\]/g)
    if (matches) {
      const uniqueParams = [...new Set(matches)]
      uniqueParams.forEach(param => {
        const cleanParam = param.slice(1, -1) // 移除方括号
        if (!parameters.find(p => p.name === cleanParam)) {
          parameters.push({
            name: cleanParam,
            type: this.inferParameterType(cleanParam),
            required: this.isRequiredParameter(cleanParam),
            description: this.getParameterDescription(cleanParam, content)
          })
        }
      })
    }

    return parameters
  }

  /**
   * 推断参数类型
   * @param {string} paramName - 参数名称
   * @returns {string} 参数类型
   */
  inferParameterType(paramName) {
    const nameLower = paramName.toLowerCase()

    if (nameLower.includes('字数') || nameLower.includes('word') || nameLower.includes('length')) {
      return 'number'
    }

    if (nameLower.includes('年龄') || nameLower.includes('数量') || nameLower.includes('级别')) {
      return 'number'
    }

    if (nameLower.includes('是') || nameLower.includes('否') || nameLower.includes('是否')) {
      return 'boolean'
    }

    return 'text'
  }

  /**
   * 判断参数是否必需
   * @param {string} paramName - 参数名称
   * @returns {boolean} 是否必需
   */
  isRequiredParameter(paramName) {
    const requiredParams = ['角色姓名', '具体年龄', '详细职业描述', '字数', '当前优化重点']
    return requiredParams.includes(paramName)
  }

  /**
   * 获取参数描述
   * @param {string} paramName - 参数名称
   * @param {string} content - 文件内容
   * @returns {string} 参数描述
   */
  getParameterDescription(paramName, content) {
    const descriptions = {
      '角色姓名': '小说主角的姓名',
      '具体年龄': '角色的准确年龄',
      '详细职业描述': '角色的职业背景和详细信息',
      '字数': '生成内容的字数要求',
      '当前优化重点': '本轮写作的主要优化方向',
      '目标情绪': '希望读者感受到的情感',
      '强度': '情绪的强度等级(1-10)',
      '具体性格特征': '角色的性格特点',
      '具体表现方式': '角色表现性格的具体方式'
    }

    return descriptions[paramName] || '请填写具体内容'
  }

  /**
   * 提取标签
   * @param {string} content - 文件内容
   * @param {string} filename - 文件名
   * @returns {Array} 标签列表
   */
  extractTags(content, filename) {
    const tags = []
    const nameLower = filename.toLowerCase()
    const contentLower = content.toLowerCase()

    // 基于文件名添加标签
    if (nameLower.includes('xiaoshuo') || nameLower.includes('小说')) {
      tags.push('小说', '创作')
      if (nameLower.includes('qinggan') || nameLower.includes('情感')) {
        tags.push('情感', '现代')
      }
      if (nameLower.includes('ai')) {
        tags.push('AI', '智能')
      }
    }

    // 基于内容添加标签
    if (contentLower.includes('心理描写') || contentLower.includes('心理活动')) {
      tags.push('心理描写')
    }
    if (contentLower.includes('对话') || contentLower.includes('交流')) {
      tags.push('对话')
    }
    if (contentLower.includes('环境') || contentLower.includes('场景')) {
      tags.push('环境描写')
    }
    if (contentLower.includes('人物') || contentLower.includes('角色')) {
      tags.push('人物塑造')
    }

    return [...new Set(tags)] // 去重
  }

  /**
   * 生成唯一ID
   * @param {string} baseName - 基础名称
   * @returns {string} 唯一ID
   */
  generateId(baseName) {
    return baseName
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear()
    this.lastModified.clear()
  }

  /**
   * 重新加载所有模板
   * @returns {Array} 重新加载的模板列表
   */
  async reloadPrompts() {
    this.clearCache()
    return await this.getAllPrompts()
  }
}

module.exports = PromptLoader