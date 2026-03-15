# VPN Gaming Platform - Hệ thống Quản lý VPN & Cloud Gaming

**Phiên bản**: 1.0.0 | **Ngôn ngữ**: Python (Backend) + React (Frontend) | **License**: MIT

## 📖 Giới thiệu Dự án

Nền tảng quản lý VPN Gaming là một hệ thống web toàn vẹn cho phép người dùng:
- **Xác thực & cấp quyền**: Đăng ký/đăng nhập với OAuth (Google), hỗ trợ đặt lại mật khẩu
- **Quản lý phiên**: Khởi tạo/dừng phiên máy ảo, theo dõi thời gian sử dụng
- **Kết nối VPN**: Tự động tạo tài khoản VPN, cung cấp file `.ovpn`
- **Thanh toán**: Tích hợp MoMo Payment cho nạp tiền/thanh toán phí
- **Bảng điều khiển admin**: Quản lý người dùng, máy, giao dịch

---

## 🏗️ Kiến trúc Hệ thống

### Mô hình Triển khai (Production)

```
┌─────────────────────────────────────────────────────────┐
│                    NGINX Reverse Proxy                  │
│                    (Port 80 Public)                     │
├─────────────────────────────────────────────────────────┤
│ ✓ SPA Frontend (React) tại /                            │
│ ✓ Route /auth → Backend                                 │
│ ✓ Route /machines → Backend                             │
│ ✓ Route /payments → Backend                             │
│ ✓ Route /admin → Backend                                │
└────────────────┬──────────────────────────────────────┘
                 │ Docker Network
        ┌────────┼────────┐
        │        │        │
    ┌───▼──┐ ┌──▼──┐ ┌──▼────────┐
    │Backend│ │  DB  │ │ Cache(opt)│
    │:8000 │ │:5432 │ │  Redis    │
    └──────┘ └──────┘ └───────────┘
```

**Ưu điểm kiến trúc này:**
- ✅ Single entry point (1 domain, port 80)
- ✅ CORS tự động (cùng domain)
- ✅ SSL/TLS centralized tại nginx
- ✅ Backend không exposed ra internet
- ✅ Scalable (dễ thêm container backends)

### Stack Công nghệ

| Thành phần | Công nghệ | Phiên bản |
|-----------|----------|----------|
## 📋 Yêu cầu Hệ thống

### Phát triển cục bộ
- **Python** 3.11+ (cho backend)
- **Node.js** 18+ (cho frontend)
- **PostgreSQL** 15+ hoặc SQLite (phát triển)
- **Git** 2.0+

### Production (Docker)
- **Docker** 20.10+
- **Docker Compose** 1.29+
- **Port 80, 443** mở trên host

---

## 🚀 Hướng dẫn Nhanh

### 1. Clone & Chuẩn bị

```bash
git clone <your-repo-url>
cd ThuctapCloud
```

### 2. Cấu hình Environments

**Backend:**
```bash
cd BE_vpn
cp .env.example .env
# Chỉnh sửa DATABASE_URL, JWT_SECRET, SMTP credentials theo môi trường
```

**Frontend:**
```bash
cd FE_vpn
cp .env.example .env.development
# Chỉnh sửa VITE_API_BASE_URL (development: http://localhost:8080)
```

### 3. Phát triển cục bộ

**Backend:**
```bash
cd BE_vpn
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
# Backend chạy tại http://localhost:8000
```

**Frontend (terminal khác):**
```bash
cd FE_vpn
npm install
npm run dev
# Frontend chạy tại http://localhost:5173
```

### 4. Production Deployment

Xem [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) để hướng dẫn chi tiết.

**Nhanh gọn:**
```bash
docker-compose up -d
# Hệ thống chạy tại http://your-domain.com
```

---

## 📁 Cấu trúc Dự án

