import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { setupRoutes } from './api/routes/index.js';
import { setupDatabase } from './infrastructure/database/index.js';
import { setupStorage } from './infrastructure/storage/index.js';
import { errorHandler } from './utils/errorHandler.js';
import { logger } from './utils/logger.js';

const app = express();

// CORS配置
app.use(cors({
  origin: process.env.PUBLIC_URL || 'http://localhost:3000',
  credentials: true
}));

// 中间件配置
app.use(helmet({
  contentSecurityPolicy: false, // 我们会在路由中单独设置CSP
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// 将环境变量传递给前端
app.use((req, res, next) => {
  // 注入环境变量到前端页面
  const originalSend = res.send;
  res.send = function (body) {
    if (typeof body === 'string' && body.includes('</head>')) {
      const envScript = `<script>
        window.ENV = {
          MAX_FILE_SIZE: ${process.env.MAX_FILE_SIZE || 0.1}, // 默认0.1GB
          PUBLIC_URL: '${process.env.PUBLIC_URL || 'http://localhost:3000'}'
        };
      </script>`;
      body = body.replace('</head>', envScript + '</head>');
    }
    return originalSend.call(this, body);
  };
  next();
});

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

export default app; 