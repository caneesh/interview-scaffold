'use client';

import { useState, useCallback } from 'react';
import { V2Stepper } from './V2Stepper';
import { UnderstandStep } from './UnderstandStep';
import { PlanStep } from './PlanStep';
import { ImplementStep } from './ImplementStep';
import { VerifyStep } from './VerifyStep';
import { ReflectStep } from './ReflectStep';
import { BeginnerModeToggle } from './BeginnerModeToggle';
import { ProblemStatement } from '@/components/ProblemStatement';
import type {
  V2Step,
  AttemptMode,
  AttemptV2,
  Problem,
  TestResultData,
  SubmitUnderstandRequest,
  SubmitUnderstandResponse,
  SubmitFollowupRequest,
  SuggestPatternsResponse,
  ChoosePatternRequest,
  ChoosePatternResponse,
  ExplainFailureRequest,
  ExplainFailureResponse,
  SubmitReflectRequest,
} from './types';

interface V2WorkbenchProps {
  attempt: AttemptV2;
  problem: Problem;
  onModeChange: (mode: AttemptMode) => Promise<void>;
  onStepChange: (step: V2Step) => void;

  // Understand step callbacks
  onSubmitUnderstand: (data: SubmitUnderstandRequest) => Promise<SubmitUnderstandResponse>;
  onFollowupAnswer: (data: SubmitFollowupRequest) => Promise<void>;

  // Plan step callbacks
  onSuggestPatterns: () => Promise<SuggestPatternsResponse>;
  onChoosePattern: (data: ChoosePatternRequest) => Promise<ChoosePatternResponse>;

  // Implement step callbacks
  onSubmitCode: (data: { code: string; language: string }) => Promise<void>;
  onRequestHint: () => Promise<void>;

  // Verify step callbacks
  testResults: TestResultData[];
  onExplainFailure: (data: ExplainFailureRequest) => Promise<ExplainFailureResponse>;
  onRetry: () => void;
  onGiveUp: () => void;

  // Reflect step callbacks
  onSubmitReflect: (data: SubmitReflectRequest) => Promise<void>;
  onComplete: () => void;

  // Loading states
  loading?: boolean;
  hintLoading?: boolean;
  hints?: Array<{ level: string; text: string }>;

  // Optional micro-lesson and adversary
  microLessonUrl?: string;
  adversaryPrompt?: string;
}

/**
 * V2Workbench - Main container for the 5-step attempt flow
 *
 * Coordinates the step navigation, layout, and renders the appropriate
 * step component based on the current v2Step.
 */
