const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const modelsRouter = require('../routes/models');
const novelRouter = require('../routes/novel');
const analysisRouter = require('../routes/analysis');
const ttsRouter = require('../routes/tts');
const { errorHandler } = require('../middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api/models', modelsRouter);
app.use('/api/novel', novelRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/tts', ttsRouter);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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