'use client';

import { useState } from 'react';
import Link from 'next/link';

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

interface Score {
  overall: number;
  patternRecognition: number;
  implementation: number;
  edgeCases: number;
  efficiency: number;
}

interface AdversaryPrompt {
  id: string;
  type: string;
  prompt: string;
  hint?: string;
}

interface AdversaryChallengeState {
  stepId: string;
  prompt: AdversaryPrompt;
  userResponse: string | null;
  skipped: boolean;
  completed: boolean;
}

interface ReviewSummaryProps {
  /** Problem title */
  problemTitle: string;
  /** Pattern used */
  pattern: string;
  /** Rung level */
  rung: number;
  /** Scores achieved */
  score: Score;
  /** Number of code submissions */
  codeSubmissions: number;
  /** Number of hints used */
  hintsUsed: number;
  /** Stated invariant from thinking gate (if available) */
  statedInvariant?: string;
  /** Reflection insight (if user provided one) */
  reflectionInsight?: string;
  /** Whether tests all passed */
  allTestsPassed: boolean;
  /** Adversary challenge state (if available) */
  adversaryChallenge?: AdversaryChallengeState | null;
  /** Callback to start adversary challenge */
  onStartAdversaryChallenge?: () => void;
  /** Callback to submit adversary response */
  onSubmitAdversaryResponse?: (data: { stepId: string; response: string }) => Promise<void>;
  /** Callback to skip adversary challenge */
  onSkipAdversaryChallenge?: (stepId: string) => Promise<void>;
  /** Loading state for adversary actions */
  adversaryLoading?: boolean;
}

/**
 * Review Summary - Post-completion view showing learning insights
 *
 * Displays:
 * - Score overview with encouraging feedback
 * - Chosen pattern and stated invariant
 * - Test outcome summary
 * - Reflection (if exists)
 * - Single CTA to dashboard
 */
