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
