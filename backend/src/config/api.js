/**
 * API 配置和接口标准化
 * 提供统一的 API 响应格式和接口文档
 */

class APIConfig {
  constructor() {
    this.version = 'v1';
    this.basePath = `/api/${this.version}`;
    this.server = {
      host: process.env.HOST || 'localhost',
      port: process.env.PORT || 3000,
      environment: process.env.NODE_ENV || 'development'
    };

    // API 响应格式标准
    this.responseFormats = {
      success: {
        success: true,
        message: '',
        data: null,
        timestamp: null,
        requestId: null
      },
      error: {
        success: false,
        error: '',
        code: '',
        details: null,
        timestamp: null,
        requestId: null
      }
    };

    // API 接口文档
    this.endpoints = {
      // AI 模型管理
      models: {
        base: '/models',
        endpoints: [
          { method: 'GET', path: '/', description: '获取所有 AI 模型配置' },
          { method: 'POST', path: '/', description: '创建新的 AI 模型配置' },
          { method: 'GET', path: '/:id', description: '获取指定 AI 模型配置' },
          { method: 'PUT', path: '/:id', description: '更新 AI 模型配置' },
          { method: 'DELETE', path: '/:id', description: '删除 AI 模型配置' }
        ]
      },

      // 小说生成
      novel: {
        base: '/novel',
        endpoints: [
          { method: 'POST', path: '/generate', description: 'AI 生成小说内容' },
          { method: 'POST', path: '/save', description: '保存小说草稿' },
          { method: 'GET', path: '/list', description: '获取小说列表' },
          { method: 'GET', path: '/:id', description: '获取小说详情' },
          { method: 'PUT', path: '/:id', description: '更新小说内容' }
        ]
      },

      // 角色分析
      analysis: {
        base: '/analysis',
        endpoints: [
          { method: 'POST', path: '/analyze', description: '分析小说角色' },
          { method: 'GET', path: '/characters/:novelId', description: '获取角色列表' },
          { method: 'POST', path: '/assign-voices', description: '分配角色音色' }
        ]
      },

      // TTS 语音合成
      tts: {
        base: '/tts',
        endpoints: [
          { method: 'POST', path: '/generate', description: '生成语音文件' },
          { method: 'GET', path: '/status/:taskId', description: '获取生成状态' },
          { method: 'GET', path: '/voices', description: '获取可用音色列表' },
          { method: 'GET', path: '/download/:fileId', description: '下载语音文件' }
        ]
      },

      // 字幕生成
      subtitle: {
        base: '/subtitle',
        endpoints: [
          { method: 'POST', path: '/initialize', description: '初始化字幕服务' },
          { method: 'POST', path: '/generate', description: '生成字幕文件' },
          { method: 'POST', path: '/generate-from-tts', description: '从 TTS 结果生成字幕' },
          { method: 'GET', path: '/files', description: '获取字幕文件列表' },
          { method: 'GET', path: '/files/:filename', description: '获取字幕文件信息' },
          { method: 'GET', path: '/files/:filename/content', description: '获取字幕文件内容' },
          { method: 'GET', path: '/files/:filename/download', description: '下载字幕文件' },
          { method: 'POST', path: '/validate', description: '验证字幕文件' },
          { method: 'DELETE', path: '/files/:filename', description: '删除字幕文件' },
          { method: 'GET', path: '/stats', description: '获取字幕统计信息' },
          { method: 'GET', path: '/files/:filename/preview', description: '预览字幕文件' }
        ]
      },

      // 文件输出
      fileOutput: {
        base: '/file-output',
        endpoints: [
          { method: 'POST', path: '/initialize', description: '初始化文件输出服务' },
          { method: 'POST', path: '/generate-novel-text', description: '生成小说文本文件' },
          { method: 'POST', path: '/create-audio-package', description: '创建音频小说包' },
          { method: 'GET', path: '/files', description: '获取输出文件列表' },
          { method: 'GET', path: '/files/:filename', description: '获取文件信息' },
          { method: 'GET', path: '/files/:filename/content', description: '获取文件内容' },
          { method: 'GET', path: '/files/:filename/download', description: '下载文件' },
          { method: 'POST', path: '/files/batch-download', description: '批量下载文件' },
          { method: 'DELETE', path: '/files/:filename', description: '删除文件' },
          { method: 'DELETE', path: '/files', description: '批量删除文件' },
          { method: 'PUT', path: '/files/:filename/rename', description: '重命名文件' },
          { method: 'GET', path: '/stats', description: '获取文件统计信息' },
          { method: 'POST', path: '/cleanup', description: '清理临时文件' },
          { method: 'GET', path: '/files/:filename/preview', description: '预览文件' }
        ]
      }
    };
  }

