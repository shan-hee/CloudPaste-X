const express = require('express');
const fetch = require('node-fetch');
const shareRoutes = require('./share');
const adminRoutes = require('./admin');
const fileRoutes = require('./file');
const authRoutes = require('./auth');
const { authMiddleware } = require('../middlewares/auth');
const { AppError } = require('../../utils/errorHandler');
const shareService = require('../../core/services/ShareService');

const setupRoutes = (app) => {
  const apiRouter = express.Router();

  // 静态文件服务 - 需要在最前面
  app.use('/', express.static('public', {
    setHeaders: (res, path) => {
      // 设置正确的 MIME 类型
      if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));

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

  // 处理分享链接
  app.get('/s/:id', async (req, res) => {
    try {
      // 获取分享内容类型
      const shareId = req.params.id;
      const share = await shareService.getShare(shareId);
      
      // 根据分享类型返回不同的页面
      if (share && share.type === 'file') {
        // 设置 CSP 头
        res.setHeader('Content-Security-Policy', `
          default-src 'self';
          script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://html2canvas.hertzen.com;
          style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com;
          img-src 'self' data: https:;
          font-src 'self' data: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net;
          connect-src 'self';
          frame-src 'none';
          object-src 'none'
        `.replace(/\s+/g, ' ').trim());
        
        res.sendFile('file-preview.html', { root: 'public' });
      } else {
        // 文本分享使用原有页面
        res.setHeader('Content-Security-Policy', `
          default-src 'self';
          script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://html2canvas.hertzen.com;
          style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com;
          img-src 'self' data: https:;
          font-src 'self' data: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net;
          connect-src 'self';
          frame-src 'none';
          object-src 'none'
        `.replace(/\s+/g, ' ').trim());
        
        res.sendFile('share.html', { root: 'public' });
      }
    } catch (error) {
      console.error('处理分享链接失败:', error);
      res.sendFile('share.html', { root: 'public' });
    }
  });

  // SPA 路由处理
  app.get('*', (req, res) => {
    res.sendFile('index.html', { root: 'public' });
  });
};

module.exports = {
  setupRoutes
}; 