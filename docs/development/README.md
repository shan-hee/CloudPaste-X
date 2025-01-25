# CloudPaste-X 开发指南

本文档面向开发者，详细说明了如何参与CloudPaste-X的开发。

## 开发环境搭建

1. 安装依赖
```bash
npm install
```

2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件
```

3. 启动开发服务器
```bash
npm run dev
```

## 项目结构

```
CloudPaste-X/
├── src/
│   ├── api/           # API路由和控制器
│   ├── core/          # 核心业务逻辑
│   ├── infrastructure/# 基础设施层
│   └── utils/         # 工具函数
├── public/            # 静态资源
├── tests/             # 测试文件
└── docs/             # 项目文档
```

## 开发规范

1. 代码风格
- 使用ESLint进行代码检查
- 遵循项目的.eslintrc配置
- 使用Prettier进行代码格式化

2. Git提交规范
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式
- refactor: 重构
- test: 测试相关
- chore: 构建/工具相关

3. 测试规范
- 单元测试覆盖率要求 > 80%
- 提交前运行所有测试
- 新功能必须包含测试

## 调试指南

1. 本地调试
```bash
npm run dev
```

2. 测试
```bash
npm test
npm run test:coverage
```

3. 构建
```bash
npm run build
```

## 发布流程

1. 版本号更新
2. 更新CHANGELOG.md
3. 提交代码审查
4. 合并到主分支
5. 创建发布标签

## 常见问题

请查看[常见问题](./troubleshooting.md)文档。 