const SerialPort = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const logger = require('./logger');
const { localSave, localGet } = require('./unit');

class GPSModule {
  constructor(config = {}) {
    this.config = {
      enabled: false,
      device: '/dev/ttyAMA0',
      baudRate: 9600,
      ...config
    };
    
    this.port = null;
    this.parser = null;
    this.currentPosition = null;
    this.isConnected = false;
    this.history = [];
    this.maxHistoryLength = 1000;
    this.lastUpdateTime = 0;
    this.updateInterval = 1000; // 1秒更新间隔
    
    // 加载历史数据
    this.loadHistory();
  }

  async connect() {
    if (this.isConnected) {
      logger.info('GPS模块已连接');
      return;
    }

    if (!this.config.enabled) {
      logger.info('GPS模块未启用');
      return;
    }

    try {
      logger.info(`连接GPS模块: ${this.config.device}, 波特率: ${this.config.baudRate}`);
      
      this.port = new SerialPort({
        path: this.config.device,
        baudRate: this.config.baudRate,
        autoOpen: false
      });

      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

      this.parser.on('data', (data) => {
        this.parseNMEA(data);
      });

      this.port.open((err) => {
        if (err) {
          logger.error('GPS连接失败:', err);
          this.isConnected = false;
        } else {
          this.isConnected = true;
          logger.info('GPS模块连接成功');
        }
      });

      this.port.on('error', (error) => {
        logger.error('GPS串口错误:', error);
        this.isConnected = false;
      });

      this.port.on('close', () => {
        logger.info('GPS串口已关闭');
        this.isConnected = false;
      });

    } catch (error) {
      logger.error('GPS初始化失败:', error);
      this.isConnected = false;
    }
  }

  parseNMEA(data) {
    // 解析GPGGA语句 (Global Positioning System Fix Data)
    if (data.startsWith('$GPGGA')) {
      const position = this.parseGPGGA(data);
      if (position) {
        this.updatePosition(position);
      }
    }
    
    // 解析GPRMC语句 (Recommended Minimum sentence C)
    else if (data.startsWith('$GPRMC')) {
      const position = this.parseGPRMC(data);
      if (position) {
        this.updatePosition(position);
      }
    }
  }

  parseGPGGA(data) {
    const parts = data.split(',');
    if (parts.length < 15) return null;

    const time = parts[1];
    const lat = this.parseCoordinate(parts[2], parts[3]);
    const lng = this.parseCoordinate(parts[4], parts[5]);
    const quality = parseInt(parts[6]) || 0;
    const satellites = parseInt(parts[7]) || 0;
    const hdop = parseFloat(parts[8]) || 0;
    const altitude = parseFloat(parts[9]) || 0;
    const geoidHeight = parseFloat(parts[11]) || 0;

    if (lat && lng && quality > 0) {
      return {
        lat,
        lng,
        altitude,
        satellites,
        hdop,
        geoidHeight,
        quality,
        timestamp: Date.now(),
        source: 'GPGGA'
      };
    }
    return null;
  }

  parseGPRMC(data) {
    const parts = data.split(',');
    if (parts.length < 12) return null;

    const time = parts[1];
    const status = parts[2];
    const lat = this.parseCoordinate(parts[3], parts[4]);
    const lng = this.parseCoordinate(parts[5], parts[6]);
    const speed = parseFloat(parts[7]) || 0;
    const course = parseFloat(parts[8]) || 0;
    const date = parts[9];

    if (lat && lng && status === 'A') {
      return {
        lat,
        lng,
        speed,
        course,
        timestamp: Date.now(),
        source: 'GPRMC'
      };
    }
    return null;
  }

  parseCoordinate(value, direction) {
    if (!value || !direction) return null;
    
    const coord = parseFloat(value);
    if (isNaN(coord)) return null;

    const degrees = Math.floor(coord / 100);
    const minutes = coord - (degrees * 100);
    const decimal = degrees + (minutes / 60);

    if (direction === 'S' || direction === 'W') {
      return -decimal;
    }
    return decimal;
  }

  updatePosition(position) {
    const now = Date.now();
    
    // 检查更新间隔
    if (now - this.lastUpdateTime < this.updateInterval) {
      return;
    }
    
    this.lastUpdateTime = now;
    
    // 更新当前位置
    this.currentPosition = {
      ...this.currentPosition,
      ...position
    };
    
    // 添加到历史记录
    this.addToHistory(position);
    
    // 广播位置更新
    this.broadcastPosition();
    
    logger.debug(`GPS位置更新: ${position.lat?.toFixed(6)}, ${position.lng?.toFixed(6)}`);
  }

  addToHistory(position) {
    const historyPoint = {
      lat: position.lat,
      lng: position.lng,
      timestamp: position.timestamp
    };
    
    this.history.push(historyPoint);
    
    // 限制历史记录长度
    if (this.history.length > this.maxHistoryLength) {
      this.history = this.history.slice(-this.maxHistoryLength);
    }
    
    // 保存历史记录
    this.saveHistory();
  }

  saveHistory() {
    try {
      localSave('gps-history', this.history);
    } catch (error) {
      logger.error('保存GPS历史记录失败:', error);
    }
  }

  loadHistory() {
    try {
      const savedHistory = localGet('gps-history', []);
      this.history = savedHistory.slice(-this.maxHistoryLength);
      logger.info(`加载GPS历史记录: ${this.history.length}个点`);
    } catch (error) {
      logger.error('加载GPS历史记录失败:', error);
      this.history = [];
    }
  }

  broadcastPosition() {
    // 发送GPS数据到前端
    if (global.broadcast) {
      global.broadcast('gps-update', {
        position: this.currentPosition,
        history: this.history
      });
    }
  }

  getCurrentPosition() {
    return this.currentPosition;
  }

  getHistory() {
    return this.history;
  }

  clearHistory() {
    this.history = [];
    this.saveHistory();
    logger.info('GPS历史记录已清空');
  }

  disconnect() {
    if (this.port) {
      this.port.close();
      this.port = null;
      this.parser = null;
      this.isConnected = false;
      logger.info('GPS模块已断开连接');
    }
  }

  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    logger.info('GPS配置已更新:', this.config);
    
    // 如果设备或波特率发生变化，重新连接
    if (this.isConnected && (
      oldConfig.device !== this.config.device ||
      oldConfig.baudRate !== this.config.baudRate
    )) {
      logger.info('GPS配置发生变化，重新连接');
      this.disconnect();
      setTimeout(() => {
        this.connect();
      }, 1000);
    } else if (this.config.enabled && !this.isConnected) {
      // 如果启用但未连接，则连接
      this.connect();
    } else if (!this.config.enabled && this.isConnected) {
      // 如果禁用但已连接，则断开
      this.disconnect();
    }
  }

  getStatus() {
    return {
      enabled: this.config.enabled,
      isConnected: this.isConnected,
      device: this.config.device,
      baudRate: this.config.baudRate,
      currentPosition: this.currentPosition,
      historyLength: this.history.length,
      lastUpdateTime: this.lastUpdateTime
    };
  }
}

// 创建全局实例
let gpsInstance = null;

function createGPS(config) {
  if (gpsInstance) {
    gpsInstance.disconnect();
  }
  gpsInstance = new GPSModule(config);
  return gpsInstance;
}

function getGPS() {
  return gpsInstance;
}

module.exports = {
  GPSModule,
  createGPS,
  getGPS
}; 