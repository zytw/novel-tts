const fs = require('fs').promises
const path = require('path')
const { spawn } = require('child_process')
const crypto = require('crypto')

class TTSService {
  constructor() {
    this.outputDir = path.join(process.cwd(), 'data', 'audio')
    this.tempDir = path.join(process.cwd(), 'data', 'temp')
    this.pythonPath = 'python'
    this.indexTTSPath = null // 将在初始化时设置
    this.isInitialized = false
  }

  /**
   * 初始化TTS服务
   */
  async initialize() {
    try {
      // 确保输出目录存在
      await this.ensureDirectory(this.outputDir)
      await this.ensureDirectory(this.tempDir)

      // 检查Python环境
      await this.checkPythonEnvironment()

      this.isInitialized = true
      console.log('TTS服务初始化成功')
    } catch (error) {
      console.error('TTS服务初始化失败:', error)
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
   * 检查Python环境和依赖
   */
  async checkPythonEnvironment() {
    return new Promise((resolve, reject) => {
      const checkCmd = spawn('python', ['--version'], { shell: true })
      checkCmd.on('close', (code) => {
        if (code === 0) {
          console.log('Python环境检查通过')
          resolve()
        } else {
          reject(new Error('Python环境未找到'))
        }
      })
      checkCmd.on('error', (error) => {
        reject(new Error(`Python环境检查失败: ${error.message}`))
      })
    })
  }

  /**
   * 根据角色分析结果生成语音
   */
  async generateSpeechForSegment(segment, voiceConfig, outputDir) {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      const segmentId = segment.id || crypto.randomUUID()
      const outputFileName = `${segmentId}.wav`
      const outputPath = path.join(outputDir || this.outputDir, outputFileName)

      // 获取角色的音色配置
      const characterVoice = this.getCharacterVoiceConfig(segment.character, voiceConfig)

      // 构建TTS参数
      const ttsParams = {
        text: segment.text,
        output_path: outputPath,
        spk_audio_prompt: characterVoice.referenceAudio,
        emo_alpha: characterVoice.emotionAlpha || 0.8,
        use_emo_text: !!characterVoice.emotionText,
        emo_text: characterVoice.emotionText || this.generateEmotionText(segment),
        use_random: false,
        use_fp16: true, // 使用半精度以节省内存
        verbose: true
      }

      // 如果有情感向量，使用情感向量模式
      if (characterVoice.emotionVector) {
        ttsParams.emo_vector = characterVoice.emotionVector
        ttsParams.use_emo_text = false
        delete ttsParams.emo_text
      }

      // 调用TTS模型
      await this.callIndexTTS(ttsParams)

      return {
        segmentId,
        outputPath,
        duration: segment.duration || 0,
        character: segment.character,
        status: 'completed'
      }
    } catch (error) {
      console.error(`语音生成失败 - 段落 ${segment.id}:`, error)
      throw error
    }
  }

  /**
   * 批量生成语音
   */
  async generateSpeechBatch(segments, voiceConfig, outputDir) {
    const results = []
    const totalSegments = segments.length

    console.log(`开始批量生成语音，共 ${totalSegments} 个段落`)

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]

      try {
        console.log(`生成语音段落 ${i + 1}/${totalSegments}: ${segment.id}`)
        const result = await this.generateSpeechForSegment(segment, voiceConfig, outputDir)
        results.push(result)

        // 进度回调
        if (this.onProgress) {
          this.onProgress({
            current: i + 1,
            total: totalSegments,
            percentage: Math.round(((i + 1) / totalSegments) * 100),
            currentSegment: segment.id,
            status: 'processing'
          })
        }
      } catch (error) {
        console.error(`段落 ${segment.id} 生成失败:`, error)
        results.push({
          segmentId: segment.id,
          error: error.message,
          status: 'failed'
        })
      }
    }

