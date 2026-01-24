'use client';

interface DebugScoreBreakdownProps {
  score: {
    timeToDiagnosis: number;
    fixAccuracy: number;
    hintsUsed: number;
    edgeCasesConsidered: number;
    explanationQuality: number;
    overall: number;
  };
  masteryUpdate?: {
    before: number;
    after: number;
  };
}

/**
 * Displays the score breakdown after completing a debug session.
 * Shows individual components and overall score with a mastery update if available.
 */
export function DebugScoreBreakdown({ score, masteryUpdate }: DebugScoreBreakdownProps) {
  const scoreItems = [
    {
      label: 'Time to Diagnosis',
      value: score.timeToDiagnosis,
      description: 'How quickly you identified the pattern',
    },
    {
      label: 'Fix Accuracy',
      value: score.fixAccuracy,
      description: 'Quality of your proposed fix strategy',
    },
    {
      label: 'Hints Used',
      value: score.hintsUsed,
      description: 'Penalty for using hints',
      isDeduction: true,
    },
    {
      label: 'Edge Cases Considered',
      value: score.edgeCasesConsidered,
      description: 'Breadth of regression prevention',
    },
    {
      label: 'Explanation Quality',
      value: score.explanationQuality,
      description: 'Clarity of hypothesis and reflection',
    },
  ];

  return (
    <div className="debug-score-breakdown">
      {/* Overall score */}
      <div className="debug-score-overall">
        <div className="debug-score-circle">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="var(--border)"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={getScoreColor(score.overall)}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(score.overall / 100) * 339.3} 339.3`}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="debug-score-value">
            <span className="debug-score-number">{Math.round(score.overall)}</span>
            <span className="debug-score-label">Overall</span>
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="debug-score-items">
        {scoreItems.map((item) => (
          <div key={item.label} className="debug-score-item">
            <div className="debug-score-item-header">
              <span className="debug-score-item-label">{item.label}</span>
              <span
                className={`debug-score-item-value ${item.isDeduction ? 'deduction' : ''}`}
              >
                {item.isDeduction ? '-' : ''}{Math.round(item.value)}
              </span>
            </div>
            <div className="debug-score-item-bar">
              <div
                className="debug-score-item-fill"
                style={{
                  width: `${Math.abs(item.value)}%`,
                  backgroundColor: item.isDeduction
                    ? 'var(--error)'
                    : getScoreColor(item.value),
                }}
              />
            </div>
            <p className="debug-score-item-desc">{item.description}</p>
          </div>
        ))}
      </div>

      {/* Mastery update */}
      {masteryUpdate && (
        <div className="debug-score-mastery">
          <h4 className="debug-score-mastery-title">Pattern Mastery Update</h4>
          <div className="debug-score-mastery-change">
            <span className="debug-score-mastery-before">
              {Math.round(masteryUpdate.before * 100)}%
            </span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12H19M19 12L12 5M19 12L12 19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className={`debug-score-mastery-after ${
                masteryUpdate.after > masteryUpdate.before ? 'improved' : ''
              }`}
            >
              {Math.round(masteryUpdate.after * 100)}%
            </span>
          </div>
          {masteryUpdate.after > masteryUpdate.before && (
            <p className="debug-score-mastery-note">
              +{Math.round((masteryUpdate.after - masteryUpdate.before) * 100)}% improvement
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return 'var(--accent)';
  if (score >= 40) return 'var(--warning)';
  return 'var(--error)';
}
