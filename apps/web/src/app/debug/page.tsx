'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DebugScenarioCard } from '@/components/debug';
import {
  DEBUG_PATTERN_CATEGORIES,
  DIFFICULTY_LEVELS,
  getCategoryDisplayName,
  getDifficultyDisplayName,
  type DebugPatternCategory,
  type Difficulty,
  type DebugScenarioSummary,
} from '@/components/debug/types';

export default function DebugPage() {
  const router = useRouter();

  // Scenario list state
  const [scenarios, setScenarios] = useState<DebugScenarioSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<DebugPatternCategory | ''>('');
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | ''>('');

  // Starting state
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    fetchScenarios();
  }, [categoryFilter, difficultyFilter]);

  async function fetchScenarios() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category', categoryFilter);
      if (difficultyFilter) params.set('difficulty', difficultyFilter);

      const url = `/api/debug/scenarios${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        setError(data.error.message || 'Failed to load scenarios');
      } else {
        setScenarios(data.scenarios || []);
      }
    } catch (err) {
      setError('Failed to fetch scenarios. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleStartSession(scenarioId: string) {
    setStartingId(scenarioId);
    setError(null);

    try {
      const res = await fetch('/api/debug/attempts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error.message || 'Failed to start session');
        setStartingId(null);
      } else {
        router.push(`/debug/attempts/${data.attempt.attemptId}`);
      }
    } catch (err) {
      setError('Failed to start debug session. Please try again.');
      setStartingId(null);
    }
  }

  return (
    <div className="debug-page">
      <div className="debug-page-header">
        <h1>Debug Practice</h1>
        <p className="debug-page-subtitle">
          Practice systematic debugging through structured scenarios. Work through gates
          to classify symptoms, identify root causes, and develop fix strategies.
        </p>
      </div>

      {/* Filters */}
      <div className="debug-filters">
        <div className="debug-filter">
          <label className="label" htmlFor="category-filter">
            Category
          </label>
          <select
            id="category-filter"
            className="select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as DebugPatternCategory | '')}
          >
            <option value="">All Categories</option>
            {DEBUG_PATTERN_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {getCategoryDisplayName(cat)}
              </option>
            ))}
          </select>
        </div>

        <div className="debug-filter">
          <label className="label" htmlFor="difficulty-filter">
            Difficulty
          </label>
          <select
            id="difficulty-filter"
            className="select"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value as Difficulty | '')}
          >
            <option value="">All Difficulties</option>
            {DIFFICULTY_LEVELS.map((diff) => (
              <option key={diff} value={diff}>
                {getDifficultyDisplayName(diff)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="debug-error">
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={fetchScenarios}>
            Try Again
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem' }}>Loading scenarios...</p>
        </div>
      )}

      {/* Scenario grid */}
      {!loading && !error && scenarios.length > 0 && (
        <div className="debug-scenario-grid">
          {scenarios.map((scenario) => (
            <DebugScenarioCard
              key={scenario.id}
              scenario={scenario}
              onStart={(id) => {
                if (!startingId) {
                  handleStartSession(id);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && scenarios.length === 0 && (
        <div className="empty-state">
          <h3>No Scenarios Found</h3>
          <p>
            {categoryFilter || difficultyFilter
              ? 'Try adjusting your filters to see more scenarios.'
              : 'No debug scenarios are available yet. Check back later!'}
          </p>
          {(categoryFilter || difficultyFilter) && (
            <button
              className="btn btn-secondary"
              style={{ marginTop: '1rem' }}
              onClick={() => {
                setCategoryFilter('');
                setDifficultyFilter('');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Loading overlay when starting */}
      {startingId && (
        <div className="debug-starting-overlay">
          <div className="spinner"></div>
          <p>Starting debug session...</p>
        </div>
      )}
    </div>
  );
}
