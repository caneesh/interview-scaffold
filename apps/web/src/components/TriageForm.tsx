'use client';

import { useState } from 'react';
import type { DefectCategory, SeverityLevel, PriorityLevel, TriageAnswers, TriageScore } from '@scaffold/core';

interface TriageFormProps {
  onSubmit: (answers: TriageAnswers) => Promise<void>;
  disabled?: boolean;
  existingAnswers?: TriageAnswers | null;
  existingScore?: TriageScore | null;
  rubricExplanation?: string;
}

const DEFECT_CATEGORIES: { value: DefectCategory; label: string; description: string }[] = [
  { value: 'Functional', label: 'Functional', description: 'Logic errors, incorrect behavior' },
  { value: 'Concurrency', label: 'Concurrency', description: 'Race conditions, deadlocks' },
  { value: 'Resource', label: 'Resource', description: 'Memory leaks, connection exhaustion' },
  { value: 'Distributed', label: 'Distributed', description: 'Network partitions, consistency issues' },
  { value: 'Heisenbug', label: 'Heisenbug', description: 'Non-deterministic bugs' },
  { value: 'Environment', label: 'Environment', description: 'Config issues, dependency problems' },
  { value: 'Container', label: 'Container', description: 'Docker/K8s specific issues' },
  { value: 'Performance', label: 'Performance', description: 'Slow queries, inefficient algorithms' },
  { value: 'Observability', label: 'Observability', description: 'Missing metrics, logging issues' },
];

const SEVERITY_LEVELS: { value: SeverityLevel; label: string; color: string }[] = [
  { value: 'Critical', label: 'Critical', color: 'var(--error)' },
  { value: 'Major', label: 'Major', color: 'var(--warning)' },
  { value: 'Minor', label: 'Minor', color: 'var(--info)' },
  { value: 'Low', label: 'Low', color: 'var(--text-secondary)' },
];

const PRIORITY_LEVELS: { value: PriorityLevel; label: string }[] = [
  { value: 'High', label: 'High - Fix immediately' },
  { value: 'Medium', label: 'Medium - Fix soon' },
  { value: 'Low', label: 'Low - Fix when convenient' },
];

