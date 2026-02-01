'use client';

import { useState, useMemo } from 'react';
import { InvariantBuilder } from './InvariantBuilder';
import {
  getTemplatesForPattern,
  type InvariantTemplate,
  type PatternId,
} from '@scaffold/core';

type InvariantMode = 'write' | 'build';

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
  onSubmit: (data: {
    selectedPattern: string;
    statedInvariant: string;
    statedComplexity?: string;
    invariantTemplate?: {
      templateId: string;
      choices: Record<string, number>;
      allCorrect: boolean;
    };
  }) => Promise<void>;
  /** Handler for starting pattern discovery */
  onStartDiscovery?: () => void;
  /** Pre-selected pattern (from discovery) */
  discoveredPattern?: string | null;
  loading?: boolean;
}

export function ThinkingGate({ onSubmit, onStartDiscovery, discoveredPattern, loading }: ThinkingGateProps) {
  const [selectedPattern, setSelectedPattern] = useState<string | null>(discoveredPattern ?? null);
  const [invariant, setInvariant] = useState('');
  const [complexity, setComplexity] = useState('');
  const [invariantMode, setInvariantMode] = useState<InvariantMode>('write');
  const [builderResult, setBuilderResult] = useState<{
    templateId: string;
    choices: Record<string, number>;
    renderedText: string;
    allCorrect: boolean;
  } | null>(null);

  // Update selected pattern when discoveredPattern changes
  if (discoveredPattern && discoveredPattern !== selectedPattern) {
    setSelectedPattern(discoveredPattern);
  }

  // Get templates for the selected pattern
  const templates = useMemo((): InvariantTemplate[] => {
    if (!selectedPattern) return [];
    try {
      return getTemplatesForPattern(selectedPattern as PatternId);
    } catch {
      return [];
    }
  }, [selectedPattern]);

  // Check if templates are available for the selected pattern
  const hasTemplates = templates.length > 0;

  // Handle builder completion
  const handleBuilderComplete = (result: {
    templateId: string;
    choices: Record<string, number>;
    renderedText: string;
    allCorrect: boolean;
  }) => {
    setBuilderResult(result);
    setInvariant(result.renderedText);
  };

  // Check if form can be submitted
  const canSubmit = selectedPattern && (
    (invariantMode === 'write' && invariant.trim()) ||
    (invariantMode === 'build' && builderResult)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    await onSubmit({
      selectedPattern: selectedPattern!,
      statedInvariant: invariantMode === 'build' && builderResult
        ? builderResult.renderedText
        : invariant,
      statedComplexity: complexity || undefined,
      ...(invariantMode === 'build' && builderResult && {
        invariantTemplate: {
          templateId: builderResult.templateId,
          choices: builderResult.choices,
          allCorrect: builderResult.allCorrect,
        },
      }),
    });
  };

  // Reset builder result when changing patterns or modes
  const handlePatternChange = (patternId: string) => {
    setSelectedPattern(patternId);
    setBuilderResult(null);
    setInvariant('');
  };

  const handleModeChange = (mode: InvariantMode) => {
    setInvariantMode(mode);
    setBuilderResult(null);
    if (mode === 'write') {
      setInvariant('');
    }
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
          <div className="pattern-grid" role="listbox" aria-label="Pattern selection">
            {PATTERNS.map((pattern) => (
              <div
                key={pattern.id}
                role="option"
                aria-selected={selectedPattern === pattern.id}
                tabIndex={0}
                className={`pattern-card ${selectedPattern === pattern.id ? 'selected' : ''} ${discoveredPattern === pattern.id ? 'discovered' : ''}`}
                onClick={() => handlePatternChange(pattern.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handlePatternChange(pattern.id);
                  }
                }}
              >
                <div className="pattern-name">{pattern.name}</div>
                <div className="pattern-desc">{pattern.desc}</div>
                {discoveredPattern === pattern.id && (
                  <div className="pattern-discovered-badge">Discovered</div>
                )}
              </div>
            ))}
          </div>

          {/* Help me find the pattern button */}
          {onStartDiscovery && !discoveredPattern && (
            <button
              type="button"
              className="btn btn-ghost pattern-discovery-trigger"
              onClick={onStartDiscovery}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Not sure? Help me find the pattern
            </button>
          )}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label className="label">
            2. State the invariant that your solution will maintain
          </label>

          {/* Mode toggle - only show if templates are available */}
          {hasTemplates && (
            <div className="invariant-mode-toggle">
              <button
                type="button"
                className={`invariant-mode-btn ${invariantMode === 'write' ? 'active' : ''}`}
                onClick={() => handleModeChange('write')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Write invariant
              </button>
              <button
                type="button"
                className={`invariant-mode-btn ${invariantMode === 'build' ? 'active' : ''}`}
                onClick={() => handleModeChange('build')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                Build invariant
              </button>
            </div>
          )}

          {/* Write mode - free text input */}
          {invariantMode === 'write' && (
            <textarea
              id="invariant"
              className="textarea"
              placeholder="e.g., 'The window [left, right] always contains at most k distinct characters'"
              value={invariant}
              onChange={(e) => setInvariant(e.target.value)}
              rows={3}
            />
          )}

          {/* Build mode - fill-in-the-blanks */}
          {invariantMode === 'build' && hasTemplates && (
            <InvariantBuilder
              templates={templates}
              onComplete={handleBuilderComplete}
              showValidation={false}
            />
          )}

          {/* Fallback if build mode selected but no templates */}
          {invariantMode === 'build' && !hasTemplates && (
            <div className="invariant-builder invariant-builder--empty">
              <p>No templates available for this pattern. Please write your invariant manually.</p>
            </div>
          )}
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
          disabled={!canSubmit || loading}
          data-testid="start-coding"
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
