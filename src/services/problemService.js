/**
 * Problem Service
 *
 * Handles fetching problems from the API with fallback to hardcoded data.
 */

import { sampleProblem } from '../data/sampleProblem';

const API_BASE = '/api/problems';

/**
 * Fetch all problems from the database
 * @param {Object} options - Filter options
 * @param {string} options.difficulty - Filter by difficulty
 * @param {string} options.pattern - Filter by pattern
 * @returns {Promise<Array>} List of problems (metadata only)
 */
export async function fetchProblems(options = {}) {
  try {
    const params = new URLSearchParams();
    if (options.difficulty) params.set('difficulty', options.difficulty);
    if (options.pattern) params.set('pattern', options.pattern);

    const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch problems');
    }

    const result = await response.json();

    if (result.success && result.data?.length > 0) {
      return result.data;
    }

    // Fallback: return sample problem metadata
    return [{
      id: sampleProblem.id,
      title: sampleProblem.title,
      difficulty: sampleProblem.difficulty,
      description: sampleProblem.description,
      pattern: 'two-pointers',
      supported_languages: sampleProblem.supportedLanguages,
      concepts: sampleProblem.concepts?.map(c => c.name) || []
    }];

  } catch (error) {
    console.error('Error fetching problems:', error);
    // Fallback to sample problem on any error
    return [{
      id: sampleProblem.id,
      title: sampleProblem.title,
      difficulty: sampleProblem.difficulty,
      description: sampleProblem.description,
      pattern: 'two-pointers',
      supported_languages: sampleProblem.supportedLanguages,
      concepts: sampleProblem.concepts?.map(c => c.name) || []
    }];
  }
}

/**
 * Fetch a single problem by ID with all data
 * @param {string} problemId - The problem ID
 * @returns {Promise<Object|null>} The full problem object
 */
export async function fetchProblem(problemId) {
  // Check if requesting the sample problem (fallback)
  if (problemId === sampleProblem.id || problemId === 'sample') {
    return sampleProblem;
  }

  try {
    const response = await fetch(`${API_BASE}/${problemId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch problem');
    }

    const result = await response.json();

    if (result.success && result.data) {
      return result.data;
    }

    // Fallback to sample problem
    return sampleProblem;

  } catch (error) {
    console.error('Error fetching problem:', error);
    // Fallback to sample problem
    return sampleProblem;
  }
}

/**
 * Check if problems API is available
 * @returns {Promise<boolean>}
 */
export async function isProblemsAPIAvailable() {
  try {
    const response = await fetch(API_BASE);
    const result = await response.json();
    return result.success === true;
  } catch {
    return false;
  }
}
