# Quản Lý Cơ Sở Dữ Liệu

Thư mục này chứa schema cơ sở dữ liệu, dữ liệu khởi tạo và các script quản lý.

## 📁 Các Tệp

| Tệp | Mục Đích |
|------|---------|
| **init.sql** | Schema cơ sở dữ liệu hoàn chỉnh + Dữ liệu khởi tạo (tất cả trong 1 file) |
| **database.sh** | Script quản lý cơ sở dữ liệu cho Linux/macOS |
| **database.ps1** | Script quản lý cơ sở dữ liệu cho Windows PowerShell |
| **README.md** | Tệp này |

---

## 🚀 Bắt Đầu Nhanh

**Linux/macOS:**
```bash
psql -U vpn_user -d vpn_app < init.sql
```

**Windows PowerShell:**
```powershell
type init.sql | psql -U vpn_user -d vpn_app
# Hoặc dùng psql trực tiếp
psql -U vpn_user -d vpn_app -f init.sql
```

### Các Hành Động Khác

---

## 📊 Schema Cơ Sở Dữ Liệu

### Bảng Dữ Liệu (11 bảng)

#### Xác Thực & Người Dùng
- **users** - Tài khoản người dùng với email, vai trò, trạng thái
  - Trường: id (UUID), email (CITEXT), display_name, role, status, created_at
  - Chỉ mục: email (UNIQUE), status, created_at
  
- **credentials** - Mã hóa mật khẩu (bcrypt)
  - Trường: id, user_id (FK → users), password_hash, created_at
  - Mỗi người dùng có một thông tin xác thực cho xác thực mật khẩu chính

- **identities** - Tài khoản nhà cung cấp OAuth/OIDC (Google, GitHub, v.v.)
  - Trường: id, user_id (FK → users), provider, subject (token được mã hóa)
  - Hỗ trợ nhiều danh tính trên mỗi người dùng

- **login_challenges** - Token xác thực đa yếu tố
  - Trường: id, user_id (FK → users), token_hash, expires_at, consumed_at, user_agent, ip (INET)
  - Dùng để xác minh email, TOTP hoặc xác minh mã dự phòng

#### Dữ Liệu Người Dùng
- **player_profiles** - Thông tin người dùng mở rộng (được mã hóa)
  - Trường: id, user_id (FK → users, UNIQUE), phone_enc, dob_enc, note_enc
  - Một hồ sơ trên mỗi người dùng; số điện thoại và ngày sinh được mã hóa để bảo vệ quyền riêng tư

#### Cơ Sở Hạ Tầng
- **machines** - Máy chủ VPN hoặc máy chủ ảo chơi game
  - Trường: id, code (UNIQUE), region, location, ping_ms, gpu, status, last_heartbeat
  - 20+ máy chủ trên 7 khu vực (SG, JP, US, KR, HK, AU, VN)
  - Trạng thái: idle, busy, maintenance, offline

#### Phiên & Giao Dịch
- **sessions** - Sử dụng phiên chơi game trên các máy chủ
  - Trường: id, user_id (FK → users), machine_id (FK → machines), start_at, end_at, duration_sec, cost
  - Theo dõi sử dụng phiên và hóa đơn

- **topups** - Nạp tiền số dư người dùng thông qua MoMo hoặc nhà cung cấp khác
  - Trường: id, user_id (FK → users), amount, currency, provider, provider_txn_id, status
  - Trạng thái: pending, succeeded, failed, cancelled

#### Ghi Nhật Ký & Kiểm Toán
- **maintenance_logs** - Các hoạt động bảo trì máy chủ
  - Trường: id, machine_id (FK → machines), action, note, created_at
  - Theo dõi bảo trì máy chủ và hoạt động

- **audit_logs** - Nhật ký kiểm toán toàn bộ hệ thống
  - Trường: id, actor_id (FK → users), action, target, meta (JSONB), created_at
  - JSONB linh hoạt để lưu trữ chi tiết hoạt động

### View (2 cái)
- `active_users` - Người dùng có trạng thái hoạt động và số lượng phiên
- `machine_stats` - Thể hiện sử dụng máy chủ và thống kê phiên

### Tiện Ích Mở Rộng Yêu Cầu
- **citext** - Văn bản không phân biệt chữ hoa/thường cho tính duy nhất email
- **uuid-ossp** - Tạo UUID (hàm gen_random_uuid)

---

## 📝 Ví Dụ Sử Dụng

### Khởi Tạo Cơ Sở Dữ Liệu

```bash
# Linux/macOS
psql -U vpn_user -d vpn_app < init.sql

# Windows PowerShell
psql -U vpn_user -d vpn_app -f init.sql
```

### Sao Lưu Cơ Sở Dữ Liệu

```bash
# Linux/macOS
./database.sh backup
# Đầu ra: backup_20260315_120000.sql.gz

# Windows PowerShell
.\database.ps1 -Action backup
# Đầu ra: backup_20260315_120000.sql hoặc .gz
```

### Khôi Phục từ Sao Lưu

```bash
# Linux/macOS
./database.sh restore backup_20260315_120000.sql.gz

# Windows PowerShell
.\database.ps1 -Action restore -File "backup_20260315_120000.sql"
```

### Sử Dụng Kết Nối Cơ Sở Dữ Liệu Khác

```bash
# Linux/macOS
DB_HOST=remote.server.com \
DB_USER=admin \
DB_PASSWORD=secret \
./database.sh init

# Windows PowerShell
.\database.ps1 -Action init `
  -DbHost "remote.server.com" `
  -DbUser "admin" `
  -DbPassword "secret"
