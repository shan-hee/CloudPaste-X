const express = require('express');
const shareRoutes = require('./share');
const { AppError } = require('../../utils/errorHandler');

const setupRoutes = (app) => {
  const router = express.Router();

  // API 路由
  router.use('/shares', shareRoutes);

  // 健康检查
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Service is healthy',
      timestamp: Date.now()
    });
  });

  // 404 处理
  router.use((req, res, next) => {
    next(new AppError(`找不到路径: ${req.originalUrl}`, 404));
  });

  // 注册 API 路由
  app.use('/api', router);

  // 静态文件服务
  app.use(express.static('public'));

  // SPA 路由处理
  app.get('*', (req, res) => {
    res.sendFile('index.html', { root: 'public' });
  });
};

module.exports = {
  setupRoutes
}; 