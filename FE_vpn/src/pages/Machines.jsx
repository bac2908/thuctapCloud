import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMachine, listMachines, resumeMachine, startMachine } from '../api/machines'

function Machines({ ctx }) {
    const [machines, setMachines] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(12)
    const [total, setTotal] = useState(0)
    const [refreshKey, setRefreshKey] = useState(0)
    const [filters, setFilters] = useState({
        region: '',
        gpu: '',
        maxPing: '',
        sort: 'best',
        status: 'idle',
    })
    const [detailOpen, setDetailOpen] = useState(false)
    const [detailLoading, setDetailLoading] = useState(false)
    const [detailError, setDetailError] = useState('')
    const [detail, setDetail] = useState(null)

    useEffect(() => {
        let cancelled = false

        async function load() {
            try {
                const data = await listMachines({
                    page,
                    page_size: pageSize,
                    region: filters.region,
                    gpu: filters.gpu,
                    status: filters.status || undefined,
                    max_ping: filters.maxPing || undefined,
                    sort: filters.sort,
                })
                if (!cancelled) {
                    setMachines(data.items || [])
                    setTotal(data.total || 0)
                }
            } catch (err) {
                console.error('Load machines failed', err)
                if (!cancelled) {
                    setError(err.message || 'Không tải được danh sách máy')
                    setMachines([])
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [page, pageSize, filters, refreshKey])

    const display = machines
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const token = ctx?.token
    const navigate = useNavigate()

    const handleStart = async (machineId) => {
        try {
            setError('')
            const session = await startMachine(machineId, token)
            localStorage.setItem('active_session', JSON.stringify(session))
            navigate(`/app/wizard?sessionId=${session.id}&machineId=${session.machine_id}`)
            setRefreshKey((v) => v + 1)
        } catch (err) {
            setError(err.message || 'Không thể bắt đầu phiên')
        }
    }

    const handleResume = async (machineId) => {
        try {
            setError('')
            const session = await resumeMachine(machineId, token)
            localStorage.setItem('active_session', JSON.stringify(session))
            navigate(`/app/wizard?sessionId=${session.id}&machineId=${session.machine_id}`)
            setRefreshKey((v) => v + 1)
        } catch (err) {
            setError(err.message || 'Không thể tiếp tục snapshot')
        }
    }

    const handleDetail = async (machineId) => {
        setDetailError('')
        setDetailLoading(true)
        setDetailOpen(true)
        try {
            const data = await getMachine(machineId, token)
            setDetail(data)
        } catch (err) {
            setDetailError(err.message || 'Không tải được chi tiết máy')
        } finally {
            setDetailLoading(false)
        }
    }

    return (
        <div className="stack">
            <div className="section-head">
                <div>
                    <p className="muted">Máy & phiên của bạn</p>
                    <h2>Quản lý máy</h2>
                </div>
                <div className="actions">
                    <a className="btn ghost" href="/app/history">
                        Lịch sử
                    </a>
                    <a className="btn primary" href="/app/wizard">
                        Khởi tạo phiên
                    </a>
                </div>
            </div>

            <div className="card filters">
                <div className="filter-grid">
                    <label className="field">
                        Region
                        <input
                            placeholder="VD: Singapore"
                            value={filters.region}
                            onChange={(e) => {
                                setFilters((prev) => ({ ...prev, region: e.target.value }))
                                setPage(1)
                            }}
                        />
                    </label>
                    <label className="field">
                        GPU
                        <input
                            placeholder="VD: RTX 4080"
                            value={filters.gpu}
                            onChange={(e) => {
                                setFilters((prev) => ({ ...prev, gpu: e.target.value }))
                                setPage(1)
                            }}
                        />
                    </label>
                    <label className="field">
                        Ping tối đa (ms)
                        <input
                            type="number"
                            min="0"
                            placeholder="VD: 50"
                            value={filters.maxPing}
                            onChange={(e) => {
                                setFilters((prev) => ({ ...prev, maxPing: e.target.value }))
                                setPage(1)
                            }}
                        />
                    </label>
                    <label className="field">
                        Sắp xếp
                        <select
                            value={filters.sort}
                            onChange={(e) => {
                                setFilters((prev) => ({ ...prev, sort: e.target.value }))
                                setPage(1)
                            }}
                        >
                            <option value="best">Tốt nhất</option>
                            <option value="ping">Ping thấp</option>
                        </select>
                    </label>
                    <label className="field">
                        Trạng thái
                        <select
                            value={filters.status}
                            onChange={(e) => {
                                setFilters((prev) => ({ ...prev, status: e.target.value }))
                                setPage(1)
                            }}
                        >
                            <option value="idle">Chỉ máy trống</option>
                            <option value="">Tất cả</option>
                        </select>
                    </label>
                    <label className="field">
                        Số máy/trang
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value))
                                setPage(1)
                            }}
                        >
                            <option value={8}>8</option>
                            <option value={12}>12</option>
                            <option value={16}>16</option>
                        </select>
                    </label>
                </div>
            </div>

            <div className="grid grid-3">
                {loading && <p className="muted">Đang tải danh sách máy...</p>}
                {!loading && !display.length && (
                    <div className="card border">
                        <p className="muted">Chưa có máy nào từ hệ thống.</p>
                    </div>
                )}
                {!loading && display.map((m) => (
                    <div key={m.id} className="card border">
                        <div className="row-between">
                            <div>
                                <p className="muted">{m.region || 'N/A'}</p>
                                <h4>{m.name || m.code}</h4>
                            </div>
                            <span className={`badge ${m.status === 'idle' ? 'success' : 'warning'}`}>
                                {m.status === 'idle' ? 'Trống' : 'Đang bận'}
                            </span>
                        </div>
                        <p className="muted">{m.spec || m.gpu || 'Chưa có mô tả'}</p>
                        <div className="row-between">
                            <p className="muted">Ping: {m.ping_ms ?? m.ping ?? '?'} ms</p>
                            <span className="pill ghost">{m.code || m.id}</span>
                        </div>
                        <div className="actions">
                            <button
                                className="btn primary"
                                onClick={() => handleStart(m.id)}
                                disabled={m.status !== 'idle'}
                            >
                                Bắt đầu
                            </button>
                            <button
                                className="btn secondary"
                                onClick={() => handleResume(m.id)}
                                disabled={m.status !== 'idle'}
                            >
                                Tiếp tục snapshot
                            </button>
                            <button className="btn ghost" onClick={() => handleDetail(m.id)}>
                                Xem chi tiết
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {error && <p className="muted">{error}</p>}

            {detailOpen && (
                <div className="modal-backdrop" role="dialog" aria-modal="true">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Chi tiết máy</h3>
                            <button className="btn ghost" onClick={() => setDetailOpen(false)}>Đóng</button>
                        </div>
                        {detailLoading && <p className="muted">Đang tải...</p>}
                        {!detailLoading && detailError && <div className="alert error">{detailError}</div>}
                        {!detailLoading && !detailError && detail?.machine && (
                            <div className="stack">
                                <div className="row-between">
                                    <div>
                                        <p className="muted">Region</p>
                                        <h4>{detail.machine.region || 'N/A'}</h4>
                                    </div>
                                    <span className={`badge ${detail.machine.status === 'idle' ? 'success' : 'warning'}`}>
                                        {detail.machine.status === 'idle' ? 'Trống' : 'Đang bận'}
                                    </span>
                                </div>
                                <div className="row-between">
                                    <span className="muted">GPU</span>
                                    <span>{detail.machine.gpu || 'N/A'}</span>
                                </div>
                                <div className="row-between">
                                    <span className="muted">Ping</span>
                                    <span>{detail.machine.ping_ms ?? '?'} ms</span>
                                </div>
                                <div className="row-between">
                                    <span className="muted">Code</span>
                                    <span>{detail.machine.code}</span>
                                </div>
                                <div className="card info">
                                    <p className="muted"><strong>Phiên gần nhất của bạn</strong></p>
                                    {detail.last_session ? (
                                        <div className="stack">
                                            <div className="row-between">
                                                <span className="muted">Bắt đầu</span>
                                                <span>{detail.last_session.started_at || 'N/A'}</span>
                                            </div>
                                            <div className="row-between">
                                                <span className="muted">Kết thúc</span>
                                                <span>{detail.last_session.ended_at || 'N/A'}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="muted">Chưa có snapshot.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="pagination">
                <div className="muted">
                    Tổng {total} máy · Trang {page}/{totalPages}
                </div>
                <div className="actions">
                    <button className="btn ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                        Trước
                    </button>
                    <button className="btn ghost" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                        Sau
                    </button>
                </div>
            </div>

            <div className="card">
                <h4>Chính sách & bảo mật</h4>
                <ul className="bullet">
                    <li>Form auth có rate-limit giả lập, lockout tạm thời, policy mật khẩu.</li>
                    <li>JWT/refresh dự kiến để HttpOnly; tránh lưu token ở localStorage.</li>
                    <li>CSRF token với các form nhạy cảm (mock sẵn trong auth pages).</li>
                    <li>Chỉ hiển thị thông tin tối thiểu cho user; log kỹ thuật ở trang Hỗ trợ.</li>
                </ul>
            </div>
        </div>
    )
}

export default Machines
