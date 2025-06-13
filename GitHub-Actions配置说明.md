# GitHub Actions 自动编译配置说明

## 概述

本项目已配置完整的GitHub Actions自动编译和发布流程，确保项目能够正常生成代码包并自动发布。

## 配置的工作流

### 1. 主构建工作流 (`.github/workflows/main.yml`)

**功能:**
- 自动构建前端和后端代码
- 运行系统兼容性检查
- 创建完整的发布包
- 上传构建产物到GitHub Actions
- 自动创建GitHub Release (当推送标签时)

**触发条件:**
- 推送到 `master` 或 `main` 分支
- 创建版本标签 (如 `v2.8.0`)
- 创建Pull Request

### 2. GitHub Pages部署工作流 (`.github/workflows/deploy.yml`)

**功能:**
- 自动构建前端项目
- 部署到GitHub Pages
- 提供在线演示

**触发条件:**
- 推送到 `master` 或 `main` 分支
- 手动触发

### 3. 代码安全分析 (`.github/workflows/codeql-analysis.yml`)

**功能:**
- 使用CodeQL进行代码安全分析
- 检测潜在的安全漏洞

## 优化的构建脚本

### package.json 脚本更新

```json
{
  "scripts": {
    "build": "npm run build:frontend && npm run build:package",
    "build:frontend": "cd front-end && npm install && npm run build",
    "build:package": "创建完整的发布包",
    "build:clean": "清理构建文件",
    "check-system": "运行系统兼容性检查",
    "test": "运行测试",
    "ci": "CI环境专用构建命令"
  }
}
```

### 主要改进

1. **分离构建步骤**: 将前端构建和打包分离，便于调试
2. **错误处理**: 添加了错误处理和容错机制
3. **清理功能**: 添加了清理构建文件的功能
4. **CI优化**: 专门为CI环境优化的构建命令

## 本地测试

### 测试构建脚本

创建了 `test-build.sh` 脚本用于本地测试：

```bash
./test-build.sh
```

**功能:**
- 检查Node.js和npm版本
- 清理之前的构建
- 安装依赖
- 构建前端
- 运行系统检查
- 创建发布包
- 验证构建结果

### 手动测试步骤

1. **检查环境**
   ```bash
   node --version  # 应该是 18.x
   npm --version
   ```

2. **清理构建**
   ```bash
   npm run build:clean
   ```

3. **安装依赖**
   ```bash
   npm ci
   cd front-end && npm ci && cd ..
   ```

4. **构建前端**
   ```bash
   cd front-end && npm run build && cd ..
   ```

5. **运行检查**
   ```bash
   npm run check-system
   ```

6. **创建发布包**
   ```bash
   npm run build
   ```

## 发布流程

### 自动发布

1. **创建标签**
   ```bash
   git tag v2.8.1
   git push origin v2.8.1
   ```

2. **自动触发**
   - GitHub Actions自动检测标签
   - 运行构建流程
   - 创建GitHub Release
   - 上传发布包

### 手动发布

1. 在GitHub仓库页面点击 "Releases"
2. 点击 "Draft a new release"
3. 选择标签或创建新标签
4. 填写发布说明
5. 发布

## 构建产物

### 1. 前端构建
- **位置**: `front-end/build/`
- **内容**: 编译后的React应用
- **用途**: 部署到GitHub Pages或本地服务器

### 2. 发布包
- **位置**: `dist/network-rc.tar.gz`
- **内容**: 完整的项目文件，包含所有依赖
- **大小**: 约50-100MB
- **用途**: 一键部署到树莓派

### 3. 构建产物
- **位置**: GitHub Actions Artifacts
- **保留时间**: 30天
- **用途**: 调试和测试

## 环境要求

### Node.js
- **版本**: 18.x (推荐)
- **包管理器**: npm
- **缓存**: 启用npm缓存以提高构建速度

### 系统依赖
- **前端**: React 16.x, Ant Design 4.x, craco
- **后端**: Express, WebSocket, GPIO库
- **构建工具**: craco, webpack

## 故障排除

### 常见问题

1. **构建失败**
   - 检查Node.js版本是否为18.x
   - 确保所有依赖正确安装
   - 查看GitHub Actions日志

2. **前端构建失败**
   - 检查前端依赖是否完整
   - 确保craco配置正确
   - 检查React版本兼容性

3. **发布包创建失败**
   - 检查文件权限
   - 确保有足够的磁盘空间
   - 验证assets目录存在

### 调试步骤

1. **本地测试**
   ```bash
   ./test-build.sh
   ```

2. **检查构建产物**
   ```bash
   ls -la dist/
   ls -la front-end/build/
   ```

3. **查看GitHub Actions日志**
   - 进入GitHub仓库
   - 点击 "Actions" 标签
   - 查看具体工作流日志

## 配置更新

### 修改构建脚本

编辑 `package.json` 中的scripts部分：

```json
{
  "scripts": {
    "build:package": "自定义构建命令"
  }
}
```

### 修改工作流

编辑 `.github/workflows/` 目录下的YAML文件：

```yaml
name: 自定义工作流
on:
  push:
    branches: [ master ]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: 自定义步骤
        run: echo "自定义命令"
```

## 最佳实践

### 1. 版本管理
- 使用语义化版本号 (如 v2.8.1)
- 在README中更新版本信息
- 为每个版本创建详细的发布说明

### 2. 构建优化
- 使用npm ci而不是npm install (CI环境)
- 启用缓存以提高构建速度
- 分离前端和后端构建步骤

### 3. 测试策略
- 在本地运行完整构建测试
- 使用GitHub Actions进行自动化测试
- 定期检查构建产物

## 联系支持

如果遇到构建问题：

1. 查看GitHub Actions日志
2. 在本地运行测试构建
3. 提交Issue到项目仓库
4. 联系项目维护者

---

*本文档最后更新: $(date)* 