export function ReviewSummary({
  problemTitle,
  pattern,
  rung,
  score,
  codeSubmissions,
  hintsUsed,
  statedInvariant,
  reflectionInsight,
  allTestsPassed,
  adversaryChallenge,
  onStartAdversaryChallenge,
  onSubmitAdversaryResponse,
  onSkipAdversaryChallenge,
  adversaryLoading,
}: ReviewSummaryProps) {
  const overallPercent = Math.round(score.overall * 100);
  const patternLabel = PATTERN_LABELS[pattern] || pattern.replace(/_/g, ' ');

  // Encouraging feedback based on performance
  const getFeedbackMessage = () => {
    if (overallPercent >= 90) return "Excellent work! You've mastered this pattern.";
    if (overallPercent >= 70) return "Great job! You're building solid pattern recognition.";
    if (overallPercent >= 50) return "Good effort! Keep practicing to strengthen this skill.";
    return "Every attempt builds understanding. Review the pattern and try again.";
  };

  return (
    <div className="review-summary">
      {/* Header */}
      <div className="review-header">
        <div className="review-checkmark" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="2" />
            <path
              d="M10 16L14 20L22 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="review-title">Problem Complete</h1>
        <p className="review-problem-name">{problemTitle}</p>
      </div>

      {/* Score Section */}
      <div className="review-score-section">
        <div className="review-score-main">
          <span className="review-score-value">{overallPercent}</span>
          <span className="review-score-percent">%</span>
        </div>
        <p className="review-score-feedback">{getFeedbackMessage()}</p>
      </div>

      {/* Score Breakdown */}
      <div className="review-breakdown">
        <h2 className="review-section-title">Score Breakdown</h2>
        <div className="review-score-grid">
          <ScoreBar label="Pattern Recognition" value={score.patternRecognition} />
          <ScoreBar label="Implementation" value={score.implementation} />
          <ScoreBar label="Edge Cases" value={score.edgeCases} />
          <ScoreBar label="Efficiency" value={score.efficiency} />
        </div>
      </div>

      {/* Your Approach Section */}
      <div className="review-approach">
        <h2 className="review-section-title">Your Approach</h2>

        <div className="review-approach-item">
          <span className="review-approach-label">Pattern</span>
          <span className="review-approach-badge">{patternLabel}</span>
          <span className="review-approach-rung">Rung {rung}</span>
        </div>

        {statedInvariant && (
          <div className="review-approach-item">
            <span className="review-approach-label">Invariant</span>
            <p className="review-invariant-text">"{statedInvariant}"</p>
          </div>
        )}
      </div>

      {/* Session Stats */}
      <div className="review-stats">
        <div className="review-stat">
          <span className="review-stat-value">{codeSubmissions}</span>
          <span className="review-stat-label">
            {codeSubmissions === 1 ? 'Submission' : 'Submissions'}
          </span>
        </div>
        <div className="review-stat">
          <span className="review-stat-value">{hintsUsed}</span>
          <span className="review-stat-label">
            {hintsUsed === 1 ? 'Hint Used' : 'Hints Used'}
          </span>
        </div>
        <div className="review-stat">
          <span className={`review-stat-value ${allTestsPassed ? 'review-stat--success' : ''}`}>
            {allTestsPassed ? 'Passed' : 'Partial'}
          </span>
          <span className="review-stat-label">Tests</span>
        </div>
      </div>

      {/* Reflection (if exists) */}
      {reflectionInsight && (
        <div className="review-reflection">
          <h2 className="review-section-title">Your Reflection</h2>
          <blockquote className="review-reflection-quote">
            "{reflectionInsight}"
          </blockquote>
        </div>
      )}

      {/* Level Up Challenge */}
      {adversaryChallenge ? (
        <LevelUpChallenge
          challenge={adversaryChallenge}
          onSubmit={onSubmitAdversaryResponse}
          onSkip={onSkipAdversaryChallenge}
          loading={adversaryLoading}
        />
      ) : onStartAdversaryChallenge ? (
        <div className="review-level-up-cta">
          <button
            type="button"
            className="btn btn-ghost review-level-up-button"
            onClick={onStartAdversaryChallenge}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Try a Level Up Challenge
          </button>
        </div>
      ) : null}

      {/* CTA */}
      <div className="review-cta">
        <Link href="/practice" className="btn btn-primary review-cta-button">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

function LevelUpChallenge({
  challenge,
  onSubmit,
  onSkip,
  loading,
}: {
  challenge: AdversaryChallengeState;
  onSubmit?: (data: { stepId: string; response: string }) => Promise<void>;
  onSkip?: (stepId: string) => Promise<void>;
  loading?: boolean;
}) {
  const [response, setResponse] = useState('');
  const [showHint, setShowHint] = useState(false);
  const minResponseLength = 50;
  const canSubmit = response.trim().length >= minResponseLength;

  // Already completed - show review mode
  if (challenge.completed) {
    return (
      <div className="review-level-up review-level-up--completed">
        <div className="review-level-up-header">
          <div className="review-level-up-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h2 className="review-section-title">Level Up Challenge</h2>
          {challenge.skipped ? (
            <span className="review-level-up-badge review-level-up-badge--skipped">Skipped</span>
          ) : (
            <span className="review-level-up-badge review-level-up-badge--done">Done</span>
          )}
        </div>
        <div className="review-level-up-prompt">
          <p>{challenge.prompt.prompt}</p>
        </div>
        {challenge.userResponse && (
          <div className="review-level-up-response">
            <h4>Your Response</h4>
            <blockquote>{challenge.userResponse}</blockquote>
          </div>
        )}
      </div>
    );
  }

  // Active challenge
  return (
    <div className="review-level-up">
      <div className="review-level-up-header">
        <div className="review-level-up-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <div>
          <h2 className="review-section-title">Level Up Challenge</h2>
          <p className="review-level-up-subtitle">Optional: Push your understanding further</p>
        </div>
      </div>

      <div className="review-level-up-prompt">
        <p>{challenge.prompt.prompt}</p>
      </div>

      {challenge.prompt.hint && (
        <div className="review-level-up-hint-toggle">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setShowHint(!showHint)}
          >
            {showHint ? 'Hide hint' : 'Need a hint?'}
          </button>
          {showHint && (
            <div className="review-level-up-hint">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p>{challenge.prompt.hint}</p>
            </div>
          )}
        </div>
      )}

      <div className="review-level-up-input">
        <label htmlFor="level-up-response">How would you adapt your solution?</label>
        <textarea
          id="level-up-response"
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Describe your approach... (minimum 50 characters)"
          rows={4}
          disabled={loading}
        />
        <div className="review-level-up-char-count">
          <span className={response.length >= minResponseLength ? 'valid' : ''}>
            {response.length}
          </span>
          {' / '}{minResponseLength} min
        </div>
      </div>

      <div className="review-level-up-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => onSkip?.(challenge.stepId)}
          disabled={loading}
        >
          Skip
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onSubmit?.({ stepId: challenge.stepId, response: response.trim() })}
          disabled={!canSubmit || loading}
        >
          {loading ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const percent = Math.round(value * 100);

  return (
    <div className="review-score-bar">
      <div className="review-score-bar-header">
        <span className="review-score-bar-label">{label}</span>
        <span className="review-score-bar-value">{percent}%</span>
      </div>
      <div className="review-score-bar-track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="review-score-bar-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
