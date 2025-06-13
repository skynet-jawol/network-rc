# FRP功能移除说明

## 概述

本文档记录了从 Network-RC 项目中移除 FRP (Fast Reverse Proxy) 功能的相关更改。

## 移除的功能

### 1. 核心FRP模块
- **删除文件**: `lib/frpc/index.js`
- **删除目录**: `lib/frpc/` (包含FRP客户端二进制文件)
- **功能**: 网络穿透服务管理

### 2. 主程序集成
- **文件**: `index.js`
- **移除内容**:
  - FRP模块导入: `const { defaultFrpc, configFrpc } = require("./lib/frpc");`
  - FRP相关命令行参数:
    - `-n, --subDomain`: 默认FRP服务的子域名
    - `-f, --frpConfig`: FRP配置文件路径
  - FRP启动逻辑:
    - `defaultFrpc(subDomain)` 调用
    - `configFrpc(frpConfig)` 调用

### 3. 文档更新
- **README.md**: 移除FRP相关使用说明和示例
- **README-cn.md**: 移除FRP相关中文说明和示例
- **移除内容**:
  - FRP命令行使用示例
  - FRP服务器配置说明
  - FRP相关功能列表项

### 4. 安装脚本更新
- **install.sh**: 完全重写，移除所有FRP配置选项
- **install-optimized.sh**: 移除FRP选项，只保留Cloudflare Tunnel和无穿透选项

### 5. 配置文件
- **package.json**: 更新start脚本，移除FRP相关参数

## 保留的功能

### 1. Cloudflare Tunnel
- 作为FRP的替代方案保留
- 提供更稳定的网络穿透服务
- 无需维护服务器

### 2. 本地访问
- 保持原有的本地网络访问功能
- 支持局域网内控制

### 3. WebRTC
- 保持点对点连接功能
- 在支持NAT穿透的环境中自动使用

## 影响分析

### 正面影响
1. **简化架构**: 移除了复杂的FRP配置和管理
2. **减少依赖**: 不再需要维护FRP服务器
3. **提高稳定性**: Cloudflare Tunnel提供更稳定的服务
4. **简化安装**: 安装脚本更加简洁明了

### 兼容性
1. **向后兼容**: 现有的本地访问功能完全保留
2. **配置兼容**: 配置文件结构保持兼容
3. **API兼容**: 所有控制API保持不变

## 迁移指南

### 从FRP迁移到Cloudflare Tunnel

1. **获取Cloudflare Tunnel Token**
   - 登录Cloudflare Dashboard
   - 创建新的Tunnel
   - 复制Tunnel Token

2. **更新配置**
   ```json
   {
     "tunnel": {
       "type": "cloudflare",
       "cloudflare": {
         "token": "your-tunnel-token"
       }
     }
   }
   ```

3. **重启服务**
   ```bash
   sudo systemctl restart network-rc
   ```

### 不使用网络穿透

如果不需要远程访问，可以完全禁用网络穿透：

```json
{
  "tunnel": {
    "type": "none"
  }
}
```

## 技术细节

### 移除的代码行数
- `lib/frpc/index.js`: 113行
- `index.js`: 约20行FRP相关代码
- 安装脚本: 约100行FRP配置代码

### 文件大小减少
- 移除FRP二进制文件: 约8.8MB
- 总计减少: 约9MB

## 后续计划

1. **监控**: 观察Cloudflare Tunnel的稳定性和性能
2. **优化**: 根据用户反馈优化网络穿透功能
3. **文档**: 完善Cloudflare Tunnel的使用文档
4. **测试**: 在不同网络环境下测试穿透效果

## 联系支持

如果在迁移过程中遇到问题，请：
1. 查看项目文档: https://github.com/esonwong/network-rc
2. 提交Issue: https://github.com/esonwong/network-rc/issues
3. 加入用户群组获取帮助

---

*本文档最后更新: $(date)* 