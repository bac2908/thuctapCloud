# 📚 Hướng dẫn Triển khai Production (Deployment Guide)

**Tài liệu này hướng dẫn triển khai VPN Gaming Platform lên production environments.**

Nội dung:
- [Yêu cầu Hệ thống](#yêu-cầu-hệ-thống)
- [Chuẩn bị Server](#chuẩn-bị-server)
- [Triển khai với Docker Compose](#triển-khai-với-docker-compose)
- [Cấu hình Nginx & SSL](#cấu-hình-nginx--ssl)
- [Cảnh báo & Giám sát](#cảnh-báo--giám-sát)
- [Backup & Khôi phục](#backup--khôi-phục)

---

## 🖥️ Yêu cầu Hệ thống

### Server Specification
| Thành phần | Tối thiểu | Khuyến nghị |
|-----------|----------|-----------|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 2 GB | 4+ GB |
| **Storage** | 20 GB | 50+ GB SSD |
| **OS** | Ubuntu 20.04+ | Ubuntu 22.04 LTS |
| **Uptime** | 99.0% | 99.9%+ |

### Phần mềm Bắt buộc
```bash
- Docker 20.10+ (install guide: https://docs.docker.com/engine/install/)
- Docker Compose 1.29+ (install guide: https://docs.docker.com/compose/install/)
- Git 2.0+
- OpenSSL 1.1+
- curl/wget
```

### DNS & Network
- Domain name hoặc static IP
- Port **80** (HTTP) & **443** (HTTPS) công khai
- Firewall cho phép traffic từ 0.0.0.0/0 → port 80, 443

---

## 🖧 Chuẩn bị Server

### Step 1: Kết nối SSH vào Server

```bash
# Linux/macOS
ssh root@your-server-ip

# Windows (PowerShell)
ssh root@your-server-ip
# Hoặc sử dụng PuTTY

# Nếu lần đầu, chấp nhận fingerprint (gõ 'yes')
```

### Step 2: Cập nhật System Packages

```bash
apt-get update
apt-get upgrade -y
apt-get install -y curl wget git htop nano
```

### Step 3: Cài đặt Docker

```bash
# Download Docker installation script
curl -fsSL https://get.docker.com -o get-docker.sh

# Chạy script
sudo bash get-docker.sh

# Kiểm tra cài đặt
docker --version
docker ps

# Khởi động Docker daemon
sudo systemctl start docker
sudo systemctl enable docker
```

### Step 4: Cài đặt Docker Compose

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Cấp quyền thực thi
sudo chmod +x /usr/local/bin/docker-compose

# Kiểm tra
docker-compose --version
```

### Step 5: Chuẩn bị Thư mục Dự án

```bash
# Tạo thư mục deployment
mkdir -p /root/vpn-gaming
cd /root/vpn-gaming

# Clone repository
git clone <your-repo-url> .

# Hoặc upload files từ local
# Sử dụng SCP, SFTP, hoặc WinSCP
scp -r ./ThuctapCloud/* root@your-server-ip:/root/vpn-gaming/
```

---

## 🚀 Triển khai với Docker Compose

### Step 6: Cấu hình Environment Variables

```bash
cd /root/vpn-gaming

# Copy template
cp .env.example .env

# Copy production template
cp .env.production .env
```

**Chỉnh sửa `.env` cho production:**

```env
# =====================================================
# DATABASE
# =====================================================
DATABASE_URL=postgresql+psycopg2://vpn_user:VeryStrongPassword@database:5432/vpn_app
DB_PASSWORD=VeryStrongPassword  # ⚠️ Generate strong password

# =====================================================
# JWT & SECURITY
# =====================================================
JWT_SECRET=<your-random-256-bit-secret>  # Generate: python -c "import secrets; print(secrets.token_urlsafe(32))"
JWT_EXPIRE_MIN=60

# =====================================================
# APP URLs
# =====================================================
APP_BASE_URL=https://your-domain.com
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
VITE_API_BASE_URL=  # Leave empty for nginx proxy

# =====================================================
# EMAIL (SMTP)
# =====================================================
SMTP_FALLBACK_TO_CONSOLE=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@your-domain.com
SMTP_USE_TLS=true

# =====================================================
# GOOGLE OAUTH
# =====================================================
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback

# =====================================================
# MOMO PAYMENT
# =====================================================
MOMO_PARTNER_CODE=<get from MoMo>
MOMO_ACCESS_KEY=<get from MoMo>
MOMO_SECRET_KEY=<get from MoMo>
MOMO_ENDPOINT=https://payment.momo.vn/v2/gateway/api/create  # Production
MOMO_REDIRECT_URL=https://your-domain.com/app
MOMO_IPN_URL=https://your-domain.com/payments/momo/ipn
```

**Tạo JWT_SECRET mạnh:**
```bash
python3 -c "import secrets; print('JWT_SECRET=' + secrets.token_urlsafe(32))"
```

### Step 7: Kiểm tra Port Sẵn sàng

```bash
# Kiểm tra port 80, 443
sudo lsof -i :80
sudo lsof -i :443

# Nếu port bị chiếm:
sudo systemctl stop apache2  # Nếu Apache chạy
sudo systemctl stop nginx    # Nếu Nginx chạy
```

### Step 8: Khởi động Hệ thống

```bash
cd /root/vpn-gaming

# Build & start containers
docker-compose up -d

# Kiểm tra các container chạy
docker-compose ps

# Xem logs
docker-compose logs -f

# Khởi tạo database
docker-compose exec backend python -m app.database

# Seed dev data (optional)
docker-compose exec backend python -m app.seed
```

**Expected output:**
```
NAME              STATUS      PORTS
vpn_frontend      Up 2m       0.0.0.0:80->80/tcp
vpn_backend       Up 2m       0.0.0.0:8000->8000/tcp
vpn_database      Up 2m       5432/tcp
```

### Step 9: Kiểm tra Hệ thống

```bash
# Frontend (browser hoặc curl)
curl http://localhost

# Backend health check
curl http://localhost:8000/health

# API endpoint test
curl http://localhost:8000/auth/health
```

---

## 🔒 Cấu hình Nginx & SSL

### Setup SSL với Let's Encrypt

```bash
# Cài đặt Certbot
apt-get install -y certbot python3-certbot-nginx

# Cấp chứng chỉ SSL (Replace your-domain.com)
certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Chứng chỉ lưu tại:
# /etc/letsencrypt/live/your-domain.com/
```

### Update nginx.conf với SSL

**Chỉnh sửa** `/root/vpn-gaming/FE_vpn/nginx.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP → HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript;

    # Reverse proxy to backend
    location /auth {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Static assets (cache)
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

### Rebuild Frontend Container

```bash
cd /root/vpn-gaming
docker-compose down frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Renew SSL Certificates

```bash
# Certbot auto-renewal (Usually automatic)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Manual renewal
certbot renew --dry-run  # Test
certbot renew            # Actual renewal
```

---

## 📊 Cảnh báo & Giám sát

### Docker Container Health Checks

```bash
# Monitoring containers
watch -n 2 'docker-compose ps'

# View resource usage
docker stats

# Check container logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs database
```

### System Resource Monitoring

```bash
# CPU & Memory
htop

# Disk space
df -h

# Network
netstat -an | grep ESTABLISHED | wc -l
```

### Log Rotation

```bash
# Configure docker log rotation in daemon.json
# /etc/docker/daemon.json

{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    }
}

# Restart Docker
systemctl restart docker
```

---

## 💾 Backup & Khôi phục

### Database Backup

```bash
# Backup PostgreSQL
docker-compose exec database pg_dump -U vpn_user -d vpn_app > backup_$(date +%Y%m%d).sql

# Compress backup
gzip backup_*.sql

# Upload to cloud storage
aws s3 cp backup_*.sql.gz s3://your-bucket/backups/
```

### Restore from Backup

```bash
# Restore database
gunzip backup_*.sql.gz
docker-compose exec -T database psql -U vpn_user -d vpn_app < backup_*.sql

# Verify restoration
docker-compose exec database psql -U vpn_user -d vpn_app -c "\dt"
```

### Full System Backup

```bash
# Backup all data volumes
docker-compose exec database pg_dump -U vpn_user -d vpn_app > db_backup.sql

# Backup configs
tar -czf config_backup.tar.gz .env docker-compose.yml

# Upload to secure location
scp config_backup.tar.gz backup@backup-server:/backups/
```

---

## 🔄 Update & Maintenance

### Update Application Code

```bash
# Pull latest changes
git pull origin main

# Rebuild containers
docker-compose build

# Restart services
docker-compose down
docker-compose up -d

# Check logs for errors
docker-compose logs
```

### Remove Old Images & Free Space

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Check space
docker system df
```

---

## 🆘 Troubleshooting

### Container fails to start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Database connection failed: Check DATABASE_URL, wait for postgres to be healthy
# - Port already in use: sudo lsof -i :8000
# - Out of disk space: docker system df
```

### Database connection timeout

```bash
# Verify database container
docker-compose ps database

# Test database connection
docker-compose exec backend nc -zv database 5432

# Check DATABASE_URL in .env
echo $DATABASE_URL
```

### SSL certificate issues

```bash
# Check certificate expiration
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -text -noout | grep -i validity

# Renew manually
certbot renew --force-renewal

# Check nginx SSL config
nginx -t
```

### Frontend not loading

```bash
# Check nginx logs
docker-compose logs frontend

# Verify nginx config
docker exec <container_id> nginx -t

# Check CORS settings in .env
grep CORS_ORIGINS .env
```

---

## 📋 Pre-Launch Checklist

- [ ] Domain name configured & pointing to server IP
- [ ] Database credentials changed (not default)
- [ ] JWT_SECRET generated with secure random
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] Email (SMTP) credentials configured
- [ ] Google OAuth callback URL registered
- [ ] MoMo payment credentials added
- [ ] Firewall rules allow port 80, 443
- [ ] Backup system enabled
- [ ] Monitoring & alerts configured
- [ ] Admin user created & password secured
- [ ] Load testing completed
- [ ] Security audit performed

---

## 📞 Support

- **Issues**: Check Docker logs first
- **Documentation**: Refer to [README.md](README.md)
- **Team Contact**: [Your Contact Info]

---

**Last Updated**: March 2026 | **Version**: 1.0.0

# Kiểm tra
docker --version
docker compose version
```

---

## 🚀 BƯỚC 5: Deploy ứng dụng

```bash
# Di chuyển vào thư mục project
cd /root/vpn-gaming

# Kiểm tra các file
ls -la

# Copy .env.production thành .env (nếu chưa có)
cp .env.production .env

# Phân quyền script
chmod +x deploy/deploy_production.sh

# Chạy deploy
bash deploy/deploy_production.sh
```

---

## ✅ BƯỚC 6: Kiểm tra kết quả

### 6.1 Kiểm tra containers đang chạy:

```bash
docker compose ps
```

Kết quả mong đợi:
```
NAME            STATUS              PORTS
vpn_database    Up (healthy)        0.0.0.0:5432->5432/tcp
vpn_backend     Up (healthy)        0.0.0.0:8080->8000/tcp
vpn_frontend    Up                  0.0.0.0:80->80/tcp
```

### 6.2 Kiểm tra logs:

```bash
# Xem tất cả logs
docker compose logs -f

# Xem logs từng service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f database
```

### 6.3 Test API:

```bash
curl http://localhost/health
curl http://localhost/api/health
curl http://localhost/auth/me
```

---

## 🌐 BƯỚC 7: Truy cập website

Mở trình duyệt và truy cập:

- **Website**: http://172.16.60.25
- **API Docs**: http://172.16.60.25/docs

### Đăng nhập Admin:
- Email: `admin@vpngaming.com`
- Password: `Admin@123`

---

## 🔧 Các lệnh quản lý

```bash
# Xem logs
docker compose logs -f

# Restart tất cả
docker compose restart

# Restart một service
docker compose restart backend

# Dừng tất cả
docker compose down

# Dừng và xóa data (CẢNH BÁO!)
docker compose down -v

# Rebuild và deploy lại
docker compose up -d --build
```

---

## 🐛 Xử lý lỗi thường gặp

### Lỗi "port 80 already in use"
```bash
# Kiểm tra process đang dùng port 80
lsof -i :80

# Dừng nginx/apache nếu đang chạy
systemctl stop nginx
systemctl stop apache2

# Hoặc kill process
kill -9 <PID>
```

### Lỗi database connection
```bash
# Kiểm tra database container
docker compose logs database

# Restart database
docker compose restart database

# Chờ 30s rồi restart backend
sleep 30
docker compose restart backend
```

### Lỗi permission denied
```bash
# Cấp quyền
chmod -R 755 /root/vpn-gaming
```

---

## 📝 Ghi chú

- Mọi API đều đi qua port 80 (nginx reverse proxy)
- Không cần mở port 8080 ra ngoài
- Database chạy trong Docker, không cần cài PostgreSQL trên host
