import './landing.css'
import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { listMachines } from '../api/machines'

const steps = [
    'Chọn máy với ping thấp',
    'Clone/Resume snapshot',
    'Start VM & kiểm tra',
    'VPN + Sunshine pairing',
    'Stream qua Moonlight',
]

const tiers = [
    { name: 'Casual', price: '$9', hours: '10 giờ', note: 'Chơi thử, ping ưu tiên' },
    { name: 'Pro', price: '$19', hours: '30 giờ', note: 'Resume snapshot, ưu tiên hàng đợi' },
    { name: 'Unlimited', price: '$39', hours: 'Không giới hạn', note: 'Support nhanh, anti-cheat friendly' },
]

function Landing() {
    const [machines, setMachines] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        async function load() {
            try {
                const data = await listMachines({ page: 1, page_size: 12 })
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

    const idle = machines.filter((m) => (m.status || '').toLowerCase() === 'idle')
    const topPicks = idle.length ? idle : machines
    const topThree = topPicks
        .slice()
        .sort((a, b) => (a.ping_ms ?? a.ping ?? 9999) - (b.ping_ms ?? b.ping ?? 9999))
        .slice(0, 3)

    return (
        <div className="landing">
            <header className="landing-nav">
                <div className="brand">VPN Gaming</div>
                <div className="nav-links">
                    <NavLink to="/login">FAQ</NavLink>
                    <NavLink to="/login">Quy trình</NavLink>
                    <NavLink to="/login">Gói</NavLink>
                    <NavLink to="/login">Support</NavLink>
                    <NavLink className="btn ghost" to="/login">
                        Đăng nhập
                    </NavLink>
                </div>
            </header>

            <section className="hero">
                <div className="hero-copy">
                    <p className="pill ghost">VPN-first · Snapshot resume</p>
                    <h1>Ping thấp, vào game nhanh</h1>
                    <p className="muted">
                        Chọn máy gần bạn, resume từ snapshot, kết nối VPN an toàn và stream qua Moonlight trong vài bước.
                    </p>
                    <div className="actions">
                        <NavLink className="btn primary" to="/login">
                            Đăng nhập
                        </NavLink>
                        <NavLink className="btn ghost" to="/login">
                            Đăng ký
                        </NavLink>
                    </div>
                    <div className="hero-badges">
                        <span className="badge">Rate-limit & MFA</span>
                        <span className="badge">Cookie HttpOnly</span>
                        <span className="badge">Encrypt snapshot</span>
                    </div>
                </div>
                <div className="hero-panel">
                    <div className="card highlight">
                        <p className="muted">Máy khả dụng</p>
                        <div className="region-grid">
                            {loading && <p className="muted">Đang tải danh sách máy...</p>}
                            {!loading && !topThree.length && (
                                <div className="region-card">
                                    <p className="muted">Chưa có máy nào từ hệ thống.</p>
                                </div>
                            )}
                            {!loading && topThree.map((m) => (
                                <div key={m.id} className="region-card">
                                    <p className="muted">{m.region || 'N/A'}</p>
                                    <h4>{m.gpu || m.code}</h4>
                                    <div className="row-between">
                                        <span className="pill ghost">{m.ping_ms ?? m.ping ?? '?'} ms</span>
                                        <span className={`badge ${m.status === 'idle' ? 'success' : 'warning'}`}>
                                            {m.status === 'idle' ? 'Máy trống' : 'Đang bận'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="flow" className="section">
                <div className="section-head">
                    <div>
                        <p className="muted">5 bước</p>
                        <h2>Luồng khởi tạo</h2>
                    </div>
                    <NavLink className="btn secondary" to="/login">
                        Xem wizard
                    </NavLink>
                </div>
                <div className="timeline landing-timeline">
                    {steps.map((step, idx) => (
                        <div key={step} className="card border">
                            <span className="pill ghost">Bước {idx + 1}</span>
                            <h4>{step}</h4>
                            <p className="muted">Minimal downtime · rõ trạng thái</p>
                        </div>
                    ))}
                </div>
            </section>

            <section id="plans" className="section">
                <div className="section-head">
                    <div>
                        <p className="muted">Gói giờ</p>
                        <h2>Chọn gói phù hợp</h2>
                    </div>
                    <NavLink className="btn ghost" to="/login">
                        Đăng ký gói
                    </NavLink>
                </div>
                <div className="plan-grid">
                    {tiers.map((tier) => (
                        <div key={tier.name} className="card plan">
                            <p className="muted">{tier.name}</p>
                            <h3>{tier.price}</h3>
                            <p>{tier.hours}</p>
                            <p className="muted small">{tier.note}</p>
                            <NavLink className="btn secondary" to="/login">
                                Bắt đầu
                            </NavLink>
                        </div>
                    ))}
                </div>
            </section>

            <section id="faq" className="section faq">
                <div>
                    <p className="muted">FAQ</p>
                    <h2>Những câu hỏi hay gặp</h2>
                </div>
                <div className="faq-grid">
                    <div className="card border">
                        <h4>Ping thấp nhất ở đâu?</h4>
                        <p className="muted">SG/JP thường &lt;50ms, US ~160ms tuỳ ISP.</p>
                    </div>
                    <div className="card border">
                        <h4>Snapshot lưu bao lâu?</h4>
                        <p className="muted">Giữ phiên gần nhất, xoá cũ theo quota, luôn có golden image.</p>
                    </div>
                    <div className="card border">
                        <h4>Tải file .ovpn thế nào?</h4>
                        <p className="muted">Wizard cung cấp link và QR; cần client OpenVPN/Moonlight.</p>
                    </div>
                    <div className="card border">
                        <h4>An toàn đăng nhập?</h4>
                        <p className="muted">Rate-limit, lockout tạm, MFA, cookie HttpOnly, CSRF token.</p>
                    </div>
                </div>
            </section>

            <footer className="landing-footer">
                <div className="footer-left">
                    <div className="brand">VPN Gaming</div>
                    <p className="muted small">Portal VM/VPN/Streaming · 2026</p>
                </div>
                <div className="footer-links">
                    <NavLink to="/login">Gói</NavLink>
                    <NavLink to="/login">FAQ</NavLink>
                    <NavLink to="/login">Support</NavLink>
                    <NavLink to="/login">Email</NavLink>
                </div>
            </footer>
        </div>
    )
}

export default Landing