  /**
   * 创建成功响应
   */
  createSuccessResponse(data = null, message = '操作成功', options = {}) {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      requestId: options.requestId || this.generateRequestId(),
      pagination: options.pagination || null
    };
  }

  /**
   * 创建错误响应
   */
  createErrorResponse(error, code = null, details = null, options = {}) {
    return {
      success: false,
      error: typeof error === 'string' ? error : error.message || '操作失败',
      code: code || 'UNKNOWN_ERROR',
      details,
      timestamp: new Date().toISOString(),
      requestId: options.requestId || this.generateRequestId()
    };
  }

  /**
   * 生成请求ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取完整的 API 文档
   */
  getAPIDocumentation() {
    return {
      info: {
        title: 'AI Novel TTS API',
        version: this.version,
        description: 'AI小说创作和语音合成 API 接口文档',
        baseUrl: `http://${this.server.host}:${this.server.port}${this.basePath}`,
        environment: this.server.environment
      },
      endpoints: this.endpoints,
      responseFormats: this.responseFormats,
      errorCodes: this.getErrorCodes()
    };
  }

  /**
   * 获取错误代码定义
   */
  getErrorCodes() {
    return {
      // 通用错误
      UNKNOWN_ERROR: { code: 1000, message: '未知错误' },
      VALIDATION_ERROR: { code: 1001, message: '参数验证失败' },
      AUTHENTICATION_ERROR: { code: 1002, message: '身份验证失败' },
      AUTHORIZATION_ERROR: { code: 1003, message: '权限不足' },
      RATE_LIMIT_ERROR: { code: 1004, message: '请求频率限制' },
      INTERNAL_ERROR: { code: 1005, message: '内部服务器错误' },

      // 业务错误
      MODEL_NOT_FOUND: { code: 2001, message: 'AI模型不存在' },
      NOVEL_NOT_FOUND: { code: 2002, message: '小说不存在' },
      CHARACTER_ANALYSIS_FAILED: { code: 2003, message: '角色分析失败' },
      TTS_GENERATION_FAILED: { code: 2004, message: 'TTS生成失败' },
      SUBTITLE_GENERATION_FAILED: { code: 2005, message: '字幕生成失败' },
      FILE_NOT_FOUND: { code: 2006, message: '文件不存在' },
      FILE_OPERATION_FAILED: { code: 2007, message: '文件操作失败' }
    };
  }

  /**
   * 验证 API 版本
   */
  validateVersion(version) {
    return version === this.version;
  }

  /**
   * 获取环境配置
   */
  getEnvironmentConfig() {
    return {
      ...this.server,
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
        credentials: true,
        optionsSuccessStatus: 200
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15分钟
        max: parseInt(process.env.RATE_LIMIT_MAX) || 100 // 限制每个IP 100个请求
      },
      upload: {
        maxSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024, // 10MB
        allowedTypes: process.env.UPLOAD_ALLOWED_TYPES?.split(',') || [
          'text/plain',
          'text/markdown',
          'audio/mpeg',
          'audio/wav',
          'audio/x-m4a'
        ]
      }
    };
  }
}

module.exports = new APIConfig();