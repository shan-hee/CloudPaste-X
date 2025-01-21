require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { setupRoutes } = require('./api/routes');
const { setupDatabase } = require('./infrastructure/database');
const { setupStorage } = require('./infrastructure/storage');
const { errorHandler } = require('./utils/errorHandler');

const app = express();

// 中间件配置
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 初始化数据库
setupDatabase();

// 初始化存储服务
setupStorage();

// 设置路由
setupRoutes(app);

// 错误处理
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 