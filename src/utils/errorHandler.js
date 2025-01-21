const { logger } = require('./logger');

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    logger.error('错误详情:', {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode
    });

    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err
    });
  } else {
    // 生产环境
    logger.error('错误:', err.message);

    if (err.isOperational) {
      res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message
      });
    } else {
      // 编程错误：不向客户端泄露错误详情
      res.status(500).json({
        success: false,
        status: 'error',
        message: '服务器内部错误'
      });
    }
  }
};

module.exports = {
  AppError,
  errorHandler
}; 