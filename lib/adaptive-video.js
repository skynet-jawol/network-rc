const logger = require('./logger');
const { spawn } = require('child_process');

class AdaptiveVideoEncoder {
  constructor(options = {}) {
    this.options = {
      minBitrate: 200,
      maxBitrate: 5000,
      defaultBitrate: 1000,
      qualityLevels: [200, 500, 1000, 2000, 5000],
      fpsLevels: [15, 20, 25, 30],
      resolutionLevels: [
        { width: 320, height: 240 },
        { width: 480, height: 360 },
        { width: 640, height: 480 },
        { width: 800, height: 600 },
        { width: 1280, height: 720 }
      ],
      ...options
    };
    
    this.currentBitrate = this.options.defaultBitrate;
    this.currentFps = 30;
    this.currentResolution = { width: 640, height: 480 };
    this.ffmpegProcess = null;
    this.networkQuality = 1.0; // 0-1, 1为最佳
    this.adaptationInterval = 5000; // 5秒调整一次
    this.lastAdaptation = 0;
    this.isWeakNetwork = false;
    
    // 启动自适应调整
    this.startAdaptation();
  }

  startAdaptation() {
    setInterval(() => {
      this.adaptToNetwork();
    }, this.adaptationInterval);
  }

  async adaptToNetwork() {
    const now = Date.now();
    if (now - this.lastAdaptation < this.adaptationInterval) {
      return;
    }
    
    this.lastAdaptation = now;
    
    // 获取网络质量
    const networkQuality = await this.getNetworkQuality();
    this.networkQuality = networkQuality;
    
    // 计算目标参数
    const targetParams = this.calculateTargetParams(networkQuality);
    
    // 检查是否需要调整
    if (this.shouldAdapt(targetParams)) {
      this.applyAdaptation(targetParams);
    }
  }

  async getNetworkQuality() {
    try {
      // 这里可以集成网络监控模块
      // 暂时使用模拟数据
      const latency = await this.measureLatency();
      const bandwidth = await this.measureBandwidth();
      
      // 计算网络质量分数 (0-1)
      const latencyScore = Math.max(0, 1 - latency / 1000);
      const bandwidthScore = Math.min(1, bandwidth / 5000);
      
      return (latencyScore + bandwidthScore) / 2;
    } catch (error) {
      logger.error('获取网络质量失败:', error);
      return 0.5; // 默认中等质量
    }
  }

  async measureLatency() {
    // 测量延迟
    return new Promise((resolve) => {
      const start = Date.now();
      // 这里可以发送ping包或HTTP请求
      setTimeout(() => {
        const latency = Date.now() - start;
        resolve(latency);
      }, 100);
    });
  }

  async measureBandwidth() {
    // 测量带宽
    return new Promise((resolve) => {
      // 这里可以实现带宽测试
      resolve(2000); // 默认2Mbps
    });
  }

  calculateTargetParams(networkQuality) {
    const qualityIndex = Math.floor(networkQuality * this.options.qualityLevels.length);
    const targetBitrate = this.options.qualityLevels[Math.max(0, Math.min(qualityIndex, this.options.qualityLevels.length - 1))];
    
    const fpsIndex = Math.floor(networkQuality * this.options.fpsLevels.length);
    const targetFps = this.options.fpsLevels[Math.max(0, Math.min(fpsIndex, this.options.fpsLevels.length - 1))];
    
    const resolutionIndex = Math.floor(networkQuality * this.options.resolutionLevels.length);
    const targetResolution = this.options.resolutionLevels[Math.max(0, Math.min(resolutionIndex, this.options.resolutionLevels.length - 1))];
    
    return {
      bitrate: targetBitrate,
      fps: targetFps,
      resolution: targetResolution
    };
  }

  shouldAdapt(targetParams) {
    const bitrateDiff = Math.abs(targetParams.bitrate - this.currentBitrate);
    const fpsDiff = Math.abs(targetParams.fps - this.currentFps);
    const resolutionDiff = Math.abs(targetParams.resolution.width - this.currentResolution.width);
    
    // 如果变化超过阈值，则需要调整
    return bitrateDiff > 200 || fpsDiff > 5 || resolutionDiff > 100;
  }

  applyAdaptation(targetParams) {
    logger.info(`自适应调整: 码率 ${this.currentBitrate}->${targetParams.bitrate}kbps, FPS ${this.currentFps}->${targetParams.fps}, 分辨率 ${this.currentResolution.width}x${this.currentResolution.height}->${targetParams.resolution.width}x${targetParams.resolution.height}`);
    
    this.currentBitrate = targetParams.bitrate;
    this.currentFps = targetParams.fps;
    this.currentResolution = targetParams.resolution;
    
    // 更新编码器参数
    this.updateEncoder();
    
    // 检测弱网模式
    this.isWeakNetwork = this.networkQuality < 0.3;
    
    // 广播状态更新
    this.broadcastStatus();
  }

  updateEncoder() {
    if (this.ffmpegProcess) {
      // 重启编码器进程
      this.restartEncoder();
    }
  }

  restartEncoder() {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGTERM');
      this.ffmpegProcess = null;
    }
    
    // 创建新的编码器进程
    this.createEncoder();
  }

  createEncoder(inputDevice, outputStream) {
    const params = this.getEncodingParams();
    
    this.ffmpegProcess = spawn('ffmpeg', [
      '-f', 'v4l2',
      '-input_format', 'mjpeg',
      '-s', `${params.resolution.width}x${params.resolution.height}`,
      '-r', params.fps,
      '-i', inputDevice,
      '-c:v', 'h264_omx',
      '-b:v', `${params.bitrate}k`,
      '-profile:v', 'baseline',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-g', Math.floor(params.fps * 2),
      '-keyint_min', params.fps,
      '-sc_threshold', 0,
      '-f', 'rawvideo',
      '-s', `${params.resolution.width}x${params.resolution.height}`,
      '-r', params.fps,
      '-'
    ]);

    this.ffmpegProcess.stdout.pipe(outputStream);
    
    this.ffmpegProcess.stderr.on('data', (data) => {
      logger.debug(`FFmpeg: ${data.toString()}`);
    });

    this.ffmpegProcess.on('close', (code) => {
      logger.info(`FFmpeg编码器退出: ${code}`);
    });

    this.ffmpegProcess.on('error', (error) => {
      logger.error('FFmpeg编码器错误:', error);
    });
  }

  getEncodingParams() {
    return {
      bitrate: this.currentBitrate,
      fps: this.currentFps,
      resolution: this.currentResolution,
      keyframeInterval: Math.floor(this.currentFps * 2),
      isWeakNetwork: this.isWeakNetwork
    };
  }

  broadcastStatus() {
    if (global.broadcast) {
      global.broadcast('video-adaptation', {
        bitrate: this.currentBitrate,
        fps: this.currentFps,
        resolution: this.currentResolution,
        networkQuality: this.networkQuality,
        isWeakNetwork: this.isWeakNetwork
      });
    }
  }

  getStatus() {
    return {
      currentBitrate: this.currentBitrate,
      currentFps: this.currentFps,
      currentResolution: this.currentResolution,
      networkQuality: this.networkQuality,
      isWeakNetwork: this.isWeakNetwork,
      isRunning: this.ffmpegProcess !== null
    };
  }

  stop() {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGTERM');
      this.ffmpegProcess = null;
    }
  }
}

module.exports = AdaptiveVideoEncoder; 