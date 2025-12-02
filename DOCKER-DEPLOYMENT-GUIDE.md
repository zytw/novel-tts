# Docker部署指南

## 🐳 AI小说创作与语音合成平台 Docker 部署

本指南详细说明如何使用Docker容器化部署AI小说创作与语音合成平台。

## 📋 部署概述

### 服务架构
- **前端服务**: Vue.js + Nginx (端口80)
- **后端API**: Node.js + Express (端口3000)
- **缓存服务**: Redis (端口6379)
- **数据库服务**: PostgreSQL (端口5432，可选)
- **监控服务**: Prometheus (端口9090，可选)
- **日志服务**: Loki (端口3100，可选)

## 🔧 前置要求

### 1. 安装Docker Desktop
```bash
# Windows
# 下载并安装 Docker Desktop for Windows
# https://www.docker.com/products/docker-desktop/

# Linux
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### 2. 启动Docker服务
```bash
# Windows
# 启动 Docker Desktop 应用程序

# Linux
sudo systemctl start docker
sudo systemctl enable docker
```

### 3. 验证安装
```bash
docker --version
docker-compose --version
docker info
```

## 🚀 快速部署

### 1. 克隆项目
```bash
git clone https://github.com/zytw/novel-tts.git
cd novel-tts
```

### 2. 基础部署（仅核心服务）
```bash
# 启动核心服务：前端、后端、Redis
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 3. 完整部署（包含可选服务）
```bash
# 启动所有服务（包含数据库和监控）
docker-compose --profile database --profile monitoring up -d

# 启动数据库服务
docker-compose --profile database up -d

# 启动监控服务
docker-compose --profile monitoring up -d

# 启动日志服务
docker-compose --profile logging up -d
```

## 📝 环境配置

### 1. 环境变量文件
创建 `.env` 文件：
```bash
# 数据库配置（可选）
POSTGRES_DB=ai_novel
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password

# 加密密钥
ENCRYPTION_KEY=your_32_character_encryption_key_here

# 其他配置
NODE_ENV=production
```

### 2. AI模型配置
项目包含预配置的 `ai-models.json` 文件，支持以下AI模型：
- OpenAI GPT-4/GPT-3.5 Turbo
- Anthropic Claude 3 Sonnet
- Google Gemini Pro
- 阿里通义千问 Max

## 🔍 服务访问地址

部署成功后，可通过以下地址访问各项服务：

### 主要服务
- **前端应用**: http://localhost
- **后端API**: http://localhost/api
- **API健康检查**: http://localhost/api/health

### 可选服务
- **Redis**: localhost:6379
- **PostgreSQL**: localhost:5432
- **Prometheus监控**: http://localhost:9090
- **Loki日志**: http://localhost:3100

## 🛠️ 常用命令

### 服务管理
```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启特定服务
docker-compose restart backend

# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f redis
```

### 数据管理
```bash
# 查看数据卷
docker volume ls

# 备份数据
docker run --rm -v novel-tts_backend_data:/data -v $(pwd):/backup alpine tar czf /backup/backend-data-backup.tar.gz -C /data .

# 恢复数据
docker run --rm -v novel-tts_backend_data:/data -v $(pwd):/backup alpine tar xzf /backup/backend-data-backup.tar.gz -C /data
```

### 更新部署
```bash
# 重新构建并部署
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 仅更新特定服务
docker-compose up -d --build backend
```

## 🔧 故障排除

### 1. 端口冲突
如果遇到端口冲突，修改 `docker-compose.yml` 中的端口映射：
```yaml
ports:
  - "8080:80"    # 前端改为8080端口
  - "3001:3000"  # 后端改为3001端口
```

### 2. 内存不足
调整Docker Desktop内存限制：
- 打开Docker Desktop设置
- 调整内存分配（建议4GB以上）

### 3. 服务启动失败
```bash
# 查看详细错误日志
docker-compose logs service_name

# 重新构建镜像
docker-compose build --no-cache service_name

# 清理Docker缓存
docker system prune -a
```

### 4. 网络问题
```bash
# 重置Docker网络
docker-compose down
docker network prune
docker-compose up -d
```

## 📊 监控和日志

### 1. 健康检查
所有服务都配置了健康检查：
```bash
# 查看服务健康状态
docker-compose ps
```

### 2. 日志管理
```bash
# 实时查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend

# 日志文件位置
# 前端：nginx access/error日志
# 后端：/app/logs 目录
```

### 3. 性能监控
启用Prometheus监控后：
- 访问 http://localhost:9090
- 查看服务指标和性能数据

## 🔒 安全配置

### 1. 生产环境安全
- 更改默认密码
- 配置防火墙规则
- 启用HTTPS（需要额外配置）
- 定期更新镜像

### 2. 网络安全
```yaml
# 仅允许内部网络通信
networks:
  ai-novel-network:
    driver: bridge
    internal: true  # 取消注释以启用内部网络
```

## 📈 扩展配置

### 1. 负载均衡
可以使用多个后端实例：
```yaml
backend:
  deploy:
    replicas: 3
```

### 2. 数据持久化
重要数据已通过Docker卷持久化：
- `backend_data`: 应用数据
- `postgres_data`: 数据库数据
- `redis_data`: Redis缓存数据

### 3. 环境隔离
为不同环境创建不同的compose文件：
- `docker-compose.yml` - 基础配置
- `docker-compose.prod.yml` - 生产环境
- `docker-compose.dev.yml` - 开发环境

## 📞 技术支持

如果遇到部署问题：

1. **检查Docker状态**: `docker info`
2. **查看服务日志**: `docker-compose logs`
3. **验证配置文件**: 确保 `.env` 文件正确
4. **检查资源使用**: 确保系统资源充足
5. **参考官方文档**: Docker和各服务官方文档

---

## 🎉 部署成功！

部署完成后，您将拥有一个完全功能的AI小说创作与语音合成平台，包括：

- ✅ 现代化的Web前端界面
- ✅ 高性能的后端API服务
- ✅ Redis缓存加速
- ✅ 完整的错误处理和监控
- ✅ 生产级的安全配置
- ✅ 灵活的扩展能力

享受您的AI小说创作之旅！