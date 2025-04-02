#!/bin/bash

# CloudPaste-X GHCR部署脚本
# 用于从GitHub Container Registry拉取并部署预构建的Docker镜像

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 配置变量
GITHUB_USERNAME=${1:-"shan-hee"} # 默认CloudPaste-X仓库所有者
TAG=${2:-"latest"}
ENV_FILE=".env"
COMPOSE_FILE="docker-compose.yml"

# 标题
echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}  CloudPaste-X 一键部署工具  ${NC}"
echo -e "${GREEN}=======================================${NC}"
echo ""

# 检查必要工具
echo -e "${YELLOW}检查必要工具...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: 未找到Docker，请先安装Docker${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}错误: 未找到Docker Compose，请先安装Docker Compose${NC}"
    exit 1
fi

# 准备环境变量文件
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}未找到.env文件，正在从示例创建...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}已创建.env文件，请根据需要编辑配置${NC}"
    else
        echo -e "${RED}错误: 未找到.env.example文件${NC}"
        exit 1
    fi
fi

# 创建docker-compose.yml文件
echo -e "${YELLOW}正在创建Docker Compose配置...${NC}"
cat > $COMPOSE_FILE << EOF
services:
  init-volume:
    image: busybox
    command: chown -R 1000:1000 /app/data /app/logs
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs

  app:
    image: ghcr.io/${GITHUB_USERNAME}/cloudpaste-x:${TAG}
    container_name: cloudpaste-app
    restart: unless-stopped
    ports:
      - "\${PORT:-3000}:3000"
    environment:
      - NODE_ENV=\${NODE_ENV:-production}
      - DATABASE_PATH=/app/data/db.sqlite
      - LOG_FILE_PATH=/app/logs/app.log
      - S3_ENDPOINT=http://minio:9000
      - S3_ACCESS_KEY=\${MINIO_ROOT_USER:-minioadmin}
      - S3_SECRET_KEY=\${MINIO_ROOT_PASSWORD:-minioadmin}
      - S3_BUCKET=\${S3_BUCKET:-cloudpaste}
      - S3_REGION=\${S3_REGION:-us-east-1}
      - S3_FORCE_PATH_STYLE=\${S3_FORCE_PATH_STYLE:-true}
      - S3_AUTO_CREATE_BUCKET=\${S3_AUTO_CREATE_BUCKET:-true}
      - JWT_SECRET=\${JWT_SECRET}
      - SESSION_SECRET=\${SESSION_SECRET}
      - COOKIE_SECRET=\${COOKIE_SECRET}
      - MAX_FILE_SIZE=\${MAX_FILE_SIZE:-5}
      - TOTAL_STORAGE_GB=\${TOTAL_STORAGE_GB:-10}
      - LOG_LEVEL=\${LOG_LEVEL:-debug}
      - PUBLIC_URL=http://\${HOST:-0.0.0.0}:\${PORT:-3000}
      - ADMIN_USER=\${ADMIN_USER:-admin}
      - ADMIN_PASSWORD=\${ADMIN_PASSWORD}
      - ADMIN_TOKEN=\${ADMIN_TOKEN}
      - CORS_ORIGIN=\${CORS_ORIGIN:-*}
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    depends_on:
      - minio
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  minio:
    image: minio/minio
    container_name: cloudpaste-minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=\${MINIO_ROOT_USER:-minioadmin}
      - MINIO_ROOT_PASSWORD=\${MINIO_ROOT_PASSWORD:-minioadmin}
      - MINIO_BROWSER=\${MINIO_BROWSER:-on}
      - MINIO_DOMAIN=\${MINIO_DOMAIN:-minio}
      - MINIO_REGION=\${MINIO_REGION:-us-east-1}
    volumes:
      - ./minio-data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

networks:
  default:
    name: cloudpaste-network
    driver: bridge
EOF

echo -e "${GREEN}已创建Docker Compose配置文件${NC}"

# 创建必要的目录
echo -e "${YELLOW}创建必要的目录...${NC}"
mkdir -p data logs minio-data

# 确定Docker Compose命令
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

# 拉取并启动服务
echo -e "${YELLOW}正在拉取镜像并部署服务...${NC}"
echo -e "使用镜像: ${GREEN}ghcr.io/${GITHUB_USERNAME}/cloudpaste-x:${TAG}${NC}"

$COMPOSE_CMD up -d

# 检查服务是否正常启动
echo -e "${YELLOW}检查服务状态...${NC}"
sleep 5
if $COMPOSE_CMD ps | grep -q "cloudpaste-app"; then
    echo -e "${GREEN}✅ CloudPaste-X 服务已成功部署!${NC}"
    echo -e "${GREEN}访问地址: http://localhost:${PORT:-3000}${NC}"
    echo -e "${GREEN}MinIO控制台: http://localhost:9001${NC}"
else
    echo -e "${RED}⚠️ 服务部署可能存在问题，请检查日志:${NC}"
    $COMPOSE_CMD logs
fi

echo ""
echo -e "${GREEN}=======================================${NC}"
echo -e "${YELLOW}如需查看日志，请使用:${NC}"
echo -e "  $COMPOSE_CMD logs -f app"
echo -e "${YELLOW}如需备份数据，请使用:${NC}"
echo -e "  tar -czvf cloudpaste-backup.tar.gz data/ logs/ minio-data/"
echo -e "${GREEN}=======================================${NC}" 