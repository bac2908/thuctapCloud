import { BrowserRouter, Navigate, Route, Routes, NavLink } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import Dashboard from './pages/Dashboard'
import Machines from './pages/Machines'
import Wizard from './pages/Wizard'
import History from './pages/History'
import Support from './pages/Support'
import Landing from './pages/Landing'
import Admin from './pages/Admin'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import AdminLogin from './pages/auth/AdminLogin'
import mock from './utils/mock'
import { createMomoPayment, getBalance } from './api/payments'
import { fetchMe, logout as logoutApi, normalizeUser } from './api/auth'

function parseJwt(token) {
  try {
    const base64Payload = token.split('.')[1]
    const jsonPayload = atob(base64Payload)
    return JSON.parse(jsonPayload)
  } catch (err) {
    console.warn('Không thể parse JWT', err)
    return null
  }
}

function userFromToken(token, fallbackEmail) {
  const payload = parseJwt(token)
  if (!payload?.sub) return null
  return {
    id: payload.sub,
    email: fallbackEmail || 'unknown@example.com',
    name: fallbackEmail?.split('@')[0] || 'User',
    role: 'user',
  }
}

function App() {
  const storedToken = localStorage.getItem('auth_token')
  const storedEmail = localStorage.getItem('auth_email')
  const storedUserRaw = localStorage.getItem('auth_user')
  const storedUser = storedUserRaw ? (() => {
    try {
      const parsed = JSON.parse(storedUserRaw)
      return normalizeUser(parsed, storedEmail) || parsed
    } catch (err) {
      console.warn('Không parse được user cache', err)
      return null
    }
  })() : null

  const [token, setToken] = useState(storedToken)
  const [user, setUser] = useState(storedUser || (storedToken ? userFromToken(storedToken, storedEmail) : null))
  const [session, setSession] = useState(mock.session)
  const [topupOpen, setTopupOpen] = useState(false)
  const [topupAmount, setTopupAmount] = useState(50000)
  const [topupDesc, setTopupDesc] = useState('')
  const [topupError, setTopupError] = useState('')
  const [topupLoading, setTopupLoading] = useState(false)

  useEffect(() => {
    if (token) {
      localStorage.setItem('auth_token', token)
      if (user?.email) localStorage.setItem('auth_email', user.email)
      if (user) localStorage.setItem('auth_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_email')
      localStorage.removeItem('auth_user')
    }
  }, [token, user])

  const handleTopupSubmit = async (event) => {
    event.preventDefault()
    setTopupError('')
    const amountNum = Number(topupAmount)
    if (!Number.isFinite(amountNum) || amountNum < 10000) {
      setTopupError('Số tiền phải từ 10.000đ trở lên')
      return
    }
    try {
      setTopupLoading(true)
      const res = await createMomoPayment({ amount: amountNum, description: topupDesc }, token)
      window.location.href = res.pay_url
    } catch (err) {
      setTopupError(err.message || 'Không tạo được giao dịch MoMo')
    } finally {
      setTopupLoading(false)
    }
  }

  const handleLogout = useCallback(async () => {
    const confirmed = window.confirm('Bạn chắc chắn muốn đăng xuất không?')
    if (!confirmed) return
    if (token) {
      try {
        await logoutApi(token)
      } catch (err) {
        console.warn('Logout failed', err)
      }
    }
    setToken(null)
    setUser(null)
    setSession(mock.session)
    window.location.href = '/login'
  }, [token, setToken, setUser, setSession])

  useEffect(() => {
    if (!token || user?.id) return
    fetchMe(token)
      .then((data) => {
        const normalized = normalizeUser(data, storedEmail)
        if (normalized) setUser(normalized)
      })
      .catch((err) => {
        console.warn('Fetch me failed', err)
        setToken(null)
        setUser(null)
      })
  }, [token, user, storedEmail, setUser, setToken])

  // Refresh balance when needed
  const refreshBalance = useCallback(async () => {
    if (!token) return
    try {
      const data = await getBalance(token)
      if (data?.balance !== undefined && user) {
        setUser({ ...user, balance: data.balance })
      }
    } catch (err) {
      console.warn('Refresh balance failed', err)
    }
  }, [token, user, setUser])

  const context = useMemo(
    () => ({
      user,
      session,
      token,
      setUser,
      setSession,
      setToken,
      openTopup: () => {
        setTopupError('')
        setTopupOpen(true)
      },
      logout: handleLogout,
      refreshBalance,
    }),
    [user, session, token, handleLogout, refreshBalance],
  )

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login ctx={context} />} />
          <Route path="/register" element={<Register ctx={context} />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/reset" element={<ResetPassword ctx={context} />} />
          <Route path="/admin/login" element={<AdminLogin ctx={context} />} />
          <Route
            path="/app/*"
            element={
              <Shell ctx={context}>
                <Routes>
                  <Route index element={<Dashboard ctx={context} />} />
                  <Route path="machines" element={<Machines ctx={context} />} />
                  <Route path="wizard" element={<Wizard ctx={context} />} />
                  <Route path="history" element={<History ctx={context} />} />
                  <Route path="support" element={<Support />} />
                  <Route path="*" element={<Navigate to="/app" replace />} />
                </Routes>
              </Shell>
            }
          />
          <Route
            path="/admin/*"
            element={
              <AdminShell ctx={context}>
                <Routes>
                  <Route index element={<Admin ctx={context} />} />
                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Routes>
              </AdminShell>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <TopupModal
        open={topupOpen}
        onClose={() => setTopupOpen(false)}
        amount={topupAmount}
        setAmount={setTopupAmount}
        description={topupDesc}
        setDescription={setTopupDesc}
        error={topupError}
        loading={topupLoading}
        onSubmit={handleTopupSubmit}
      />
    </>
  )
}

