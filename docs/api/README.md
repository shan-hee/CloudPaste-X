# CloudPaste-X API文档

本文档详细说明了CloudPaste-X的API接口规范。

## 目录

1. [认证接口](./auth.md)
2. [分享接口](./share.md)
3. [文件接口](./file.md)

## API概述

CloudPaste-X提供RESTful API，支持以下功能：
- 用户认证
- 内容分享
- 文件上传/下载
- 分享管理

## 认证方式

所有API请求需要在Header中携带JWT Token：
```http
Authorization: Bearer <your_token>
```

## 响应格式

所有API响应均为JSON格式：
```json
{
    "code": 0,
    "message": "success",
    "data": {}
}
```

## 错误处理

API使用HTTP状态码表示请求状态，常见状态码：
- 200: 成功
- 400: 请求参数错误
- 401: 未认证
- 403: 无权限
- 404: 资源不存在
- 500: 服务器错误 