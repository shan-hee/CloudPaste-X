# 配置参考

本文档详细说明了CloudPaste-X支持的所有配置参数。这些配置可以通过环境变量或`.env`文件进行设置。

## 目录
- [核心配置](#核心配置)
- [服务器配置](#服务器配置)
- [数据库配置](#数据库配置)
- [存储配置](#存储配置)
- [安全配置](#安全配置)
- [性能配置](#性能配置)
- [日志配置](#日志配置)
- [监控配置](#监控配置)
- [管理配置](#管理配置)
- [配置示例](#配置示例)

## 核心配置

| 环境变量 | 说明 | 默认值 | 必填 |
|---------|------|-------|-----|
| `NODE_ENV` | 运行环境（development/production） | `production` | 否 |
| `PORT` | 服务监听端口 | `3000` | 否 |
| `HOST` | 服务主机名 | `0.0.0.0` | 否 |
| `PUBLIC_URL` | 公开访问URL，用于生成分享链接 | `http://localhost:3000` | 否 |

## 服务器配置

| 环境变量 | 说明 | 默认值 | 必填 |
|---------|------|-------|-----|
| `CORS_ORIGIN` | CORS允许的来源，可以是逗号分隔的列表或`*` | `*` | 否 |
| `TRUST_PROXY` | 是否信任代理（使用反向代理时设为true） | `false` | 否 |
| `COMPRESSION_LEVEL` | 响应压缩级别（0-9） | `6` | 否 |

## 数据库配置

| 环境变量 | 说明 | 默认值 | 必填 |
|---------|------|-------|-----|
| `DATABASE_PATH` | SQLite数据库文件路径 | `/app/data/db.sqlite` | 否 |
| `DATABASE_BACKUP_ENABLED` | 是否启用数据库自动备份 | `true` | 否 |
| `DATABASE_BACKUP_INTERVAL` | 备份间隔（小时） | `24` | 否 |
| `DATABASE_BACKUP_COUNT` | 保留的备份数量 | `7` | 否 |
| `DATABASE_POOL_MIN` | 数据库连接池最小连接数 | `1` | 否 |
| `DATABASE_POOL_MAX` | 数据库连接池最大连接数 | `5` | 否 |

## 存储配置

| 环境变量 | 说明 | 默认值 | 必填 |
|---------|------|-------|-----|
| `S3_ENDPOINT` | S3兼容存储服务地址 | `http://minio:9000` | 否 |
| `S3_REGION` | S3区域 | `us-east-1` | 否 |
| `S3_ACCESS_KEY` | S3访问密钥 | `minioadmin` | 否 |
| `S3_SECRET_KEY` | S3密钥 | `minioadmin` | 否 |
| `S3_BUCKET` | S3存储桶名称 | `cloudpaste` | 否 |
| `S3_FORCE_PATH_STYLE` | 是否使用路径样式URL | `true` | 否 |
| `S3_AUTO_CREATE_BUCKET` | 不存在时是否自动创建存储桶 | `true` | 否 |
| `MAX_FILE_SIZE` | 最大文件大小（MB） | `5` | 否 |
| `TOTAL_STORAGE_GB` | 总存储容量限制（GB） | `10` | 否 |

## 安全配置

| 环境变量 | 说明 | 默认值 | 必填 |
|---------|------|-------|-----|
| `JWT_SECRET` | JWT令牌密钥 | - | 是 |
| `SESSION_SECRET` | 会话密钥 | - | 是 |
| `COOKIE_SECRET` | Cookie加密密钥 | - | 是 |
| `COOKIE_MAX_AGE` | Cookie有效期（毫秒） | `86400000` | 否 |
| `COOKIE_SECURE` | 是否仅通过HTTPS传输Cookie | `false` | 否 |
| `COOKIE_SAME_SITE` | SameSite Cookie设置 | `lax` | 否 |
| `RATE_LIMIT_WINDOW_MS` | 速率限制窗口时间（毫秒） | `900000` | 否 |
| `RATE_LIMIT_MAX_REQUESTS` | 速率限制最大请求数 | `100` | 否 |
| `CSP_ENABLED` | 是否启用内容安全策略 | `true` | 否 |
| `HELMET_ENABLED` | 是否启用Helmet安全头 | `true` | 否 |

## 性能配置

| 环境变量 | 说明 | 默认值 | 必填 |
|---------|------|-------|-----|
| `ENABLE_RESPONSE_CACHE` | 是否启用响应缓存 | `true` | 否 |
| `CACHE_DURATION` | 缓存持续时间（秒） | `3600` | 否 |
| `CACHE_SIZE` | 内存缓存大小（项） | `100` | 否 |
| `CLEANUP_INTERVAL` | 过期内容清理间隔（小时） | `24` | 否 |

## 日志配置

| 环境变量 | 说明 | 默认值 | 必填 |
|---------|------|-------|-----|
| `LOG_LEVEL` | 日志级别（debug/info/warn/error） | `info` | 否 |
| `LOG_FILE_PATH` | 日志文件路径 | `/app/logs/app.log` | 否 |
| `LOG_MAX_SIZE` | 单个日志文件最大大小（MB） | `10` | 否 |
| `LOG_MAX_FILES` | 保留的最大日志文件数 | `5` | 否 |
| `ENABLE_REQUEST_LOGGING` | 是否记录请求日志 | `true` | 否 |
| `ENABLE_ACCESS_LOG` | 是否启用访问日志 | `true` | 否 |

## 监控配置

| 环境变量 | 说明 | 默认值 | 必填 |
|---------|------|-------|-----|
| `ENABLE_METRICS` | 是否启用Prometheus指标收集 | `true` | 否 |
| `METRICS_PATH` | 指标暴露路径 | `/metrics` | 否 |
| `HEALTH_CHECK_PATH` | 健康检查路径 | `/health` | 否 |
| `ENABLE_ACTUATOR` | 是否启用Actuator端点 | `true` | 否 |

## 管理配置

| 环境变量 | 说明 | 默认值 | 必填 |
|---------|------|-------|-----|
| `ADMIN_USER` | 管理员用户名 | `admin` | 否 |
| `ADMIN_PASSWORD` | 管理员密码 | - | 是 |
| `ADMIN_TOKEN` | 管理员API令牌 | - | 否 |
| `DEFAULT_EXPIRY_DAYS` | 内容默认过期天数 | `30` | 否 |
| `MAX_EXPIRY_DAYS` | 最大允许过期天数 | `365` | 否 |
| `ENABLE_REGISTRATION` | 是否允许用户注册 | `false` | 否 |

## 配置示例

以下是一个完整的生产环境配置示例：

```dotenv
# 核心配置
NODE_ENV=production
PORT=3000
HOST=example.com
PUBLIC_URL=https://example.com

# 数据库配置
DATABASE_PATH=/app/data/db.sqlite
DATABASE_BACKUP_ENABLED=true
DATABASE_BACKUP_INTERVAL=24
DATABASE_BACKUP_COUNT=7

# 存储配置
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=your-bucket-name
S3_FORCE_PATH_STYLE=false
MAX_FILE_SIZE=10
TOTAL_STORAGE_GB=50

# 安全配置
JWT_SECRET=your-strong-jwt-secret
SESSION_SECRET=your-strong-session-secret
COOKIE_SECRET=your-strong-cookie-secret
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# 性能配置
ENABLE_RESPONSE_CACHE=true
CACHE_DURATION=3600
CLEANUP_INTERVAL=24

# 日志配置
LOG_LEVEL=info
LOG_FILE_PATH=/app/logs/app.log
ENABLE_REQUEST_LOGGING=true

# 管理配置
ADMIN_USER=administrator
ADMIN_PASSWORD=strong-admin-password
DEFAULT_EXPIRY_DAYS=7
MAX_EXPIRY_DAYS=30
```

## 环境变量加载优先级

CloudPaste-X按以下优先级加载配置（从高到低）：

1. 命令行参数
2. 环境变量
3. `.env`文件
4. 默认值

较高优先级的设置会覆盖较低优先级的设置。

---

如有更多配置需求，请参考[高级配置指南](advanced-configuration.md)或在[GitHub Issues](https://github.com/shan-hee/CloudPaste-X/issues)提出建议。 