```

### Hiển Thị Thống Kê Cơ Sở Dữ Liệu

```bash
# Linux/macOS
./database.sh stats

# Windows PowerShell
.\database.ps1 -Action stats
```

---

## 🔐 Lưu Ý Bảo Mật

1. **Thông tin xác thực cơ sở dữ liệu** (Người dùng PostgreSQL)
   - Người dùng: `vpn_user`
   - Mật khẩu: `Bn2908#2004`
   - Cơ sở dữ liệu: `vpn_app`
   - ⚠️ Thay đổi trên môi trường sản xuất!

2. **Tài khoản ứng dụng demo**
   - **Admin**: admin@example.com / Bn2908#2004
   - **Người dùng Demo**: demo@example.com / demo123456
   - Thay đổi mật khẩu sau khi triển khai vào sản xuất!

3. **Bảo mật sao lưu**
   - Sao lưu chứa dữ liệu nhạy cảm
   - Lưu trữ ở nơi an toàn
   - Mã hóa sao lưu để lưu trữ từ xa

4. **Mã hóa trong quá trình vận chuyển**
   - Bảng identities lưu trữ token được mã hóa (bytea)
   - Hồ sơ người chơi được mã hóa (điện thoại, DOB)
   - Sử dụng SSL/TLS cho tất cả kết nối cơ sở dữ liệu trong sản xuất

---

## 🐳 Tích Hợp Docker

Nếu chạy với Docker Compose:

```bash
# Khởi tạo schema trực tiếp (từ máy chủ)
PGPASSWORD=Bn2908#2004 psql -h localhost -U vpn_user -d vpn_app < schema.sql

# Hoặc thực thi trong container
docker-compose exec database psql -U vpn_user -d vpn_app < schema.sql

# Hoặc trong vỏ container
docker-compose exec database bash
psql -U vpn_user -d vpn_app < /path/to/schema.sql
```

---

## 📚 Thông Tin Kết Nối Cơ Sở Dữ Liệu

**Định Dạng Chuỗi Kết Nối (PostgreSQL):**
```
postgresql://vpn_user:Bn2908%232004@localhost:5432/vpn_app
```

**Tham Số Kết Nối:**
| Tham Số | Giá Trị | Ghi Chú |
|---------|--------|--------|
| Host | localhost | Thay đổi cho CSDL từ xa |
| Port | 5432 | Cổng PostgreSQL tiêu chuẩn |
| User | vpn_user | Người dùng ứng dụng tiêu chuẩn |
| Password | Bn2908#2004 | ⚠️ Thay đổi trên sản xuất |
| Database | vpn_app | Tên mặc định |
| SSL | Bắt buộc (prod) | Sử dụng `sslmode=require` trên sản xuất |

**Ví dụ sqlalchemy.database_url FastAPI:**
```
postgresql://vpn_user:Bn2908%232004@localhost:5432/vpn_app
```

---

## 🔧 Khắc Phục Sự Cố

### Kết Nối Bị Từ Chối

```bash
# Kiểm tra PostgreSQL đang chạy
psql --version  # Xác minh client được cài đặt

# Kiểm tra kết nối
psql -h localhost -U vpn_user -d postgres -c "SELECT 1"
# Nếu thất bại: PostgreSQL không chạy hoặc thông tin xác thực sai
```

### Quyền Bị Từ Chối

```bash
# Script không thể thực thi (Linux/macOS)
chmod +x database.sh

# Chính sách thực thi PowerShell (Windows)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Tệp Sao Lưu Quá Lớn

```bash
# Nén trợ giúp (Linux/macOS)
# Script tự động nén nếu có gzip
ls -lh backup_*.sql.gz  # Kiểm tra kích thước nén

# Windows: Sử dụng 7-Zip hoặc tương tự
# Script tự động nén nếu có 7z
```

### Khôi Phục Thất Bại

```bash
# Kiểm tra tệp tồn tại và có thể đọc được
file backup_20260315_120000.sql

# Kiểm tra kết nối cơ sở dữ liệu trước
psql -h localhost -U vpn_user -d vpn_app -c "SELECT 1"

# Kiểm tra tệp sao lưu là SQL hợp lệ
head -20 backup_20260315_120000.sql
```

---

## 📖 Tài Nguyên Bổ Sung

- [Tài Liệu PostgreSQL](https://www.postgresql.org/docs/)
- [Hướng Dẫn pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [Hướng Dẫn psql](https://www.postgresql.org/docs/current/app-psql.html)
- [SQLAlchemy ORM](https://docs.sqlalchemy.org/)

---

## ✅ Danh Sách Kiểm Tra Thiết Lập

- [ ] PostgreSQL 15+ đã cài đặt và chạy
- [ ] Cơ sở dữ liệu `vpn_app` đã tạo (hoặc tạo qua script)
- [ ] Người dùng `vpn_user` đã tạo với quyền
- [ ] Thực thi: `psql -U vpn_user -d vpn_app < init.sql`
- [ ] Kiểm tra kết nối: `psql -h localhost -U vpn_user -d vpn_app -c "\dt"`
- [ ] Xác minh các bảng được tạo: `\dt` hiển thị tất cả 11 bảng + dữ liệu demo

---

**Cập Nhật Lần Cuối**: Tháng 3 năm 2026 | **Phiên Bản**: 1.0.0
