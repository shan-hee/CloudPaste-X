# 常见问题解答 (FAQ)

本文档收集了CloudPaste-X用户常见的问题和解决方案。

## 目录
- [部署相关](#部署相关)
- [配置相关](#配置相关)
- [使用相关](#使用相关)
- [安全相关](#安全相关)
- [性能相关](#性能相关)
- [错误排查](#错误排查)

## 部署相关

### Docker容器无法启动

**问题**: 使用Docker Compose启动服务时容器无法正常运行。

**解决方案**:
1. 检查日志：`docker compose logs app`
2. 确认端口是否被占用：`netstat -tulpn | grep 3000`
3. 检查目录权限：`ls -la ./data ./logs`
4. 确保环境变量正确设置

### 如何更新到最新版本？

**问题**: 如何将已部署的CloudPaste-X更新到最新版本？

**解决方案**:

使用预构建镜像的情况：
```bash
# 拉取最新镜像
docker pull ghcr.io/shan-hee/cloudpaste-x:latest

# 重启服务
docker compose down
docker compose up -d
```

使用本地构建的情况：
```bash
# 更新代码
git pull

# 重新构建并启动
docker compose down
docker compose build
docker compose up -d
```

### 如何备份数据？

**问题**: 如何备份CloudPaste-X的数据？

**解决方案**:

主要需要备份以下内容：
1. 数据库文件：`./data/db.sqlite`
2. 上传的文件：`./minio-data`

可以使用以下命令创建备份：
```bash
# 停止服务（可选）
docker compose stop

# 创建备份
tar -czf cloudpaste-backup-$(date +%Y%m%d).tar.gz ./data ./minio-data

# 重启服务（如果已停止）
docker compose start
```

## 配置相关

### 如何修改端口？

**问题**: 如何更改默认的3000端口？

**解决方案**:

在`.env`文件中修改PORT变量：
```
PORT=8080
```

然后重启服务：
```bash
docker compose down
docker compose up -d
```

### 如何配置HTTPS？

**问题**: 如何为CloudPaste-X启用HTTPS？

**解决方案**:

推荐使用反向代理（如Nginx或Traefik）处理HTTPS：

Nginx配置示例：
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

然后在`.env`文件中设置：
```
PUBLIC_URL=https://your-domain.com
TRUST_PROXY=true
COOKIE_SECURE=true
```

### 如何使用外部S3存储？

**问题**: 如何配置CloudPaste-X使用AWS S3或其他兼容S3的存储？

**解决方案**:

在`.env`文件中配置以下参数：
```
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=your-bucket-name
S3_FORCE_PATH_STYLE=false
```

然后重启服务。

## 使用相关

### 文件上传大小限制

**问题**: 如何增加文件上传大小限制？

**解决方案**:

在`.env`文件中修改MAX_FILE_SIZE变量（单位为MB）：
```
MAX_FILE_SIZE=50
```

如果使用Nginx作为反向代理，还需修改Nginx配置：
```nginx
http {
    client_max_body_size 50M;
    # 其他配置...
}
```

### 如何设置分享内容过期时间？

**问题**: 如何调整分享内容的默认过期时间？

**解决方案**:

在`.env`文件中设置：
```
DEFAULT_EXPIRY_DAYS=7   # 默认过期时间（天）
MAX_EXPIRY_DAYS=30      # 最大允许过期时间（天）
```

### 如何禁用某些功能？

**问题**: 如何禁用某些不需要的功能？

**解决方案**:

可以通过环境变量禁用特定功能，例如：
```
ENABLE_REGISTRATION=false    # 禁用用户注册
ENABLE_METRICS=false         # 禁用指标收集
ENABLE_ACTUATOR=false        # 禁用Actuator端点
```

## 安全相关

### 如何加强系统安全性？

**问题**: 如何增强CloudPaste-X的安全性？

**解决方案**:

1. 使用强密码和密钥
2. 启用HTTPS
3. 限制访问敏感端点
4. 配置更严格的速率限制：
   ```
   RATE_LIMIT_WINDOW_MS=300000   # 5分钟窗口
   RATE_LIMIT_MAX_REQUESTS=50    # 最多50个请求
   ```
5. 使用更安全的Cookie设置：
   ```
   COOKIE_SECURE=true
   COOKIE_SAME_SITE=strict
   ```
6. 定期备份数据
7. 保持系统更新到最新版本

### 如何处理敏感数据？

**问题**: 系统是否安全存储敏感数据？

**解决方案**:

CloudPaste-X采取以下措施保护敏感数据：
1. 密码使用bcrypt算法哈希存储
2. 支持设置内容访问密码
3. 支持设置内容自动过期
4. 支持删除已分享的内容
5. 日志中会自动屏蔽敏感信息

## 性能相关

### 系统变慢怎么办？

**问题**: 随着使用时间增长，系统变得越来越慢。

**解决方案**:

1. 检查资源使用情况：
   ```bash
   docker stats
   ```

2. 优化数据库：
   ```bash
   docker compose exec app npm run db:optimize
   ```

3. 启用响应缓存：
   ```
   ENABLE_RESPONSE_CACHE=true
   CACHE_DURATION=3600
   ```

4. 清理过期内容：
   ```bash
   docker compose exec app npm run cleanup
   ```

5. 分配更多资源给容器

### 如何处理大量并发请求？

**问题**: 如何优化系统以处理高并发负载？

**解决方案**:

1. 使用负载均衡器分发流量
2. 调整Node.js性能参数：
   ```
   NODE_OPTIONS=--max-old-space-size=2048
   ```
3. 使用CDN缓存静态资源
4. 优化数据库查询
5. 配置合适的缓存策略
6. 考虑水平扩展多个实例

## 错误排查

### "Database is locked"错误

**问题**: 日志中出现"Database is locked"错误。

**解决方案**:

这通常是由于SQLite并发访问限制导致的：
1. 调整连接池设置：
   ```
   DATABASE_POOL_MIN=1
   DATABASE_POOL_MAX=1
   ```
2. 确保数据库文件没有被其他进程访问
3. 检查磁盘空间是否充足
4. 在极端情况下，考虑迁移到更强大的数据库

### MinIO连接错误

**问题**: 系统报告无法连接到MinIO存储服务。

**解决方案**:

1. 检查MinIO容器是否正在运行：
   ```bash
   docker compose ps minio
   ```
2. 检查MinIO日志：
   ```bash
   docker compose logs minio
   ```
3. 确认网络连接：
   ```bash
   docker compose exec app ping minio
   ```
4. 验证环境变量配置是否正确
5. 重启MinIO服务：
   ```bash
   docker compose restart minio
   ```

### "Out of Memory"错误

**问题**: 容器因内存不足而崩溃。

**解决方案**:

1. 增加容器内存限制：
   ```yaml
   services:
     app:
       deploy:
         resources:
           limits:
             memory: 2G
   ```
2. 优化Node.js内存使用：
   ```
   NODE_OPTIONS=--max-old-space-size=1536
   ```
3. 减少大文件上传和处理
4. 添加交换内存（不推荐，但可作为临时解决方案）

---

如果您的问题未在此列出，请查阅[完整文档](../README.md)或在[GitHub Issues](https://github.com/shan-hee/CloudPaste-X/issues)提交问题。 