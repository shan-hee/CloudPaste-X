require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { setupRoutes } = require('./api/routes');
const { setupDatabase } = require('./infrastructure/database');
const { setupStorage } = require('./infrastructure/storage');
const { errorHandler } = require('./utils/errorHandler');
const { logger } = require('./utils/logger');

const app = express();

// 中间件配置
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://fonts.gstatic.com",
        "data:"
      ],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 初始化服务
const initializeApp = async () => {
  try {
    // 初始化数据库
    await setupDatabase();
    logger.info('数据库初始化完成');

    // 初始化存储服务
    await setupStorage();
    logger.info('存储服务初始化完成');

    // 设置路由
    setupRoutes(app);
    logger.info('路由设置完成');

    // 错误处理
    app.use(errorHandler);
  } catch (error) {
    logger.error('应用初始化失败:', error);
    process.exit(1);
  }
};

// 初始化应用
initializeApp();

module.exports = app; 