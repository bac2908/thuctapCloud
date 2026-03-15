-- =====================================================
-- MIGRATION: Add balance to users and topup_transactions
-- =====================================================
-- Chạy script này với quyền postgres:
-- psql -h localhost -U postgres -d vpn_app -f migrations/add_balance_final.sql
-- Hoặc cấp quyền cho vpn_user trước:
-- ALTER TABLE users OWNER TO vpn_user;
-- =====================================================

-- 1. Thêm cột balance vào bảng users (nếu chưa có)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='balance'
    ) THEN
        ALTER TABLE users ADD COLUMN balance BIGINT NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added balance column to users table';
    ELSE
        RAISE NOTICE 'balance column already exists';
    END IF;
END $$;

-- 2. Tạo bảng topup_transactions (nếu chưa có)
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

-- 3. Tạo các index
CREATE INDEX IF NOT EXISTS ix_topup_transactions_user_id ON topup_transactions(user_id);
CREATE INDEX IF NOT EXISTS ix_topup_transactions_status ON topup_transactions(status);
CREATE INDEX IF NOT EXISTS ix_topup_transactions_created_at ON topup_transactions(created_at);

-- 4. Cấp quyền cho vpn_user
GRANT ALL PRIVILEGES ON TABLE topup_transactions TO vpn_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vpn_user;

SELECT 'Migration completed!' as result;
