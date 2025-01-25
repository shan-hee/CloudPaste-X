import express from 'express';
import fetch from 'node-fetch';
import shareRoutes from './share.js';
import adminRoutes from './admin.js';
import fileRoutes from './file.js';
import authRoutes from './auth.js';
import { authMiddleware } from '../middlewares/auth.js';
import { AppError } from '../../utils/errorHandler.js';
import shareService from '../../core/services/ShareService.js';

export const setupRoutes = (app) => {
  const router = express.Router();

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

  // 健康检查
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Service is healthy',
      timestamp: Date.now()
    });
  });

  // 公开路由
  router.use('/auth', authRoutes);
  router.use('/share', shareRoutes);
  router.use('/admin', adminRoutes);
  router.use('/file', fileRoutes);

  // 404 处理
  router.use((req, res, next) => {
    next(new AppError(`找不到路径: ${req.originalUrl}`, 404));
  });

  // 注册 API 路由
  app.use('/api', router);

  // 处理分享链接
  app.get('/s/:id', async (req, res) => {
    try {
      // 获取分享内容类型
      const shareId = req.params.id;
      const password = req.headers['x-password'];
      const isApiRequest = req.headers['x-requested-with'] === 'XMLHttpRequest';
      const isDownloadRequest = req.query.download === 'true';

      try {
        const share = await shareService.getShare(shareId, password);
        
        // 如果是下载请求
        if (isDownloadRequest && share.type === 'file') {
          res.setHeader('Content-Type', share.mimetype || 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(share.filename)}"`);
          return res.send(share.content);
        }

        // 如果是API请求，返回JSON数据
        if (isApiRequest) {
          // 如果是文件类型，不返回文件内容，只返回元数据
          if (share.type === 'file') {
            const { content, ...metadata } = share;
            return res.json({
              success: true,
              data: metadata
            });
          }
          return res.json({
            success: true,
            data: share
          });
        }

        // 否则返回HTML页面
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
        // 如果是密码错误且是API请求或下载请求
        if (error.statusCode === 401 && (isApiRequest || isDownloadRequest)) {
          return res.status(401).json({
            success: false,
            message: '需要密码访问',
            requirePassword: true
          });
        }
        
        // 其他错误或非API请求，返回HTML页面
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