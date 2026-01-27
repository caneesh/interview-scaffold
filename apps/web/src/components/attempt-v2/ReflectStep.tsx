'use client';

import { useState, useCallback } from 'react';
import type { AttemptV2, Problem, SubmitReflectRequest } from './types';

interface ReflectStepProps {
  attempt: AttemptV2;
  problem: Problem;
  onSubmit: (data: SubmitReflectRequest) => Promise<void>;
  onComplete: () => void;
  loading?: boolean;
  microLessonUrl?: string;
  adversaryPrompt?: string;
}

/**
 * ReflectStep - Generalization and learning capture phase
 *
 * Captures "cues for next time", invariant summary,
 * links to micro-lessons, and optional adversary challenges.
 */
export function ReflectStep({
  attempt,
  problem,
  onSubmit,
  onComplete,
  loading = false,
  microLessonUrl,
  adversaryPrompt,
}: ReflectStepProps) {
  const existingPayload = attempt.reflectPayload;

  const [cues, setCues] = useState<string[]>(
    existingPayload?.cuesNextTime ?? ['']
  );
  const [invariantSummary, setInvariantSummary] = useState<string>(
    existingPayload?.invariantSummary ?? ''
  );
  const [adversaryResponse, setAdversaryResponse] = useState<string>('');
  const [showAdversary, setShowAdversary] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleCueChange = useCallback((index: number, value: string) => {
    setCues((prev) => {
      const newCues = [...prev];
      newCues[index] = value;
      return newCues;
    });
  }, []);

  const addCue = useCallback(() => {
    setCues((prev) => [...prev, '']);
  }, []);

  const removeCue = useCallback((index: number) => {
    setCues((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const isFormValid = useCallback(() => {
    const filledCues = cues.filter((c) => c.trim().length > 0);
    return filledCues.length >= 1;
  }, [cues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid() || loading) return;

    try {
      await onSubmit({
        cuesNextTime: cues.filter((c) => c.trim().length > 0),
        invariantSummary,
      });
      setSubmitted(true);
    } catch (err) {
      // Error handling
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  return (
    <div className="reflect-step">
      <div className="reflect-step__main">
        <div className="reflect-step__header">
          <div className="reflect-step__icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2a8 8 0 00-8 8c0 3.2 1.9 6 4.6 7.3.2.1.4.3.5.5l.4 2.7h5l.4-2.7c.1-.2.3-.4.5-.5A8 8 0 0012 2z" />
              <path d="M10 22h4" />
            </svg>
          </div>
          <div>
            <h2 className="reflect-step__title">Reflect and Generalize</h2>
            <p className="reflect-step__subtitle">
              Capture what you learned to strengthen pattern recognition for
              similar problems.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="reflect-step__form">
          {/* Cues for next time */}
          <div className="form-group">
            <label className="label">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ marginRight: '0.5rem' }}
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Cues for Next Time
              <span className="label-hint">
                What signals or patterns should you recognize in future problems?
              </span>
            </label>

            <div className="reflect-step__cues">
              {cues.map((cue, index) => (
                <div key={index} className="reflect-step__cue-row">
                  <input
                    type="text"
                    className="input reflect-step__cue-input"
                    value={cue}
                    onChange={(e) => handleCueChange(index, e.target.value)}
                    placeholder={`Cue ${index + 1}: When I see..., I should think...`}
                    disabled={loading || submitted}
                  />
                  {cues.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm reflect-step__cue-remove"
                      onClick={() => removeCue(index)}
                      disabled={loading || submitted}
                      aria-label="Remove cue"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                      >
                        <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}

              {!submitted && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm reflect-step__add-cue"
                  onClick={addCue}
                  disabled={loading}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M8 0a.75.75 0 01.75.75v6.5h6.5a.75.75 0 010 1.5h-6.5v6.5a.75.75 0 01-1.5 0v-6.5H.75a.75.75 0 010-1.5h6.5V.75A.75.75 0 018 0z" />
                  </svg>
                  Add another cue
                </button>
              )}
            </div>
          </div>

          {/* Invariant summary */}
          <div className="form-group">
            <label className="label">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ marginRight: '0.5rem' }}
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
              Invariant Summary (Optional)
              <span className="label-hint">
                Summarize the key invariant for this pattern in your own words.
              </span>
            </label>
            <textarea
              className="textarea"
              value={invariantSummary}
              onChange={(e) => setInvariantSummary(e.target.value)}
              placeholder="The key insight is to maintain... which ensures that..."
              rows={3}
              disabled={loading || submitted}
            />
          </div>

          {/* Micro-lesson link */}
          {microLessonUrl && (
            <div className="reflect-step__micro-lesson">
              <div className="reflect-step__micro-lesson-header">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                <span>Recommended Micro-Lesson</span>
              </div>
              <a
                href={microLessonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="reflect-step__micro-lesson-link"
              >
                View lesson on {problem.pattern.replace(/_/g, ' ')}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M3.75 2h3.5a.75.75 0 010 1.5h-2.19l5.72 5.72a.75.75 0 11-1.06 1.06L4 4.56v2.19a.75.75 0 01-1.5 0v-3.5A.75.75 0 013.75 2z" />
                  <path d="M6.75 5h5.5a.75.75 0 01.75.75v7.5a.75.75 0 01-.75.75h-7.5a.75.75 0 01-.75-.75v-5.5a.75.75 0 011.5 0V12.5h6v-6H6.75a.75.75 0 010-1.5z" />
                </svg>
              </a>
            </div>
          )}

          {/* Submit or complete */}
          {!submitted ? (
            <button
              type="submit"
              className="btn btn-primary reflect-step__submit"
              disabled={!isFormValid() || loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Saving...
                </>
              ) : (
                'Save Reflections'
              )}
            </button>
          ) : (
            <div className="reflect-step__submitted">
              <div className="reflect-step__submitted-message">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 16 16"
                  fill="var(--success)"
                >
                  <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.78 5.28a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0l-2-2a.75.75 0 111.06-1.06l1.47 1.47 3.72-3.72a.75.75 0 011.06 0z" />
                </svg>
                <span>Reflections saved!</span>
              </div>

              <button
                type="button"
                className="btn btn-primary reflect-step__complete"
                onClick={handleComplete}
              >
                Complete Attempt
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  style={{ marginLeft: '0.5rem' }}
                >
                  <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.78 5.28a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0l-2-2a.75.75 0 111.06-1.06l1.47 1.47 3.72-3.72a.75.75 0 011.06 0z" />
                </svg>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Adversary challenge sidebar */}
      {adversaryPrompt && (
        <aside className="reflect-step__adversary">
          <div className="reflect-step__adversary-header">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M12 11v4" />
              <path d="M12 7h.01" />
            </svg>
            <span>Level Up Challenge (Optional)</span>
          </div>

          {!showAdversary ? (
            <div className="reflect-step__adversary-preview">
              <p>
                Test your understanding with an adversarial challenge.
                Can you handle a tricky variation?
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAdversary(true)}
              >
                Take the Challenge
              </button>
            </div>
          ) : (
            <div className="reflect-step__adversary-content">
              <p className="reflect-step__adversary-prompt">{adversaryPrompt}</p>
              <textarea
                className="textarea"
                value={adversaryResponse}
                onChange={(e) => setAdversaryResponse(e.target.value)}
                placeholder="Your response..."
                rows={4}
              />
              <div className="reflect-step__adversary-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowAdversary(false)}
                >
                  Skip
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!adversaryResponse.trim()}
                >
                  Submit Response
                </button>
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

export default ReflectStep;
