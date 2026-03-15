import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { login as loginApi, normalizeUser } from '../../api/auth'
import { googleLogin } from '../../api/oauth'

function Login({ ctx }) {
    const [form, setForm] = useState({ email: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [loadingGoogle, setLoadingGoogle] = useState(false)

    // Khi người dùng vào trang đăng nhập, luôn reset phiên cũ để tránh tự redirect vào app
    useEffect(() => {
        if (ctx?.setToken) ctx.setToken(null)
        if (ctx?.setUser) ctx.setUser(null)
    }, [])

    const parseJwt = (token) => {
        try {
            const base64Payload = token.split('.')[1]
            const jsonPayload = atob(base64Payload)
            return JSON.parse(jsonPayload)
        } catch (err) {
            return null
        }
    }

    const onSubmit = (e) => {
        e.preventDefault()
        setError('')

        // Kiểm tra các trường hợp đầu vào
        if (!form.email || !form.password) {
            setError('Vui lòng nhập đủ email và mật khẩu.')
            return
        }

        setLoading(true)
        loginApi(form.email, form.password)
            .then((data) => {
                const payload = parseJwt(data.access_token)
                ctx.setToken(data.access_token)
                ctx.setUser(
                    normalizeUser(data.user, form.email) || {
                        id: payload?.sub || 'unknown',
                        name: form.email.split('@')[0] || 'User',
                        email: form.email,
                        role: 'user',
                    },
                )
            })
            .catch((err) => {
                // Thêm thông báo lỗi chi tiết nếu cần
                setError(err.message || 'Đăng nhập thất bại, vui lòng kiểm tra lại email và mật khẩu')
            })
            .finally(() => setLoading(false))
    }

    const onGoogle = async () => {
        setError('')
        setLoadingGoogle(true)
        try {
            const data = await googleLogin()
            if (data?.auth_url) {
                window.location.href = data.auth_url
            } else {
                setError('Không thể lấy link Google. Vui lòng thử lại.')
            }
        } catch (err) {
            setError(err.message || 'Không thể khởi động Google SSO. Vui lòng thử lại sau.')
        } finally {
            setLoadingGoogle(false)
        }
    }

    // Kiểm tra quyền truy cập
    if (ctx?.user?.role === 'user') return <Navigate to="/app" replace />
    if (ctx?.user?.role === 'admin') return <Navigate to="/admin" replace />

    return (
        <div className="auth">
            <div className="auth-card">
                <p className="muted">Đăng nhập an toàn</p>
                <h2>VPN Gaming Portal</h2>
                <p className="muted small">
                    Tuân thủ OWASP: rate-limit giả lập, khóa tạm khi login sai, CSRF token
                    (placeholder), password policy.
                </p>
                <form onSubmit={onSubmit} className="stack">
                    <label className="field">
                        <span>Email</span>
                        <input
                            type="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                        />
                    </label>
                    <label className="field">
                        <span>Mật khẩu</span>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            minLength={8}
                            required
                        />
                        <small className="muted">Tối thiểu 8 ký tự, có chữ hoa/thường/số/ký hiệu.</small>
                    </label>
                    {error && <div className="alert error">{error}</div>}
                    <button className="btn primary" type="submit" disabled={loading}>
                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                    <button className="btn ghost" type="button" onClick={onGoogle} disabled={loadingGoogle}>
                        {loadingGoogle ? 'Đang mở Google...' : 'Đăng nhập với Google'}
                    </button>
                    <div className="row-between small">
                        <Link to="/register" className="muted">
                            Đăng ký
                        </Link>
                        <Link to="/forgot" className="muted">
                            Quên mật khẩu
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default Login
