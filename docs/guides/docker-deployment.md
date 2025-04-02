# Docker部署指南

本指南详细介绍如何使用Docker部署CloudPaste-X，包括基本部署、配置优化和常见问题解决方案。

## 目录

- [前提条件](#前提条件)
- [基本部署](#基本部署)
- [高级配置](#高级配置)
- [性能优化](#性能优化)
- [常见问题](#常见问题)
- [最佳实践](#最佳实践)

## 前提条件

在开始部署前，请确保您的系统满足以下要求：

- Docker 20.10.0+
- Docker Compose v2.0.0+
- 至少1GB内存
- 至少5GB磁盘空间
- 网络连接（用于拉取镜像）

## 基本部署

### 方式一：使用docker-compose.yml

1. 创建项目目录并进入：

```bash
mkdir cloudpaste-x && cd cloudpaste-x
```

2. 下载docker-compose.yml配置文件：

```bash
curl -O https://raw.githubusercontent.com/shan-hee/CloudPaste-X/main/docker-compose.yml
```

3. 创建.env文件并配置环境变量：

```bash
curl -O https://raw.githubusercontent.com/shan-hee/CloudPaste-X/main/.env.example
mv .env.example .env
# 编辑.env文件设置必要参数
# 特别是JWT_SECRET, SESSION_SECRET和COOKIE_SECRET必须修改为您自己的值
```

4. 启动服务：

```bash
docker compose up -d
```

5. 验证服务是否正常运行：

```bash
docker compose ps
```

### 方式二：使用本地构建

如果您需要对代码进行修改或自定义，可以使用本地构建方式：

1. 克隆代码仓库：

```bash
git clone https://github.com/shan-hee/CloudPaste-X.git
cd CloudPaste-X
```

2. 构建并启动服务：

```bash
docker compose build
docker compose up -d
```

## 高级配置

### 存储配置

CloudPaste-X默认使用MinIO作为对象存储服务，您可以通过修改环境变量配置连接到自己的存储服务：

```env
# S3兼容存储配置
S3_ENDPOINT=http://your-s3-endpoint
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=your-bucket-name
S3_REGION=your-region
```

### 资源限制

限制容器资源使用，特别是在生产环境中非常重要：

```yaml
services:
  app:
    # 其他配置...
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 自定义网络配置

如果需要将CloudPaste-X集成到现有网络中：

```yaml
services:
  # 服务配置...

networks:
  default:
    external: true
    name: your-existing-network
```

## 性能优化

### 容器优化

1. 使用卷挂载优化：

```yaml
volumes:
  - ./data:/app/data:cached
  - ./logs:/app/logs:delegated
```

2. 调整MinIO性能参数：

```yaml
minio:
  # 其他配置...
  command: server /data --console-address ":9001" --address ":9000" --quiet
  environment:
    - MINIO_BROWSER_REDIRECT_URL=https://your-domain.com/minio
    - MINIO_CACHE=on
    - MINIO_CACHE_DRIVES=/data/.cache
    - MINIO_CACHE_EXCLUDE=*.pdf,*.mp4
    - MINIO_CACHE_QUOTA=10
    - MINIO_CACHE_AFTER=3
    - MINIO_CACHE_WATERMARK_LOW=75
    - MINIO_CACHE_WATERMARK_HIGH=85
```

### 使用CDN

对于静态资源和文件访问，建议配置CDN加速：

```yaml
app:
  # 其他配置...
  environment:
    - PUBLIC_URL=https://cdn.your-domain.com
```

## 常见问题

### 容器无法启动

检查日志查找错误：

```bash
docker compose logs app
```

常见问题包括权限问题、端口冲突或环境变量配置错误。

### 存储连接失败

确保MinIO服务正常运行，并检查网络连接：

```bash
docker compose exec app curl -I http://minio:9000
```

### 数据持久化问题

确保卷挂载正确配置，并检查目录权限：

```bash
ls -la ./data
sudo chown -R 1000:1000 ./data ./logs
```

## 最佳实践

### 安全配置

1. 不要使用默认的密钥和密码
2. 限制容器网络访问
3. 定期更新镜像
4. 使用HTTPS加密传输

### 备份策略

定期备份数据目录：

```bash
# 备份脚本示例
#!/bin/bash
BACKUP_DIR="/backups/cloudpaste-x"
DATE=$(date +%Y%m%d-%H%M%S)
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/data-$DATE.tar.gz ./data
```

### 监控配置

集成Prometheus和Grafana监控系统状态：

```yaml
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./prometheus:/etc/prometheus:ro
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana:latest
  volumes:
    - ./grafana:/var/lib/grafana
  ports:
    - "3001:3000"
  depends_on:
    - prometheus
```

---

如有更多问题，请参考[常见问题](faq.md)或在[GitHub Issues](https://github.com/shan-hee/CloudPaste-X/issues)提交问题。 