/**
 * AI Service - Integrates with Claude API for intelligent features
 *
 * In production (Vercel), uses /api/claude serverless function.
 * In development, can use direct API with user's own key.
 *
 * Caching: Reusable responses (explanations, patterns) are cached
 * in Supabase to reduce API costs. User-specific requests (code review)
 * are always fresh.
 */

import { withCache, CacheKeys } from './cacheService';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const PROXY_URL = '/api/claude'; // Vercel serverless function

// Check if we're in production (deployed to Vercel)
const isProduction = import.meta.env.PROD;

// Configuration - prioritizes proxy in production
const getConfig = () => {
  // In production, always use the proxy (API key is on server)
  if (isProduction) {
    return {
      useProxy: true,
      proxyUrl: PROXY_URL,
      apiKey: '',
      model: 'claude-sonnet-4-20250514',
      maxTokens: 1024,
    };
  }

  // In development, allow user's own API key or custom proxy
  const userApiKey = localStorage.getItem('anthropic_api_key') || import.meta.env.VITE_ANTHROPIC_API_KEY || '';
  const customProxy = localStorage.getItem('ai_proxy_url') || import.meta.env.VITE_AI_PROXY_URL || '';

  return {
    useProxy: !!customProxy,
    proxyUrl: customProxy || PROXY_URL,
    apiKey: userApiKey,
    model: 'claude-sonnet-4-20250514',
    maxTokens: 1024,
  };
};

/**
 * Makes a request to Claude API
 */
