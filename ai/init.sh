#!/bin/bash
# Agent Foreman 初始化脚本
# 有声小说项目环境配置

echo "正在初始化有声小说项目的Agent Foreman环境..."

# 检查并创建必要的目录结构
mkdir -p ai/ai-api

# 创建功能列表文件
cat > ai/feature_list.json << 'EOF'
{
  "metadata": {
    "project": "有声小说",
    "description": "创作爆款AI小说并生成有声小说的Web应用",
    "created": "2025-12-01",
    "version": "1.0.0"
  },
  "features": [
    {
      "id": "setup-ai-models",
      "description": "配置主流AI模型选择功能",
      "priority": 1,
      "status": "failing",
      "acceptance": [
        "支持多种主流AI模型配置",
        "前端可自由选择AI模型",
        "模型配置可动态更新"
      ],
      "dependencies": []
    },
    {
      "id": "novel-generation",
      "description": "AI小说生成功能",
      "priority": 2,
      "status": "failing",
      "acceptance": [
        "使用项目prompts目录下的小说生成模板",
        "AI生成小说内容",
        "支持小说内容修改和确认"
      ],
      "dependencies": ["setup-ai-models"]
    },
    {
      "id": "novel-analysis",
      "description": "小说角色分析功能",
      "priority": 3,
      "status": "failing",
      "acceptance": [
        "AI分析小说文本并识别角色",
        "为每个角色分配不同的音色和语气",
        "生成叙述人脚本"
      ],
      "dependencies": ["novel-generation"]
    },
    {
      "id": "tts-integration",
      "description": "INDEX-TTS2语音合成集成",
      "priority": 4,
      "status": "failing",
      "acceptance": [
        "集成INDEX-TTS2项目功能",
        "根据角色选择不同音色",
        "分段生成语音并组合输出音频文件"
      ],
      "dependencies": ["novel-analysis"]
    },
    {
      "id": "subtitle-generation",
      "description": "SRT字幕文件生成",
      "priority": 5,
      "status": "failing",
      "acceptance": [
        "同步生成SRT字幕文件",
        "字幕与音频时间轴匹配",
        "支持中文字符编码"
      ],
      "dependencies": ["tts-integration"]
    },
    {
      "id": "file-output",
      "description": "多格式文件输出功能",
      "priority": 6,
      "status": "failing",
      "acceptance": [
        "小说文本文件输出",
        "字幕文件输出",
        "音频文件输出",
        "文件管理和下载功能"
      ],
      "dependencies": ["subtitle-generation"]
    },
    {
      "id": "frontend-backend-separation",
      "description": "前后端分离架构",
      "priority": 7,
      "status": "failing",
      "acceptance": [
        "前后端代码分离",
        "API接口设计",
        "前端用户界面",
        "Docker部署支持"
      ],
      "dependencies": []
    },
    {
      "id": "docker-deployment",
      "description": "Docker容器化部署",
      "priority": 8,
      "status": "failing",
      "acceptance": [
        "Dockerfile配置",
        "docker-compose配置",
        "生产环境部署配置"
      ],
      "dependencies": ["frontend-backend-separation"]
    }
  ]
}
EOF

# 创建进度日志
cat > ai/progress.log << 'EOF'
[2025-12-01 14:02:00] Agent Foreman 初始化完成
[2025-12-01 14:02:00] 项目: 有声小说
[2025-12-01 14:02:00] 功能模块: 8个
[2025-12-01 14:02:00] 下一功能: setup-ai-models
EOF

# 创建ai-api目录下的初始化脚本
cat > ai/ai-api/init.sh << 'EOF'
#!/bin/bash
# AI API 初始化脚本

echo "初始化AI API环境..."

# 创建AI模型配置文件
cat > ai-models.json << 'EOF'
{
  "available_models": [
    {
      "id": "gpt-4",
      "name": "GPT-4",
      "provider": "OpenAI",
      "type": "text-generation"
    },
    {
      "id": "claude-3",
      "name": "Claude 3",
      "provider": "Anthropic",
      "type": "text-generation"
    },
    {
      "id": "gemini-pro",
      "name": "Gemini Pro",
      "provider": "Google",
      "type": "text-generation"
    },
    {
      "id": "qwen-max",
      "name": "Qwen Max",
      "provider": "Alibaba",
      "type": "text-generation"
    }
  ],
  "default_model": "gpt-4"
}
EOF

echo "AI API环境初始化完成"
EOF

# 执行AI API初始化脚本
chmod +x ai/ai-api/init.sh
bash ai/ai-api/init.sh

echo "Agent Foreman 环境初始化完成!"
echo "功能列表: ai/feature_list.json"
echo "进度日志: ai/progress.log"
echo "AI API 配置: ai/ai-api/ai-models.json"
EOF