function Shell({ ctx, children }) {
  if (!ctx.user?.id || ctx.user?.role !== 'user') return <Navigate to="/login" replace />
  return (
    <div className="app-shell">
      <SideNav session={ctx.session} user={ctx.user} />
      <main className="app-main">
        <TopBar user={ctx.user} onTopup={ctx.openTopup} onLogout={ctx.logout} />
        <div className="app-content">{children}</div>
      </main>
    </div>
  )
}

function AdminShell({ ctx, children }) {
  if (!ctx.user?.id || ctx.user?.role !== 'admin') return <Navigate to="/admin/login" replace />
  return <div className="app-main">{children}</div>
}

function formatBalance(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount || 0) + 'đ'
}

function SideNav({ session, user }) {
  const nav = [
    { label: 'Tổng quan', path: '/app' },
    { label: 'Máy & phiên', path: '/app/machines' },
    { label: 'Khởi tạo phiên', path: '/app/wizard' },
    { label: 'Lịch sử', path: '/app/history' },
    { label: 'Hỗ trợ', path: '/app/support' },
  ]
  return (
    <aside className="sidenav">
      <div className="brand">VPN Gaming</div>
      <div className="minutes">
        <p>Giờ còn lại</p>
        <h3>{session.remainingMinutes} phút</h3>
        <span className="badge">Safe mode</span>
        <div className="balance-display">
          <p className="muted">Số dư tài khoản</p>
          <p className="balance-amount">{formatBalance(user?.balance)}</p>
        </div>
      </div>
      <nav>
        {nav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              ['nav-item', isActive ? 'active' : ''].filter(Boolean).join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

function TopBar({ user, onTopup, onLogout }) {
  const [accountOpen, setAccountOpen] = useState(false)
  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2>Xin chào, {user.name}</h2>
        <p className="muted">Quản lý phiên chơi, máy ảo, VPN & streaming</p>
      </div>
      <div className="topbar-actions">
        <button className="btn ghost">Chính sách bảo mật</button>
        <button className="btn primary" onClick={onTopup}>Nạp tiền</button>
        <div className="account-menu">
          <button className="btn ghost" onClick={() => setAccountOpen((prev) => !prev)}>
            Tài khoản
          </button>
          {accountOpen && (
            <div className="account-dropdown card">
              <div className="account-row">
                <div>
                  <p className="muted">Người dùng</p>
                  <h4>{user.name}</h4>
                </div>
                <span className="pill ghost">{user.role}</span>
              </div>
              <div className="stack">
                <div className="row-between">
                  <span className="muted">Email</span>
                  <span>{user.email}</span>
                </div>
                <div className="row-between">
                  <span className="muted">ID</span>
                  <span>{user.id}</span>
                </div>
              </div>
              <div className="actions">
                <button className="btn ghost" onClick={onLogout}>Đăng xuất</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

const PRESET_AMOUNTS = [
  { value: 20000, label: '20.000đ' },
  { value: 50000, label: '50.000đ' },
  { value: 100000, label: '100.000đ' },
  { value: 200000, label: '200.000đ' },
  { value: 500000, label: '500.000đ' },
  { value: 1000000, label: '1.000.000đ' },
]

function TopupModal({ open, onClose, amount, setAmount, description, setDescription, error, loading, onSubmit }) {
  const [isCustom, setIsCustom] = useState(false)
  const [customAmount, setCustomAmount] = useState('')

  if (!open) return null

  const handlePresetClick = (value) => {
    setIsCustom(false)
    setCustomAmount('')
    setAmount(value)
  }

  const handleCustomClick = () => {
    setIsCustom(true)
    setCustomAmount('')
    setAmount('')
  }

  const handleCustomAmountChange = (e) => {
    const val = e.target.value
    setCustomAmount(val)
    setAmount(val)
  }

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('vi-VN').format(num) + 'đ'
  }

  const displayAmount = amount ? formatCurrency(Number(amount)) : '0đ'

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal topup-modal">
        <div className="modal-header">
          <h3>Nạp tiền</h3>
          <button className="btn ghost" onClick={onClose}>Đóng</button>
        </div>
        <form className="stack" onSubmit={onSubmit}>
          {/* Hiển thị số tiền đã chọn */}
          <div className="topup-display">
            <p className="muted">Số tiền nạp</p>
            <h2 className="topup-amount">{displayAmount}</h2>
          </div>

          {/* Các mức tiền có sẵn */}
          <div className="field">
            <span>Chọn mức tiền</span>
            <div className="amount-presets">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className={`amount-btn ${!isCustom && Number(amount) === preset.value ? 'active' : ''}`}
                  onClick={() => handlePresetClick(preset.value)}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                className={`amount-btn custom ${isCustom ? 'active' : ''}`}
                onClick={handleCustomClick}
              >
                Số khác
              </button>
            </div>
          </div>

          {/* Input nhập số tiền tùy chọn */}
          {isCustom && (
            <label className="field">
              Nhập số tiền (VND)
              <input
                type="number"
                min="10000"
                step="1000"
                value={customAmount}
                onChange={handleCustomAmountChange}
                placeholder="Nhập số tiền bạn muốn nạp"
                autoFocus
              />
              <span className="muted hint">Tối thiểu 10.000đ</span>
            </label>
          )}

          <label className="field">
            Ghi chú (tuỳ chọn)
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ví dụ: nạp tháng 1" />
          </label>

          <div className="card info">
            <p className="muted"><strong>Hướng dẫn nạp tiền MoMo</strong></p>
            <ol className="bullet">
              <li>Chọn mức tiền có sẵn hoặc nhập số tiền khác.</li>
              <li>Bấm "Thanh toán" để mở cổng thanh toán MoMo.</li>
              <li>Quét QR hoặc xác nhận trên ứng dụng MoMo.</li>
              <li>Thanh toán thành công sẽ tự chuyển về hệ thống.</li>
            </ol>
          </div>

          {error ? <div className="alert error">{error}</div> : null}

          <div className="actions row-between">
            <div className="muted">Thanh toán qua MoMo</div>
            <div className="actions">
              <button type="button" className="btn ghost" onClick={onClose} disabled={loading}>Hủy</button>
              <button
                type="submit"
                className="btn primary"
                disabled={loading || !amount || Number(amount) < 10000}
              >
                {loading ? 'Đang xử lý...' : `Thanh toán ${displayAmount}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default App
