/**
 * Progress Service
 *
 * Handles saving and loading user progress with the API.
 * Includes debounced saving for code changes.
 */

const API_BASE = '/api/progress';
const SAVE_DEBOUNCE_MS = 30000; // 30 seconds

let saveTimeout = null;
let pendingSave = null;

/**
 * Get the auth token from the current session
 */
async function getAuthToken() {
  // Import dynamically to avoid circular dependencies
  const { supabase } = await import('../lib/supabase');
  if (!supabase) return null;

  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Fetch user's progress on a specific problem
 * @param {string} problemId
 * @returns {Promise<Object|null>}
 */
export async function fetchProgress(problemId) {
  const token = await getAuthToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE}/${problemId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) return null;
      throw new Error('Failed to fetch progress');
    }

    const result = await response.json();
    return result.success ? result.data : null;

  } catch (error) {
    console.error('Error fetching progress:', error);
    return null;
  }
}

/**
 * Save progress immediately
 * @param {string} problemId
 * @param {Object} progress
 * @returns {Promise<boolean>}
 */
export async function saveProgressImmediate(problemId, progress) {
  const token = await getAuthToken();
  if (!token) return false;

  try {
    const response = await fetch(`${API_BASE}/${problemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(progress)
    });

    if (!response.ok) {
      throw new Error('Failed to save progress');
    }

    const result = await response.json();
    return result.success === true;

  } catch (error) {
    console.error('Error saving progress:', error);
    return false;
  }
}

/**
 * Save progress with debouncing (for code changes)
 * @param {string} problemId
 * @param {Object} progress
 */
export function saveProgressDebounced(problemId, progress) {
  pendingSave = { problemId, progress };

  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    if (pendingSave) {
      await saveProgressImmediate(pendingSave.problemId, pendingSave.progress);
      pendingSave = null;
    }
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Flush any pending progress saves immediately
 * Call this on beforeunload or critical saves
 */
export async function flushPendingProgress() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  if (pendingSave) {
    // Use sendBeacon for reliability on page unload
    const token = await getAuthToken();
    if (token && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const url = `${API_BASE}/${pendingSave.problemId}`;
      const blob = new Blob([JSON.stringify(pendingSave.progress)], {
        type: 'application/json'
      });
      navigator.sendBeacon(url, blob);
    } else if (token) {
      // Fallback to regular save
      await saveProgressImmediate(pendingSave.problemId, pendingSave.progress);
    }
    pendingSave = null;
  }
}

/**
 * Cancel any pending debounced saves
 */
export function cancelPendingProgress() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  pendingSave = null;
}

/**
 * Transform hook state to API format
 */
export function stateToProgress(state) {
  return {
    is_pattern_complete: state.isPatternComplete ?? false,
    is_interview_complete: state.isInterviewComplete ?? false,
    is_strategy_complete: state.isStrategyComplete ?? false,
    is_completed: state.isCompleted ?? false,
    pattern_attempts: state.patternAttempts ?? 0,
    selected_pattern: state.selectedPattern ?? null,
    selected_approach: state.selectedApproach ?? null,
    strategy_text: state.strategyText ?? null,
    strategy_hint_level: state.strategyHintLevel ?? 0,
    current_step_index: state.currentStepIndex ?? 0,
    selected_language: state.selectedLanguage ?? 'python',
    user_code_by_step: state.userCodeByStep ?? {},
    hints_used_by_step: state.hintsUsedByStep ?? {},
  };
}

/**
 * Transform API format to hook initial state
 */
export function progressToState(progress) {
  if (!progress) return null;

  return {
    isPatternComplete: progress.is_pattern_complete ?? false,
    isInterviewComplete: progress.is_interview_complete ?? false,
    isStrategyComplete: progress.is_strategy_complete ?? false,
    isCompleted: progress.is_completed ?? false,
    patternAttempts: progress.pattern_attempts ?? 0,
    selectedPattern: progress.selected_pattern ?? null,
    selectedApproach: progress.selected_approach ?? null,
    strategyText: progress.strategy_text ?? '',
    strategyHintLevel: progress.strategy_hint_level ?? 0,
    currentStepIndex: progress.current_step_index ?? 0,
    selectedLanguage: progress.selected_language ?? 'python',
    userCodeByStep: progress.user_code_by_step ?? {},
    hintsUsedByStep: progress.hints_used_by_step ?? {},
  };
}
