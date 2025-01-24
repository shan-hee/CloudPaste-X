# CloudPaste-X

CloudPaste-X 是一个现代化的在线文本分享平台，支持 Markdown 编辑和实时预览功能。2.0 版本支持独立部署，提供更灵活的存储选项和更好的可扩展性。

## 🚀 特性

- 支持独立部署，可在自有服务器上运行
- 使用 SQLite 数据库，便于维护
- 支持多种对象存储服务（S3、MinIO 等）
- Docker 容器化部署
- 模块化架构设计
- 完整的错误处理和日志记录
- 支持所有原有功能（Markdown、主题切换等）
- 分页列表和统计功能
- 文件自动清理机制
- 完整的监控和日志系统
- 安全性增强（速率限制、会话管理等）

## 🛠️ 技术栈

- 后端：Node.js + Express.js
- 数据库：SQLite3
- 对象存储：S3 兼容接口（AWS S3/MinIO）
- 容器化：Docker + Docker Compose
- 监控：Prometheus + Express Actuator
- 日志：Winston

## 📦 快速开始

### Docker 部署

1. 克隆仓库：
```bash
git clone https://github.com/shan-hee/CloudPaste-X
cd CloudPaste-X
```

2. 配置环境变量：
```bash
cp .env.example .env
# 编辑 .env 文件，填写必要的配置
```

3. 启动服务：
```bash
cd docker
docker compose up -d
```

### 手动部署

1. 安装依赖：
```bash
npm install
```

2. 配置环境变量：
```bash
cp .env.example .env
# 编辑 .env 文件
```

3. 初始化数据库：
```bash
npm run migrate
```

4. 启动服务：
```bash
npm start
```

## ⚙️ 环境变量

必要的环境变量：

- `PORT`: 服务端口号（默认 3000）
- `NODE_ENV`: 运行环境（development/production）
- `DATABASE_PATH`: SQLite 数据库文件路径
- `S3_ENDPOINT`: S3 兼容存储服务地址
- `S3_ACCESS_KEY`: 存储服务访问密钥
- `S3_SECRET_KEY`: 存储服务密钥
- `S3_BUCKET`: 存储桶名称
- `S3_REGION`: 存储区域
- `JWT_SECRET`: JWT 密钥
- `SESSION_SECRET`: 会话密钥
- `COOKIE_SECRET`: Cookie 密钥
- `RATE_LIMIT_WINDOW_MS`: 速率限制时间窗口
- `RATE_LIMIT_MAX_REQUESTS`: 速率限制最大请求数
- `MAX_FILE_SIZE`: 最大文件大小（字节）
- `LOG_LEVEL`: 日志级别
- `LOG_FILE_PATH`: 日志文件路径
- `ENABLE_REQUEST_LOGGING`: 是否启用请求日志
- `ENABLE_RESPONSE_CACHE`: 是否启用响应缓存
- `CACHE_DURATION`: 缓存时间（秒）

## 🏗️ 项目结构

```
CloudPaste-X/
├── server/
│   ├── src/
│   │   ├── controllers/     # 控制器层
│   │   ├── services/        # 服务层
│   │   ├── routes/          # 路由层
│   │   ├── utils/           # 工具类
│   │   └── app.js          # 主应用文件
│   └── tests/              # 测试文件
├── public/                 # 静态文件
├── docker/                 # Docker 配置
└── docs/                  # 项目文档
```

## 🔧 主要功能

### 分享功能
- 文本分享：支持 Markdown 格式
- 文件分享：支持多种文件类型
- 密码保护：可设置访问密码
- 过期时间：支持自定义过期时间
- 访问限制：可限制最大访问次数

### 管理功能
- 分享管理：查看、删除分享
- 统计信息：使用量统计
- 系统设置：存储配置等

### 安全特性
- 速率限制：防止恶意请求
- 会话管理：安全的用户会话
- 文件验证：类型和大小限制
- CORS 配置：可配置跨域访问
- 安全响应头：使用 Helmet 增强安全性

### 监控和日志
- 健康检查：系统状态监控
- 性能指标：Prometheus 指标收集
- 日志记录：分级日志系统
- 审计日志：关键操作记录

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request。在提交 PR 之前，请确保：

1. 代码符合项目规范
2. 添加必要的测试
3. 更新相关文档
4. 遵循 Git Commit 规范

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者。

## 感谢原作者

感谢原作者 [ling-drag0n](https://github.com/ling-drag0n) 的贡献。

