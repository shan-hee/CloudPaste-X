import rateLimit from 'express-rate-limit';
import { AppError } from '../../utils/errorHandler.js';

const createRateLimit = (options = {}) => {
  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 默认15分钟
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 默认100次请求
    message: {
      success: false,
      message: '请求过于频繁，请稍后再试'
    },
    ...options,
    handler: (req, res, next) => {
      next(new AppError('请求过于频繁，请稍后再试', 429));
    }
  });
};

// 创建不同场景的限流器
const limiter = {
  // 创建分享的限流
  create: createRateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: 10 // 最多10次
  }),

  // 访问分享的限流
  access: createRateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: 30 // 最多30次
  }),

  // 验证密码的限流
  verify: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 5 // 最多5次
  })
};

const create = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 默认15分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 默认限制100次请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  }
});

const access = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 60, // 每分钟60次
  message: {
    success: false,
    message: '访问过于频繁，请稍后再试'
  }
});

export default limiter; 