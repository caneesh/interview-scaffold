/**
 * Vercel Serverless Function - Single Problem API
 *
 * Endpoints:
 *   GET /api/problems/:id - Get a single problem with all data
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

// Transform database format to frontend format
function transformProblem(dbProblem) {
  return {
    id: dbProblem.id,
    title: dbProblem.title,
    difficulty: dbProblem.difficulty,
    description: dbProblem.description,
    supportedLanguages: dbProblem.supported_languages || ['python'],
    defaultLanguage: dbProblem.default_language || 'python',
    patternSelection: dbProblem.pattern_selection,
    interviewQuestion: dbProblem.interview_question,
    strategyStep: dbProblem.strategy_step,
    steps: dbProblem.steps || [],
    patternGraph: dbProblem.pattern_graph,
    mistakeAnalysis: dbProblem.mistake_analysis,
    concepts: (dbProblem.concepts || []).map(name => ({ name })),
    keyTakeaways: dbProblem.key_takeaways || [],
    patternExplanations: dbProblem.pattern_explanations,
    patternQuiz: dbProblem.pattern_quiz,
  };
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

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Problem ID required' });
  }

  const db = getSupabase();

  if (!db) {
    return res.status(200).json({
      success: false,
      message: 'Database not configured',
      data: null
    });
  }

  try {
    const { data, error } = await db
      .from('problems')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Problem not found' });
      }
      console.error('Problem fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch problem' });
    }

    return res.status(200).json({
      success: true,
      data: transformProblem(data)
    });

  } catch (error) {
    console.error('Problem error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
