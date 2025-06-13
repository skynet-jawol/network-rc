const express = require('express');
const router = express.Router();
const logger = require('./logger');
const { createTunnel, getTunnel } = require('./cloudflare-tunnel');
const { localSave, localGet } = require('./unit');

// 默认配置
const defaultTunnelConfig = {
  enabled: false,
  hostname: '',
  token: '',
  localPort: 8080
};

// 配置文件路径
const configKey = 'cloudflare-tunnel-config';

// 获取配置
function getTunnelConfig() {
  return localGet(configKey, defaultTunnelConfig);
}

// 保存配置
function saveTunnelConfig(config) {
  localSave(configKey, config);
  logger.info('Tunnel配置已保存:', config);
}

// 获取Tunnel配置API
router.get('/api/tunnel/config', (req, res) => {
  try {
    const config = getTunnelConfig();
    res.json(config);
  } catch (error) {
    logger.error('获取Tunnel配置失败:', error);
    res.status(500).json({ error: '获取配置失败' });
  }
});

// 更新Tunnel配置API
router.post('/api/tunnel/config', (req, res) => {
  try {
    const { enabled, hostname, token, localPort } = req.body;
    
    // 验证参数
    if (enabled && (!hostname || !token)) {
      return res.status(400).json({ error: '启用Tunnel时必须提供hostname和token' });
    }
    
    const newConfig = {
      enabled: Boolean(enabled),
      hostname: String(hostname || ''),
      token: String(token || ''),
      localPort: parseInt(localPort) || 8080
    };
    
    // 保存配置
    saveTunnelConfig(newConfig);
    
    // 更新Tunnel实例
    const tunnel = getTunnel();
    if (tunnel) {
      tunnel.updateConfig(newConfig);
    } else if (newConfig.enabled) {
      // 创建新的Tunnel实例
      createTunnel(newConfig);
    }
    
    res.json({ success: true, config: newConfig });
    
  } catch (error) {
    logger.error('更新Tunnel配置失败:', error);
    res.status(500).json({ error: '更新配置失败' });
  }
});

// 获取Tunnel状态API
router.get('/api/tunnel/status', (req, res) => {
  try {
    const tunnel = getTunnel();
    if (tunnel) {
      res.json(tunnel.getStatus());
    } else {
      res.json({
        enabled: false,
        isRunning: false,
        tunnelUrl: null,
        hostname: '',
        localPort: 8080,
        retryCount: 0
      });
    }
  } catch (error) {
    logger.error('获取Tunnel状态失败:', error);
    res.status(500).json({ error: '获取状态失败' });
  }
});

// 启动Tunnel API
router.post('/api/tunnel/start', async (req, res) => {
  try {
    const config = getTunnelConfig();
    if (!config.enabled) {
      return res.status(400).json({ error: 'Tunnel未启用' });
    }
    
    const tunnel = createTunnel(config);
    await tunnel.start();
    
    res.json({ success: true, status: tunnel.getStatus() });
    
  } catch (error) {
    logger.error('启动Tunnel失败:', error);
    res.status(500).json({ error: '启动失败' });
  }
});

// 停止Tunnel API
router.post('/api/tunnel/stop', (req, res) => {
  try {
    const tunnel = getTunnel();
    if (tunnel) {
      tunnel.stop();
      res.json({ success: true });
    } else {
      res.json({ success: true, message: 'Tunnel未运行' });
    }
  } catch (error) {
    logger.error('停止Tunnel失败:', error);
    res.status(500).json({ error: '停止失败' });
  }
});

// 重启Tunnel API
router.post('/api/tunnel/restart', async (req, res) => {
  try {
    const tunnel = getTunnel();
    if (tunnel) {
      tunnel.restart();
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Tunnel未运行' });
    }
  } catch (error) {
    logger.error('重启Tunnel失败:', error);
    res.status(500).json({ error: '重启失败' });
  }
});

// 测试Tunnel连接API
router.post('/api/tunnel/test', async (req, res) => {
  try {
    const { hostname, token } = req.body;
    
    if (!hostname || !token) {
      return res.status(400).json({ error: '需要提供hostname和token' });
    }
    
    // 这里可以添加连接测试逻辑
    // 由于cloudflared的测试比较复杂，这里只做基本验证
    
    res.json({ 
      success: true, 
      message: '配置验证通过，请启动Tunnel进行实际测试' 
    });
    
  } catch (error) {
    logger.error('测试Tunnel配置失败:', error);
    res.status(500).json({ error: '测试失败' });
  }
});

// 获取Tunnel日志API
router.get('/api/tunnel/logs', (req, res) => {
  try {
    // 这里可以返回最近的Tunnel日志
    res.json({ 
      logs: [
        { timestamp: new Date().toISOString(), level: 'info', message: 'Tunnel日志功能待实现' }
      ] 
    });
  } catch (error) {
    logger.error('获取Tunnel日志失败:', error);
    res.status(500).json({ error: '获取日志失败' });
  }
});

module.exports = {
  router,
  getTunnelConfig,
  saveTunnelConfig,
  createTunnel,
  getTunnel
}; 