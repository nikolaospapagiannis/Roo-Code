-- Migration 003: Self-Learning System Tables
-- Creates tables for pattern recognition, solution caching, and success tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ERROR PATTERNS TABLE
-- Stores recognized error patterns for quick lookup and analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS error_patterns (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_hash        VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 hash of normalized error
    pattern_signature   TEXT NOT NULL,                -- Normalized error pattern
    error_type          VARCHAR(100),                 -- Category (syntax, runtime, type, etc.)
    language            VARCHAR(50),                  -- Programming language
    framework           VARCHAR(100),                 -- Framework/library if applicable
    occurrence_count    INTEGER NOT NULL DEFAULT 1,   -- How many times seen
    first_seen          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_seen           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    confidence_score    DECIMAL(5,4) DEFAULT 0.0,     -- 0.0 to 1.0
    metadata            JSONB DEFAULT '{}',           -- Additional context
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_error_patterns_pattern_hash ON error_patterns(pattern_hash);
CREATE INDEX idx_error_patterns_error_type ON error_patterns(error_type);
CREATE INDEX idx_error_patterns_language ON error_patterns(language);
CREATE INDEX idx_error_patterns_occurrence_count ON error_patterns(occurrence_count DESC);
CREATE INDEX idx_error_patterns_confidence_score ON error_patterns(confidence_score DESC);
CREATE INDEX idx_error_patterns_last_seen ON error_patterns(last_seen DESC);

COMMENT ON TABLE error_patterns IS 'Recognized error patterns for self-learning system';
COMMENT ON COLUMN error_patterns.pattern_hash IS 'SHA-256 hash for fast pattern lookup';
COMMENT ON COLUMN error_patterns.pattern_signature IS 'Normalized error pattern (variables replaced with placeholders)';
COMMENT ON COLUMN error_patterns.occurrence_count IS 'Number of times this pattern has been observed';
COMMENT ON COLUMN error_patterns.confidence_score IS 'Confidence in pattern recognition (0.0-1.0)';

-- ============================================================================
-- SOLUTION CACHE TABLE
-- Stores successful solutions for error patterns
-- ============================================================================

CREATE TABLE IF NOT EXISTS solution_cache (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id          UUID NOT NULL REFERENCES error_patterns(id) ON DELETE CASCADE,
    solution_hash       VARCHAR(64) NOT NULL,         -- SHA-256 hash of solution
    solution_text       TEXT NOT NULL,                -- The actual solution
    solution_type       VARCHAR(50),                  -- Type (fix, workaround, suggestion)
    success_count       INTEGER NOT NULL DEFAULT 0,   -- Times this solution worked
    failure_count       INTEGER NOT NULL DEFAULT 0,   -- Times this solution failed
    success_rate        DECIMAL(5,4) DEFAULT 0.0,     -- Calculated success rate
    avg_resolution_time INTEGER,                      -- Average time to resolve (seconds)
    context_tags        TEXT[] DEFAULT '{}',          -- Contextual tags
    prerequisites       JSONB DEFAULT '[]',           -- Required conditions
    side_effects        JSONB DEFAULT '[]',           -- Known side effects
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_used           TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_solution_cache_pattern_id ON solution_cache(pattern_id);
CREATE INDEX idx_solution_cache_solution_hash ON solution_cache(solution_hash);
CREATE INDEX idx_solution_cache_success_rate ON solution_cache(success_rate DESC);
CREATE INDEX idx_solution_cache_success_count ON solution_cache(success_count DESC);
CREATE INDEX idx_solution_cache_last_used ON solution_cache(last_used DESC);

COMMENT ON TABLE solution_cache IS 'Cached solutions for recognized error patterns';
COMMENT ON COLUMN solution_cache.success_rate IS 'Percentage of successful applications (0.0-1.0)';
COMMENT ON COLUMN solution_cache.avg_resolution_time IS 'Average time to resolve error (seconds)';

-- ============================================================================
-- SOLUTION APPLICATIONS TABLE
-- Tracks when solutions are applied and their outcomes
-- ============================================================================

CREATE TABLE IF NOT EXISTS solution_applications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solution_id         UUID NOT NULL REFERENCES solution_cache(id) ON DELETE CASCADE,
    pattern_id          UUID NOT NULL REFERENCES error_patterns(id) ON DELETE CASCADE,
    user_id             VARCHAR(255),                 -- User who applied solution
    session_id          VARCHAR(255),                 -- Session where applied
    applied_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolution_time     INTEGER,                      -- Time to resolve (seconds)
    outcome             VARCHAR(20) NOT NULL,         -- success, failure, partial
    confidence          DECIMAL(5,4),                 -- Confidence in outcome
    feedback            TEXT,                         -- User feedback
    error_context       JSONB DEFAULT '{}',           -- Error context at time of application
    metadata            JSONB DEFAULT '{}'
);

CREATE INDEX idx_solution_applications_solution_id ON solution_applications(solution_id);
CREATE INDEX idx_solution_applications_pattern_id ON solution_applications(pattern_id);
CREATE INDEX idx_solution_applications_user_id ON solution_applications(user_id);
CREATE INDEX idx_solution_applications_outcome ON solution_applications(outcome);
CREATE INDEX idx_solution_applications_applied_at ON solution_applications(applied_at DESC);

COMMENT ON TABLE solution_applications IS 'Historical record of solution applications and outcomes';
COMMENT ON COLUMN solution_applications.outcome IS 'Result of applying solution: success, failure, partial';

-- ============================================================================
-- LEARNING METRICS TABLE
-- Stores aggregate metrics for the learning system
-- ============================================================================

CREATE TABLE IF NOT EXISTS learning_metrics (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type         VARCHAR(50) NOT NULL,         -- Type of metric
    metric_key          VARCHAR(255) NOT NULL,        -- Specific metric identifier
    metric_value        DECIMAL(15,6),                -- Numeric value
    metric_count        INTEGER DEFAULT 0,            -- Count/frequency
    time_period         VARCHAR(20),                  -- Hour, day, week, month, all
    period_start        TIMESTAMP WITH TIME ZONE,
    period_end          TIMESTAMP WITH TIME ZONE,
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learning_metrics_metric_type ON learning_metrics(metric_type);
CREATE INDEX idx_learning_metrics_metric_key ON learning_metrics(metric_key);
CREATE INDEX idx_learning_metrics_time_period ON learning_metrics(time_period);
CREATE INDEX idx_learning_metrics_period_start ON learning_metrics(period_start);
CREATE UNIQUE INDEX idx_learning_metrics_unique ON learning_metrics(metric_type, metric_key, time_period, period_start);

COMMENT ON TABLE learning_metrics IS 'Aggregate metrics for learning system performance';

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update error_patterns.updated_at on modification
CREATE OR REPLACE FUNCTION update_error_patterns_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_error_patterns_timestamp
    BEFORE UPDATE ON error_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_error_patterns_timestamp();

-- Update solution_cache.updated_at on modification
CREATE OR REPLACE FUNCTION update_solution_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_solution_cache_timestamp
    BEFORE UPDATE ON solution_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_solution_cache_timestamp();

-- Calculate success_rate when solution_cache is updated
CREATE OR REPLACE FUNCTION calculate_success_rate()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.success_count + NEW.failure_count) > 0 THEN
        NEW.success_rate = NEW.success_count::DECIMAL / (NEW.success_count + NEW.failure_count);
    ELSE
        NEW.success_rate = 0.0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_success_rate
    BEFORE INSERT OR UPDATE ON solution_cache
    FOR EACH ROW
    EXECUTE FUNCTION calculate_success_rate();

-- Update learning_metrics.updated_at on modification
CREATE OR REPLACE FUNCTION update_learning_metrics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_learning_metrics_timestamp
    BEFORE UPDATE ON learning_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_learning_metrics_timestamp();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to increment pattern occurrence
CREATE OR REPLACE FUNCTION increment_pattern_occurrence(p_pattern_hash VARCHAR(64))
RETURNS void AS $$
BEGIN
    UPDATE error_patterns
    SET occurrence_count = occurrence_count + 1,
        last_seen = NOW()
    WHERE pattern_hash = p_pattern_hash;
END;
$$ LANGUAGE plpgsql;

-- Function to record solution application
CREATE OR REPLACE FUNCTION record_solution_outcome(
    p_solution_id UUID,
    p_outcome VARCHAR(20)
)
RETURNS void AS $$
BEGIN
    IF p_outcome = 'success' THEN
        UPDATE solution_cache
        SET success_count = success_count + 1,
            last_used = NOW()
        WHERE id = p_solution_id;
    ELSIF p_outcome = 'failure' THEN
        UPDATE solution_cache
        SET failure_count = failure_count + 1,
            last_used = NOW()
        WHERE id = p_solution_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old data
CREATE OR REPLACE FUNCTION cleanup_old_learning_data(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old solution applications
    DELETE FROM solution_applications
    WHERE applied_at < NOW() - INTERVAL '1 day' * days_to_keep;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Delete unused error patterns (no applications in retention period)
    DELETE FROM error_patterns
    WHERE id NOT IN (
        SELECT DISTINCT pattern_id
        FROM solution_applications
        WHERE applied_at > NOW() - INTERVAL '1 day' * days_to_keep
    )
    AND last_seen < NOW() - INTERVAL '1 day' * days_to_keep;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_learning_data IS 'Remove learning data older than specified days (default 90)';

-- ============================================================================
-- INITIAL DATA / SEED
-- ============================================================================

-- Create initial metrics entries
INSERT INTO learning_metrics (metric_type, metric_key, metric_value, metric_count, time_period, metadata)
VALUES
    ('system', 'total_patterns_recognized', 0, 0, 'all', '{"description": "Total error patterns recognized"}'),
    ('system', 'total_solutions_cached', 0, 0, 'all', '{"description": "Total solutions in cache"}'),
    ('system', 'average_success_rate', 0, 0, 'all', '{"description": "Average success rate across all solutions"}')
ON CONFLICT DO NOTHING;

-- Grant permissions (adjust as needed for your user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_user;

COMMENT ON SCHEMA public IS 'Self-Learning System - Pattern Recognition and Solution Caching';
