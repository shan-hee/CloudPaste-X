# CloudPaste-SH

CloudPaste-SH 是一个现代化的在线文本分享平台，支持 Markdown 编辑和实时预览功能。它提供了一个简洁优雅的界面，让用户可以轻松地分享和管理文本内容。

## 项目说明

- 项目使用 [Vite](https://vitejs.dev/) 构建，使用纯 JavaScript 开发。
- 后端使用 [Cloudflare Workers](https://workers.cloudflare.com/) 提供服务。
- 项目使用原生 CSS 进行样式设计，简洁优雅。

## ✨ 功能特点

### 编辑器功能
- 📝 强大的 Markdown 编辑器
  - 支持所有常用 Markdown 语法
  - 代码块语法高亮
  - 表格编辑支持
  - 数学公式渲染
  - 图片上传和链接插入
  - 快捷键支持

### 主题与界面
- 🎨 智能主题系统
  - 自动跟随系统主题切换
  - 可手动切换明亮/暗黑主题
  - 平滑过渡动画效果
  - 护眼配色方案
- 📱 全面响应式设计
  - 完美支持移动端浏览
  - 自适应各种屏幕尺寸
  - 触摸屏优化体验

### 分享功能
- 🔗 多样化分享选项
  - 一键生成分享链接
  - 二维码分享支持
  - 社交媒体分享集成
- 👀 隐私保护设置
  - 自定义访问次数限制
  - 内容过期时间设置
  - 密码保护选项
  - 阅后即焚模式

### 导出与备份
- 📤 多格式导出支持
  - 导出为 PDF 文档
  - 导出为 PNG 图片
  - 导出为纯文本文件
  - 保持样式一致性
- 💾 数据安全保障
  - 自动保存功能
  - 历史版本记录
  - 云端同步备份

### 性能优化
- ⚡ 极致性能体验
  - 快速加载和渲染
  - 实时预览无延迟
  - 离线编辑支持
  - CDN 加速分发

## 🚀 快速开始


### 环境要求

- Node.js >= 16
- npm >= 7
- Wrangler CLI (Cloudflare Workers 命令行工具)

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/shan-hee/CloudPaste-SH.git
cd CloudPaste-SH
```

2. 安装依赖
```bash
npm install
```

3. 安装 Wrangler
```bash
npm install -g wrangler
```

4. 配置 Wrangler
```bash
wrangler login
```

5. 开发和部署
```bash
# 本地开发
npm run dev

# 部署到 Cloudflare Workers
npm run deploy
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
├── src/             # Worker 源码
├── wrangler.toml    # Cloudflare Workers 配置
└── package.json     # 项目配置
```

### 技术栈

- 前端：HTML5, CSS3, JavaScript (原生)
- 后端：Cloudflare Workers
- 部署：Cloudflare Pages + Workers

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进项目。在提交 PR 之前，请确保：

1. 代码风格符合项目规范
2. 添加必要的测试用例
3. 更新相关文档

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者。

## 感谢原作者

感谢原作者 [ling-drag0n](https://github.com/ling-drag0n) 的贡献。

