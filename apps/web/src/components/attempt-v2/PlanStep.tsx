'use client';

import { useState, useEffect, useCallback } from 'react';
import { InvariantBuilderV2 } from './InvariantBuilderV2';
import type {
  AttemptV2,
  Problem,
  SuggestedPattern,
  ChoosePatternRequest,
  ChoosePatternResponse,
  SuggestPatternsResponse,
  COMPLEXITY_OPTIONS,
} from './types';

const COMPLEXITY_OPTIONS_LIST = [
  { value: 'O(1)', label: 'O(1) - Constant' },
  { value: 'O(log n)', label: 'O(log n) - Logarithmic' },
  { value: 'O(n)', label: 'O(n) - Linear' },
  { value: 'O(n log n)', label: 'O(n log n) - Linearithmic' },
  { value: 'O(n^2)', label: 'O(n^2) - Quadratic' },
  { value: 'O(2^n)', label: 'O(2^n) - Exponential' },
];

interface PlanStepProps {
  attempt: AttemptV2;
  problem: Problem;
  onSuggestPatterns: () => Promise<SuggestPatternsResponse>;
  onChoosePattern: (data: ChoosePatternRequest) => Promise<ChoosePatternResponse>;
  onContinue: () => void;
  loading?: boolean;
}

type InvariantMode = 'builder' | 'freetext';

/**
 * PlanStep - Pattern and Invariant selection
 *
 * Shows AI-suggested patterns, allows pattern selection with confidence rating,
 * and provides InvariantBuilder for beginners or free-text for advanced users.
 */
