const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const crypto = require('crypto');

class FileOutputService {
  constructor() {
    this.outputDir = path.join(process.cwd(), 'data', 'output');
    this.tempDir = path.join(process.cwd(), 'data', 'temp');
    this.supportedFormats = {
      text: ['txt', 'md', 'docx'],
      subtitle: ['srt', 'vtt', 'ass'],
      audio: ['mp3', 'wav', 'aac', 'm4a'],
      archive: ['zip', 'tar', 'gz']
    };
    this.initialize();
  }

  async initialize() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
      console.log('FileOutputService 初始化成功');
    } catch (error) {
      console.error('FileOutputService 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 生成小说文本文件
   */
  async generateNovelTextFile(novelData, options = {}) {
    const {
      format = 'txt',
      includeMetadata = true,
      chapterSeparator = '\n---\n',
      encoding = 'utf-8',
      filename
    } = options;

    try {
      const content = this.formatNovelContent(novelData, {
        includeMetadata,
        chapterSeparator,
        format
      });

      const fileExtension = format;
      const defaultFilename = `${novelData.title || 'novel'}_${Date.now()}.${fileExtension}`;
      const finalFilename = filename || defaultFilename;
      const filePath = path.join(this.outputDir, finalFilename);

      await fs.writeFile(filePath, content, encoding);

      return {
        success: true,
        filename: finalFilename,
        filePath,
        size: Buffer.byteLength(content, encoding),
        format: fileExtension,
        encoding,
        createdAt: new Date().toISOString(),
        content: content
      };
    } catch (error) {
      console.error('生成小说文本文件失败:', error);
      throw error;
    }
  }

  /**
   * 格式化小说内容
   */
  formatNovelContent(novelData, options) {
    const { includeMetadata, chapterSeparator, format } = options;
    let content = '';

    // 添加元数据
    if (includeMetadata) {
      content += `# ${novelData.title || '未命名小说'}\n\n`;
      if (novelData.author) content += `作者: ${novelData.author}\n`;
      if (novelData.description) content += `简介: ${novelData.description}\n`;
      if (novelData.createdAt) content += `创作时间: ${new Date(novelData.createdAt).toLocaleDateString()}\n`;
      content += '\n---\n\n';
    }

    // 添加章节内容
    if (novelData.chapters && novelData.chapters.length > 0) {
      novelData.chapters.forEach((chapter, index) => {
        if (format === 'md') {
          content += `## 第${index + 1}章 ${chapter.title || '未命名章节'}\n\n`;
        } else {
          content += `第${index + 1}章 ${chapter.title || '未命名章节'}\n\n`;
        }
        content += `${chapter.content || ''}\n\n`;
        if (index < novelData.chapters.length - 1) {
          content += chapterSeparator + '\n';
        }
      });
    } else if (novelData.content) {
      content += novelData.content;
    }

    return content;
  }

  /**
   * 创建完整的音频小说包
   */
  async createAudioNovelPackage(novelData, audioFiles, subtitleFile, options = {}) {
    const {
      includeTextFile = true,
      includeCoverImage = true,
      audioFormat = 'mp3',
      compressionLevel = 6,
      filename
    } = options;

    try {
      const packageId = crypto.randomBytes(8).toString('hex');
      const packageName = filename || `${novelData.title || 'audio_novel'}_${packageId}.zip`;
      const packagePath = path.join(this.tempDir, packageName);

      // 创建 ZIP 文件
      const output = require('fs').createWriteStream(packagePath);
      const archive = archiver('zip', { zlib: { level: compressionLevel } });

      await new Promise((resolve, reject) => {
        output.on('close', resolve);
        archive.on('error', reject);

        archive.pipe(output);

        // 添加音频文件
        if (audioFiles && audioFiles.length > 0) {
          audioFiles.forEach((audioFile, index) => {
            if (audioFile.path && require('fs').existsSync(audioFile.path)) {
              archive.file(audioFile.path, {
                name: `audio/${audioFile.filename || `chapter_${index + 1}.${audioFormat}`}`
              });
            }
          });
        }

        // 添加字幕文件
        if (subtitleFile && subtitleFile.path && require('fs').existsSync(subtitleFile.path)) {
          archive.file(subtitleFile.path, {
            name: `subtitles/${subtitleFile.filename || 'subtitles.srt'}`
          });
        }

        // 添加文本文件
        if (includeTextFile) {
          const textContent = this.formatNovelContent(novelData, {
            includeMetadata: true,
            chapterSeparator: '\n---\n',
            format: 'txt'
          });
          archive.append(textContent, { name: 'novel.txt' });
        }

        // 添加元数据文件
        const metadata = {
          title: novelData.title,
          author: novelData.author,
          description: novelData.description,
          createdAt: novelData.createdAt,
          chapters: novelData.chapters?.length || 0,
          audioFiles: audioFiles?.length || 0,
          hasSubtitles: !!subtitleFile,
          generatedAt: new Date().toISOString()
        };
        archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

        archive.finalize();
      });

      // 移动到输出目录
      const finalPath = path.join(this.outputDir, packageName);
      await fs.rename(packagePath, finalPath);

      const stats = await fs.stat(finalPath);

      return {
        success: true,
        filename: packageName,
        filePath: finalPath,
        size: stats.size,
        format: 'zip',
        compressionLevel,
        createdAt: new Date().toISOString(),
        packageId,
        contents: {
          audioFiles: audioFiles?.length || 0,
          hasSubtitles: !!subtitleFile,
          hasTextFile: includeTextFile,
          hasMetadata: true
        }
      };
    } catch (error) {
      console.error('创建音频小说包失败:', error);
      throw error;
    }
  }

  /**
   * 获取输出文件列表
   */
  async getOutputFiles(filters = {}) {
    try {
      const { type, format, search, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

      const files = [];
      const items = await fs.readdir(this.outputDir);

      for (const item of items) {
        const itemPath = path.join(this.outputDir, item);
        const stats = await fs.stat(itemPath);

        if (stats.isFile()) {
          const ext = path.extname(item).slice(1).toLowerCase();
          const fileInfo = {
            filename: item,
            name: path.parse(item).name,
            size: stats.size,
            format: ext,
            type: this.getFileType(ext),
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString(),
            path: itemPath
          };

          // 应用过滤器
          if (type && fileInfo.type !== type) continue;
          if (format && fileInfo.format !== format) continue;
          if (search && !item.toLowerCase().includes(search.toLowerCase())) continue;

          files.push(fileInfo);
        }
      }

      // 排序
      files.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        return sortOrder === 'desc' ? -comparison : comparison;
      });

      return files;
    } catch (error) {
      console.error('获取输出文件列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取文件类型
   */
  getFileType(extension) {
    for (const [type, extensions] of Object.entries(this.supportedFormats)) {
      if (extensions.includes(extension)) {
        return type;
      }
    }
    return 'unknown';
  }

  /**
   * 读取文件内容
   */
  async getFileContent(filename, options = {}) {
    try {
      const filePath = path.join(this.outputDir, filename);
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        throw new Error('文件不存在');
      }

      const { encoding = 'utf-8', maxSize = 10 * 1024 * 1024 } = options; // 默认最大10MB

      if (stats.size > maxSize) {
        throw new Error('文件过大');
      }

      const content = await fs.readFile(filePath, encoding);
      const ext = path.extname(filename).slice(1).toLowerCase();
      const type = this.getFileType(ext);

      return {
        success: true,
        filename,
        content,
        size: stats.size,
        format: ext,
        type,
        encoding,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString()
      };
    } catch (error) {
      console.error('读取文件内容失败:', error);
      throw error;
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(filename) {
    try {
      const filePath = path.join(this.outputDir, filename);
      await fs.unlink(filePath);

      return {
        success: true,
        filename,
        deletedAt: new Date().toISOString()
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('文件不存在');
      }
      console.error('删除文件失败:', error);
      throw error;
    }
  }

  /**
   * 批量删除文件
   */
  async deleteFiles(filenames) {
    const results = [];
    const errors = [];

    for (const filename of filenames) {
      try {
        const result = await this.deleteFile(filename);
        results.push(result);
      } catch (error) {
        errors.push({
          filename,
          error: error.message
        });
      }
    }

    return {
      success: errors.length === 0,
      deleted: results,
      errors,
      summary: {
        total: filenames.length,
        deleted: results.length,
        failed: errors.length
      }
    };
  }

  /**
   * 重命名文件
   */
  async renameFile(oldFilename, newFilename) {
    try {
      const oldPath = path.join(this.outputDir, oldFilename);
      const newPath = path.join(this.outputDir, newFilename);

      await fs.rename(oldPath, newPath);

      return {
        success: true,
        oldFilename,
        newFilename,
        renamedAt: new Date().toISOString()
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('原文件不存在');
      }
      console.error('重命名文件失败:', error);
      throw error;
    }
  }

  /**
   * 获取文件统计信息
   */
  async getFileStats() {
    try {
      const files = await this.getOutputFiles();

      const stats = {
        totalFiles: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        typeDistribution: {},
        formatDistribution: {},
        sizeDistribution: {
          small: 0,    // < 1MB
          medium: 0,   // 1MB - 10MB
          large: 0,    // 10MB - 100MB
          xlarge: 0    // > 100MB
        },
        recentFiles: files
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10)
      };

      // 统计类型和格式分布
      files.forEach(file => {
        // 类型分布
        stats.typeDistribution[file.type] = (stats.typeDistribution[file.type] || 0) + 1;

        // 格式分布
        stats.formatDistribution[file.format] = (stats.formatDistribution[file.format] || 0) + 1;

        // 大小分布
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB < 1) {
          stats.sizeDistribution.small++;
        } else if (sizeMB < 10) {
          stats.sizeDistribution.medium++;
        } else if (sizeMB < 100) {
          stats.sizeDistribution.large++;
        } else {
          stats.sizeDistribution.xlarge++;
        }
      });

      return stats;
    } catch (error) {
      console.error('获取文件统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 清理临时文件
   */
  async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) { // 默认24小时
    try {
      const items = await fs.readdir(this.tempDir);
      const now = Date.now();
      let deletedCount = 0;
      let deletedSize = 0;

      for (const item of items) {
        const itemPath = path.join(this.tempDir, item);
        const stats = await fs.stat(itemPath);

        if (stats.isFile() && (now - stats.mtime.getTime()) > maxAge) {
          deletedSize += stats.size;
          await fs.unlink(itemPath);
          deletedCount++;
        }
      }

      return {
        success: true,
        deletedCount,
        deletedSize,
        cleanedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('清理临时文件失败:', error);
      throw error;
    }
  }
}

module.exports = FileOutputService;