'use client';

const PATTERN_LABELS: Record<string, string> = {
  SLIDING_WINDOW: 'Sliding Window',
  TWO_POINTERS: 'Two Pointers',
  PREFIX_SUM: 'Prefix Sum',
  BINARY_SEARCH: 'Binary Search',
  BFS: 'Breadth-First Search',
  DFS: 'Depth-First Search',
  DYNAMIC_PROGRAMMING: 'Dynamic Programming',
  BACKTRACKING: 'Backtracking',
  GREEDY: 'Greedy',
  HEAP: 'Heap / Priority Queue',
  TRIE: 'Trie',
  UNION_FIND: 'Union Find',
  INTERVAL_MERGING: 'Interval Merging',
};

interface CommittedPlanBadgeProps {
  /** The selected pattern from thinking gate */
  pattern: string;
  /** The stated invariant from thinking gate */
  invariant?: string;
  /** Whether to show in compact mode */
  compact?: boolean;
}

/**
 * Displays the "committed plan" from the thinking gate as read-only badges.
 * Shows the pattern and invariant the user committed to before coding.
 */
export function CommittedPlanBadge({ pattern, invariant, compact = false }: CommittedPlanBadgeProps) {
  const patternLabel = PATTERN_LABELS[pattern] || pattern.replace(/_/g, ' ');

  if (compact) {
    return (
      <div className="committed-plan committed-plan--compact">
        <span className="committed-plan-badge">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '0.25rem' }}>
            <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.28 5.78l-4.25 4.25a.75.75 0 01-1.06 0l-2-2a.75.75 0 111.06-1.06l1.47 1.47 3.72-3.72a.75.75 0 111.06 1.06z"/>
          </svg>
          {patternLabel}
        </span>
      </div>
    );
  }

  return (
    <div className="committed-plan">
      <div className="committed-plan-header">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.28 5.78l-4.25 4.25a.75.75 0 01-1.06 0l-2-2a.75.75 0 111.06-1.06l1.47 1.47 3.72-3.72a.75.75 0 111.06 1.06z"/>
        </svg>
        <span>Your Plan</span>
      </div>
      <div className="committed-plan-content">
        <div className="committed-plan-row">
          <span className="committed-plan-label">Pattern:</span>
          <span className="committed-plan-badge">{patternLabel}</span>
        </div>
        {invariant && (
          <div className="committed-plan-row">
            <span className="committed-plan-label">Invariant:</span>
            <span className="committed-plan-invariant">{invariant}</span>
          </div>
        )}
      </div>
    </div>
  );
}
