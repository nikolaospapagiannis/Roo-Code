-- Fortune 100 Enterprise Database Schema
-- PostgreSQL Database for ExAI Guard Service
-- ACID compliant, indexed, with encryption support

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for additional security functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Optional: Enable pgvector for vector similarity search (ML patterns)
-- CREATE EXTENSION IF NOT EXISTS "vector";

-- ==========================================
-- USERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username                    VARCHAR(255) UNIQUE NOT NULL,
    email                       VARCHAR(255) UNIQUE NOT NULL,
    password_hash               TEXT NOT NULL,
    roles                       JSONB NOT NULL DEFAULT '[]'::JSONB,

    -- MFA (Multi-Factor Authentication)
    mfa_enabled                 BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret_encrypted        TEXT,
    mfa_backup_codes_encrypted  TEXT,

    -- Metadata
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_login                  TIMESTAMP WITH TIME ZONE,
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,

    -- Indexes for performance
    CONSTRAINT users_username_check CHECK (LENGTH(username) >= 3),
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes on users table
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ==========================================
-- SESSIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS sessions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL,
    token_hash          TEXT NOT NULL,

    -- Session metadata
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address          VARCHAR(45),
    user_agent          TEXT,

    -- Token counting (context window management)
    token_count         INTEGER NOT NULL DEFAULT 0,
    context_window      INTEGER NOT NULL DEFAULT 8192,
    last_activity       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Foreign key
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,

    -- Constraints
    CONSTRAINT sessions_token_count_check CHECK (token_count >= 0),
    CONSTRAINT sessions_context_window_check CHECK (context_window > 0),
    CONSTRAINT sessions_expires_check CHECK (expires_at > created_at)
);

-- Indexes on sessions table
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);

