#!/bin/bash
# Script cài đặt môi trường trên VPS Ubuntu 22.04/24.04
# Chạy với quyền root: sudo bash deploy/setup_vps.sh

set -e

# Default values (có thể ghi đè bằng environment variables)
DB_USER="${DB_USER:-vpn_user}"
DB_PASSWORD="${DB_PASSWORD:-VpnSecure@2024}"
DB_NAME="${DB_NAME:-vpn_app}"

echo "=========================================="
echo "VPN GAMING - SETUP VPS"
echo "=========================================="
echo ""
echo "Database User: $DB_USER"
echo "Database Name: $DB_NAME"
echo ""

echo "=========================================="
echo "1. Cập nhật hệ thống"
echo "=========================================="
apt-get update && apt-get upgrade -y

echo "=========================================="
echo "2. Cài đặt Docker"
echo "=========================================="
# Cài đặt các gói cần thiết
apt-get install -y ca-certificates curl gnupg lsb-release

# Thêm Docker GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Thêm Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Cài đặt Docker
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Khởi động Docker
systemctl start docker
systemctl enable docker

echo "✅ Docker đã cài đặt"

echo "=========================================="
echo "3. Cài đặt PostgreSQL (Optional - cho host mode)"
echo "=========================================="
read -p "Cài đặt PostgreSQL trên host? (y/N): " install_pg
if [[ "$install_pg" =~ ^[Yy]$ ]]; then
    apt-get install -y postgresql postgresql-contrib

    # Khởi động PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql

    echo "=========================================="
    echo "4. Tạo Database và User"
    echo "=========================================="
    sudo -u postgres psql <<EOF
-- Tạo user
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';

-- Tạo database  
CREATE DATABASE $DB_NAME OWNER $DB_USER;

-- Cấp quyền
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Kết nối vào database và cấp quyền schema
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF

    echo "=========================================="
    echo "5. Cấu hình PostgreSQL cho phép kết nối từ Docker"
    echo "=========================================="
    # Tìm file config
    PG_HBA=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file')
    PG_CONF=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW config_file')

    # Backup config
    cp "$PG_HBA" "${PG_HBA}.backup"
    cp "$PG_CONF" "${PG_CONF}.backup"

    # Cho phép kết nối từ Docker network
    echo "# Allow Docker containers" >> "$PG_HBA"
    echo "host    all    all    172.17.0.0/16    md5" >> "$PG_HBA"
    echo "host    all    all    172.18.0.0/16    md5" >> "$PG_HBA"
    echo "host    all    all    172.19.0.0/16    md5" >> "$PG_HBA"

    # Cấu hình listen trên tất cả interfaces
    sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF"

    # Restart PostgreSQL
    systemctl restart postgresql
    
    echo "✅ PostgreSQL đã cài đặt và cấu hình"
else
    echo "→ Bỏ qua cài đặt PostgreSQL (sẽ sử dụng container)"
fi

echo "=========================================="
echo "6. Mở firewall ports"
echo "==========================================" 
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # Frontend
ufw allow 8080/tcp # Backend
ufw allow 443/tcp  # HTTPS (future)
ufw --force enable

echo "✅ Firewall đã cấu hình"

echo ""
echo "=========================================="
echo "HOÀN THÀNH CÀI ĐẶT!"
echo "=========================================="
echo ""
echo "Bước tiếp theo:"
echo "1. Clone dự án về server"
echo "2. Chỉnh sửa file .env"
echo "3. Chạy: bash deploy/deploy.sh"
echo ""
echo "Docker version: $(docker --version)"
echo "PostgreSQL version: $(psql --version)"
echo ""
echo "Tiếp theo, copy source code lên VPS và chạy docker compose"
