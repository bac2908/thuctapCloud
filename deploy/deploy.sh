#!/bin/bash
# Script deploy ứng dụng VPN Gaming
# Chạy trong thư mục chứa docker-compose.yml

set -e

echo "=========================================="
echo "DEPLOY VPN GAMING APPLICATION"
echo "=========================================="

# Kiểm tra Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker chưa được cài đặt!"
    echo "Chạy: sudo bash deploy/setup_vps.sh"
    exit 1
fi

# Kiểm tra file docker-compose.yml
if [ ! -f "docker-compose.yml" ]; then
    echo "Error: Không tìm thấy docker-compose.yml"
    echo "Hãy chạy script này trong thư mục gốc dự án"
    exit 1
fi

# Kiểm tra file .env
if [ ! -f ".env" ]; then
    echo "Warning: Không tìm thấy file .env"
    echo "Tạo từ template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Đã tạo .env từ .env.example"
        echo "⚠️  Vui lòng chỉnh sửa .env trước khi deploy production!"
    else
        echo "Error: Không có .env.example"
        exit 1
    fi
fi

# Parse arguments
FULL_DEPLOY=true
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --no-db) FULL_DEPLOY=false; echo "Mode: Sử dụng PostgreSQL host" ;;
        --help) 
            echo "Usage: ./deploy.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --no-db    Không khởi động PostgreSQL container (sử dụng host DB)"
            echo "  --help     Hiển thị trợ giúp"
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
    shift
done

echo ""
echo "1. Dừng containers cũ (nếu có)..."
docker compose down 2>/dev/null || true

echo ""
echo "2. Xóa images cũ..."
docker rmi vpn_backend vpn_frontend 2>/dev/null || true

echo ""
echo "3. Build và khởi động containers..."
if [ "$FULL_DEPLOY" = true ]; then
    echo "   → Full deploy (DB + Backend + Frontend)"
    docker compose up -d --build
else
    echo "   → Deploy (Backend + Frontend only)"
    docker compose up -d --build backend frontend
fi

echo ""
echo "4. Chờ containers khởi động..."
sleep 15

echo ""
echo "5. Kiểm tra trạng thái..."
docker compose ps

echo ""
echo "6. Kiểm tra health..."
if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Backend: OK"
else
    echo "⚠️  Backend: Đang khởi động..."
fi

if curl -sf http://localhost/health > /dev/null 2>&1; then
    echo "✅ Frontend: OK"
else
    echo "⚠️  Frontend: Đang khởi động..."
fi

echo ""
echo "=========================================="
echo "DEPLOY HOÀN THÀNH!"
echo "=========================================="
echo ""
echo "📱 Frontend:  http://YOUR_IP"
echo "🔧 Backend:   http://YOUR_IP:8080"
echo "📚 API Docs:  http://YOUR_IP:8080/docs"
echo ""
echo "👤 Admin mặc định:"
echo "   Email: admin@vpngaming.com"
echo "   Pass:  Admin@123"
echo ""
echo "📋 Xem logs:  docker compose logs -f"
echo "🛑 Dừng:      docker compose down"
echo "🔄 Restart:   docker compose restart"
echo ""
