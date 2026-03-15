import { useState } from 'react'

function Support() {
    const [expandedFaq, setExpandedFaq] = useState(null)

    const faqs = [
        {
            q: 'Làm sao để nạp tiền?',
            a: 'Bạn có thể nạp tiền bằng cách click vào nút "Nạp tiền" ở thanh menu hoặc sidebar. Hệ thống hỗ trợ thanh toán qua MoMo.'
        },
        {
            q: 'Ping cao có ảnh hưởng gì?',
            a: 'Ping cao sẽ làm tăng độ trễ khi chơi game. Chúng tôi khuyến khích chọn máy có ping dưới 50ms để có trải nghiệm tốt nhất.'
        },
        {
            q: 'Làm sao để kết nối VPN?',
            a: 'Sau khi khởi tạo phiên, tải file .ovpn và import vào OpenVPN client. Sau đó kết nối VPN và nhấn "Đã kết nối" trên hệ thống.'
        },
        {
            q: 'Snapshot là gì?',
            a: 'Snapshot lưu lại trạng thái game của bạn. Lần sau bạn có thể tiếp tục từ snapshot mà không cần setup lại từ đầu.'
        },
        {
            q: 'Tiền nạp có được hoàn lại không?',
            a: 'Số dư tài khoản có thể được hoàn lại trong vòng 7 ngày nếu chưa sử dụng. Vui lòng liên hệ hỗ trợ để được xử lý.'
        }
    ]

    const toggleFaq = (index) => {
        setExpandedFaq(expandedFaq === index ? null : index)
    }

    return (
        <div className="stack">
            <div className="section-head">
                <div>
                    <p className="muted">Trung tâm hỗ trợ</p>
                    <h2>Hỗ trợ & FAQ</h2>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="support-actions">
                <div className="support-card">
                    <div className="support-icon">📧</div>
                    <h4>Email hỗ trợ</h4>
                    <p className="muted">support@vpngaming.vn</p>
                    <a className="btn secondary" href="mailto:support@vpngaming.vn">Gửi email</a>
                </div>
                <div className="support-card">
                    <div className="support-icon">💬</div>
                    <h4>Zalo/Telegram</h4>
                    <p className="muted">Chat trực tiếp 24/7</p>
                    <button className="btn secondary">Chat ngay</button>
                </div>
                <div className="support-card">
                    <div className="support-icon">📚</div>
                    <h4>Tài liệu</h4>
                    <p className="muted">Hướng dẫn chi tiết</p>
                    <button className="btn secondary">Xem tài liệu</button>
                </div>
            </div>

            {/* FAQ Section */}
            <div className="card">
                <div className="card-header">
                    <h3>Câu hỏi thường gặp</h3>
                </div>
                <div className="faq-list">
                    {faqs.map((faq, index) => (
                        <div key={index} className={`faq-item ${expandedFaq === index ? 'expanded' : ''}`}>
                            <button className="faq-question" onClick={() => toggleFaq(index)}>
                                <span>{faq.q}</span>
                                <span className="faq-toggle">{expandedFaq === index ? '−' : '+'}</span>
                            </button>
                            {expandedFaq === index && (
                                <div className="faq-answer">
                                    <p>{faq.a}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-2">
                <div className="card info-card">
                    <div className="info-header">
                        <span className="info-icon">🔒</span>
                        <h4>Bảo mật tài khoản</h4>
                    </div>
                    <ul className="info-list">
                        <li>Sử dụng mật khẩu mạnh, ít nhất 8 ký tự</li>
                        <li>Không chia sẻ thông tin đăng nhập</li>
                        <li>Đăng xuất khi dùng máy công cộng</li>
                        <li>Liên hệ ngay nếu phát hiện truy cập lạ</li>
                    </ul>
                </div>
                <div className="card info-card">
                    <div className="info-header">
                        <span className="info-icon">⚡</span>
                        <h4>Mẹo tối ưu trải nghiệm</h4>
                    </div>
                    <ul className="info-list">
                        <li>Chọn máy có ping thấp nhất</li>
                        <li>Sử dụng mạng có dây thay vì WiFi</li>
                        <li>Đóng các ứng dụng không cần thiết</li>
                        <li>Cập nhật Moonlight phiên bản mới nhất</li>
                    </ul>
                </div>
            </div>

            {/* Contact Form */}
            <div className="card">
                <div className="card-header">
                    <h3>Gửi yêu cầu hỗ trợ</h3>
                </div>
                <form className="support-form">
                    <label className="field">
                        Tiêu đề
                        <input type="text" placeholder="Mô tả ngắn vấn đề của bạn" />
                    </label>
                    <label className="field">
                        Loại vấn đề
                        <select>
                            <option value="">Chọn loại vấn đề</option>
                            <option value="payment">Thanh toán / Nạp tiền</option>
                            <option value="technical">Kỹ thuật / Kết nối</option>
                            <option value="account">Tài khoản</option>
                            <option value="other">Khác</option>
                        </select>
                    </label>
                    <label className="field">
                        Mô tả chi tiết
                        <textarea rows="4" placeholder="Mô tả chi tiết vấn đề bạn đang gặp phải..."></textarea>
                    </label>
                    <div className="actions">
                        <button type="submit" className="btn primary">Gửi yêu cầu</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default Support
