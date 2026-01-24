'use client';

import type { DebugGate } from './types';
import { DEBUG_GATES, getGateDisplayName, getGateIndex } from './types';

interface DebugProgressIndicatorProps {
  gates: readonly DebugGate[];
  currentGate: DebugGate;
  completedGates: readonly DebugGate[];
}

/**
 * Horizontal stepper showing progress through the 7 debug gates.
 */
export function DebugProgressIndicator({
  gates,
  currentGate,
  completedGates,
}: DebugProgressIndicatorProps) {
  const displayGates = gates.length > 0 ? gates : [...DEBUG_GATES];
  const currentIndex = getGateIndex(currentGate);
  const completedSet = new Set(completedGates);

  return (
    <div className="debug-progress">
      <div className="debug-progress-track">
        {displayGates.map((gate, index) => {
          const isCompleted = completedSet.has(gate);
          const isCurrent = gate === currentGate;
          const isPending = index > currentIndex && !isCompleted;

          let status: 'completed' | 'active' | 'pending' = 'pending';
          if (isCompleted) status = 'completed';
          else if (isCurrent) status = 'active';

          return (
            <div
              key={gate}
              className={`debug-progress-step ${status}`}
              title={getGateDisplayName(gate)}
            >
              <div className="debug-progress-indicator">
                {isCompleted ? (
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
                  <span>{index + 1}</span>
                )}
              </div>
              <span className="debug-progress-label">
                {getShortGateName(gate)}
              </span>
              {index < displayGates.length - 1 && (
                <div className={`debug-progress-connector ${isCompleted ? 'completed' : ''}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Get a shorter name for display in the progress indicator.
 */
function getShortGateName(gate: DebugGate): string {
  const shortNames: Record<DebugGate, string> = {
    SYMPTOM_CLASSIFICATION: 'Symptom',
    DETERMINISM_ANALYSIS: 'Determinism',
    PATTERN_CLASSIFICATION: 'Pattern',
    ROOT_CAUSE_HYPOTHESIS: 'Root Cause',
    FIX_STRATEGY: 'Fix',
    REGRESSION_PREVENTION: 'Regression',
    REFLECTION: 'Reflect',
  };
  return shortNames[gate];
}
