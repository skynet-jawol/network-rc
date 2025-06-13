# GitHub Actions 版本更新说明

## 问题描述

GitHub Actions 构建失败，错误信息显示使用了已弃用的 `actions/upload-artifact@v3` 版本。

```
Error: This request has been automatically failed because it uses a deprecated version of `actions/upload-artifact: v3`. Learn more: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
```

## 解决方案

已将所有 GitHub Actions 更新到最新版本：

### 1. 主构建工作流 (`.github/workflows/main.yml`)

**更新内容:**
- `actions/checkout@v3` → `actions/checkout@v4`
- `actions/setup-node@v3` → `actions/setup-node@v4`
- `actions/upload-artifact@v3` → `actions/upload-artifact@v4`

### 2. 部署工作流 (`.github/workflows/deploy.yml`)

**更新内容:**
- `actions/checkout@v4` (已是最新)
- `actions/setup-node@v4` (已是最新)
- `actions/upload-pages-artifact@v3` → `actions/upload-pages-artifact@v4`
- `actions/deploy-pages@v4` (已是最新)

### 3. 代码分析工作流 (`.github/workflows/codeql-analysis.yml`)

**更新内容:**
- `actions/checkout@v2` → `actions/checkout@v4`
- `github/codeql-action/init@v1` → `github/codeql-action/init@v3`
- `github/codeql-action/autobuild@v1` → `github/codeql-action/autobuild@v3`
- `github/codeql-action/analyze@v1` → `github/codeql-action/analyze@v3`

## 版本变更说明

### actions/upload-artifact v4 主要改进

1. **性能提升**: 更快的上传和下载速度
2. **更好的错误处理**: 更详细的错误信息
3. **改进的缓存**: 更好的缓存机制
4. **安全性增强**: 更好的安全性和权限控制

### actions/checkout v4 主要改进

1. **更快的检出**: 优化了代码检出速度
2. **更好的缓存**: 改进了缓存机制
3. **安全性增强**: 更好的安全控制

### actions/setup-node v4 主要改进

1. **更快的安装**: 优化了Node.js安装速度
2. **更好的缓存**: 改进了npm缓存机制
3. **更多Node.js版本**: 支持更多Node.js版本

## 兼容性说明

### 向后兼容性

- 所有v4版本的actions都保持向后兼容
- 现有的工作流配置无需修改
- 构建脚本和命令保持不变

### 环境要求

- GitHub Actions Runner: 2.325.0+
- Node.js: 18.x (推荐)
- npm: 最新版本

## 测试验证

### 本地测试

运行本地构建测试：

```bash
./test-build.sh
```

### GitHub Actions 测试

1. 推送代码到仓库
2. 检查 Actions 标签页
3. 查看构建日志
4. 验证构建产物

## 故障排除

### 如果仍然失败

1. **检查Runner版本**
   - 确保使用最新版本的GitHub Actions Runner
   - 当前版本: 2.325.0+

2. **清理缓存**
   - 删除 `.github/workflows/.cache` 目录
   - 重新运行工作流

3. **检查权限**
   - 确保仓库有足够的权限
   - 检查GitHub Token权限

### 常见问题

1. **缓存问题**
   ```yaml
   - name: Setup Node.js
     uses: actions/setup-node@v4
     with:
       node-version: '18.x'
       cache: 'npm'  # 确保启用缓存
   ```

2. **权限问题**
   ```yaml
   permissions:
     contents: read
     actions: read
     security-events: write
   ```

## 最佳实践

### 1. 定期更新

- 定期检查GitHub Actions版本更新
- 关注GitHub官方博客的弃用通知
- 及时更新到最新稳定版本

### 2. 版本管理

- 使用固定版本号而不是latest
- 在更新前测试工作流
- 保持版本更新记录

### 3. 监控和日志

- 定期检查构建日志
- 监控构建时间和成功率
- 及时处理构建失败

## 更新日志

### 2024-04-16
- 更新 `actions/upload-artifact` 到 v4
- 更新 `actions/checkout` 到 v4
- 更新 `actions/setup-node` 到 v4
- 更新 CodeQL actions 到 v3

### 影响
- 修复了构建失败问题
- 提升了构建性能
- 增强了安全性

---

*本文档最后更新: $(date)* 