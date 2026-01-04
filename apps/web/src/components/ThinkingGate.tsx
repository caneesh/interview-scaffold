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
    <div className="card">
      <h3 style={{ marginBottom: '1.5rem' }}>Before You Code</h3>

      <form onSubmit={handleSubmit}>
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
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.75rem' }}
          disabled={!selectedPattern || !invariant.trim() || loading}
        >
          {loading ? 'Submitting...' : 'Continue to Coding'}
        </button>
      </form>
    </div>
  );
}
