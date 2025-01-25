# CloudPaste-X

CloudPaste-X 是一个现代化的在线文本分享平台，支持 Markdown 编辑和实时预览功能。2.0 版本支持独立部署，提供更灵活的存储选项和更好的可扩展性。

## ✨ 主要特性

- 支持独立部署
- Markdown 编辑和实时预览
- 文件分享和管理
- Docker 容器化部署
- 安全性增强

## 🚀 快速开始

### Docker 部署（推荐）

```bash
# 克隆仓库
git clone https://github.com/shan-hee/CloudPaste-X
cd CloudPaste-X

# 配置环境
cp .env.example .env

# 启动服务
docker compose up -d
```

### 手动部署

```bash
# 安装依赖
npm install

# 配置环境
cp .env.example .env

# 启动服务
npm start
```

## 📚 文档

详细文档请查看 [文档中心](docs/README.md)：

- [用户指南](docs/guides/README.md)
- [部署指南](docs/guides/deployment.md)
- [API文档](docs/api/README.md)
- [开发指南](docs/development/README.md)

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。

## 🙏 致谢

感谢原作者 [ling-drag0n](https://github.com/ling-drag0n) 的贡献。

