# 使用GitHub Actions和GHCR部署CloudPaste-X

本指南详细说明如何利用GitHub Actions自动构建Docker镜像，并通过GitHub Container Registry (GHCR)进行分发部署。

## 目录
- [工作流程概述](#工作流程概述)
- [前提条件](#前提条件)
- [配置GitHub仓库](#配置github仓库)
- [部署流程](#部署流程)
- [镜像标签策略](#镜像标签策略)
- [常见问题](#常见问题)

## 工作流程概述

使用GitHub Actions和GHCR的部署流程：

1. 开发者将代码推送到GitHub仓库
2. GitHub Actions自动触发构建工作流
3. 构建完成后，Docker镜像被推送到GHCR
4. 服务器从GHCR拉取预构建镜像进行部署

## 前提条件

- GitHub账户
- 适当的仓库权限
- 服务器可以访问互联网拉取镜像
- Docker和Docker Compose已安装在服务器上

## 配置GitHub仓库

### 1. 设置GitHub Actions工作流

项目已包含`.github/workflows/docker-publish.yml`工作流配置，自动处理镜像构建和推送。

### 2. 配置仓库权限

确保GitHub Actions有权限推送到GHCR：

1. 进入仓库设置 → Secrets and variables → Actions
2. 添加以下secrets（如果尚未配置）：
   - `GITHUB_TOKEN` - 自动提供，用于GHCR认证

## 部署流程

### 1. 准备服务器环境

确保服务器已安装Docker和Docker Compose：

```bash
# 安装Docker (如果尚未安装)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.12.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. 拉取镜像前的认证

首次使用GHCR时，需要进行认证：

```bash
# 登录到GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

用您的GitHub用户名替换`USERNAME`，`GITHUB_TOKEN`是您的个人访问令牌。

### 3. 创建docker-compose.yml文件

创建使用预构建镜像的docker-compose.yml：

```yaml
services:
  init-volume:
    image: busybox
    command: chown -R 1000:1000 /app/data /app/logs
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs

  app:
    image: ghcr.io/USERNAME/cloudpaste-x:latest  # 替换USERNAME为您的GitHub用户名
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
    # ... minio配置 ...
```

### 4. 配置环境变量

创建.env文件并配置必要的环境变量：

```bash
cp .env.example .env
vi .env
```

### 5. 启动服务

部署应用：

```bash
docker-compose up -d
```

此命令将自动从GHCR拉取最新的镜像并启动服务。

## 镜像标签策略

GitHub Actions工作流配置了以下标签策略：

- `latest` - 主分支最新版本
- `vX.Y.Z` - 发布的版本标签 (例如 v1.0.0)
- `vX.Y` - 主要和次要版本 (例如 v1.0)
- `sha-COMMIT` - 提交哈希的长格式

在部署时，您可以选择特定标签以保证版本稳定性。例如：

```yaml
app:
  image: ghcr.io/USERNAME/cloudpaste-x:v1.0.0
```

## 常见问题

### 拉取镜像失败

问题：无法拉取GHCR中的镜像
解决方案：
- 检查认证是否正确
- 确认仓库可见性设置
- 验证镜像名称和标签是否正确

### 版本回滚

问题：需要回滚到之前的版本
解决方案：
- 修改docker-compose.yml中的镜像标签为特定版本
- 执行`docker-compose up -d`重新部署

### 私有仓库设置

问题：需要限制镜像访问
解决方案：
- 在GitHub仓库设置中配置仓库可见性
- 管理仓库协作者和访问控制

### 镜像大小优化

问题：Docker镜像体积过大
解决方案：
- 优化Dockerfile，使用多阶段构建
- 移除不必要的依赖和文件
- 考虑使用Alpine基础镜像 