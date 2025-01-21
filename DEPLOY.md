# CloudPaste-X 部署文档

## 环境要求

- Node.js >= 14.0.0
- npm >= 6.0.0
- 现代浏览器（支持ES6+）

## 安装步骤

### 1. 获取代码

```bash
# 克隆仓库
git clone https://github.com/your-username/CloudPaste-X.git

# 进入项目目录
cd CloudPaste-X
```

### 2. 安装依赖

```bash
# 安装项目依赖
npm install
```

### 3. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
# 服务器端口
PORT=3000

# 开发环境
NODE_ENV=production

# API密钥（如果需要）
API_KEY=your_api_key
```

### 4. 构建项目

```bash
# 构建生产环境代码
npm run build
```

### 5. 启动服务

```bash
# 启动生产服务器
npm start
```

## 部署选项

### 方式一：直接部署

1. 在服务器上安装 Node.js 和 npm
2. 按照上述步骤进行安装和配置
3. 使用 PM2 等进程管理工具启动服务：
   ```bash
   npm install -g pm2
   pm2 start npm --name "cloudpaste" -- start
   ```

### 方式二：Docker 部署

1. 构建 Docker 镜像：
   ```bash
   docker build -t cloudpaste-x .
   ```

2. 运行容器：
   ```bash
   docker run -d -p 3000:3000 cloudpaste-x
   ```

## 配置说明

### 主要配置项

- `PORT`: 服务器监听端口
- `NODE_ENV`: 运行环境（development/production）
- `API_KEY`: API密钥（如果使用外部服务）

### 安全配置

1. 确保生产环境下：
   - 启用 HTTPS
   - 设置适当的 CORS 策略
   - 配置安全的 cookie 选项

2. 推荐的 Nginx 配置：
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 维护说明

### 日常维护

1. 日志查看：
   ```bash
   # 如果使用 PM2
   pm2 logs cloudpaste
   ```

2. 更新部署：
   ```bash
   git pull
   npm install
   npm run build
   pm2 restart cloudpaste
   ```

### 性能优化

1. 启用 Gzip 压缩
2. 配置浏览器缓存
3. 使用 CDN 加速静态资源

### 监控

1. 使用 PM2 监控：
   ```bash
   pm2 monit
   ```

2. 设置日志轮转：
   ```bash
   pm2 install pm2-logrotate
   ```

## 故障排除

### 常见问题

1. 端口被占用：
   ```bash
   # 查看端口占用
   lsof -i :3000
   # 或
   netstat -ano | findstr :3000
   ```

2. 依赖安装失败：
   ```bash
   # 清除 npm 缓存
   npm cache clean --force
   # 重新安装依赖
   rm -rf node_modules
   npm install
   ```

### 性能问题

1. 内存泄漏：
   - 使用 `node --inspect` 进行调试
   - 检查 PM2 监控数据

2. 响应慢：
   - 检查数据库查询
   - 检查网络延迟
   - 查看服务器负载

## 备份策略

1. 代码备份：
   - 使用 Git 进行版本控制
   - 定期推送到远程仓库

2. 数据备份：
   - 定期备份数据库
   - 配置文件备份

## 安全建议

1. 定期更新依赖：
   ```bash
   npm audit
   npm update
   ```

2. 启用安全标头：
   - HSTS
   - CSP
   - X-Frame-Options

3. 配置防火墙规则
4. 定期安全扫描

## 联系与支持

如有问题，请联系：
- 技术支持：support@your-domain.com
- 问题反馈：issues@your-domain.com 