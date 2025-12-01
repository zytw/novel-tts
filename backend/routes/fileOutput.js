const express = require('express');
const Joi = require('joi');
const path = require('path');
const FileOutputService = require('../src/services/fileOutputService');

const router = express.Router();
const fileOutputService = new FileOutputService();

// 验证模式
const generateNovelTextSchema = Joi.object({
  novelData: Joi.object({
    title: Joi.string().required(),
    author: Joi.string().default(''),
    description: Joi.string().default(''),
    content: Joi.string().default(''),
    chapters: Joi.array().items(Joi.object({
      title: Joi.string().default(''),
      content: Joi.string().default('')
    })).default([]),
    createdAt: Joi.string().optional()
  }).required(),
  options: Joi.object({
    format: Joi.string().valid('txt', 'md', 'docx').default('txt'),
    includeMetadata: Joi.boolean().default(true),
    chapterSeparator: Joi.string().default('\n---\n'),
    encoding: Joi.string().valid('utf-8', 'utf-16', 'gbk').default('utf-8'),
    filename: Joi.string().optional()
  }).default({})
});

const createPackageSchema = Joi.object({
  novelData: Joi.object({
    title: Joi.string().required(),
    author: Joi.string().default(''),
    description: Joi.string().default(''),
    content: Joi.string().default(''),
    chapters: Joi.array().items(Joi.object({
      title: Joi.string().default(''),
      content: Joi.string().default('')
    })).default([]),
    createdAt: Joi.string().optional()
  }).required(),
  audioFiles: Joi.array().items(Joi.object({
    path: Joi.string().required(),
    filename: Joi.string().optional(),
    duration: Joi.number().optional()
  })).default([]),
  subtitleFile: Joi.object({
    path: Joi.string().optional(),
    filename: Joi.string().optional()
  }).optional(),
  options: Joi.object({
    includeTextFile: Joi.boolean().default(true),
    includeCoverImage: Joi.boolean().default(true),
    audioFormat: Joi.string().valid('mp3', 'wav', 'aac', 'm4a').default('mp3'),
    compressionLevel: Joi.number().integer().min(1).max(9).default(6),
    filename: Joi.string().optional()
  }).default({})
});

// 初始化文件输出服务
router.post('/initialize', async (req, res) => {
  try {
    await fileOutputService.initialize();
    res.json({
      success: true,
      message: '文件输出服务初始化成功',
      data: {
        outputDir: path.join(process.cwd(), 'data', 'output'),
        tempDir: path.join(process.cwd(), 'data', 'temp')
      }
    });
  } catch (error) {
    console.error('文件输出服务初始化失败:', error);
    res.status(500).json({
      success: false,
      error: '文件输出服务初始化失败',
      details: error.message
    });
  }
});

// 生成小说文本文件
router.post('/generate-novel-text', async (req, res) => {
  try {
    const { error, value } = generateNovelTextSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: error.details
      });
    }

    const { novelData, options } = value;

    // 生成小说文本文件
    const result = await fileOutputService.generateNovelTextFile(novelData, options);

    res.json({
      success: true,
      message: '小说文本文件生成完成',
      data: result
    });
  } catch (error) {
    console.error('生成小说文本文件失败:', error);
    res.status(500).json({
      success: false,
      error: '生成小说文本文件失败',
      details: error.message
    });
  }
});

// 创建完整音频小说包
router.post('/create-audio-package', async (req, res) => {
  try {
    const { error, value } = createPackageSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: error.details
      });
    }

    const { novelData, audioFiles, subtitleFile, options } = value;

    // 创建音频小说包
    const result = await fileOutputService.createAudioNovelPackage(novelData, audioFiles, subtitleFile, options);

    res.json({
      success: true,
      message: '音频小说包创建完成',
      data: result
    });
  } catch (error) {
    console.error('创建音频小说包失败:', error);
    res.status(500).json({
      success: false,
      error: '创建音频小说包失败',
      details: error.message
    });
  }
});

// 获取输出文件列表
router.get('/files', async (req, res) => {
  try {
    const filters = {
      type: req.query.type,
      format: req.query.format,
      search: req.query.search,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };

    const files = await fileOutputService.getOutputFiles(filters);

    res.json({
      success: true,
      data: {
        files,
        totalCount: files.length,
        filters
      }
    });
  } catch (error) {
    console.error('获取输出文件列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取输出文件列表失败',
      details: error.message
    });
  }
});

// 获取文件信息
router.get('/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const files = await fileOutputService.getOutputFiles();
    const fileInfo = files.find(file => file.filename === filename);

    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }

    res.json({
      success: true,
      data: fileInfo
    });
  } catch (error) {
    console.error('获取文件信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取文件信息失败',
      details: error.message
    });
  }
});

// 获取文件内容
router.get('/files/:filename/content', async (req, res) => {
  try {
    const { filename } = req.params;
    const options = {
      encoding: req.query.encoding || 'utf-8',
      maxSize: parseInt(req.query.maxSize) || 10 * 1024 * 1024
    };

    const result = await fileOutputService.getFileContent(filename, options);

    res.set({
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `inline; filename="${filename}"`
    });

    res.send(result.content);
  } catch (error) {
    console.error('获取文件内容失败:', error);
    if (error.message.includes('不存在') || error.message.includes('ENOENT')) {
      res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    } else {
      res.status(500).json({
        success: false,
        error: '获取文件内容失败',
        details: error.message
      });
    }
  }
});

