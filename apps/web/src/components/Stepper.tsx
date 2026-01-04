'use client';

export type StepStatus = 'pending' | 'active' | 'completed';

export interface StepConfig {
  id: string;
  label: string;
  status: StepStatus;
}

interface StepperProps {
  steps: StepConfig[];
}

export function Stepper({ steps }: StepperProps) {
  return (
    <div className="stepper">
      {steps.map((step, index) => (
        <div key={step.id} className={`step ${step.status}`}>
          <div className="step-indicator">
            {step.status === 'completed' ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 6L5 9L10 3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              index + 1
            )}
          </div>
          <span className="step-label">{step.label}</span>
          {index < steps.length - 1 && <div className="step-connector" />}
        </div>
      ))}
    </div>
  );
}
