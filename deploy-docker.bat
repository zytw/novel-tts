@echo off
setlocal enabledelayedexpansion

REM AI 有声小说系统 - Docker 部署脚本 (Windows)
REM 使用方法:
REM   deploy-docker.bat [env] [options]
REM
REM 环境类型:
REM   dev     - 开发环境
REM   prod    - 生产环境 (默认)
REM
REM 选项:
REM   --build     - 强制重新构建镜像
REM   --clean     - 清理旧镜像和容器
REM   --database  - 包含数据库服务
REM   --monitor   - 包含监控服务
REM   --logging   - 包含日志收集
REM   --help      - 显示帮助信息

REM 默认配置
set "ENVIRONMENT=prod"
set "BUILD_FLAG="
set "CLEAN_FLAG="
set "EXTRA_PROFILES="

REM 解析命令行参数
:parse_args
if "%~1"=="" goto :main_start
if "%~1"=="dev" (
    set "ENVIRONMENT=dev"
    shift
    goto :parse_args
)
if "%~1"=="development" (
    set "ENVIRONMENT=dev"
    shift
    goto :parse_args
)
if "%~1"=="prod" (
    set "ENVIRONMENT=prod"
    shift
    goto :parse_args
)
if "%~1"=="production" (
    set "ENVIRONMENT=prod"
    shift
    goto :parse_args
)
if "%~1"=="--build" (
    set "BUILD_FLAG=--build"
    shift
    goto :parse_args
)
if "%~1"=="--clean" (
    set "CLEAN_FLAG=true"
    shift
    goto :parse_args
)
if "%~1"=="--database" (
    set "EXTRA_PROFILES=%EXTRA_PROFILES% --profile database"
    shift
    goto :parse_args
)
if "%~1"=="--monitor" (
    set "EXTRA_PROFILES=%EXTRA_PROFILES% --profile monitoring"
    shift
    goto :parse_args
)
if "%~1"=="--logging" (
    set "EXTRA_PROFILES=%EXTRA_PROFILES% --profile logging"
    shift
    goto :parse_args
)
if "%~1"=="--help" (
    goto :show_help
)
echo [错误] 未知参数: %~1
goto :show_help

:main_start
echo [信息] AI 有声小说系统 - Docker 部署开始
echo.

REM 检查Docker
echo [信息] 检查系统依赖...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker 未安装，请先安装 Docker Desktop
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    docker compose version >nul 2>&1
    if errorlevel 1 (
        echo [错误] Docker Compose 未安装，请先安装 Docker Compose
        pause
        exit /b 1
    )
)
echo [成功] 系统依赖检查通过

REM 清理旧资源
if "%CLEAN_FLAG%"=="true" (
    echo [信息] 清理旧的Docker资源...
    docker-compose -f docker-compose.yml down --remove-orphans 2>nul
    docker-compose -f docker-compose.dev.yml down --remove-orphans 2>nul
    docker images | findstr ai-novel > temp_images.txt
    if exist temp_images.txt (
        for /f "tokens=3" %%i in (temp_images.txt) do docker rmi -f %%i 2>nul
        del temp_images.txt
    )
    docker image prune -f
    echo [成功] Docker资源清理完成
)

REM 创建环境文件
if not exist .env (
    echo [警告] .env 文件不存在，创建默认配置文件
    (
        echo # AI 有声小说系统环境变量
        echo.
        echo # 加密密钥（请修改为您的32字符密钥）
        echo ENCRYPTION_KEY=your_32_character_encryption_key_here
        echo.
        echo # 数据库配置（可选，当使用PostgreSQL时）
        echo POSTGRES_DB=ai_novel
        echo POSTGRES_USER=postgres
        echo POSTGRES_PASSWORD=postgres
        echo.
        echo # 其他配置
    ) > .env
    echo [警告] 请编辑 .env 文件并设置正确的环境变量
)

REM 创建必要目录
if not exist data mkdir data
if not exist logs mkdir logs
if not exist temp mkdir temp

REM 启动服务
if "%ENVIRONMENT%"=="dev" (
    echo [信息] 启动开发环境服务...
    docker-compose -f docker-compose.dev.yml %BUILD_FLAG% %EXTRA_PROFILES% up -d
) else (
    echo [信息] 启动生产环境服务...
    docker-compose -f docker-compose.yml %BUILD_FLAG% %EXTRA_PROFILES% up -d
)

REM 等待服务启动
echo [信息] 等待服务启动...
set "backend_port=3000"
set "frontend_port=80"
if "%ENVIRONMENT%"=="dev" (
    set "frontend_port=8080"
)

REM 简单的等待服务启动的检查
timeout /t 10 /nobreak >nul

REM 显示服务状态
echo [信息] 显示服务状态...
if "%ENVIRONMENT%"=="dev" (
    docker-compose -f docker-compose.dev.yml ps
) else (
    docker-compose -f docker-compose.yml ps
)

REM 显示访问信息
echo.
echo [成功] 🎉 AI 有声小说系统部署完成！
echo.
echo 访问地址:
if "%ENVIRONMENT%"=="dev" (
    echo   前端应用: http://localhost:8080
    echo   API 文档: http://localhost:3000/api-docs
) else (
    echo   前端应用: http://localhost
    echo   API 文档: http://localhost/api-docs
)
echo.
echo 服务端口:
if "%ENVIRONMENT%"=="dev" (
    echo   前端服务: 8080
) else (
    echo   前端服务: 80
)
echo   后端服务: 3000
echo   Redis服务: 6379

if not "%EXTRA_PROFILES%"=="" (
    echo   PostgreSQL: 5432
    echo   pgAdmin:    5050
)

if "%EXTRA_PROFILES%"=="--profile monitoring" (
    echo   Prometheus: 9090
)

if "%EXTRA_PROFILES%"=="--profile logging" (
    echo   Loki:       3100
)
echo.
echo 管理命令:
echo   查看日志: docker-compose logs -f
echo   停止服务: docker-compose down
echo   重启服务: docker-compose restart

if "%ENVIRONMENT%"=="dev" (
    echo   开发环境: docker-compose -f docker-compose.dev.yml [command]
)
echo.
echo [成功] 部署完成！
pause
exit /b 0

:show_help
echo.
echo AI 有声小说系统 - Docker 部署脚本 ^(Windows^)
echo.
echo 使用方法:
echo   deploy-docker.bat [env] [options]
echo.
echo 环境类型:
echo   dev     - 开发环境 ^(端口: 前端8080, 后端3000^)
echo   prod    - 生产环境 ^(端口: 前端80, 后端3000^)
echo.
echo 选项:
echo   --build     - 强制重新构建镜像
echo   --clean     - 清理旧镜像和容器
echo   --database  - 包含PostgreSQL数据库服务
echo   --monitor   - 包含Prometheus监控服务
echo   --logging   - 包含Loki日志收集服务
echo   --help      - 显示此帮助信息
echo.
echo 示例:
echo   deploy-docker.bat prod --build --database
echo   deploy-docker.bat dev --clean
echo   deploy-docker.bat prod --monitor --logging
echo.
pause
exit /b 0