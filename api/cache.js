/**
 * Vercel Serverless Function - Cache API
 *
 * Handles read-through caching with Supabase.
 * Endpoints:
 *   GET  /api/cache?key=xxx     - Get cached value
 *   POST /api/cache             - Set cached value
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const db = getSupabase();

  if (!db) {
    // Cache not configured - return null (will fall through to API)
    return res.status(200).json({ cached: false, data: null });
  }

  try {
    // GET - Retrieve from cache
    if (req.method === 'GET') {
      const { key } = req.query;

      if (!key) {
        return res.status(400).json({ error: 'Cache key required' });
      }

      const { data, error } = await db
        .from('ai_cache')
        .select('content, created_at')
        .eq('cache_key', key)
        .single();

      if (error || !data) {
        return res.status(200).json({ cached: false, data: null });
      }

      // Update hit count (fire and forget)
      db.from('ai_cache')
        .update({ hits: db.raw('hits + 1') })
        .eq('cache_key', key)
        .then(() => {});

      return res.status(200).json({
        cached: true,
        data: data.content,
        cachedAt: data.created_at
      });
    }

    // POST - Store in cache
    if (req.method === 'POST') {
      const { key, content, type, problemId } = req.body;

      if (!key || !content) {
        return res.status(400).json({ error: 'Key and content required' });
      }

      const { error } = await db
        .from('ai_cache')
        .upsert({
          cache_key: key,
          content: content,
          response_type: type || 'general',
          problem_id: problemId || null,
          created_at: new Date().toISOString(),
          hits: 0
        }, {
          onConflict: 'cache_key'
        });

      if (error) {
        console.error('Cache write error:', error);
        return res.status(500).json({ error: 'Failed to cache' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Cache error:', error);
    return res.status(500).json({ error: 'Cache operation failed' });
  }
}
