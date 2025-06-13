const { spawn, exec } = require('child_process');
const path = require('path');
const logger = require('./logger');
const TTS = require('./tts');
const { changeLedStatus } = require('./led');

class CloudflareTunnel {
  constructor(config = {}) {
    this.config = {
      enabled: false,
      token: '',
      hostname: '',
      localPort: 8080,
      ...config
    };
    
    this.tunnelProcess = null;
    this.tunnelUrl = null;
    this.isRunning = false;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  async start() {
    if (this.isRunning) {
      logger.info('Cloudflare Tunnel 已在运行');
      return;
    }

    if (!this.config.enabled || !this.config.token || !this.config.hostname) {
      logger.warn('Cloudflare Tunnel 配置不完整，跳过启动');
      return;
    }

    try {
      await TTS('开始启动 Cloudflare Tunnel').end;
      
      // 检查并安装 cloudflared
      await this.installCloudflared();
      
      // 启动 tunnel
      this.startTunnelProcess();
      
    } catch (error) {
      logger.error('启动 Cloudflare Tunnel 失败:', error);
      await TTS('Cloudflare Tunnel 启动失败').end;
      changeLedStatus('error');
    }
  }

  async installCloudflared() {
    return new Promise((resolve, reject) => {
      exec('which cloudflared', (error) => {
        if (error) {
          logger.info('cloudflared 未安装，开始安装...');
          
          const installCommand = 'curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared';
          
          exec(installCommand, (err, stdout, stderr) => {
            if (err) {
              logger.error('安装 cloudflared 失败:', err);
              reject(err);
            } else {
              logger.info('cloudflared 安装成功');
              resolve();
            }
          });
        } else {
          logger.info('cloudflared 已安装');
          resolve();
        }
      });
    });
  }

  startTunnelProcess() {
    const { token, hostname, localPort } = this.config;
    
    logger.info(`启动 Cloudflare Tunnel: ${hostname} -> localhost:${localPort}`);
    
    this.tunnelProcess = spawn('cloudflared', [
      'tunnel',
      '--url', `http://localhost:${localPort}`,
      '--hostname', hostname,
      '--token', token,
      '--no-autoupdate'
    ]);

    this.tunnelProcess.stdout.on('data', (data) => {
      const output = data.toString();
      logger.info(`Tunnel stdout: ${output}`);
      
      // 检查是否成功启动
      if (output.includes('https://')) {
        const urlMatch = output.match(/https:\/\/[^\s]+/);
        if (urlMatch) {
          this.tunnelUrl = urlMatch[0];
          this.isRunning = true;
          this.retryCount = 0;
          
          logger.info(`Cloudflare Tunnel 启动成功: ${this.tunnelUrl}`);
          TTS(`Cloudflare Tunnel 启动成功，访问地址: ${this.tunnelUrl}`).end;
          changeLedStatus('penetrated');
        }
      }
      
      // 检查错误信息
      if (output.includes('error') || output.includes('failed')) {
        logger.error(`Tunnel 错误: ${output}`);
        changeLedStatus('error');
      }
    });

    this.tunnelProcess.stderr.on('data', (data) => {
      const error = data.toString();
      logger.error(`Tunnel stderr: ${error}`);
      
      if (error.includes('error') || error.includes('failed')) {
        changeLedStatus('error');
      }
    });

    this.tunnelProcess.on('exit', (code, signal) => {
      logger.info(`Cloudflare Tunnel 进程退出: code=${code}, signal=${signal}`);
      this.isRunning = false;
      
      if (code !== 0 && this.retryCount < this.maxRetries) {
        this.retryCount++;
        logger.info(`Tunnel 异常退出，${10}秒后重试 (${this.retryCount}/${this.maxRetries})`);
        TTS(`Tunnel 连接失败，${10}秒后重试`).end;
        
        setTimeout(() => {
          this.startTunnelProcess();
        }, 10000);
      } else if (code !== 0) {
        logger.error('Tunnel 重试次数已达上限，停止重试');
        TTS('Tunnel 连接失败，请检查配置').end;
        changeLedStatus('error');
      }
    });

    this.tunnelProcess.on('error', (error) => {
      logger.error('Tunnel 进程错误:', error);
      this.isRunning = false;
      changeLedStatus('error');
    });
  }

  stop() {
    if (this.tunnelProcess) {
      logger.info('停止 Cloudflare Tunnel');
      this.tunnelProcess.kill('SIGTERM');
      this.tunnelProcess = null;
      this.isRunning = false;
      this.tunnelUrl = null;
      changeLedStatus('running');
    }
  }

  restart() {
    logger.info('重启 Cloudflare Tunnel');
    this.stop();
    setTimeout(() => {
      this.start();
    }, 2000);
  }

  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    logger.info('Cloudflare Tunnel 配置已更新');
    
    // 如果配置发生变化且正在运行，则重启
    if (this.isRunning && (
      oldConfig.token !== this.config.token ||
      oldConfig.hostname !== this.config.hostname ||
      oldConfig.localPort !== this.config.localPort
    )) {
      logger.info('配置发生变化，重启 Tunnel');
      this.restart();
    }
  }

  getStatus() {
    return {
      enabled: this.config.enabled,
      isRunning: this.isRunning,
      tunnelUrl: this.tunnelUrl,
      hostname: this.config.hostname,
      localPort: this.config.localPort,
      retryCount: this.retryCount
    };
  }

  getTunnelUrl() {
    return this.tunnelUrl;
  }
}

// 创建全局实例
let tunnelInstance = null;

function createTunnel(config) {
  if (tunnelInstance) {
    tunnelInstance.stop();
  }
  tunnelInstance = new CloudflareTunnel(config);
  return tunnelInstance;
}

function getTunnel() {
  return tunnelInstance;
}

module.exports = {
  CloudflareTunnel,
  createTunnel,
  getTunnel
}; 