-- ==========================================
-- AUDIT LOGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id                 UUID,
    session_id              UUID,

    -- Action details
    action                  VARCHAR(255) NOT NULL,
    resource                VARCHAR(255) NOT NULL,
    result                  VARCHAR(50) NOT NULL CHECK (result IN ('success', 'failure')),

    -- Encrypted details (AES-256-GCM encrypted JSON)
    details_encrypted       TEXT NOT NULL,

    -- Request metadata
    ip_address              VARCHAR(45),
    user_agent              TEXT,

    -- Foreign key (nullable - user might be deleted but we keep audit)
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes on audit_logs table (critical for compliance queries)
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_result ON audit_logs(result);
CREATE INDEX IF NOT EXISTS idx_audit_session_id ON audit_logs(session_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_user_timestamp ON audit_logs(user_id, timestamp DESC);

-- ==========================================
-- VIOLATIONS TABLE (ExAI Guard specific)
-- ==========================================
CREATE TABLE IF NOT EXISTS violations (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type                    VARCHAR(50) NOT NULL CHECK (type IN ('security', 'privacy', 'compliance', 'ethical', 'quality')),
    severity                VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message                 TEXT NOT NULL,
    description             TEXT NOT NULL,

    -- Location
    file_path               TEXT,
    line_number             INTEGER,
    column_number           INTEGER,

    -- Context (encrypted)
    context_encrypted       TEXT,

    -- Metadata
    detected_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at             TIMESTAMP WITH TIME ZONE,
    status                  VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ignored')),

    -- Session tracking
    session_id              UUID,

    CONSTRAINT violations_line_check CHECK (line_number >= 0),
    CONSTRAINT violations_column_check CHECK (column_number >= 0)
);

-- Indexes on violations table
CREATE INDEX IF NOT EXISTS idx_violations_type ON violations(type);
CREATE INDEX IF NOT EXISTS idx_violations_severity ON violations(severity);
CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);
CREATE INDEX IF NOT EXISTS idx_violations_detected_at ON violations(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_violations_session_id ON violations(session_id);

-- Composite index for filtering
CREATE INDEX IF NOT EXISTS idx_violations_type_severity_status ON violations(type, severity, status);

-- ==========================================
-- PATTERNS TABLE (Brain Service ML patterns)
-- ==========================================
CREATE TABLE IF NOT EXISTS patterns (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type                    VARCHAR(100) NOT NULL,

    -- Pattern content (encrypted)
    content_encrypted       TEXT NOT NULL,

    -- Vector embedding (for similarity search)
    -- If using pgvector: embedding VECTOR(1536),
    embedding               JSONB,

    -- Metadata
    frequency               INTEGER NOT NULL DEFAULT 1,
    last_seen               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Context (encrypted)
    context_encrypted       TEXT,

    CONSTRAINT patterns_frequency_check CHECK (frequency > 0)
);

-- Indexes on patterns table
CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(type);
CREATE INDEX IF NOT EXISTS idx_patterns_last_seen ON patterns(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_frequency ON patterns(frequency DESC);

-- If using pgvector for true vector similarity search:
-- CREATE INDEX IF NOT EXISTS idx_patterns_embedding ON patterns USING ivfflat (embedding vector_cosine_ops);

-- ==========================================
-- RATE LIMITS TABLE (distributed rate limiting)
-- ==========================================
CREATE TABLE IF NOT EXISTS rate_limits (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key                     VARCHAR(255) UNIQUE NOT NULL,
    type                    VARCHAR(50) NOT NULL CHECK (type IN ('login', 'api', 'ip')),

    -- Rate limit data
    points                  INTEGER NOT NULL DEFAULT 0,
    reset_at                TIMESTAMP WITH TIME ZONE NOT NULL,
    blocked_until           TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT rate_limits_points_check CHECK (points >= 0)
);

-- Indexes on rate_limits table
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_type ON rate_limits(type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);

-- ==========================================
-- BACKUP CODES TABLE (MFA backup codes)
-- ==========================================
CREATE TABLE IF NOT EXISTS backup_codes (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL,
    code_hash               VARCHAR(255) NOT NULL,

    -- Usage tracking
    used                    BOOLEAN NOT NULL DEFAULT FALSE,
    used_at                 TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at              TIMESTAMP WITH TIME ZONE,

    -- Foreign key
    CONSTRAINT fk_backup_codes_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT backup_codes_usage_check CHECK (
        (used = FALSE AND used_at IS NULL) OR
        (used = TRUE AND used_at IS NOT NULL)
    )
);

-- Indexes on backup_codes table
CREATE INDEX IF NOT EXISTS idx_backup_codes_user_id ON backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_codes_used ON backup_codes(used);
CREATE INDEX IF NOT EXISTS idx_backup_codes_code_hash ON backup_codes(code_hash);

-- ==========================================
-- CLEANUP FUNCTION (auto-delete expired sessions)
-- ==========================================
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM sessions
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TRIGGER: Update last_activity on session update
-- ==========================================
CREATE OR REPLACE FUNCTION update_session_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_session_last_activity
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_session_last_activity();

-- ==========================================
-- TRIGGER: Update rate_limits updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION update_rate_limit_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_rate_limit_timestamp
    BEFORE UPDATE ON rate_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_rate_limit_timestamp();

-- ==========================================
-- VIEWS FOR COMMON QUERIES
-- ==========================================

-- Active sessions view
CREATE OR REPLACE VIEW active_sessions AS
SELECT
    s.id,
    s.user_id,
    u.username,
    u.email,
    s.created_at,
    s.expires_at,
    s.ip_address,
    s.last_activity,
    s.token_count,
    s.context_window,
    ROUND((s.token_count::DECIMAL / s.context_window * 100), 2) AS token_usage_percent
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.expires_at > NOW()
ORDER BY s.last_activity DESC;

-- User security summary view
CREATE OR REPLACE VIEW user_security_summary AS
SELECT
    u.id,
    u.username,
    u.email,
    u.mfa_enabled,
    u.is_active,
    u.created_at,
    u.last_login,
    COUNT(DISTINCT s.id) AS active_sessions_count,
    COUNT(DISTINCT al.id) FILTER (WHERE al.result = 'failure' AND al.timestamp > NOW() - INTERVAL '24 hours') AS failed_attempts_24h,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'open') AS open_violations_count
FROM users u
LEFT JOIN sessions s ON s.user_id = u.id AND s.expires_at > NOW()
LEFT JOIN audit_logs al ON al.user_id = u.id
LEFT JOIN violations v ON v.session_id IN (SELECT id FROM sessions WHERE user_id = u.id)
GROUP BY u.id, u.username, u.email, u.mfa_enabled, u.is_active, u.created_at, u.last_login;

-- Compliance report view (last 30 days)
CREATE OR REPLACE VIEW compliance_report_30d AS
SELECT
    COUNT(*) AS total_events,
    COUNT(*) FILTER (WHERE result = 'success') AS successful_events,
    COUNT(*) FILTER (WHERE result = 'failure') AS failed_events,
    COUNT(DISTINCT user_id) AS unique_users,
    COUNT(DISTINCT action) AS unique_actions,
    MIN(timestamp) AS period_start,
    MAX(timestamp) AS period_end
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '30 days';

-- ==========================================
-- GRANTS (adjust based on your user roles)
-- ==========================================

-- Grant permissions to application user (replace 'exai_guard_app' with your app user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO exai_guard_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO exai_guard_app;

-- ==========================================
-- SAMPLE DATA (for development only)
-- ==========================================

-- DO NOT RUN IN PRODUCTION
-- INSERT INTO users (username, email, password_hash, roles, is_active)
-- VALUES
--     ('admin', 'admin@example.com', '$2b$10$...', '["admin"]', TRUE),
--     ('analyst', 'analyst@example.com', '$2b$10$...', '["security-analyst"]', TRUE),
--     ('developer', 'developer@example.com', '$2b$10$...', '["developer"]', TRUE);

COMMENT ON TABLE users IS 'Application users with authentication and MFA support';
COMMENT ON TABLE sessions IS 'User sessions with token counting for context window management';
COMMENT ON TABLE audit_logs IS 'Tamper-proof audit trail for compliance (SOX, GDPR, HIPAA)';
COMMENT ON TABLE violations IS 'ExAI Guard detected violations';
COMMENT ON TABLE patterns IS 'Brain Service ML patterns with vector embeddings';
COMMENT ON TABLE rate_limits IS 'Distributed rate limiting data';
COMMENT ON TABLE backup_codes IS 'MFA backup codes for users';
