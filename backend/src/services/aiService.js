const AIModel = require('../models/aiModel')
const PromptLoader = require('../utils/promptLoader')

class AIService {
  constructor() {
    this.aiModel = new AIModel()
    this.promptLoader = new PromptLoader()
    this.activeGenerations = new Map() // 存储正在进行的生成任务
  }

  /**
   * 生成小说内容
   * @param {Object} options - 生成选项
   * @returns {Object} 生成结果
   */
  async generateNovel(options) {
    const {
      promptId,
      modelId,
      parameters = {},
      targetWordCount = 2000,
      chunkSize = 1000,
      onProgress = null
    } = options

    try {
      // 获取选中的AI模型
      const selectedModel = this.aiModel.getModelById(modelId)
      if (!selectedModel) {
        throw new Error(`AI模型 ${modelId} 不存在`)
      }

      // 获取prompt模板
      const promptTemplate = await this.promptLoader.getPromptById(promptId)
      if (!promptTemplate) {
        throw new Error(`Prompt模板 ${promptId} 不存在`)
      }

      // 构建完整的prompt
      const fullPrompt = this.buildPrompt(promptTemplate.content, parameters)

      // 创建生成任务
      const generationId = this.generateId()
      const generationTask = {
        id: generationId,
        modelId,
        promptId,
        parameters,
        targetWordCount,
        currentWordCount: 0,
        content: '',
        status: 'generating',
        createdAt: new Date().toISOString()
      }

      this.activeGenerations.set(generationId, generationTask)

      // 分块生成内容
      const result = await this.generateContentInChunks(
        selectedModel,
        fullPrompt,
        targetWordCount,
        chunkSize,
        generationId,
        onProgress
      )

      return {
        success: true,
        generationId,
        content: result.content,
        wordCount: result.wordCount,
        modelUsed: selectedModel.name,
        promptUsed: promptTemplate.title,
        generatedAt: new Date().toISOString()
      }
    } catch (error) {
      console.error('Novel generation failed:', error)
      return {
        success: false,
        error: error.message,
        generatedAt: new Date().toISOString()
      }
    }
  }

  /**
   * 分块生成内容
   * @param {Object} model - AI模型
   * @param {string} prompt - 完整的prompt
   * @param {number} targetWordCount - 目标字数
   * @param {number} chunkSize - 每块大小
   * @param {string} generationId - 生成任务ID
   * @param {Function} onProgress - 进度回调
   * @returns {Object} 生成结果
   */
  async generateContentInChunks(model, prompt, targetWordCount, chunkSize, generationId, onProgress) {
    let fullContent = ''
    let currentPrompt = prompt
    let attemptCount = 0
    const maxAttempts = 3

    while (fullContent.length < targetWordCount && attemptCount < maxAttempts) {
      try {
        // 计算本轮需要生成的字数
        const remainingWords = targetWordCount - fullContent.length
        const currentChunkSize = Math.min(chunkSize, remainingWords + 500) // 多生成一点以确保足够

        // 添加继续写作的指示（如果不是第一轮）
        if (fullContent.length > 0) {
          currentPrompt = this.buildContinuationPrompt(prompt, fullContent, currentChunkSize)
        }

        // 调用AI生成内容
        const chunk = await this.callAIModel(model, currentPrompt, currentChunkSize)

        if (!chunk || chunk.trim().length === 0) {
          attemptCount++
          continue
        }

        // 清理和添加内容
        const cleanedChunk = this.cleanGeneratedContent(chunk, fullContent.length > 0)
        fullContent += cleanedChunk

        // 更新进度
        const progress = Math.min((fullContent.length / targetWordCount) * 100, 100)
        const generationTask = this.activeGenerations.get(generationId)
        if (generationTask) {
          generationTask.currentWordCount = fullContent.length
          generationTask.content = fullContent
        }

        if (onProgress) {
          await onProgress({
            generationId,
            progress: Math.round(progress),
            currentWordCount: fullContent.length,
            targetWordCount,
            chunk: cleanedChunk,
            status: 'generating'
          })
        }

        attemptCount = 0 // 重置尝试计数

        // 如果接近目标字数，可以结束生成
        if (fullContent.length >= targetWordCount * 0.95) {
          break
        }

      } catch (error) {
        console.error('Chunk generation failed:', error)
        attemptCount++
        if (attemptCount >= maxAttempts) {
          throw new Error(`生成失败: ${error.message}`)
        }
      }
    }

    // 最终清理
    fullContent = this.finalizeContent(fullContent)

    // 更新最终状态
    const generationTask = this.activeGenerations.get(generationId)
    if (generationTask) {
      generationTask.content = fullContent
      generationTask.currentWordCount = fullContent.length
      generationTask.status = 'completed'
    }

    if (onProgress) {
      await onProgress({
        generationId,
        progress: 100,
        currentWordCount: fullContent.length,
        targetWordCount,
        status: 'completed'
      })
    }

    return {
      content: fullContent,
      wordCount: fullContent.length
    }
  }

