# Agent Foreman PowerShell脚本
param($Command)

$ProjectDir = $PSScriptRoot
$AiDir = "$ProjectDir\ai"
$FeatureList = "$AiDir\feature_list.json"
$ProgressLog = "$AiDir\progress.log"

function Show-Help {
    Write-Host "Agent Foreman - 有声小说项目管理工具"
    Write-Host "用法: ./agent-foreman.ps1 [status|step|survey|init]"
}

function Show-Status {
    Write-Host "========================================"
    Write-Host "Agent Foreman - 项目状态"
    Write-Host "========================================"
    Write-Host "项目: 有声小说"
    Write-Host "路径: $ProjectDir"
    Write-Host ""

    if (Test-Path $FeatureList) {
        Write-Host "功能列表: $FeatureList"
        $content = Get-Content $FeatureList -Raw
        $failingCount = ([regex]::Matches($content, '"status": "failing"')).Count
        $passingCount = ([regex]::Matches($content, '"status": "passing"')).Count
        Write-Host "未完成功能: $failingCount"
        Write-Host "已完成功能: $passingCount"
    } else {
        Write-Host "错误: 功能列表文件不存在"
    }

    Write-Host ""
    if (Test-Path $ProgressLog) {
        Write-Host "最新进度:"
        Get-Content $ProgressLog | Select-Object -Last 5
    }
    Write-Host "========================================"
}

function Show-NextStep {
    Write-Host "========================================"
    Write-Host "Agent Foreman - 下一步功能"
    Write-Host "========================================"

    if (Test-Path $FeatureList) {
        Write-Host "基于优先级推荐下一个功能:"
        Write-Host ""
        Write-Host "功能ID: setup-ai-models"
        Write-Host "描述: 配置主流AI模型选择功能"
        Write-Host "优先级: 1"
        Write-Host "状态: failing"
        Write-Host ""
        Write-Host "接受标准:"
        Write-Host "  - 支持多种主流AI模型配置"
        Write-Host "  - 前端可自由选择AI模型"
        Write-Host "  - 模型配置可动态更新"
        Write-Host ""
        Write-Host "依赖关系: 无"
        Write-Host ""
        Write-Host "开始实现此功能"
    } else {
        Write-Host "错误: 功能列表文件不存在"
    }
    Write-Host "========================================"
}

function Show-Survey {
    Write-Host "========================================"
    Write-Host "Agent Foreman - 项目分析"
    Write-Host "========================================"
    Write-Host "项目路径: $ProjectDir"
    Write-Host "项目类型: 有声小说Web应用"
    Write-Host ""
    Write-Host "项目结构:"

    Get-ChildItem $ProjectDir | ForEach-Object {
        if ($_.PSIsContainer) {
            Write-Host "  [目录] $($_.Name)"
        } else {
            Write-Host "  [文件] $($_.Name)"
        }
    }

    Write-Host ""
    $planFile = "$ProjectDir\plan.txt"
    if (Test-Path $planFile) {
        Write-Host "项目目标:"
        Get-Content $planFile
    }
    Write-Host "========================================"
}

function Initialize-Project {
    Write-Host "========================================"
    Write-Host "Agent Foreman - 项目初始化"
    Write-Host "========================================"

    if (-not (Test-Path $AiDir)) {
        New-Item -ItemType Directory -Path $AiDir -Force | Out-Null
        $aiApiDir = "$AiDir\ai-api"
        New-Item -ItemType Directory -Path $aiApiDir -Force | Out-Null
        Write-Host "创建AI目录结构: $AiDir"
    }

    Write-Host "项目已初始化完成"
    Write-Host "功能列表: $FeatureList"
    Write-Host "进度日志: $ProgressLog"
    Write-Host "========================================"
}

# 主程序逻辑
if ($Command -eq "") {
    Show-Help
} elseif ($Command -eq "status") {
    Show-Status
} elseif ($Command -eq "step") {
    Show-NextStep
} elseif ($Command -eq "survey") {
    Show-Survey
} elseif ($Command -eq "init") {
    Initialize-Project
} else {
    Show-Help
}