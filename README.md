# CloudPaste-SH

CloudPaste-SH 是一个现代化的在线文本分享平台，支持 Markdown 编辑和实时预览功能。它提供了一个简洁优雅的界面，让用户可以轻松地分享和管理文本内容。

## ✨ 功能特点

- 🎨 支持自动/明亮/暗黑主题切换
- 📝 Markdown 编辑器，支持实时预览
- 👀 访问次数限制功能
- ⏰ 内容过期时间设置
- 📱 响应式设计，支持移动端
- 🔗 生成分享链接和二维码
- 📤 导出为 PDF/PNG 格式
- 🛡️ 安全的文本存储

## 🚀 快速开始

### 环境要求

- Node.js >= 14
- npm >= 6

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/shan-hee/CloudPaste-SH.git
cd CloudPaste-SH
```

2. 安装依赖
```bash
# 安装主项目依赖
npm install

# 安装服务端依赖
cd server
npm install
```

3. 配置环境变量
```bash
# 复制示例配置文件
cp .env.example .env

# 编辑 .env 文件，设置必要的环境变量
```

4. 启动项目
```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## 🔧 配置说明

主要配置项包括：

- `PORT`: 服务器端口号
- `DATABASE_URL`: 数据库连接地址
- `STORAGE_TYPE`: 存储类型（本地/云存储）
- `MAX_FILE_SIZE`: 最大文件大小限制

## 🌟 主要特性说明

### Markdown 编辑器

- 支持常用 Markdown 语法
- 工具栏快捷操作
- 实时预览
- 代码高亮显示

### 主题切换

- 自动跟随系统主题
- 手动切换明亮/暗黑主题
- 平滑过渡动画

### 分享功能

- 生成分享链接
- 二维码分享
- 访问次数限制
- 过期时间设置

### 导出功能

- 支持导出为 PDF
- 支持导出为 PNG 图片
- 保持样式一致性

## 📝 开发说明

### 项目结构

```
CloudPaste-SH/
├── public/          # 静态资源
├── server/          # 服务端代码
├── src/             # 客户端源码
├── tests/           # 测试文件
└── package.json     # 项目配置
```

### 技术栈

- 前端：HTML5, CSS3, JavaScript
- 后端：Node.js, Express
- 存储：MongoDB/SQLite
- 部署：Docker 支持

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进项目。在提交 PR 之前，请确保：

1. 代码风格符合项目规范
2. 添加必要的测试用例
3. 更新相关文档

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者。
