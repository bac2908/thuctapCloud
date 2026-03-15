import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    createMachine,
    listAdminMachines,
    listUsers,
    updateMachine,
    updateUser,
    adminListTopupTransactions,
    getDashboard,
    getMachineStatistics,
    deleteMachine,
    listSessions,
    stopSession,
    getRevenueStatistics,
    adminTopupUser,
} from '../api/admin'
import { logout as logoutApi } from '../api/auth'
import './admin.css'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts'

function Admin({ ctx, onLogout }) {
    const navigate = useNavigate()
    const token = ctx?.token
    const isAdmin = ctx?.user?.role === 'admin'

    // Active tab state
    const [activeTab, setActiveTab] = useState('Overview')

    // Dashboard state
    const [dashboard, setDashboard] = useState(null)
    const [dashboardLoading, setDashboardLoading] = useState(false)

    // Revenue statistics
    const [revenueStats, setRevenueStats] = useState(null)
    const [revenueDateRange, setRevenueDateRange] = useState({ date_from: '', date_to: '' })

    // Machine statistics
    const [machineStats, setMachineStats] = useState(null)

    // Billing state
    const [billingPage, setBillingPage] = useState(1)
    const [billingPageSize, setBillingPageSize] = useState(10)
    const [billingTotal, setBillingTotal] = useState(0)
    const [billingTransactions, setBillingTransactions] = useState([])
    const [billingError, setBillingError] = useState('')
    const [billingLoading, setBillingLoading] = useState(false)
    const [billingFilters, setBillingFilters] = useState({ status: '', provider: '', user_email: '', date_from: '', date_to: '' })

    // User state
    const [userPage, setUserPage] = useState(1)
    const [userPageSize, setUserPageSize] = useState(10)
    const [userTotal, setUserTotal] = useState(0)
    const [users, setUsers] = useState([])
    const [userError, setUserError] = useState('')
    const [userFilters, setUserFilters] = useState({ email: '', role: '', status: '' })

    // Machine state
    const [machinePage, setMachinePage] = useState(1)
    const [machinePageSize, setMachinePageSize] = useState(10)
    const [machineTotal, setMachineTotal] = useState(0)
    const [machines, setMachines] = useState([])
    const [machineError, setMachineError] = useState('')
    const [machineFilters, setMachineFilters] = useState({ region: '', gpu: '', status: '' })
    const [newMachine, setNewMachine] = useState({ code: '', region: '', gpu: '', ping_ms: '', status: 'idle', location: '' })

    // Session state
    const [sessionPage, setSessionPage] = useState(1)
    const [sessionPageSize, setSessionPageSize] = useState(10)
    const [sessionTotal, setSessionTotal] = useState(0)
    const [sessions, setSessions] = useState([])
    const [sessionError, setSessionError] = useState('')
    const [sessionFilters, setSessionFilters] = useState({ status: '' })

    const [selectedTransaction, setSelectedTransaction] = useState(null)
    const dialogRef = useRef()

    const userTotalPages = Math.max(1, Math.ceil(userTotal / userPageSize))
    const machineTotalPages = Math.max(1, Math.ceil(machineTotal / machinePageSize))
    const sessionTotalPages = Math.max(1, Math.ceil(sessionTotal / sessionPageSize))
    const billingTotalPages = Math.max(1, Math.ceil(billingTotal / billingPageSize))

    // Load Dashboard
    const loadDashboard = useCallback(async () => {
        if (!isAdmin) return
        setDashboardLoading(true)
        try {
            const data = await getDashboard(token)
            setDashboard(data)
        } catch (err) {
            console.error('Dashboard error:', err)
        } finally {
            setDashboardLoading(false)
        }
    }, [token, isAdmin])

    // Load Revenue Statistics
    const loadRevenueStats = useCallback(async () => {
        if (!isAdmin) return
        try {
            const data = await getRevenueStatistics(revenueDateRange, token)
            setRevenueStats(data)
        } catch (err) {
            console.error('Revenue stats error:', err)
        }
    }, [token, isAdmin, revenueDateRange])

    // Load Machine Statistics
    const loadMachineStats = useCallback(async () => {
        if (!isAdmin) return
        try {
            const data = await getMachineStatistics(token)
            setMachineStats(data)
        } catch (err) {
            console.error('Machine stats error:', err)
        }
    }, [token, isAdmin])

    // Load Users
    const loadUsers = useCallback(async () => {
        if (!isAdmin) return
        setUserError('')
        try {
            const data = await listUsers(
                { page: userPage, page_size: userPageSize, ...userFilters },
                token
            )
            setUsers(data.items || [])
            setUserTotal(data.total || 0)
        } catch (err) {
            setUserError(err.message || 'Không tải được danh sách user')
        }
    }, [userPage, userPageSize, userFilters, token, isAdmin])

    // Load Machines
    const loadMachines = useCallback(async () => {
        if (!isAdmin) return
        setMachineError('')
        try {
            const data = await listAdminMachines(
                { page: machinePage, page_size: machinePageSize, ...machineFilters },
                token
            )
            setMachines(data.items || [])
            setMachineTotal(data.total || 0)
        } catch (err) {
            setMachineError(err.message || 'Không tải được danh sách máy')
        }
    }, [machinePage, machinePageSize, machineFilters, token, isAdmin])

    // Load Sessions
    const loadSessions = useCallback(async () => {
        if (!isAdmin) return
        setSessionError('')
        try {
            const data = await listSessions(
                { page: sessionPage, page_size: sessionPageSize, status: sessionFilters.status },
                token
            )
            setSessions(data.items || [])
            setSessionTotal(data.total || 0)
        } catch (err) {
            setSessionError(err.message || 'Không tải được danh sách session')
        }
    }, [sessionPage, sessionPageSize, sessionFilters, token, isAdmin])

    // Load Billing
    const loadBilling = useCallback(async () => {
        if (!isAdmin) return
        setBillingLoading(true)
        setBillingError('')
        try {
            const params = {
                page: billingPage,
                page_size: billingPageSize,
                status: billingFilters.status,
                provider: billingFilters.provider,
                date_from: billingFilters.date_from ? new Date(billingFilters.date_from).toISOString() : undefined,
                date_to: billingFilters.date_to ? new Date(billingFilters.date_to).toISOString() : undefined,
            }
            const data = await adminListTopupTransactions(params, token)
            setBillingTransactions(data.items || [])
            setBillingTotal(data.total || 0)
        } catch (err) {
            setBillingError(err.message || 'Không tải được giao dịch')
        } finally {
            setBillingLoading(false)
        }
    }, [billingPage, billingPageSize, billingFilters, token, isAdmin])

    // Effects
    useEffect(() => { loadDashboard() }, [loadDashboard])
    useEffect(() => { loadRevenueStats() }, [loadRevenueStats])
    useEffect(() => { loadMachineStats() }, [loadMachineStats])
    useEffect(() => { loadUsers() }, [loadUsers])
    useEffect(() => { loadMachines() }, [loadMachines])
    useEffect(() => { loadSessions() }, [loadSessions])
    useEffect(() => { loadBilling() }, [loadBilling])

    // Logout handler
    const handleLogout = async () => {
        if (!confirm('Bạn có chắc muốn đăng xuất?')) return
        try {
            await logoutApi(token)
        } catch (err) {
            console.error('Logout error:', err)
        }
        if (onLogout) onLogout()
        navigate('/login')
    }

    // Handlers
    const handleUserUpdate = async (userId, payload) => {
        try {
            setUserError('')
            await updateUser(userId, payload, token)
            loadUsers()
        } catch (err) {
            setUserError(err.message || 'Không cập nhật được user')
        }
    }

    const handleMachineUpdate = async (machineId, payload) => {
        try {
            setMachineError('')
            await updateMachine(machineId, payload, token)
            loadMachines()
            loadMachineStats()
            loadDashboard()
        } catch (err) {
            setMachineError(err.message || 'Không cập nhật được máy')
        }
    }

    const handleDeleteMachine = async (machineId, code) => {
        if (!confirm(`Bạn có chắc muốn xóa máy ${code}?`)) return
        try {
            setMachineError('')
            await deleteMachine(machineId, token)
            loadMachines()
            loadMachineStats()
            loadDashboard()
        } catch (err) {
            setMachineError(err.message || 'Không xóa được máy')
        }
    }

    const handleCreateMachine = async () => {
        try {
            setMachineError('')
            await createMachine(
                {
                    code: newMachine.code,
                    region: newMachine.region || null,
                    gpu: newMachine.gpu || null,
                    ping_ms: newMachine.ping_ms ? Number(newMachine.ping_ms) : null,
                    status: newMachine.status,
                    location: newMachine.location || null,
                },
                token
            )
            setNewMachine({ code: '', region: '', gpu: '', ping_ms: '', status: 'idle', location: '' })
            setMachinePage(1)
            loadMachines()
            loadMachineStats()
            loadDashboard()
        } catch (err) {
            setMachineError(err.message || 'Không tạo được máy')
        }
    }

    const handleStopSession = async (sessionId) => {
        if (!confirm('Bạn có chắc muốn dừng session này?')) return
        try {
            setSessionError('')
            await stopSession(sessionId, token)
            loadSessions()
            loadMachines()
            loadDashboard()
        } catch (err) {
            setSessionError(err.message || 'Không dừng được session')
        }
    }

    // Export CSV
    function exportTransactionsCSV(transactions) {
        if (!transactions || transactions.length === 0) return
        const header = ['User', 'Số tiền', 'Phương thức', 'Trạng thái', 'Thời gian', 'Ghi chú']
        const rows = transactions.map(t => [
            t.user_id,
            t.amount,
            t.provider,
            t.status,
            t.created_at ? new Date(t.created_at).toLocaleString() : '-',
            t.description || '-',
        ])
        const csvContent = [header, ...rows].map(r => r.join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'transactions.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    // Format money
    const formatMoney = (amount) => `${(amount || 0).toLocaleString()}đ`

    // KPIs from dashboard
    const kpis = useMemo(() => {
        if (!dashboard) return []
        return [
            { label: 'Tổng User', value: dashboard.total_users, hint: `${dashboard.active_users} active` },
            { label: 'Tổng Máy', value: dashboard.total_machines, hint: `${dashboard.idle_machines} idle · ${dashboard.busy_machines} busy` },
            { label: 'Sessions Active', value: dashboard.active_sessions, hint: `Tổng: ${dashboard.total_sessions}` },
            { label: 'Doanh thu hôm nay', value: formatMoney(dashboard.today_revenue), hint: `Tháng: ${formatMoney(dashboard.month_revenue)}` },
        ]
    }, [dashboard])

    // Navigation items
    const navItems = ['Overview', 'Users', 'Machines', 'Sessions', 'Billing', 'Settings']

    if (!isAdmin) {
        return (
            <div className="admin-shell">
                <main className="admin-main">
                    <div className="card">
                        <h3>Không có quyền truy cập</h3>
                        <p className="muted">Bạn cần đăng nhập bằng tài khoản admin.</p>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="admin-shell">
            <aside className="admin-sidenav">
                <div className="brand">🎮 VPN Gaming Admin</div>
                <div className="env env-prod">prod</div>
                <nav>
                    {navItems.map((item) => (
                        <span
                            key={item}
                            className={`nav-item ${activeTab === item ? 'active' : ''}`}
                            onClick={() => setActiveTab(item)}
                        >
                            {item === 'Overview' && '📊 '}
                            {item === 'Users' && '👥 '}
                            {item === 'Machines' && '🖥️ '}
                            {item === 'Sessions' && '🎮 '}
                            {item === 'Billing' && '💰 '}
                            {item === 'Settings' && '⚙️ '}
                            {item}
                        </span>
                    ))}
                </nav>
                <div className="sidenav-footer">
                    <button className="btn logout-btn" onClick={handleLogout}>🚪 Đăng xuất</button>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-header">
                    <div>
                        <p className="muted">Bảng điều khiển quản trị</p>
                        <h1>{activeTab}</h1>
                    </div>
                    <div className="actions">
                        <button className="btn ghost" onClick={() => { loadDashboard(); loadMachineStats(); loadRevenueStats() }}>
                            🔄 Làm mới
                        </button>
                        <div className="user-menu">👤 {ctx?.user?.email || 'Admin'}</div>
                    </div>
                </header>

                {/* ===== OVERVIEW TAB ===== */}
                {activeTab === 'Overview' && (
                    <>
                        {dashboardLoading ? (
                            <div className="card"><p>Đang tải...</p></div>
                        ) : (
                            <>
                                <section className="grid grid-4">
                                    {kpis.map((kpi) => (
                                        <div key={kpi.label} className="card border kpi-card">
                                            <p className="muted">{kpi.label}</p>
                                            <h3>{kpi.value}</h3>
                                            {kpi.hint && <span className="pill ghost">{kpi.hint}</span>}
                                        </div>
                                    ))}
                                </section>

                                <section className="grid grid-2">
                                    {/* Revenue Chart */}
                                    <div className="card">
                                        <div className="section-head">
                                            <div>
                                                <p className="muted">Doanh thu</p>
                                                <h3>Biểu đồ doanh thu theo ngày</h3>
                                            </div>
                                            <span className="pill success">Tổng: {formatMoney(dashboard?.total_revenue)}</span>
                                        </div>
                                        <div className="chart-container">
                                            {revenueStats?.daily?.length > 0 ? (
                                                <ResponsiveContainer width="100%" height={250}>
                                                    <LineChart data={revenueStats.daily}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                                        <XAxis dataKey="date" stroke="#888" fontSize={12} />
                                                        <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                                                        <Tooltip
                                                            contentStyle={{ background: '#1a1a2e', border: '1px solid #333' }}
                                                            formatter={(value) => [formatMoney(value), 'Doanh thu']}
                                                        />
                                                        <Line type="monotone" dataKey="amount" stroke="#00C49F" strokeWidth={2} dot={{ fill: '#00C49F' }} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <p className="muted">Chưa có dữ liệu doanh thu</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Machine Status Chart */}
                                    <div className="card">
                                        <div className="section-head">
                                            <div>
                                                <p className="muted">Máy chủ</p>
                                                <h3>Trạng thái máy</h3>
                                            </div>
                                            <span className="pill ghost">Ping TB: {machineStats?.avg_ping || 0}ms</span>
                                        </div>
                                        <div className="chart-container">
                                            {machineStats ? (
                                                <ResponsiveContainer width="100%" height={250}>
                                                    <PieChart>
                                                        <Pie
                                                            data={[
                                                                { name: 'Idle', value: machineStats.idle },
                                                                { name: 'Busy', value: machineStats.busy },
                                                                { name: 'Maintenance', value: machineStats.maintenance },
                                                            ]}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={80}
                                                            dataKey="value"
                                                            label={({ name, value }) => `${name}: ${value}`}
                                                        >
                                                            <Cell fill="#00C49F" />
                                                            <Cell fill="#FF8042" />
                                                            <Cell fill="#FFBB28" />
                                                        </Pie>
                                                        <Tooltip />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <p className="muted">Đang tải...</p>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                {/* Region Stats */}
                                <section className="card">
                                    <div className="section-head">
                                        <div>
                                            <p className="muted">Máy theo khu vực</p>
                                            <h3>Region Statistics</h3>
                                        </div>
                                    </div>
                                    <div className="chart-container">
                                        {machineStats?.by_region?.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={200}>
                                                <BarChart data={machineStats.by_region}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                                    <XAxis dataKey="region" stroke="#888" fontSize={12} />
                                                    <YAxis stroke="#888" fontSize={12} />
                                                    <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333' }} />
                                                    <Bar dataKey="idle" stackId="a" fill="#00C49F" name="Idle" />
                                                    <Bar dataKey="busy" stackId="a" fill="#FF8042" name="Busy" />
                                                    <Legend />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <p className="muted">Chưa có dữ liệu region</p>
                                        )}
                                    </div>
                                </section>

                                {/* Recent Transactions */}
                                <section className="card">
                                    <div className="section-head">
                                        <div>
                                            <p className="muted">Giao dịch gần đây</p>
                                            <h3>Recent Transactions</h3>
                                        </div>
                                        <button className="btn ghost" onClick={() => setActiveTab('Billing')}>Xem tất cả</button>
                                    </div>
                                    <div className="table">
                                        <div className="row head">
                                            <span>User</span>
                                            <span>Số tiền</span>
                                            <span>Trạng thái</span>
                                            <span>Thời gian</span>
                                        </div>
                                        {dashboard?.recent_transactions?.map((t) => (
                                            <div key={t.id} className="row">
                                                <span className="truncate">{t.user_id?.slice(0, 8)}...</span>
                                                <span>{formatMoney(t.amount)}</span>
                                                <span className={`pill ${t.status === 'succeeded' ? 'success' : t.status === 'failed' ? 'error' : 'ghost'}`}>
                                                    {t.status}
                                                </span>
                                                <span>{t.created_at ? new Date(t.created_at).toLocaleString() : '-'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </>
                        )}
                    </>
                )}

                {/* ===== USERS TAB ===== */}
                {activeTab === 'Users' && (
                    <section className="card">
                        <div className="section-head">
                            <div>
                                <p className="muted">Users</p>
                                <h3>Quản lý người dùng</h3>
                            </div>
                            <div className="actions">
                                <input className="input-inline" placeholder="Tìm email" value={userFilters.email} onChange={(e) => { setUserFilters((prev) => ({ ...prev, email: e.target.value })); setUserPage(1) }} />
                                <select className="input-inline" value={userFilters.role} onChange={(e) => { setUserFilters((prev) => ({ ...prev, role: e.target.value })); setUserPage(1) }}>
                                    <option value="">Tất cả role</option>
                                    <option value="user">user</option>
                                    <option value="admin">admin</option>
                                </select>
                                <select className="input-inline" value={userFilters.status} onChange={(e) => { setUserFilters((prev) => ({ ...prev, status: e.target.value })); setUserPage(1) }}>
                                    <option value="">Tất cả trạng thái</option>
                                    <option value="active">active</option>
                                    <option value="pending">pending</option>
                                    <option value="suspended">suspended</option>
                                </select>
                            </div>
                        </div>
                        <div className="table">
                            <div className="row head admin-user-row">
                                <span>Email</span>
                                <span>Tên</span>
                                <span>Số dư</span>
                                <span>Role</span>
                                <span>Trạng thái</span>
                                <span>Hành động</span>
                            </div>
                            {users.map((u) => (
                                <div key={u.id} className="row admin-user-row">
                                    <span className="truncate">{u.email}</span>
                                    <span>{u.display_name || '-'}</span>
                                    <span className="money">{formatMoney(u.balance)}</span>
                                    <span>
                                        <select value={u.role} onChange={(e) => handleUserUpdate(u.id, { role: e.target.value })}>
                                            <option value="user">user</option>
                                            <option value="admin">admin</option>
                                        </select>
                                    </span>
                                    <span>
                                        <select value={u.status} onChange={(e) => handleUserUpdate(u.id, { status: e.target.value })}>
                                            <option value="active">active</option>
                                            <option value="pending">pending</option>
                                            <option value="suspended">suspended</option>
                                        </select>
                                    </span>
                                    <span className="actions">
                                        <button className="btn ghost small" onClick={() => handleUserUpdate(u.id, { status: 'suspended' })}>🔒</button>
                                        <button className="btn ghost small" onClick={() => handleUserUpdate(u.id, { status: 'active' })}>🔓</button>
                                    </span>
                                </div>
                            ))}
                        </div>
                        {userError && <div className="alert error">{userError}</div>}
                        <div className="admin-pagination">
                            <div className="muted">Trang {userPage}/{userTotalPages} · {userTotal} users</div>
                            <div className="actions">
                                <select className="input-inline" value={userPageSize} onChange={(e) => { setUserPageSize(Number(e.target.value)); setUserPage(1) }}>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                                <button className="btn ghost" disabled={userPage <= 1} onClick={() => setUserPage((p) => Math.max(1, p - 1))}>← Trước</button>
                                <button className="btn ghost" disabled={userPage >= userTotalPages} onClick={() => setUserPage((p) => Math.min(userTotalPages, p + 1))}>Sau →</button>
                            </div>
                        </div>
                    </section>
                )}

                {/* ===== MACHINES TAB ===== */}
                {activeTab === 'Machines' && (
                    <>
                        <section className="grid grid-4">
                            <div className="card border kpi-card"><p className="muted">Tổng máy</p><h3>{machineStats?.total || 0}</h3></div>
                            <div className="card border kpi-card"><p className="muted">Idle</p><h3 className="text-success">{machineStats?.idle || 0}</h3></div>
                            <div className="card border kpi-card"><p className="muted">Busy</p><h3 className="text-warning">{machineStats?.busy || 0}</h3></div>
                            <div className="card border kpi-card"><p className="muted">Maintenance</p><h3 className="text-danger">{machineStats?.maintenance || 0}</h3></div>
                        </section>

                        <section className="card">
                            <div className="section-head">
                                <div><p className="muted">Machines</p><h3>Quản lý máy chủ</h3></div>
                                <div className="actions">
                                    <input className="input-inline" placeholder="Region" value={machineFilters.region} onChange={(e) => { setMachineFilters((prev) => ({ ...prev, region: e.target.value })); setMachinePage(1) }} />
                                    <input className="input-inline" placeholder="GPU" value={machineFilters.gpu} onChange={(e) => { setMachineFilters((prev) => ({ ...prev, gpu: e.target.value })); setMachinePage(1) }} />
                                    <select className="input-inline" value={machineFilters.status} onChange={(e) => { setMachineFilters((prev) => ({ ...prev, status: e.target.value })); setMachinePage(1) }}>
                                        <option value="">Tất cả</option>
                                        <option value="idle">idle</option>
                                        <option value="busy">busy</option>
                                        <option value="maintenance">maintenance</option>
                                    </select>
                                </div>
                            </div>

                            <div className="card border admin-create">
                                <h4>➕ Thêm máy mới</h4>
                                <div className="grid grid-6">
                                    <input placeholder="Code *" value={newMachine.code} onChange={(e) => setNewMachine((prev) => ({ ...prev, code: e.target.value }))} />
                                    <input placeholder="Region" value={newMachine.region} onChange={(e) => setNewMachine((prev) => ({ ...prev, region: e.target.value }))} />
                                    <input placeholder="GPU" value={newMachine.gpu} onChange={(e) => setNewMachine((prev) => ({ ...prev, gpu: e.target.value }))} />
                                    <input placeholder="Ping (ms)" type="number" min="0" value={newMachine.ping_ms} onChange={(e) => setNewMachine((prev) => ({ ...prev, ping_ms: e.target.value }))} />
                                    <input placeholder="Location" value={newMachine.location} onChange={(e) => setNewMachine((prev) => ({ ...prev, location: e.target.value }))} />
                                    <button className="btn primary" onClick={handleCreateMachine} disabled={!newMachine.code}>Thêm máy</button>
                                </div>
                            </div>

                            <div className="table">
                                <div className="row head admin-machine-row-full">
                                    <span>Code</span><span>Region</span><span>GPU</span><span>Ping</span><span>Location</span><span>Trạng thái</span><span>Hành động</span>
                                </div>
                                {machines.map((m) => (
                                    <div key={m.id} className="row admin-machine-row-full">
                                        <span className="code">{m.code}</span>
                                        <span>{m.region || '-'}</span>
                                        <span>{m.gpu || '-'}</span>
                                        <span><input type="number" min="0" className="input-small" value={m.ping_ms ?? ''} onChange={(e) => setMachines((prev) => prev.map((row) => row.id === m.id ? { ...row, ping_ms: e.target.value === '' ? '' : Number(e.target.value) } : row))} onBlur={(e) => handleMachineUpdate(m.id, { ping_ms: e.target.value === '' ? null : Number(e.target.value) })} /></span>
                                        <span>{m.location || '-'}</span>
                                        <span><select className={`status-select ${m.status}`} value={m.status} onChange={(e) => handleMachineUpdate(m.id, { status: e.target.value })}><option value="idle">idle</option><option value="busy">busy</option><option value="maintenance">maintenance</option></select></span>
                                        <span className="actions">
                                            <button className="btn ghost small" onClick={() => handleMachineUpdate(m.id, { status: 'idle' })}>Reset</button>
                                            <button className="btn danger small" onClick={() => handleDeleteMachine(m.id, m.code)}>🗑️</button>
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {machineError && <div className="alert error">{machineError}</div>}
                            <div className="admin-pagination">
                                <div className="muted">Trang {machinePage}/{machineTotalPages} · {machineTotal} máy</div>
                                <div className="actions">
                                    <select className="input-inline" value={machinePageSize} onChange={(e) => { setMachinePageSize(Number(e.target.value)); setMachinePage(1) }}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select>
                                    <button className="btn ghost" disabled={machinePage <= 1} onClick={() => setMachinePage((p) => Math.max(1, p - 1))}>← Trước</button>
                                    <button className="btn ghost" disabled={machinePage >= machineTotalPages} onClick={() => setMachinePage((p) => Math.min(machineTotalPages, p + 1))}>Sau →</button>
                                </div>
                            </div>
                        </section>
                    </>
                )}

                {/* ===== SESSIONS TAB ===== */}
                {activeTab === 'Sessions' && (
                    <section className="card">
                        <div className="section-head">
                            <div><p className="muted">Sessions</p><h3>Quản lý phiên kết nối</h3></div>
                            <div className="actions">
                                <select className="input-inline" value={sessionFilters.status} onChange={(e) => { setSessionFilters({ status: e.target.value }); setSessionPage(1) }}>
                                    <option value="">Tất cả</option><option value="active">Active</option><option value="stopped">Stopped</option><option value="ended">Ended</option>
                                </select>
                            </div>
                        </div>
                        <div className="table">
                            <div className="row head admin-session-row">
                                <span>User</span><span>Machine</span><span>Status</span><span>Started</span><span>Ended</span><span>Traffic</span><span>Actions</span>
                            </div>
                            {sessions.map((s) => (
                                <div key={s.id} className="row admin-session-row">
                                    <span className="truncate">{s.user_email || s.user_id?.slice(0, 8) + '...'}</span>
                                    <span className="code">{s.machine_code || '-'}</span>
                                    <span className={`pill ${s.status === 'active' ? 'success' : 'ghost'}`}>{s.status}</span>
                                    <span>{s.started_at ? new Date(s.started_at).toLocaleString() : '-'}</span>
                                    <span>{s.ended_at ? new Date(s.ended_at).toLocaleString() : '-'}</span>
                                    <span>↑{((s.bytes_up || 0) / 1024 / 1024).toFixed(1)}MB ↓{((s.bytes_down || 0) / 1024 / 1024).toFixed(1)}MB</span>
                                    <span>{s.status === 'active' && <button className="btn danger small" onClick={() => handleStopSession(s.id)}>⏹️ Stop</button>}</span>
                                </div>
                            ))}
                        </div>
                        {sessionError && <div className="alert error">{sessionError}</div>}
                        <div className="admin-pagination">
                            <div className="muted">Trang {sessionPage}/{sessionTotalPages} · {sessionTotal} sessions</div>
                            <div className="actions">
                                <select className="input-inline" value={sessionPageSize} onChange={(e) => { setSessionPageSize(Number(e.target.value)); setSessionPage(1) }}><option value={10}>10</option><option value={20}>20</option></select>
                                <button className="btn ghost" disabled={sessionPage <= 1} onClick={() => setSessionPage((p) => Math.max(1, p - 1))}>← Trước</button>
                                <button className="btn ghost" disabled={sessionPage >= sessionTotalPages} onClick={() => setSessionPage((p) => Math.min(sessionTotalPages, p + 1))}>Sau →</button>
                            </div>
                        </div>
                    </section>
                )}

                {/* ===== BILLING TAB ===== */}
                {activeTab === 'Billing' && (
                    <>
                        <section className="grid grid-3">
                            <div className="card border kpi-card"><p className="muted">Tổng doanh thu</p><h3 className="text-success">{formatMoney(revenueStats?.total_revenue)}</h3></div>
                            <div className="card border kpi-card"><p className="muted">GD thành công</p><h3>{revenueStats?.total_success || 0}</h3></div>
                            <div className="card border kpi-card"><p className="muted">GD thất bại</p><h3 className="text-danger">{revenueStats?.total_failed || 0}</h3></div>
                        </section>

                        <section className="card">
                            <div className="section-head">
                                <div><p className="muted">Biểu đồ doanh thu</p><h3>Revenue Chart</h3></div>
                                <div className="actions">
                                    <input type="date" className="input-inline" value={revenueDateRange.date_from} onChange={(e) => setRevenueDateRange(prev => ({ ...prev, date_from: e.target.value }))} />
                                    <input type="date" className="input-inline" value={revenueDateRange.date_to} onChange={(e) => setRevenueDateRange(prev => ({ ...prev, date_to: e.target.value }))} />
                                </div>
                            </div>
                            <div className="chart-container">
                                {revenueStats?.daily?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={revenueStats.daily}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="date" stroke="#888" fontSize={12} />
                                            <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                                            <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333' }} formatter={(value) => [formatMoney(value), 'Doanh thu']} />
                                            <Bar dataKey="amount" fill="#00C49F" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="muted">Chưa có dữ liệu doanh thu</p>
                                )}
                            </div>
                        </section>

                        <section className="card">
                            <div className="section-head">
                                <div><p className="muted">Billing</p><h3>Giao dịch nạp tiền</h3></div>
                                <button className="btn secondary" onClick={() => exportTransactionsCSV(billingTransactions)}>📥 Xuất CSV</button>
                            </div>
                            <div className="actions filter-row">
                                <input className="input-inline" placeholder="Tìm user" value={billingFilters.user_email} onChange={e => setBillingFilters(f => ({ ...f, user_email: e.target.value }))} />
                                <select className="input-inline" value={billingFilters.status} onChange={e => { setBillingFilters(f => ({ ...f, status: e.target.value })); setBillingPage(1) }}>
                                    <option value="">Tất cả trạng thái</option><option value="succeeded">Thành công</option><option value="pending">Chờ xử lý</option><option value="failed">Thất bại</option>
                                </select>
                                <select className="input-inline" value={billingFilters.provider} onChange={e => { setBillingFilters(f => ({ ...f, provider: e.target.value })); setBillingPage(1) }}>
                                    <option value="">Tất cả phương thức</option><option value="momo">MoMo</option><option value="bank">Ngân hàng</option>
                                </select>
                                <input className="input-inline" type="date" value={billingFilters.date_from} onChange={e => setBillingFilters(f => ({ ...f, date_from: e.target.value }))} />
                                <input className="input-inline" type="date" value={billingFilters.date_to} onChange={e => setBillingFilters(f => ({ ...f, date_to: e.target.value }))} />
                            </div>
                            <div className="table">
                                <div className="row head admin-billing-row">
                                    <span>User</span><span>Số tiền</span><span>Số dư trước</span><span>Số dư sau</span><span>Phương thức</span><span>Trạng thái</span><span>Thời gian</span>
                                </div>
                                {billingLoading ? <div className="row"><span>Đang tải...</span></div> : billingTransactions.length === 0 ? <div className="row"><span>Không có giao dịch</span></div> : (
                                    billingTransactions.map(t => (
                                        <div key={t.id} className="row admin-billing-row clickable" onClick={() => { setSelectedTransaction(t); dialogRef.current?.showModal() }}>
                                            <span className="truncate">{t.user_id?.slice(0, 8)}...</span>
                                            <span className="money">{formatMoney(t.amount)}</span>
                                            <span>{formatMoney(t.balance_before)}</span>
                                            <span>{formatMoney(t.balance_after)}</span>
                                            <span className="pill ghost">{t.provider}</span>
                                            <span className={`pill ${t.status === 'succeeded' ? 'success' : t.status === 'failed' ? 'error' : 'warning'}`}>{t.status}</span>
                                            <span>{t.created_at ? new Date(t.created_at).toLocaleString() : '-'}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                            {billingError && <div className="alert error">{billingError}</div>}
                            <div className="admin-pagination">
                                <div className="muted">Trang {billingPage}/{billingTotalPages} · {billingTotal} giao dịch</div>
                                <div className="actions">
                                    <select className="input-inline" value={billingPageSize} onChange={e => { setBillingPageSize(Number(e.target.value)); setBillingPage(1) }}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select>
                                    <button className="btn ghost" disabled={billingPage <= 1} onClick={() => setBillingPage(p => Math.max(1, p - 1))}>← Trước</button>
                                    <button className="btn ghost" disabled={billingPage >= billingTotalPages} onClick={() => setBillingPage(p => Math.min(billingTotalPages, p + 1))}>Sau →</button>
                                </div>
                            </div>
                        </section>
                    </>
                )}

                {/* ===== SETTINGS TAB ===== */}
                {activeTab === 'Settings' && (
                    <section className="card">
                        <div className="section-head">
                            <div><p className="muted">Policies</p><h3>Cấu hình chính sách</h3></div>
                            <button className="btn primary">💾 Lưu cấu hình</button>
                        </div>
                        <div className="policy-grid">
                            <div className="policy-item"><p>🔐 Password policy</p><span className="pill ghost">≥ 8 ký tự, HOA/thường/số</span></div>
                            <div className="policy-item"><p>🔒 Lockout policy</p><span className="pill ghost">Khóa 10 phút sau 5 lần sai</span></div>
                            <div className="policy-item"><p>🛡️ CSRF protection</p><span className="pill success">Bật</span></div>
                            <div className="policy-item"><p>💾 Snapshot retention</p><span className="pill ghost">Giữ 1 bản gần nhất/user</span></div>
                            <div className="policy-item"><p>💰 Nạp tiền tối thiểu</p><span className="pill ghost">10.000đ</span></div>
                            <div className="policy-item"><p>⏱️ Session timeout</p><span className="pill ghost">24 giờ</span></div>
                        </div>
                    </section>
                )}

                {/* Transaction Detail Dialog */}
                <dialog ref={dialogRef} className="admin-dialog" onClose={() => setSelectedTransaction(null)}>
                    {selectedTransaction && (
                        <div className="dialog-content">
                            <h3>📋 Chi tiết giao dịch</h3>
                            <div className="detail-grid">
                                <div className="detail-item"><label>ID:</label><span className="truncate">{selectedTransaction.id}</span></div>
                                <div className="detail-item"><label>User:</label><span className="truncate">{selectedTransaction.user_id}</span></div>
                                <div className="detail-item"><label>Số tiền:</label><span className="money">{formatMoney(selectedTransaction.amount)}</span></div>
                                <div className="detail-item"><label>Số dư trước:</label><span>{formatMoney(selectedTransaction.balance_before)}</span></div>
                                <div className="detail-item"><label>Số dư sau:</label><span>{formatMoney(selectedTransaction.balance_after)}</span></div>
                                <div className="detail-item"><label>Phương thức:</label><span className="pill ghost">{selectedTransaction.provider}</span></div>
                                <div className="detail-item"><label>Trạng thái:</label><span className={`pill ${selectedTransaction.status === 'succeeded' ? 'success' : selectedTransaction.status === 'failed' ? 'error' : 'warning'}`}>{selectedTransaction.status}</span></div>
                                <div className="detail-item"><label>Mã GD:</label><span>{selectedTransaction.trans_id || '-'}</span></div>
                                <div className="detail-item"><label>Tạo lúc:</label><span>{selectedTransaction.created_at ? new Date(selectedTransaction.created_at).toLocaleString() : '-'}</span></div>
                                <div className="detail-item"><label>Hoàn thành:</label><span>{selectedTransaction.completed_at ? new Date(selectedTransaction.completed_at).toLocaleString() : '-'}</span></div>
                                <div className="detail-item full-width"><label>Ghi chú:</label><span>{selectedTransaction.description || '-'}</span></div>
                            </div>
                            <div className="dialog-actions"><button className="btn ghost" onClick={() => dialogRef.current?.close()}>Đóng</button></div>
                        </div>
                    )}
                </dialog>
            </main>
        </div>
    )
}

export default Admin
