import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../../api/auth'

function ResetPassword() {
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token') || ''

    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    // Không redirect khi đã login - cho phép reset password ngay cả khi đang login

    useEffect(() => {
        if (!token) {
            setError('Thiếu token đặt lại mật khẩu')
        }
    }, [token])

    const onSubmit = async (e) => {
        e.preventDefault()
        setError('') // Reset error state trước khi bắt đầu xử lý mới

        // Kiểm tra các điều kiện đầu vào
        if (!token) {
            setError('Thiếu token đặt lại mật khẩu')
            return
        }
        if (password !== confirm) {
            setError('Mật khẩu không khớp. Vui lòng nhập lại mật khẩu.')
            return
        }
        if (password.length < 8) {
            setError('Mật khẩu phải có ít nhất 8 ký tự')
            return
        }
        setLoading(true)
        try {
            // Gọi API reset mật khẩu
            await resetPassword(token, password)
            setSuccess('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.')
        } catch (err) {
            setError(err.message || 'Không thể đặt lại mật khẩu, vui lòng thử lại sau')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth">
            <div className="auth-card">
                <p className="muted">Đặt lại mật khẩu</p>
                <h2>Tạo mật khẩu mới</h2>
                <p className="muted small">Nhập mật khẩu mới cho tài khoản của bạn.</p>
                <form onSubmit={onSubmit} className="stack">
                    <label className="field">
                        <span>Mật khẩu mới</span>
                        <div className="password-field">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={8}
                                required
                            />
                            <button
                                type="button"
                                className="toggle-visibility"
                                onClick={() => setShowPassword((prev) => !prev)}
                                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            >
                                {showPassword ? '🙈' : '👁'}
                            </button>
                        </div>
                    </label>
                    <label className="field">
                        <span>Nhập lại mật khẩu</span>
                        <div className="password-field">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                minLength={8}
                                required
                            />
                            <button
                                type="button"
                                className="toggle-visibility"
                                onClick={() => setShowConfirm((prev) => !prev)}
                                aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            >
                                {showConfirm ? '🙈' : '👁'}
                            </button>
                        </div>
                    </label>
                    {error && <div className="alert error">{error}</div>}
                    {success && <div className="alert success">{success}</div>}
                    <button className="btn primary" type="submit" disabled={loading}>
                        {loading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
                    </button>
                    <div className="row-between small">
                        <Link to="/login" className="muted">
                            Quay lại đăng nhập
                        </Link>
                        <Link to="/register" className="muted">
                            Tạo tài khoản mới
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ResetPassword