export function PlanStep({
  attempt,
  problem,
  onSuggestPatterns,
  onChoosePattern,
  onContinue,
  loading = false,
}: PlanStepProps) {
  const existingPayload = attempt.planPayload;
  const isBeginner = attempt.mode === 'BEGINNER';

  // Pattern suggestions
  const [suggestedPatterns, setSuggestedPatterns] = useState<SuggestedPattern[]>(
    existingPayload?.suggestedPatterns ?? []
  );
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [hasFetchedSuggestions, setHasFetchedSuggestions] = useState(
    (existingPayload?.suggestedPatterns?.length ?? 0) > 0
  );

  // User selections
  const [selectedPattern, setSelectedPattern] = useState<string | null>(
    existingPayload?.chosenPattern ?? null
  );
  const [confidence, setConfidence] = useState<number>(
    existingPayload?.userConfidence ?? 3
  );
  const [complexity, setComplexity] = useState<string>(
    existingPayload?.complexity ?? ''
  );

  // Invariant
  const [invariantMode, setInvariantMode] = useState<InvariantMode>(
    isBeginner ? 'builder' : 'freetext'
  );
  const [invariantText, setInvariantText] = useState<string>(
    existingPayload?.invariant?.text ?? ''
  );
  const [invariantBuilderResult, setInvariantBuilderResult] = useState<{
    templateId: string;
    templateType: string;
    choices: Record<string, string>;
    renderedText: string;
  } | null>(null);

  // Submission feedback
  const [submitResponse, setSubmitResponse] = useState<ChoosePatternResponse | null>(
    null
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch suggestions on mount if not already present
  useEffect(() => {
    if (!hasFetchedSuggestions && suggestedPatterns.length === 0) {
      fetchSuggestions();
    }
  }, []);

  const fetchSuggestions = async () => {
    setSuggestLoading(true);
    try {
      const response = await onSuggestPatterns();
      setSuggestedPatterns(response.candidates);
      setHasFetchedSuggestions(true);
    } catch (err) {
      setSubmitError('Failed to load pattern suggestions');
    } finally {
      setSuggestLoading(false);
    }
  };

  const handlePatternSelect = (patternId: string) => {
    setSelectedPattern(patternId);
    setSubmitResponse(null);
  };

  const handleConfidenceChange = (value: number) => {
    setConfidence(value);
  };

  const handleInvariantBuilderComplete = useCallback(
    (result: {
      templateId: string;
      templateType: string;
      choices: Record<string, string>;
      renderedText: string;
    }) => {
      setInvariantBuilderResult(result);
      setInvariantText(result.renderedText);
    },
    []
  );

  const isFormValid = useCallback(() => {
    if (!selectedPattern) return false;
    if (invariantMode === 'builder') {
      return invariantBuilderResult !== null || invariantText.trim().length > 0;
    }
    return invariantText.trim().length >= 10;
  }, [selectedPattern, invariantMode, invariantBuilderResult, invariantText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid() || loading || !selectedPattern) return;

    setSubmitError(null);

    try {
      const request: ChoosePatternRequest = {
        patternId: selectedPattern,
        confidence,
        invariantText: invariantText,
        complexity: complexity || undefined,
      };

      if (invariantBuilderResult) {
        request.invariantBuilder = {
          templateId: invariantBuilderResult.templateId,
          choices: Object.fromEntries(
            Object.entries(invariantBuilderResult.choices).map(([k, v]) => [
              k,
              parseInt(v) || 0,
            ])
          ),
        };
      }

      const response = await onChoosePattern(request);
      setSubmitResponse(response);

      if (response.accepted && response.match !== 'MISMATCH') {
        // Pattern accepted, will show continue button
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to submit pattern choice'
      );
    }
  };

  const canContinue =
    submitResponse?.accepted && submitResponse.match !== 'MISMATCH';

  return (
    <div className="plan-step">
      {/* Left: Pattern Selection */}
      <div className="plan-step__main">
        <div className="plan-step__header">
          <div className="plan-step__icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h2 className="plan-step__title">Choose Your Approach</h2>
            <p className="plan-step__subtitle">
              Select the pattern that best fits this problem and state your
              invariant.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="plan-step__form">
          {/* Pattern suggestions */}
          <div className="form-group">
            <label className="label">
              Suggested Patterns
              <span className="label-hint">
                Based on your problem understanding
              </span>
            </label>

            {suggestLoading ? (
              <div className="plan-step__loading">
                <span className="spinner" />
                <span>Analyzing problem for pattern suggestions...</span>
              </div>
            ) : suggestedPatterns.length > 0 ? (
              <div className="plan-step__patterns">
                {suggestedPatterns.map((pattern) => (
                  <div
                    key={pattern.patternId}
                    className={`plan-step__pattern-card ${
                      selectedPattern === pattern.patternId ? 'selected' : ''
                    }`}
                    onClick={() => handlePatternSelect(pattern.patternId)}
                    role="radio"
                    aria-checked={selectedPattern === pattern.patternId}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handlePatternSelect(pattern.patternId);
                      }
                    }}
                  >
                    <div className="plan-step__pattern-header">
                      <span className="plan-step__pattern-name">
                        {pattern.name}
                      </span>
                      <span className="plan-step__pattern-confidence">
                        {Math.round(pattern.aiConfidence * 100)}% match
                      </span>
                    </div>
                    <p className="plan-step__pattern-reason">{pattern.reason}</p>
                    {selectedPattern === pattern.patternId && (
                      <div className="plan-step__pattern-selected-indicator">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                        >
                          <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.78 5.28a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0l-2-2a.75.75 0 111.06-1.06l1.47 1.47 3.72-3.72a.75.75 0 011.06 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={fetchSuggestions}
                disabled={suggestLoading}
              >
                Get Pattern Suggestions
              </button>
            )}
          </div>

          {/* Confidence slider */}
          {selectedPattern && (
            <div className="form-group">
              <label className="label">
                Your Confidence
                <span className="label-hint">
                  How confident are you in this pattern choice?
                </span>
              </label>
              <div className="plan-step__confidence">
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={confidence}
                  onChange={(e) =>
                    handleConfidenceChange(parseInt(e.target.value))
                  }
                  className="plan-step__confidence-slider"
                />
                <div className="plan-step__confidence-labels">
                  <span className={confidence === 1 ? 'active' : ''}>
                    Not sure
                  </span>
                  <span className={confidence === 2 ? 'active' : ''}>
                    Somewhat
                  </span>
                  <span className={confidence === 3 ? 'active' : ''}>
                    Moderate
                  </span>
                  <span className={confidence === 4 ? 'active' : ''}>
                    Confident
                  </span>
                  <span className={confidence === 5 ? 'active' : ''}>
                    Very confident
                  </span>
                </div>
              </div>
              {isBeginner && confidence <= 2 && (
                <p className="plan-step__confidence-hint">
                  Low confidence detected. Consider reviewing the pattern
                  suggestions or requesting Pattern Discovery help.
                </p>
              )}
            </div>
          )}

          {/* Invariant section */}
          {selectedPattern && (
            <div className="form-group">
              <div className="plan-step__invariant-header">
                <label className="label">
                  State Your Invariant
                  <span className="label-hint">
                    What property will your solution maintain?
                  </span>
                </label>

                {/* Mode toggle for non-beginners */}
                {!isBeginner && (
                  <div className="plan-step__invariant-mode-toggle">
                    <button
                      type="button"
                      className={`btn btn-ghost btn-sm ${
                        invariantMode === 'builder' ? 'active' : ''
                      }`}
                      onClick={() => setInvariantMode('builder')}
                    >
                      Builder
                    </button>
                    <button
                      type="button"
                      className={`btn btn-ghost btn-sm ${
                        invariantMode === 'freetext' ? 'active' : ''
                      }`}
                      onClick={() => setInvariantMode('freetext')}
                    >
                      Free Text
                    </button>
                  </div>
                )}
              </div>

              {invariantMode === 'builder' ? (
                <InvariantBuilderV2
                  patternId={selectedPattern}
                  onComplete={handleInvariantBuilderComplete}
                  showFreeTextFallback={isBeginner}
                  onFreeTextChange={(text) => setInvariantText(text)}
                />
              ) : (
                <textarea
                  className="textarea"
                  value={invariantText}
                  onChange={(e) => setInvariantText(e.target.value)}
                  placeholder="At the start of iteration i, the window [left, right] contains at most k distinct characters..."
                  rows={3}
                  disabled={loading}
                />
              )}
            </div>
          )}

          {/* Complexity selection */}
          {selectedPattern && (
            <div className="form-group">
              <label className="label" htmlFor="complexity">
                Expected Time Complexity
              </label>
              <select
                id="complexity"
                className="select"
                value={complexity}
                onChange={(e) => setComplexity(e.target.value)}
                disabled={loading}
              >
                <option value="">Select complexity...</option>
                {COMPLEXITY_OPTIONS_LIST.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {submitError && (
            <div className="form-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 8a.75.75 0 01-1.5 0V5a.75.75 0 011.5 0v3z" />
              </svg>
              {submitError}
            </div>
          )}

          {!canContinue && (
            <button
              type="submit"
              className="btn btn-primary plan-step__submit"
              disabled={!isFormValid() || loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Validating...
                </>
              ) : submitResponse ? (
                'Try Again'
              ) : (
                'Commit to This Plan'
              )}
            </button>
          )}

          {canContinue && (
            <button
              type="button"
              className="btn btn-primary plan-step__continue"
              onClick={onContinue}
            >
              Continue to Implement
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                style={{ marginLeft: '0.5rem' }}
              >
                <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z" />
              </svg>
            </button>
          )}
        </form>
      </div>

      {/* Right: Feedback panel */}
      <div className="plan-step__feedback">
        <div className="plan-step__feedback-header">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Pattern Guidance</span>
        </div>

        {!submitResponse && !selectedPattern && (
          <div className="plan-step__feedback-empty">
            <p>
              Select a pattern to see guidance. The AI will validate your choice
              when you submit.
            </p>
          </div>
        )}

        {selectedPattern && !submitResponse && (
          <div className="plan-step__feedback-content">
            <h4>Tips for this pattern</h4>
            <ul className="plan-step__tips-list">
              <li>State your invariant clearly before writing code</li>
              <li>Consider edge cases: empty input, single element, etc.</li>
              <li>Think about the time complexity you expect</li>
            </ul>
          </div>
        )}

        {submitResponse && (
          <div className="plan-step__feedback-content">
            <div
              className={`plan-step__match-badge plan-step__match-badge--${submitResponse.match.toLowerCase()}`}
            >
              {submitResponse.match === 'GOOD' && (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.78 5.28a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0l-2-2a.75.75 0 111.06-1.06l1.47 1.47 3.72-3.72a.75.75 0 011.06 0z" />
                  </svg>
                  Good Match
                </>
              )}
              {submitResponse.match === 'MAYBE' && (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm8-3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 5zm0 8a1 1 0 100-2 1 1 0 000 2z" />
                  </svg>
                  Possible Match
                </>
              )}
              {submitResponse.match === 'MISMATCH' && (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.28 4.72a.75.75 0 010 1.06L9.06 8l2.22 2.22a.75.75 0 11-1.06 1.06L8 9.06l-2.22 2.22a.75.75 0 01-1.06-1.06L6.94 8 4.72 5.78a.75.75 0 011.06-1.06L8 6.94l2.22-2.22a.75.75 0 011.06 0z" />
                  </svg>
                  Pattern Mismatch
                </>
              )}
            </div>

            <p className="plan-step__rationale">{submitResponse.rationale}</p>

            {submitResponse.invariantFeedback && (
              <div className="plan-step__invariant-feedback">
                <h4>Invariant Feedback</h4>
                <p>{submitResponse.invariantFeedback}</p>
              </div>
            )}

            {submitResponse.discoveryRecommended && (
              <div className="plan-step__discovery-hint">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M8 1.5a5.5 5.5 0 00-2.456 10.422c.152.086.282.194.382.327.1.132.17.28.202.438l.2 1.313h3.344l.2-1.313c.031-.158.102-.306.202-.438.1-.133.23-.241.382-.327A5.5 5.5 0 008 1.5zM6.5 14.5A.5.5 0 017 14h2a.5.5 0 01.5.5v.5a.5.5 0 01-.5.5H7a.5.5 0 01-.5-.5v-.5z" />
                </svg>
                <span>
                  Consider using Pattern Discovery to explore alternative
                  approaches.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PlanStep;
