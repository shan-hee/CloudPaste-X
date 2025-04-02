# 使用GitHub Actions与GHCR部署CloudPaste-X

本文档提供了使用GitHub Actions自动构建Docker镜像并通过GitHub Container Registry (GHCR)部署CloudPaste-X的详细指南。

## 概述

通过GitHub Actions自动化构建和发布Docker镜像，可以简化部署流程，使团队能够专注于开发而不是复杂的部署过程。本文档介绍了如何在生产环境中利用这些预构建镜像。

## 前提条件

- 已安装Docker和Docker Compose的服务器
- 能够访问GitHub的网络环境
- GitHub账户和仓库访问权限

## 快速开始

### 1. 简易部署（Windows环境）

1. 下载部署脚本：
   - 确保`deploy-ghcr.sh`脚本已存在于您的项目目录中

2. 在Windows中执行部署：
   ```powershell
   # PowerShell中执行
   bash deploy-ghcr.sh your-github-username latest
   ```
   
   注意：Windows需要安装WSL或Git Bash才能运行bash脚本

### 2. 简易部署（Linux/macOS环境）

1. 下载部署脚本：
   ```bash
   # 如果尚未下载脚本
   wget https://raw.githubusercontent.com/your-username/CloudPaste-X/main/deploy-ghcr.sh
   ```

2. 添加执行权限：
   ```bash
   chmod +x deploy-ghcr.sh
   ```

3. 执行部署：
   ```bash
   ./deploy-ghcr.sh your-github-username latest
   ```
   
   参数说明：
   - 第一个参数：GitHub用户名/组织名
   - 第二个参数：镜像标签（latest、v1.0.0等）

### 3. 手动部署

如果您希望手动设置，请按照以下步骤操作：

1. 创建docker-compose.yml文件：
   ```yaml
   services:
     init-volume:
       image: busybox
       command: chown -R 1000:1000 /app/data /app/logs
       volumes:
         - ./data:/app/data
         - ./logs:/app/logs

     app:
       image: ghcr.io/your-username/cloudpaste-x:latest  # 替换为您的用户名和所需版本
       container_name: cloudpaste-app
       restart: unless-stopped
       ports:
         - "${PORT:-3000}:3000"
       environment:
         - NODE_ENV=${NODE_ENV:-production}
         # ... 其他环境变量 ...
       volumes:
         - ./data:/app/data
         - ./logs:/app/logs
       depends_on:
         - minio

     minio:
       image: minio/minio
       container_name: cloudpaste-minio
       command: server /data --console-address ":9001"
       # ... 其他配置 ...
   ```

2. 配置环境变量：
   ```bash
   cp .env.example .env
   # 编辑.env文件设置必要参数
   ```

3. 启动服务：
   ```bash
   docker-compose up -d
   ```

## 镜像标签说明

GitHub Actions自动构建的镜像使用以下标签系统：

- `latest` - 主分支最新代码构建的镜像
- `vX.Y.Z` - 发布的版本标签（如v1.0.0）
- `vX.Y` - 主要版本和次要版本（如v1.0）
- `sha-COMMIT` - 特定提交的镜像

## 版本更新和回滚

### 更新到最新版本

```bash
# 拉取最新镜像
docker pull ghcr.io/your-username/cloudpaste-x:latest

# 重启服务
docker-compose up -d --no-build
```

### 回滚到特定版本

1. 编辑docker-compose.yml文件，修改镜像标签为所需版本
2. 重启服务：
   ```bash
   docker-compose up -d
   ```

## 常见问题

### 镜像拉取失败

如果遇到"Error response from daemon: unauthorized"错误，可能需要进行GHCR认证：

```bash
# 使用个人访问令牌登录GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### 服务无法启动

检查日志查找问题：
```bash
docker-compose logs app
```

### 数据持久化

默认情况下，数据保存在以下目录：
- `./data` - 数据库和应用数据
- `./logs` - 应用日志
- `./minio-data` - MinIO对象存储数据

## 更多资源

- 完整部署文档：[部署指南](docs/guides/deployment.md)
- GHCR专用部署文档：[GHCR部署指南](docs/guides/ghcr-deployment.md)
- GitHub Actions配置：[.github/workflows/docker-publish.yml](../../.github/workflows/docker-publish.yml) 