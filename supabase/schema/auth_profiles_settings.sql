-- ============================================================================
-- Auth Profiles and User Settings Schema
-- Version: 1.0.0
-- Generated: 2026-01-25
--
-- This file contains the profiles and user_settings tables with RLS policies.
-- These tables store user profile information and application preferences.
--
-- SECURITY: Row Level Security enforces that users can only access their own data.
-- Even if the API has bugs, RLS prevents cross-user data access.
--
-- Usage:
--   psql $DATABASE_URL -f supabase/schema/auth_profiles_settings.sql
-- Or via Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PROFILES TABLE
-- Stores user profile information linked to auth.users
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for email lookups (if needed)
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- ============================================================================
-- USER SETTINGS TABLE
-- Stores user application preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_track TEXT NOT NULL DEFAULT 'coding_interview',
  preferred_language TEXT NOT NULL DEFAULT 'javascript',
  ai_coaching_enabled BOOLEAN NOT NULL DEFAULT true,
  hint_budget_daily INTEGER NOT NULL DEFAULT 5,
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- Automatically updates the updated_at timestamp on row updates
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to user_settings table
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUTO-CREATE PROFILE AND SETTINGS ON USER SIGNUP
-- Trigger function that creates profile and settings when a new user signs up
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  -- Create default settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users (only if it doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES RLS POLICIES
-- Users can only select/insert/update their own profile
-- No delete allowed (cascade from auth.users handles deletion)
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_all_service" ON profiles;

-- Select own profile only
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Insert own profile only (id must match auth.uid())
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Update own profile only
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Service role has full access (for admin operations)
CREATE POLICY "profiles_all_service" ON profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- USER SETTINGS RLS POLICIES
-- Users can only select/insert/update their own settings
-- No delete allowed (cascade from auth.users handles deletion)
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "user_settings_select_own" ON user_settings;
DROP POLICY IF EXISTS "user_settings_insert_own" ON user_settings;
DROP POLICY IF EXISTS "user_settings_update_own" ON user_settings;
DROP POLICY IF EXISTS "user_settings_all_service" ON user_settings;

-- Select own settings only
CREATE POLICY "user_settings_select_own" ON user_settings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Insert own settings only (user_id must match auth.uid())
CREATE POLICY "user_settings_insert_own" ON user_settings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Update own settings only
CREATE POLICY "user_settings_update_own" ON user_settings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role has full access (for admin operations)
CREATE POLICY "user_settings_all_service" ON user_settings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant select, insert, update on profiles and user_settings to authenticated users
-- RLS will filter to only their own rows
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_settings TO authenticated;

-- Service role gets full access
GRANT ALL ON profiles TO service_role;
GRANT ALL ON user_settings TO service_role;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
