# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于AI的小说创作和语音合成Web应用，支持多种AI模型配置和INDEX-TTS2语音合成。

## 常用开发命令

### 后端开发
```bash
cd backend && npm run dev                    # 启动开发服务器 (nodemon)
cd backend && npm start                     # 启动生产服务器
cd backend && npm test                      # 运行Jest测试
cd backend && npm run test:watch            # 监视模式运行测试
```

### 前端开发
```bash
cd frontend && npm run dev                  # 启动前端开发服务器
cd frontend && npm run build               # 构建生产版本
```

### 系统测试
```bash
cd backend && node test-core-system.js     # 运行核心系统测试
cd backend && node test-full-system.js     # 运行完整系统测试
cd backend && node test-simple-subtitle.js # 测试字幕功能
```

### Docker部署
```bash
docker-compose up -d                        # 后台启动所有服务
docker-compose down                         # 停止并删除容器
docker-compose logs -f backend             # 查看后端日志
```

### Agent Foreman管理
```bash
./agent-foreman.sh status                   # 查看功能状态
./agent-foreman.sh next                     # 开始下一个功能
./agent-foreman.sh done <feature-id>        # 标记功能完成
```

## 架构概览

### 后端架构
- **Express.js 服务器**: 主服务器文件在 `backend/src/server.js`，默认端口3001
- **API路由模块化**: 每个功能模块有独立的路由文件 (`backend/routes/`)
  - `/api/models` - AI模型管理
  - `/api/novel` - 小说创建和管理
  - `/api/analysis` - 角色分析
  - `/api/tts` - 语音合成
  - `/api/subtitle` - 字幕生成
  - `/api/file-output` - 文件输出管理
- **服务层**: 业务逻辑在 `backend/src/services/` 目录
- **中间件**: 错误处理、安全配置、CORS等在 `backend/src/middleware/`

### 前端架构
- **Vue 3 + Composition API**: 现代化响应式框架
- **Element Plus**: UI组件库
- **Pinia**: 状态管理
- **Vue Router**: 路由管理

### 数据流
1. 前端通过Axios调用后端API
2. 后端服务层处理业务逻辑
3. 文件存储使用本地文件系统 (`backend/data/`)
4. AI API调用通过统一的AIService处理

### 关键设计模式
- **RESTful API设计**: 统一的响应格式和错误处理
- **服务层模式**: 业务逻辑与路由分离
- **模拟模式**: TTS功能支持模拟模式用于开发测试
- **文件管理**: 统一的文件输出和管理系统

## AI功能工作流程

### 小说创作流程
1. **模型选择**: 通过 `/api/models` 获取可用AI模型
2. **创建小说**: POST `/api/novel/create` 使用选择的prompt和模型
3. **生成内容**: POST `/api/novel/{id}/generate` 调用AI生成小说内容
4. **内容编辑**: PUT `/api/novel/{id}/content` 修改和确认内容

### 语音合成流程
1. **角色分析**: POST `/api/analysis/analyze/{novelId}` 分析小说角色
2. **音色匹配**: 系统自动为角色分配音色参数
3. **TTS生成**: POST `/api/tts/generate/{novelId}` 生成音频文件
4. **字幕同步**: POST `/api/subtitle/generate-from-tts` 生成同步字幕

### 文件输出管理
- 所有输出文件存储在 `backend/data/` 对应子目录
- 支持的格式: 小说文本、SRT字幕、音频文件(mp3/wav/ogg)
- 文件管理API: `/api/file-output/files` 获取文件列表和下载

## 功能状态管理

使用 `ai/feature_list.json` 跟踪功能开发状态，当前状态：

### ✅ 已完成功能
- setup-ai-models: AI模型配置管理
- novel-generation: AI小说生成
- novel-analysis: 小说角色分析
- tts-integration: TTS语音合成
- subtitle-generation: SRT字幕生成
- frontend-backend-separation: 前后端分离
- docker-deployment: Docker部署

### ⚠️ 待完成功能
- file-output: 多格式文件输出功能

## 环境配置

### 端口配置
- 后端API: 3001 (开发环境)
- 前端服务: 8080
- 生产环境: 80 (通过Nginx)

### 重要环境变量
```bash
PORT=3001                                   # 后端服务端口
NODE_ENV=development                        # 环境模式
AI_API_KEYS_CONFIGURED=true                 # AI API密钥配置状态
```

### AI模型配置
模型配置存储在内存中，支持：
- OpenAI GPT系列
- Anthropic Claude系列
- Google Gemini系列
- 阿里通义千问系列

## 测试策略

### 测试文件组织
- `test-core-system.js`: 核心API功能测试
- `test-full-system.js`: 完整工作流程测试
- `test-simple-subtitle.js`: 字幕功能专项测试
- 各功能模块的独立测试文件

### 测试覆盖范围
1. **API端点测试**: 验证所有REST API的可用性
2. **核心工作流**: 小说创建→分析→TTS→字幕的完整流程
3. **文件管理**: 字幕文件、音频文件的生成和管理
4. **错误处理**: 各种异常情况的处理能力

### 运行测试的注意事项
- 确保后端服务在3001端口运行
- 测试使用模拟模式，不需要真实的AI API密钥
- 测试结果会自动保存为JSON文件

## 开发注意事项

### 代码约定
- 使用统一的错误处理机制 (`middleware/errorHandler.js`)
- API响应格式统一使用 `APIConfig.createSuccessResponse()`
- 文件操作使用 `fs.promises` 进行异步处理
- 时间格式统一使用ISO 8601标准

### 安全考虑
- 使用Helmet中间件增强安全性
- CORS配置允许前后端分离部署
- 输入验证使用Joi进行数据校验
- 敏感信息通过环境变量管理

### 性能优化
- 文件大小限制设置为10MB
- 使用流式处理处理大文件
- 合理设置请求超时时间(30秒)

## 故障排除

### 常见问题
1. **端口冲突**: 默认使用3001端口，如冲突可修改环境变量
2. **AI API错误**: 检查API密钥配置和网络连接
3. **文件权限**: 确保 `backend/data/` 目录有写入权限
4. **nodemon重启**: 开发文件修改可能触发服务重启

### 调试技巧
- 使用 `console.log` 进行调试，nodemon会自动重启
- 查看生成的测试报告文件了解系统状态
- 使用浏览器开发者工具检查前端API调用
- 通过 `/api-docs` 查看完整的API文档