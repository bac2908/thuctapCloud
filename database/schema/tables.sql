-- =====================================================
-- VPN Gaming Platform - Core Schema (Tables + Views)
-- =====================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT UNIQUE NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_role CHECK (role IN ('user', 'admin', 'moderator')),
    CONSTRAINT chk_status CHECK (status IN ('active', 'suspended', 'banned'))
);

-- =====================================================
-- CREDENTIALS
-- =====================================================
CREATE TABLE IF NOT EXISTS credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT no_empty_hash CHECK (password_hash <> '')
);

-- =====================================================
-- IDENTITIES (OAuth)
-- =====================================================
CREATE TABLE IF NOT EXISTS identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    subject TEXT NOT NULL,
    access_token_enc BYTEA,
    refresh_token_enc BYTEA,
    expires_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    CONSTRAINT unique_provider_subject UNIQUE (provider, subject),
    CONSTRAINT valid_provider CHECK (provider IN ('google', 'github', 'facebook', 'oauth'))
);

-- =====================================================
-- PLAYER PROFILES
-- =====================================================
CREATE TABLE IF NOT EXISTS player_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone_enc BYTEA,
    dob_enc BYTEA,
    note_enc BYTEA,
    CONSTRAINT one_profile_per_user UNIQUE (user_id)
);

-- =====================================================
-- MACHINES
-- =====================================================
CREATE TABLE IF NOT EXISTS machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    region TEXT,
    location TEXT,
    ping_ms INTEGER,
    gpu TEXT,
    status TEXT NOT NULL DEFAULT 'idle',
    last_heartbeat TIMESTAMPTZ,
    CONSTRAINT chk_machine_status CHECK (status IN ('idle', 'busy', 'maintenance', 'offline'))
);

-- =====================================================
-- SESSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    machine_id UUID NOT NULL REFERENCES machines(id),
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    duration_sec INTEGER,
    cost NUMERIC(12,2),
    CONSTRAINT valid_times CHECK (end_at IS NULL OR end_at > start_at)
);

-- =====================================================
-- TOPUPS
-- =====================================================
CREATE TABLE IF NOT EXISTS topups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'VND',
    provider TEXT,
    provider_txn_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_topup_status CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- =====================================================
-- MAINTENANCE LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES machines(id),
    action TEXT,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- AUDIT LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT,
    target TEXT,
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- LOGIN CHALLENGES
-- =====================================================
CREATE TABLE IF NOT EXISTS login_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash BYTEA NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    user_agent TEXT,
    ip INET,
    CONSTRAINT unconsumed_or_expired CHECK (consumed_at IS NULL OR consumed_at <= expires_at)
);

-- =====================================================
-- VIEWS
-- =====================================================
CREATE OR REPLACE VIEW active_users AS
SELECT
    u.id,
    u.email,
    u.display_name,
    u.role,
    u.created_at,
    COUNT(s.id) AS total_sessions,
    MAX(s.start_at) AS last_session_at
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id
WHERE u.status = 'active'
GROUP BY u.id, u.email, u.display_name, u.role, u.created_at;

CREATE OR REPLACE VIEW machine_stats AS
SELECT
    m.id,
    m.code,
    m.region,
    m.gpu,
    COUNT(s.id) AS total_sessions,
    COUNT(CASE WHEN s.end_at IS NULL THEN 1 END) AS active_sessions,
    AVG(EXTRACT(EPOCH FROM (COALESCE(s.end_at, NOW()) - s.start_at))) AS avg_session_duration_sec
FROM machines m
LEFT JOIN sessions s ON m.id = s.machine_id
GROUP BY m.id, m.code, m.region, m.gpu;
