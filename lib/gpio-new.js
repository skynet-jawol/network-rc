const logger = require("./logger");
const Gpio = require('onoff').Gpio;
const pigpio = require('pigpio');

class GPIOController {
  constructor() {
    this.pwmPins = new Map();
    this.switchPins = new Map();
    this.status = {};
    this.isInitialized = false;
    this.initializePWM();
  }

  initializePWM() {
    try {
      // 使用pigpio进行PWM控制
      pigpio.configureClock(5, pigpio.CLOCK_PCM);
      this.isInitialized = true;
      logger.info("PWM系统初始化成功");
    } catch (error) {
      logger.error("PWM系统初始化失败:", error);
      this.isInitialized = false;
    }
  }

  setPWMPin(pin, value) {
    try {
      pin = parseInt(pin);
      value = Number(value);
      
      logger.info(`设置PWM引脚: ${pin}, 值: ${value}`);
      this.status[pin] = value;

      if (!this.pwmPins.has(pin)) {
        this.pwmPins.set(pin, new pigpio.Gpio(pin, { mode: pigpio.OUTPUT }));
      }
      
      const pwmPin = this.pwmPins.get(pin);
      
      // 将-1到1的值转换为0-255的PWM值
      // 0对应7.5%占空比，-1对应5%，1对应10%
      let pwmValue;
      if (value === 0) {
        pwmValue = Math.floor(255 * 0.075); // 7.5%占空比
      } else {
        pwmValue = Math.floor(255 * (0.075 + value * 0.025)); // 5%-10%范围
      }
      
      pwmPin.pwmWrite(pwmValue);
      
    } catch (error) {
      logger.error(`设置PWM引脚${pin}失败:`, error);
    }
  }

  setSwitchPin(pin, enabled) {
    try {
      pin = parseInt(pin);
      enabled = Boolean(enabled);
      
      logger.info(`设置开关引脚: ${pin}, 状态: ${enabled}`);
      this.status[pin] = enabled;

      if (!this.switchPins.has(pin)) {
        this.switchPins.set(pin, new Gpio(pin, 'out'));
      }
      
      const switchPin = this.switchPins.get(pin);
      switchPin.writeSync(enabled ? 1 : 0);
      
    } catch (error) {
      logger.error(`设置开关引脚${pin}失败:`, error);
    }
  }

  readPin(pin) {
    try {
      pin = parseInt(pin);
      
      if (!this.switchPins.has(pin)) {
        this.switchPins.set(pin, new Gpio(pin, 'in'));
      }
      
      const switchPin = this.switchPins.get(pin);
      const value = switchPin.readSync();
      
      logger.info(`读取引脚${pin}: ${value}`);
      return value;
      
    } catch (error) {
      logger.error(`读取引脚${pin}失败:`, error);
      return null;
    }
  }

  listenPin(pin, callback) {
    try {
      pin = parseInt(pin);
      
      if (!this.switchPins.has(pin)) {
        this.switchPins.set(pin, new Gpio(pin, 'in', 'both'));
      }
      
      const switchPin = this.switchPins.get(pin);
      
      switchPin.watch((err, value) => {
        if (err) {
          logger.error(`监听引脚${pin}错误:`, err);
          return;
        }
        
        logger.info(`引脚${pin}状态变化: ${value}`);
        callback(pin, value);
      });
      
    } catch (error) {
      logger.error(`监听引脚${pin}失败:`, error);
    }
  }

  closeChannel() {
    logger.info("关闭所有GPIO通道");
    
    // 关闭PWM引脚
    this.pwmPins.forEach((pwmPin, pin) => {
      try {
        pwmPin.pwmWrite(0); // 设置为0
        this.pwmPins.delete(pin);
      } catch (error) {
        logger.error(`关闭PWM引脚${pin}失败:`, error);
      }
    });

    // 关闭开关引脚
    this.switchPins.forEach((switchPin, pin) => {
      try {
        switchPin.writeSync(0); // 设置为低电平
        switchPin.unexport(); // 释放GPIO
        this.switchPins.delete(pin);
      } catch (error) {
        logger.error(`关闭开关引脚${pin}失败:`, error);
      }
    });

    this.status = {};
  }

  getStatus() {
    return this.status;
  }

  isReady() {
    return this.isInitialized;
  }
}

// 创建全局GPIO控制器实例
const gpioController = new GPIOController();

// 导出兼容原有接口的函数
function changePwmPin(pin, value) {
  gpioController.setPWMPin(pin, value);
}

function changeSwitchPin(pin, enabled) {
  gpioController.setSwitchPin(pin, enabled);
}

function readPin(pin) {
  return gpioController.readPin(pin);
}

function listenPin(pin, callback) {
  gpioController.listenPin(pin, callback);
}

function closeChannel() {
  gpioController.closeChannel();
}

function getChannelStatus() {
  return gpioController.getStatus();
}

module.exports = {
  changePwmPin,
  changeSwitchPin,
  readPin,
  listenPin,
  closeChannel,
  getChannelStatus,
  GPIOController
}; 