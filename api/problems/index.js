/**
 * Vercel Serverless Function - Problems List API
 *
 * Endpoints:
 *   GET /api/problems - Get all published problems
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

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = getSupabase();

  if (!db) {
    // Database not configured - return empty array
    return res.status(200).json({
      success: false,
      message: 'Database not configured',
      data: []
    });
  }

  try {
    // Get query params for filtering
    const { difficulty, pattern } = req.query;

    let query = db
      .from('problems')
      .select('id, title, difficulty, description, pattern, supported_languages, concepts')
      .eq('is_published', true)
      .order('created_at', { ascending: true });

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    if (pattern) {
      query = query.eq('pattern', pattern);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Problems fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch problems' });
    }

    return res.status(200).json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('Problems error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
