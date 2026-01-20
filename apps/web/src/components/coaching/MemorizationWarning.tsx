'use client';

import { useState } from 'react';

interface RepromptQuestion {
  id: string;
  question: string;
}

interface MemorizationWarningProps {
  warningType: 'likely_memorized' | 'partially_memorized';
  warningMessage: string;
  repromptQuestions?: RepromptQuestion[];
  allowedHelpLevel?: number;
  onRepromptAnswer?: (questionId: string, answer: string) => void;
  onDismiss?: () => void;
}

/**
 * Component to display anti-memorization warnings and reprompt questions.
 * Uses non-accusatory language to encourage genuine understanding.
 */
export function MemorizationWarning({
  warningType,
  warningMessage,
  repromptQuestions = [],
  allowedHelpLevel,
  onRepromptAnswer,
  onDismiss,
}: MemorizationWarningProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmitAnswer = async (questionId: string) => {
    const answer = answers[questionId];
    if (!answer || answer.trim().length < 20) return;

    setSubmitting(questionId);
    try {
      await onRepromptAnswer?.(questionId, answer.trim());
      // Clear the answered question
      setAnswers(prev => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    } finally {
      setSubmitting(null);
    }
  };

  const iconColor = warningType === 'likely_memorized' ? '#f59e0b' : '#3b82f6';
  const bgColor = warningType === 'likely_memorized'
    ? 'rgba(245, 158, 11, 0.1)'
    : 'rgba(59, 130, 246, 0.1)';
  const borderColor = warningType === 'likely_memorized'
    ? 'rgba(245, 158, 11, 0.3)'
    : 'rgba(59, 130, 246, 0.3)';

  return (
    <div
      className="memorization-warning"
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke={iconColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, marginTop: '2px' }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div style={{ flex: 1 }}>
          <div style={{
            fontWeight: 500,
            marginBottom: '8px',
            color: 'var(--text-primary, #1a1a1a)',
          }}>
            Understanding Check
          </div>
          <p style={{
            margin: 0,
            color: 'var(--text-secondary, #666)',
            lineHeight: 1.5,
          }}>
            {warningMessage}
          </p>

          {allowedHelpLevel !== undefined && allowedHelpLevel < 3 && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '4px',
              fontSize: '14px',
              color: 'var(--text-secondary, #666)',
            }}>
              Help level restricted to Level {allowedHelpLevel} until you demonstrate understanding.
            </div>
          )}

          {repromptQuestions.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{
                fontWeight: 500,
                marginBottom: '12px',
                color: 'var(--text-primary, #1a1a1a)',
              }}>
                Please answer the following:
              </div>
              {repromptQuestions.map((q) => (
                <div
                  key={q.id}
                  style={{
                    marginBottom: '16px',
                    padding: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{
                    marginBottom: '8px',
                    fontStyle: 'italic',
                    color: 'var(--text-primary, #1a1a1a)',
                  }}>
                    {q.question}
                  </div>
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    placeholder="Explain in your own words..."
                    disabled={submitting === q.id}
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color, #ddd)',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '8px',
                  }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>
                      {(answers[q.id] || '').length} characters (min 20)
                    </span>
                    <button
                      onClick={() => handleSubmitAnswer(q.id)}
                      disabled={
                        submitting === q.id ||
                        !answers[q.id] ||
                        (answers[q.id]?.trim().length ?? 0) < 20
                      }
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--primary-color, #2563eb)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        opacity: (submitting === q.id || !answers[q.id] || (answers[q.id]?.trim().length ?? 0) < 20) ? 0.5 : 1,
                      }}
                    >
                      {submitting === q.id ? 'Submitting...' : 'Submit Answer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {onDismiss && repromptQuestions.length === 0 && (
            <button
              onClick={onDismiss}
              style={{
                marginTop: '12px',
                padding: '6px 12px',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary, #666)',
                border: '1px solid var(--border-color, #ddd)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              I understand
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Component to display code-specific anti-cheat warnings.
 * More subtle than the main memorization warning.
 */
export function CodeAntiCheatWarning({
  warnings,
}: {
  warnings: Array<{
    type: 'editorial_pattern' | 'anti_cheat_marker';
    message: string;
    severity: 'info' | 'warning';
  }>;
}) {
  if (warnings.length === 0) return null;

  return (
    <div style={{ marginBottom: '16px' }}>
      {warnings.map((warning, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '12px',
            backgroundColor: warning.severity === 'warning'
              ? 'rgba(245, 158, 11, 0.1)'
              : 'rgba(59, 130, 246, 0.1)',
            borderRadius: '6px',
            marginBottom: index < warnings.length - 1 ? '8px' : 0,
            fontSize: '14px',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={warning.severity === 'warning' ? '#f59e0b' : '#3b82f6'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, marginTop: '2px' }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ color: 'var(--text-secondary, #666)' }}>
            {warning.message}
          </span>
        </div>
      ))}
    </div>
  );
}
