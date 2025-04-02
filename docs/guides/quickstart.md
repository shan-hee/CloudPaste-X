# CloudPaste-X 快速入门

本指南将帮助您在5分钟内完成CloudPaste-X的部署和基本配置。

## 目标

完成本指南后，您将拥有一个功能完整的CloudPaste-X实例，可以：
- 分享文本和文件
- 通过管理界面管理分享内容
- 使用各种高级功能如密码保护、过期时间等

## 前提条件

- 一台可以访问互联网的服务器或本地电脑
- 已安装Docker和Docker Compose
- 对命令行有基本了解

## 快速部署步骤

### 1. 创建项目目录

```bash
mkdir cloudpaste-x && cd cloudpaste-x
```

### 2. 下载配置文件

```bash
# 下载docker-compose.yml
curl -O https://raw.githubusercontent.com/shan-hee/CloudPaste-X/main/docker-compose.yml

# 下载环境变量示例文件
curl -O https://raw.githubusercontent.com/shan-hee/CloudPaste-X/main/.env.example
mv .env.example .env
```

### 3. 配置基本参数

编辑`.env`文件，至少设置以下参数：

```dotenv
# 安全密钥（必须修改为随机值）
JWT_SECRET=your-random-jwt-secret
SESSION_SECRET=your-random-session-secret
COOKIE_SECRET=your-random-cookie-secret

# 管理员密码
ADMIN_PASSWORD=your-secure-password
```

你可以使用以下命令生成随机密钥：

```bash
openssl rand -base64 32
```

### 4. 启动服务

```bash
docker compose up -d
```

### 5. 验证服务

访问`http://localhost:3000`（或服务器IP）即可看到CloudPaste-X的界面。

## 基本使用

### 创建分享

1. 在首页，填写内容或上传文件
2. 设置可选参数（如过期时间、密码等）
3. 点击"创建分享"按钮
4. 复制生成的链接并分享给他人

### 管理分享

1. 访问`http://localhost:3000/admin`
2. 使用在`.env`文件中设置的管理员凭据登录
3. 在管理面板中查看、编辑或删除已创建的分享

## 下一步

恭喜！您已成功部署CloudPaste-X。接下来，您可能想要了解：

- [配置详解](configuration.md) - 了解所有配置选项
- [安全加固](security.md) - 增强系统安全性
- [备份恢复](backup.md) - 设置数据备份
- [性能优化](performance.md) - 优化系统性能

## 常见问题

### 端口冲突

如果3000端口已被占用，可以在`.env`文件中修改`PORT`值，例如：

```dotenv
PORT=8080
```

然后重新启动服务：

```bash
docker compose down
docker compose up -d
```

### 数据存储位置

默认情况下，所有数据存储在以下目录：

- `./data` - 数据库文件
- `./logs` - 日志文件
- `./minio-data` - 文件存储

您可以根据需要修改docker-compose.yml中的卷映射。

### 无法访问管理界面

确保在`.env`文件中正确设置了`ADMIN_USER`和`ADMIN_PASSWORD`，默认用户名是`admin`。

## 故障排除

如果遇到问题，可以通过以下命令查看日志：

```bash
# 查看应用日志
docker compose logs app

# 实时查看日志
docker compose logs -f app
```

如需更多帮助，请[提交问题](https://github.com/shan-hee/CloudPaste-X/issues)或查阅[完整文档](../README.md)。 