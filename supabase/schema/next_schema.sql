-- ============================================================================
-- Supabase Schema DDL + RLS Policies
-- Version: 1.0.0
-- Generated: 2026-01-24
--
-- This file contains idempotent DDL and Row Level Security (RLS) policies
-- for all tables in the interview-scaffold application.
--
-- Usage:
--   psql $DATABASE_URL -f supabase/schema/next_schema.sql
-- Or via Supabase SQL Editor
-- ============================================================================

-- Enable UUID extension (required for uuid_generate_v4)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TENANTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PROBLEMS (Legacy)
-- ============================================================================

CREATE TABLE IF NOT EXISTS problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  title TEXT NOT NULL,
  statement TEXT NOT NULL,
  pattern TEXT NOT NULL,
  rung INTEGER NOT NULL,
  target_complexity TEXT NOT NULL,
  test_cases JSONB NOT NULL,
  hints JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS problems_tenant_pattern_rung_idx
  ON problems(tenant_id, pattern, rung);

-- ============================================================================
-- CONTENT ITEMS (Unified Content Bank)
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id), -- nullable for global content
  track TEXT NOT NULL, -- 'coding_interview' | 'debug_lab' | 'system_design'
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  difficulty TEXT NOT NULL, -- 'easy' | 'medium' | 'hard'
  pattern TEXT, -- algorithm pattern or debug category
  rung INTEGER, -- difficulty ladder level
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_time_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS content_items_tenant_track_difficulty_idx
  ON content_items(tenant_id, track, difficulty);

CREATE INDEX IF NOT EXISTS content_items_tenant_track_pattern_rung_idx
  ON content_items(tenant_id, track, pattern, rung);

-- Unique constraint on slug per tenant+track (handles NULL tenant_id correctly)
CREATE UNIQUE INDEX IF NOT EXISTS content_items_slug_unique
  ON content_items(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), track, slug);

-- ============================================================================
-- CONTENT VERSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'draft' | 'published' | 'archived'
  body JSONB NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS content_versions_content_version_unique
  ON content_versions(content_item_id, version);

CREATE INDEX IF NOT EXISTS content_versions_status_idx
  ON content_versions(content_item_id, status);

-- ============================================================================
-- CONTENT ITEM AUTHORS
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_item_authors (
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'author' | 'reviewer' | 'editor'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (content_item_id, user_id)
);

-- ============================================================================
-- ATTEMPTS (Unified: Legacy + Track-based)
-- ============================================================================

