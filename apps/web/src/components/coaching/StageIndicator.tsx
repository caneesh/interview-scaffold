'use client';

const STAGES = [
  { key: 'PROBLEM_FRAMING', label: 'Framing', shortLabel: 'Frame' },
  { key: 'PATTERN_RECOGNITION', label: 'Pattern', shortLabel: 'Pattern' },
  { key: 'FEYNMAN_VALIDATION', label: 'Feynman', shortLabel: 'Feynman' },
  { key: 'STRATEGY_DESIGN', label: 'Strategy', shortLabel: 'Strategy' },
  { key: 'CODING', label: 'Coding', shortLabel: 'Code' },
  { key: 'REFLECTION', label: 'Reflection', shortLabel: 'Reflect' },
];

interface StageIndicatorProps {
  currentStage: string;
  compact?: boolean;
}

export function StageIndicator({ currentStage, compact = false }: StageIndicatorProps) {
  const currentIndex = STAGES.findIndex(s => s.key === currentStage);

  return (
    <div className={`stage-indicator ${compact ? 'stage-indicator--compact' : ''}`}>
      {STAGES.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;

        return (
          <div
            key={stage.key}
            className={`stage-indicator-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isPending ? 'pending' : ''}`}
          >
            <div className="stage-indicator-dot">
              {isCompleted ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            {!compact && (
              <span className="stage-indicator-label">{stage.label}</span>
            )}
            {compact && isCurrent && (
              <span className="stage-indicator-label">{stage.shortLabel}</span>
            )}
            {index < STAGES.length - 1 && <div className="stage-indicator-connector" />}
          </div>
        );
      })}
    </div>
  );
}

export { STAGES };
