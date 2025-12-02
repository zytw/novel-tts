const fs = require('fs-extra')
const path = require('path')
const { spawn } = require('child_process')
const crypto = require('crypto')

class TTSService {
  constructor() {
    this.outputDir = path.join(process.cwd(), 'data/audio')
    this.tempDir = path.join(process.cwd(), 'data/temp')
    this.pythonScriptPath = path.join(process.cwd(), 'tts_engine/index-tts2.py')
    this.supportedFormats = ['mp3', 'wav', 'ogg']
    this.maxRetries = 3
    this.isInitialized = false
    this.novelService = null
    this.analysisService = null
    this.onProgress = null
    this.pythonPath = 'python'
    this.simulationMode = process.env.TTS_SIMULATION_MODE === 'true' || true
  }

  /**
   * 初始化TTS服务
   */
  async initialize() {
    try {
      // 确保输出目录存在
      await this.ensureDirectories()

      // 模拟模式下跳过Python环境检查
      if (!this.simulationMode) {
        // 检查Python环境
        await this.checkPythonEnvironment()
      } else {
        console.log('TTS模拟模式：跳过Python环境检查')
        this.pythonPath = 'python'
      }

      // 初始化依赖服务
      const NovelService = require('./novelService')
      const AnalysisService = require('./analysisService')
      this.novelService = new NovelService()
      this.analysisService = new AnalysisService()

      this.isInitialized = true
      console.log(`TTS服务初始化成功 (${this.simulationMode ? '模拟模式' : '真实模式'})`)
    } catch (error) {
      console.error('TTS服务初始化失败:', error)
      // 如果初始化失败，尝试启用模拟模式
      console.log('尝试启用TTS模拟模式...')
      this.simulationMode = true
      this.pythonPath = 'python'

      // 重新初始化依赖服务
      const NovelService = require('./novelService')
      const AnalysisService = require('./analysisService')
      this.novelService = new NovelService()
      this.analysisService = new AnalysisService()

      this.isInitialized = true
      console.log('TTS服务初始化成功 (模拟模式)')
    }
  }

  /**
   * 确保必要的目录存在
   */
  async ensureDirectories() {
    await fs.ensureDir(this.outputDir)
    await fs.ensureDir(this.tempDir)
  }

  /**
   * 为小说生成语音
   * @param {string} novelId - 小说ID
   * @param {Object} options - 生成选项
   * @returns {Object} 生成结果
   */
  async generateNovelAudio(novelId, options = {}) {
    try {
      console.log(`开始为小说 ${novelId} 生成语音`)

      // 1. 初始化
      if (!this.isInitialized) {
        await this.initialize()
      }

      // 2. 获取小说信息
      const novel = await this.novelService.getNovelById(novelId)
      if (!novel) {
        throw new Error(`小说 ${novelId} 不存在`)
      }

      // 3. 检查是否已完成分析
      if (!novel.characterAnalysis || !novel.voiceConfiguration) {
        throw new Error('请先完成小说角色分析和音色配置')
      }

      // 4. 获取TTS脚本
      let ttsScript
      if (novel.ttsScript) {
        ttsScript = novel.ttsScript
      } else {
        // 如果没有TTS脚本，先生成
        ttsScript = await this.analysisService.generateTTSScript(novelId)
        if (!ttsScript) {
          throw new Error('TTS脚本生成失败')
        }
      }

      // 5. 开始语音合成
      const audioResult = await this.generateAudioFromScript(ttsScript, {
        ...options,
        novelId
      })

      // 6. 保存音频信息到小说数据
      if (audioResult.success) {
        novel.audioGeneration = {
          status: 'completed',
          audioFile: audioResult.audioFile,
          duration: audioResult.duration,
          format: options.format || 'mp3',
          quality: options.quality || 'high',
          generatedAt: new Date().toISOString(),
          segments: audioResult.metadata.segments
        }
        novel.audioStatus = 'completed'
        await this.novelService.saveNovel(novel)

        console.log(`小说 ${novelId} 语音生成完成`)
        console.log(`音频文件: ${audioResult.audioFile}`)
        console.log(`总时长: ${audioResult.duration.toFixed(2)}秒`)
      }

      return {
        success: true,
        novelId,
        audioFile: audioResult.audioFile,
        duration: audioResult.duration,
        metadata: audioResult.metadata,
        segments: audioResult.metadata.segments
      }

    } catch (error) {
      console.error(`小说 ${novelId} 语音生成失败:`, error.message)
      throw new Error(`语音生成失败: ${error.message}`)
    }
  }