```
ThuctapCloud/
├── BE_vpn/                          # Backend FastAPI
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # Application entry point
│   │   ├── routes.py                # API endpoints (/auth, /machines, /payments, /admin)
│   │   ├── models.py                # SQLAlchemy models
│   │   ├── schemas.py               # Pydantic schemas
│   │   ├── config.py                # Configuration management
│   │   ├── database.py              # Database initialization
│   │   ├── security.py              # JWT & password utilities
│   │   ├── email_utils.py           # Email sending
│   │   └── seed.py                  # Database seeding
│   ├── migrations/                  # Database migration scripts
│   ├── Dockerfile                   # Container configuration
│   ├── requirements.txt             # Python dependencies
│   └── .env.example                 # Environment template
│
├── FE_vpn/                          # Frontend React + Vite
│   ├── src/
│   │   ├── pages/                   # Page components
│   │   │   ├── Dashboard.jsx        # User dashboard
│   │   │   ├── Machines.jsx         # Machine management
│   │   │   ├── Wizard.jsx           # Session wizard
│   │   │   ├── History.jsx          # Session history
│   │   │   ├── Support.jsx          # Support & help
│   │   │   ├── Admin.jsx            # Admin dashboard
│   │   │   └── auth/                # Auth pages
│   │   ├── components/              # Reusable components
│   │   ├── api/                     # API client functions
│   │   ├── data/                    # Mock data & constants
│   │   ├── App.jsx                  # Main app component
│   │   └── main.jsx                 # React entry point
│   ├── public/                      # Static assets
│   ├── Dockerfile                   # Container configuration
│   ├── nginx.conf                   # Nginx reverse proxy config
│   ├── vite.config.js               # Vite configuration
│   ├── package.json                 # Dependencies
│   └── .env.example                 # Environment template
│
├── deploy/                          # Deployment scripts
│   ├── deploy.sh                    # Main deployment script
│   ├── setup_vps.sh                 # VPS setup script
│   └── deploy_production.sh         # Production deployment
│
├── docker-compose.yml               # Multi-container orchestration
├── DEPLOY_GUIDE.md                  # Detailed deployment guide
├── README.md                        # This file
├── package.json                     # Root dependencies (if any)
└── .gitignore                       # Git ignore rules
```

---

## 🔌 API Endpoints

### Authentication (`/auth`)
- `POST /auth/register` - Đăng ký người dùng mới
- `POST /auth/login` - Đăng nhập
- `POST /auth/logout` - Đăng xuất
- `POST /auth/refresh` - Làm mới token
- `GET /auth/me` - Lấy thông tin người dùng hiện tại
- `POST /auth/forgot-password` - Yêu cầu đặt lại mật khẩu
- `POST /auth/reset-password` - Đặt lại mật khẩu
- `GET /auth/google/callback` - Google OAuth callback

### Machines (`/machines`)
- `GET /machines` - Danh sách máy có sẵn
- `POST /machines/create-session` - Tạo phiên mới
- `GET /machines/my-sessions` - Phiên của người dùng
- `POST /machines/{id}/stop` - Dừng phiên

### Payments (`/payments`)
- `POST /payments/momo/create` - Tạo thanh toán MoMo
- `GET /payments/momo/callback` - MoMo callback
- `POST /payments/momo/ipn` - MoMo IPN (Instant Payment Notification)
- `GET /payments/history` - Lịch sử giao dịch

### Admin (`/admin`)
- `GET /admin/users` - Danh sách người dùng
- `GET /admin/machines` - Danh sách máy
- `GET /admin/transactions` - Danh sách giao dịch
- `PATCH /admin/users/{id}` - Cập nhật người dùng
- `DELETE /admin/users/{id}` - Xóa người dùng

---

## 🔐 Bảo mật

### Xác thực & Ủy quyền
- JWT (JSON Web Tokens) cho session management
- Token lưu tại httpOnly cookies (chặn XSS)
- CSRF protection trên forms
- Password hashing với bcrypt

### HTTPS/SSL
- Nginx tự động redirect HTTP → HTTPS
- Let's Encrypt support (qua certbot)

### CORS & Rate Limiting
- CORS cấu hình tại environment
- Rate limiting trên API endpoints
- IP whitelisting (optional)

### SQL Injection Prevention
- SQLAlchemy parameterized queries
- Input validation với Pydantic

---

## 💾 Quản lý Cơ sở Dữ liệu

### Migrations
```bash
# Xem các migration có sẵn
ls BE_vpn/migrations/

# Chạy migrations
python BE_vpn/app/database.py
```

### Seeding (Dev Data)
```bash
python BE_vpn/app/seed.py
```

