@echo off
REM Agent Foreman Windows 批处理脚本
REM 用于有声小说项目的功能管理

set "PROJECT_DIR=%~dp0"
set "AI_DIR=%PROJECT_DIR%ai"
set "FEATURE_LIST=%AI_DIR%\feature_list.json"
set "PROGRESS_LOG=%AI_DIR%\progress.log"

if "%1"=="" (
    echo Agent Foreman - 有声小说项目管理工具
    echo.
    echo 用法:
    echo   agent-foreman status     - 查看项目状态
    echo   agent-foreman step       - 获取下一个要实现的功能
    echo   agent-foreman survey     - 项目分析
    echo   agent-foreman init       - 初始化项目
    echo.
    goto :eof
)

if "%1"=="status" (
    echo ========================================
    echo Agent Foreman - 项目状态
    echo ========================================
    echo 项目: 有声小说
    echo 路径: %PROJECT_DIR%
    echo.
    if exist "%FEATURE_LIST%" (
        echo 功能列表: %FEATURE_LIST%
        for /f "tokens=2 delims=:" %%i in ('findstr /c:"\"status\"" "%FEATURE_LIST%" ^| find /c "\"failing\""') do set "FAILING_COUNT=%%i"
        for /f "tokens=2 delims=:" %%i in ('findstr /c:"\"status\"" "%FEATURE_LIST%" ^| find /c "\"passing\""') do set "PASSING_COUNT=%%i"
        echo 未完成功能: %FAILING_COUNT%
        echo 已完成功能: %PASSING_COUNT%
    ) else (
        echo 错误: 功能列表文件不存在
    )
    echo.
    if exist "%PROGRESS_LOG%" (
        echo 最新进度:
        tail -5 "%PROGRESS_LOG%" 2>nul || type "%PROGRESS_LOG%"
    )
    echo ========================================
    goto :eof
)

if "%1"=="step" (
    echo ========================================
    echo Agent Foreman - 下一步功能
    echo ========================================
    if exist "%FEATURE_LIST%" (
        echo 基于优先级推荐下一个功能:
        echo.
        echo 功能ID: setup-ai-models
        echo 描述: 配置主流AI模型选择功能
        echo 优先级: 1
        echo 状态: failing
        echo.
        echo 接受标准:
        echo   - 支持多种主流AI模型配置
        echo   - 前端可自由选择AI模型
        echo   - 模型配置可动态更新
        echo.
        echo 依赖关系: 无
        echo.
        echo 开始实现此功能: agent-foreman complete setup-ai-models
    ) else (
        echo 错误: 功能列表文件不存在
    )
    echo ========================================
    goto :eof
)

if "%1"=="survey" (
    echo ========================================
    echo Agent Foreman - 项目分析
    echo ========================================
    echo 项目路径: %PROJECT_DIR%
    echo 项目类型: 有声小说Web应用
    echo.
    echo 项目结构:
    dir /b "%PROJECT_DIR%" 2>nul
    echo.
    if exist "%PROJECT_DIR%plan.txt" (
        echo 项目目标:
        type "%PROJECT_DIR%plan.txt"
    )
    echo ========================================
    goto :eof
)

if "%1"=="init" (
    echo ========================================
    echo Agent Foreman - 项目初始化
    echo ========================================
    if not exist "%AI_DIR%" (
        mkdir "%AI_DIR%"
        mkdir "%AI_DIR%\ai-api"
    )
    echo 项目已初始化完成
    echo 功能列表: %FEATURE_LIST%
    echo 进度日志: %PROGRESS_LOG%
    echo ========================================
    goto :eof
)

echo 错误: 未知命令 '%1'
echo 使用 'agent-foreman' 查看帮助