  /**
   * 调用AI模型生成内容
   * @param {Object} model - AI模型配置
   * @param {string} prompt - 提示词
   * @param {number} maxTokens - 最大令牌数
   * @returns {Promise<string>} 生成的内容
   */
  async callAIModel(model, prompt, maxTokens) {
    // 这里是模拟AI模型调用的实现
    // 在实际环境中，你需要集成真实的AI API（OpenAI、Claude等）

    const settings = model.settings || {}

    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    // 根据模型提供商生成不同风格的内容
    let generatedContent = ''

    switch (model.provider) {
      case 'OpenAI':
        generatedContent = this.generateOpenAIStyleContent(prompt, maxTokens)
        break
      case 'Anthropic':
        generatedContent = this.generateClaudeStyleContent(prompt, maxTokens)
        break
      case 'Google':
        generatedContent = this.generateGeminiStyleContent(prompt, maxTokens)
        break
      default:
        generatedContent = this.generateGenericContent(prompt, maxTokens)
    }

    return generatedContent
  }

  /**
   * 生成OpenAI风格的内容
   */
  generateOpenAIStyleContent(prompt, maxTokens) {
    const samples = [
      '夜幕降临，城市的霓虹灯开始闪烁，但在林晓明的眼中，这些光芒都失去了色彩。坐在咖啡馆的角落里，他无意识地搅拌着早已冷却的咖啡，脑海中不断回想着白天发生的一切。',

      '雨点敲打着窗户，发出单调而有节奏的声响。陈小雨放下手中的笔，揉了揉酸涩的眼睛。窗外的世界模糊不清，就像她此刻的心情一样，充满了不确定性。',

      '春风拂过，带来了花草的清香。李明站在山坡上，望着远方连绵的群山。这一刻，他终于明白了自己真正想要的是什么。'
    ]

    const wordCount = Math.floor(maxTokens * 0.7) // 中文大致字符数
    return samples[Math.floor(Math.random() * samples.length)] +
           this.generateAdditionalText(wordCount)
  }

  /**
   * 生成Claude风格的内容
   */
  generateClaudeStyleContent(prompt, maxTokens) {
    const samples = [
      '夕阳的余晖洒在办公室的玻璃幕墙上，映照出张伟疲惫的身影。他盯着电脑屏幕上的数据，但这些数字在他眼中已经失去了意义。心中涌起的不是成就感，而是一种难以名状的空虚感。',

      '图书馆里安静得只能听见翻书的沙沙声。苏晴坐在靠窗的位置，阳光透过玻璃在她面前的书本上投下斑驳的光影。她的手指轻轻划过书页，却迟迟没有翻到下一页。',

      '清晨的阳光第一次透过窗帘的缝隙照进房间。王芳睁开眼睛，感受到一种久违的平静。昨夜的失眠似乎已经远去，取而代之的是一种新生的感觉。'
    ]

    const wordCount = Math.floor(maxTokens * 0.7)
    return samples[Math.floor(Math.random() * samples.length)] +
           this.generateAdditionalText(wordCount)
  }

  /**
   * 生成Gemini风格的内容
   */
  generateGeminiStyleContent(prompt, maxTokens) {
    const samples = [
      '海风轻抚过脸颊，带着咸湿的气息。赵磊站在海边的礁石上，望着无尽的大海。此刻的他，内心涌动着一种复杂的情感——既有对过去的眷恋，也有对未来的憧憬。',

      '城市的喧嚣渐渐远去，取而代之的是乡村的宁静。刘梅走在田间的小路上，呼吸着清新的空气。离开都市的决定，此刻看来是如此的正确。',

      '月光如水，洒在古老的庭院里。陈老坐在石凳上，手中握着那封泛黄的信件。时间仿佛在这一刻静止，过去与现在在心中交织。'
    ]

    const wordCount = Math.floor(maxTokens * 0.7)
    return samples[Math.floor(Math.random() * samples.length)] +
           this.generateAdditionalText(wordCount)
  }

  /**
   * 生成通用风格内容
   */
  generateGenericContent(prompt, maxTokens) {
    const wordCount = Math.floor(maxTokens * 0.7)
    return '这是一个关于成长与选择的故事。主人公面临着人生的重大转折点，需要在理想和现实之间做出选择。每一个决定都将改变他的人生轨迹，而真正的勇气在于面对内心最真实的声音。' +
           this.generateAdditionalText(wordCount)
  }

