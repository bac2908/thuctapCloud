#!/bin/bash
# =====================================================
# SCRIPT DEPLOY LÊN SERVER 172.16.60.25
# =====================================================
# Chạy script này TRÊN SERVER sau khi SSH vào
# ssh root@172.16.60.25
# =====================================================

set -e

echo "=========================================="
echo "🚀 DEPLOY VPN GAMING - 172.16.60.25"
echo "=========================================="

# Kiểm tra Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker chưa cài đặt!"
    echo "Đang cài đặt Docker..."
    
    apt-get update
    apt-get install -y ca-certificates curl gnupg lsb-release
    
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    systemctl start docker
    systemctl enable docker
    
    echo "✅ Docker đã cài đặt"
fi

# Kiểm tra thư mục project
PROJECT_DIR="/root/vpn-gaming"
if [ ! -d "$PROJECT_DIR" ]; then
    echo "📁 Tạo thư mục project..."
    mkdir -p "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"

# Kiểm tra file cần thiết
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Chưa có source code!"
    echo ""
    echo "Vui lòng copy source code lên server trước:"
    echo "  Từ máy local chạy: scp -r * root@172.16.60.25:/root/vpn-gaming/"
    echo ""
    exit 1
fi

# Kiểm tra file .env
if [ ! -f ".env" ]; then
    if [ -f ".env.production" ]; then
        cp .env.production .env
        echo "✅ Tạo .env từ .env.production"
    else
        echo "❌ Không có file .env!"
        exit 1
    fi
fi

echo ""
echo "1️⃣ Dừng containers cũ..."
docker compose down 2>/dev/null || true

echo ""
echo "2️⃣ Xóa images cũ..."
docker rmi vpn_backend vpn_frontend 2>/dev/null || true

echo ""
echo "3️⃣ Build và khởi động containers..."
docker compose up -d --build

echo ""
echo "4️⃣ Chờ services khởi động..."
sleep 20

echo ""
echo "5️⃣ Kiểm tra trạng thái..."
docker compose ps

echo ""
echo "6️⃣ Kiểm tra health..."
sleep 5

if curl -sf http://localhost/health > /dev/null 2>&1; then
    echo "✅ Frontend: OK"
else
    echo "⏳ Frontend: Đang khởi động..."
fi

if curl -sf http://localhost/api/health > /dev/null 2>&1; then
    echo "✅ Backend: OK"
else
    echo "⏳ Backend: Đang khởi động..."
fi

echo ""
echo "=========================================="
echo "✅ DEPLOY HOÀN THÀNH!"
echo "=========================================="
echo ""
echo "🌐 Website:    http://172.16.60.25"
echo "📚 API Docs:   http://172.16.60.25/docs"
echo ""
echo "👤 Tài khoản Admin mặc định:"
echo "   📧 Email: admin@vpngaming.com"
echo "   🔑 Pass:  Admin@123"
echo ""
echo "📋 Các lệnh hữu ích:"
echo "   Xem logs:     docker compose logs -f"
echo "   Restart:      docker compose restart"
echo "   Dừng:         docker compose down"
echo ""