    return results
  }

  /**
   * 获取角色音色配置
   */
  getCharacterVoiceConfig(characterName, voiceConfig) {
    // 叙述者配置
    if (characterName === 'narrator' || !characterName) {
      return {
        referenceAudio: voiceConfig.narrator?.referenceAudio || this.getDefaultNarratorAudio(),
        emotionAlpha: 0.3,
        emotionText: '平静叙述',
        emotionVector: [0, 0, 0, 0, 0, 0, 0, 1] // [happy, angry, sad, afraid, disgusted, melancholic, surprised, calm]
      }
    }

    // 查找角色配置
    const characterConfig = voiceConfig.characters?.find(
      char => char.character_id === characterName || char.character_name === characterName
    )

    if (characterConfig) {
      const voiceProfile = characterConfig.voice_profile

      // 将voiceProfile转换为INDEX-TTS参数
      return {
        referenceAudio: characterConfig.referenceAudio || this.getDefaultCharacterAudio(),
        emotionAlpha: this.getEmotionAlpha(voiceProfile.emotion),
        emotionText: this.generateEmotionTextFromProfile(voiceProfile),
        emotionVector: this.getEmotionVector(voiceProfile.emotion)
      }
    }

    // 默认角色配置
    return {
      referenceAudio: this.getDefaultCharacterAudio(),
      emotionAlpha: 0.6,
      emotionText: '中性',
      emotionVector: [0, 0, 0, 0, 0, 0, 0, 1]
    }
  }

  /**
   * 将情感转换为情感向量
   */
  getEmotionVector(emotion) {
    const emotionMap = {
      neutral: [0, 0, 0, 0, 0, 0, 0, 1],
      happy: [1, 0, 0, 0, 0, 0, 0.3, 0.7],
      angry: [0, 1, 0, 0.5, 0.3, 0, 0, 0],
      sad: [0, 0, 1, 0.3, 0, 0.7, 0, 0],
      surprised: [0.3, 0, 0, 0.8, 0, 0, 1, 0],
      fear: [0, 0.2, 0.3, 1, 0.5, 0.2, 0.5, 0],
      calm: [0, 0, 0, 0, 0, 0, 0, 1],
      friendly: [0.5, 0, 0, 0, 0, 0, 0.2, 0.8],
      serious: [0, 0.2, 0, 0, 0, 0.1, 0, 0.9]
    }

    return emotionMap[emotion] || emotionMap.neutral
  }

  /**
   * 获取情感强度参数
   */
  getEmotionAlpha(emotion) {
    const alphaMap = {
      neutral: 0.3,
      calm: 0.4,
      happy: 0.7,
      angry: 0.8,
      sad: 0.8,
      surprised: 0.7,
      fear: 0.9,
      serious: 0.5,
      friendly: 0.6
    }

    return alphaMap[emotion] || 0.6
  }

  /**
   * 根据音色配置生成情感文本
   */
  generateEmotionTextFromProfile(voiceProfile) {
    const emotion = voiceProfile.emotion || 'neutral'
    const tone = voiceProfile.tone || 'neutral'

    // 组合音色和情感
    if (emotion === 'neutral') {
      return `${tone}的语气`
    }

    return `${emotion}的情感，${tone}的语气`
  }

  /**
   * 从段落文本生成情感文本
   */
  generateEmotionText(segment) {
    const emotion = segment.emotion || 'neutral'
    const type = segment.type || 'narration'

    if (type === 'dialogue') {
      return `对话中的${emotion}情感`
    }

    return `叙述中的${emotion}情感`
  }

  /**
   * 调用INDEX-TTS模型
   */
  async callIndexTTS(params) {
    return new Promise((resolve, reject) => {
      // 创建临时的Python脚本
      const pythonScript = this.generatePythonScript(params)
      const scriptPath = path.join(this.tempDir, `tts_${Date.now()}.py`)

      // 写入Python脚本
      fs.writeFile(scriptPath, pythonScript)
        .then(() => {
          // 执行Python脚本
          const pythonProcess = spawn('python', [scriptPath], {
            shell: true,
            cwd: process.cwd()
          })

          let stdout = ''
          let stderr = ''

          pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString()
          })

          pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString()
          })

          pythonProcess.on('close', (code) => {
            // 清理临时文件
            fs.unlink(scriptPath).catch(() => {})

            if (code === 0) {
              resolve({ stdout, stderr })
            } else {
              reject(new Error(`TTS生成失败 (退出码: ${code}): ${stderr}`))
            }
          })

          pythonProcess.on('error', (error) => {
            // 清理临时文件
            fs.unlink(scriptPath).catch(() => {})
            reject(new Error(`执行TTS脚本失败: ${error.message}`))
          })
        })
        .catch(reject)
    })
  }

  /**
   * 生成INDEX-TTS Python调用脚本
   */
  generatePythonScript(params) {
    return `
import sys
import os

try:
    # 模拟INDEX-TTS调用（实际项目中需要真实的INDEX-TTS环境）
    print(f"开始生成语音: {params.text[:50]}...")

    # 模拟语音生成过程
    import time
    time.sleep(1)  # 模拟处理时间

    # 创建输出文件（模拟）
    os.makedirs(os.path.dirname(r"${params.output_path}"), exist_ok=True)

    # 这里应该是真实的INDEX-TTS调用代码
    # from indextts.infer_v2 import IndexTTS2
    # tts = IndexTTS2(cfg_path="checkpoints/config.yaml", model_dir="checkpoints", use_fp16=True)
    # tts.infer(
    #     spk_audio_prompt="${params.spk_audio_prompt}",
    #     text="${params.text}",
    #     output_path="${params.output_path}",
    #     emo_alpha=${params.emo_alpha},
    #     use_emo_text=${params.use_emo_text},
    #     emo_text="${params.emo_text}",
    #     use_random=${params.use_random},
    #     verbose=${params.verbose}
    # )

    # 创建一个空的音频文件作为占位符
    with open(r"${params.output_path}", 'wb') as f:
        f.write(b'PLACEHOLDER_AUDIO_DATA')

    print(f"语音生成完成: ${params.output_path}")

except Exception as e:
    print(f"错误: {str(e)}", file=sys.stderr)
    sys.exit(1)
`
  }

  /**
   * 合并音频文件
   */
  async mergeAudioFiles(audioFiles, outputPath) {
    // 这里应该实现音频文件的合并逻辑
    // 可以使用ffmpeg或其他音频处理库
    console.log(`合并 ${audioFiles.length} 个音频文件到: ${outputPath}`)

    // 模拟合并过程
    await new Promise(resolve => setTimeout(resolve, 1000))

    return {
      outputPath,
      totalDuration: audioFiles.reduce((sum, file) => sum + (file.duration || 0), 0),
      segmentsCount: audioFiles.length
    }
  }

  /**
   * 获取默认叙述者音频
   */
  getDefaultNarratorAudio() {
    return path.join(process.cwd(), 'data', 'voice_samples', 'narrator_default.wav')
  }

  /**
   * 获取默认角色音频
   */
  getDefaultCharacterAudio() {
    return path.join(process.cwd(), 'data', 'voice_samples', 'character_default.wav')
  }

  /**
   * 设置进度回调
   */
  setProgressCallback(callback) {
    this.onProgress = callback
  }

  /**
   * 清理临时文件
   */
  async cleanup() {
    try {
      const files = await fs.readdir(this.tempDir)
      for (const file of files) {
        await fs.unlink(path.join(this.tempDir, file))
      }
    } catch (error) {
      console.warn('清理临时文件失败:', error)
    }
  }

  /**
   * 获取TTS服务状态
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      outputDir: this.outputDir,
      tempDir: this.tempDir,
      pythonPath: this.pythonPath
    }
  }
}

module.exports = TTSService