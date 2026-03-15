import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getMachine } from '../api/machines'

const steps = [
    {
        title: 'Chọn máy',
        desc: 'Chọn máy trống với ping tốt nhất.',
    },
    {
        title: 'Resume hoặc clone',
        desc: 'Kiểm tra snapshot gần nhất; nếu không có sẽ clone golden image.',
    },
    {
        title: 'Start VM',
        desc: 'qm start <vmid>, hiển thị loading.',
    },
    {
        title: 'VPN & Sunshine',
        desc: 'Cung cấp file .ovpn, kiểm tra online, ghép pin Sunshine.',
    },
    {
        title: 'Stream qua Moonlight',
        desc: 'Hiển thị IP local và hướng dẫn connect.',
    },
]

function Wizard({ ctx }) {
    const location = useLocation()
    const navigate = useNavigate()
    const [machine, setMachine] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [session, setSession] = useState(null)

    const params = useMemo(() => new URLSearchParams(location.search), [location.search])
    const machineId = params.get('machineId')
    const sessionId = params.get('sessionId')

    useEffect(() => {
        let cancelled = false
        async function load() {
            setError('')
            setLoading(true)
            try {
                let sessionData = session
                if (!sessionData) {
                    const raw = localStorage.getItem('active_session')
                    sessionData = raw ? JSON.parse(raw) : null
                    if (!cancelled) setSession(sessionData)
                }

                const resolvedMachineId = machineId || sessionData?.machine_id
                if (resolvedMachineId) {
                    const data = await getMachine(resolvedMachineId, ctx?.token)
                    if (!cancelled) setMachine(data.machine)
                } else if (!cancelled) {
                    setError('Chưa chọn máy. Vui lòng quay lại trang Máy & phiên.')
                }
            } catch (err) {
                if (!cancelled) setError(err.message || 'Không tải được thông tin máy')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [machineId, sessionId, ctx?.token, session])

    return (
        <div className="stack">
            <div className="section-head">
                <div>
                    <p className="muted">Luồng khởi tạo</p>
                    <h2>Wizard chuẩn hoá</h2>
                </div>
                <div className="actions">
                    <button className="btn ghost" onClick={() => navigate('/app/machines')}>Chọn máy khác</button>
                    <button className="btn primary" onClick={() => navigate('/app/machines')}>Quay lại máy</button>
                </div>
            </div>

            <div className="card">
                <div className="section-head">
                    <div>
                        <p className="muted">Phiên đang chơi</p>
                        <h3>{machine ? `${machine.region || 'N/A'} · ${machine.code}` : 'Chưa chọn máy'}</h3>
                    </div>
                    {machine && (
                        <span className={`badge ${machine.status === 'idle' ? 'success' : 'warning'}`}>
                            {machine.status === 'idle' ? 'Trống' : 'Đang bận'}
                        </span>
                    )}
                </div>
                {loading && <p className="muted">Đang tải thông tin máy...</p>}
                {!loading && error && <div className="alert error">{error}</div>}
                {!loading && !error && machine && (
                    <div className="grid grid-3">
                        <div>
                            <p className="muted">GPU</p>
                            <h4>{machine.gpu || 'N/A'}</h4>
                        </div>
                        <div>
                            <p className="muted">Ping</p>
                            <h4>{machine.ping_ms ?? '?'} ms</h4>
                        </div>
                        <div>
                            <p className="muted">Session</p>
                            <h4>{session?.id ? session.id.slice(0, 8) : 'N/A'}</h4>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-5 timeline">
                {steps.map((step, idx) => (
                    <div key={step.title} className="card border">
                        <span className="pill ghost">Bước {idx + 1}</span>
                        <h4>{step.title}</h4>
                        <p className="muted">{step.desc}</p>
                    </div>
                ))}
            </div>

            <div className="card">
                <h4>Checklist vận hành</h4>
                <ul className="bullet">
                    <li>Verify còn giờ chơi trước khi khởi tạo.</li>
                    <li>Nếu có snapshot: resume; nếu không: clone từ golden image.</li>
                    <li>Hiển thị progress rõ: Clone/Resume → Start VM → VPN file → Kiểm tra online → Sunshine pin → Moonlight connect.</li>
                    <li>Khi user bấm dừng: dừng đếm giờ, stop VM, convert disk lưu snapshot.</li>
                    <li>Hiển thị log tóm tắt: VMID, IP local, ping, thời gian khởi tạo.</li>
                </ul>
            </div>

            <div className="grid grid-2">
                <div className="card">
                    <h4>VPN & kết nối</h4>
                    <ol className="bullet">
                        <li>Tải file .ovpn (link/QR).</li>
                        <li>Kết nối VPN, nhấn “Đã kết nối” để re-check.</li>
                        <li>Hiển thị IP local máy sau khi online.</li>
                        <li>Ghép pin Sunshine lần đầu, lưu pairing.</li>
                    </ol>
                    <div className="actions">
                        <button className="btn secondary">Tải file .ovpn</button>
                        <button className="btn ghost">Hướng dẫn chi tiết</button>
                    </div>
                </div>
                <div className="card">
                    <h4>Kiểm tra trạng thái</h4>
                    <div className="status-list">
                        <div className="status">
                            <span className="dot success" /> VM đã start
                        </div>
                        <div className="status">
                            <span className="dot warning" /> VPN chưa online
                        </div>
                        <div className="status">
                            <span className="dot muted" /> Sunshine chưa ghép pin
                        </div>
                    </div>
                    <div className="actions">
                        <button className="btn primary">Mở Moonlight</button>
                        <button className="btn ghost">Xem hướng dẫn chơi</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Wizard
