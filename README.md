# CloudPaste-X

CloudPaste-X 是一个现代化的在线文本分享平台，支持 Markdown 编辑和实时预览功能。2.0 版本支持独立部署，提供更灵活的存储选项和更好的可扩展性。

## ✨ 主要特性

- 支持独立部署
- Markdown 编辑和实时预览
- 文件分享和管理
- Docker 容器化部署
- 安全性增强

## 🚀 快速开始

### 方案一：使用GitHub预构建镜像（推荐）

直接使用GitHub Actions构建并发布到GHCR的Docker镜像，无需本地构建：

```bash
# 克隆仓库
git clone https://github.com/shan-hee/CloudPaste-X
cd CloudPaste-X

# 配置环境
cp .env.example .env

# 使用预构建镜像启动服务
docker compose up -d
```

### 方案二：本地构建部署

如果您希望在本地构建Docker镜像：

```bash
# 克隆仓库
git clone https://github.com/shan-hee/CloudPaste-X
cd CloudPaste-X

# 配置环境
cp .env.example .env

# 构建并启动服务
docker build -t cloudpaste-x -f docker/Dockerfile .
docker compose up -d
```

### 方案三：手动部署

不使用Docker的传统部署方式：

```bash
# 安装依赖
npm install

# 配置环境
cp .env.example .env

# 启动服务
npm start
```

## 📋 环境配置

### 必要配置
- `PORT`: 服务端口
- `JWT_SECRET`: JWT密钥
- `SESSION_SECRET`: 会话密钥
- `COOKIE_SECRET`: Cookie密钥

### 存储配置
- `STORAGE_TYPE`: 存储类型（local/s3/minio）
- `S3_ENDPOINT`: S3/MinIO服务地址
- `S3_ACCESS_KEY`: 访问密钥
- `S3_SECRET_KEY`: 密钥
- `S3_BUCKET`: 存储桶名称

### 安全配置
- `ADMIN_USER`: 管理员用户名
- `ADMIN_PASSWORD`: 管理员密码
- `ADMIN_TOKEN`: 管理API令牌

完整配置项请参考`.env.example`文件。

## 🔄 版本更新与回滚

### 更新到最新版本

```bash
# 拉取最新镜像
docker pull ghcr.io/shan-hee/cloudpaste-x:latest

# 重启服务
docker compose up -d
```

### 回滚到特定版本

修改`docker-compose.yml`中的镜像标签为特定版本，例如：

```yaml
app:
  image: ghcr.io/shan-hee/cloudpaste-x:v1.0.0  # 指定特定版本
```

然后重启服务：

```bash
docker compose up -d
```

## 🔍 常见问题

### 镜像拉取失败

如果遇到认证错误，请登录GHCR：

```bash
# 使用个人访问令牌登录
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### 端口被占用

如果3000端口被占用，可以在`.env`文件中修改PORT变量。

### 数据持久化

默认情况下，数据保存在以下目录：
- `./data` - 数据库和应用数据
- `./logs` - 应用日志
- `./minio-data` - MinIO对象存储数据

## 🛠️ 维护指南

### 查看日志

```bash
# 查看应用日志
docker compose logs -f app

# 查看MinIO日志
docker compose logs -f minio
```

### 备份数据

备份数据目录即可：

```bash
tar -czvf cloudpaste-backup.tar.gz data/ logs/ minio-data/
```

## 🔒 安全建议

1. 修改默认的管理员密码和所有密钥
2. 使用HTTPS配置反向代理
3. 限制MinIO管理界面的访问
4. 定期更新镜像版本

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。

## 🙏 致谢

感谢原作者 [ling-drag0n](https://github.com/ling-drag0n) 的贡献。

