#!/bin/bash

# AI 有声小说系统 - Docker 部署脚本
# 使用方法:
#   ./deploy-docker.sh [env] [options]
#
# 环境类型:
#   dev     - 开发环境
#   prod    - 生产环境 (默认)
#
# 选项:
#   --build     - 强制重新构建镜像
#   --clean     - 清理旧镜像和容器
#   --database  - 包含数据库服务
#   --monitor   - 包含监控服务
#   --logging   - 包含日志收集
#   --help      - 显示帮助信息

set -e

# 默认配置
ENVIRONMENT="prod"
BUILD_FLAG=""
CLEAN_FLAG=""
EXTRA_PROFILES=""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    cat << EOF
AI 有声小说系统 - Docker 部署脚本

使用方法:
  ./deploy-docker.sh [env] [options]

环境类型:
  dev     - 开发环境 (端口: 前端8080, 后端3000)
  prod    - 生产环境 (端口: 前端80, 后端3000)

选项:
  --build     - 强制重新构建镜像
  --clean     - 清理旧镜像和容器
  --database  - 包含PostgreSQL数据库服务
  --monitor   - 包含Prometheus监控服务
  --logging   - 包含Loki日志收集服务
  --help      - 显示此帮助信息

示例:
  ./deploy-docker.sh prod --build --database
  ./deploy-docker.sh dev --clean
  ./deploy-docker.sh prod --monitor --logging

EOF
}

# 解析命令行参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            dev|development)
                ENVIRONMENT="dev"
                shift
                ;;
            prod|production)
                ENVIRONMENT="prod"
                shift
                ;;
            --build)
                BUILD_FLAG="--build"
                shift
                ;;
            --clean)
                CLEAN_FLAG="true"
                shift
                ;;
            --database)
                EXTRA_PROFILES="$EXTRA_PROFILES --profile database"
                shift
                ;;
            --monitor)
                EXTRA_PROFILES="$EXTRA_PROFILES --profile monitoring"
                shift
                ;;
            --logging)
                EXTRA_PROFILES="$EXTRA_PROFILES --profile logging"
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# 检查Docker和Docker Compose
check_dependencies() {
    log_info "检查系统依赖..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi

    log_success "系统依赖检查通过"
}

# 清理旧的镜像和容器
clean_docker() {
    if [[ "$CLEAN_FLAG" == "true" ]]; then
        log_info "清理旧的Docker资源..."

        # 停止并删除相关容器
        docker-compose -f docker-compose.yml down --remove-orphans 2>/dev/null || true
        docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true

        # 删除相关镜像
        docker images | grep ai-novel | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true

        # 清理悬空镜像
        docker image prune -f

        log_success "Docker资源清理完成"
    fi
}

# 设置环境变量
setup_environment() {
    log_info "设置环境变量..."

    # 创建 .env 文件（如果不存在）
    if [[ ! -f .env ]]; then
        log_warning ".env 文件不存在，创建默认配置文件"
        cat > .env << EOF
# AI 有声小说系统环境变量

# 加密密钥（请修改为您的32字符密钥）
ENCRYPTION_KEY=your_32_character_encryption_key_here

# 数据库配置（可选，当使用PostgreSQL时）
POSTGRES_DB=ai_novel
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# 其他配置
EOF
        log_warning "请编辑 .env 文件并设置正确的环境变量"
    fi

    # 确保数据目录存在
    mkdir -p data logs temp
}

# 启动服务
start_services() {
    log_info "启动服务..."

    if [[ "$ENVIRONMENT" == "dev" ]]; then
        log_info "启动开发环境服务..."
        docker-compose -f docker-compose.dev.yml $BUILD_FLAG $EXTRA_PROFILES up -d
    else
        log_info "启动生产环境服务..."
        docker-compose -f docker-compose.yml $BUILD_FLAG $EXTRA_PROFILES up -d
    fi
}

# 等待服务启动
wait_for_services() {
    log_info "等待服务启动..."

    # 等待后端服务
    local backend_port=3000
    local frontend_port=80
    if [[ "$ENVIRONMENT" == "dev" ]]; then
        frontend_port=8080
    fi

    log_info "等待后端服务启动..."
    timeout 60 bash -c "until curl -f http://localhost:$backend_port/health &>/dev/null; do sleep 2; done" || {
        log_error "后端服务启动超时"
        return 1
    }

    log_info "等待前端服务启动..."
    timeout 30 bash -c "until curl -f http://localhost:$frontend_port &>/dev/null; do sleep 2; done" || {
        log_warning "前端服务可能仍在启动中"
    }
}

# 显示服务状态
show_status() {
    log_info "显示服务状态..."

    if [[ "$ENVIRONMENT" == "dev" ]]; then
        docker-compose -f docker-compose.dev.yml ps
    else
        docker-compose -f docker-compose.yml ps
    fi
}

# 显示访问信息
show_access_info() {
    log_success "🎉 AI 有声小说系统部署完成！"

    echo ""
    echo "访问地址:"
    if [[ "$ENVIRONMENT" == "dev" ]]; then
        echo "  前端应用: http://localhost:8080"
        echo "  API 文档: http://localhost:3000/api-docs"
    else
        echo "  前端应用: http://localhost"
        echo "  API 文档: http://localhost/api-docs"
    fi

    echo ""
    echo "服务端口:"
    echo "  前端服务: $([[ "$ENVIRONMENT" == "dev" ]] && echo "8080" || echo "80")"
    echo "  后端服务: 3000"
    echo "  Redis服务: 6379"

    if [[ "$EXTRA_PROFILES" == *"database"* ]]; then
        echo "  PostgreSQL: 5432"
        echo "  pgAdmin:    5050"
    fi

    if [[ "$EXTRA_PROFILES" == *"monitoring"* ]]; then
        echo "  Prometheus: 9090"
    fi

    if [[ "$EXTRA_PROFILES" == *"logging"* ]]; then
        echo "  Loki:       3100"
    fi

    echo ""
    echo "管理命令:"
    echo "  查看日志: docker-compose logs -f"
    echo "  停止服务: docker-compose down"
    echo "  重启服务: docker-compose restart"

    if [[ "$ENVIRONMENT" == "dev" ]]; then
        echo "  开发环境: docker-compose -f docker-compose.dev.yml [command]"
    fi
}

# 主函数
main() {
    log_info "AI 有声小说系统 - Docker 部署开始"
    echo ""

    # 解析参数
    parse_args "$@"

    # 检查依赖
    check_dependencies

    # 清理旧资源
    clean_docker

    # 设置环境
    setup_environment

    # 启动服务
    start_services

    # 等待服务启动
    if wait_for_services; then
        # 显示状态
        show_status

        # 显示访问信息
        show_access_info

        log_success "部署完成！"
    else
        log_error "部署失败，请检查日志"
        exit 1
    fi
}

# 执行主函数
main "$@"