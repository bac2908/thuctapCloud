# Backend - VPN Gaming Platform

**FastAPI REST API Server**

Backend service xây dựng bằng FastAPI, SQLAlchemy, PostgreSQL. Cung cấp API endpoints cho authentication, machine management, payments, và admin operations.

---

## 📋 Tính năng

### Authentication & Authorization
- ✅ User registration & login
- ✅ Google OAuth 2.0 integration
- ✅ Password reset & email verification
- ✅ JWT token-based authentication
- ✅ Role-based access control (RBAC)

### API Features
- ✅ RESTful API design
- ✅ Input validation (Pydantic)
- ✅ Error handling & logging
- ✅ CORS configuration
- ✅ API documentation (Swagger/OpenAPI)

### Core Functionality
- ✅ User management
- ✅ Machine/VM management
- ✅ Session creation & management
- ✅ MoMo payment integration
- ✅ Email notifications
- ✅ Admin dashboard API

### Security
- ✅ Password hashing (bcrypt)
- ✅ JWT token management
- ✅ SQL injection prevention
- ✅ CSRF protection
- ✅ Rate limiting (optional)

---

## 🛠️ Tech Stack

| Thành phần | Công nghệ | Phiên bản |
|-----------|----------|----------|
| **Framework** | FastAPI | 0.110.2 |
| **Server** | Uvicorn | 0.29.0 |
| **Database** | PostgreSQL | 15+ |
| **ORM** | SQLAlchemy | 2.0.29 |
| **Authentication** | python-jose | 3.3.0 |
| **Password Hashing** | bcrypt | 3.2.2 |
| **Email** | SMTP (Gmail) | - |
| **Python** | Python | 3.11+ |

---

## 📁 Cấu trúc Dự án

```
BE_vpn/
├── app/
│   ├── __init__.py
│   ├── main.py                      # Application entry point
│   ├── config.py                    # Settings & configuration
│   ├── database.py                  # Database initialization
│   ├── models.py                    # SQLAlchemy models (ORM)
│   ├── schemas.py                   # Pydantic schemas (validation)
│   ├── routes.py                    # API routes & endpoints
│   ├── security.py                  # JWT & password utilities
│   ├── email_utils.py               # Email sending functions
│   ├── seed.py                      # Database seeding (dev data)
│   ├── static/                      # Frontend fallback (optional)
│   │   ├── index.html
│   │   └── assets/
│   └── __pycache__/
│
├── migrations/
│   ├── add_balance_and_topup.sql
│   ├── add_balance_final.sql
│   └── ...
│
├── scripts/
│   └── setup_backend.ps1            # Windows setup script
│
├── Dockerfile                       # Container configuration
├── requirements.txt                 # Python dependencies
├── .env.example                     # Environment template
├── .gitignore
├── .dockerignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- PostgreSQL 15+ (local or Docker)
- pip & virtualenv

### Local Development Setup

```bash
# 1. Create virtual environment
python -m venv .venv

# 2. Activate venv
# On Windows:
.venv\Scripts\activate
# On Mac/Linux:
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create .env file
cp .env.example .env

# 5. Update .env with your config
# DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/vpn_app
# JWT_SECRET=your-secret-key

# 6. Initialize database
python -m app.database

# 7. Seed development data (optional)
python -m app.seed

# 8. Run development server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

Visit API docs: `http://localhost:8000/docs`

---

## 📝 Environment Variables

### Required

```env
# Database
DATABASE_URL=postgresql+psycopg2://vpn_user:password@localhost:5432/vpn_app
DB_USER=vpn_user
DB_PASSWORD=VpnSecure@2024
DB_NAME=vpn_app

# JWT
JWT_SECRET=your-random-256-bit-secret-key
JWT_ALG=HS256
JWT_EXPIRE_MIN=30

# Application
APP_BASE_URL=http://localhost:8000
CORS_ORIGINS=http://localhost,http://localhost:3000
```

### Optional

```env
# Email (SMTP)
SMTP_FALLBACK_TO_CONSOLE=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@your-domain.com

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# MoMo Payment
MOMO_PARTNER_CODE=MOMO
MOMO_ACCESS_KEY=access-key
MOMO_SECRET_KEY=secret-key
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
```

---

## 🔌 API Endpoints

### Authentication (`/auth`)

```http
POST   /auth/register              # Register new user
POST   /auth/login                 # User login
POST   /auth/logout                # User logout
POST   /auth/refresh               # Refresh JWT token
GET    /auth/me                    # Get current user
POST   /auth/forgot-password       # Request password reset
POST   /auth/reset-password        # Reset password
GET    /auth/google/callback       # Google OAuth callback
```

