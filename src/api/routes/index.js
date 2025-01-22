const express = require('express');
const shareRoutes = require('./share');
const adminRoutes = require('./admin');
const fileRoutes = require('./file');
const authRoutes = require('./auth');
const { authMiddleware } = require('../middlewares/auth');
const { AppError } = require('../../utils/errorHandler');

const setupRoutes = (app) => {
  const apiRouter = express.Router();

  // 公开路由
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/share', shareRoutes);
  apiRouter.use('/admin', adminRoutes);

  // 需要认证的路由
  apiRouter.use('/file', fileRoutes);

  // 健康检查
  apiRouter.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Service is healthy',
      timestamp: Date.now()
    });
  });

  // 404 处理
  apiRouter.use((req, res, next) => {
    next(new AppError(`找不到路径: ${req.originalUrl}`, 404));
  });

  // 注册 API 路由
  app.use('/api', apiRouter);

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