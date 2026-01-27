'use client';

import { type V2Step, type AttemptMode, V2_STEPS } from './types';

interface V2StepperProps {
  currentStep: V2Step;
  completedSteps: V2Step[];
  onStepClick: (step: V2Step) => void;
  mode?: AttemptMode;
}

/**
 * V2Stepper - Visual stepper for the 5-step attempt flow
 *
 * Shows: Understand - Plan - Implement - Verify - Reflect
 * Highlights current step, shows completed steps with checkmark
 * Allows clicking on completed steps or current step only
 */
export function V2Stepper({
  currentStep,
  completedSteps,
  onStepClick,
  mode = 'BEGINNER',
}: V2StepperProps) {
  const currentStepIndex = V2_STEPS.findIndex((s) => s.id === currentStep);

  function getStepStatus(step: V2Step): 'pending' | 'active' | 'completed' {
    if (completedSteps.includes(step)) return 'completed';
    if (step === currentStep) return 'active';
    return 'pending';
  }

  function isClickable(step: V2Step): boolean {
    if (step === currentStep) return false; // Already on this step
    if (completedSteps.includes(step)) return true; // Can go back to completed steps
    // In expert mode, can skip forward
    if (mode === 'EXPERT') {
      const stepIndex = V2_STEPS.findIndex((s) => s.id === step);
      return stepIndex <= currentStepIndex + 1;
    }
    return false;
  }

  function handleStepClick(step: V2Step) {
    if (isClickable(step)) {
      onStepClick(step);
    }
  }

  return (
    <div className="v2-stepper" role="navigation" aria-label="Attempt progress">
      {V2_STEPS.map((step, index) => {
        const status = getStepStatus(step.id);
        const clickable = isClickable(step.id);
        const isLast = index === V2_STEPS.length - 1;

        return (
          <div
            key={step.id}
            className={`v2-step v2-step--${status} ${clickable ? 'v2-step--clickable' : ''}`}
            onClick={() => handleStepClick(step.id)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && clickable) {
                e.preventDefault();
                handleStepClick(step.id);
              }
            }}
            tabIndex={clickable ? 0 : -1}
            role="button"
            aria-current={status === 'active' ? 'step' : undefined}
            aria-disabled={!clickable}
          >
            <div className="v2-step__indicator">
              {status === 'completed' ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="2 7 5.5 10.5 12 4" />
                </svg>
              ) : (
                <span className="v2-step__number">{index + 1}</span>
              )}
            </div>

            <div className="v2-step__content">
              <span className="v2-step__label">{step.label}</span>
              {status === 'active' && (
                <span className="v2-step__description">{step.description}</span>
              )}
            </div>

            {!isLast && <div className="v2-step__connector" />}
          </div>
        );
      })}
    </div>
  );
}

export default V2Stepper;
