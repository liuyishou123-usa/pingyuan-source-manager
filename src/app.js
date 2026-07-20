require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');
const scheduler = require('./scheduler');
const sourcesRoutes = require('./routes/sources');
const statusRoutes = require('./routes/status');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 初始化数据库
db.init();

// 路由
app.use('/api/sources', sourcesRoutes);
app.use('/api/status', statusRoutes);

// 主页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error('API 错误:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || '服务器内部错误'
  });
});

// 启动服务器
app.listen(PORT, () => {
  logger.info(`🚀 服务器启动成功，监听端口 ${PORT}`);
  logger.info(`📊 管理界面: http://localhost:${PORT}`);
  logger.info(`🔄 定时任务已启动`);
  
  // 初始化定时器
  scheduler.initScheduler();
});

module.exports = app;