async function callClaude(systemPrompt, userMessage, options = {}) {
  const config = getConfig();

  // In production, proxy is always available
  // In development, need either API key or custom proxy
  if (!isProduction && !config.apiKey && !config.useProxy) {
    throw new Error('No API key configured. Please set your Anthropic API key.');
  }

  const requestBody = {
    model: options.model || config.model,
    max_tokens: options.maxTokens || config.maxTokens,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userMessage }
    ]
  };

  // Use proxy in production or if configured
  const useProxy = isProduction || config.useProxy;
  const url = useProxy ? config.proxyUrl : ANTHROPIC_API_URL;

  const headers = {
    'Content-Type': 'application/json',
    // Only add auth headers for direct API calls (not proxy)
    ...(!useProxy && config.apiKey ? {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    } : {})
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = error.retryAfter || 60;
        throw new Error(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`);
      }

      throw new Error(error.error?.message || error.error || `API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

/**
 * AI Code Review - Analyzes user's code solution
 */
export async function reviewCode(code, problemContext) {
  const systemPrompt = `You are an expert coding interview coach. Review the candidate's code solution and provide constructive feedback.

Be encouraging but honest. Focus on:
1. Correctness - Does the code solve the problem?
2. Edge cases - Are all edge cases handled?
3. Time/Space complexity - Is it optimal?
4. Code quality - Is it readable and well-structured?
5. Interview tips - What would an interviewer think?

Format your response as JSON:
{
  "overallScore": 1-10,
  "verdict": "Correct" | "Partially Correct" | "Incorrect",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "complexityAnalysis": {
    "time": "O(?)",
    "space": "O(?)",
    "explanation": "..."
  },
  "interviewTip": "One key tip for interviews",
  "suggestedFix": "Code snippet if there's an issue (optional)"
}`;

  const userMessage = `Problem: ${problemContext.title}
Description: ${problemContext.description}
Expected approach: ${problemContext.expectedApproach || 'Two pointers / Floyd\'s algorithm'}

Candidate's code:
\`\`\`python
${code}
\`\`\`

Please review this solution.`;

  const response = await callClaude(systemPrompt, userMessage);

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                      response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
    return JSON.parse(jsonStr);
  } catch {
    // If JSON parsing fails, return a structured response
    return {
      overallScore: 7,
      verdict: "Review Complete",
      strengths: ["Code submitted for review"],
      improvements: [response],
      complexityAnalysis: { time: "Unknown", space: "Unknown", explanation: response },
      interviewTip: "Keep practicing!"
    };
  }
}

/**
 * AI Hint Generator - Creates personalized hints based on user's progress
 * CACHED: Same hints for same problem/step/level combination
 */
export async function generateHint(problemContext, currentCode, hintLevel, previousHints = []) {
  // Cache key based on problem, step, and hint level (not user's code for cacheability)
  const stepId = problemContext.currentStep?.id || 0;
  const cacheKey = CacheKeys.hint(problemContext.id || 'default', stepId, hintLevel);

  return withCache(cacheKey, async () => {
    const systemPrompt = `You are a supportive coding tutor. Generate a helpful hint for a student stuck on a coding problem.

Guidelines:
- Hint level ${hintLevel}: ${
    hintLevel === 1 ? 'Very subtle - just point them in the right direction' :
    hintLevel === 2 ? 'Medium - give a conceptual hint about the approach' :
    hintLevel === 3 ? 'Detailed - explain the key insight needed' :
    'Very detailed - almost give away the answer but let them code it'
  }
- Don't give away the full solution
- Be encouraging and supportive
- Build on previous hints if provided

Respond with just the hint text, no JSON or formatting.`;

    const userMessage = `Problem: ${problemContext.title}
Description: ${problemContext.description}
Current step: ${problemContext.currentStep?.instruction || 'Working on solution'}

Generate a level ${hintLevel} hint.`;

    return await callClaude(systemPrompt, userMessage, { maxTokens: 300 });
  }, { type: 'hint', problemId: problemContext.id });
}

/**
 * AI Explanation - Explains concepts, patterns, or code in detail
 * CACHED: Same explanations for same topics (context-free version)
 */
export async function explainConcept(topic, context = {}) {
  // Only cache if no user-specific context (code) is provided
  const isCacheable = !context.code && !context.specificQuestion;
  const cacheKey = isCacheable ? CacheKeys.explanation(topic) : null;

  const fetchExplanation = async () => {
    const systemPrompt = `You are an expert computer science educator specializing in coding interviews.

Explain concepts clearly with:
1. Simple analogy or real-world comparison
2. Why it matters for interviews
3. When to use this pattern
4. Common mistakes to avoid
5. A brief example if helpful

Keep explanations concise but insightful. Use markdown formatting.`;

    const userMessage = `Explain: ${topic}

${context.problemTitle ? `In the context of: ${context.problemTitle}` : ''}
${context.code ? `Related to this code:\n\`\`\`\n${context.code}\n\`\`\`` : ''}
${context.specificQuestion ? `Specific question: ${context.specificQuestion}` : ''}`;

    return await callClaude(systemPrompt, userMessage, { maxTokens: 800 });
  };

  // Use cache for generic explanations, direct call for user-specific ones
  if (cacheKey) {
    return withCache(cacheKey, fetchExplanation, { type: 'explanation' });
  }
  return fetchExplanation();
}

/**
 * AI Bug Analysis - Analyzes why code might be wrong
 */
export async function analyzeBug(code, expectedBehavior, actualBehavior, problemContext) {
  const systemPrompt = `You are a debugging expert. Help identify why code isn't working as expected.

Provide:
1. The likely bug location
2. Why it's happening
3. How to fix it
4. A lesson to remember

Be specific and educational. Format as JSON:
{
  "bugLocation": "Line or section where bug is",
  "bugType": "Type of bug (off-by-one, null pointer, logic error, etc.)",
  "explanation": "Why this is happening",
  "fix": "How to fix it",
  "lesson": "Key takeaway"
}`;

  const userMessage = `Problem: ${problemContext.title}

Code:
\`\`\`
${code}
\`\`\`

Expected: ${expectedBehavior}
Actual: ${actualBehavior}

What's the bug?`;

  const response = await callClaude(systemPrompt, userMessage, { maxTokens: 500 });

  try {
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                      response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
    return JSON.parse(jsonStr);
  } catch {
    return {
      bugLocation: "Analysis complete",
      bugType: "See explanation",
      explanation: response,
      fix: "Review the explanation above",
      lesson: "Debugging is a skill that improves with practice"
    };
  }
}

/**
 * AI Problem Generator - Creates new similar problems
 * CACHED: Same generated problems for same base problem + difficulty
 */
export async function generateSimilarProblem(baseProblem, difficulty = 'same') {
  const cacheKey = CacheKeys.similarProblem(baseProblem.id || baseProblem.title, difficulty);

  return withCache(cacheKey, async () => {
    const systemPrompt = `You are a coding interview problem designer. Create a new problem that uses the same core pattern/technique as the given problem.

The new problem should:
1. Use the same algorithmic pattern
2. Have a different context/scenario
3. Be at ${difficulty === 'same' ? 'the same' : difficulty} difficulty level
4. Include test cases

Format as JSON:
{
  "title": "Problem title",
  "difficulty": "Easy|Medium|Hard",
  "description": "Problem description",
  "examples": [{"input": "...", "output": "...", "explanation": "..."}],
  "constraints": ["constraint 1", "constraint 2"],
  "hints": ["hint 1", "hint 2", "hint 3"],
  "pattern": "The pattern being tested",
  "whySamePattern": "Brief explanation of how this uses the same pattern"
}`;

    const userMessage = `Base problem: ${baseProblem.title}
Pattern: ${baseProblem.pattern || 'Two pointers / cycle detection'}
Description: ${baseProblem.description}

Create a new problem using the same pattern but with a different scenario.`;

    const response = await callClaude(systemPrompt, userMessage, { maxTokens: 1000 });

    try {
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                        response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }, { type: 'similarProblem', problemId: baseProblem.id });
}

/**
 * Check if AI features are available
 * In production: always available (uses server-side API key)
 * In development: requires user's API key
 */
export function isAIAvailable() {
  // Always available in production (API key is on server)
  if (isProduction) {
    return true;
  }
  // In development, check for user's API key
  const config = getConfig();
  return !!(config.apiKey || config.useProxy);
}

/**
 * Configure AI service
 */
export function configureAI(apiKey, proxyUrl = '') {
  if (apiKey) {
    localStorage.setItem('anthropic_api_key', apiKey);
  }
  if (proxyUrl) {
    localStorage.setItem('ai_proxy_url', proxyUrl);
  }
}

/**
 * Clear AI configuration
 */
export function clearAIConfig() {
  localStorage.removeItem('anthropic_api_key');
  localStorage.removeItem('ai_proxy_url');
}

export default {
  reviewCode,
  generateHint,
  explainConcept,
  analyzeBug,
  generateSimilarProblem,
  isAIAvailable,
  configureAI,
  clearAIConfig
};
