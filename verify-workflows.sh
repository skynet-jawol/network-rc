#!/bin/bash

echo "🔍 GitHub Actions 工作流验证脚本"
echo "================================"

# 检查工作流文件是否存在
echo "📋 检查工作流文件..."

WORKFLOW_FILES=(
  ".github/workflows/main.yml"
  ".github/workflows/deploy.yml"
  ".github/workflows/codeql-analysis.yml"
)

for file in "${WORKFLOW_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file 存在"
  else
    echo "❌ $file 不存在"
    exit 1
  fi
done

# 检查基本YAML结构
echo ""
echo "🔧 检查YAML结构..."

for file in "${WORKFLOW_FILES[@]}"; do
  echo "检查 $file..."
  
  # 检查是否包含必要的YAML结构
  if grep -q "^name:" "$file" && grep -q "^on:" "$file" && grep -q "^jobs:" "$file"; then
    echo "✅ $file 基本结构正确"
  else
    echo "❌ $file 基本结构错误"
    exit 1
  fi
done

# 检查版本号
echo ""
echo "📦 检查Actions版本..."

# 检查main.yml
echo "检查 main.yml..."
if grep -q "actions/checkout@v4" .github/workflows/main.yml; then
  echo "✅ actions/checkout@v4"
else
  echo "❌ actions/checkout 版本不是v4"
fi

if grep -q "actions/setup-node@v4" .github/workflows/main.yml; then
  echo "✅ actions/setup-node@v4"
else
  echo "❌ actions/setup-node 版本不是v4"
fi

if grep -q "actions/upload-artifact@v4" .github/workflows/main.yml; then
  echo "✅ actions/upload-artifact@v4"
else
  echo "❌ actions/upload-artifact 版本不是v4"
fi

# 检查deploy.yml
echo ""
echo "检查 deploy.yml..."
if grep -q "actions/upload-pages-artifact@v4" .github/workflows/deploy.yml; then
  echo "✅ actions/upload-pages-artifact@v4"
else
  echo "❌ actions/upload-pages-artifact 版本不是v4"
fi

# 检查codeql-analysis.yml
echo ""
echo "检查 codeql-analysis.yml..."
if grep -q "github/codeql-action/init@v3" .github/workflows/codeql-analysis.yml; then
  echo "✅ github/codeql-action/init@v3"
else
  echo "❌ github/codeql-action/init 版本不是v3"
fi

# 检查是否有弃用的版本
echo ""
echo "🚨 检查弃用版本..."

DEPRECATED_PATTERNS=(
  "actions/upload-artifact@v3"
  "actions/checkout@v3"
  "actions/setup-node@v3"
  "actions/upload-pages-artifact@v3"
  "github/codeql-action/init@v1"
  "github/codeql-action/autobuild@v1"
  "github/codeql-action/analyze@v1"
)

DEPRECATED_FOUND=false
for pattern in "${DEPRECATED_PATTERNS[@]}"; do
  if grep -r "$pattern" .github/workflows/ >/dev/null 2>&1; then
    echo "❌ 发现弃用版本: $pattern"
    grep -r "$pattern" .github/workflows/
    DEPRECATED_FOUND=true
  else
    echo "✅ 未发现弃用版本: $pattern"
  fi
done

echo ""
echo "🎉 验证完成！"
echo "============"

# 显示工作流文件内容摘要
echo "📄 工作流文件摘要:"
for file in "${WORKFLOW_FILES[@]}"; do
  echo "  - $file"
  echo "    名称: $(grep '^name:' "$file" | head -1 | sed 's/name: //')"
  echo "    触发条件: $(grep -A 5 '^on:' "$file" | grep -E "(push|pull_request|schedule)" | head -1 | tr -d ' ')"
  echo ""
done

if [ "$DEPRECATED_FOUND" = true ]; then
  echo "⚠️  发现弃用版本，请更新到最新版本"
  exit 1
else
  echo "✅ 所有版本都是最新的"
fi

echo "📋 下一步:"
echo "  1. 提交更改到GitHub"
echo "  2. 检查Actions标签页"
echo "  3. 验证构建是否成功" 