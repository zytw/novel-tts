const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const APIConfig = require('./config/api');
const modelsRouter = require('../routes/models');
const novelRouter = require('../routes/novel');
const analysisRouter = require('../routes/analysis');
const ttsRouter = require('../routes/tts');
const subtitleRouter = require('../routes/subtitle');
const fileOutputRouter = require('../routes/fileOutput');
const apiDocsRouter = require('../routes/api-docs');
const { errorHandler } = require('../middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// 获取环境配置
const envConfig = APIConfig.getEnvironmentConfig();

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

// CORS 配置
app.use(cors({
  origin: envConfig.cors.origin,
  credentials: envConfig.cors.credentials,
  optionsSuccessStatus: envConfig.cors.optionsSuccessStatus,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 请求解析中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求ID中间件
app.use((req, res, next) => {
  req.requestId = APIConfig.generateRequestId();
  res.set('X-Request-ID', req.requestId);
  next();
});

// API 路由
app.use('/api/models', modelsRouter);
app.use('/api/novel', novelRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/tts', ttsRouter);
app.use('/api/subtitle', subtitleRouter);
app.use('/api/file-output', fileOutputRouter);

// API 文档路由
app.use('/api-docs', apiDocsRouter);

// 根路径重定向到 API 文档
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// 健康检查
app.get('/health', (req, res) => {
  res.json(APIConfig.createSuccessResponse({
    status: 'ok',
    server: envConfig.server,
    uptime: process.uptime(),
    version: APIConfig.version
  }, '服务运行正常', { requestId: req.requestId }));
});

// 错误处理中间件
app.use(errorHandler);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`AI Novel TTS Server running on port ${PORT}`);
});

module.exports = app;