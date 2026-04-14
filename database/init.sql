-- =====================================================
-- VPN Gaming Platform - Schema Setup
-- PostgreSQL 15+
-- Contains schema and database permissions only.
-- Seed data is in seeds/seed.sql.
-- =====================================================
-- To initialize: psql -U vpn_user -d vpn_app -f init.sql

-- =====================================================
-- Step 1: Create Role & Database (safe if already exists)
-- =====================================================
-- Run this as superuser first:
-- CREATE DATABASE vpn_app OWNER vpn_user;
-- CREATE USER vpn_user WITH PASSWORD 'Bn2908#2004';

-- =====================================================
-- Extensions
-- =====================================================
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
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

CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_users_status ON users(status);
CREATE INDEX IF NOT EXISTS ix_users_created_at ON users(created_at);

-- =====================================================
-- CREDENTIALS TABLE (Password storage)
-- =====================================================
CREATE TABLE IF NOT EXISTS credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT no_empty_hash CHECK (password_hash <> '')
);

CREATE INDEX IF NOT EXISTS ix_credentials_user_id ON credentials(user_id);

-- =====================================================
-- IDENTITIES TABLE (OAuth providers: Google, GitHub, etc.)
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

CREATE INDEX IF NOT EXISTS ix_identities_user_id ON identities(user_id);
CREATE INDEX IF NOT EXISTS ix_identities_provider_subject ON identities(provider, subject);

-- =====================================================
-- PLAYER_PROFILES TABLE (Extended user information - encrypted)
-- =====================================================
CREATE TABLE IF NOT EXISTS player_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone_enc BYTEA,
    dob_enc BYTEA,
    note_enc BYTEA,
    CONSTRAINT one_profile_per_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS ix_player_profiles_user_id ON player_profiles(user_id);

-- =====================================================
-- MACHINES TABLE (VPN Servers/Gaming VMs)
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

CREATE INDEX IF NOT EXISTS ix_machines_code ON machines(code);
CREATE INDEX IF NOT EXISTS ix_machines_status ON machines(status);
CREATE INDEX IF NOT EXISTS ix_machines_region_status ON machines(region, status);

-- =====================================================
-- SESSIONS TABLE (Gaming sessions on machines)
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

CREATE INDEX IF NOT EXISTS ix_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS ix_sessions_machine_id ON sessions(machine_id);
CREATE INDEX IF NOT EXISTS ix_sessions_start_at ON sessions(start_at);
CREATE INDEX IF NOT EXISTS ix_sessions_status ON sessions(end_at);

-- =====================================================
-- TOPUPS TABLE (User balance top-ups via MoMo, etc.)
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

CREATE INDEX IF NOT EXISTS ix_topups_user_id ON topups(user_id);
CREATE INDEX IF NOT EXISTS ix_topups_status ON topups(status);
CREATE INDEX IF NOT EXISTS ix_topups_created_at ON topups(created_at);

-- =====================================================
-- MAINTENANCE_LOGS TABLE (Machine maintenance & operations)
-- =====================================================
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES machines(id),
    action TEXT,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_maintenance_logs_machine_id ON maintenance_logs(machine_id);
CREATE INDEX IF NOT EXISTS ix_maintenance_logs_created_at ON maintenance_logs(created_at);

-- =====================================================
-- AUDIT_LOGS TABLE (System-wide audit trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT,
    target TEXT,
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs(created_at);

-- =====================================================
-- LOGIN_CHALLENGES TABLE (Multi-factor auth / verification)
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

CREATE INDEX IF NOT EXISTS ix_login_challenges_user_id ON login_challenges(user_id);
CREATE INDEX IF NOT EXISTS ix_login_challenges_expires_at ON login_challenges(expires_at);

-- =====================================================
-- VIEWS
-- =====================================================

-- Active users view
CREATE OR REPLACE VIEW active_users AS
SELECT 
    u.id,
    u.email,
    u.display_name,
    u.role,
    u.created_at,
    COUNT(s.id) as total_sessions,
    MAX(s.start_at) as last_session_at
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id
WHERE u.status = 'active'
GROUP BY u.id, u.email, u.display_name, u.role, u.created_at;

-- Machine utilization view
CREATE OR REPLACE VIEW machine_stats AS
SELECT 
    m.id,
    m.code,
    m.region,
    m.gpu,
    COUNT(s.id) as total_sessions,
    COUNT(CASE WHEN s.end_at IS NULL THEN 1 END) as active_sessions,
    AVG(EXTRACT(EPOCH FROM (COALESCE(s.end_at, NOW()) - s.start_at))) as avg_session_duration_sec
FROM machines m
LEFT JOIN sessions s ON m.id = s.machine_id
GROUP BY m.id, m.code, m.region, m.gpu;

-- =====================================================
-- PERMISSIONS
-- =====================================================
-- Grant basic permissions to vpn_user
GRANT USAGE ON SCHEMA public TO vpn_user;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO vpn_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO vpn_user;

-- For new objects created in the future
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO vpn_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT USAGE ON SEQUENCES TO vpn_user;

-- =====================================================
-- SEED DATA
-- =====================================================
-- Seed data has been moved to seeds/seed.sql.
-- Run separately when needed:
--   psql -U vpn_user -d vpn_app -f seeds/seed.sql

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 'Schema initialization completed' as "Status";
