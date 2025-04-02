# CloudPaste-X 文档中心

欢迎使用 CloudPaste-X 文档中心。本文档提供了全面的使用指南、部署说明和开发参考。

## 📚 文档导航

### 💡 快速入门
- [功能概览](guides/features.md) - 核心功能一览
- [快速部署](guides/quickstart.md) - 5分钟内完成部署
- [常见问题](guides/faq.md) - 常见问题解答

### 📖 用户指南
- [使用手册](guides/README.md) - 详细的功能使用说明
- [管理员指南](guides/admin.md) - 管理员功能与最佳实践

### 🔧 部署与运维
- [部署指南](guides/deployment.md) - 多种部署方式详解
- [Docker部署](guides/docker-deployment.md) - Docker容器化部署
- [GHCR部署](guides/ghcr-deployment.md) - 使用GitHub Actions与GHCR部署
- [配置参考](guides/configuration.md) - 环境变量与配置项说明
- [监控与日志](guides/monitoring.md) - 系统监控与日志管理
- [性能优化](guides/performance.md) - 系统性能调优指南
- [升级指南](guides/upgrade.md) - 版本升级步骤

### 🔌 API参考
- [API概述](api/README.md) - API使用总览
- [认证与授权](api/auth.md) - API认证机制
- [分享管理](api/sharing.md) - 分享相关API
- [用户管理](api/users.md) - 用户相关API
- [系统管理](api/system.md) - 系统相关API

### 💻 开发者指南
- [开发环境](development/README.md) - 开发环境搭建
- [代码规范](development/coding-standards.md) - 代码风格与规范
- [架构设计](development/architecture.md) - 系统架构说明
- [测试指南](development/testing.md) - 单元测试与集成测试
- [贡献指南](development/contributing.md) - 如何参与项目贡献

## 🏗️ 项目架构

CloudPaste-X采用模块化架构设计，各组件职责明确，便于维护与扩展：

```
CloudPaste-X/
├── src/
│   ├── api/           # API路由和控制器
│   ├── core/          # 核心业务逻辑
│   ├── infrastructure/# 基础设施层
│   └── utils/         # 工具类
├── public/            # 静态资源
├── tests/             # 测试文件
└── docs/              # 项目文档
```

## 🛠️ 技术栈

CloudPaste-X基于现代化技术栈构建：

- **后端**: Node.js + Express.js
- **数据库**: SQLite3
- **存储**: S3兼容接口 (AWS S3/MinIO)
- **容器化**: Docker + Docker Compose
- **监控**: Prometheus + Express Actuator
- **日志**: Winston

## 🔐 安全特性

- **访问控制**: 基于角色的权限系统
- **数据保护**: 内容加密与访问限制
- **API安全**: JWT认证与速率限制
- **输入验证**: 严格的请求验证机制
- **安全响应**: 默认安全响应头
- **审计日志**: 关键操作完整日志记录

## 📋 版本历史

查看我们的[版本发布历史](guides/changelog.md)了解每个版本的新功能、改进和修复。

## 📱 社区支持

- [GitHub Issues](https://github.com/shan-hee/CloudPaste-X/issues) - 报告问题或提出建议
- [GitHub Discussions](https://github.com/shan-hee/CloudPaste-X/discussions) - 参与讨论

## 📄 许可证

本项目采用 [MIT](../LICENSE) 许可证。 