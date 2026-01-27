'use client';

import { useState, useCallback } from 'react';
import type {
  AttemptV2,
  Problem,
  SubmitUnderstandRequest,
  SubmitUnderstandResponse,
  SubmitFollowupRequest,
  AIAssessment,
} from './types';

interface UnderstandStepProps {
  attempt: AttemptV2;
  problem: Problem;
  onSubmit: (data: SubmitUnderstandRequest) => Promise<SubmitUnderstandResponse>;
  onFollowupAnswer: (data: SubmitFollowupRequest) => Promise<void>;
  onContinue: () => void;
  loading?: boolean;
}

interface FormState {
  explanation: string;
  inputOutputDescription: string;
  constraintsDescription: string;
  exampleWalkthrough: string;
  wrongApproach: string;
}

const INITIAL_FORM_STATE: FormState = {
  explanation: '',
  inputOutputDescription: '',
  constraintsDescription: '',
  exampleWalkthrough: '',
  wrongApproach: '',
};

/**
 * UnderstandStep - Feynman Gate component
 *
 * User explains the problem "like I'm 12" with structured fields.
 * AI evaluates and may ask follow-up questions.
 * Passes when AI confirms understanding without solution leakage.
 */
export function UnderstandStep({
  attempt,
  problem,
  onSubmit,
  onFollowupAnswer,
  onContinue,
  loading = false,
}: UnderstandStepProps) {
  // Initialize form from existing payload if available
  const existingPayload = attempt.understandPayload;
  const [form, setForm] = useState<FormState>(() => ({
    explanation: existingPayload?.explanation ?? '',
    inputOutputDescription: existingPayload?.inputOutputDescription ?? '',
    constraintsDescription: existingPayload?.constraintsDescription ?? '',
    exampleWalkthrough: existingPayload?.exampleWalkthrough ?? '',
    wrongApproach: existingPayload?.wrongApproach ?? '',
  }));

  const [assessment, setAssessment] = useState<AIAssessment | null>(
    existingPayload?.aiAssessment ?? null
  );
  const [followupAnswers, setFollowupAnswers] = useState<string[]>([]);
  const [activeFollowupIndex, setActiveFollowupIndex] = useState<number | null>(null);
  const [followupInput, setFollowupInput] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const hasPassed = assessment?.status === 'PASS';
  const hasFollowups =
    assessment?.followupQuestions && assessment.followupQuestions.length > 0;

  const handleInputChange = useCallback(
    (field: keyof FormState) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    },
    []
  );

  const isFormValid = useCallback(() => {
    return (
      form.explanation.trim().length >= 20 &&
      form.inputOutputDescription.trim().length >= 10 &&
      form.constraintsDescription.trim().length >= 10 &&
      form.exampleWalkthrough.trim().length >= 20
    );
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid() || loading) return;

    setSubmitError(null);

    try {
      const response = await onSubmit({
        explanation: form.explanation,
        inputOutputDescription: form.inputOutputDescription,
        constraintsDescription: form.constraintsDescription,
        exampleWalkthrough: form.exampleWalkthrough,
        wrongApproach: form.wrongApproach,
      });

      setAssessment({
        status: response.status,
        strengths: response.strengths,
        gaps: response.gaps,
        followupQuestions: response.followupQuestions,
      });

      // Reset followup state for new questions
      setFollowupAnswers([]);
      setActiveFollowupIndex(null);
      setFollowupInput('');
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to submit understanding'
      );
    }
  };

  const handleFollowupSubmit = async () => {
    if (activeFollowupIndex === null || !followupInput.trim() || loading) return;

    try {
      await onFollowupAnswer({
        questionIndex: activeFollowupIndex,
        answer: followupInput,
      });

      // Update local state
      const newAnswers = [...followupAnswers];
      newAnswers[activeFollowupIndex] = followupInput;
      setFollowupAnswers(newAnswers);

      // Move to next unanswered question or clear
      const nextUnanswered = assessment?.followupQuestions?.findIndex(
        (_, idx) => idx > activeFollowupIndex && !newAnswers[idx]
      );
      if (nextUnanswered !== undefined && nextUnanswered >= 0) {
        setActiveFollowupIndex(nextUnanswered);
        setFollowupInput('');
      } else {
        setActiveFollowupIndex(null);
        setFollowupInput('');
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to submit answer'
      );
    }
  };

  return (
    <div className="understand-step">
      {/* Left Side: Form */}
      <div className="understand-step__form-section">
        <div className="understand-step__header">
          <div className="understand-step__icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h2 className="understand-step__title">Explain the Problem</h2>
            <p className="understand-step__subtitle">
              Explain this problem like you are teaching a 12-year-old. This
              helps ensure you truly understand before coding.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="understand-step__form">
          {/* Main explanation */}
          <div className="form-group">
            <label className="label" htmlFor="explanation">
              Main Explanation
              <span className="label-hint">
                What is this problem asking? Explain simply.
              </span>
            </label>
            <textarea
              id="explanation"
              className="textarea"
              value={form.explanation}
              onChange={handleInputChange('explanation')}
              placeholder="In simple terms, this problem is asking us to..."
              rows={4}
              disabled={loading || hasPassed}
            />
            <div className="char-count">
              {form.explanation.length} / 20 min characters
            </div>
          </div>

          {/* Input/Output */}
          <div className="form-group">
            <label className="label" htmlFor="inputOutput">
              Input and Output
              <span className="label-hint">
                What goes in? What comes out?
              </span>
            </label>
            <textarea
              id="inputOutput"
              className="textarea"
              value={form.inputOutputDescription}
              onChange={handleInputChange('inputOutputDescription')}
              placeholder="Input: an array of numbers\nOutput: the maximum sum of..."
              rows={3}
              disabled={loading || hasPassed}
            />
          </div>

          {/* Constraints */}
          <div className="form-group">
            <label className="label" htmlFor="constraints">
              Constraints
              <span className="label-hint">
                What limits or special conditions apply?
              </span>
            </label>
            <textarea
              id="constraints"
              className="textarea"
              value={form.constraintsDescription}
              onChange={handleInputChange('constraintsDescription')}
              placeholder="The array can have at most 10,000 elements. Numbers can be negative..."
              rows={2}
              disabled={loading || hasPassed}
            />
          </div>

          {/* Example walkthrough */}
          <div className="form-group">
            <label className="label" htmlFor="example">
              Example Walkthrough
              <span className="label-hint">
                Walk through one example step by step
              </span>
            </label>
            <textarea
              id="example"
              className="textarea"
              value={form.exampleWalkthrough}
              onChange={handleInputChange('exampleWalkthrough')}
              placeholder="Let's say the input is [1, -2, 3]. First, I would..."
              rows={4}
              disabled={loading || hasPassed}
            />
          </div>

          {/* Wrong approach */}
          <div className="form-group">
            <label className="label" htmlFor="wrongApproach">
              One Wrong Approach (Optional)
              <span className="label-hint">
                What is a naive or incorrect approach and why?
              </span>
            </label>
            <textarea
              id="wrongApproach"
              className="textarea"
              value={form.wrongApproach}
              onChange={handleInputChange('wrongApproach')}
              placeholder="A brute force approach of checking all pairs would be O(n^2) which is too slow because..."
              rows={3}
              disabled={loading || hasPassed}
            />
          </div>

          {submitError && (
            <div className="form-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 8a.75.75 0 01-1.5 0V5a.75.75 0 011.5 0v3z" />
              </svg>
              {submitError}
            </div>
          )}

          {!hasPassed && (
            <button
              type="submit"
              className="btn btn-primary understand-step__submit"
              disabled={!isFormValid() || loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Evaluating...
                </>
              ) : assessment ? (
                'Resubmit Explanation'
              ) : (
                'Submit for Review'
              )}
            </button>
          )}

          {hasPassed && (
            <button
              type="button"
              className="btn btn-primary understand-step__continue"
              onClick={onContinue}
            >
              Continue to Plan
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

      {/* Right Side: AI Feedback */}
      <div className="understand-step__feedback-section">
        <div className="understand-step__feedback-header">
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
          <span>AI Feedback</span>
        </div>

        {!assessment && (
          <div className="understand-step__feedback-empty">
            <p>Submit your explanation to receive feedback from the AI coach.</p>
          </div>
        )}

        {assessment && (
          <div className="understand-step__feedback-content">
            {/* Status badge */}
            <div
              className={`understand-step__status understand-step__status--${assessment.status.toLowerCase()}`}
            >
              {assessment.status === 'PASS' ? (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.78 5.28a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0l-2-2a.75.75 0 111.06-1.06l1.47 1.47 3.72-3.72a.75.75 0 011.06 0z" />
                  </svg>
                  Understanding Verified
                </>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm8-3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 5zm0 8a1 1 0 100-2 1 1 0 000 2z" />
                  </svg>
                  Needs More Work
                </>
              )}
            </div>

            {/* Strengths */}
            {assessment.strengths.length > 0 && (
              <div className="understand-step__feedback-section-block">
                <h4 className="understand-step__feedback-label">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="var(--success)"
                  >
                    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.78 5.28a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0l-2-2a.75.75 0 111.06-1.06l1.47 1.47 3.72-3.72a.75.75 0 011.06 0z" />
                  </svg>
                  Strengths
                </h4>
                <ul className="understand-step__feedback-list">
                  {assessment.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Gaps */}
            {assessment.gaps.length > 0 && (
              <div className="understand-step__feedback-section-block">
                <h4 className="understand-step__feedback-label">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="var(--warning)"
                  >
                    <path d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z" />
                  </svg>
                  Areas to Improve
                </h4>
                <ul className="understand-step__feedback-list understand-step__feedback-list--gaps">
                  {assessment.gaps.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Follow-up questions */}
            {hasFollowups && (
              <div className="understand-step__followups">
                <h4 className="understand-step__feedback-label">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="var(--accent)"
                  >
                    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM6.5 6.5A1.5 1.5 0 018 5a1.51 1.51 0 011.48 1.81l-.33 1.64a.75.75 0 01.2.52V10a.75.75 0 01-.75.75H7.4a.75.75 0 01-.75-.75v-.03a.75.75 0 01.2-.52l-.33-1.64A1.5 1.5 0 016.5 6.5z" />
                  </svg>
                  Follow-up Questions
                </h4>

                <div className="understand-step__followup-list">
                  {assessment.followupQuestions.map((q, idx) => (
                    <div key={idx} className="understand-step__followup-item">
                      <div className="understand-step__followup-question">
                        <span className="understand-step__followup-number">
                          Q{idx + 1}:
                        </span>
                        {q}
                      </div>

                      {followupAnswers[idx] ? (
                        <div className="understand-step__followup-answer">
                          <span className="understand-step__followup-answer-label">
                            Your answer:
                          </span>
                          {followupAnswers[idx]}
                        </div>
                      ) : activeFollowupIndex === idx ? (
                        <div className="understand-step__followup-input-wrapper">
                          <textarea
                            className="textarea understand-step__followup-textarea"
                            value={followupInput}
                            onChange={(e) => setFollowupInput(e.target.value)}
                            placeholder="Type your answer..."
                            rows={2}
                            disabled={loading}
                          />
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={handleFollowupSubmit}
                            disabled={!followupInput.trim() || loading}
                          >
                            {loading ? (
                              <span className="spinner" />
                            ) : (
                              'Submit Answer'
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setActiveFollowupIndex(idx)}
                        >
                          Answer this question
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default UnderstandStep;
