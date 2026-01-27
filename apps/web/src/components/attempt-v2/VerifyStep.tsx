'use client';

import { useState, useCallback } from 'react';
import { TestResults } from '@/components/TestResults';
import type {
  AttemptV2,
  Problem,
  TestResultData,
  ExplainFailureRequest,
  ExplainFailureResponse,
} from './types';

interface VerifyStepProps {
  attempt: AttemptV2;
  problem: Problem;
  testResults: TestResultData[];
  onExplainFailure: (data: ExplainFailureRequest) => Promise<ExplainFailureResponse>;
  onRetry: () => void;
  onGiveUp: () => void;
  onContinue: () => void;
  loading?: boolean;
  traceData?: {
    success: boolean;
    frames: Array<{ iter: number; vars: Record<string, unknown>; label?: string }>;
    error?: string;
  } | null;
}

interface FailureExplanationState {
  testIndex: number;
  userExplanation: string;
  aiGuidance: ExplainFailureResponse | null;
  loading: boolean;
}

/**
 * VerifyStep - Test and debug phase
 *
 * Shows test results, allows users to explain failures,
 * and provides AI debugging guidance.
 */
export function VerifyStep({
  attempt,
  problem,
  testResults,
  onExplainFailure,
  onRetry,
  onGiveUp,
  onContinue,
  loading = false,
  traceData,
}: VerifyStepProps) {
  const [activeFailureIndex, setActiveFailureIndex] = useState<number | null>(null);
  const [explanationState, setExplanationState] = useState<FailureExplanationState | null>(null);
  const [explanations, setExplanations] = useState<Map<number, ExplainFailureResponse>>(new Map());

  const failedTests = testResults.filter((t) => !t.passed);
  const allPassed = failedTests.length === 0 && testResults.length > 0;

  const handleExplainClick = (testIndex: number) => {
    const test = testResults[testIndex];
    if (!test) return;

    setActiveFailureIndex(testIndex);
    setExplanationState({
      testIndex,
      userExplanation: '',
      aiGuidance: explanations.get(testIndex) || null,
      loading: false,
    });
  };

  const handleExplanationChange = (value: string) => {
    if (!explanationState) return;
    setExplanationState((prev) => prev ? { ...prev, userExplanation: value } : null);
  };

  const handleSubmitExplanation = useCallback(async () => {
    if (!explanationState || explanationState.loading) return;
    if (!explanationState.userExplanation.trim()) return;

    const test = testResults[explanationState.testIndex];
    if (!test) return;

    setExplanationState((prev) => prev ? { ...prev, loading: true } : null);

    try {
      const response = await onExplainFailure({
        testIndex: explanationState.testIndex,
        testInput: test.input,
        expected: test.expected,
        actual: test.actual,
        userExplanation: explanationState.userExplanation,
      });

      setExplanationState((prev) =>
        prev ? { ...prev, aiGuidance: response, loading: false } : null
      );

      // Store for later reference
      setExplanations((prev) => new Map(prev).set(explanationState.testIndex, response));
    } catch (err) {
      setExplanationState((prev) => prev ? { ...prev, loading: false } : null);
    }
  }, [explanationState, testResults, onExplainFailure]);

  const closeExplanationPanel = () => {
    setActiveFailureIndex(null);
    setExplanationState(null);
  };

  return (
    <div className="verify-step">
      {/* Main content */}
      <div className="verify-step__main">
        <div className="verify-step__header">
          <div className="verify-step__icon">
            {allPassed ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--success)"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </div>
          <div>
            <h2 className="verify-step__title">
              {allPassed ? 'All Tests Passed!' : 'Verify Your Solution'}
            </h2>
            <p className="verify-step__subtitle">
              {allPassed
                ? 'Great job! Your solution passes all test cases.'
                : 'Review failing tests and understand why they failed.'}
            </p>
          </div>
        </div>

        {/* Test results */}
        <div className="verify-step__results">
          <TestResults results={testResults} />
        </div>

        {/* Failure explanation prompts */}
        {!allPassed && failedTests.length > 0 && (
          <div className="verify-step__failures">
            <h3 className="verify-step__section-title">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Why did these fail?
            </h3>
            <p className="verify-step__failures-hint">
              Click on a failing test to explain what you think went wrong.
              This helps you develop debugging skills.
            </p>

            <div className="verify-step__failure-cards">
              {failedTests.map((test, idx) => {
                const originalIndex = testResults.indexOf(test);
                const hasExplanation = explanations.has(originalIndex);

                return (
                  <button
                    key={originalIndex}
                    type="button"
                    className={`verify-step__failure-card ${
                      activeFailureIndex === originalIndex ? 'active' : ''
                    } ${hasExplanation ? 'explained' : ''}`}
                    onClick={() => handleExplainClick(originalIndex)}
                  >
                    <span className="verify-step__failure-label">
                      Test {originalIndex + 1}
                    </span>
                    {hasExplanation && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="var(--success)"
                      >
                        <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.78 5.28a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0l-2-2a.75.75 0 111.06-1.06l1.47 1.47 3.72-3.72a.75.75 0 011.06 0z" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Trace visualization section */}
        {traceData && (
          <div className="verify-step__trace">
            <h3 className="verify-step__section-title">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Trace Visualization
            </h3>
            {traceData.error ? (
              <div className="verify-step__trace-error">
                <p>{traceData.error}</p>
              </div>
            ) : (
              <div className="verify-step__trace-frames">
                {traceData.frames.map((frame, idx) => (
                  <div key={idx} className="verify-step__trace-frame">
                    <span className="verify-step__trace-iter">
                      Iteration {frame.iter}
                    </span>
                    {frame.label && (
                      <span className="verify-step__trace-label">{frame.label}</span>
                    )}
                    <div className="verify-step__trace-vars">
                      {Object.entries(frame.vars).map(([name, value]) => (
                        <span key={name} className="verify-step__trace-var">
                          <code>{name}</code>: <code>{JSON.stringify(value)}</code>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="verify-step__actions">
          {allPassed ? (
            <button
              type="button"
              className="btn btn-primary verify-step__continue"
              onClick={onContinue}
            >
              Continue to Reflect
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
          ) : (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onRetry}
                disabled={loading}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ marginRight: '0.5rem' }}
                >
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                Fix and Retry
              </button>
              <button
                type="button"
                className="btn btn-ghost verify-step__give-up"
                onClick={onGiveUp}
                disabled={loading}
              >
                Give Up
              </button>
            </>
          )}
        </div>
      </div>

      {/* Side panel for explanations */}
      {explanationState && activeFailureIndex !== null && (
        <aside className="verify-step__explanation-panel">
          <div className="verify-step__explanation-header">
            <h3>Explain Test {activeFailureIndex + 1} Failure</h3>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={closeExplanationPanel}
              aria-label="Close"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
              </svg>
            </button>
          </div>

          <div className="verify-step__explanation-test-info">
            <div className="verify-step__explanation-row">
              <span className="verify-step__explanation-label">Input:</span>
              <code>{testResults[activeFailureIndex]?.input}</code>
            </div>
            <div className="verify-step__explanation-row">
              <span className="verify-step__explanation-label">Expected:</span>
              <code>{testResults[activeFailureIndex]?.expected}</code>
            </div>
            <div className="verify-step__explanation-row">
              <span className="verify-step__explanation-label">Actual:</span>
              <code className="verify-step__explanation-actual">
                {testResults[activeFailureIndex]?.actual}
              </code>
            </div>
          </div>

          <div className="verify-step__explanation-form">
            <label className="label">
              Why do you think this test failed?
            </label>
            <textarea
              className="textarea"
              value={explanationState.userExplanation}
              onChange={(e) => handleExplanationChange(e.target.value)}
              placeholder="I think this failed because..."
              rows={3}
              disabled={explanationState.loading}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmitExplanation}
              disabled={
                !explanationState.userExplanation.trim() ||
                explanationState.loading
              }
            >
              {explanationState.loading ? (
                <>
                  <span className="spinner" />
                  Analyzing...
                </>
              ) : (
                'Get Debugging Guidance'
              )}
            </button>
          </div>

          {/* AI Guidance */}
          {explanationState.aiGuidance && (
            <div className="verify-step__ai-guidance">
              <h4 className="verify-step__ai-guidance-title">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Debugging Guidance
              </h4>

              <div className="verify-step__ai-guidance-section">
                <span className="verify-step__ai-guidance-label">
                  Likely Bug Type:
                </span>
                <p>{explanationState.aiGuidance.likelyBugType}</p>
              </div>

              <div className="verify-step__ai-guidance-section">
                <span className="verify-step__ai-guidance-label">
                  Why This Case Fails:
                </span>
                <p>{explanationState.aiGuidance.failingCaseExplanation}</p>
              </div>

              <div className="verify-step__ai-guidance-section verify-step__ai-guidance-next">
                <span className="verify-step__ai-guidance-label">
                  Suggested Next Step:
                </span>
                <p>{explanationState.aiGuidance.suggestedNextDebugStep}</p>
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

export default VerifyStep;
