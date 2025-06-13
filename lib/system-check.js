const os = require('os');
const { exec } = require('child_process');
const logger = require('./logger');

class SystemChecker {
  static async checkBookwormCompatibility() {
    try {
      const platform = os.platform();
      const release = os.release();
      
      logger.info(`检测到系统: ${platform} ${release}`);
      
      // 检查是否为树莓派
      const isRaspberryPi = await this.checkRaspberryPi();
      if (!isRaspberryPi) {
        logger.warn('当前系统不是树莓派，某些功能可能不可用');
        return false;
      }
      
      // 检查树莓派系统版本
      const isBookworm = await this.checkRaspberryPiVersion();
      
      if (isBookworm) {
        logger.info('检测到树莓派Bookworm系统，启用兼容模式');
        return true;
      } else {
        logger.info('检测到树莓派旧版本系统，使用标准模式');
        return false;
      }
    } catch (error) {
      logger.error('系统兼容性检查失败:', error);
      return false;
    }
  }

  static async checkRaspberryPi() {
    return new Promise((resolve) => {
      exec('cat /proc/cpuinfo | grep -i raspberry', (error, stdout) => {
        if (error) {
          resolve(false);
          return;
        }
        const isRaspberryPi = stdout.toLowerCase().includes('raspberry');
        resolve(isRaspberryPi);
      });
    });
  }

  static async checkRaspberryPiVersion() {
    return new Promise((resolve) => {
      exec('cat /etc/os-release', (error, stdout) => {
        if (error) {
          resolve(false);
          return;
        }
        const isBookworm = stdout.includes('bookworm');
        resolve(isBookworm);
      });
    });
  }

  static async checkRequiredPackages() {
    const requiredPackages = [
      'ffmpeg',
      'pulseaudio',
      'libpulse-dev'
    ];

    const missingPackages = [];

    for (const package of requiredPackages) {
      const isInstalled = await this.checkPackageInstalled(package);
      if (!isInstalled) {
        missingPackages.push(package);
      }
    }

    return {
      allInstalled: missingPackages.length === 0,
      missingPackages
    };
  }

  static async checkPackageInstalled(packageName) {
    return new Promise((resolve) => {
      exec(`dpkg -l | grep -i ${packageName}`, (error, stdout) => {
        resolve(!error && stdout.trim().length > 0);
      });
    });
  }

  static async checkGPIOAccess() {
    return new Promise((resolve) => {
      exec('ls /dev/gpiomem', (error) => {
        if (error) {
          resolve(false);
          return;
        }
        
        // 检查GPIO权限
        exec('ls -l /dev/gpiomem', (error, stdout) => {
          if (error) {
            resolve(false);
            return;
          }
          
          // 检查是否有读写权限
          const hasAccess = stdout.includes('666') || stdout.includes('crw-rw-rw');
          resolve(hasAccess);
        });
      });
    });
  }

  static async checkNodeVersion() {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 14) {
      logger.warn(`Node.js版本过低: ${nodeVersion}，建议使用Node.js 14或更高版本`);
      return false;
    }
    
    logger.info(`Node.js版本: ${nodeVersion}`);
    return true;
  }

  static async performFullSystemCheck() {
    logger.info('开始系统兼容性检查...');
    
    const results = {
      isBookworm: false,
      isRaspberryPi: false,
      packagesOk: false,
      gpioAccess: false,
      nodeVersionOk: false,
      recommendations: []
    };

    // 检查树莓派Bookworm兼容性
    results.isBookworm = await this.checkBookwormCompatibility();
    
    // 检查是否为树莓派
    results.isRaspberryPi = await this.checkRaspberryPi();
    
    // 检查必需包
    const packageCheck = await this.checkRequiredPackages();
    results.packagesOk = packageCheck.allInstalled;
    if (!packageCheck.allInstalled) {
      results.recommendations.push(`缺少必需包: ${packageCheck.missingPackages.join(', ')}`);
    }
    
    // 检查GPIO访问权限
    results.gpioAccess = await this.checkGPIOAccess();
    if (!results.gpioAccess) {
      results.recommendations.push('GPIO访问权限不足，请确保用户有GPIO访问权限');
    }
    
    // 检查Node.js版本
    results.nodeVersionOk = await this.checkNodeVersion();
    if (!results.nodeVersionOk) {
      results.recommendations.push('建议升级Node.js到14或更高版本');
    }

    // 输出检查结果
    logger.info('系统兼容性检查完成:');
    logger.info(`- 树莓派Bookworm: ${results.isBookworm ? '是' : '否'}`);
    logger.info(`- 树莓派系统: ${results.isRaspberryPi ? '是' : '否'}`);
    logger.info(`- 必需包: ${results.packagesOk ? '已安装' : '缺少'}`);
    logger.info(`- GPIO访问: ${results.gpioAccess ? '正常' : '异常'}`);
    logger.info(`- Node.js版本: ${results.nodeVersionOk ? '正常' : '过低'}`);

    if (results.recommendations.length > 0) {
      logger.warn('建议:');
      results.recommendations.forEach(rec => logger.warn(`- ${rec}`));
    }

    return results;
  }

  static async installMissingPackages() {
    const packageCheck = await this.checkRequiredPackages();
    
    if (packageCheck.allInstalled) {
      logger.info('所有必需包已安装');
      return true;
    }

    logger.info(`安装缺少的包: ${packageCheck.missingPackages.join(', ')}`);
    
    return new Promise((resolve) => {
      const packages = packageCheck.missingPackages.join(' ');
      exec(`sudo apt update && sudo apt install -y ${packages}`, (error, stdout, stderr) => {
        if (error) {
          logger.error('安装包失败:', error);
          resolve(false);
        } else {
          logger.info('包安装成功');
          resolve(true);
        }
      });
    });
  }

  static async fixGPIOPermissions() {
    logger.info('修复GPIO访问权限...');
    
    return new Promise((resolve) => {
      exec('sudo usermod -a -G gpio $USER && sudo chmod 666 /dev/gpiomem', (error) => {
        if (error) {
          logger.error('修复GPIO权限失败:', error);
          resolve(false);
        } else {
          logger.info('GPIO权限修复成功，需要重启系统生效');
          resolve(true);
        }
      });
    });
  }
}

module.exports = SystemChecker; 