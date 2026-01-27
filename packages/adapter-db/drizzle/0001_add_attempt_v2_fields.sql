-- Migration: Add Attempt V2 Flow Fields
-- This migration adds columns to support the new 5-step attempt flow:
-- UNDERSTAND -> PLAN -> IMPLEMENT -> VERIFY -> REFLECT -> COMPLETE

-- Add V2 mode (BEGINNER or EXPERT)
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'BEGINNER';

-- Add V2 step tracking (null means legacy flow)
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS v2_step TEXT;

-- Add JSON payloads for each V2 step
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS understand_payload JSONB;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS plan_payload JSONB;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS verify_payload JSONB;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS reflect_payload JSONB;

-- Add hint budget system
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS hint_budget INTEGER NOT NULL DEFAULT 3;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS hints_used_count INTEGER NOT NULL DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN attempts.mode IS 'V2 mode: BEGINNER (more scaffolding) or EXPERT (can skip steps)';
COMMENT ON COLUMN attempts.v2_step IS 'Current V2 step: UNDERSTAND|PLAN|IMPLEMENT|VERIFY|REFLECT|COMPLETE, null for legacy';
COMMENT ON COLUMN attempts.understand_payload IS 'JSON data for UNDERSTAND step: explanation, assessment, followups';
COMMENT ON COLUMN attempts.plan_payload IS 'JSON data for PLAN step: patterns, chosen pattern, invariant';
COMMENT ON COLUMN attempts.verify_payload IS 'JSON data for VERIFY step: test results, failure explanations';
COMMENT ON COLUMN attempts.reflect_payload IS 'JSON data for REFLECT step: cues, summary, micro-lesson';
COMMENT ON COLUMN attempts.hint_budget IS 'Max hints allowed for this attempt (based on rung)';
COMMENT ON COLUMN attempts.hints_used_count IS 'Number of hints used so far';
