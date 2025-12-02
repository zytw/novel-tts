const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const crypto = require('crypto');
const FileOutputService = require('./fileOutputService');

class EnhancedFileOutputService extends FileOutputService {
  constructor() {
    super();
    this.jobQueue = [];
    this.activeJobs = new Map();
  }

  /**
   * 生成完整的小说作品集
   */
  async generateNovelCollection(novelData, options = {}) {
    const {
      includeCover = true,
      includeAudio = false,
      includeSubtitles = false,
      formats = ['txt', 'epub'],
      coverImage = null,
      audioFiles = [],
      subtitleFile = null
    } = options;

    try {
      const collectionId = crypto.randomBytes(8).toString('hex');
      const collectionName = `${novelData.title || 'novel_collection'}_${collectionId}`;

      const results = {
        collectionId,
        name: collectionName,
        files: [],
        createdAt: new Date().toISOString()
      };

      // 生成文本文件
      for (const format of formats) {
        const textResult = await this.generateNovelTextFile(novelData, {
          format,
          includeMetadata: true,
          filename: `${collectionName}.${format}`
        });
        results.files.push({
          type: 'text',
          format,
          filename: textResult.filename,
          path: textResult.filePath,
          size: textResult.size
        });
      }

      // 如果需要，生成PDF文件（使用HTML + CSS）
      if (formats.includes('pdf')) {
        const pdfResult = await this.generatePDFFile(novelData, {
          filename: `${collectionName}.pdf`
        });
        results.files.push({
          type: 'text',
          format: 'pdf',
          filename: pdfResult.filename,
          path: pdfResult.filePath,
          size: pdfResult.size
        });
      }

      // 添加封面图片
      if (includeCover && coverImage) {
        const coverResult = await this.processCoverImage(coverImage, collectionName);
        results.cover = coverResult;
      }

      results.summary = {
        totalFiles: results.files.length,
        formats: results.files.map(f => f.format),
        hasCover: !!results.cover,
        totalSize: results.files.reduce((sum, f) => sum + f.size, 0)
      };

      return {
        success: true,
        ...results
      };
    } catch (error) {
      console.error('生成小说作品集失败:', error);
      throw error;
    }
  }

