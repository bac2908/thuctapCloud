import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../../api/auth'

function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const onSubmit = (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        forgotPassword(email)
            .then(() => setSubmitted(true))
            .catch((err) => setError(err.message || 'Không gửi được yêu cầu'))
            .finally(() => setLoading(false))
    }

    return (
        <div className="auth">
            <div className="auth-card">
                <p className="muted">Khôi phục mật khẩu</p>
                <h2>Gửi link reset</h2>
                <p className="muted small">Chúng tôi sẽ gửi email với liên kết đặt lại mật khẩu.</p>
                <form onSubmit={onSubmit} className="stack">
                    <label className="field">
                        <span>Email</span>
                        <input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </label>
                    {submitted && <div className="alert success">Nếu email tồn tại, link reset đã được gửi.</div>}
                    {error && <div className="alert error">{error}</div>}
                    <button className="btn primary" type="submit" disabled={loading}>
                        {loading ? 'Đang gửi...' : 'Gửi link'}
                    </button>
                    <div className="row-between small">
                        <Link to="/login" className="muted">
                            Quay lại đăng nhập
                        </Link>
                        <Link to="/register" className="muted">
                            Tạo tài khoản
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ForgotPassword
