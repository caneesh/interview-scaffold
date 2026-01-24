'use client';

interface DebugHintPanelProps {
  currentHint: number;
  totalHints: number;
  hintText?: string;
  onRequestHint: () => void;
  disabled?: boolean;
}

/**
 * Panel for requesting and displaying hints during a debug session.
 * Shows hint count and warns about scoring penalty.
 */
export function DebugHintPanel({
  currentHint,
  totalHints,
  hintText,
  onRequestHint,
  disabled = false,
}: DebugHintPanelProps) {
  const hintsRemaining = totalHints - currentHint;
  const hasUsedHints = currentHint > 0;
  const canRequestHint = hintsRemaining > 0 && !disabled;

  return (
    <div className="debug-hint-panel">
      <div className="debug-hint-header">
        <div className="debug-hint-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 2C6.13 2 3 5.13 3 9C3 11.38 4.19 13.47 6 14.74V17C6 17.55 6.45 18 7 18H13C13.55 18 14 17.55 14 17V14.74C15.81 13.47 17 11.38 17 9C17 5.13 13.87 2 10 2ZM7 16V15H13V16H7ZM12.85 13.1L12 13.7V14H8V13.7L7.15 13.1C5.8 12.16 5 10.63 5 9C5 6.24 7.24 4 10 4C12.76 4 15 6.24 15 9C15 10.63 14.2 12.16 12.85 13.1Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <h4 className="debug-hint-title">Hints</h4>
        <span className="debug-hint-count">
          {currentHint} / {totalHints}
        </span>
      </div>

      {/* Warning about penalty */}
      <div className="debug-hint-warning">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M7 1L1 12H13L7 1Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M7 5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="7" cy="10.5" r="0.5" fill="currentColor" />
        </svg>
        <span>Each hint reduces your score by 5% (max 25%)</span>
      </div>

      {/* Display current hint if available */}
      {hintText && (
        <div className="debug-hint-content">
          <div className="debug-hint-label">Hint {currentHint}:</div>
          <p className="debug-hint-text">{hintText}</p>
        </div>
      )}

      {/* Hint request button */}
      <button
        className="btn btn-secondary debug-hint-btn"
        onClick={onRequestHint}
        disabled={!canRequestHint}
      >
        {disabled ? (
          <>
            <span className="spinner" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
            Loading...
          </>
        ) : hintsRemaining === 0 ? (
          'No Hints Remaining'
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '0.5rem' }}>
              <path
                d="M8 1C4.13 1 1 4.13 1 8C1 11.87 4.13 15 8 15C11.87 15 15 11.87 15 8C15 4.13 11.87 1 8 1ZM8 13C5.24 13 3 10.76 3 8C3 5.24 5.24 3 8 3C10.76 3 13 5.24 13 8C13 10.76 10.76 13 8 13ZM7 7H9V11H7V7ZM7 5H9V6H7V5Z"
                fill="currentColor"
              />
            </svg>
            Request Hint ({hintsRemaining} left)
          </>
        )}
      </button>

      {/* Progressive hint history */}
      {hasUsedHints && !hintText && (
        <div className="debug-hint-history">
          <p className="debug-hint-history-note">
            You have used {currentHint} hint{currentHint !== 1 ? 's' : ''}.
            Request another hint to continue.
          </p>
        </div>
      )}
    </div>
  );
}
