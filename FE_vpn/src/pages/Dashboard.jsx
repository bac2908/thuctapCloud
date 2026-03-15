import { useEffect, useState } from 'react'
import { listMachines } from '../api/machines'

function Stat({ label, value, hint, icon }) {
    return (
        <div className="card stat">
            <div className="stat-header">
                {icon && <span className="stat-icon">{icon}</span>}
                <p className="muted">{label}</p>
            </div>
            <h3>{value}</h3>
            {hint && <span className="pill ghost">{hint}</span>}
        </div>
    )
}

function Dashboard({ ctx }) {
    const [machines, setMachines] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        async function load() {
            try {
                const data = await listMachines({ page: 1, page_size: 50 })
                if (!cancelled) setMachines(data.items || [])
            } catch (err) {
                console.error('Load machines failed', err)
                if (!cancelled) setMachines([])
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [])

    const display = machines
    const idle = display.filter((m) => (m.status || '').toLowerCase() === 'idle')
    const topPicks = idle.length ? idle : display
    const topThree = topPicks
        .slice()
        .sort((a, b) => (a.ping_ms ?? a.ping ?? 9999) - (b.ping_ms ?? b.ping ?? 9999))
        .slice(0, 3)

    const formatBalance = (amount) => {
        return new Intl.NumberFormat('vi-VN').format(amount || 0) + 'đ'
    }

    return (
        <div className="dashboard">
            {/* Welcome Section */}
            <section className="card welcome-card">
                <div className="welcome-content">
                    <div className="welcome-text">
                        <span className="welcome-badge">🎮 Sẵn sàng</span>
                        <h2>Chào mừng trở lại, {ctx.user?.name || 'Game thủ'}!</h2>
                        <p className="muted">
                            Bạn có thể khởi tạo máy mới hoặc tiếp tục từ snapshot cũ.
                            Hãy đảm bảo bạn còn đủ giờ chơi và chuẩn bị file VPN.
                        </p>
                        <div className="actions">
                            <a className="btn primary" href="/app/wizard">
                                🚀 Khởi tạo phiên mới
                            </a>
                            <a className="btn ghost" href="/app/machines">
                                Xem máy đang trống
                            </a>
                        </div>
                    </div>
                    <div className="welcome-features">
                        <div className="feature-tag">
                            <span className="feature-icon">🔐</span>
                            <span>VPN-first</span>
                        </div>
                        <div className="feature-tag">
                            <span className="feature-icon">💾</span>
                            <span>Snapshot resume</span>
                        </div>
                        <div className="feature-tag">
                            <span className="feature-icon">⚡</span>
                            <span>Low latency</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Grid */}
            <section className="stats-grid">
                <Stat
                    icon="⏱️"
                    label="Giờ còn lại"
                    value={`${ctx.session.remainingMinutes} phút`}
                    hint="Tính phí khi VM sẵn sàng"
                />
                <Stat
                    icon="💰"
                    label="Số dư tài khoản"
                    value={formatBalance(ctx.user?.balance)}
                    hint="Nạp thêm để chơi"
                />
                <Stat
                    icon="🖥️"
                    label="Máy trống"
                    value={`${idle.length}/${display.length || 0}`}
                    hint="Sẵn sàng sử dụng"
                />
            </section>

            {/* Quick Pick Section */}
            <section className="card">
                <div className="section-head">
                    <div>
                        <p className="muted">Máy có ping tốt nhất</p>
                        <h3>Chọn nhanh</h3>
                    </div>
                    <a className="btn ghost" href="/app/machines">
                        Xem tất cả →
                    </a>
                </div>
                <div className="quick-picks">
                    {loading && (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p className="muted">Đang tải danh sách máy...</p>
                        </div>
                    )}
                    {!loading && !topThree.length && (
                        <div className="empty-state">
                            <div className="empty-icon">🖥️</div>
                            <h4>Chưa có máy nào</h4>
                            <p className="muted">Hệ thống đang bảo trì hoặc chưa có máy trống</p>
                        </div>
                    )}
                    {!loading && topThree.map((m) => (
                        <div key={m.id} className="machine-pick-card">
                            <div className="pick-header">
                                <div>
                                    <p className="muted">{m.region || 'N/A'}</p>
                                    <h4>{m.name || m.code}</h4>
                                </div>
                                <span className={`badge ${m.status === 'idle' ? 'success' : 'warning'}`}>
                                    {m.status === 'idle' ? '✓ Trống' : '⏳ Bận'}
                                </span>
                            </div>
                            <div className="pick-specs">
                                <div className="spec-item">
                                    <span className="spec-label">GPU</span>
                                    <span className="spec-value">{m.gpu || 'N/A'}</span>
                                </div>
                                <div className="spec-item">
                                    <span className="spec-label">Ping</span>
                                    <span className="spec-value ping-value">{m.ping_ms ?? m.ping ?? '?'} ms</span>
                                </div>
                            </div>
                            <a
                                className="btn secondary full-width"
                                href={`/app/wizard?machineId=${m.id}`}
                            >
                                Bắt đầu chơi
                            </a>
                        </div>
                    ))}
                </div>
            </section>

            {/* Quick Actions */}
            <section className="quick-actions">
                <div className="action-card" onClick={ctx.openTopup}>
                    <div className="action-icon">💳</div>
                    <div className="action-info">
                        <h4>Nạp tiền</h4>
                        <p className="muted">Thanh toán qua MoMo</p>
                    </div>
                </div>
                <a className="action-card" href="/app/history">
                    <div className="action-icon">📊</div>
                    <div className="action-info">
                        <h4>Lịch sử</h4>
                        <p className="muted">Xem giao dịch & phiên</p>
                    </div>
                </a>
                <a className="action-card" href="/app/support">
                    <div className="action-icon">💬</div>
                    <div className="action-info">
                        <h4>Hỗ trợ</h4>
                        <p className="muted">FAQ & liên hệ</p>
                    </div>
                </a>
            </section>
        </div>
    )
}

export default Dashboard