### Machines (`/machines`)

```http
GET    /machines                   # List available machines
POST   /machines/create-session    # Create new session
GET    /machines/my-sessions       # User's sessions
POST   /machines/{id}/stop         # Stop session
GET    /machines/{id}/stats        # Machine statistics
```

### Payments (`/payments`)

```http
POST   /payments/momo/create       # Create MoMo payment
GET    /payments/momo/callback     # MoMo callback
POST   /payments/momo/ipn          # MoMo IPN webhook
GET    /payments/history           # Transaction history
GET    /payments/statistics        # Payment statistics
```

### Admin (`/admin`)

```http
GET    /admin/users                # List all users
GET    /admin/users/{id}           # Get user details
PATCH  /admin/users/{id}           # Update user
DELETE /admin/users/{id}           # Delete user
GET    /admin/machines             # List all machines
GET    /admin/transactions         # List transactions
GET    /admin/dashboard            # Admin dashboard stats
```

---

## 📊 Database Schema

### Tables

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR,
  display_name VARCHAR,
  role VARCHAR (DEFAULT 'user'),
  balance DECIMAL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Machines
CREATE TABLE machines (
  id UUID PRIMARY KEY,
  name VARCHAR,
  status VARCHAR,
  os VARCHAR,
  specs TEXT,
  created_at TIMESTAMP
)

-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  machine_id UUID REFERENCES machines(id),
  status VARCHAR,
  started_at TIMESTAMP,
  ended_at TIMESTAMP
)

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount DECIMAL,
  type VARCHAR,
  status VARCHAR,
  created_at TIMESTAMP
)
```

---

## 🐳 Docker Deployment

### Build Image

```bash
docker build -t vpn-gaming-backend:latest .
```

### Run Container

```bash
docker run -d \
  -p 8000:8000 \
  -e DATABASE_URL="postgresql+psycopg2://user:pass@db:5432/vpn_app" \
  -e JWT_SECRET="your-secret" \
  --name vpn-backend \
  vpn-gaming-backend:latest
```

### With Docker Compose

```bash
docker-compose up -d backend
```

---

## 🔐 Security Best Practices

### Authentication
- Passwords hashed with bcrypt (cost: 12)
- JWT stored in httpOnly cookies
- Token expiration: 30 minutes (configurable)
- Refresh token rotation

### Database
- Parameterized queries (SQLAlchemy ORM)
- SQL injection prevention
- Password hashing before storage

### API
- CORS configuration per environment
- Input validation with Pydantic
- Error messages don't expose internals
- Rate limiting (optional)

### HTTPS
- Enforce in production
- Let's Encrypt support
- Secure cookie flags

---

## 📝 Available Commands

```bash
# Development
python -m uvicorn app.main:app --reload

# Production
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker

# Database
python -m app.database          # Initialize
python -m app.seed              # Seed data

# Linting
pylint app/
black app/

# Testing
pytest tests/
```

---

## 🐛 Troubleshooting

### Database connection failed

```bash
# Check PostgreSQL running
psql -U vpn_user -h localhost -d vpn_app -c "\dt"

# Verify DATABASE_URL
echo $DATABASE_URL

# Create database if missing
createdb -U vpn_user vpn_app
```

### JWT errors

```bash
# Generate new JWT_SECRET
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Update .env and restart
```

### Email not sending

```bash
# Check SMTP config
# Enable "Less secure apps" in Gmail (if using Gmail)
# Or use App Password for 2FA accounts
```

---

## 📚 API Documentation

**Interactive API Documentation:**
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

---

## 📖 Development Tips

### Adding New Endpoint

```python
# 1. Add route in routes.py
@router.get("/items")
async def list_items(db: Session = Depends(get_db)):
    return db.query(models.Item).all()

# 2. Add schema in schemas.py
class ItemOut(BaseModel):
    id: UUID
    name: str

# 3. Add model in models.py (if needed)
class Item(Base):
    __tablename__ = "items"
    id = Column(UUID, primary_key=True)
    name = Column(String, nullable=False)
```

### Debugging

```python
import logging

logger = logging.getLogger(__name__)
logger.debug(f"Debug info: {variable}")
logger.error(f"Error occurred: {error}")
```

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Commit: `git commit -m 'Add feature'`
3. Push: `git push origin feature/your-feature`  
4. Open Pull Request

---

## 📄 License

MIT License - See [LICENSE](../LICENSE)

---

**Last Updated**: March 2026 | **Maintainers**: Your Team
