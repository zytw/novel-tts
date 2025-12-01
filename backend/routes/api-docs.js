const express = require('express');
const APIConfig = require('../src/config/api');

const router = express.Router();

/**
 * API 文档路由
 * 提供交互式 API 文档和接口信息
 */

// 获取 API 文档首页
router.get('/', (req, res) => {
  try {
    const docs = APIConfig.getAPIDocumentation();

    // 返回 HTML 文档页面
    const html = generateAPIDocumentationHTML(docs);

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('获取 API 文档失败:', error);
    res.status(500).json({
      success: false,
      error: '获取 API 文档失败',
      details: error.message
    });
  }
});

// 获取 JSON 格式的 API 文档
router.get('/json', (req, res) => {
  try {
    const docs = APIConfig.getAPIDocumentation();
    res.json({
      success: true,
      data: docs
    });
  } catch (error) {
    console.error('获取 API 文档失败:', error);
    res.status(500).json({
      success: false,
      error: '获取 API 文档失败',
      details: error.message
    });
  }
});

// 获取错误代码列表
router.get('/error-codes', (req, res) => {
  try {
    const errorCodes = APIConfig.getErrorCodes();
    res.json({
      success: true,
      data: errorCodes
    });
  } catch (error) {
    console.error('获取错误代码失败:', error);
    res.status(500).json({
      success: false,
      error: '获取错误代码失败',
      details: error.message
    });
  }
});

// 获取环境配置信息
router.get('/config', (req, res) => {
  try {
    const config = APIConfig.getEnvironmentConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('获取环境配置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取环境配置失败',
      details: error.message
    });
  }
});

/**
 * 生成 HTML 格式的 API 文档
 */
function generateAPIDocumentationHTML(docs) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${docs.info.title} - API 文档</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 0;
            text-align: center;
            margin-bottom: 30px;
            border-radius: 10px;
        }
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        .info-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .info-item {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 6px;
            border-left: 4px solid #007bff;
        }
        .info-label {
            font-weight: 600;
            color: #495057;
            margin-bottom: 5px;
        }
        .info-value {
            color: #6c757d;
            font-family: 'Monaco', 'Menlo', monospace;
        }
        .endpoints-section {
            margin-top: 40px;
        }
        .endpoint-group {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            overflow: hidden;
        }
        .group-header {
            background: #343a40;
            color: white;
            padding: 15px 20px;
            font-size: 1.3rem;
            font-weight: 600;
        }
        .endpoint-list {
            padding: 0;
        }
        .endpoint-item {
            border-bottom: 1px solid #e9ecef;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 15px;
            transition: background-color 0.2s;
        }
        .endpoint-item:hover {
            background-color: #f8f9fa;
        }
        .endpoint-item:last-child {
            border-bottom: none;
        }
        .method-badge {
            padding: 6px 12px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 0.85rem;
            min-width: 70px;
            text-align: center;
        }
        .method-GET { background-color: #28a745; color: white; }
        .method-POST { background-color: #007bff; color: white; }
        .method-PUT { background-color: #ffc107; color: #212529; }
        .method-DELETE { background-color: #dc3545; color: white; }
        .endpoint-path {
            font-family: 'Monaco', 'Menlo', monospace;
            background: #f8f9fa;
            padding: 8px 12px;
            border-radius: 4px;
            flex: 1;
            min-width: 0;
        }
        .endpoint-description {
            color: #6c757d;
            font-size: 0.95rem;
        }
        .error-codes {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 20px;
            margin-top: 30px;
        }
        .error-table {
            width: 100%;
            margin-top: 20px;
            border-collapse: collapse;
        }
        .error-table th,
        .error-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
        }
        .error-table th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #495057;
        }
        .code-badge {
            background: #e9ecef;
            padding: 4px 8px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
        }
        .footer {
            text-align: center;
            padding: 30px 0;
            color: #6c757d;
            border-top: 1px solid #e9ecef;
            margin-top: 40px;
        }
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            .header h1 {
                font-size: 2rem;
            }
            .endpoint-item {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
            .method-badge {
                min-width: auto;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${docs.info.title}</h1>
            <p>${docs.info.description} (版本 ${docs.info.version})</p>
            <p style="margin-top: 15px; font-size: 0.9rem;">
                <strong>基础URL:</strong> ${docs.info.baseUrl} |
                <strong>环境:</strong> ${docs.info.environment}
            </p>
        </div>

        <div class="info-card">
            <h2>📋 基本信息</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">服务器地址</div>
                    <div class="info-value">${docs.info.baseUrl}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">API 版本</div>
                    <div class="info-value">${docs.info.version}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">运行环境</div>
                    <div class="info-value">${docs.info.environment}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">请求格式</div>
                    <div class="info-value">JSON</div>
                </div>
            </div>
        </div>

        <div class="endpoints-section">
            <h2>🔌 API 接口文档</h2>
            ${Object.entries(docs.endpoints).map(([groupKey, group]) => `
                <div class="endpoint-group">
                    <div class="group-header">${getGroupTitle(groupKey)}</div>
                    <div class="endpoint-list">
                        ${group.endpoints.map(endpoint => `
                            <div class="endpoint-item">
                                <span class="method-badge method-${endpoint.method}">${endpoint.method}</span>
                                <code class="endpoint-path">${group.base}${endpoint.path}</code>
                                <span class="endpoint-description">${endpoint.description}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="error-codes">
            <h2>❌ 错误代码说明</h2>
            <table class="error-table">
                <thead>
                    <tr>
                        <th>错误代码</th>
                        <th>代码值</th>
                        <th>错误说明</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(docs.errorCodes).map(([key, error]) => `
                        <tr>
                            <td><code class="code-badge">${key}</code></td>
                            <td>${error.code}</td>
                            <td>${error.message}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>📖 API 文档生成时间: ${new Date().toLocaleString('zh-CN')}</p>
            <p>🚀 由 AI Novel TTS 系统提供支持</p>
        </div>
    </div>

    <script>
        // 简单的交互功能
        document.querySelectorAll('.endpoint-item').forEach(item => {
            item.addEventListener('click', function() {
                const path = this.querySelector('.endpoint-path').textContent;
                navigator.clipboard.writeText(path).then(() => {
                    const originalBg = this.style.backgroundColor;
                    this.style.backgroundColor = '#d4edda';
                    setTimeout(() => {
                        this.style.backgroundColor = originalBg;
                    }, 300);
                });
            });
        });
    </script>
</body>
</html>`;
}

/**
 * 获取分组标题
 */
function getGroupTitle(groupKey) {
  const titles = {
    models: '🤖 AI 模型管理',
    novel: '📝 小说生成',
    analysis: '🔍 角色分析',
    tts: '🔊 TTS 语音合成',
    subtitle: '📹 字幕生成',
    fileOutput: '📁 文件输出管理'
  };
  return titles[groupKey] || groupKey;
}

module.exports = router;