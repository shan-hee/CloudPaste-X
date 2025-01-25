# CloudPaste-X 部署指南

本文档详细说明了如何在各种环境下部署CloudPaste-X。

## 目录
- [环境要求](#环境要求)
- [Docker部署](#docker部署)
- [手动部署](#手动部署)
- [配置说明](#配置说明)
- [性能优化](#性能优化)
- [监控配置](#监控配置)

## 环境要求

- Node.js >= 14.0.0
- npm >= 6.0.0
- Docker（如使用容器部署）
- 存储空间 >= 1GB
- 内存 >= 1GB

## Docker部署

### 使用预构建镜像（推荐）

1. 创建配置文件：
```bash
cp .env.example .env
```

2. 修改环境变量：
```bash
vim .env
```

3. 启动服务：
```bash
docker compose up -d
```

### 本地构建镜像

1. 克隆代码：
```bash
git clone https://github.com/your-username/CloudPaste-X.git
cd CloudPaste-X
```

2. 构建镜像：
```bash
docker build -t cloudpaste-x .
```

3. 运行容器：
```bash
docker run -d -p 3000:3000 cloudpaste-x
```

## 手动部署

1. 安装依赖：
```bash
npm install
```

2. 配置环境：
```bash
cp .env.example .env
# 编辑 .env 文件
```

3. 构建项目：
```bash
npm run build
```

4. 启动服务：
```bash
npm start
```

## 配置说明

### 必要配置
- `PORT`: 服务端口
- `JWT_SECRET`: JWT密钥
- `SESSION_SECRET`: 会话密钥
- `COOKIE_SECRET`: Cookie密钥

### 存储配置
- `STORAGE_TYPE`: 存储类型（local/s3/minio）
- `MINIO_ENDPOINT`: MinIO服务地址
- `MINIO_ACCESS_KEY`: MinIO访问密钥
- `MINIO_SECRET_KEY`: MinIO密钥

### 数据库配置
- `DB_PATH`: SQLite数据库路径

## 性能优化

1. 启用压缩：
```nginx
gzip on;
gzip_types text/plain application/json;
```

2. 配置缓存：
```nginx
location /static {
    expires 7d;
}
```

3. 使用CDN加速静态资源

## 监控配置

1. 启用Prometheus监控：
```yaml
prometheus:
  image: prom/prometheus
  ports:
    - "9090:9090"
```

2. 配置日志收集：
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## 安全建议

1. 使用HTTPS
2. 配置防火墙
3. 定期更新依赖
4. 启用速率限制

## 常见问题

### 1. 端口被占用
检查并关闭占用端口的进程：
```bash
netstat -ano | findstr :3000
taskkill /PID <pid> /F
```

### 2. 存储空间不足
清理过期文件：
```bash
npm run cleanup
```

### 3. 性能问题
- 检查日志
- 监控系统资源
- 优化数据库查询

## 维护指南

1. 备份数据：
```bash
npm run backup
```

2. 更新系统：
```bash
git pull
npm install
npm run build
pm2 restart all
```

3. 日志管理：
```bash
pm2 logs
pm2 flush
``` 
- 问题反馈：issues@your-domain.com 