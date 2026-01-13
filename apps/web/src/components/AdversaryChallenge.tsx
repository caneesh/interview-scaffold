'use client';

import { useState } from 'react';

interface AdversaryPrompt {
  id: string;
  type: string;
  prompt: string;
  hint?: string;
}

interface AdversaryChallengeProps {
  /** The challenge step ID */
  stepId: string;
  /** The mutation prompt */
  prompt: AdversaryPrompt;
  /** Callback when user submits their response */
  onSubmit: (data: { stepId: string; response: string }) => Promise<void>;
  /** Callback when user skips the challenge */
  onSkip: (stepId: string) => Promise<void>;
  /** Whether the form is in loading state */
  loading?: boolean;
  /** Previously submitted response (for display in review mode) */
  existingResponse?: string | null;
  /** Whether the challenge was skipped */
  wasSkipped?: boolean;
}

/**
 * AdversaryChallenge - "Level Up Challenge" component
 *
 * Presents a constraint mutation and asks the user to describe
 * how they would adapt their solution.
 */
export function AdversaryChallenge({
  stepId,
  prompt,
  onSubmit,
  onSkip,
  loading,
  existingResponse,
  wasSkipped,
}: AdversaryChallengeProps) {
  const [response, setResponse] = useState('');
  const [showHint, setShowHint] = useState(false);

  const isReviewMode = existingResponse !== undefined || wasSkipped;
  const minResponseLength = 50;
  const canSubmit = response.trim().length >= minResponseLength;

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    await onSubmit({ stepId, response: response.trim() });
  };

  const handleSkip = async () => {
    if (loading) return;
    await onSkip(stepId);
  };

  // Review mode - show the submitted response
  if (isReviewMode) {
    return (
      <div className="adversary-challenge adversary-challenge--review">
        <div className="adversary-header">
          <div className="adversary-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h3 className="adversary-title">Level Up Challenge</h3>
          {wasSkipped && <span className="adversary-badge adversary-badge--skipped">Skipped</span>}
          {existingResponse && <span className="adversary-badge adversary-badge--completed">Completed</span>}
        </div>

        <div className="adversary-prompt">
          <p>{prompt.prompt}</p>
        </div>

        {existingResponse && (
          <div className="adversary-response-review">
            <h4>Your Response</h4>
            <blockquote>{existingResponse}</blockquote>
          </div>
        )}
      </div>
    );
  }

  // Active challenge mode
  return (
    <div className="adversary-challenge">
      <div className="adversary-header">
        <div className="adversary-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <div>
          <h3 className="adversary-title">Level Up Challenge</h3>
          <p className="adversary-subtitle">Optional: Push your understanding further</p>
        </div>
      </div>

      <div className="adversary-prompt">
        <p>{prompt.prompt}</p>
      </div>

      {prompt.hint && (
        <div className="adversary-hint-toggle">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setShowHint(!showHint)}
          >
            {showHint ? 'Hide hint' : 'Need a hint?'}
          </button>
          {showHint && (
            <div className="adversary-hint">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p>{prompt.hint}</p>
            </div>
          )}
        </div>
      )}

      <div className="adversary-input">
        <label htmlFor="adversary-response" className="adversary-label">
          How would you adapt your solution?
        </label>
        <textarea
          id="adversary-response"
          className="adversary-textarea"
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Describe your approach... (minimum 50 characters)"
          rows={5}
          disabled={loading}
        />
        <div className="adversary-char-count">
          <span className={response.length >= minResponseLength ? 'adversary-char-count--valid' : ''}>
            {response.length}
          </span>
          {' / '}{minResponseLength} min
        </div>
      </div>

      <div className="adversary-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleSkip}
          disabled={loading}
        >
          Skip Challenge
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
        >
          {loading ? (
            <>
              <span className="spinner" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
              Submitting...
            </>
          ) : (
            'Submit Response'
          )}
        </button>
      </div>
    </div>
  );
}
