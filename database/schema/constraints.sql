-- =====================================================
-- VPN Gaming Platform - Privileges and Constraint Hooks
-- =====================================================
-- Table-level constraints are defined inline in schema/tables.sql.
-- This file keeps post-create grants and future ALTER TABLE constraints.

GRANT USAGE ON SCHEMA public TO vpn_user;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO vpn_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO vpn_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO vpn_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE ON SEQUENCES TO vpn_user;
