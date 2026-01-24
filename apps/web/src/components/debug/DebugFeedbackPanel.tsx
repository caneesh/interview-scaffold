'use client';

import type { DebugGate } from './types';
import { getGateDisplayName } from './types';

interface DebugFeedbackPanelProps {
  isCorrect: boolean;
  feedback: string;
  rubricScores?: Record<string, number>;
  nextGate?: DebugGate | null;
}

/**
 * Displays feedback after a gate submission.
 * Shows whether the answer was correct, detailed feedback, and rubric scores.
 */
export function DebugFeedbackPanel({
  isCorrect,
  feedback,
  rubricScores,
  nextGate,
}: DebugFeedbackPanelProps) {
  return (
    <div className={`debug-feedback-panel ${isCorrect ? 'correct' : 'incorrect'}`}>
      <div className="debug-feedback-header">
        <div className="debug-feedback-icon">
          {isCorrect ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
              <path
                d="M6 10L9 13L14 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
              <path
                d="M7 7L13 13M13 7L7 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
        <span className="debug-feedback-status">
          {isCorrect ? 'Correct' : 'Not Quite Right'}
        </span>
      </div>

      <div className="debug-feedback-content">
        <p className="debug-feedback-text">{feedback}</p>
      </div>

      {rubricScores && Object.keys(rubricScores).length > 0 && (
        <div className="debug-feedback-rubric">
          <h4 className="debug-feedback-rubric-title">Evaluation Breakdown</h4>
          <div className="debug-feedback-rubric-scores">
            {Object.entries(rubricScores).map(([criterion, score]) => (
              <div key={criterion} className="debug-feedback-rubric-item">
                <span className="debug-feedback-rubric-label">
                  {formatCriterionName(criterion)}
                </span>
                <div className="debug-feedback-rubric-bar">
                  <div
                    className="debug-feedback-rubric-fill"
                    style={{ width: `${score * 100}%` }}
                  />
                </div>
                <span className="debug-feedback-rubric-value">
                  {Math.round(score * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {nextGate && isCorrect && (
        <div className="debug-feedback-next">
          <span>Next: {getGateDisplayName(nextGate)}</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M6 4L10 8L6 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

function formatCriterionName(criterion: string): string {
  return criterion
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
