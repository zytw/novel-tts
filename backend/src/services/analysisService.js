const AIService = require('./aiService')
const PromptLoader = require('../utils/promptLoader')
const NovelService = require('./novelService')

class AnalysisService {
  constructor() {
    this.aiService = new AIService()
    this.promptLoader = new PromptLoader()
    this.novelService = new NovelService()
  }

  /**
   * 分析小说文本，提取角色信息
   * @param {string} novelId - 小说ID
   * @param {Object} options - 分析选项
   * @returns {Object} 分析结果
   */
  async analyzeNovelCharacters(novelId, options = {}) {
    try {
      const novel = await this.novelService.getNovelById(novelId)
      if (!novel) {
        throw new Error(`小说 ${novelId} 不存在`)
      }

      if (!novel.content || novel.content.length === 0) {
        throw new Error('小说内容为空，无法进行分析')
      }

      const { force = false, modelId } = options

      // 检查是否已有分析结果
      if (!force && novel.characterAnalysis) {
        return {
          success: true,
          analysis: novel.characterAnalysis,
          isCached: true
        }
      }

      // 获取角色分析提示词
      const promptTemplate = await this.promptLoader.getPromptById('character-analysis')
      if (!promptTemplate) {
        throw new Error('角色分析提示词模板不存在')
      }

      // 构建分析prompt
      const analysisPrompt = this.buildAnalysisPrompt(promptTemplate.content, novel.content, novel)

      // 选择AI模型
      const analysisModel = modelId ?
        this.aiService.aiModel.getModelById(modelId) :
        this.aiService.aiModel.getDefaultModel()

      if (!analysisModel) {
        throw new Error('没有可用的AI模型进行分析')
      }

      // 执行分析
      const analysisResult = await this.performCharacterAnalysis(
        analysisModel,
        analysisPrompt,
        novel
      )

      if (analysisResult.success) {
        // 保存分析结果
        await this.saveAnalysisResult(novelId, analysisResult.analysis)

        return {
          success: true,
          analysis: analysisResult.analysis,
          modelUsed: analysisModel.name,
          isCached: false
        }
      } else {
        throw new Error(analysisResult.error)
      }

    } catch (error) {
      console.error('角色分析失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 为角色匹配音色
   * @param {string} novelId - 小说ID
   * @param {Object} analysis - 角色分析结果
   * @param {Object} options - 音色匹配选项
   * @returns {Object} 音色配置结果
   */
  async matchVoiceProfiles(novelId, analysis, options = {}) {
    try {
      const { modelId, customPreferences = {} } = options

      // 获取音色匹配提示词
      const promptTemplate = await this.promptLoader.getPromptById('voice-matching')
      if (!promptTemplate) {
        throw new Error('音色匹配提示词模板不存在')
      }

      // 构建音色匹配prompt
      const voiceMatchPrompt = this.buildVoiceMatchPrompt(
        promptTemplate.content,
        analysis,
        customPreferences
      )

      // 选择AI模型
      const analysisModel = modelId ?
        this.aiService.aiModel.getModelById(modelId) :
        this.aiService.aiModel.getDefaultModel()

      if (!analysisModel) {
        throw new Error('没有可用的AI模型进行音色匹配')
      }

      // 执行音色匹配
      const voiceMatchResult = await this.performVoiceMatching(
        analysisModel,
        voiceMatchPrompt,
        analysis
      )

      if (voiceMatchResult.success) {
        // 保存音色配置结果
        await this.saveVoiceConfiguration(novelId, voiceMatchResult.configuration)

        return {
          success: true,
          configuration: voiceMatchResult.configuration,
          modelUsed: analysisModel.name
        }
      } else {
        throw new Error(voiceMatchResult.error)
      }

    } catch (error) {
      console.error('音色匹配失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 生成TTS脚本
   * @param {string} novelId - 小说ID
   * @param {Object} analysis - 角色分析结果
   * @param {Object} voiceConfig - 音色配置
   * @returns {Object} 生成的脚本
   */
  async generateTTSScript(novelId, analysis, voiceConfig) {
    try {
      const novel = await this.novelService.getNovelById(novelId)
      if (!novel) {
        throw new Error(`小说 ${novelId} 不存在`)
      }

      // 分段处理文本
      const textSegments = this.segmentText(novel.content)

      // 为每个段落分配角色和音色
      const scriptSegments = textSegments.map((segment, index) => {
        return {
          id: `segment_${index}`,
          text: segment.text,
          type: segment.type, // 'dialogue' | 'narration' | 'monologue'
          character: segment.character || 'narrator',
          voiceProfile: this.getVoiceProfile(segment.character, voiceConfig),
          timestamp: this.estimateTimestamp(segment, index),
          emotion: this.detectEmotion(segment.text, segment.character, analysis),
          duration: this.estimateDuration(segment.text)
        }
      })

      // 生成完整脚本
      const script = {
        novelId,
        title: novel.title,
        totalSegments: scriptSegments.length,
        totalDuration: scriptSegments.reduce((sum, seg) => sum + seg.duration, 0),
        characters: analysis.characters || [],
        narrator: analysis.narrator || {},
        voiceConfiguration: voiceConfig,
        segments: scriptSegments,
        metadata: {
          generatedAt: new Date().toISOString(),
          version: '1.0'
        }
      }

      // 保存脚本
      await this.saveTTSScript(novelId, script)

      return {
        success: true,
        script
      }

    } catch (error) {
      console.error('生成TTS脚本失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 构建角色分析prompt
   */
  buildAnalysisPrompt(template, content, novel) {
    let prompt = template

    // 替换占位符
    prompt = prompt.replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 移除控制字符

    return `请分析以下小说内容：

${content}

请按照上述要求进行角色分析，并以JSON格式返回结果。`
  }

  /**
   * 构建音色匹配prompt
   */
  buildVoiceMatchPrompt(template, analysis, preferences) {
    let prompt = template

    // 添加角色分析结果
    const characterInfo = JSON.stringify(analysis, null, 2)

    // 添加用户偏好
    const preferencesInfo = preferences ?
      `\n\n用户音色偏好：\n${JSON.stringify(preferences, null, 2)}` : ''

    return `基于以下角色分析结果进行音色匹配：

${characterInfo}${preferencesInfo}

请按照上述要求为每个角色生成语音配置，并以JSON格式返回结果。`
  }

  /**
   * 执行角色分析
   */
  async performCharacterAnalysis(model, prompt, novel) {
    try {
      // 模拟AI调用 - 在实际环境中这里会调用真实的AI API
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))

      // 生成模拟的分析结果
      const mockAnalysis = this.generateMockCharacterAnalysis(novel.content)

      return {
        success: true,
        analysis: mockAnalysis
      }

    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 执行音色匹配
   */
  async performVoiceMatching(model, prompt, analysis) {
    try {
      // 模拟AI调用
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000))

      // 生成模拟的音色配置
      const mockConfiguration = this.generateMockVoiceConfiguration(analysis)

      return {
        success: true,
        configuration: mockConfiguration
      }

    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 生成模拟的角色分析结果
   */
  generateMockCharacterAnalysis(content) {
    // 基于文本内容进行简单分析
    const hasDialogue = content.includes('"') || content.includes('"')
    const textLength = content.length

    // 提取可能的人名（简单实现）
    const possibleNames = this.extractPossibleNames(content)

    return {
      analysis_summary: {
        total_characters: possibleNames.length + 1, // +1 for narrator
        main_characters: possibleNames.slice(0, 2),
        narrator_type: "third_person_limited",
        story_tone: "neutral"
      },
      characters: possibleNames.map((name, index) => ({
        id: `char_${index + 1}`,
        name: name,
        aliases: [name + "君", name + "兄", name + "姐"].slice(0, 2),
        gender: index % 2 === 0 ? "male" : "female",
        age_range: "young_adult",
        occupation: "unknown",
        personality: this.generatePersonalityTraits(),
        behavior_pattern: {
          social_orientation: Math.random() > 0.5 ? "extroverted" : "introverted",
          decision_style: Math.random() > 0.5 ? "intuitive" : "analytical",
          emotional_expression: Math.random() > 0.5 ? "open" : "reserved"
        },
        dialogue_analysis: {
          dialogue_count: Math.floor(Math.random() * 30) + 10,
          total_words: Math.floor(Math.random() * 500) + 100,
          common_phrases: ["我觉得", "这样不错", "你知道吗"],
          speech_style: "casual",
          emotional_tone: "positive"
        },
        relationships: {
          with_others: {},
          social_status: "equal",
          emotional_attitude: "friendly"
        },
        story_importance: index === 0 ? "protagonist" : "supporting"
      })),
      narrator: {
        type: "third_person_limited",
        identity: "unknown",
        style: {
          language: "objective",
          emotion: "neutral",
          pace: "moderate"
        }
      },
      dialogue_distribution: {
        total_dialogues: Math.floor(Math.random() * 50) + 20,
        character_proportions: this.generateDialogueProportions(possibleNames.length)
      }
    }
  }

  /**
   * 生成模拟的音色配置
   */
  generateMockVoiceConfiguration(analysis) {
    const voiceProfileOptions = {
      tone: ["neutral", "warm", "serious", "cheerful", "gentle"],
      pitch: ["low", "medium", "high"],
      speed: ["slow", "normal", "fast"],
      volume: ["soft", "normal", "loud"],
      emotion: ["neutral", "friendly", "serious", "calm"]
    }

    return {
      voice_configuration: {
        narrator: {
          voice_profile: {
            tone: "neutral",
            pitch: "medium",
            speed: "normal",
            volume: "normal",
            emotion: "calm",
            clarity: "clear"
          },
          special_effects: [],
          description: "中性叙述声音，适合长时间聆听"
        },
        characters: (analysis.characters || []).map((char, index) => ({
          character_id: char.id,
          voice_profile: {
            tone: voiceProfileOptions.tone[Math.floor(Math.random() * voiceProfileOptions.tone.length)],
            pitch: char.gender === "male" ?
              voiceProfileOptions.pitch[Math.floor(Math.random() * 2)] : // low, medium for males
              voiceProfileOptions.pitch[Math.floor(Math.random() * 2) + 1], // medium, high for females
            speed: voiceProfileOptions.speed[Math.floor(Math.random() * voiceProfileOptions.speed.length)],
            volume: voiceProfileOptions.volume[Math.floor(Math.random() * voiceProfileOptions.volume.length)],
            emotion: voiceProfileOptions.emotion[Math.floor(Math.random() * voiceProfileOptions.emotion.length)],
            clarity: "clear"
          },
          special_effects: [
            {
              type: "warmth",
              intensity: "moderate"
            }
          ],
          description: `${char.name}的专属音色配置`
        }))
      },
      voice_mapping_rules: {
        dialogue_vs_narration: {
          dialogue_emphasis: "enhanced",
          narration_emphasis: "neutral"
        },
        emotional_scaling: {
          happy: "pitch_up",
          sad: "pitch_down",
          angry: "volume_up",
          surprised: "speed_up"
        }
      },
      technical_specifications: {
        sample_rate: "22050",
        bit_depth: "16",
        channels: 1,
        format: "wav"
      }
    }
  }

  /**
   * 提取可能的人名
   */
  extractPossibleNames(content) {
    // 简单的人名提取逻辑（实际应用中应该使用更复杂的NLP技术）
    const commonNames = ["张三", "李四", "王五", "赵六", "小明", "小红", "小华", "小丽"]
    const foundNames = []

    commonNames.forEach(name => {
      if (content.includes(name)) {
        foundNames.push(name)
      }
    })

    // 如果没找到，使用一些默认名字
    if (foundNames.length === 0) {
      foundNames.push("张三", "李四")
    }

    return foundNames.slice(0, 4) // 最多4个角色
  }

  /**
   * 生成性格特征
   */
  generatePersonalityTraits() {
    const traits = ["outgoing", "optimistic", "curious", "serious", "gentle", "brave", "calm", "humorous"]
    const selected = []

    // 随机选择3-5个特征
    const count = Math.floor(Math.random() * 3) + 3
    for (let i = 0; i < count; i++) {
      const trait = traits[Math.floor(Math.random() * traits.length)]
      if (!selected.includes(trait)) {
        selected.push(trait)
      }
    }

    return selected
  }

  /**
   * 生成对话比例
   */
  generateDialogueProportions(characterCount) {
    const proportions = []
    let remaining = 1.0

    for (let i = 0; i < characterCount; i++) {
      const proportion = i === characterCount - 1 ?
        remaining :
        Math.random() * remaining * 0.6 + 0.2 // 20%-80% of remaining

      proportions.push(proportion)
      remaining -= proportion
    }

    return proportions
  }

  /**
   * 分段处理文本
   */
  segmentText(content) {
    const segments = []
    const paragraphBoundaries = content.match(/[^\n]+(\n|$)/g) || []

    paragraphBoundaries.forEach((paragraph, index) => {
      const text = paragraph.trim()
      if (text.length === 0) return

      // 简单的对话检测
      const isDialogue = text.includes('"') || text.includes('"') || text.includes('"')
      const isMonologue = text.includes('我想') || text.includes('我觉得')

      let character = 'narrator'
      let type = 'narration'

      if (isDialogue) {
        // 提取说话者（简单实现）
        const matches = text.match(/[""](.+?)[""]说/g)
        if (matches && matches.length > 0) {
          const speakerMatch = matches[0].match(/[""](.+?)[""]说/)
          if (speakerMatch) {
            character = speakerMatch[1]
          }
        }
        type = 'dialogue'
      } else if (isMonologue) {
        type = 'monologue'
        character = 'main_character'
      }

      segments.push({
        id: `segment_${index}`,
        text: text,
        type: type,
        character: character,
        wordCount: text.length
      })
    })

    return segments
  }

  /**
   * 获取角色音色配置
   */
  getVoiceProfile(character, voiceConfig) {
    if (!voiceConfig || !voiceConfig.voice_configuration) {
      return this.getDefaultNarratorProfile()
    }

    const narratorProfile = voiceConfig.voice_configuration.narrator
    const characterProfiles = voiceConfig.voice_configuration.characters || []

    if (character === 'narrator' || !character) {
      return narratorProfile.voice_profile
    }

    const charProfile = characterProfiles.find(char =>
      char.character_name === character ||
      character.includes(char.character_name) ||
      char.character_name.includes(character)
    )

    return charProfile ? charProfile.voice_profile : narratorProfile.voice_profile
  }

  /**
   * 获取默认叙述者配置
   */
  getDefaultNarratorProfile() {
    return {
      tone: "neutral",
      pitch: "medium",
      speed: "normal",
      volume: "normal",
      emotion: "calm",
      clarity: "clear"
    }
  }

  /**
   * 估算时间戳
   */
  estimateTimestamp(segment, index) {
    // 假设每段平均5秒，累计计算
    return index * 5.0
  }

  /**
   * 检测情感
   */
  detectEmotion(text, character, analysis) {
    // 简单的情感检测逻辑
    const emotionKeywords = {
      happy: ["高兴", "快乐", "愉快", "开心", "笑"],
      sad: ["悲伤", "难过", "伤心", "哭", "流泪"],
      angry: ["生气", "愤怒", "恼火", "骂", "吼"],
      surprised: ["惊讶", "意外", "震惊", "不敢相信"],
      fear: ["害怕", "恐惧", "担心", "紧张", "害怕"]
    }

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return emotion
      }
    }

    return "neutral"
  }

  /**
   * 估算时长
   */
  estimateDuration(text) {
    // 假设每分钟200字，转换为秒
    return (text.length / 200) * 60
  }

  /**
   * 保存分析结果
   */
  async saveAnalysisResult(novelId, analysis) {
    const novel = await this.novelService.getNovelById(novelId)
    if (novel) {
      novel.characterAnalysis = analysis
      novel.analysisStatus = 'completed'
      novel.analyzedAt = new Date().toISOString()
      await this.novelService.saveNovel(novel)
    }
  }

  /**
   * 保存音色配置
   */
  async saveVoiceConfiguration(novelId, configuration) {
    const novel = await this.novelService.getNovelById(novelId)
    if (novel) {
      novel.voiceConfiguration = configuration
      novel.voiceConfigStatus = 'completed'
      novel.voiceConfiguredAt = new Date().toISOString()
      await this.novelService.saveNovel(novel)
    }
  }

  /**
   * 保存TTS脚本
   */
  async saveTTSScript(novelId, script) {
    const novel = await this.novelService.getNovelById(novelId)
    if (novel) {
      novel.ttsScript = script
      novel.scriptStatus = 'completed'
      novel.scriptGeneratedAt = new Date().toISOString()
      await this.novelService.saveNovel(novel)
    }
  }
}

module.exports = AnalysisService