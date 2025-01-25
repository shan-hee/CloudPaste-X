# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 只安装必要的构建依赖
RUN apk add --no-cache python3 make g++

# 分层复制以利用缓存
COPY package*.json ./
RUN npm ci --only=production

# 复制源代码并构建
COPY . .
RUN npm run build

# 运行阶段
FROM node:18-alpine

WORKDIR /app

# 只安装生产环境必需的包
RUN apk add --no-cache tini

# 从构建阶段仅复制必要文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# 创建必要目录
RUN mkdir -p /app/data /app/logs && \
    chown -R node:node /app

USER node

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"] 