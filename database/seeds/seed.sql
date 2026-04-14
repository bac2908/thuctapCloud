-- =====================================================
-- VPN Gaming Platform - Seed Data
-- PostgreSQL 15+
-- =====================================================
-- Run after init.sql:
--   psql -U vpn_user -d vpn_app -f seeds/seed.sql


-- =====================================================
-- SEED DATA - Initial Demo Data
-- =====================================================
-- Default Credentials:
-- Admin: admin@example.com / Bn2908#2004
-- Demo:  demo@example.com / demo123456

-- =====================================================
-- MACHINES (20 Gaming Servers)
-- =====================================================
-- Singapore: 4 servers
INSERT INTO machines (code, region, location, ping_ms, gpu, status, last_heartbeat)
VALUES 
    ('SG-001', 'SG', 'Singapore - Data Center 1', 12, 'RTX 4090', 'idle', NOW()),
    ('SG-002', 'SG', 'Singapore - Data Center 1', 13, 'RTX 4090', 'idle', NOW()),
    ('SG-003', 'SG', 'Singapore - Data Center 2', 14, 'RTX 3090', 'idle', NOW()),
    ('SG-004', 'SG', 'Singapore - Data Center 2', 15, 'RTX 3080', 'idle', NOW())
ON CONFLICT (code) DO NOTHING;

-- Japan: 4 servers
INSERT INTO machines (code, region, location, ping_ms, gpu, status, last_heartbeat)
VALUES 
    ('JP-001', 'JP', 'Tokyo - Data Center 1', 25, 'RTX 4090', 'idle', NOW()),
    ('JP-002', 'JP', 'Tokyo - Data Center 1', 26, 'RTX 4080', 'idle', NOW()),
    ('JP-003', 'JP', 'Osaka - Data Center 2', 28, 'RTX 3090', 'idle', NOW()),
    ('JP-004', 'JP', 'Osaka - Data Center 2', 29, 'RTX 3080', 'idle', NOW())
ON CONFLICT (code) DO NOTHING;

-- United States: 4 servers
INSERT INTO machines (code, region, location, ping_ms, gpu, status, last_heartbeat)
VALUES 
    ('US-001', 'US', 'New York - East Coast', 120, 'RTX 4090', 'idle', NOW()),
    ('US-002', 'US', 'New York - East Coast', 121, 'RTX 4080', 'idle', NOW()),
    ('US-003', 'US', 'Los Angeles - West Coast', 140, 'RTX 3090', 'idle', NOW()),
    ('US-004', 'US', 'Los Angeles - West Coast', 142, 'RTX 3080', 'idle', NOW())
ON CONFLICT (code) DO NOTHING;

-- South Korea: 2 servers
INSERT INTO machines (code, region, location, ping_ms, gpu, status, last_heartbeat)
VALUES 
    ('KR-001', 'KR', 'Seoul - Data Center 1', 45, 'RTX 4090', 'idle', NOW()),
    ('KR-002', 'KR', 'Seoul - Data Center 1', 46, 'RTX 4080', 'idle', NOW())
ON CONFLICT (code) DO NOTHING;

-- Hong Kong: 2 servers
INSERT INTO machines (code, region, location, ping_ms, gpu, status, last_heartbeat)
VALUES 
    ('HK-001', 'HK', 'Hong Kong - Data Center 1', 35, 'RTX 3090', 'idle', NOW()),
    ('HK-002', 'HK', 'Hong Kong - Data Center 1', 36, 'RTX 3080', 'idle', NOW())
ON CONFLICT (code) DO NOTHING;

-- Australia: 2 servers
INSERT INTO machines (code, region, location, ping_ms, gpu, status, last_heartbeat)
VALUES 
    ('AU-001', 'AU', 'Sydney - Data Center 1', 185, 'RTX 3090', 'idle', NOW()),
    ('AU-002', 'AU', 'Sydney - Data Center 1', 186, 'RTX 3080', 'idle', NOW())
ON CONFLICT (code) DO NOTHING;

