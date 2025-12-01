# AI小说创作与语音合成平台

一个基于AI的小说创作和语音合成Web应用，支持多种AI模型配置和INDEX-TTS2语音合成。

## 功能特性

### ✅ 已完成功能
- **AI模型配置管理** - 支持多种主流AI模型的配置和管理
- **前后端分离架构** - Vue3前端 + Node.js后端
- **Docker容器化部署** - 一键部署支持
- **响应式界面** - 基于Element Plus的现代化UI

### 🚧 开发中功能
- **AI小说生成** - 使用AI模型创作小说内容
- **角色分析** - AI分析小说角色和情感
- **语音合成** - 集成INDEX-TTS2生成多角色语音
- **字幕生成** - 同步生成SRT字幕文件
- **文件导出** - 多格式文件输出和管理

## 技术栈

### 前端
- **Vue 3** - 现代化前端框架
- **Element Plus** - UI组件库
- **Pinia** - 状态管理
- **Vue Router** - 路由管理
- **Axios** - HTTP客户端

### 后端
- **Node.js** - JavaScript运行时
- **Express.js** - Web框架
- **Joi** - 数据验证
- **Helmet** - 安全中间件
- **Crypto** - 加密库

### 部署
- **Docker** - 容器化
- **Docker Compose** - 服务编排
- **Nginx** - Web服务器
- **Redis** - 缓存服务（可选）

## 快速开始

### 环境要求
- Node.js 18+
- Docker & Docker Compose
- Git

### 本地开发

1. **克隆项目**
```bash
git clone <repository-url>
cd 有声小说
```

2. **安装后端依赖**
```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量
npm run dev
```

3. **安装前端依赖**
```bash
cd frontend
npm install
npm run dev
```

4. **访问应用**
- 前端：http://localhost:8080
- 后端API：http://localhost:3000

### Docker部署

1. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量
```

2. **启动服务**
```bash
docker-compose up -d
```

3. **访问应用**
- 应用地址：http://localhost
- API地址：http://localhost/api

## API文档

### AI模型管理

#### 获取所有模型
```
GET /api/models
```

#### 获取默认模型
```
GET /api/models/default
```

#### 设置默认模型
```
PUT /api/models/default
{
  "modelId": "gpt-4"
}
```

#### 添加新模型
```
POST /api/models
{
  "id": "gpt-4",
  "name": "GPT-4",
  "provider": "OpenAI",
  "type": "text-generation",
  "apiKey": "your-api-key",
  "settings": {
    "temperature": 0.7,
    "maxTokens": 2048
  }
}
```

#### 更新模型
```
PUT /api/models/:id
{
  "name": "Updated Model Name",
  "settings": {
    "temperature": 0.8
  }
}
```

#### 删除模型
```
DELETE /api/models/:id
```

## 项目结构

```
有声小说/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── server.js       # 主服务器文件
│   │   ├── models/         # 数据模型
│   │   ├── routes/         # API路由
│   │   └── middleware/     # 中间件
│   ├── package.json
│   └── Dockerfile
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── components/     # Vue组件
│   │   ├── views/          # 页面视图
│   │   ├── store/          # 状态管理
│   │   └── services/       # API服务
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── ai/                      # AI相关配置
├── prompts/                 # 小说生成模板
├── ai-models.json          # AI模型配置
├── docker-compose.yml      # Docker编排文件
├── .env.example            # 环境变量模板
└── README.md
```

## 开发指南

### 添加新的AI模型支持

1. 在 `backend/src/models/aiModel.js` 中添加模型验证逻辑
2. 在 `frontend/src/components/ModelDialog.vue` 中添加提供商选项
3. 更新API文档

### 扩展前端功能

1. 在 `frontend/src/views/` 中创建新页面
2. 在 `frontend/src/router/index.js` 中添加路由
3. 在 `frontend/src/components/` 中创建可复用组件

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 支持

如有问题或建议，请提交 Issue 或联系开发团队。

---

**注意：** 本项目仍在开发中，部分功能可能尚未完全实现。