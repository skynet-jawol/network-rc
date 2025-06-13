#!/bin/bash

echo "🧪 Network-RC 构建测试脚本"
echo "=========================="

# 检查Node.js版本
echo "📋 检查环境..."
NODE_VERSION=$(node --version)
echo "Node.js 版本: $NODE_VERSION"

NPM_VERSION=$(npm --version)
echo "npm 版本: $NPM_VERSION"

# 清理之前的构建
echo "🧹 清理之前的构建..."
npm run build:clean

# 安装依赖
echo "📦 安装依赖..."
npm ci

cd front-end
npm ci
cd ..

# 构建前端
echo "🔨 构建前端..."
cd front-end
npm run build
cd ..

# 运行系统检查
echo "🔍 运行系统检查..."
npm run check-system

# 创建发布包
echo "📦 创建发布包..."
npm run build

# 检查构建结果
echo "✅ 检查构建结果..."
if [ -f "dist/network-rc.tar.gz" ]; then
    echo "✅ 发布包创建成功: dist/network-rc.tar.gz"
    ls -lh dist/
else
    echo "❌ 发布包创建失败"
    exit 1
fi

if [ -d "front-end/build" ]; then
    echo "✅ 前端构建成功: front-end/build/"
    ls -lh front-end/build/
else
    echo "❌ 前端构建失败"
    exit 1
fi

echo ""
echo "🎉 构建测试完成！"
echo "================"
echo "构建产物:"
echo "  - 前端构建: front-end/build/"
echo "  - 发布包: dist/network-rc.tar.gz"
echo ""
echo "可以在本地测试运行:"
echo "  npm start" 