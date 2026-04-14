import { useEffect, useState } from 'react'
import { getTopupHistory } from '../api/payments'

const TOPUP_PAGE_SIZE = 10

function History({ ctx }) {
    const [activeTab, setActiveTab] = useState('sessions')
    const [topupHistory, setTopupHistory] = useState([])
    const [topupLoading, setTopupLoading] = useState(false)
    const [topupError, setTopupError] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [topupTotal, setTopupTotal] = useState(0)
    const [statusFilter, setStatusFilter] = useState('')

    useEffect(() => {
        if (activeTab !== 'topup') return
        let cancelled = false

        async function load() {
            setTopupLoading(true)
            setTopupError('')
            try {
                const data = await getTopupHistory(
                    { page, pageSize: TOPUP_PAGE_SIZE, status: statusFilter || undefined },
                    ctx?.token
                )
                if (!cancelled) {
                    setTopupHistory(data.items || [])
                    const totalItems = data.total || 0
                    const size = data.page_size || TOPUP_PAGE_SIZE
                    setTopupTotal(totalItems)
                    setTotalPages(Math.max(1, Math.ceil(totalItems / size)))
                }
            } catch (err) {
                if (!cancelled) {
                    setTopupError(err.message || 'Không tải được lịch sử nạp tiền')
                }
            } finally {
                if (!cancelled) setTopupLoading(false)
            }
        }

        load()
        return () => { cancelled = true }
    }, [activeTab, page, statusFilter, ctx?.token])

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN').format(amount || 0) + 'đ'
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A'
        return new Date(dateStr).toLocaleString('vi-VN')
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'succeeded':
            case 'completed':
                return <span className="badge success">Thành công</span>
            case 'pending':
                return <span className="badge warning">Đang xử lý</span>
            case 'failed':
                return <span className="badge error">Thất bại</span>
            default:
                return <span className="badge">{status}</span>
        }
    }

    return (
        <div className="stack">
            <div className="section-head">
                <div>
                    <p className="muted">Các hoạt động gần đây</p>
                    <h2>Lịch sử</h2>
                </div>
                <div className="actions">
                    <button className="btn ghost">Xuất báo cáo</button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="tab-nav">
                <button
                    className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sessions')}
                >
                    <span className="tab-icon">🎮</span>
                    Phiên chơi
                </button>
                <button
                    className={`tab-btn ${activeTab === 'topup' ? 'active' : ''}`}
                    onClick={() => setActiveTab('topup')}
                >
                    <span className="tab-icon">💰</span>
                    Nạp tiền
                </button>
            </div>

            {/* Session History */}
            {activeTab === 'sessions' && (
                <div className="history-content">
                    <div className="empty-state">
                        <div className="empty-icon">🎮</div>
                        <h3>Chưa có phiên chơi nào</h3>
                        <p className="muted">Bắt đầu phiên chơi đầu tiên để xem lịch sử tại đây</p>
                        <a className="btn primary" href="/app/machines">Bắt đầu ngay</a>
                    </div>
                </div>
            )}

            {/* Topup History */}
            {activeTab === 'topup' && (
                <div className="history-content">
                    {/* Filters */}
                    <div className="history-filters">
                        <label className="field">
                            Trạng thái
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value)
                                    setPage(1)
                                }}
                            >
                                <option value="">Tất cả</option>
                                <option value="succeeded">Thành công</option>
                                <option value="pending">Đang xử lý</option>
                                <option value="failed">Thất bại</option>
                            </select>
                        </label>
                    </div>

                    {topupLoading && (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p className="muted">Đang tải...</p>
                        </div>
                    )}

                    {topupError && <div className="alert error">{topupError}</div>}

                    {!topupLoading && !topupError && topupHistory.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon">💸</div>
                            <h3>Chưa có giao dịch nào</h3>
                            <p className="muted">Nạp tiền để bắt đầu sử dụng dịch vụ</p>
                            <button className="btn primary" onClick={ctx?.openTopup}>Nạp tiền ngay</button>
                        </div>
                    )}

                    {!topupLoading && topupHistory.length > 0 && (
                        <>
                            <div className="history-table">
                                <div className="table-header">
                                    <div className="col-date">Thời gian</div>
                                    <div className="col-amount">Số tiền</div>
                                    <div className="col-status">Trạng thái</div>
                                    <div className="col-desc">Ghi chú</div>
                                </div>
                                {topupHistory.map((tx) => (
                                    <div key={tx.id} className="table-row">
                                        <div className="col-date">{formatDate(tx.created_at)}</div>
                                        <div className="col-amount amount-value">+{formatMoney(tx.amount)}</div>
                                        <div className="col-status">{getStatusBadge(tx.status)}</div>
                                        <div className="col-desc muted">{tx.description || '—'}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            <div className="pagination">
                                <div className="muted">Trang {page}/{totalPages} · {topupTotal} giao dịch</div>
                                <div className="actions">
                                    <button
                                        className="btn ghost"
                                        disabled={page <= 1}
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    >
                                        Trước
                                    </button>
                                    <button
                                        className="btn ghost"
                                        disabled={page >= totalPages}
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    >
                                        Sau
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Info Card */}
            <div className="card info-card">
                <div className="info-header">
                    <span className="info-icon">ℹ️</span>
                    <h4>Chính sách lưu trữ</h4>
                </div>
                <ul className="info-list">
                    <li>Lưu snapshot phiên gần nhất kèm timestamp để resume.</li>
                    <li>Xoá snapshot cũ theo quota; luôn ưu tiên golden image fallback.</li>
                    <li>Log hoạt động tối giản, ẩn thông tin nhạy cảm khỏi UI.</li>
                    <li>Lịch sử giao dịch được lưu trữ vĩnh viễn để tra cứu.</li>
                </ul>
            </div>
        </div>
    )
}

export default History
