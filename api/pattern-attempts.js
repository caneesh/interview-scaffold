/**
 * Pattern Attempts API - Records user pattern selection attempts for analytics
 *
 * POST /api/pattern-attempts
 * Records a pattern selection attempt
 *
 * Body: {
 *   user_id: string,
 *   problem_id: string,
 *   selected_pattern: string,
 *   is_correct: boolean,
 *   attempt_number: number,
 *   time_spent_ms?: number
 * }
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (only if configured)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check if Supabase is configured
  if (!supabase) {
    // Gracefully skip if not configured - this is optional
    return res.status(200).json({
      success: true,
      message: 'Analytics not configured (Supabase not set up)',
      recorded: false
    });
  }

  if (req.method === 'POST') {
    try {
      const {
        user_id,
        problem_id,
        selected_pattern,
        is_correct,
        attempt_number,
        time_spent_ms
      } = req.body;

      // Validate required fields
      if (!user_id || !problem_id || !selected_pattern || typeof is_correct !== 'boolean') {
        return res.status(400).json({
          error: 'Missing required fields: user_id, problem_id, selected_pattern, is_correct'
        });
      }

      // Insert pattern attempt record
      const { data, error } = await supabase
        .from('pattern_attempts')
        .insert([{
          user_id,
          problem_id,
          selected_pattern,
          is_correct,
          attempt_number: attempt_number || 1,
          time_spent_ms: time_spent_ms || null
        }])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        // Don't fail the request if analytics fails - it's not critical
        return res.status(200).json({
          success: true,
          message: 'Analytics recording failed but not critical',
          recorded: false,
          error: error.message
        });
      }

      return res.status(200).json({
        success: true,
        recorded: true,
        data: data[0]
      });

    } catch (error) {
      console.error('Pattern attempts API error:', error);
      return res.status(200).json({
        success: true,
        message: 'Analytics error but not critical',
        recorded: false
      });
    }
  }

  // GET - Retrieve stats for a problem (admin/analytics use)
  if (req.method === 'GET') {
    try {
      const { problem_id } = req.query;

      if (!problem_id) {
        return res.status(400).json({ error: 'Missing problem_id query parameter' });
      }

      // Get pattern selection stats for this problem
      const { data, error } = await supabase
        .from('pattern_attempts')
        .select('selected_pattern, is_correct')
        .eq('problem_id', problem_id);

      if (error) {
        throw error;
      }

      // Aggregate stats
      const stats = data.reduce((acc, attempt) => {
        const pattern = attempt.selected_pattern;
        if (!acc[pattern]) {
          acc[pattern] = { total: 0, correct: 0 };
        }
        acc[pattern].total++;
        if (attempt.is_correct) {
          acc[pattern].correct++;
        }
        return acc;
      }, {});

      return res.status(200).json({
        success: true,
        problem_id,
        total_attempts: data.length,
        stats
      });

    } catch (error) {
      console.error('Pattern stats error:', error);
      return res.status(500).json({ error: 'Failed to retrieve stats' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
