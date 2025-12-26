import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchProgress,
  saveProgressImmediate,
  saveProgressDebounced,
  flushPendingProgress,
  stateToProgress,
  progressToState
} from '../services/progressService';

/**
 * Hook to manage user progress persistence
 *
 * @param {string} problemId - The problem ID to track progress for
 * @returns {Object} Progress management utilities
 */
export function useProgress(problemId) {
  const { isAuthenticated, user } = useAuth();
  const [initialState, setInitialState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const lastSavedRef = useRef(null);

  // Load progress when user is authenticated
  useEffect(() => {
    async function loadProgress() {
      if (!isAuthenticated || !problemId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const progress = await fetchProgress(problemId);
        const state = progressToState(progress);
        setInitialState(state);
        lastSavedRef.current = progress;
      } catch (err) {
        console.error('Failed to load progress:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, [isAuthenticated, problemId, user?.id]);

  // Save progress immediately (for phase completions)
  const saveNow = useCallback(async (state) => {
    if (!isAuthenticated || !problemId) return false;

    setSaving(true);
    try {
      const progress = stateToProgress(state);
      const success = await saveProgressImmediate(problemId, progress);
      if (success) {
        lastSavedRef.current = progress;
      }
      return success;
    } catch (err) {
      console.error('Failed to save progress:', err);
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [isAuthenticated, problemId]);

  // Save progress with debounce (for code changes)
  const saveLater = useCallback((state) => {
    if (!isAuthenticated || !problemId) return;

    const progress = stateToProgress(state);
    saveProgressDebounced(problemId, progress);
  }, [isAuthenticated, problemId]);

  // Flush pending saves
  const flush = useCallback(async () => {
    await flushPendingProgress();
  }, []);

  // Flush on unmount and beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushPendingProgress();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushPendingProgress();
    };
  }, []);

  return {
    initialState,
    loading,
    saving,
    error,
    saveNow,
    saveLater,
    flush,
    isEnabled: isAuthenticated
  };
}