export function V2Workbench({
  attempt,
  problem,
  onModeChange,
  onStepChange,
  onSubmitUnderstand,
  onFollowupAnswer,
  onSuggestPatterns,
  onChoosePattern,
  onSubmitCode,
  onRequestHint,
  testResults,
  onExplainFailure,
  onRetry,
  onGiveUp,
  onSubmitReflect,
  onComplete,
  loading = false,
  hintLoading = false,
  hints = [],
  microLessonUrl,
  adversaryPrompt,
}: V2WorkbenchProps) {
  const currentStep = attempt.v2Step;
  const [problemCollapsed, setProblemCollapsed] = useState(
    currentStep !== 'UNDERSTAND'
  );

  // Calculate completed steps
  const stepOrder: V2Step[] = [
    'UNDERSTAND',
    'PLAN',
    'IMPLEMENT',
    'VERIFY',
    'REFLECT',
    'COMPLETE',
  ];
  const currentIndex = stepOrder.indexOf(currentStep);
  const completedSteps = stepOrder.slice(0, currentIndex);

  const handleStepClick = useCallback(
    (step: V2Step) => {
      if (completedSteps.includes(step) || step === currentStep) {
        onStepChange(step);
      }
    },
    [completedSteps, currentStep, onStepChange]
  );

  const handleModeChange = async (mode: AttemptMode) => {
    await onModeChange(mode);
  };

  const advanceStep = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < stepOrder.length) {
      const nextStep = stepOrder[nextIndex];
      if (nextStep) {
        onStepChange(nextStep);
      }
    }
  }, [currentIndex, onStepChange]);

  const goToImplement = useCallback(() => {
    onStepChange('IMPLEMENT');
  }, [onStepChange]);

  // Render the appropriate step component
  const renderStep = () => {
    switch (currentStep) {
      case 'UNDERSTAND':
        return (
          <UnderstandStep
            attempt={attempt}
            problem={problem}
            onSubmit={onSubmitUnderstand}
            onFollowupAnswer={onFollowupAnswer}
            onContinue={advanceStep}
            loading={loading}
          />
        );

      case 'PLAN':
        return (
          <PlanStep
            attempt={attempt}
            problem={problem}
            onSuggestPatterns={onSuggestPatterns}
            onChoosePattern={onChoosePattern}
            onContinue={advanceStep}
            loading={loading}
          />
        );

      case 'IMPLEMENT':
        return (
          <ImplementStep
            attempt={attempt}
            problem={problem}
            onSubmitCode={onSubmitCode}
            onRequestHint={onRequestHint}
            loading={loading}
            hintLoading={hintLoading}
            hints={hints}
          />
        );

      case 'VERIFY':
        return (
          <VerifyStep
            attempt={attempt}
            problem={problem}
            testResults={testResults}
            onExplainFailure={onExplainFailure}
            onRetry={goToImplement}
            onGiveUp={onGiveUp}
            onContinue={advanceStep}
            loading={loading}
          />
        );

      case 'REFLECT':
        return (
          <ReflectStep
            attempt={attempt}
            problem={problem}
            onSubmit={onSubmitReflect}
            onComplete={onComplete}
            loading={loading}
            microLessonUrl={microLessonUrl}
            adversaryPrompt={adversaryPrompt}
          />
        );

      case 'COMPLETE':
        return (
          <div className="v2-workbench__complete">
            <div className="v2-workbench__complete-icon">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--success)"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="v2-workbench__complete-title">Attempt Complete!</h2>
            <p className="v2-workbench__complete-message">
              Great job working through {problem.title}. Your reflections have
              been saved.
            </p>
            <a href="/practice" className="btn btn-primary">
              Back to Practice
            </a>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="v2-workbench">
      {/* Header */}
      <header className="v2-workbench__header">
        <div className="v2-workbench__header-left">
          <V2Stepper
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
            mode={attempt.mode}
          />
        </div>
        <div className="v2-workbench__header-right">
          <BeginnerModeToggle
            mode={attempt.mode}
            onModeChange={handleModeChange}
            disabled={loading || currentStep !== 'UNDERSTAND'}
          />
        </div>
      </header>

      {/* Main content */}
      <div className="v2-workbench__content">
        {/* Left panel - Problem statement and artifacts */}
        <aside
          className={`v2-workbench__sidebar ${
            problemCollapsed ? 'v2-workbench__sidebar--collapsed' : ''
          }`}
        >
          <div className="v2-workbench__sidebar-header">
            <span className="v2-workbench__sidebar-title">Problem</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setProblemCollapsed(!problemCollapsed)}
              aria-label={problemCollapsed ? 'Expand' : 'Collapse'}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                style={{
                  transform: problemCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s',
                }}
              >
                <path d="M5.22 9.78a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0l3.25 3.25a.75.75 0 01-1.06 1.06L9 7.06 6.28 9.78a.75.75 0 01-1.06 0z" />
              </svg>
            </button>
          </div>

          {!problemCollapsed && (
            <div className="v2-workbench__sidebar-content">
              <ProblemStatement
                problem={problem}
                collapsed={false}
              />

              {/* User artifacts */}
              {attempt.understandPayload?.explanation && (
                <div className="v2-workbench__artifact">
                  <h4 className="v2-workbench__artifact-title">
                    Your Explanation
                  </h4>
                  <p className="v2-workbench__artifact-text">
                    {attempt.understandPayload.explanation}
                  </p>
                </div>
              )}

              {attempt.planPayload?.chosenPattern && (
                <div className="v2-workbench__artifact">
                  <h4 className="v2-workbench__artifact-title">
                    Chosen Pattern
                  </h4>
                  <span className="v2-workbench__artifact-badge">
                    {attempt.planPayload.chosenPattern.replace(/_/g, ' ')}
                  </span>
                </div>
              )}

              {attempt.planPayload?.invariant && (
                <div className="v2-workbench__artifact">
                  <h4 className="v2-workbench__artifact-title">
                    Your Invariant
                  </h4>
                  <p className="v2-workbench__artifact-text">
                    {attempt.planPayload.invariant.text}
                  </p>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Center - Current step */}
        <main className="v2-workbench__main">{renderStep()}</main>
      </div>
    </div>
  );
}

export default V2Workbench;
