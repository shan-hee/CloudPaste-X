# CloudPaste-X 文档中心

这里是 CloudPaste-X 的详细文档。

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

## 📚 文档导航

- [用户指南](guides/README.md) - 详细的使用说明和功能介绍
- [部署指南](guides/deployment.md) - 部署和配置说明
- [API文档](api/README.md) - API接口说明
- [开发指南](development/README.md) - 开发者指南和贡献说明

## 🏗️ 项目结构

```
CloudPaste-X/
├── src/
│   ├── api/           # API路由和控制器
│   ├── core/          # 核心业务逻辑
│   ├── infrastructure/# 基础设施层
│   └── utils/         # 工具类
├── public/            # 静态资源
├── tests/             # 测试文件
└── docs/             # 项目文档
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

本项目采用 [MIT](../LICENSE) 许可证。

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者。
感谢原作者 [ling-drag0n](https://github.com/ling-drag0n) 的贡献。 