-- Migration: Add balance to users and create topup_transactions table
-- Date: 2026-01-23

-- 1. Thêm cột balance vào bảng users
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance BIGINT NOT NULL DEFAULT 0;

-- 2. Tạo bảng topup_transactions
CREATE TABLE IF NOT EXISTS topup_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    amount BIGINT NOT NULL,
    balance_before BIGINT NOT NULL DEFAULT 0,
    balance_after BIGINT NOT NULL DEFAULT 0,
    status VARCHAR NOT NULL DEFAULT 'pending',
    provider VARCHAR NOT NULL DEFAULT 'momo',
    description VARCHAR,
    trans_id VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Tạo các index cho bảng topup_transactions
CREATE INDEX IF NOT EXISTS ix_topup_transactions_user_id ON topup_transactions(user_id);
CREATE INDEX IF NOT EXISTS ix_topup_transactions_status ON topup_transactions(status);
CREATE INDEX IF NOT EXISTS ix_topup_transactions_created_at ON topup_transactions(created_at);

-- 4. Comment để giải thích
COMMENT ON TABLE topup_transactions IS 'Lịch sử giao dịch nạp tiền của người dùng';
COMMENT ON COLUMN users.balance IS 'Số dư tài khoản (VND)';
COMMENT ON COLUMN topup_transactions.amount IS 'Số tiền nạp (VND)';
COMMENT ON COLUMN topup_transactions.balance_before IS 'Số dư trước khi nạp';
COMMENT ON COLUMN topup_transactions.balance_after IS 'Số dư sau khi nạp';
COMMENT ON COLUMN topup_transactions.status IS 'Trạng thái: pending, succeeded, failed';
