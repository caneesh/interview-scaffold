-- ============================================
-- SUPABASE SCHEMA FOR SCAFFOLDED LEARNING APP
-- ============================================
-- Run this in Supabase SQL Editor to set up all tables

-- ============================================
-- PROFILES TABLE (extends Supabase Auth)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'python',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================
-- PROBLEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS problems (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  description TEXT NOT NULL,

  -- Core metadata (queryable)
  pattern TEXT NOT NULL,
  sub_pattern TEXT,
  estimated_time_minutes INTEGER DEFAULT 15,
  supported_languages TEXT[] DEFAULT ARRAY['python'],
  default_language TEXT DEFAULT 'python',

  -- Complex nested structures (JSONB)
  pattern_selection JSONB,
  interview_question JSONB,
  strategy_step JSONB,
  steps JSONB NOT NULL,
  pattern_graph JSONB,
  mistake_analysis JSONB,

  -- Additional metadata
  concepts TEXT[] DEFAULT ARRAY[]::TEXT[],
  key_takeaways TEXT[] DEFAULT ARRAY[]::TEXT[],
  pattern_explanations JSONB,
  pattern_quiz JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_published BOOLEAN DEFAULT true
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_problems_pattern ON problems(pattern);
CREATE INDEX IF NOT EXISTS idx_problems_published ON problems(is_published) WHERE is_published = true;

-- RLS: Anyone can read published problems
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published problems" ON problems
  FOR SELECT USING (is_published = true);


-- ============================================
-- USER PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,

  -- Phase completion status
  is_pattern_complete BOOLEAN DEFAULT false,
  is_interview_complete BOOLEAN DEFAULT false,
  is_strategy_complete BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,

  -- Pattern phase state
  pattern_attempts INTEGER DEFAULT 0,
  selected_pattern TEXT,

  -- Interview phase state
  selected_approach TEXT,

  -- Strategy phase state
  strategy_text TEXT,
  strategy_hint_level INTEGER DEFAULT 0,
  strategy_validation JSONB,

  -- Coding phase state
  current_step_index INTEGER DEFAULT 0,
  selected_language TEXT DEFAULT 'python',
  user_code_by_step JSONB DEFAULT '{}'::JSONB,
  hints_used_by_step JSONB DEFAULT '{}'::JSONB,

  -- Analytics
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_time_seconds INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, problem_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_problem ON user_progress(problem_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed ON user_progress(user_id) WHERE is_completed = true;

-- RLS: Users can only access their own progress
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON user_progress
  FOR UPDATE USING (auth.uid() = user_id);


-- ============================================
-- USER STATS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  problems_completed INTEGER DEFAULT 0,
  problems_started INTEGER DEFAULT 0,
  total_hints_used INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,

  -- Pattern mastery (JSON map of pattern -> completion count)
  pattern_completions JSONB DEFAULT '{}'::JSONB,

  -- Streak tracking
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  last_activity_date DATE,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own stats" ON user_stats
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own stats" ON user_stats
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stats" ON user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create stats row on profile creation
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_profile();


-- ============================================
-- AI CACHE TABLE (if not already exists)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_cache (
  id SERIAL PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  content JSONB NOT NULL,
  response_type TEXT DEFAULT 'general',
  problem_id TEXT,
  hits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON ai_cache(cache_key);
