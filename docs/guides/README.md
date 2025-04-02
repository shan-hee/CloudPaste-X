# CloudPaste-X 用户指南

欢迎使用 CloudPaste-X 用户指南。本文档将帮助您了解系统的各项功能和使用方法。

## 🧭 文档导航

### 入门指南
- [快速入门](quickstart.md) - 5分钟内完成部署和基本设置
- [常见问题](faq.md) - 常见问题解答
- [功能概览](features.md) - CloudPaste-X 主要功能一览

### 部署指南
- [部署指南](deployment.md) - 全面的部署方法和配置说明
- [Docker部署](docker-deployment.md) - 使用Docker进行部署
- [GHCR部署](ghcr-deployment.md) - 使用GitHub Actions和GHCR部署
- [配置参考](configuration.md) - 详细的配置项说明

### 用户功能
- [文本分享功能](text-sharing.md) - 如何分享和管理文本内容
- [文件分享功能](file-sharing.md) - 如何分享和管理文件
- [Markdown支持](markdown.md) - Markdown格式支持详解
- [密码保护](password-protection.md) - 如何使用密码保护分享内容
- [过期设置](expiration.md) - 如何设置内容过期时间
- [主题切换](themes.md) - 切换暗色/亮色主题

### 管理功能
- [管理员指南](admin.md) - 管理员功能使用说明
- [用户管理](user-management.md) - 用户账户管理
- [内容管理](content-management.md) - 分享内容管理
- [系统设置](system-settings.md) - 系统配置管理

### 高级功能
- [API使用](../api/README.md) - API使用指南
- [自定义主题](custom-themes.md) - 自定义界面主题
- [集成指南](integration.md) - 与其他系统集成

### 维护与优化
- [性能优化](performance.md) - 系统性能优化指南
- [备份恢复](backup.md) - 数据备份和恢复指南
- [监控日志](monitoring.md) - 系统监控和日志管理
- [升级指南](upgrade.md) - 版本升级步骤

## 🏗️ 系统架构

CloudPaste-X 采用模块化设计，主要包含以下组件：

- **前端界面**: 响应式设计，支持移动设备
- **API服务**: RESTful API，提供所有核心功能
- **存储服务**: 支持文件存储和内容管理
- **数据库**: 使用SQLite存储元数据和用户信息
- **缓存系统**: 提高访问速度和系统响应能力
- **安全组件**: 保障数据安全和用户隐私

## 🚀 核心特性

CloudPaste-X 提供丰富的功能：

- **内容分享**: 支持文本、代码和文件分享
- **Markdown支持**: 富文本编辑和实时预览
- **安全特性**: 内容加密、密码保护、过期设置
- **管理功能**: 用户管理、内容管理、系统设置
- **主题支持**: 亮色/暗色主题切换
- **响应式设计**: 适配桌面和移动设备
- **API接口**: 提供完整的API，便于集成
- **多种部署**: 支持Docker、云平台等多种部署方式

## 🔮 未来规划

我们计划在未来版本中添加以下功能：

- 团队协作功能
- 更丰富的分享选项
- 增强的安全特性
- 更多存储后端支持
- 插件系统
- 国际化支持

## 🤝 贡献指南

欢迎为CloudPaste-X贡献代码或文档！请参考[开发者指南](../development/README.md)了解如何参与项目开发。

## 📞 获取帮助

如果您遇到问题或需要帮助，可以：

- 查阅[常见问题](faq.md)
- 在[GitHub Issues](https://github.com/shan-hee/CloudPaste-X/issues)提交问题
- 加入我们的社区讨论 