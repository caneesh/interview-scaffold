'use client';

import { useState } from 'react';

interface Score {
  overall: number;
  patternRecognition: number;
  implementation: number;
  edgeCases: number;
  efficiency: number;
  bonus?: number;
}

interface SuccessReflectionFormProps {
  /** Prompt text from gating decision */
  prompt: string;
  /** Score achieved on this attempt */
  score: Score;
  /** Callback when user submits reflection */
  onSubmit: (data: {
    confidenceRating: 1 | 2 | 3 | 4 | 5;
    learnedInsight: string;
    improvementNote?: string;
    skipped: boolean;
  }) => Promise<void>;
  /** Callback when user skips reflection */
  onSkip: () => Promise<void>;
  /** Loading state */
  loading?: boolean;
}

export function SuccessReflectionForm({
  prompt,
  score,
  onSubmit,
  onSkip,
  loading,
}: SuccessReflectionFormProps) {
  const [confidenceRating, setConfidenceRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [learnedInsight, setLearnedInsight] = useState('');
  const [improvementNote, setImprovementNote] = useState('');

  const overallPercent = Math.round(score.overall * 100);
  const canSubmit = confidenceRating !== null && learnedInsight.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit || confidenceRating === null) return;
    await onSubmit({
      confidenceRating,
      learnedInsight: learnedInsight.trim(),
      improvementNote: improvementNote.trim() || undefined,
      skipped: false,
    });
  };

  const handleSkip = async () => {
    await onSkip();
  };

  return (
    <div className="card">
      {/* Success Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none" style={{ marginBottom: '0.75rem' }}>
          <circle cx="32" cy="32" r="30" stroke="var(--success)" strokeWidth="4" fill="none" />
          <path
            d="M20 32L28 40L44 24"
            stroke="var(--success)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h3 style={{ margin: 0, color: 'var(--success)' }}>All Tests Passed!</h3>
        <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0' }}>
          Score: <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{overallPercent}%</span>
        </p>
      </div>

      {/* Reflection Section */}
      <div style={{
        background: 'var(--bg-tertiary)',
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '1.5rem'
      }}>
        <p style={{
          color: 'var(--text-secondary)',
          margin: '0 0 0.5rem',
          fontSize: '0.875rem'
        }}>
          Take a moment to reflect on your solution
        </p>
        <p style={{ color: 'var(--text-primary)', margin: 0, fontWeight: '500' }}>
          {prompt}
        </p>
      </div>

      {/* Confidence Rating */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label className="label">How confident are you in your solution?</label>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          {([1, 2, 3, 4, 5] as const).map((rating) => (
            <button
              key={rating}
              onClick={() => setConfidenceRating(rating)}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '0.5rem',
                border: confidenceRating === rating
                  ? '2px solid var(--primary)'
                  : '1px solid var(--border)',
                background: confidenceRating === rating
                  ? 'var(--primary-bg)'
                  : 'var(--bg-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                transition: 'all 0.15s ease',
              }}
              title={getConfidenceLabel(rating)}
            >
              {rating}
            </button>
          ))}
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          marginTop: '0.5rem',
          padding: '0 0.5rem'
        }}>
          <span>Not confident</span>
          <span>Very confident</span>
        </div>
      </div>

      {/* Learned Insight */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label className="label" htmlFor="learned-insight">
          Key insight or takeaway <span style={{ color: 'var(--text-muted)' }}>(required)</span>
        </label>
        <textarea
          id="learned-insight"
          className="input"
          value={learnedInsight}
          onChange={(e) => setLearnedInsight(e.target.value)}
          placeholder="What did you learn from solving this problem?"
          rows={3}
          style={{
            resize: 'vertical',
            minHeight: '80px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        />
        {learnedInsight.length > 0 && learnedInsight.trim().length < 10 && (
          <p style={{ color: 'var(--warning)', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
            Please write at least 10 characters
          </p>
        )}
      </div>

      {/* Improvement Note (Optional) */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label className="label" htmlFor="improvement-note">
          What would you do differently? <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
        </label>
        <textarea
          id="improvement-note"
          className="input"
          value={improvementNote}
          onChange={(e) => setImprovementNote(e.target.value)}
          placeholder="Any improvements or alternative approaches you'd consider?"
          rows={2}
          style={{
            resize: 'vertical',
            minHeight: '60px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1, padding: '0.75rem' }}
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
        >
          {loading ? 'Submitting...' : 'Submit Reflection'}
        </button>
        <button
          className="btn btn-secondary"
          style={{ padding: '0.75rem 1.5rem' }}
          onClick={handleSkip}
          disabled={loading}
        >
          Skip
        </button>
      </div>

      <p style={{
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.75rem',
        margin: '1rem 0 0'
      }}>
        Reflection helps reinforce learning and track your growth
      </p>
    </div>
  );
}

function getConfidenceLabel(rating: number): string {
  switch (rating) {
    case 1: return 'Not confident - Got lucky';
    case 2: return 'Somewhat confident - Had doubts';
    case 3: return 'Moderately confident - Understood most of it';
    case 4: return 'Confident - Clear understanding';
    case 5: return 'Very confident - Could explain to others';
    default: return '';
  }
}
