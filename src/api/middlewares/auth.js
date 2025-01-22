const { AppError } = require('../../utils/errorHandler');
const { logger } = require('../../utils/logger');
const userRepository = require('../../core/repositories/UserRepository');

const authMiddleware = async (req, res, next) => {
  try {
    // 从请求头或 cookie 中获取 sessionId
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;

    if (!sessionId) {
      logger.warn('未提供会话ID');
      throw new AppError('需要登录', 401);
    }

    // 验证会话
    const session = await userRepository.validateSession(sessionId);
    if (!session) {
      logger.warn('无效的会话ID:', sessionId);
      throw new AppError('会话已过期，请重新登录', 401);
    }

    // 将用户信息添加到请求对象中
    req.user = {
      id: session.user_id,
      username: session.username,
      isAdmin: Boolean(session.is_admin)
    };
    req.sessionId = sessionId;

    next();
  } catch (error) {
    logger.error('认证失败:', error);
    next(new AppError(error.message || '认证失败', 401));
  }
};

// 管理员权限检查中间件
const adminMiddleware = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return next(new AppError('需要管理员权限', 403));
  }
  next();
};

module.exports = {
  authMiddleware,
  adminMiddleware
}; 