-- =====================================================
-- VPN Gaming Platform - Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_users_status ON users(status);
CREATE INDEX IF NOT EXISTS ix_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS ix_credentials_user_id ON credentials(user_id);

CREATE INDEX IF NOT EXISTS ix_identities_user_id ON identities(user_id);
CREATE INDEX IF NOT EXISTS ix_identities_provider_subject ON identities(provider, subject);

CREATE INDEX IF NOT EXISTS ix_player_profiles_user_id ON player_profiles(user_id);

CREATE INDEX IF NOT EXISTS ix_machines_code ON machines(code);
CREATE INDEX IF NOT EXISTS ix_machines_status ON machines(status);
CREATE INDEX IF NOT EXISTS ix_machines_region_status ON machines(region, status);

CREATE INDEX IF NOT EXISTS ix_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS ix_sessions_machine_id ON sessions(machine_id);
CREATE INDEX IF NOT EXISTS ix_sessions_start_at ON sessions(start_at);
CREATE INDEX IF NOT EXISTS ix_sessions_status ON sessions(end_at);

CREATE INDEX IF NOT EXISTS ix_topups_user_id ON topups(user_id);
CREATE INDEX IF NOT EXISTS ix_topups_status ON topups(status);
CREATE INDEX IF NOT EXISTS ix_topups_created_at ON topups(created_at);

CREATE INDEX IF NOT EXISTS ix_maintenance_logs_machine_id ON maintenance_logs(machine_id);
CREATE INDEX IF NOT EXISTS ix_maintenance_logs_created_at ON maintenance_logs(created_at);

CREATE INDEX IF NOT EXISTS ix_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS ix_login_challenges_user_id ON login_challenges(user_id);
CREATE INDEX IF NOT EXISTS ix_login_challenges_expires_at ON login_challenges(expires_at);
