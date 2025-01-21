import { logger } from '../utils/logger.js';

export const authMiddleware = (req, res, next) => {
  // 开发环境下跳过认证
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
    return next();
  }

  const sessionId = req.headers['x-session-id'] || req.cookies.sessionId;

  if (!sessionId) {
    logger.warn('未提供会话ID');
    return res.status(401).json({
      success: false,
      message: '请先登录'
    });
  }

  // TODO: 实现真实的会话验证
  if (sessionId !== process.env.ADMIN_TOKEN) {
    logger.warn(`无效的会话ID: ${sessionId}`);
    return res.status(401).json({
      success: false,
      message: '会话无效或已过期'
    });
  }

  next();
}; 