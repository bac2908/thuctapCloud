# Frontend - VPN Gaming Platform

**React + Vite Single Page Application (SPA)**

Ứng dụng web frontend xây dựng bằng React 19, Vite, cung cấp giao diện người dùng hoàn chỉnh cho quản lý VPN sessions, máy ảo, lịch sử và thanh toán.

---

## 📋 Tính năng

### Xác thực & Phân quyền
- ✅ Đăng ký & Đăng nhập
- ✅ Google OAuth (SSO)  
- ✅ Quên mật khẩu / Đặt lại mật khẩu
- ✅ JWT-based session management
- ✅ Role-based access control (User, Admin)

### Giao diện Người dùng
- ✅ **Dashboard**: Tổng quát, giờ sử dụng, máy trống
- ✅ **Machines**: Danh sách máy, trạng thái, ping, snapshot
- ✅ **Wizard**: 5-bước tạo phiên (Chọn máy → Clone → Start → VPN → Media)
- ✅ **History**: Lịch sử phiên, restore, tiếp tục phiên
- ✅ **Support**: Logs & checklist hỗ trợ kỹ thuật
- ✅ **Admin Panel**: Quản lý người dùng, máy, giao dịch

### Tích hợp Backend
- REST API client (Axios)
- Real-time status updates  
- File download (.ovpn config)
- Payment processing (MoMo)

---

## 🛠️ Tech Stack

| Thành phần | Công nghệ | Phiên bản |
|-----------|----------|----------|
| **Framework** | React | 19.2.0 |
| **Build Tool** | Vite | 7.2.5 |
| **Routing** | React Router DOM | 7.12.0 |
| **Charts** | Recharts | 3.7.0 |
| **HTTP Client** | Axios | 1.13.2 |
| **Node.js** | Node.js | 18+ |

---

## 📁 Cấu trúc Dự án

```
FE_vpn/
├── public/                          # Static assets
├── src/
│   ├── api/                         # API client functions
│   │   ├── auth.js                  # Authentication endpoints
│   │   ├── machines.js              # Machine management
│   │   ├── payments.js              # Payment endpoints
│   │   ├── admin.js                 # Admin endpoints
│   │   ├── client.js                # Axios instance
│   │   └── oauth.js                 # OAuth utilities
│   │
│   ├── components/                  # Reusable components
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Card.jsx
│   │   ├── Button.jsx
│   │   └── ...
│   │
│   ├── pages/                       # Route pages
│   │   ├── Dashboard.jsx
│   │   ├── Machines.jsx
│   │   ├── Wizard.jsx
│   │   ├── History.jsx
│   │   ├── Support.jsx
│   │   ├── Admin.jsx
│   │   ├── Landing.jsx
│   │   └── auth/
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── ForgotPassword.jsx
│   │       ├── ResetPassword.jsx
│   │       └── AdminLogin.jsx
│   │
│   ├── data/
│   │   ├── mock.js                  # Mock data
│   │   └── constants.js             # Constants
│   │
│   ├── App.jsx                      # Main app component
│   ├── main.jsx                     # React entry point
│   ├── index.css                    # Global styles
│   └── App.css                      # App styles
│
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile
├── nginx.conf
├── vite.config.js
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Cài đặt

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env.development

# 3. Update VITE_API_BASE_URL if needed
# By default: http://localhost:8080
```

### Chạy Development Server

```bash
npm run dev

# Visit: http://localhost:5173
```

### Build cho Production

```bash
npm run build

# Output: ./dist/
```

### Preview Production Build

```bash
npm run preview
```

---

## 📝 Environment Variables

### Development (.env.development)

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_APP_NAME=VPN Gaming Platform
VITE_API_TIMEOUT=30000
VITE_DEBUG=true
VITE_MOCK_API=false
```

### Production (.env.production)

```env
VITE_API_BASE_URL=
VITE_APP_NAME=VPN Gaming Platform
VITE_API_TIMEOUT=30000
VITE_DEBUG=false
VITE_MOCK_API=false
```

---

## 🔌 API Integration

### Cấu hình API Client

Tất cả API requests đi qua `src/api/client.js` sử dụng Axios:

```javascript
// src/api/client.js
import axios from 'axios'

const client = axios.create({
  baseURL: process.env.VITE_API_BASE_URL || 'http://localhost:8080',
  timeout: 30000,
})

// Auto-inject JWT token
client.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default client
```

### Sử dụng API trong Components

```javascript
import { useEffect, useState } from 'react'
import { getMachines } from '../api/machines'

export default function Machines() {
  const [machines, setMachines] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMachines()
      .then(setMachines)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <div>
      {machines.map(m => (
        <div key={m.id}>{m.name}</div>
      ))}
    </div>
  )
}
```

---

## 🐳 Docker Deployment

### Build Image

```bash
docker build -t vpn-gaming-frontend:latest .
```

### Run Container

```bash
docker run -p 80:80 -d \
  --name vpn-frontend \
  vpn-gaming-frontend:latest
```

### Multi-stage Dockerfile

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🎨 UI Design System

### Color Palette
- **Primary**: #F45D48 (Orange-Red)
- **Secondary**: #00B8D9 (Cyan)  
- **Dark**: #1F2937 (Charcoal)
- **Light**: #F3F4F6 (Light Gray)
- **Success**: #10B981 (Green)
- **Error**: #EF4444 (Red)

### Typography
- **Font Family**: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- **Base Size**: 16px
- **Line Height**: 1.5

### Components
- **Border Radius**: 16px (cards), 8px (buttons), 4px (inputs)
- **Spacing**: 8px grid system
- **Shadows**: Based on elevation levels

---

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Vite) |
| `npm start` | Alias for `dev` |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## 🐛 Troubleshooting

### Vite caching issues

```bash
rm -rf node_modules/.vite
npm install
```

### API connection failed

```bash
# Check backend is running
curl http://localhost:8080/health

# Check VITE_API_BASE_URL
echo $VITE_API_BASE_URL

# Check CORS headers
curl -H "Origin: http://localhost:5173" http://localhost:8080/health -v
```

### Build errors

```bash
npm run lint
npm run build -- --debug
```

---

## 📚 Resources

- [React Docs](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [React Router](https://reactrouter.com)
- [Axios Docs](https://axios-http.com)

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
