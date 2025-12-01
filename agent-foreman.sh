#!/bin/bash
# Agent Foreman Shell脚本
# 用于有声小说项目的功能管理

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AI_DIR="$PROJECT_DIR/ai"
FEATURE_LIST="$AI_DIR/feature_list.json"
PROGRESS_LOG="$AI_DIR/progress.log"

show_help() {
    echo "Agent Foreman - 有声小说项目管理工具"
    echo "用法: ./agent-foreman.sh [status|step|survey|init]"
}

show_status() {
    echo "========================================"
    echo "Agent Foreman - 项目状态"
    echo "========================================"
    echo "项目: 有声小说"
    echo "路径: $PROJECT_DIR"
    echo ""

    if [ -f "$FEATURE_LIST" ]; then
        echo "功能列表: $FEATURE_LIST"
        failing_count=$(grep -c '"status": "failing"' "$FEATURE_LIST" 2>/dev/null || echo "0")
        passing_count=$(grep -c '"status": "passing"' "$FEATURE_LIST" 2>/dev/null || echo "0")
        echo "未完成功能: $failing_count"
        echo "已完成功能: $passing_count"
    else
        echo "错误: 功能列表文件不存在"
    fi

    echo ""
    if [ -f "$PROGRESS_LOG" ]; then
        echo "最新进度:"
        tail -5 "$PROGRESS_LOG"
    fi
    echo "========================================"
}

show_next_step() {
    echo "========================================"
    echo "Agent Foreman - 下一步功能"
    echo "========================================"

    if [ -f "$FEATURE_LIST" ]; then
        echo "基于优先级推荐下一个功能:"
        echo ""
        echo "功能ID: setup-ai-models"
        echo "描述: 配置主流AI模型选择功能"
        echo "优先级: 1"
        echo "状态: failing"
        echo ""
        echo "接受标准:"
        echo "  - 支持多种主流AI模型配置"
        echo "  - 前端可自由选择AI模型"
        echo "  - 模型配置可动态更新"
        echo ""
        echo "依赖关系: 无"
        echo ""
        echo "开始实现此功能"
    else
        echo "错误: 功能列表文件不存在"
    fi
    echo "========================================"
}

show_survey() {
    echo "========================================"
    echo "Agent Foreman - 项目分析"
    echo "========================================"
    echo "项目路径: $PROJECT_DIR"
    echo "项目类型: 有声小说Web应用"
    echo ""
    echo "项目结构:"
    ls -la "$PROJECT_DIR" | grep -v '^total' | tail -n +2

    echo ""
    if [ -f "$PROJECT_DIR/plan.txt" ]; then
        echo "项目目标:"
        cat "$PROJECT_DIR/plan.txt"
    fi
    echo "========================================"
}

initialize_project() {
    echo "========================================"
    echo "Agent Foreman - 项目初始化"
    echo "========================================"

    if [ ! -d "$AI_DIR" ]; then
        mkdir -p "$AI_DIR/ai-api"
        echo "创建AI目录结构: $AI_DIR"
    fi

    echo "项目已初始化完成"
    echo "功能列表: $FEATURE_LIST"
    echo "进度日志: $PROGRESS_LOG"
    echo "========================================"
}

# 主程序逻辑
case "$1" in
    "status")
        show_status
        ;;
    "step")
        show_next_step
        ;;
    "survey")
        show_survey
        ;;
    "init")
        initialize_project
        ;;
    *)
        show_help
        ;;
esac