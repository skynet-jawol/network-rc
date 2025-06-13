# GitHub Actions 配置说明

本项目配置了自动化的构建和发布流程，通过GitHub Actions实现。

## 工作流文件

### 1. main.yml - 主构建和发布工作流

**触发条件:**
- 推送到 `master` 或 `main` 分支
- 创建版本标签 (如 `v2.8.0`)
- 创建Pull Request

**功能:**
- 自动构建前端和后端
- 运行系统检查
- 创建发布包 (`dist/network-rc.tar.gz`)
- 上传构建产物
- 创建GitHub Release (仅限标签推送)

### 2. deploy.yml - GitHub Pages部署工作流

**触发条件:**
- 推送到 `master` 或 `main` 分支
- 手动触发

**功能:**
- 构建前端项目
- 自动部署到GitHub Pages
- 提供在线演示

### 3. codeql-analysis.yml - 代码安全分析

**触发条件:**
- 推送到 `master` 分支
- 创建Pull Request
- 每周日定时运行

**功能:**
- 使用CodeQL进行代码安全分析
- 检测潜在的安全漏洞

## 构建脚本

### package.json 脚本

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

### 本地测试

运行测试构建脚本：

```bash
./test-build.sh
```

## 发布流程

### 1. 自动发布

推送标签时自动创建Release：

```bash
git tag v2.8.1
git push origin v2.8.1
```

### 2. 手动发布

1. 在GitHub仓库页面点击 "Releases"
2. 点击 "Draft a new release"
3. 选择标签或创建新标签
4. 填写发布说明
5. 发布

## 构建产物

### 1. 前端构建
- 位置: `front-end/build/`
- 用途: 部署到GitHub Pages或本地服务器

### 2. 发布包
- 位置: `dist/network-rc.tar.gz`
- 内容: 完整的项目文件，包含Node.js运行时
- 用途: 一键部署到树莓派

### 3. 构建产物
- 位置: GitHub Actions Artifacts
- 保留时间: 30天
- 用途: 调试和测试

## 环境要求

### Node.js
- 版本: 18.x
- 包管理器: npm

### 系统依赖
- 前端: React 16.x, Ant Design 4.x
- 后端: Express, WebSocket, GPIO库

## 故障排除

### 常见问题

1. **构建失败**
   - 检查Node.js版本是否为18.x
   - 确保所有依赖正确安装
   - 查看GitHub Actions日志

2. **前端构建失败**
   - 检查前端依赖是否完整
   - 确保craco配置正确

3. **发布包创建失败**
   - 检查文件权限
   - 确保有足够的磁盘空间

### 调试步骤

1. 在本地运行测试构建：
   ```bash
   ./test-build.sh
   ```

2. 检查GitHub Actions日志

3. 验证构建产物：
   ```bash
   ls -la dist/
   ls -la front-end/build/
   ```

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

## 联系支持

如果遇到构建问题：

1. 查看GitHub Actions日志
2. 在本地运行测试构建
3. 提交Issue到项目仓库
4. 联系项目维护者

---

*最后更新: $(date)* 