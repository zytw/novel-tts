# AI 有声小说系统 - 部署指南

## 概述

这是一个基于前后端分离架构的 AI 有声小说生成系统，支持 Docker 容器化部署。

## 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端 (Vue3)    │────│  Nginx 反向代理  │────│  后端 (Express) │
│   Port: 80      │    │   Port: 80      │    │   Port: 3000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                               ┌─────────────────┐
                                               │   Redis 缓存    │
                                               │   Port: 6379    │
                                               └─────────────────┘
```

## 快速开始

### 1. 环境要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 5GB 可用磁盘空间

### 2. 克隆项目

```bash
git clone <repository-url>
cd 有声小说
```

### 3. 环境配置

创建环境变量文件：

```bash
# 复制环境配置模板
cp backend/.env.example .env

# 编辑环境变量
nano .env
```

主要环境变量：
```env
# 加密密钥（用于API密钥加密）
ENCRYPTION_KEY=your_32_character_encryption_key_here

# 其他配置...
```

### 4. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 5. 访问系统

- 前端界面: http://localhost:80
- API 文档: http://localhost/api-docs
- 健康检查: http://localhost/health

## 服务详解

### 前端服务 (Frontend)

- **技术栈**: Vue 3 + Element Plus + Vite
- **端口**: 80
- **功能**: 用户界面、交互逻辑
- **容器**: `ai-novel-frontend`

### 后端服务 (Backend)

- **技术栈**: Node.js + Express + TypeScript
- **端口**: 3000
- **功能**: API 接口、业务逻辑、AI 集成
- **容器**: `ai-novel-backend`

### Redis 缓存

- **用途**: 会话缓存、临时数据存储
- **端口**: 6379
- **容器**: `ai-novel-redis`

## 常用命令

### 服务管理

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启服务
docker-compose restart

# 重新构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f [service-name]

# 进入容器
docker-compose exec backend sh
docker-compose exec frontend sh
```

### 数据管理

```bash
# 备份数据
docker-compose exec backend tar czf /backup/data-$(date +%Y%m%d).tar.gz /app/data

# 恢复数据
docker-compose exec backend tar xzf /backup/data-20240101.tar.gz -C /

# 清理临时文件
docker-compose exec backend node -e "const fs = require('fs'); fs.rmSync('/app/temp', { recursive: true, force: true });"
```

## 配置选项

### 生产环境配置

1. **环境变量**:
   ```env
   NODE_ENV=production
   PORT=3000
   ```

2. **反向代理配置** (nginx.conf):
   - 支持 gzip 压缩
   - 静态资源缓存
   - API 代理
   - 安全头部

3. **资源限制** (docker-compose.yml):
   ```yaml
   deploy:
     resources:
       limits:
         memory: 512M
       reservations:
         memory: 256M
   ```

### 开发环境配置

```bash
# 仅启动开发服务
docker-compose -f docker-compose.dev.yml up -d

# 热重开发
docker-compose -f docker-compose.dev.yml exec backend npm run dev
```

## 监控和日志

### 健康检查

所有服务都配置了健康检查：

```bash
# 检查所有服务健康状态
docker-compose ps

# 查看健康检查日志
docker inspect ai-novel-backend | jq '.[0].State.Health'
```

### 日志管理

```bash
# 查看实时日志
docker-compose logs -f

# 日志轮转配置
docker-compose exec backend npm run logs:rotate
```

### 性能监控

```bash
# 查看资源使用情况
docker stats

# 查看容器详细信息
docker inspect ai-novel-backend
```

## 安全配置

### 1. 网络安全

- 使用 Docker 网络隔离
- 仅暴露必要端口
- 配置防火墙规则

### 2. 应用安全

- Helmet 安全头部
- CORS 配置
- 输入验证
- 错误处理

### 3. 数据安全

- 环境变量加密
- 定期备份数据
- 访问权限控制

## 故障排除

### 常见问题

1. **端口冲突**:
   ```bash
   # 检查端口占用
   netstat -tulpn | grep :80
   lsof -i :3000
   ```

2. **内存不足**:
   ```bash
   # 检查内存使用
   docker stats
   free -h
   ```

3. **磁盘空间不足**:
   ```bash
   # 清理 Docker 镜像
   docker system prune -a
   df -h
   ```

4. **服务无法启动**:
   ```bash
   # 查看详细日志
   docker-compose logs backend
   docker-compose logs frontend
   ```

### 调试模式

```bash
# 启用调试模式
docker-compose -f docker-compose.debug.yml up

# 进入调试容器
docker-compose exec backend sh
```

## 更新和维护

### 版本更新

```bash
# 拉取最新代码
git pull origin main

# 重新构建并部署
docker-compose down
docker-compose up -d --build
```

### 数据迁移

```bash
# 导出数据
docker-compose exec backend npm run db:export

# 导入数据
docker-compose exec backend npm run db:import
```

## 扩展配置

### 负载均衡

```yaml
# docker-compose.scale.yml
services:
  backend:
    scale: 3

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf
```

### 数据库集成

```yaml
# docker-compose.db.yml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ai_novel_tts
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

## 备份和恢复

### 自动备份脚本

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup"

# 创建备份
docker-compose exec backend tar czf ${BACKUP_DIR}/backup_${DATE}.tar.gz /app/data

# 清理旧备份（保留7天）
find ${BACKUP_DIR} -name "backup_*.tar.gz" -mtime +7 -delete
```

### 恢复流程

```bash
# 1. 停止服务
docker-compose down

# 2. 恢复数据
docker-compose up -d
docker-compose exec backend tar xzf /backup/backup_20240101_120000.tar.gz -C /

# 3. 重启服务
docker-compose restart
```

## 联系支持

如有问题，请：

1. 查看日志文件排查问题
2. 检查 GitHub Issues
3. 联系技术支持团队

---

**注意**: 请确保在生产环境中使用强密码和适当的安全配置。