// 下载文件
router.get('/files/:filename/download', async (req, res) => {
  try {
    const { filename } = req.params;
    const files = await fileOutputService.getOutputFiles();
    const fileInfo = files.find(file => file.filename === filename);

    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }

    const filePath = path.join(process.cwd(), 'data', 'output', filename);

    // 设置响应头
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', fileInfo.size);

    // 发送文件
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('文件下载失败:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: '文件下载失败',
            details: err.message
          });
        }
      }
    });
  } catch (error) {
    console.error('下载文件失败:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: '下载文件失败',
        details: error.message
      });
    }
  }
});

// 批量下载文件（ZIP打包）
router.post('/files/batch-download', async (req, res) => {
  try {
    const { filenames } = req.body;

    if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供要下载的文件列表'
      });
    }

    const files = await fileOutputService.getOutputFiles();
    const validFiles = files.filter(file => filenames.includes(file.filename));

    if (validFiles.length === 0) {
      return res.status(404).json({
        success: false,
        error: '没有找到有效的文件'
      });
    }

    // 创建临时ZIP文件
    const archiver = require('archiver');
    const crypto = require('crypto');
    const zipId = crypto.randomBytes(8).toString('hex');
    const zipFilename = `batch_download_${zipId}.zip`;
    const zipPath = path.join(process.cwd(), 'data', 'temp', zipFilename);

    const output = require('fs').createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } });

    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);

      validFiles.forEach(file => {
        const filePath = path.join(process.cwd(), 'data', 'output', file.filename);
        if (require('fs').existsSync(filePath)) {
          archive.file(filePath, { name: file.filename });
        }
      });

      archive.finalize();
    });

    // 设置响应头
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFilename)}"`);
    res.setHeader('Content-Type', 'application/zip');

    // 发送ZIP文件
    res.sendFile(zipPath, (err) => {
      // 清理临时文件
      setTimeout(() => {
        require('fs').unlink(zipPath, () => {});
      }, 5000);

      if (err) {
        console.error('批量下载失败:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: '批量下载失败',
            details: err.message
          });
        }
      }
    });
  } catch (error) {
    console.error('批量下载失败:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: '批量下载失败',
        details: error.message
      });
    }
  }
});

// 删除文件
router.delete('/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    const result = await fileOutputService.deleteFile(filename);

    res.json(result);
  } catch (error) {
    console.error('删除文件失败:', error);
    if (error.message.includes('不存在')) {
      res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    } else {
      res.status(500).json({
        success: false,
        error: '删除文件失败',
        details: error.message
      });
    }
  }
});

// 批量删除文件
router.delete('/files', async (req, res) => {
  try {
    const { filenames } = req.body;

    if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供要删除的文件列表'
      });
    }

    const result = await fileOutputService.deleteFiles(filenames);

    res.json(result);
  } catch (error) {
    console.error('批量删除文件失败:', error);
    res.status(500).json({
      success: false,
      error: '批量删除文件失败',
      details: error.message
    });
  }
});

// 重命名文件
router.put('/files/:filename/rename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { newFilename } = req.body;

    if (!newFilename) {
      return res.status(400).json({
        success: false,
        error: '请提供新的文件名'
      });
    }

    const result = await fileOutputService.renameFile(filename, newFilename);

    res.json(result);
  } catch (error) {
    console.error('重命名文件失败:', error);
    if (error.message.includes('不存在')) {
      res.status(404).json({
        success: false,
        error: '原文件不存在'
      });
    } else {
      res.status(500).json({
        success: false,
        error: '重命名文件失败',
        details: error.message
      });
    }
  }
});

// 获取文件统计信息
router.get('/stats', async (req, res) => {
  try {
    const stats = await fileOutputService.getFileStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取文件统计信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取文件统计信息失败',
      details: error.message
    });
  }
});

// 清理临时文件
router.post('/cleanup', async (req, res) => {
  try {
    const { maxAge } = req.body;
    const result = await fileOutputService.cleanupTempFiles(maxAge);

    res.json(result);
  } catch (error) {
    console.error('清理临时文件失败:', error);
    res.status(500).json({
      success: false,
      error: '清理临时文件失败',
      details: error.message
    });
  }
});

// 预览文件内容（支持大文件分页）
router.get('/files/:filename/preview', async (req, res) => {
  try {
    const { filename } = req.params;
    const { page = 1, pageSize = 1000, encoding = 'utf-8' } = req.query;

    const files = await fileOutputService.getOutputFiles();
    const fileInfo = files.find(file => file.filename === filename);

    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }

    if (fileInfo.type !== 'text' && !['txt', 'md', 'srt', 'vtt'].includes(fileInfo.format)) {
      return res.status(400).json({
        success: false,
        error: '该文件类型不支持预览'
      });
    }

    const result = await fileOutputService.getFileContent(filename, { encoding });
    const content = result.content;
    const lines = content.split('\n');

    const startIndex = (parseInt(page) - 1) * parseInt(pageSize);
    const endIndex = startIndex + parseInt(pageSize);
    const pageLines = lines.slice(startIndex, endIndex);
    const pageContent = pageLines.join('\n');

    res.json({
      success: true,
      data: {
        filename,
        content: pageContent,
        pageInfo: {
          currentPage: parseInt(page),
          pageSize: parseInt(pageSize),
          totalLines: lines.length,
          totalPages: Math.ceil(lines.length / parseInt(pageSize)),
          hasPrevious: parseInt(page) > 1,
          hasNext: endIndex < lines.length
        },
        fileInfo: {
          size: fileInfo.size,
          format: fileInfo.format,
          type: fileInfo.type
        }
      }
    });
  } catch (error) {
    console.error('预览文件内容失败:', error);
    res.status(500).json({
      success: false,
      error: '预览文件内容失败',
      details: error.message
    });
  }
});

module.exports = router;