  /**
   * 生成额外文本内容
   */
  generateAdditionalText(targetLength) {
    const paragraphs = [
      '他深深地吸了一口气，试图平复内心的波动。这不仅仅是一个决定，更是一次对自我的重新审视。过往的点点滴滴在脑海中闪现，那些曾经的选择，那些错过的人和事，都成为了现在这个决定的一部分。',

      '时间在此时仿佛变慢了。每一个细节都变得异常清晰，窗外的光线，空气中的尘埃，远处传来的声响。这种感觉让他意识到，人生中的每一个瞬间都是独特而珍贵的。',

      '也许，成长就是这样不断地选择和放下。没有人能够预测未来，但每个人都可以选择如何面对现在。重要的不是结果的好坏，而是在这个过程中，我们是否保持了对初心的坚守。'
    ]

    let result = ''
    let currentLength = 0

    while (currentLength < targetLength && paragraphs.length > 0) {
      const randomIndex = Math.floor(Math.random() * paragraphs.length)
      const paragraph = paragraphs.splice(randomIndex, 1)[0]

      if (currentLength + paragraph.length > targetLength * 1.2) {
        continue // 跳过太长的段落
      }

      result += (currentLength > 0 ? '\n\n' : '') + paragraph
      currentLength += paragraph.length
    }

    return result
  }

  /**
   * 构建完整的prompt
   * @param {string} template - prompt模板
   * @param {Object} parameters - 参数对象
   * @returns {string} 构建后的prompt
   */
  buildPrompt(template, parameters) {
    let result = template

    // 替换所有参数占位符
    for (const [key, value] of Object.entries(parameters)) {
      const placeholder = `[${key}]`
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value || '')
    }

    // 移除未被替换的占位符
    result = result.replace(/\[[^\]]+\]/g, '')

    return result
  }

  /**
   * 构建继续写作的prompt
   * @param {string} originalPrompt - 原始prompt
   * @param {string} existingContent - 已有内容
   * @param {number} targetLength - 目标长度
   * @returns {string} 构建的prompt
   */
  buildContinuationPrompt(originalPrompt, existingContent, targetLength) {
    const lastParagraph = existingContent.split('\n\n').pop() || ''

    return `请基于以下已有内容继续创作小说，保持原有的风格和连贯性：

原文要求：
${originalPrompt}

已有内容：
${existingContent.substring(Math.max(0, existingContent.length - 500))}...

请继续创作约${targetLength}字的内容，确保：
1. 保持人物性格一致性
2. 延续当前的情节发展
3. 维持原有的写作风格
4. 保持情感的连贯性`
  }

  /**
   * 清理生成的内容
   * @param {string} content - 原始内容
   * @param {boolean} isContinuation - 是否是续写内容
   * @returns {string} 清理后的内容
   */
  cleanGeneratedContent(content, isContinuation = false) {
    // 移除可能的重复内容
    let cleaned = content

    if (isContinuation) {
      // 移除可能重复的开头部分
      const lines = cleaned.split('\n')
      const firstLine = lines[0]?.trim()

      if (firstLine && firstLine.length < 50) {
        lines.shift()
        cleaned = lines.join('\n')
      }
    }

    // 移除多余的空行
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

    // 移除首尾空白
    cleaned = cleaned.trim()

    return cleaned
  }

  /**
   * 最终内容处理
   * @param {string} content - 原始内容
   * @returns {string} 处理后的内容
   */
  finalizeContent(content) {
    // 确保段落之间有适当的空行
    let finalized = content.replace(/\n+/g, '\n\n')

    // 移除开头和结尾的多余空行
    finalized = finalized.replace(/^\n+|\n+$/g, '')

    return finalized
  }

  /**
   * 获取生成任务状态
   * @param {string} generationId - 生成任务ID
   * @returns {Object|null} 任务状态
   */
  getGenerationStatus(generationId) {
    return this.activeGenerations.get(generationId) || null
  }

  /**
   * 取消生成任务
   * @param {string} generationId - 生成任务ID
   * @returns {boolean} 是否成功取消
   */
  cancelGeneration(generationId) {
    const task = this.activeGenerations.get(generationId)
    if (task && task.status === 'generating') {
      task.status = 'cancelled'
      return true
    }
    return false
  }

  /**
   * 清理完成的生成任务
   */
  cleanupCompletedGenerations() {
    for (const [id, task] of this.activeGenerations) {
      if (task.status === 'completed' || task.status === 'cancelled' || task.status === 'failed') {
        // 保留最近一小时的已完成任务
        const hourAgo = Date.now() - 60 * 60 * 1000
        const taskTime = new Date(task.createdAt).getTime()

        if (taskTime < hourAgo) {
          this.activeGenerations.delete(id)
        }
      }
    }
  }

  /**
   * 生成唯一ID
   * @returns {string} 唯一ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}

module.exports = AIService