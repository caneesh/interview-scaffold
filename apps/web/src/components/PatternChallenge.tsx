'use client';

import { useState } from 'react';

const PATTERNS = [
  { id: 'SLIDING_WINDOW', name: 'Sliding Window' },
  { id: 'TWO_POINTERS', name: 'Two Pointers' },
  { id: 'PREFIX_SUM', name: 'Prefix Sum' },
  { id: 'BINARY_SEARCH', name: 'Binary Search' },
  { id: 'BFS', name: 'Breadth-First Search' },
  { id: 'DFS', name: 'Depth-First Search' },
  { id: 'DYNAMIC_PROGRAMMING', name: 'Dynamic Programming' },
  { id: 'BACKTRACKING', name: 'Backtracking' },
  { id: 'GREEDY', name: 'Greedy' },
  { id: 'HEAP', name: 'Heap / Priority Queue' },
  { id: 'TRIE', name: 'Trie' },
  { id: 'UNION_FIND', name: 'Union Find' },
  { id: 'INTERVAL_MERGING', name: 'Interval Merging' },
];

interface PatternChallengeProps {
  /** The step ID for this challenge */
  stepId: string;
  /** The pattern being challenged */
  challengedPattern: string;
  /** Challenge mode */
  mode: 'COUNTEREXAMPLE' | 'SOCRATIC';
  /** The challenge prompt/question */
  prompt: string;
  /** Optional counterexample input */
  counterexample?: string;
  /** Confidence score (0-1) */
  confidenceScore: number;
  /** Reasons for the challenge */
  reasons: readonly string[];
  /** Suggested alternative patterns */
  suggestedAlternatives: readonly string[];
  /** Handler for submitting response */
  onRespond: (data: {
    stepId: string;
    response: string;
    decision: 'KEEP_PATTERN' | 'CHANGE_PATTERN';
    newPattern?: string;
  }) => Promise<void>;
  /** Handler for skipping the challenge */
  onSkip: (stepId: string) => Promise<void>;
  /** Loading state */
  loading?: boolean;
}

export function PatternChallenge({
  stepId,
  challengedPattern,
  mode,
  prompt,
  counterexample,
  confidenceScore,
  reasons,
  suggestedAlternatives,
  onRespond,
  onSkip,
  loading,
}: PatternChallengeProps) {
  const [response, setResponse] = useState('');
  const [decision, setDecision] = useState<'KEEP_PATTERN' | 'CHANGE_PATTERN' | null>(null);
  const [newPattern, setNewPattern] = useState<string | null>(null);

  const challengedPatternName = PATTERNS.find(p => p.id === challengedPattern)?.name ?? challengedPattern;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decision) return;

    await onRespond({
      stepId,
      response: response.trim(),
      decision,
      newPattern: decision === 'CHANGE_PATTERN' ? (newPattern ?? undefined) : undefined,
    });
  };

  const handleKeepPattern = () => {
    setDecision('KEEP_PATTERN');
    setNewPattern(null);
  };

  const handleChangePattern = (patternId: string) => {
    setDecision('CHANGE_PATTERN');
    setNewPattern(patternId);
  };

  return (
    <div className="pattern-challenge">
      <div className="pattern-challenge-header">
        <div className="pattern-challenge-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h3 className="pattern-challenge-title">Let's Stress-Test Your Choice</h3>
        <p className="pattern-challenge-subtitle">
          You selected <strong>{challengedPatternName}</strong>. Before committing, consider this challenge.
        </p>
      </div>

      {/* Confidence indicator */}
      <div className="pattern-challenge-confidence">
        <div className="confidence-bar">
          <div
            className="confidence-fill"
            style={{ width: `${confidenceScore * 100}%` }}
          />
        </div>
        <span className="confidence-label">
          {confidenceScore < 0.3 ? 'Low' : confidenceScore < 0.5 ? 'Moderate' : 'Fair'} confidence
        </span>
      </div>

      {/* Challenge content */}
      <div className="pattern-challenge-content">
        {mode === 'COUNTEREXAMPLE' && counterexample && (
          <div className="challenge-counterexample">
            <div className="counterexample-label">Consider this input:</div>
            <pre className="counterexample-code">{counterexample}</pre>
          </div>
        )}

        <div className="challenge-prompt">
          <div className="prompt-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <p className="prompt-text">{prompt}</p>
        </div>

        {reasons.length > 0 && (
          <div className="challenge-reasons">
            <div className="reasons-label">Why we're asking:</div>
            <ul className="reasons-list">
              {reasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Response form */}
      <form onSubmit={handleSubmit} className="pattern-challenge-form">
        <div className="response-input-group">
          <label className="label" htmlFor="challenge-response">
            Your response (optional but encouraged):
          </label>
          <textarea
            id="challenge-response"
            className="textarea"
            placeholder="How would you handle this case? Why does your pattern still apply?"
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={2}
          />
        </div>

        {/* Decision section */}
        <div className="challenge-decision">
          <div className="decision-option">
            <button
              type="button"
              className={`btn ${decision === 'KEEP_PATTERN' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={handleKeepPattern}
              disabled={loading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Keep {challengedPatternName}
            </button>
          </div>

          <div className="decision-divider">or</div>

          <div className="decision-option decision-change">
            <div className="change-label">Switch to:</div>
            <div className="alternative-patterns">
              {suggestedAlternatives.slice(0, 3).map((altId) => {
                const alt = PATTERNS.find(p => p.id === altId);
                if (!alt) return null;
                return (
                  <button
                    key={altId}
                    type="button"
                    className={`btn btn-sm ${newPattern === altId ? 'btn-accent' : 'btn-outline'}`}
                    onClick={() => handleChangePattern(altId)}
                    disabled={loading}
                  >
                    {alt.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pattern-challenge-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onSkip(stepId)}
            disabled={loading}
          >
            Skip Challenge
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!decision || loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                Confirming...
              </>
            ) : (
              <>
                Confirm Choice
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginLeft: '0.5rem' }}>
                  <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
                </svg>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
