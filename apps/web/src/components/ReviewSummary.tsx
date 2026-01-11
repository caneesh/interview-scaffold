'use client';

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

      {/* CTA */}
      <div className="review-cta">
        <Link href="/practice" className="btn btn-primary review-cta-button">
          Back to Dashboard
        </Link>
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
