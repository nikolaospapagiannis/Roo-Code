-- Migration: Add Checkpoints and JWT Blacklist tables
-- Purpose: PostgreSQL checkpoint storage and distributed JWT revocation
-- Date: 2025-10-26

-- ==========================================
-- CHECKPOINTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS checkpoints (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id          VARCHAR(255) NOT NULL,
    user_id             VARCHAR(255),
    data_encrypted      TEXT NOT NULL,
    version             INTEGER NOT NULL DEFAULT 1,
    token_count         INTEGER NOT NULL DEFAULT 0,
    message_count       INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMP WITH TIME ZONE,
    signature           TEXT,
    status              VARCHAR(50) NOT NULL DEFAULT 'active',
    CONSTRAINT checkpoints_status_check CHECK (status IN ('active', 'archived', 'expired'))
);

-- Indexes for checkpoints
CREATE INDEX idx_checkpoints_session_id ON checkpoints(session_id);
CREATE INDEX idx_checkpoints_user_id ON checkpoints(user_id);
CREATE INDEX idx_checkpoints_created_at ON checkpoints(created_at DESC);
CREATE INDEX idx_checkpoints_status ON checkpoints(status);

-- ==========================================
-- JWT BLACKLIST TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS jwt_blacklist (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jti                 VARCHAR(255) UNIQUE NOT NULL,
    token_hash          VARCHAR(255) NOT NULL,
    user_id             VARCHAR(255),
    reason              TEXT,
    expires_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    blacklisted_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for jwt_blacklist
CREATE INDEX idx_jwt_blacklist_jti ON jwt_blacklist(jti);
CREATE INDEX idx_jwt_blacklist_token_hash ON jwt_blacklist(token_hash);
CREATE INDEX idx_jwt_blacklist_user_id ON jwt_blacklist(user_id);
CREATE INDEX idx_jwt_blacklist_expires_at ON jwt_blacklist(expires_at); -- For cleanup

-- ==========================================
-- CLEANUP FUNCTION FOR EXPIRED TOKENS
-- ==========================================
CREATE OR REPLACE FUNCTION cleanup_expired_jwt_blacklist()
RETURNS void AS $$
BEGIN
    DELETE FROM jwt_blacklist WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- CLEANUP FUNCTION FOR EXPIRED CHECKPOINTS
-- ==========================================
CREATE OR REPLACE FUNCTION cleanup_expired_checkpoints()
RETURNS void AS $$
BEGIN
    -- Update status to 'expired' for checkpoints past expiration
    UPDATE checkpoints
    SET status = 'expired'
    WHERE expires_at IS NOT NULL
      AND expires_at < NOW()
      AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================
COMMENT ON TABLE checkpoints IS 'Stores conversation checkpoints for session recovery and context management';
COMMENT ON TABLE jwt_blacklist IS 'Distributed JWT token revocation list for logout and security events';

COMMENT ON COLUMN checkpoints.data_encrypted IS 'AES-256-GCM encrypted checkpoint data';
COMMENT ON COLUMN checkpoints.signature IS 'Ed25519 signature for tamper detection';
COMMENT ON COLUMN jwt_blacklist.jti IS 'JWT ID (jti claim) for unique token identification';
COMMENT ON COLUMN jwt_blacklist.token_hash IS 'SHA-256 hash of token for fast lookup';