export function TriageForm({
  onSubmit,
  disabled = false,
  existingAnswers,
  existingScore,
  rubricExplanation,
}: TriageFormProps) {
  const [category, setCategory] = useState<DefectCategory | ''>(existingAnswers?.category ?? '');
  const [severity, setSeverity] = useState<SeverityLevel | ''>(existingAnswers?.severity ?? '');
  const [priority, setPriority] = useState<PriorityLevel | ''>(existingAnswers?.priority ?? '');
  const [firstActions, setFirstActions] = useState(existingAnswers?.firstActions ?? '');
  const [submitting, setSubmitting] = useState(false);

  const isCompleted = !!existingAnswers;
  const canSubmit = category && severity && priority && firstActions.length >= 10 && !submitting && !disabled;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !category || !severity || !priority) return;

    setSubmitting(true);
    try {
      await onSubmit({ category, severity, priority, firstActions });
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'var(--success)';
    if (score >= 0.5) return 'var(--warning)';
    return 'var(--error)';
  };

  return (
    <div className="triage-form">
      <div className="triage-header">
        <h2>Triage Assessment</h2>
        <p className="triage-instructions">
          Before editing code, assess the defect based on the problem description and any available signals.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Defect Category */}
        <div className="triage-field">
          <label htmlFor="category">Defect Category</label>
          <select
            id="category"
            className="select"
            value={category}
            onChange={e => setCategory(e.target.value as DefectCategory)}
            disabled={isCompleted || disabled}
          >
            <option value="">Select category...</option>
            {DEFECT_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label} - {cat.description}
              </option>
            ))}
          </select>
          {existingScore && (
            <span
              className="triage-score-badge"
              style={{ color: getScoreColor(existingScore.categoryScore) }}
            >
              {existingScore.categoryScore === 1 ? '✓ Correct' :
               existingScore.categoryScore === 0.5 ? '~ Close' : '✗ Incorrect'}
            </span>
          )}
        </div>

        {/* Severity */}
        <div className="triage-field">
          <label>Severity</label>
          <div className="triage-radio-group">
            {SEVERITY_LEVELS.map(sev => (
              <label
                key={sev.value}
                className={`triage-radio-option ${severity === sev.value ? 'selected' : ''}`}
                style={{ borderColor: severity === sev.value ? sev.color : undefined }}
              >
                <input
                  type="radio"
                  name="severity"
                  value={sev.value}
                  checked={severity === sev.value}
                  onChange={e => setSeverity(e.target.value as SeverityLevel)}
                  disabled={isCompleted || disabled}
                />
                <span style={{ color: sev.color }}>{sev.label}</span>
              </label>
            ))}
          </div>
          {existingScore && (
            <span
              className="triage-score-badge"
              style={{ color: getScoreColor(existingScore.severityScore) }}
            >
              {existingScore.severityScore === 1 ? '✓ Correct' :
               existingScore.severityScore === 0.5 ? '~ Close' : '✗ Incorrect'}
            </span>
          )}
        </div>

        {/* Priority */}
        <div className="triage-field">
          <label>Priority</label>
          <div className="triage-radio-group vertical">
            {PRIORITY_LEVELS.map(pri => (
              <label
                key={pri.value}
                className={`triage-radio-option ${priority === pri.value ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="priority"
                  value={pri.value}
                  checked={priority === pri.value}
                  onChange={e => setPriority(e.target.value as PriorityLevel)}
                  disabled={isCompleted || disabled}
                />
                <span>{pri.label}</span>
              </label>
            ))}
          </div>
          {existingScore && (
            <span
              className="triage-score-badge"
              style={{ color: getScoreColor(existingScore.priorityScore) }}
            >
              {existingScore.priorityScore === 1 ? '✓ Correct' :
               existingScore.priorityScore === 0.5 ? '~ Close' : '✗ Incorrect'}
            </span>
          )}
        </div>

        {/* First Actions */}
        <div className="triage-field">
          <label htmlFor="firstActions">First Debugging Steps</label>
          <p className="triage-field-hint">
            What are the first 2 things you would do to investigate this issue?
          </p>
          <textarea
            id="firstActions"
            className="textarea"
            placeholder="E.g., 1. Run the failing tests to see the error output. 2. Add logging to trace the execution path..."
            value={firstActions}
            onChange={e => setFirstActions(e.target.value)}
            disabled={isCompleted || disabled}
            rows={4}
          />
          <span className="triage-char-count">
            {firstActions.length} characters {firstActions.length < 10 && '(min 10)'}
          </span>
          {existingScore && (
            <div className="triage-actions-feedback">
              <span
                className="triage-score-badge"
                style={{ color: getScoreColor(existingScore.actionsScore) }}
              >
                Score: {Math.round(existingScore.actionsScore * 100)}%
              </span>
              {existingScore.matchedActions.length > 0 && (
                <span className="triage-matched-actions">
                  Matched: {existingScore.matchedActions.join(', ')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Submit or Score Display */}
        {!isCompleted ? (
          <div className="triage-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!canSubmit}
            >
              {submitting ? (
                <>
                  <span className="spinner" style={{ width: '1rem', height: '1rem' }} />
                  Submitting...
                </>
              ) : (
                'Submit Triage'
              )}
            </button>
          </div>
        ) : existingScore && (
          <div className="triage-score-summary">
            <div className="triage-score-header">
              <h3>Triage Score</h3>
              <span
                className="triage-overall-score"
                style={{ color: getScoreColor(existingScore.overall) }}
              >
                {Math.round(existingScore.overall * 100)}%
              </span>
            </div>
            {rubricExplanation && (
              <div className="triage-explanation">
                <h4>Explanation</h4>
                <p>{rubricExplanation}</p>
              </div>
            )}
          </div>
        )}
      </form>

      <style jsx>{`
        .triage-form {
          background: var(--bg-secondary);
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .triage-header h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
        }

        .triage-instructions {
          color: var(--text-secondary);
          margin: 0 0 1.5rem 0;
        }

        .triage-field {
          margin-bottom: 1.5rem;
        }

        .triage-field label {
          display: block;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }

        .triage-field-hint {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0 0 0.5rem 0;
        }

        .triage-radio-group {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .triage-radio-group.vertical {
          flex-direction: column;
        }

        .triage-radio-option {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: 1px solid var(--border);
          border-radius: 4px;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .triage-radio-option:hover {
          border-color: var(--primary);
        }

        .triage-radio-option.selected {
          border-color: var(--primary);
          background: var(--bg-tertiary);
        }

        .triage-radio-option input {
          margin: 0;
        }

        .triage-char-count {
          display: block;
          text-align: right;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        .triage-score-badge {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 500;
          margin-top: 0.25rem;
        }

        .triage-actions-feedback {
          display: flex;
          gap: 1rem;
          align-items: center;
          margin-top: 0.5rem;
        }

        .triage-matched-actions {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .triage-actions {
          margin-top: 1.5rem;
        }

        .triage-score-summary {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border);
        }

        .triage-score-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .triage-score-header h3 {
          margin: 0;
        }

        .triage-overall-score {
          font-size: 1.5rem;
          font-weight: 600;
        }

        .triage-explanation {
          background: var(--bg-primary);
          padding: 1rem;
          border-radius: 4px;
        }

        .triage-explanation h4 {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .triage-explanation p {
          margin: 0;
          line-height: 1.6;
        }

        .select, .textarea {
          width: 100%;
        }
      `}</style>
    </div>
  );
}
