'use client';

import { useState } from 'react';

const PATTERNS = [
  { id: 'SLIDING_WINDOW', name: 'Sliding Window', desc: 'Maintain a window over a contiguous sequence' },
  { id: 'TWO_POINTERS', name: 'Two Pointers', desc: 'Use two pointers to traverse from different positions' },
  { id: 'PREFIX_SUM', name: 'Prefix Sum', desc: 'Precompute cumulative sums for range queries' },
  { id: 'BINARY_SEARCH', name: 'Binary Search', desc: 'Divide search space in half each iteration' },
  { id: 'BFS', name: 'Breadth-First Search', desc: 'Explore neighbors level by level' },
  { id: 'DFS', name: 'Depth-First Search', desc: 'Explore as deep as possible before backtracking' },
  { id: 'DYNAMIC_PROGRAMMING', name: 'Dynamic Programming', desc: 'Break problem into overlapping subproblems' },
  { id: 'BACKTRACKING', name: 'Backtracking', desc: 'Build candidates and abandon invalid paths' },
  { id: 'GREEDY', name: 'Greedy', desc: 'Make locally optimal choices' },
  { id: 'HEAP', name: 'Heap / Priority Queue', desc: 'Efficiently track min/max elements' },
  { id: 'TRIE', name: 'Trie', desc: 'Prefix tree for string operations' },
  { id: 'UNION_FIND', name: 'Union Find', desc: 'Track connected components with path compression' },
  { id: 'INTERVAL_MERGING', name: 'Interval Merging', desc: 'Sort and merge overlapping intervals' },
];

interface ThinkingGateProps {
  onSubmit: (data: { selectedPattern: string; statedInvariant: string; statedComplexity?: string }) => Promise<void>;
  loading?: boolean;
}

export function ThinkingGate({ onSubmit, loading }: ThinkingGateProps) {
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [invariant, setInvariant] = useState('');
  const [complexity, setComplexity] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPattern || !invariant.trim()) return;

    await onSubmit({
      selectedPattern,
      statedInvariant: invariant,
      statedComplexity: complexity || undefined,
    });
  };

  return (
    <div className="thinking-gate">
      <div className="thinking-gate-header">
        <div className="thinking-gate-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a8 8 0 00-8 8c0 3.2 1.9 6 4.6 7.3.2.1.4.3.5.5l.4 2.7h5l.4-2.7c.1-.2.3-.4.5-.5A8 8 0 0012 2z"/>
            <path d="M10 22h4"/>
          </svg>
        </div>
        <h2 className="thinking-gate-title">Think Before You Code</h2>
        <p className="thinking-gate-subtitle">
          Commit to your approach. This helps build pattern recognition.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="thinking-gate-form">
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="label">1. Which pattern applies to this problem?</label>
          <div className="pattern-grid">
            {PATTERNS.map((pattern) => (
              <div
                key={pattern.id}
                className={`pattern-card ${selectedPattern === pattern.id ? 'selected' : ''}`}
                onClick={() => setSelectedPattern(pattern.id)}
              >
                <div className="pattern-name">{pattern.name}</div>
                <div className="pattern-desc">{pattern.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label className="label" htmlFor="invariant">
            2. State the invariant that your solution will maintain
          </label>
          <textarea
            id="invariant"
            className="textarea"
            placeholder="e.g., 'The window [left, right] always contains at most k distinct characters'"
            value={invariant}
            onChange={(e) => setInvariant(e.target.value)}
            rows={3}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label className="label" htmlFor="complexity">
            3. Expected time complexity (optional)
          </label>
          <input
            id="complexity"
            type="text"
            className="input"
            placeholder="e.g., O(n), O(n log n)"
            value={complexity}
            onChange={(e) => setComplexity(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary thinking-gate-submit"
          disabled={!selectedPattern || !invariant.trim() || loading}
        >
          {loading ? (
            <>
              <span className="spinner" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
              Validating approach...
            </>
          ) : (
            <>
              Commit & Start Coding
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginLeft: '0.5rem' }}>
                <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
              </svg>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
