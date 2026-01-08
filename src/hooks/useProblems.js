import { useState, useEffect, useCallback } from 'react';
import { fetchProblems, fetchProblem } from '../services/problemService';

/**
 * Hook to fetch and manage problem list
 */
export function useProblems(options = {}) {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProblems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProblems(options);
      setProblems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [options.difficulty, options.pattern]);

  useEffect(() => {
    loadProblems();
  }, [loadProblems]);

  return {
    problems,
    loading,
    error,
    refresh: loadProblems
  };
}

/**
 * Hook to fetch a single problem
 */
export function useProblem(problemId) {
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProblem = useCallback(async () => {
    if (!problemId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchProblem(problemId);
      setProblem(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [problemId]);

  useEffect(() => {
    loadProblem();
  }, [loadProblem]);

  return {
    problem,
    loading,
    error,
    refresh: loadProblem
  };
}
