'use client';

import { useState, useCallback } from 'react';
import { CodeEditor } from '@/components/CodeEditor';
import type { AttemptV2, Problem } from './types';

interface ImplementStepProps {
  attempt: AttemptV2;
  problem: Problem;
  onSubmitCode: (data: { code: string; language: string }) => Promise<void>;
  onRequestHint: () => Promise<void>;
  loading?: boolean;
  hintLoading?: boolean;
  hints?: Array<{ level: string; text: string }>;
}

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

/**
 * ImplementStep - Code writing phase
 *
 * Reuses CodeEditor component with additional hint budget display
 * and a checklist based on the user's plan.
 */
export function ImplementStep({
  attempt,
  problem,
  onSubmitCode,
  onRequestHint,
  loading = false,
  hintLoading = false,
  hints = [],
}: ImplementStepProps) {
  const hintsRemaining = attempt.hintBudget - attempt.hintsUsedCount;
  const planPayload = attempt.planPayload;

  // Generate checklist from plan
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => {
    const items: ChecklistItem[] = [
      { id: 'invariant', text: 'Maintain your stated invariant throughout the loop', checked: false },
      { id: 'edge-empty', text: 'Handle empty input', checked: false },
      { id: 'edge-single', text: 'Handle single element', checked: false },
      { id: 'complexity', text: `Achieve ${planPayload?.complexity || 'target'} time complexity`, checked: false },
    ];

    // Add pattern-specific items
    if (planPayload?.chosenPattern) {
      const pattern = planPayload.chosenPattern.toUpperCase();
      if (pattern.includes('WINDOW') || pattern.includes('TWO_POINTER')) {
        items.push({ id: 'pointers', text: 'Initialize left and right pointers correctly', checked: false });
        items.push({ id: 'shrink', text: 'Shrink window when constraint violated', checked: false });
      } else if (pattern.includes('BINARY')) {
        items.push({ id: 'mid', text: 'Calculate mid without overflow', checked: false });
        items.push({ id: 'bounds', text: 'Update left/right bounds correctly', checked: false });
      } else if (pattern.includes('DP') || pattern.includes('DYNAMIC')) {
        items.push({ id: 'base', text: 'Set base cases correctly', checked: false });
        items.push({ id: 'transition', text: 'Implement state transition', checked: false });
      }
    }

    return items;
  });

  const handleChecklistToggle = useCallback((id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  }, []);

  const handleSubmitCode = async (data: { code: string; language: string }) => {
    await onSubmitCode(data);
  };

  const completedCount = checklist.filter((item) => item.checked).length;
  const totalCount = checklist.length;

  return (
    <div className="implement-step">
      {/* Main editor area */}
      <div className="implement-step__editor-section">
        <div className="implement-step__header">
          <div className="implement-step__header-left">
            <h2 className="implement-step__title">{problem.title}</h2>
            {planPayload?.chosenPattern && (
              <span className="implement-step__pattern-badge">
                {planPayload.chosenPattern.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <div className="implement-step__header-right">
            <button
              type="button"
              className="btn btn-secondary implement-step__hint-btn"
              onClick={onRequestHint}
              disabled={hintLoading || hintsRemaining <= 0}
            >
              {hintLoading ? (
                <span className="spinner" style={{ width: '14px', height: '14px' }} />
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M8 1.5a5.5 5.5 0 00-2.456 10.422c.152.086.282.194.382.327.1.132.17.28.202.438l.2 1.313h3.344l.2-1.313c.031-.158.102-.306.202-.438.1-.133.23-.241.382-.327A5.5 5.5 0 008 1.5zM6.5 14.5A.5.5 0 017 14h2a.5.5 0 01.5.5v.5a.5.5 0 01-.5.5H7a.5.5 0 01-.5-.5v-.5z" />
                </svg>
              )}
              <span>Request Hint</span>
              <span className="implement-step__hint-count">
                {hintsRemaining} left
              </span>
            </button>
          </div>
        </div>

        {/* Hint budget meter */}
        <div className="implement-step__hint-meter">
          <div className="implement-step__hint-meter-bar">
            <div
              className="implement-step__hint-meter-fill"
              style={{
                width: `${(hintsRemaining / attempt.hintBudget) * 100}%`,
              }}
              data-level={
                hintsRemaining > attempt.hintBudget * 0.6
                  ? 'healthy'
                  : hintsRemaining > attempt.hintBudget * 0.3
                  ? 'warning'
                  : 'critical'
              }
            />
          </div>
        </div>

        {/* Active hints */}
        {hints.length > 0 && (
          <div className="implement-step__hints">
            {hints.map((hint, idx) => (
              <div key={idx} className="implement-step__hint">
                <div className="implement-step__hint-header">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M8 1.5a5.5 5.5 0 00-2.456 10.422c.152.086.282.194.382.327.1.132.17.28.202.438l.2 1.313h3.344l.2-1.313c.031-.158.102-.306.202-.438.1-.133.23-.241.382-.327A5.5 5.5 0 008 1.5z" />
                  </svg>
                  <span className="implement-step__hint-level">{hint.level}</span>
                </div>
                <p className="implement-step__hint-text">{hint.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Code editor */}
        <div className="implement-step__code-editor">
          <CodeEditor
            onSubmit={handleSubmitCode}
            loading={loading}
          />
        </div>
      </div>

      {/* Sidebar with checklist and invariant */}
      <aside className="implement-step__sidebar">
        {/* Invariant reminder */}
        {planPayload?.invariant && (
          <div className="implement-step__invariant-card">
            <h3 className="implement-step__sidebar-title">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Your Invariant
            </h3>
            <p className="implement-step__invariant-text">
              {planPayload.invariant.text}
            </p>
          </div>
        )}

        {/* Implementation checklist */}
        <div className="implement-step__checklist-card">
          <h3 className="implement-step__sidebar-title">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
            Implementation Checklist
            <span className="implement-step__checklist-progress">
              {completedCount}/{totalCount}
            </span>
          </h3>

          <ul className="implement-step__checklist">
            {checklist.map((item) => (
              <li key={item.id} className="implement-step__checklist-item">
                <label className="implement-step__checklist-label">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => handleChecklistToggle(item.id)}
                    className="implement-step__checklist-checkbox"
                  />
                  <span
                    className={`implement-step__checklist-text ${
                      item.checked ? 'checked' : ''
                    }`}
                  >
                    {item.text}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        {/* Complexity target */}
        {planPayload?.complexity && (
          <div className="implement-step__complexity-card">
            <h3 className="implement-step__sidebar-title">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Target Complexity
            </h3>
            <p className="implement-step__complexity-text">
              {planPayload.complexity}
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

export default ImplementStep;
