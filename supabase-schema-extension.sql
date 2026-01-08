-- Schema extension for Phase 2: Core Architecture + Domain
-- Run this after the base supabase-schema.sql

-- ============================================================================
-- Patterns table
-- ============================================================================
CREATE TABLE IF NOT EXISTS patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    time_complexity TEXT NOT NULL,
    space_complexity TEXT NOT NULL,
    primitives JSONB DEFAULT '[]'::jsonb,
    templates JSONB DEFAULT '[]'::jsonb,
    variants JSONB DEFAULT '[]'::jsonb,
    common_mistakes JSONB DEFAULT '[]'::jsonb,
    when_to_use JSONB DEFAULT '[]'::jsonb,
    related_patterns JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_patterns_tenant ON patterns(tenant_id);
CREATE INDEX idx_patterns_category ON patterns(category);
CREATE INDEX idx_patterns_difficulty ON patterns(difficulty);

-- ============================================================================
-- Micro Drills table
-- ============================================================================
CREATE TABLE IF NOT EXISTS micro_drills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    pattern_id UUID REFERENCES patterns(id),
    type TEXT NOT NULL CHECK (type IN ('PATTERN_RECOGNITION', 'CODE_COMPLETION', 'BUG_FIX', 'COMPLEXITY_ANALYSIS', 'EDGE_CASE_IDENTIFICATION')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    prompt TEXT NOT NULL,
    code_snippet JSONB,
    options JSONB,
    expected_answer TEXT,
    hints JSONB DEFAULT '[]'::jsonb,
    explanation TEXT NOT NULL,
    time_budget_sec INTEGER NOT NULL DEFAULT 60,
    tags JSONB DEFAULT '[]'::jsonb,
    "order" INTEGER DEFAULT 0,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_micro_drills_tenant ON micro_drills(tenant_id);
CREATE INDEX idx_micro_drills_pattern ON micro_drills(pattern_id);
CREATE INDEX idx_micro_drills_difficulty ON micro_drills(difficulty);
CREATE INDEX idx_micro_drills_published ON micro_drills(published);

-- ============================================================================
-- Micro Lessons table
-- ============================================================================
CREATE TABLE IF NOT EXISTS micro_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    pattern_id UUID REFERENCES patterns(id),
    type TEXT NOT NULL CHECK (type IN ('CONCEPT_INTRO', 'PATTERN_DEEP_DIVE', 'COMMON_MISTAKES', 'OPTIMIZATION_TIPS')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    sections JSONB DEFAULT '[]'::jsonb,
    quiz JSONB,
    key_takeaways JSONB DEFAULT '[]'::jsonb,
    estimated_time_sec INTEGER NOT NULL DEFAULT 300,
    prerequisites JSONB DEFAULT '[]'::jsonb,
    related_drills JSONB DEFAULT '[]'::jsonb,
    "order" INTEGER DEFAULT 0,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_micro_lessons_tenant ON micro_lessons(tenant_id);
CREATE INDEX idx_micro_lessons_pattern ON micro_lessons(pattern_id);

-- ============================================================================
-- Sessions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    user_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('DAILY', 'PRACTICE', 'REVIEW', 'INTERVIEW_PREP')),
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'COMPLETED', 'ABANDONED')),
    config JSONB NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    current_item_index INTEGER DEFAULT 0,
    metrics JSONB NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_tenant_user ON sessions(tenant_id, user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_type ON sessions(type);

-- ============================================================================
-- Problem Attempts table
-- ============================================================================
CREATE TABLE IF NOT EXISTS problem_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    user_id UUID NOT NULL,
    problem_id UUID NOT NULL,
    session_id UUID REFERENCES sessions(id),
    mode TEXT NOT NULL CHECK (mode IN ('GUIDED', 'EXPLORER', 'INTERVIEW', 'DAILY')),
    status TEXT NOT NULL CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'TIMED_OUT')),
    language TEXT NOT NULL,
    time_budget_sec INTEGER,
    pattern_selection_correct BOOLEAN,
    interview_answer_correct BOOLEAN,
    strategy_score REAL,
    step_attempts JSONB DEFAULT '[]'::jsonb,
    metrics JSONB NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_problem_attempts_tenant_user ON problem_attempts(tenant_id, user_id);
CREATE INDEX idx_problem_attempts_problem ON problem_attempts(problem_id);
CREATE INDEX idx_problem_attempts_session ON problem_attempts(session_id);

