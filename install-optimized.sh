#!/bin/bash

echo "🚗 Network RC 优化版安装脚本"
echo "=========================="

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
  echo "❌ 请使用 sudo 运行此脚本"
  exit 1
fi

# 检测系统版本
echo "🔍 检测系统版本..."
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS_VERSION=$VERSION_CODENAME
  echo "✅ 检测到系统: $PRETTY_NAME ($OS_VERSION)"
else
  echo "⚠️  无法检测系统版本，将使用兼容模式"
  OS_VERSION="unknown"
fi

# 检查是否为树莓派
if [ -f /proc/cpuinfo ] && grep -q "Raspberry Pi" /proc/cpuinfo; then
  echo "✅ 检测到树莓派设备"
  IS_RASPBERRY_PI=true
else
  echo "⚠️  未检测到树莓派设备，部分功能可能不可用"
  IS_RASPBERRY_PI=false
fi

# 基本配置
echo ""
echo "📝 基本配置"
echo "----------"
read -p "设置访问密码(可选): " password
password=${password:-""}

read -p "设置本地端口(默认 8080): " localPort
localPort=${localPort:-8080}

# 网络穿透配置
echo ""
echo "🌐 网络穿透配置"
echo "--------------"
echo "1. Cloudflare Tunnel (推荐)"
echo "2. 不使用网络穿透"
read -p "选择网络穿透方式 (1: Cloudflare Tunnel, 2: 不使用): " tunnelChoice

case $tunnelChoice in
  1)
    echo "✅ 选择 Cloudflare Tunnel"
    TUNNEL_TYPE="cloudflare"
    read -p "Cloudflare Tunnel Token: " tunnelToken
    if [ -z "$tunnelToken" ]; then
      echo "❌ Tunnel Token 不能为空"
      exit 1
    fi
    ;;
  2)
    echo "✅ 不使用网络穿透"
    TUNNEL_TYPE="none"
    ;;
  *)
    echo "❌ 无效选择"
    exit 1
    ;;
esac

# 功能配置
echo ""
echo "⚙️  功能配置"
echo "-----------"
read -p "启用GPS功能? (y/n, 默认 n): " enableGPS
enableGPS=${enableGPS:-n}

read -p "启用弱网络优化? (y/n, 默认 y): " enableWeakNetwork
enableWeakNetwork=${enableWeakNetwork:-y}

# 显示配置摘要
echo ""
echo "📋 配置摘要"
echo "----------"
echo "  - 系统版本: $OS_VERSION"
echo "  - 树莓派: $IS_RASPBERRY_PI"
echo "  - 密码: ${password:-"无"}"
echo "  - 本地端口: $localPort"
echo "  - 网络穿透: $TUNNEL_TYPE"
if [ "$TUNNEL_TYPE" = "cloudflare" ]; then
  echo "  - Tunnel Token: ${tunnelToken:0:10}..."
fi
echo "  - GPS功能: $enableGPS"
echo "  - 弱网络优化: $enableWeakNetwork"

read -p "确认安装? (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "❌ 安装已取消"
  exit 0
fi

# 开始安装
echo ""
echo "🚀 开始安装..."
echo "=============="

# 更新系统
echo "📦 更新系统包..."
apt update

# 安装基础依赖
echo "📦 安装基础依赖..."
apt install -y curl wget git build-essential

# 安装Node.js
echo "📦 安装 Node.js..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt install -y nodejs
fi

# 安装ffmpeg和音频依赖
echo "📦 安装多媒体依赖..."
apt install -y ffmpeg pulseaudio libpulse-dev

# 安装树莓派特定依赖
if [ "$IS_RASPBERRY_PI" = true ]; then
  echo "📦 安装树莓派依赖..."
  apt install -y python3-pip python3-dev
  
  # 安装GPIO库
  if [ "$OS_VERSION" = "bookworm" ]; then
    echo "📦 安装 Bookworm 兼容的 GPIO 库..."
    apt install -y pigpio python3-pigpio
    npm install -g onoff pigpio
  else
    echo "📦 安装传统 GPIO 库..."
    apt install -y libasound2-dev
    npm install -g rpio rpio-pwm
  fi
fi

# 下载项目
echo "📥 下载项目..."
cd /home/pi
rm -rf network-rc
git clone https://github.com/esonwong/network-rc.git
cd network-rc

# 安装项目依赖
echo "📦 安装项目依赖..."
npm install

# 构建前端
echo "🔨 构建前端..."
cd front-end
npm install
npm run build
cd ..

# 创建配置文件
echo "📝 创建配置文件..."
cat > /home/pi/network-rc/config.json << EOF
{
  "password": "$password",
  "localPort": $localPort,
  "tunnel": {
    "type": "$TUNNEL_TYPE"
EOF

if [ "$TUNNEL_TYPE" = "cloudflare" ]; then
  cat >> /home/pi/network-rc/config.json << EOF
    ,
    "cloudflare": {
      "token": "$tunnelToken"
    }
EOF
fi

cat >> /home/pi/network-rc/config.json << EOF
  },
  "features": {
    "gps": $([ "$enableGPS" = "y" ] && echo "true" || echo "false"),
    "weakNetworkOptimization": $([ "$enableWeakNetwork" = "y" ] && echo "true" || echo "false")
  }
}
EOF

# 创建systemd服务
echo "🔧 创建系统服务..."
cat > /etc/systemd/system/network-rc.service << EOF
[Unit]
Description=Network RC Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/network-rc
ExecStart=/usr/bin/node /home/pi/network-rc/index.js --password "$password" --localPort "$localPort"
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# 启用并启动服务
echo "🚀 启动服务..."
systemctl daemon-reload
systemctl enable network-rc
systemctl start network-rc

# 等待服务启动
sleep 3

echo ""
echo "✅ 安装完成！"
echo "============"

# 显示服务状态
echo "📊 服务状态:"
systemctl status network-rc --no-pager

# 显示访问信息
echo ""
echo "🌐 访问信息:"
echo "  - 本地访问: http://$(hostname -I | awk '{print $1}'):$localPort"

if [ "$TUNNEL_TYPE" = "cloudflare" ]; then
  echo "  - Cloudflare Tunnel: 正在配置中..."
  echo "    请稍后检查服务日志获取访问地址"
fi

echo ""
echo "🔧 管理命令:"
echo "  - 查看状态: sudo systemctl status network-rc"
echo "  - 重启服务: sudo systemctl restart network-rc"
echo "  - 停止服务: sudo systemctl stop network-rc"
echo "  - 查看日志: sudo journalctl -u network-rc -f"

echo ""
echo "📚 更多信息请查看:"
echo "  - 项目文档: https://github.com/esonwong/network-rc"
echo "  - 优化说明: README-优化升级.md" 