### Backup
```bash
# PostgreSQL dump
pg_dump -U vpn_user -d vpn_app > backup.sql

# Restore
psql -U vpn_user -d vpn_app < backup.sql
```

---

## 🐛 Troubleshooting

| Vấn đề | Giải pháp |
|--------|----------|
| Backend không kết nối DB | Kiểm tra `DATABASE_URL` environment, đảm bảo PostgreSQL chạy |
| CORS errors | Cấu hình `CORS_ORIGINS` phù hợp, thêm domain vào list |
| Frontend không tải API | Kiểm tra `VITE_API_BASE_URL`, nginx proxy config |
| OAuth không hoạt động | Kiểm tra `GOOGLE_REDIRECT_URI`, credentials tại Google Cloud Console |
| MoMo payment fails | Kiểm tra `MOMO_PARTNER_CODE`, `MOMO_SECRET_KEY`, connection từ server |

---

## 📞 Support & Contribution

- **Bug Reports**: [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation**: Xem `/docs` folder
- **Team**: [Your Team Info]

---

## 📜 License

MIT License - Xem [LICENSE](LICENSE) file chi tiết.
│   │   ├── pages/       # React pages
│   │   └── api/         # API clients
│   ├── nginx.conf       # Nginx config với reverse proxy
│   └── Dockerfile
│
├── deploy/              # Deployment scripts
│   ├── deploy.sh        # Main deploy script
│   └── setup_vps.sh     # VPS setup script
│
├── docker-compose.yml   # Docker orchestration
├── .env.example         # Production template
├── .env.development     # Development template
└── README.md
```

## 🔧 Các lệnh hữu ích

```bash
# Xem logs
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend

# Restart services
docker compose restart
docker compose restart backend

# Dừng tất cả
docker compose down

# Dừng và xóa volumes (CẢNH BÁO: mất dữ liệu)
docker compose down -v

# Rebuild một service
docker compose up -d --build backend
```

## 👤 Tài khoản mặc định

- **Admin**: admin@vpngaming.com / Admin@123

## 🌐 Endpoints (Production)

Tất cả đều qua port 80 (cùng domain):

| Path | Mô tả |
|------|-------|
| `/` | Giao diện người dùng (React) |
| `/app` | Dashboard sau đăng nhập |
| `/auth/*` | API xác thực |
| `/machines/*` | API quản lý máy |
| `/payments/*` | API thanh toán |
| `/admin/*` | API quản trị |
| `/docs` | Swagger API documentation |
| `/health` | Frontend health check |
| `/api/health` | Backend health check |

## 🔐 Tính năng bảo mật

- JWT authentication với token expiry
- Password hashing với bcrypt
- CORS configuration
- Token revocation on logout
- Email verification

## 💳 Tích hợp thanh toán

- **MoMo**: Đã tích hợp sandbox, cấu hình production key trong .env

## 📧 Email

- Hỗ trợ SMTP (Gmail, v.v.)
- Fallback to console khi không cấu hình

## 🐛 Troubleshooting

### Backend không khởi động được
```bash
# Kiểm tra logs
docker compose logs backend

# Kiểm tra database connection
docker compose exec backend python -c "from app.database import engine; print(engine.url)"
```

### API trả về 502 Bad Gateway
```bash
# Kiểm tra backend đã chạy chưa
docker compose ps
curl http://localhost:8000/health  # Trong container

# Kiểm tra nginx logs
docker compose logs frontend
```

### Database connection refused
```bash
# Kiểm tra database container
docker compose ps database
docker compose logs database
```

## 🛠️ Development Mode

Khi phát triển local, dùng `.env.development`:

```bash
cp .env.development .env

# Chạy backend riêng
cd BE_vpn
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Chạy frontend riêng
cd FE_vpn
npm install
npm run dev
```

Trong dev mode, FE gọi API trực tiếp qua `VITE_API_BASE_URL=http://localhost:8080`.

## 📝 License

Private - Dự án thực tập
docker compose exec backend python -c "from app.database import engine; print(engine.url)"
```

### Frontend 502 Bad Gateway
```bash
# Kiểm tra backend đã chạy chưa
curl http://localhost:8080/health
```

### Database connection refused
```bash
# Kiểm tra database container
docker compose ps database
docker compose logs database
```

## 📝 License

Private - Dự án thực tập