-- ============================================================================
-- Drill Attempts table
-- ============================================================================
CREATE TABLE IF NOT EXISTS drill_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    user_id UUID NOT NULL,
    drill_id UUID REFERENCES micro_drills(id),
    session_id UUID REFERENCES sessions(id),
    mode TEXT NOT NULL CHECK (mode IN ('GUIDED', 'EXPLORER', 'INTERVIEW', 'DAILY')),
    status TEXT NOT NULL CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'TIMED_OUT')),
    time_budget_sec INTEGER,
    answer TEXT,
    is_correct BOOLEAN,
    hints_used INTEGER DEFAULT 0,
    time_taken_sec INTEGER,
    errors JSONB DEFAULT '[]'::jsonb,
    confidence_rating TEXT CHECK (confidence_rating IN ('LOW', 'MEDIUM', 'HIGH')),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_drill_attempts_tenant_user ON drill_attempts(tenant_id, user_id);
CREATE INDEX idx_drill_attempts_drill ON drill_attempts(drill_id);

-- ============================================================================
-- Problem Progress table
-- ============================================================================
CREATE TABLE IF NOT EXISTS problem_progress (
    tenant_id TEXT NOT NULL DEFAULT 'default',
    user_id UUID NOT NULL,
    problem_id UUID NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    best_time_sec INTEGER,
    attempt_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    hints_used_total INTEGER DEFAULT 0,
    confidence_level TEXT CHECK (confidence_level IN ('LOW', 'MEDIUM', 'HIGH')),
    mastery_score REAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tenant_id, user_id, problem_id)
);

CREATE INDEX idx_problem_progress_user ON problem_progress(tenant_id, user_id);

-- ============================================================================
-- Pattern Progress table
-- ============================================================================
CREATE TABLE IF NOT EXISTS pattern_progress (
    tenant_id TEXT NOT NULL DEFAULT 'default',
    user_id UUID NOT NULL,
    pattern_id UUID REFERENCES patterns(id),
    problems_completed INTEGER DEFAULT 0,
    problems_total INTEGER DEFAULT 0,
    drills_completed INTEGER DEFAULT 0,
    drills_total INTEGER DEFAULT 0,
    average_accuracy REAL DEFAULT 0,
    average_time_sec REAL DEFAULT 0,
    confidence_level TEXT CHECK (confidence_level IN ('LOW', 'MEDIUM', 'HIGH')),
    mastery_score REAL DEFAULT 0,
    last_practiced_at TIMESTAMPTZ,
    streak INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tenant_id, user_id, pattern_id)
);

CREATE INDEX idx_pattern_progress_user ON pattern_progress(tenant_id, user_id);

-- ============================================================================
-- Drill Progress table
-- ============================================================================
CREATE TABLE IF NOT EXISTS drill_progress (
    tenant_id TEXT NOT NULL DEFAULT 'default',
    user_id UUID NOT NULL,
    drill_id UUID REFERENCES micro_drills(id),
    is_completed BOOLEAN DEFAULT false,
    best_time_sec INTEGER,
    attempt_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tenant_id, user_id, drill_id)
);

CREATE INDEX idx_drill_progress_user ON drill_progress(tenant_id, user_id);

-- ============================================================================
-- User Stats table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_stats (
    tenant_id TEXT NOT NULL DEFAULT 'default',
    user_id UUID NOT NULL,
    total_problems_completed INTEGER DEFAULT 0,
    total_drills_completed INTEGER DEFAULT 0,
    total_time_spent_sec INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_active_at TIMESTAMPTZ,
    preferred_difficulty TEXT CHECK (preferred_difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    strong_patterns JSONB DEFAULT '[]'::jsonb,
    weak_patterns JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tenant_id, user_id)
);

-- ============================================================================
-- Learning Events table (for analytics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    session_id UUID,
    problem_id UUID,
    drill_id UUID,
    pattern_id UUID,
    mode TEXT,
    is_correct BOOLEAN,
    error_type TEXT,
    previous_value REAL,
    new_value REAL,
    confidence_level TEXT
);

CREATE INDEX idx_learning_events_tenant_user ON learning_events(tenant_id, user_id);
CREATE INDEX idx_learning_events_type ON learning_events(type);
CREATE INDEX idx_learning_events_timestamp ON learning_events(timestamp);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE micro_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE micro_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;

-- Public read access for content tables
CREATE POLICY "Public read access" ON patterns FOR SELECT USING (true);
CREATE POLICY "Public read access" ON micro_drills FOR SELECT USING (published = true);
CREATE POLICY "Public read access" ON micro_lessons FOR SELECT USING (published = true);

-- User-specific access for progress/attempt tables
CREATE POLICY "User access" ON sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User access" ON problem_attempts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User access" ON drill_attempts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User access" ON problem_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User access" ON pattern_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User access" ON drill_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User access" ON user_stats FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User insert" ON learning_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User read" ON learning_events FOR SELECT USING (auth.uid() = user_id);
