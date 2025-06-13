#!/bin/bash

echo "Network RC 安装脚本"
echo "=================="

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
  echo "请使用 sudo 运行此脚本"
  exit 1
fi

# 设置密码
read -p "设置访问密码(可选):" password
password=${password:-""}

# 设置子域名
read -p "设置子域名(可选):" subDomain
subDomain=${subDomain:-""}

# 设置本地端口
read -p "设置本地端口(默认 8080):" localPort
localPort=${localPort:-8080}

echo "配置信息:"
echo "  - 密码: ${password:-"无"}"
echo "  - 子域名: ${subDomain:-"无"}"
echo "  - 本地端口: $localPort"

# 安装依赖
echo "正在安装依赖..."
apt update
apt install -y nodejs npm ffmpeg pulseaudio libpulse-dev

# 下载项目
echo "正在下载项目..."
cd /home/pi
rm -rf network-rc
git clone https://github.com/esonwong/network-rc.git
cd network-rc

# 安装依赖
echo "正在安装项目依赖..."
npm install

# 构建前端
echo "正在构建前端..."
cd front-end
npm install
npm run build
cd ..

# 创建配置文件
echo "正在创建配置文件..."
cat > /home/pi/network-rc/config.json << EOF
{
  "password": "$password",
  "localPort": $localPort,
  "subDomain": "$subDomain"
}
EOF

# 创建systemd服务
echo "正在创建系统服务..."
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

[Install]
WantedBy=multi-user.target
EOF

# 启用并启动服务
echo "正在启动服务..."
systemctl daemon-reload
systemctl enable network-rc
systemctl start network-rc

echo "安装完成！"
echo "服务状态:"
systemctl status network-rc --no-pager

echo ""
echo "访问地址:"
echo "  - 本地: http://$(hostname -I | awk '{print $1}'):$localPort"
if [ -n "$subDomain" ]; then
  echo "  - 远程: https://$subDomain.nrc.esonwong.com:9000"
fi

echo ""
echo "管理命令:"
echo "  - 查看状态: sudo systemctl status network-rc"
echo "  - 重启服务: sudo systemctl restart network-rc"
echo "  - 停止服务: sudo systemctl stop network-rc"
echo "  - 查看日志: sudo journalctl -u network-rc -f"




