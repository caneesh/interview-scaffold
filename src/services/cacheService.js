/**
 * Cache Service - Read-Through Cache for AI Responses
 *
 * Reduces API costs by caching reusable AI responses.
 * First request hits Claude API → stored in Supabase.
 * Subsequent requests served from cache.
 *
 * Usage:
 *   const result = await withCache('explain:two-pointers', () => callClaude(...));
 */

const CACHE_API = '/api/cache';

// Check if caching is available (in production with Supabase configured)
const isCacheEnabled = import.meta.env.PROD;

/**
 * Get value from cache
 */
async function getFromCache(key) {
  if (!isCacheEnabled) return null;

  try {
    const response = await fetch(`${CACHE_API}?key=${encodeURIComponent(key)}`);
    const result = await response.json();

    if (result.cached && result.data) {
      console.log(`[Cache] HIT: ${key}`);
      return result.data;
    }

    console.log(`[Cache] MISS: ${key}`);
    return null;
  } catch (error) {
    console.warn('[Cache] Read error:', error);
    return null;
  }
}

/**
 * Store value in cache
 */
async function setInCache(key, content, options = {}) {
  if (!isCacheEnabled) return;

  try {
    await fetch(CACHE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key,
        content,
        type: options.type || 'general',
        problemId: options.problemId || null
      })
    });
    console.log(`[Cache] STORED: ${key}`);
  } catch (error) {
    console.warn('[Cache] Write error:', error);
  }
}

/**
 * Read-through cache wrapper
 *
 * @param {string} cacheKey - Unique key for this cached item
 * @param {Function} fetchFn - Async function to call if cache misses
 * @param {Object} options - Optional: type, problemId
 * @returns {Promise<any>} - Cached or fresh result
 *
 * @example
 * const explanation = await withCache(
 *   'explain:two-pointers',
 *   () => callClaude(systemPrompt, userMessage),
 *   { type: 'explanation' }
 * );
 */
export async function withCache(cacheKey, fetchFn, options = {}) {
  // Try cache first
  const cached = await getFromCache(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - call the API
  const result = await fetchFn();

  // Store in cache (non-blocking)
  setInCache(cacheKey, result, options);

  return result;
}

/**
 * Generate cache keys for different content types
 */
export const CacheKeys = {
  // Concept explanations - same for everyone
  explanation: (topic) => `explain:${topic.toLowerCase().replace(/\s+/g, '-')}`,

  // Problem-specific hints
  hint: (problemId, stepId, level) => `hint:${problemId}:step${stepId}:level${level}`,

  // Buggy code analysis (pre-defined bugs)
  bugAnalysis: (bugId) => `bug-analysis:${bugId}`,

  // Similar problem generation
  similarProblem: (problemId, difficulty) => `similar:${problemId}:${difficulty}`,

  // Pattern explanations
  pattern: (patternName) => `pattern:${patternName.toLowerCase().replace(/\s+/g, '-')}`,
};

/**
 * Check if a request should be cached
 * User-specific requests (code review) should NOT be cached
 */
export function isCacheable(requestType) {
  const cacheableTypes = [
    'explanation',
    'hint',
    'bugAnalysis',
    'similarProblem',
    'pattern'
  ];
  return cacheableTypes.includes(requestType);
}

export default {
  withCache,
  CacheKeys,
  isCacheable
};