  /**
   * 生成PDF文件
   */
  async generatePDFFile(novelData, options = {}) {
    const { filename } = options;

    try {
      // 生成HTML内容
      const htmlContent = this.generateHTMLContent(novelData);
      const tempHtmlPath = path.join(this.tempDir, `${Date.now()}.html`);
      await fs.writeFile(tempHtmlPath, htmlContent, 'utf-8');

      // 生成CSS样式
      const cssContent = this.generateCSSStyles();
      const tempCssPath = path.join(this.tempDir, `${Date.now()}.css`);
      await fs.writeFile(tempCssPath, cssContent, 'utf-8');

      // 这里应该使用PDF生成库，如puppeteer
      // 由于这是演示，我们创建一个简化的PDF生成流程
      const pdfFilename = filename || `${novelData.title || 'novel'}_${Date.now()}.pdf`;
      const pdfPath = path.join(this.outputDir, pdfFilename);

      // 模拟PDF生成（实际项目中使用puppeteer等库）
      await fs.writeFile(pdfPath, htmlContent, 'utf-8'); // 临时实现

      // 清理临时文件
      await fs.unlink(tempHtmlPath).catch(() => {});
      await fs.unlink(tempCssPath).catch(() => {});

      return {
        success: true,
        filename: pdfFilename,
        filePath: pdfPath,
        size: Buffer.byteLength(htmlContent, 'utf-8'),
        format: 'pdf',
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('生成PDF文件失败:', error);
      throw error;
    }
  }

  /**
   * 生成HTML内容
   */
  generateHTMLContent(novelData) {
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${novelData.title || '未命名小说'}</title>
    <style>
      ${this.generateCSSStyles()}
    </style>
</head>
<body>
    <div class="container">
      <header class="novel-header">
        <h1>${novelData.title || '未命名小说'}</h1>
        ${novelData.author ? `<p class="author">作者：${novelData.author}</p>` : ''}
        ${novelData.description ? `<p class="description">${novelData.description}</p>` : ''}
      </header>
      <main class="novel-content">
`;

    if (novelData.chapters && novelData.chapters.length > 0) {
      novelData.chapters.forEach((chapter, index) => {
        html += `
        <section class="chapter">
          <h2>第${index + 1}章 ${chapter.title || '未命名章节'}</h2>
          <div class="chapter-content">
            ${chapter.content ? chapter.content.replace(/\n/g, '<br>') : ''}
          </div>
        </section>`;
      });
    } else if (novelData.content) {
      html += `<div class="single-content">${novelData.content.replace(/\n/g, '<br>')}</div>`;
    }

    html += `
      </main>
      <footer class="novel-footer">
        <p>生成时间：${new Date().toLocaleString()}</p>
      </footer>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * 生成CSS样式
   */
  generateCSSStyles() {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: "Microsoft YaHei", "SimSun", serif;
        line-height: 1.6;
        color: #333;
        background-color: #f5f5f5;
      }

      .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        background-color: white;
        min-height: 100vh;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
      }

      .novel-header {
        text-align: center;
        margin-bottom: 40px;
        padding-bottom: 20px;
        border-bottom: 2px solid #eee;
      }

      .novel-header h1 {
        font-size: 2.5em;
        color: #2c3e50;
        margin-bottom: 10px;
      }

      .author, .description {
        font-size: 1.1em;
        color: #666;
        margin: 5px 0;
      }

      .novel-content {
        margin-bottom: 40px;
      }

      .chapter {
        margin-bottom: 40px;
      }

      .chapter h2 {
        font-size: 1.8em;
        color: #34495e;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
      }

      .chapter-content {
        font-size: 1.1em;
        text-align: justify;
        line-height: 1.8;
        margin-bottom: 30px;
      }

      .novel-footer {
        text-align: center;
        padding-top: 20px;
        border-top: 1px solid #eee;
        color: #999;
        font-size: 0.9em;
      }

      @media print {
        body {
          background-color: white;
        }
        .container {
          box-shadow: none;
          margin: 0;
          padding: 0;
        }
      }
    `;
  }

  /**
   * 处理封面图片
   */
  async processCoverImage(coverImage, collectionName) {
    try {
      // 这里应该处理图片上传、压缩、格式转换等
      // 由于是演示，我们创建一个占位符
      const coverFilename = `${collectionName}_cover.jpg`;
      const coverPath = path.join(this.outputDir, 'covers', coverFilename);

      // 确保封面目录存在
      await fs.mkdir(path.dirname(coverPath), { recursive: true });

      return {
        filename: coverFilename,
        path: coverPath,
        format: 'jpg',
        size: 0, // 实际项目中应该是真实大小
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('处理封面图片失败:', error);
      throw error;
    }
  }

  /**
   * 创建多媒体包
   */
  async createMultimediaPackage(novelData, mediaFiles, options = {}) {
    const {
      includeText = true,
      includeMetadata = true,
      quality = 'high',
      compressionLevel = 6,
      formats = {
        text: ['txt', 'md'],
        audio: 'mp3',
        video: 'mp4'
      }
    } = options;

    try {
      const packageId = crypto.randomBytes(8).toString('hex');
      const packageName = `${novelData.title || 'multimedia_package'}_${packageId}.zip`;
      const packagePath = path.join(this.outputDir, packageName);

      const archive = archiver('zip', {
        zlib: { level: compressionLevel }
      });

      await new Promise((resolve, reject) => {
        const output = require('fs').createWriteStream(packagePath);

        output.on('close', resolve);
        archive.on('error', reject);

        archive.pipe(output);

        // 组织文件结构
        if (includeText) {
          // 生成文本文件
          const textContent = this.formatNovelContent(novelData, {
            includeMetadata,
            chapterSeparator: '\n---\n',
            format: 'txt'
          });
          archive.append(textContent, { name: 'text/novel.txt' });
        }

        // 添加媒体文件
        if (mediaFiles.text && mediaFiles.text.length > 0) {
          mediaFiles.text.forEach(file => {
            if (require('fs').existsSync(file.path)) {
              archive.file(file.path, { name: `text/${file.filename}` });
            }
          });
        }

        if (mediaFiles.audio && mediaFiles.audio.length > 0) {
          mediaFiles.audio.forEach((file, index) => {
            if (require('fs').existsSync(file.path)) {
              archive.file(file.path, {
                name: `audio/chapter_${index + 1}.${formats.audio}`
              });
            }
          });
        }

        if (mediaFiles.video && mediaFiles.video.length > 0) {
          mediaFiles.video.forEach((file, index) => {
            if (require('fs').existsSync(file.path)) {
              archive.file(file.path, {
                name: `video/chapter_${index + 1}.${formats.video}`
              });
            }
          });
        }

        // 添加元数据
        const metadata = {
          ...novelData,
          packageId,
          createdAt: new Date().toISOString(),
          mediaFiles: {
            text: mediaFiles.text?.length || 0,
            audio: mediaFiles.audio?.length || 0,
            video: mediaFiles.video?.length || 0
          },
          quality,
          formats
        };

        archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

        // 添加播放列表文件
        if (mediaFiles.audio && mediaFiles.audio.length > 0) {
          const playlist = this.generatePlaylist(mediaFiles.audio);
          archive.append(playlist, { name: 'playlist.m3u8' });
        }

        archive.finalize();
      });

      const stats = await fs.stat(packagePath);

      return {
        success: true,
        filename: packageName,
        filePath: packagePath,
        size: stats.size,
        format: 'zip',
        packageId,
        contents: {
          hasText: includeText,
          textFiles: mediaFiles.text?.length || 0,
          audioFiles: mediaFiles.audio?.length || 0,
          videoFiles: mediaFiles.video?.length || 0,
          hasMetadata: includeMetadata,
          hasPlaylist: !!(mediaFiles.audio && mediaFiles.audio.length > 0)
        },
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('创建多媒体包失败:', error);
      throw error;
    }
  }

  /**
   * 生成播放列表
   */
  generatePlaylist(audioFiles) {
    let playlist = '#EXTM3U\n';

    audioFiles.forEach((file, index) => {
      playlist += `#EXTINF:-1,Chapter ${index + 1}\n`;
      playlist += `audio/chapter_${index + 1}.mp3\n`;
    });

    return playlist;
  }

  /**
   * 异步文件生成作业
   */
  async enqueueFileGeneration(job) {
    const jobId = crypto.randomBytes(8).toString('hex');
    const jobData = {
      id: jobId,
      type: job.type,
      status: 'queued',
      createdAt: new Date().toISOString(),
      ...job
    };

    this.jobQueue.push(jobData);

    // 开始处理作业
    this.processJob(jobData).catch(error => {
      console.error('处理文件生成作业失败:', error);
      jobData.status = 'failed';
      jobData.error = error.message;
    });

    return {
      success: true,
      jobId,
      status: 'queued'
    };
  }

  /**
   * 处理文件生成作业
   */
  async processJob(job) {
    try {
      job.status = 'processing';
      job.startedAt = new Date().toISOString();
      this.activeJobs.set(job.id, job);

      switch (job.type) {
        case 'novel_text':
          job.result = await this.generateNovelTextFile(job.data.novelData, job.options);
          break;
        case 'audio_package':
          job.result = await this.createAudioNovelPackage(
            job.data.novelData,
            job.data.audioFiles,
            job.data.subtitleFile,
            job.options
          );
          break;
        case 'multimedia_package':
          job.result = await this.createMultimediaPackage(
            job.data.novelData,
            job.data.mediaFiles,
            job.options
          );
          break;
        default:
          throw new Error(`未知的作业类型: ${job.type}`);
      }

      job.status = 'completed';
      job.completedAt = new Date().toISOString();

    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.failedAt = new Date().toISOString();
      throw error;
    } finally {
      this.activeJobs.delete(job.id);
    }
  }

  /**
   * 获取作业状态
   */
  async getJobStatus(jobId) {
    const job = this.activeJobs.get(jobId) ||
          this.jobQueue.find(j => j.id === jobId);

    if (!job) {
      throw new Error('作业不存在');
    }

    return {
      success: true,
      job
    };
  }

  /**
   * 获取作业队列状态
   */
  async getJobQueueStatus() {
    return {
      success: true,
      queue: {
        queued: this.jobQueue.filter(j => j.status === 'queued'),
        processing: this.jobQueue.filter(j => j.status === 'processing'),
        completed: this.jobQueue.filter(j => j.status === 'completed'),
        failed: this.jobQueue.filter(j => j.status === 'failed')
      },
      activeJobs: Array.from(this.activeJobs.values()),
      totalProcessed: this.jobQueue.length
    };
  }

  /**
   * 导出文件到外部位置
   */
  async exportFiles(filenames, exportOptions = {}) {
    const {
      destination = 'local',
      format = 'original',
      compression = true
    } = exportOptions;

    try {
      const files = [];

      for (const filename of filenames) {
        const fileInfo = await this.getFileContent(filename);
        files.push(fileInfo);
      }

      if (compression) {
        // 创建压缩包
        const exportId = crypto.randomBytes(8).toString('hex');
        const exportFilename = `export_${exportId}.zip`;
        const exportPath = path.join(this.outputDir, exportFilename);

        const archive = archiver('zip', { zlib: { level: 6 } });
        const output = require('fs').createWriteStream(exportPath);

        await new Promise((resolve, reject) => {
          output.on('close', resolve);
          archive.on('error', reject);
          archive.pipe(output);

          files.forEach(file => {
            archive.append(file.content, { name: file.filename });
          });

          archive.finalize();
        });

        const stats = await fs.stat(exportPath);

        return {
          success: true,
          exportType: 'compressed',
          filename: exportFilename,
          path: exportPath,
          size: stats.size,
          filesCount: files.length,
          exportedAt: new Date().toISOString()
        };
      }

      return {
        success: true,
        exportType: 'individual',
        files,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('导出文件失败:', error);
      throw error;
    }
  }
}

module.exports = EnhancedFileOutputService;