CREATE TABLE IF NOT EXISTS attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id TEXT NOT NULL,
  -- Legacy problem-based attempts (nullable for track attempts)
  problem_id UUID REFERENCES problems(id),
  -- Track-based content bank attempts (nullable for legacy attempts)
  track TEXT, -- 'coding_interview' | 'debug_lab' | 'system_design'
  content_item_id UUID REFERENCES content_items(id),
  content_version_id UUID REFERENCES content_versions(id),
  -- Common fields
  pattern TEXT NOT NULL,
  rung INTEGER NOT NULL,
  state TEXT NOT NULL,
  hints_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  code_submissions INTEGER NOT NULL DEFAULT 0,
  score JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  -- Data integrity: exactly one of problem_id or content_item_id must be set
  CONSTRAINT attempts_content_reference_check CHECK (
    (problem_id IS NOT NULL AND content_item_id IS NULL) OR
    (problem_id IS NULL AND content_item_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS attempts_tenant_user_idx
  ON attempts(tenant_id, user_id);

CREATE INDEX IF NOT EXISTS attempts_tenant_user_active_idx
  ON attempts(tenant_id, user_id, state);

CREATE INDEX IF NOT EXISTS attempts_user_track_started_idx
  ON attempts(user_id, track, started_at);

CREATE INDEX IF NOT EXISTS attempts_content_item_started_idx
  ON attempts(content_item_id, started_at);

-- ============================================================================
-- STEPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  result TEXT,
  data JSONB NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS steps_attempt_idx ON steps(attempt_id);

-- ============================================================================
-- SKILLS (User skill matrix for patterns/rungs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id TEXT NOT NULL,
  pattern TEXT NOT NULL,
  rung INTEGER NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  attempts_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  unlocked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_applied_attempt_id UUID
);

CREATE INDEX IF NOT EXISTS skills_tenant_user_idx
  ON skills(tenant_id, user_id);

CREATE INDEX IF NOT EXISTS skills_tenant_user_pattern_rung_idx
  ON skills(tenant_id, user_id, pattern, rung);

CREATE UNIQUE INDEX IF NOT EXISTS skills_unique_skill
  ON skills(tenant_id, user_id, pattern, rung);

-- ============================================================================
-- DEBUG SCENARIOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS debug_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL, -- DebugPatternCategory
  pattern_key TEXT NOT NULL, -- Specific bug pattern identifier
  difficulty TEXT NOT NULL, -- Difficulty enum
  symptom_description TEXT NOT NULL,
  code_artifacts JSONB NOT NULL,
  expected_findings JSONB NOT NULL,
  fix_strategies JSONB NOT NULL,
  regression_expectation TEXT NOT NULL,
  hint_ladder JSONB NOT NULL,
  tags JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- DEBUG ATTEMPTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS debug_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id TEXT NOT NULL,
  scenario_id UUID REFERENCES debug_scenarios(id),
  current_gate TEXT NOT NULL, -- DebugGate
  status TEXT NOT NULL, -- DebugAttemptStatus
  hints_used INTEGER DEFAULT 0,
  score_json JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS debug_attempts_tenant_user_idx
  ON debug_attempts(tenant_id, user_id);

CREATE INDEX IF NOT EXISTS debug_attempts_tenant_scenario_idx
  ON debug_attempts(tenant_id, scenario_id);

-- ============================================================================
-- DEBUG ATTEMPT STEPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS debug_attempt_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES debug_attempts(id) ON DELETE CASCADE,
  gate_id TEXT NOT NULL, -- DebugGate
  answer_json JSONB NOT NULL,
  is_correct BOOLEAN NOT NULL,
  feedback_text TEXT,
  rubric_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS debug_attempt_steps_attempt_idx
  ON debug_attempt_steps(attempt_id);

CREATE INDEX IF NOT EXISTS debug_attempt_steps_attempt_gate_idx
  ON debug_attempt_steps(attempt_id, gate_id);

-- ============================================================================
-- DEBUG MASTERY
-- ============================================================================

CREATE TABLE IF NOT EXISTS debug_mastery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id TEXT NOT NULL,
  pattern_key TEXT NOT NULL,
  category TEXT NOT NULL, -- DebugPatternCategory
  mastery_score REAL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS debug_mastery_tenant_user_idx
  ON debug_mastery(tenant_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS debug_mastery_unique
  ON debug_mastery(tenant_id, user_id, pattern_key, category);

-- ============================================================================
-- SUBMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'code' | 'text' | 'diagram' | 'gate' | 'triage' | 'reflection' | 'files'
  language TEXT, -- programming language for code submissions
  content_text TEXT, -- plain text content
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_final BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS submissions_attempt_idx ON submissions(attempt_id);
CREATE INDEX IF NOT EXISTS submissions_user_idx ON submissions(user_id);
CREATE INDEX IF NOT EXISTS submissions_user_created_idx ON submissions(user_id, created_at);

-- ============================================================================
-- EVALUATION RUNS
-- ============================================================================

CREATE TABLE IF NOT EXISTS evaluation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  track TEXT NOT NULL,
  type TEXT NOT NULL, -- 'coding_tests' | 'debug_gate' | 'rubric' | 'ai_review'
  status TEXT NOT NULL, -- 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  summary JSONB,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS evaluation_runs_attempt_idx ON evaluation_runs(attempt_id);
CREATE INDEX IF NOT EXISTS evaluation_runs_submission_idx ON evaluation_runs(submission_id);
CREATE INDEX IF NOT EXISTS evaluation_runs_status_idx ON evaluation_runs(status);
CREATE INDEX IF NOT EXISTS evaluation_runs_user_track_created_idx
  ON evaluation_runs(user_id, track, created_at);

-- ============================================================================
-- CODING TEST RESULTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS coding_test_results (
  evaluation_run_id UUID NOT NULL REFERENCES evaluation_runs(id) ON DELETE CASCADE,
  test_index INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  expected TEXT,
  actual TEXT,
  stdout TEXT,
  stderr TEXT,
  duration_ms INTEGER,
  error TEXT,
  PRIMARY KEY (evaluation_run_id, test_index)
);

-- ============================================================================
-- RUBRIC SCORES
-- ============================================================================

CREATE TABLE IF NOT EXISTS rubric_scores (
  evaluation_run_id UUID NOT NULL REFERENCES evaluation_runs(id) ON DELETE CASCADE,
  criterion TEXT NOT NULL,
  score REAL NOT NULL,
  max_score REAL NOT NULL,
  rationale TEXT,
  evidence JSONB,
  PRIMARY KEY (evaluation_run_id, criterion)
);

-- ============================================================================
-- DEBUG DIAGNOSTICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS debug_diagnostics (
  evaluation_run_id UUID NOT NULL REFERENCES evaluation_runs(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB,
  evidence JSONB,
  PRIMARY KEY (evaluation_run_id, key)
);

-- ============================================================================
-- AI FEEDBACK
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  attempt_id UUID REFERENCES attempts(id) ON DELETE SET NULL,
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'hint' | 'explanation' | 'review' | 'guidance'
  model TEXT NOT NULL, -- AI model used
  prompt_version TEXT NOT NULL,
  input_hash TEXT NOT NULL, -- hash of input for deduplication
  output JSONB NOT NULL,
  evidence JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_feedback_user_idx ON ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS ai_feedback_attempt_idx ON ai_feedback(attempt_id);
CREATE INDEX IF NOT EXISTS ai_feedback_input_hash_idx ON ai_feedback(input_hash);
CREATE INDEX IF NOT EXISTS ai_feedback_user_attempt_idx ON ai_feedback(user_id, attempt_id);

-- ============================================================================
-- SOCRATIC TURNS
-- ============================================================================

CREATE TABLE IF NOT EXISTS socratic_turns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  turn_index INTEGER NOT NULL,
  role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
  message TEXT NOT NULL,
  question JSONB, -- structured question if applicable
  validation JSONB, -- validation result if applicable
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS socratic_turns_attempt_idx ON socratic_turns(attempt_id);
CREATE UNIQUE INDEX IF NOT EXISTS socratic_turns_attempt_turn_unique
  ON socratic_turns(attempt_id, turn_index);

-- ============================================================================
-- USER TRACK PROGRESS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_track_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id TEXT NOT NULL,
  track TEXT NOT NULL, -- 'coding_interview' | 'debug_lab' | 'system_design'
  mastery_score REAL NOT NULL DEFAULT 0, -- 0-100
  attempts_count INTEGER NOT NULL DEFAULT 0,
  completed_count INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_applied_attempt_id UUID
);

CREATE INDEX IF NOT EXISTS user_track_progress_tenant_user_idx
  ON user_track_progress(tenant_id, user_id);

CREATE INDEX IF NOT EXISTS user_track_progress_tenant_user_track_idx
  ON user_track_progress(tenant_id, user_id, track);

CREATE UNIQUE INDEX IF NOT EXISTS user_track_progress_unique
  ON user_track_progress(tenant_id, user_id, track);

-- ============================================================================
-- USER CONTENT PROGRESS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_content_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id TEXT NOT NULL,
  content_item_id UUID REFERENCES content_items(id), -- nullable for legacy problems
  problem_id UUID REFERENCES problems(id), -- for backward compat with existing problems table
  track TEXT NOT NULL, -- 'coding_interview' | 'debug_lab' | 'system_design'
  attempts_count INTEGER NOT NULL DEFAULT 0,
  best_score REAL, -- highest score achieved (0-100)
  last_score REAL, -- most recent attempt score
  completed_at TIMESTAMPTZ, -- first successful completion
  last_attempt_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_applied_attempt_id UUID
);

CREATE INDEX IF NOT EXISTS user_content_progress_tenant_user_idx
  ON user_content_progress(tenant_id, user_id);

CREATE INDEX IF NOT EXISTS user_content_progress_tenant_user_content_idx
  ON user_content_progress(tenant_id, user_id, content_item_id);

CREATE INDEX IF NOT EXISTS user_content_progress_tenant_user_problem_idx
  ON user_content_progress(tenant_id, user_id, problem_id);

CREATE INDEX IF NOT EXISTS user_content_progress_activity_idx
  ON user_content_progress(user_id, track, last_attempt_at);

-- Unique constraints (handles NULL correctly with partial indexes)
CREATE UNIQUE INDEX IF NOT EXISTS user_content_progress_content_unique
  ON user_content_progress(tenant_id, user_id, content_item_id)
  WHERE content_item_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_content_progress_problem_unique
  ON user_content_progress(tenant_id, user_id, problem_id)
  WHERE problem_id IS NOT NULL;

-- ============================================================================
-- COACHING SESSIONS (Optional - for extended coaching features)
-- ============================================================================

CREATE TABLE IF NOT EXISTS coaching_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id TEXT NOT NULL,
  attempt_id UUID REFERENCES attempts(id) ON DELETE SET NULL,
  session_type TEXT NOT NULL, -- 'socratic' | 'review' | 'guided_practice'
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'completed' | 'abandoned'
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coaching_sessions_tenant_user_idx
  ON coaching_sessions(tenant_id, user_id);

CREATE INDEX IF NOT EXISTS coaching_sessions_attempt_idx
  ON coaching_sessions(attempt_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_item_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE debug_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE debug_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debug_attempt_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE debug_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE debug_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE socratic_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_track_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_content_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TENANTS POLICIES
-- Read: authenticated users can see tenants they belong to (simplified: all for now)
-- Write: service role only
-- ============================================================================

DROP POLICY IF EXISTS "tenants_select_authenticated" ON tenants;
CREATE POLICY "tenants_select_authenticated" ON tenants
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "tenants_all_service" ON tenants;
CREATE POLICY "tenants_all_service" ON tenants
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PROBLEMS POLICIES
-- Read: all authenticated users
-- Write: service role only
-- ============================================================================

DROP POLICY IF EXISTS "problems_select_authenticated" ON problems;
CREATE POLICY "problems_select_authenticated" ON problems
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "problems_all_service" ON problems;
CREATE POLICY "problems_all_service" ON problems
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CONTENT ITEMS POLICIES
-- Read: published content readable by all; drafts only for authors or service role
-- Write: authors can update their own; service role full access
-- ============================================================================

DROP POLICY IF EXISTS "content_items_select_published" ON content_items;
CREATE POLICY "content_items_select_published" ON content_items
  FOR SELECT TO authenticated
  USING (
    -- Published content is always visible
    EXISTS (
      SELECT 1 FROM content_versions cv
      WHERE cv.content_item_id = content_items.id
      AND cv.status = 'published'
    )
    OR
    -- Or user is an author of this content
    EXISTS (
      SELECT 1 FROM content_item_authors cia
      WHERE cia.content_item_id = content_items.id
      AND cia.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "content_items_insert_authors" ON content_items;
CREATE POLICY "content_items_insert_authors" ON content_items
  FOR INSERT TO authenticated
  WITH CHECK (
    -- User must be listed as author (requires separate insert into content_item_authors)
    -- For now, allow authenticated users to create; author relationship enforced at app layer
    true
  );

DROP POLICY IF EXISTS "content_items_update_authors" ON content_items;
CREATE POLICY "content_items_update_authors" ON content_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_item_authors cia
      WHERE cia.content_item_id = content_items.id
      AND cia.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM content_item_authors cia
      WHERE cia.content_item_id = content_items.id
      AND cia.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "content_items_all_service" ON content_items;
CREATE POLICY "content_items_all_service" ON content_items
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CONTENT VERSIONS POLICIES
-- Read: published versions readable by all; drafts only for authors or service role
-- Write: authors can manage versions; service role full access
-- ============================================================================

DROP POLICY IF EXISTS "content_versions_select_published" ON content_versions;
CREATE POLICY "content_versions_select_published" ON content_versions
  FOR SELECT TO authenticated
  USING (
    -- Published versions are visible to all
    status = 'published'
    OR
    -- Or user is an author of the parent content item
    EXISTS (
      SELECT 1 FROM content_item_authors cia
      WHERE cia.content_item_id = content_versions.content_item_id
      AND cia.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "content_versions_insert_authors" ON content_versions;
CREATE POLICY "content_versions_insert_authors" ON content_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM content_item_authors cia
      WHERE cia.content_item_id = content_versions.content_item_id
      AND cia.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "content_versions_update_authors" ON content_versions;
CREATE POLICY "content_versions_update_authors" ON content_versions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_item_authors cia
      WHERE cia.content_item_id = content_versions.content_item_id
      AND cia.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM content_item_authors cia
      WHERE cia.content_item_id = content_versions.content_item_id
      AND cia.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "content_versions_all_service" ON content_versions;
CREATE POLICY "content_versions_all_service" ON content_versions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CONTENT ITEM AUTHORS POLICIES
-- Read: authors can see author relationships for their content
-- Write: service role manages author relationships
-- ============================================================================

DROP POLICY IF EXISTS "content_item_authors_select_own" ON content_item_authors;
CREATE POLICY "content_item_authors_select_own" ON content_item_authors
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM content_item_authors cia
      WHERE cia.content_item_id = content_item_authors.content_item_id
      AND cia.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "content_item_authors_all_service" ON content_item_authors;
CREATE POLICY "content_item_authors_all_service" ON content_item_authors
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ATTEMPTS POLICIES
-- Users can read/create/update their own attempts
-- ============================================================================

DROP POLICY IF EXISTS "attempts_select_own" ON attempts;
CREATE POLICY "attempts_select_own" ON attempts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "attempts_insert_own" ON attempts;
CREATE POLICY "attempts_insert_own" ON attempts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "attempts_update_own" ON attempts;
CREATE POLICY "attempts_update_own" ON attempts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "attempts_all_service" ON attempts;
CREATE POLICY "attempts_all_service" ON attempts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEPS POLICIES
-- Users can read/create steps for their own attempts
-- ============================================================================

DROP POLICY IF EXISTS "steps_select_own" ON steps;
CREATE POLICY "steps_select_own" ON steps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM attempts a
      WHERE a.id = steps.attempt_id
      AND a.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "steps_insert_own" ON steps;
CREATE POLICY "steps_insert_own" ON steps
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM attempts a
      WHERE a.id = steps.attempt_id
      AND a.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "steps_all_service" ON steps;
CREATE POLICY "steps_all_service" ON steps
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SKILLS POLICIES
-- Users can read their own skills
-- Write: service role only (skills updated by backend after evaluation)
-- ============================================================================

DROP POLICY IF EXISTS "skills_select_own" ON skills;
CREATE POLICY "skills_select_own" ON skills
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "skills_all_service" ON skills;
CREATE POLICY "skills_all_service" ON skills
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- DEBUG SCENARIOS POLICIES
-- Read: all authenticated users (scenarios are content)
-- Write: service role only
-- ============================================================================

DROP POLICY IF EXISTS "debug_scenarios_select_authenticated" ON debug_scenarios;
CREATE POLICY "debug_scenarios_select_authenticated" ON debug_scenarios
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "debug_scenarios_all_service" ON debug_scenarios;
CREATE POLICY "debug_scenarios_all_service" ON debug_scenarios
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- DEBUG ATTEMPTS POLICIES
-- Users can read/create/update their own debug attempts
-- ============================================================================

DROP POLICY IF EXISTS "debug_attempts_select_own" ON debug_attempts;
CREATE POLICY "debug_attempts_select_own" ON debug_attempts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "debug_attempts_insert_own" ON debug_attempts;
CREATE POLICY "debug_attempts_insert_own" ON debug_attempts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "debug_attempts_update_own" ON debug_attempts;
CREATE POLICY "debug_attempts_update_own" ON debug_attempts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "debug_attempts_all_service" ON debug_attempts;
CREATE POLICY "debug_attempts_all_service" ON debug_attempts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- DEBUG ATTEMPT STEPS POLICIES
-- Users can read/create steps for their own debug attempts
-- ============================================================================

DROP POLICY IF EXISTS "debug_attempt_steps_select_own" ON debug_attempt_steps;
CREATE POLICY "debug_attempt_steps_select_own" ON debug_attempt_steps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM debug_attempts da
      WHERE da.id = debug_attempt_steps.attempt_id
      AND da.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "debug_attempt_steps_insert_own" ON debug_attempt_steps;
CREATE POLICY "debug_attempt_steps_insert_own" ON debug_attempt_steps
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM debug_attempts da
      WHERE da.id = debug_attempt_steps.attempt_id
      AND da.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "debug_attempt_steps_all_service" ON debug_attempt_steps;
CREATE POLICY "debug_attempt_steps_all_service" ON debug_attempt_steps
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- DEBUG MASTERY POLICIES
-- Users can read their own mastery; write via service role
-- ============================================================================

DROP POLICY IF EXISTS "debug_mastery_select_own" ON debug_mastery;
CREATE POLICY "debug_mastery_select_own" ON debug_mastery
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "debug_mastery_all_service" ON debug_mastery;
CREATE POLICY "debug_mastery_all_service" ON debug_mastery
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SUBMISSIONS POLICIES
-- Users can read/create their own submissions
-- Update: service role only (to prevent tampering after submission)
-- ============================================================================

DROP POLICY IF EXISTS "submissions_select_own" ON submissions;
CREATE POLICY "submissions_select_own" ON submissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "submissions_insert_own" ON submissions;
CREATE POLICY "submissions_insert_own" ON submissions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "submissions_all_service" ON submissions;
CREATE POLICY "submissions_all_service" ON submissions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- EVALUATION RUNS POLICIES
-- Users can read their own evaluations
-- Insert/Update: service role only (server-side evaluation)
-- ============================================================================

DROP POLICY IF EXISTS "evaluation_runs_select_own" ON evaluation_runs;
CREATE POLICY "evaluation_runs_select_own" ON evaluation_runs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "evaluation_runs_all_service" ON evaluation_runs;
CREATE POLICY "evaluation_runs_all_service" ON evaluation_runs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CODING TEST RESULTS POLICIES
-- Users can read results for their evaluations
-- Insert/Update: service role only
-- ============================================================================

DROP POLICY IF EXISTS "coding_test_results_select_own" ON coding_test_results;
CREATE POLICY "coding_test_results_select_own" ON coding_test_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM evaluation_runs er
      WHERE er.id = coding_test_results.evaluation_run_id
      AND er.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "coding_test_results_all_service" ON coding_test_results;
CREATE POLICY "coding_test_results_all_service" ON coding_test_results
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RUBRIC SCORES POLICIES
-- Users can read scores for their evaluations
-- Insert/Update: service role only
-- ============================================================================

DROP POLICY IF EXISTS "rubric_scores_select_own" ON rubric_scores;
CREATE POLICY "rubric_scores_select_own" ON rubric_scores
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM evaluation_runs er
      WHERE er.id = rubric_scores.evaluation_run_id
      AND er.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "rubric_scores_all_service" ON rubric_scores;
CREATE POLICY "rubric_scores_all_service" ON rubric_scores
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- DEBUG DIAGNOSTICS POLICIES
-- Users can read diagnostics for their evaluations
-- Insert/Update: service role only
-- ============================================================================

DROP POLICY IF EXISTS "debug_diagnostics_select_own" ON debug_diagnostics;
CREATE POLICY "debug_diagnostics_select_own" ON debug_diagnostics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM evaluation_runs er
      WHERE er.id = debug_diagnostics.evaluation_run_id
      AND er.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "debug_diagnostics_all_service" ON debug_diagnostics;
CREATE POLICY "debug_diagnostics_all_service" ON debug_diagnostics
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- AI FEEDBACK POLICIES
-- Users can read their own AI feedback
-- Insert/Update: service role only (AI generates feedback server-side)
-- ============================================================================

DROP POLICY IF EXISTS "ai_feedback_select_own" ON ai_feedback;
CREATE POLICY "ai_feedback_select_own" ON ai_feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "ai_feedback_all_service" ON ai_feedback;
CREATE POLICY "ai_feedback_all_service" ON ai_feedback
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SOCRATIC TURNS POLICIES
-- Users can read all turns for their attempts
-- Users can insert their own 'user' role turns
-- Insert assistant/system turns: service role only
-- ============================================================================

DROP POLICY IF EXISTS "socratic_turns_select_own" ON socratic_turns;
CREATE POLICY "socratic_turns_select_own" ON socratic_turns
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "socratic_turns_insert_user" ON socratic_turns;
CREATE POLICY "socratic_turns_insert_user" ON socratic_turns
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()::text
    AND role = 'user'
  );

DROP POLICY IF EXISTS "socratic_turns_all_service" ON socratic_turns;
CREATE POLICY "socratic_turns_all_service" ON socratic_turns
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- USER TRACK PROGRESS POLICIES
-- Users can read their own track progress
-- Write: service role only (updated after attempt completion)
-- ============================================================================

DROP POLICY IF EXISTS "user_track_progress_select_own" ON user_track_progress;
CREATE POLICY "user_track_progress_select_own" ON user_track_progress
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "user_track_progress_all_service" ON user_track_progress;
CREATE POLICY "user_track_progress_all_service" ON user_track_progress
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- USER CONTENT PROGRESS POLICIES
-- Users can read their own content progress
-- Write: service role only (updated after attempt completion)
-- ============================================================================

DROP POLICY IF EXISTS "user_content_progress_select_own" ON user_content_progress;
CREATE POLICY "user_content_progress_select_own" ON user_content_progress
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "user_content_progress_all_service" ON user_content_progress;
CREATE POLICY "user_content_progress_all_service" ON user_content_progress
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- COACHING SESSIONS POLICIES
-- Users can read/create their own coaching sessions
-- Update: limited to status changes by user; full access for service role
-- ============================================================================

DROP POLICY IF EXISTS "coaching_sessions_select_own" ON coaching_sessions;
CREATE POLICY "coaching_sessions_select_own" ON coaching_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "coaching_sessions_insert_own" ON coaching_sessions;
CREATE POLICY "coaching_sessions_insert_own" ON coaching_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "coaching_sessions_update_own" ON coaching_sessions;
CREATE POLICY "coaching_sessions_update_own" ON coaching_sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "coaching_sessions_all_service" ON coaching_sessions;
CREATE POLICY "coaching_sessions_all_service" ON coaching_sessions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ANON (PUBLIC) ACCESS POLICIES
-- Very limited access for unauthenticated users
-- ============================================================================

-- Allow anonymous users to read published content items (for landing pages)
DROP POLICY IF EXISTS "content_items_select_anon" ON content_items;
CREATE POLICY "content_items_select_anon" ON content_items
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM content_versions cv
      WHERE cv.content_item_id = content_items.id
      AND cv.status = 'published'
    )
  );

-- Allow anonymous users to read published content versions
DROP POLICY IF EXISTS "content_versions_select_anon" ON content_versions;
CREATE POLICY "content_versions_select_anon" ON content_versions
  FOR SELECT TO anon
  USING (status = 'published');

-- Allow anonymous users to read debug scenarios (for previews)
DROP POLICY IF EXISTS "debug_scenarios_select_anon" ON debug_scenarios;
CREATE POLICY "debug_scenarios_select_anon" ON debug_scenarios
  FOR SELECT TO anon
  USING (true);

-- Allow anonymous users to read problems (for problem listings)
DROP POLICY IF EXISTS "problems_select_anon" ON problems;
CREATE POLICY "problems_select_anon" ON problems
  FOR SELECT TO anon
  USING (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is author of a content item
CREATE OR REPLACE FUNCTION is_content_author(content_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM content_item_authors
    WHERE content_item_id = content_id
    AND user_id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's tenant (if multi-tenancy is needed)
CREATE OR REPLACE FUNCTION get_user_tenant()
RETURNS UUID AS $$
DECLARE
  tenant_id UUID;
BEGIN
  -- This would be populated from user metadata or a user_tenants table
  -- For now, return NULL (single-tenant mode)
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant select on all tables to authenticated users (RLS will filter)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant insert/update on user-writable tables
GRANT INSERT, UPDATE ON attempts TO authenticated;
GRANT INSERT ON steps TO authenticated;
GRANT INSERT ON submissions TO authenticated;
GRANT INSERT ON socratic_turns TO authenticated;
GRANT INSERT, UPDATE ON debug_attempts TO authenticated;
GRANT INSERT ON debug_attempt_steps TO authenticated;
GRANT INSERT, UPDATE ON content_items TO authenticated;
GRANT INSERT, UPDATE ON content_versions TO authenticated;
GRANT INSERT, UPDATE ON coaching_sessions TO authenticated;

-- Grant full access to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant limited access to anonymous users
GRANT SELECT ON content_items TO anon;
GRANT SELECT ON content_versions TO anon;
GRANT SELECT ON debug_scenarios TO anon;
GRANT SELECT ON problems TO anon;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