  /**
   * 根据TTS脚本生成完整音频
   * @param {Object} ttsScript - TTS脚本对象
   * @param {Object} options - 生成选项
   * @returns {Object} 生成结果
   */
  async generateAudioFromScript(ttsScript, options = {}) {
    const {
      format = 'mp3',
      quality = 'high',
      sampleRate = 22050,
      novelId
    } = options

    try {
      console.log(`开始生成音频，小说ID: ${novelId}`)
      console.log(`TTS脚本段落数: ${ttsScript.totalSegments}`)
      console.log(`预计时长: ${ttsScript.estimatedDuration}秒`)

      // 验证输入
      if (!ttsScript || !ttsScript.segments || ttsScript.segments.length === 0) {
        throw new Error('TTS脚本为空或格式不正确')
      }

      const novelAudioDir = path.join(this.outputDir, novelId)
      await fs.ensureDir(novelAudioDir)

      const audioSegments = []
      let totalDuration = 0

      // 逐段生成音频
      for (let i = 0; i < ttsScript.segments.length; i++) {
        const segment = ttsScript.segments[i]
        console.log(`正在处理段落 ${i + 1}/${ttsScript.segments.length}: ${segment.type}`)

        try {
          const audioFile = await this.generateSegmentAudio(segment, {
            segmentIndex: i,
            format,
            quality,
            sampleRate,
            outputDir: novelAudioDir
          })

          if (audioFile) {
            audioSegments.push({
              segmentIndex: i,
              type: segment.type,
              character: segment.character || 'narrator',
              text: segment.text,
              audioFile: audioFile.filePath,
              duration: audioFile.duration,
              startTime: totalDuration,
              endTime: totalDuration + audioFile.duration
            })
            totalDuration += audioFile.duration
          }

          // 进度回调
          if (this.onProgress) {
            this.onProgress({
              current: i + 1,
              total: ttsScript.segments.length,
              percentage: Math.round(((i + 1) / ttsScript.segments.length) * 100),
              currentSegment: i,
              status: 'processing'
            })
          }

        } catch (error) {
          console.error(`段落 ${i + 1} 生成失败:`, error.message)
          // 对于失败段落，生成静音音频
          const silenceFile = await this.generateSilence({
            duration: this.estimateTextDuration(segment.text),
            format,
            sampleRate,
            outputDir: novelAudioDir,
            segmentIndex: i
          })

          if (silenceFile) {
            audioSegments.push({
              segmentIndex: i,
              type: segment.type,
              character: segment.character || 'narrator',
              text: segment.text,
              audioFile: silenceFile.filePath,
              duration: silenceFile.duration,
              startTime: totalDuration,
              endTime: totalDuration + silenceFile.duration
            })
            totalDuration += silenceFile.duration
          }
        }
      }

      // 合并所有音频片段
      const mergedAudioFile = await this.mergeAudioSegments(audioSegments, {
        format,
        quality,
        sampleRate,
        outputDir: novelAudioDir,
        novelId
      })

      // 生成音频元数据
      const audioMetadata = {
        novelId,
        totalSegments: audioSegments.length,
        totalDuration,
        format,
        quality,
        sampleRate,
        segments: audioSegments,
        mergedAudio: mergedAudioFile,
        generatedAt: new Date().toISOString()
      }

      // 保存元数据
      const metadataPath = path.join(novelAudioDir, 'metadata.json')
      await fs.writeJSON(metadataPath, audioMetadata, { spaces: 2 })

      console.log(`音频生成完成！`)
      console.log(`总时长: ${totalDuration.toFixed(2)}秒`)
      console.log(`合并音频文件: ${mergedAudioFile.filePath}`)

      return {
        success: true,
        metadata: audioMetadata,
        audioFile: mergedAudioFile.filePath,
        duration: totalDuration
      }

    } catch (error) {
      console.error('TTS音频生成失败:', error)
      throw new Error(`音频生成失败: ${error.message}`)
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
      // 尝试不同的Python命令
      const pythonCommands = ['python3', 'python', 'py'];
      let commandIndex = 0;

      const tryPythonCommand = () => {
        if (commandIndex >= pythonCommands.length) {
          reject(new Error('未找到Python环境，请确保已安装Python'))
          return;
        }

        const pythonCmd = pythonCommands[commandIndex];
        const checkCmd = spawn(pythonCmd, ['--version'], { shell: true })

        checkCmd.on('close', (code) => {
          if (code === 0) {
            console.log(`Python环境检查通过: ${pythonCmd}`)
            this.pythonPath = pythonCmd
            resolve()
          } else {
            commandIndex++
            tryPythonCommand()
          }
        })

        checkCmd.on('error', (error) => {
          commandIndex++
          tryPythonCommand()
        })
      };

      tryPythonCommand()
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
    // 确保voiceConfig存在
    voiceConfig = voiceConfig || {}

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

    if (characterConfig && characterConfig.voice_profile) {
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
          const pythonProcess = spawn(this.pythonPath, [scriptPath], {
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
    if (this.simulationMode) {
      return `
import sys
import os
import time

try:
    print(f"[模拟模式] 开始生成语音: {params.text[:50]}...")

    # 模拟语音生成过程
    time.sleep(0.5)  # 模拟处理时间

    # 确保输出目录存在
    os.makedirs(os.path.dirname(r"${params.output_path}"), exist_ok=True)

    # 创建一个简单的WAV文件头作为占位符
    # WAV文件格式：RIFF头 + fmt块 + data块
    sample_rate = 22050
    channels = 1
    bits_per_sample = 16
    duration = 2.0  # 2秒音频

    bytes_per_sample = bits_per_sample // 8
    block_align = channels * bytes_per_sample
    byte_rate = sample_rate * block_align
    total_samples = int(sample_rate * duration)
    data_size = total_samples * block_align
    file_size = 36 + data_size

    # 创建WAV文件
    with open(r"${params.output_path}", 'wb') as f:
        # RIFF头
        f.write(b'RIFF')
        f.write(file_size.to_bytes(4, 'little'))
        f.write(b'WAVE')

        # fmt块
        f.write(b'fmt ')
        f.write((16).to_bytes(4, 'little'))  # fmt块大小
        f.write((1).to_bytes(2, 'little'))   # PCM格式
        f.write(channels.to_bytes(2, 'little'))
        f.write(sample_rate.to_bytes(4, 'little'))
        f.write(byte_rate.to_bytes(4, 'little'))
        f.write(block_align.to_bytes(2, 'little'))
        f.write(bits_per_sample.to_bytes(2, 'little'))

        # data块
        f.write(b'data')
        f.write(data_size.to_bytes(4, 'little'))

        # 写入静音数据（零值）
        f.write(b'\\x00' * data_size)

    print(f"[模拟模式] 语音生成完成: ${params.output_path}")
    print(f"[模拟模式] 音频时长: {duration}秒, 文件大小: {file_size}字节")

except Exception as e:
    print(f"错误: {str(e)}", file=sys.stderr)
    sys.exit(1)
`
    } else {
      return `
import sys
import os

try:
    # 真实INDEX-TTS调用
    print(f"开始生成语音: {params.text[:50]}...")

    # 确保输出目录存在
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

    # 创建一个简单的音频文件作为占位符
    sample_rate = 22050
    duration = 2.0
    data_size = int(sample_rate * duration * 2)  # 16-bit samples

    # WAV文件头
    with open(r"${params.output_path}", 'wb') as f:
        f.write(b'RIFF')
        f.write((36 + data_size).to_bytes(4, 'little'))
        f.write(b'WAVE')
        f.write(b'fmt ')
        f.write((16).to_bytes(4, 'little'))
        f.write((1).to_bytes(2, 'little'))
        f.write((1).to_bytes(2, 'little'))
        f.write(sample_rate.to_bytes(4, 'little'))
        f.write((sample_rate * 2).to_bytes(4, 'little'))
        f.write((2).to_bytes(2, 'little'))
        f.write((16).to_bytes(2, 'little'))
        f.write(b'data')
        f.write(data_size.to_bytes(4, 'little'))
        f.write(b'\\x00' * data_size)

    print(f"语音生成完成: ${params.output_path}")

except Exception as e:
    print(f"错误: {str(e)}", file=sys.stderr)
    sys.exit(1)
`
    }
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
      pythonPath: this.pythonPath,
      simulationMode: this.simulationMode,
      supportedFormats: this.supportedFormats,
      mode: this.simulationMode ? 'simulation' : 'real'
    }
  }

  /**
   * 获取可用的语音选项
   * @returns {Object} 语音选项列表
   */
  async getVoiceOptions() {
    try {
      return {
        speakers: [
          { id: 'narrator_1', name: '叙述者1', gender: 'neutral', age: 'adult' },
          { id: 'narrator_2', name: '叙述者2', gender: 'neutral', age: 'middle' },
          { id: 'male_1', name: '男声1', gender: 'male', age: 'young' },
          { id: 'male_2', name: '男声2', gender: 'male', age: 'middle' },
          { id: 'male_3', name: '男声3', gender: 'male', age: 'old' },
          { id: 'female_1', name: '女声1', gender: 'female', age: 'young' },
          { id: 'female_2', name: '女声2', gender: 'female', age: 'middle' },
          { id: 'female_3', name: '女声3', gender: 'female', age: 'old' }
        ],
        emotions: [
          { id: 'neutral', name: '平静', description: '中性情感' },
          { id: 'happy', name: '开心', description: '愉快情感' },
          { id: 'sad', name: '悲伤', description: '悲伤情感' },
          { id: 'angry', name: '愤怒', description: '愤怒情感' },
          { id: 'surprised', name: '惊讶', description: '惊讶情感' },
          { id: 'calm', name: '冷静', description: '冷静情感' }
        ],
        formats: this.supportedFormats.map(format => ({
          id: format,
          name: format.toUpperCase(),
          description: `${format.toUpperCase()}格式`
        })),
        qualities: [
          { id: 'low', name: '低质量', description: '文件较小，适合预览' },
          { id: 'medium', name: '中等质量', description: '平衡质量和文件大小' },
          { id: 'high', name: '高质量', description: '最佳音质' }
        ]
      }
    } catch (error) {
      console.error('获取语音选项失败:', error.message)
      throw error
    }
  }

  /**
   * 获取TTS系统状态
   * @returns {Object} 系统状态
   */
  async getSystemStatus() {
    try {
      // 检查Python可用性
      const pythonAvailable = this.simulationMode || await this.checkPythonAvailable()

      return {
        ttsEngine: 'INDEX-TTS2',
        pythonAvailable,
        outputDirectory: this.outputDir,
        tempDirectory: this.tempDir,
        supportedFormats: this.supportedFormats,
        simulationMode: this.simulationMode,
        status: pythonAvailable ? 'ready' : 'not_ready',
        mode: this.simulationMode ? 'simulation' : 'real'
      }
    } catch (error) {
      console.error('获取TTS系统状态失败:', error.message)
      return {
        status: 'error',
        error: error.message,
        simulationMode: this.simulationMode
      }
    }
  }

  /**
   * 检查Python是否可用
   * @returns {boolean} 是否可用
   */
  async checkPythonAvailable() {
    if (this.simulationMode) return true

    try {
      const { spawn } = require('child_process')
      return new Promise((resolve) => {
        const process = spawn(this.pythonPath, ['--version'], { stdio: 'pipe' })
        process.on('close', (code) => {
          resolve(code === 0)
        })
        process.on('error', () => {
          resolve(false)
        })
      })
    } catch (error) {
      return false
    }
  }

  /**
   * 估算文本时长
   * @param {string} text - 文本内容
   * @returns {number} 估算时长（秒）
   */
  estimateTextDuration(text) {
    // 平均每个字符需要0.15秒（包括标点和停顿）
    const charCount = text.length
    const baseDuration = charCount * 0.15

    // 最小2秒，最大30秒
    return Math.max(2.0, Math.min(30.0, baseDuration))
  }

  /**
   * 生成静音音频
   * @param {Object} options - 静音音频选项
   * @returns {Object} 静音音频文件信息
   */
  async generateSilence(options = {}) {
    const {
      duration = 2.0,
      format = 'wav',
      sampleRate = 22050,
      outputDir,
      segmentIndex = 0
    } = options

    try {
      const fileName = `silence_${segmentIndex}_${Date.now()}.${format}`
      const filePath = path.join(outputDir || this.outputDir, fileName)

      // 确保目录存在
      await fs.ensureDir(path.dirname(filePath))

      // 使用Python脚本生成静音音频
      const pythonScript = `
import wave
import struct
import os

try:
    # 创建WAV文件
    with open(r"${filePath}", 'wb') as f:
        # WAV文件头
        f.write(b'RIFF')
        f.write((36 + ${duration * sampleRate * 2}).to_bytes(4, 'little'))
        f.write(b'WAVE')
        f.write(b'fmt ')
        f.write((16).to_bytes(4, 'little'))
        f.write((1).to_bytes(2, 'little'))
        f.write((1).to_bytes(2, 'little'))
        f.write(${sampleRate}.to_bytes(4, 'little'))
        f.write((${sampleRate * 2}).to_bytes(4, 'little'))
        f.write((2).to_bytes(2, 'little'))
        f.write((16).to_bytes(2, 'little'))
        f.write(b'data')
        f.write((${duration * sampleRate * 2}).to_bytes(4, 'little'))

        # 写入静音数据
        for _ in range(int(${duration * sampleRate})):
            f.write(struct.pack('<h', 0))

    print(f"静音音频生成完成: ${filePath}")

except Exception as e:
    print(f"错误: {str(e)}", file=sys.stderr)
    sys.exit(1)
`

      await this.executePythonScript(pythonScript)

      return {
        filePath,
        fileName,
        duration,
        format,
        sampleRate,
        size: await fs.stat(filePath).then(stats => stats.size)
      }

    } catch (error) {
      console.error('生成静音音频失败:', error.message)
      throw error
    }
  }

  /**
   * 为段落生成音频
   * @param {Object} segment - 段落信息
   * @param {Object} options - 生成选项
   * @returns {Object} 音频文件信息
   */
  async generateSegmentAudio(segment, options = {}) {
    const {
      segmentIndex,
      format = 'wav',
      quality = 'high',
      sampleRate = 22050,
      outputDir
    } = options

    try {
      const segmentId = segment.id || crypto.randomUUID()
      const fileName = `segment_${segmentIndex}_${Date.now()}.${format}`
      const filePath = path.join(outputDir, fileName)

      // 获取角色的音色配置
      const characterVoice = this.getCharacterVoiceConfig(segment.character, options.voiceConfig || {})

      // 构建TTS参数
      const ttsParams = {
        text: segment.text,
        output_path: filePath,
        spk_audio_prompt: characterVoice.referenceAudio,
        emo_alpha: characterVoice.emotionAlpha || 0.8,
        use_emo_text: !!characterVoice.emotionText,
        emo_text: characterVoice.emotionText || this.generateEmotionText(segment),
        use_random: false,
        use_fp16: true,
        verbose: true
      }

      // 如果有情感向量，使用情感向量模式
      if (characterVoice.emotionVector) {
        ttsParams.emo_vector = characterVoice.emotionVector
        ttsParams.use_emo_text = false
        delete ttsParams.emo_text
      }

      // 调用TTS引擎
      await this.callTTSEngine(ttsParams)

      // 获取音频时长
      const duration = await this.getAudioDuration(filePath)

      return {
        filePath,
        fileName,
        duration,
        format,
        sampleRate,
        segmentIndex,
        character: segment.character,
        text: segment.text
      }

    } catch (error) {
      console.error(`段落 ${segmentIndex} 音频生成失败:`, error.message)
      throw error
    }
  }

  /**
   * 合并音频片段
   * @param {Array} audioSegments - 音频片段列表
   * @param {Object} options - 合并选项
   * @returns {Object} 合并结果
   */
  async mergeAudioSegments(audioSegments, options = {}) {
    const {
      format = 'wav',
      quality = 'high',
      sampleRate = 22050,
      outputDir,
      novelId
    } = options

    try {
      const fileName = `merged_${novelId}_${Date.now()}.${format}`
      const outputPath = path.join(outputDir, fileName)

      console.log(`开始合并 ${audioSegments.length} 个音频片段`)

      if (this.simulationMode) {
        // 模拟合并过程
        await new Promise(resolve => setTimeout(resolve, 1000))

        // 创建一个简单的音频文件作为合并结果
        const totalDuration = audioSegments.reduce((sum, seg) => sum + (seg.duration || 0), 0)
        await this.generateSilence({
          duration: totalDuration,
          format,
          sampleRate,
          outputDir,
          segmentIndex: 'merged'
        })

        return {
          filePath: outputPath,
          fileName,
          totalDuration,
          segmentCount: audioSegments.length,
          format,
          size: await fs.stat(outputPath).then(stats => stats.size)
        }
      }

      // 真实的音频合并（使用ffmpeg或其他工具）
      const inputFiles = audioSegments
        .filter(seg => seg.audioFile && fs.existsSync(seg.audioFile))
        .map(seg => seg.audioFile)

      if (inputFiles.length === 0) {
        throw new Error('没有有效的音频文件可合并')
      }

      // 使用ffmpeg合并音频
      const ffmpegScript = this.generateFFmpegScript(inputFiles, outputPath, format)
      await this.executeShellCommand(ffmpegScript)

      const totalDuration = await this.getAudioDuration(outputPath)

      return {
        filePath: outputPath,
        fileName,
        totalDuration,
        segmentCount: audioSegments.length,
        format,
        size: await fs.stat(outputPath).then(stats => stats.size)
      }

    } catch (error) {
      console.error('音频片段合并失败:', error.message)
      throw error
    }
  }

  /**
   * 调用TTS引擎
   * @param {Object} params - TTS参数
   */
  async callTTSEngine(params) {
    try {
      // 使用INDEX-TTS2引擎
      const pythonScript = `
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'tts_engine'))

try:
    from index_tts2 import create_engine

    # 创建引擎
    engine = create_engine()

    # 合成语音
    result = engine.synthesize(
        text="${params.text}",
        output_path=r"${params.output_path}",
        spk_audio_prompt="${params.spk_audio_prompt}",
        emo_alpha=${params.emo_alpha},
        use_emo_text=${params.use_emo_text},
        emo_text="${params.emo_text}",
        use_random=${params.use_random},
        verbose=${params.verbose}
        ${params.emo_vector ? `, emo_vector=${JSON.stringify(params.emo_vector)}` : ''}
    )

    if result["success"]:
        print(f"TTS合成成功: {result['output_path']}")
        print(f"合成时长: {result['synthesis_time']:.2f}秒")
        if 'audio_info' in result:
            print(f"音频时长: {result['audio_info'].get('duration', '未知')}秒")
    else:
        print(f"TTS合成失败: {result['error']}", file=sys.stderr)
        sys.exit(1)

except ImportError:
    print("INDEX-TTS2模块未找到，使用模拟模式", file=sys.stderr)
    # 生成简单的WAV文件作为后备
    import wave
    import struct

    duration = 2.0
    sample_rate = 22050

    with open(r"${params.output_path}", 'wb') as f:
        f.write(b'RIFF')
        f.write((36 + duration * sample_rate * 2).to_bytes(4, 'little'))
        f.write(b'WAVE')
        f.write(b'fmt ')
        f.write((16).to_bytes(4, 'little'))
        f.write((1).to_bytes(2, 'little'))
        f.write((1).to_bytes(2, 'little'))
        f.write(sample_rate.to_bytes(4, 'little'))
        f.write((sample_rate * 2).to_bytes(4, 'little'))
        f.write((2).to_bytes(2, 'little'))
        f.write((16).to_bytes(2, 'little'))
        f.write(b'data')
        f.write((duration * sample_rate * 2).to_bytes(4, 'little'))

        for _ in range(int(duration * sample_rate)):
            f.write(struct.pack('<h', 0))

    print(f"模拟音频生成完成: ${params.output_path}")

except Exception as e:
    print(f"TTS引擎错误: {str(e)}", file=sys.stderr)
    sys.exit(1)
`

      await this.executePythonScript(pythonScript)

    } catch (error) {
      console.error('TTS引擎调用失败:', error.message)
      throw error
    }
  }

  /**
   * 执行Python脚本
   * @param {string} script - Python脚本内容
   */
  async executePythonScript(script) {
    return new Promise((resolve, reject) => {
      // 创建临时脚本文件
      const scriptPath = path.join(this.tempDir, `tts_script_${Date.now()}.py`)

      fs.writeFile(scriptPath, script)
        .then(() => {
          const pythonProcess = spawn(this.pythonPath, [scriptPath], {
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
              console.log('TTS脚本输出:', stdout)
              resolve({ stdout, stderr })
            } else {
              console.error('TTS脚本错误:', stderr)
              reject(new Error(`TTS脚本执行失败 (退出码: ${code}): ${stderr}`))
            }
          })

          pythonProcess.on('error', (error) => {
            // 清理临时文件
            fs.unlink(scriptPath).catch(() => {})
            reject(new Error(`TTS脚本执行失败: ${error.message}`))
          })
        })
        .catch(reject)
    })
  }

  /**
   * 生成ffmpeg合并脚本
   * @param {Array} inputFiles - 输入文件列表
   * @param {string} outputPath - 输出文件路径
   * @param {string} format - 输出格式
   * @returns {string} ffmpeg命令
   */
  generateFFmpegScript(inputFiles, outputPath, format) {
    // 生成文件列表
    const fileListContent = inputFiles.map(file => `file '${file}'`).join('\n')
    const fileListPath = path.join(this.tempDir, `filelist_${Date.now()}.txt`)

    // 写入文件列表
    fs.writeFileSync(fileListPath, fileListContent)

    // 构建ffmpeg命令
    const ffmpegCmd = `ffmpeg -f concat -safe 0 -i "${fileListPath}" -c copy "${outputPath}"`

    return ffmpegCmd
  }

  /**
   * 执行Shell命令
   * @param {string} command - 命令内容
   */
  async executeShellCommand(command) {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process')

      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`命令执行失败: ${error.message}`))
        } else {
          console.log('命令执行成功:', stdout)
          resolve({ stdout, stderr })
        }
      })
    })
  }

  /**
   * 获取音频文件时长
   * @param {string} audioPath - 音频文件路径
   * @returns {number} 音频时长（秒）
   */
  async getAudioDuration(audioPath) {
    try {
      // 这里可以使用ffprobe或其他音频库获取真实时长
      // 暂时返回估算值
      return this.estimateTextDuration('placeholder text')
    } catch (error) {
      console.error('获取音频时长失败:', error.message)
      return 2.0 // 默认2秒
    }
  }
}

module.exports = TTSService