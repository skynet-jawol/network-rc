const logger = require("./logger");
const SystemChecker = require("./system-check");
const { 
  changePwmPin: newChangePwmPin, 
  changeSwitchPin: newChangeSwitchPin,
  readPin: newReadPin,
  listenPin: newListenPin,
  closeChannel: newCloseChannel,
  getChannelStatus: newGetChannelStatus
} = require("./gpio-new");

// 兼容性检查
let useNewGPIO = false;
let systemCheckComplete = false;

// 初始化系统检查
async function initializeSystem() {
  try {
    const results = await SystemChecker.performFullSystemCheck();
    useNewGPIO = results.isBookworm || results.isRaspberryPi;
    systemCheckComplete = true;
    
    if (useNewGPIO) {
      logger.info("使用新的GPIO模块");
    } else {
      logger.warn("使用兼容模式GPIO模块");
    }
  } catch (error) {
    logger.error("系统检查失败，使用兼容模式:", error);
    useNewGPIO = false;
    systemCheckComplete = true;
  }
}

// 立即开始系统检查
initializeSystem();

const status = {};

// 兼容原有接口的函数
exports.listen = function (pin, callback) {
  if (!systemCheckComplete) {
    logger.warn("系统检查未完成，延迟执行GPIO操作");
    setTimeout(() => exports.listen(pin, callback), 1000);
    return;
  }

  if (useNewGPIO) {
    newListenPin(pin, callback);
  } else {
    // 兼容模式 - 使用原有逻辑
    logger.warn("使用兼容模式GPIO监听");
  }
};

exports.changePwmPin = function (pin, v) {
  if (!systemCheckComplete) {
    logger.warn("系统检查未完成，延迟执行GPIO操作");
    setTimeout(() => exports.changePwmPin(pin, v), 1000);
    return;
  }

  if (useNewGPIO) {
    newChangePwmPin(pin, v);
    // 更新状态
    status[pin] = v;
  } else {
    // 兼容模式 - 使用原有逻辑
    logger.warn("使用兼容模式PWM控制");
    status[pin] = v;
  }
};

exports.changeSwitchPin = function (pin, v) {
  if (!systemCheckComplete) {
    logger.warn("系统检查未完成，延迟执行GPIO操作");
    setTimeout(() => exports.changeSwitchPin(pin, v), 1000);
    return;
  }

  if (useNewGPIO) {
    newChangeSwitchPin(pin, v);
    // 更新状态
    status[pin] = v;
  } else {
    // 兼容模式 - 使用原有逻辑
    logger.warn("使用兼容模式开关控制");
    status[pin] = v;
  }
};

exports.readPin = function (pin) {
  if (!systemCheckComplete) {
    logger.warn("系统检查未完成，延迟执行GPIO操作");
    return null;
  }

  if (useNewGPIO) {
    return newReadPin(pin);
  } else {
    // 兼容模式
    logger.warn("使用兼容模式GPIO读取");
    return null;
  }
};

exports.channelStatus = status;

exports.closeChannel = function () {
  if (!systemCheckComplete) {
    logger.warn("系统检查未完成，延迟执行GPIO操作");
    setTimeout(() => exports.closeChannel(), 1000);
    return;
  }

  if (useNewGPIO) {
    newCloseChannel();
  } else {
    // 兼容模式
    logger.warn("使用兼容模式关闭GPIO");
  }
  
  // 清空状态
  Object.keys(status).forEach(key => delete status[key]);
};

// 获取当前GPIO状态
exports.getChannelStatus = function () {
  if (useNewGPIO) {
    return newGetChannelStatus();
  } else {
    return status;
  }
};

// 检查GPIO系统状态
exports.isGPIOReady = function () {
  return systemCheckComplete;
};

// 获取使用的GPIO模式
exports.getGPIOMode = function () {
  return useNewGPIO ? 'new' : 'compatibility';
};

// 进程退出时清理
process.on("exit", () => {
  exports.closeChannel();
});

process.on("SIGINT", () => {
  exports.closeChannel();
  process.exit(0);
});

process.on("SIGTERM", () => {
  exports.closeChannel();
  process.exit(0);
});