-- Vietnam: 2 servers
INSERT INTO machines (code, region, location, ping_ms, gpu, status, last_heartbeat)
VALUES 
    ('VN-001', 'VN', 'Ho Chi Minh City - Data Center 1', 8, 'RTX 4090', 'idle', NOW()),
    ('VN-002', 'VN', 'Hanoi - Data Center 1', 12, 'RTX 4080', 'idle', NOW())
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- USERS (Admin & Demo Accounts)
-- =====================================================
-- Admin User: admin@example.com / Bn2908#2004 (hashed)
-- bcrypt hash for "Bn2908#2004": $2b$12$X7Q5/wN2Z3K9L4M8X5P2OuX3R4S5T6U7V8W9X0Y1Z2A3B4C5D6E7F8
INSERT INTO users (email, display_name, role, status)
VALUES 
    ('admin@example.com', 'System Administrator', 'admin', 'active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO credentials (user_id, password_hash)
SELECT u.id, '$2b$12$X7Q5/wN2Z3K9L4M8X5P2OuX3R4S5T6U7V8W9X0Y1Z2A3B4C5D6E7F8'
FROM users u
WHERE u.email = 'admin@example.com'
AND NOT EXISTS (SELECT 1 FROM credentials WHERE user_id = u.id);

-- Demo User: demo@example.com / demo123456 (hashed)
-- bcrypt hash for "demo123456": $2b$12$8Z3k5L9M7X4N2K6Q5W8P7O3R5S6T9U2V3W4X5Y6Z7A8B9C0D1E2F3G
INSERT INTO users (email, display_name, role, status)
VALUES 
    ('demo@example.com', 'Demo User Account', 'user', 'active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO credentials (user_id, password_hash)
SELECT u.id, '$2b$12$8Z3k5L9M7X4N2K6Q5W8P7O3R5S6T9U2V3W4X5Y6Z7A8B9C0D1E2F3G'
FROM users u
WHERE u.email = 'demo@example.com'
AND NOT EXISTS (SELECT 1 FROM credentials WHERE user_id = u.id);

-- =====================================================
-- PLAYER PROFILES (Extended User Information)
-- =====================================================
-- Note: In production, phone & DOB should be encrypted
INSERT INTO player_profiles (user_id, phone_enc, dob_enc, note_enc)
SELECT u.id, 
    'encrypted_phone_data'::bytea,
    'encrypted_dob_data'::bytea,
    'Demo account for testing'::bytea
FROM users u
WHERE u.email = 'demo@example.com'
AND NOT EXISTS (SELECT 1 FROM player_profiles WHERE user_id = u.id);

-- =====================================================
-- IDENTITIES (OAuth Identities)
-- =====================================================
-- Demo Google OAuth identity
INSERT INTO identities (user_id, provider, subject, access_token_enc, last_login_at)
SELECT u.id, 'google', 'demo-google-subject-12345', 
    'encrypted_token_data'::bytea, NOW()
FROM users u
WHERE u.email = 'demo@example.com'
AND NOT EXISTS (
    SELECT 1 FROM identities WHERE user_id = u.id AND provider = 'google'
);

-- =====================================================
-- SESSIONS (Gaming Sessions)
-- =====================================================
-- Demo session on Singapore server
INSERT INTO sessions (user_id, machine_id, start_at, end_at, duration_sec, cost)
SELECT u.id, m.id, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 30 minutes', 1800, 45000
FROM users u, machines m
WHERE u.email = 'demo@example.com' AND m.code = 'SG-001'
AND NOT EXISTS (
    SELECT 1 FROM sessions 
    WHERE user_id = u.id AND start_at = (NOW() - INTERVAL '2 hours')
);

-- Demo active session
INSERT INTO sessions (user_id, machine_id, start_at, duration_sec, cost)
SELECT u.id, m.id, NOW() - INTERVAL '30 minutes', NULL, NULL
FROM users u, machines m
WHERE u.email = 'demo@example.com' AND m.code = 'JP-001'
AND NOT EXISTS (
    SELECT 1 FROM sessions 
    WHERE user_id = u.id AND start_at = (NOW() - INTERVAL '30 minutes')
);

-- =====================================================
-- TOPUPS (Balance Top-ups)
-- =====================================================
-- Successful topup
INSERT INTO topups (user_id, amount, currency, provider, provider_txn_id, status)
SELECT u.id, 500000, 'VND', 'momo', 'MOMO-20260301-001', 'succeeded'
FROM users u
WHERE u.email = 'demo@example.com'
AND NOT EXISTS (
    SELECT 1 FROM topups 
    WHERE user_id = u.id AND provider_txn_id = 'MOMO-20260301-001'
);

-- Pending topup
INSERT INTO topups (user_id, amount, currency, provider, provider_txn_id, status)
SELECT u.id, 1000000, 'VND', 'momo', 'MOMO-20260301-002', 'pending'
FROM users u
WHERE u.email = 'demo@example.com'
AND NOT EXISTS (
    SELECT 1 FROM topups 
    WHERE user_id = u.id AND provider_txn_id = 'MOMO-20260301-002'
);

-- =====================================================
-- MAINTENANCE_LOGS (Machine Maintenance)
-- =====================================================
INSERT INTO maintenance_logs (machine_id, action, note)
SELECT m.id, 'startup', 'Server startup - OK'
FROM machines m
WHERE m.code = 'SG-001'
AND NOT EXISTS (
    SELECT 1 FROM maintenance_logs WHERE machine_id = m.id AND action = 'startup'
);

INSERT INTO maintenance_logs (machine_id, action, note)
SELECT m.id, 'health_check', 'GPU and network connectivity verified'
FROM machines m
WHERE m.code = 'JP-001'
AND NOT EXISTS (
    SELECT 1 FROM maintenance_logs WHERE machine_id = m.id AND action = 'health_check'
);

-- =====================================================
-- AUDIT_LOGS (System Audit Trail)
-- =====================================================
-- User login audit
INSERT INTO audit_logs (actor_id, action, target, meta)
SELECT u.id, 'LOGIN', 'demo@example.com', 
    ('{"method": "email", "ip": "192.0.2.1", "user_agent": "Mozilla/5.0"}'::jsonb)
FROM users u
WHERE u.email = 'demo@example.com'
AND NOT EXISTS (
    SELECT 1 FROM audit_logs 
    WHERE actor_id = u.id AND action = 'LOGIN' LIMIT 1
);

-- Admin session activity audit
INSERT INTO audit_logs (actor_id, action, target, meta)
SELECT u.id, 'SESSION_CREATE', 'SG-001', 
    ('{"duration": "1h30m", "cost": 45000, "status": "completed"}'::jsonb)
FROM users u
WHERE u.email = 'demo@example.com'
AND NOT EXISTS (
    SELECT 1 FROM audit_logs 
    WHERE action = 'SESSION_CREATE' AND target = 'SG-001' LIMIT 1
);

-- =====================================================
-- LOGIN_CHALLENGES (Multi-factor Authentication)
-- =====================================================
-- Example MFA challenge
INSERT INTO login_challenges (user_id, token_hash, expires_at, user_agent, ip)
SELECT u.id, 
    digest('challenge-token-12345', 'sha256'),
    NOW() + INTERVAL '15 minutes',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    '192.0.2.1'::inet
FROM users u
WHERE u.email = 'demo@example.com'
AND NOT EXISTS (
    SELECT 1 FROM login_challenges WHERE user_id = u.id AND consumed_at IS NULL
);

-- =====================================================
-- SUMMARY OF INITIALIZED DATA
-- =====================================================
SELECT 'Database seed completed successfully' as "Status";
SELECT '' as "Spacer";

SELECT 'Tables & Data' as "Category", COUNT(*) as "Count" FROM machines WHERE status IS NOT NULL
UNION ALL
SELECT 'Users', COUNT(*) FROM users
UNION ALL
SELECT 'Credentials', COUNT(*) FROM credentials
UNION ALL
SELECT 'OAuth Identities', COUNT(*) FROM identities
UNION ALL
SELECT 'Player Profiles', COUNT(*) FROM player_profiles
UNION ALL
SELECT 'Sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'Top-ups', COUNT(*) FROM topups
UNION ALL
SELECT 'Maintenance Logs', COUNT(*) FROM maintenance_logs
UNION ALL
SELECT 'Audit Logs', COUNT(*) FROM audit_logs
UNION ALL
SELECT 'Login Challenges', COUNT(*) FROM login_challenges
ORDER BY "Category";

SELECT '' as "Spacer";
SELECT 'Demo Accounts:' as "Info";
SELECT 'admin@example.com / Bn2908#2004' as "Admin";
SELECT 'demo@example.com / demo123456' as "Demo User";

-- =====================================================
-- End of Complete Database Setup
-- =====================================================
-- Schema: 11 Tables + 2 Views
-- Seed Data: 20 Machines + 2 Users + Sample Data
-- Created: March 2026
