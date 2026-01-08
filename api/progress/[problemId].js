/**
 * Vercel Serverless Function - User Progress API
 *
 * Endpoints:
 *   GET  /api/progress/:problemId - Get user's progress on a problem
 *   PUT  /api/progress/:problemId - Save user's progress on a problem
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;

function getSupabase() {
  if (!supabase && supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

// Extract and verify user from Authorization header
async function getUserFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const db = getSupabase();
  if (!db) return null;

  try {
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const db = getSupabase();

  if (!db) {
    return res.status(200).json({
      success: false,
      message: 'Database not configured',
      data: null
    });
  }

  // Authenticate user
  const user = await getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { problemId } = req.query;
  if (!problemId) {
    return res.status(400).json({ error: 'Problem ID required' });
  }

  try {
    // GET - Retrieve progress
    if (req.method === 'GET') {
      const { data, error } = await db
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('problem_id', problemId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No progress found - return null
          return res.status(200).json({ success: true, data: null });
        }
        throw error;
      }

      return res.status(200).json({ success: true, data });
    }

    // PUT - Save progress
    if (req.method === 'PUT') {
      const progress = req.body;

      // Validate required fields
      if (!progress || typeof progress !== 'object') {
        return res.status(400).json({ error: 'Invalid progress data' });
      }

      const now = new Date().toISOString();

      // Prepare data for upsert
      const progressData = {
        user_id: user.id,
        problem_id: problemId,
        is_pattern_complete: progress.is_pattern_complete ?? false,
        is_interview_complete: progress.is_interview_complete ?? false,
        is_strategy_complete: progress.is_strategy_complete ?? false,
        is_completed: progress.is_completed ?? false,
        pattern_attempts: progress.pattern_attempts ?? 0,
        selected_pattern: progress.selected_pattern ?? null,
        selected_approach: progress.selected_approach ?? null,
        strategy_text: progress.strategy_text ?? null,
        strategy_hint_level: progress.strategy_hint_level ?? 0,
        current_step_index: progress.current_step_index ?? 0,
        selected_language: progress.selected_language ?? 'python',
        user_code_by_step: progress.user_code_by_step ?? {},
        hints_used_by_step: progress.hints_used_by_step ?? {},
        updated_at: now,
      };

      // Set completed_at timestamp if newly completed
      if (progress.is_completed && !progress.completed_at) {
        progressData.completed_at = now;
      }

      const { data, error } = await db
        .from('user_progress')
        .upsert(progressData, {
          onConflict: 'user_id,problem_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Progress save error:', error);
        return res.status(500).json({ error: 'Failed to save progress' });
      }

      return res.status(200).json({ success: true, data });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Progress error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
