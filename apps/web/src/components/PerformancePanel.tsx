'use client';

interface PerformancePanelProps {
  /** Test correctness status */
  correctness: {
    passed: number;
    total: number;
    allPassed: boolean;
  };

  /** Time budget status (optional - only shown if problem has budget tests) */
  timeBudget?: {
    exceeded: boolean;
    budgetMs: number;
    suggestion?: string;
  };

  /** Next action based on gating decision */
  nextAction?: {
    type: 'PROCEED' | 'PROCEED_WITH_REFLECTION' | 'SHOW_MICRO_LESSON' | 'REQUIRE_REFLECTION' | 'BLOCK_SUBMISSION';
    message: string;
  };
}

export function PerformancePanel({ correctness, timeBudget, nextAction }: PerformancePanelProps) {
  return (
    <div className="performance-panel">
      <h3 className="performance-panel-title">Performance</h3>

      {/* Correctness Section */}
      <div className="performance-section">
        <div className="performance-section-header">
          <span className="performance-section-label">Correctness</span>
          <span className={`performance-status ${correctness.allPassed ? 'status-pass' : 'status-fail'}`}>
            {correctness.allPassed ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            )}
            {correctness.passed}/{correctness.total} tests passed
          </span>
        </div>
      </div>

      {/* Time Budget Section (if applicable) */}
      {timeBudget && (
        <div className="performance-section">
          <div className="performance-section-header">
            <span className="performance-section-label">Time Budget ({timeBudget.budgetMs}ms)</span>
            <span className={`performance-status ${timeBudget.exceeded ? 'status-fail' : 'status-pass'}`}>
              {timeBudget.exceeded ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  Exceeded
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Within Budget
                </>
              )}
            </span>
          </div>
          {timeBudget.exceeded && timeBudget.suggestion && (
            <div className="performance-suggestion">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <p>{timeBudget.suggestion}</p>
            </div>
          )}
        </div>
      )}

      {/* Next Action Section */}
      {nextAction && (
        <div className={`performance-section performance-next-action performance-next-action--${nextAction.type.toLowerCase().replace(/_/g, '-')}`}>
          <div className="performance-section-header">
            <span className="performance-section-label">Next Step</span>
          </div>
          <p className="performance-next-action-message">{nextAction.message}</p>
        </div>
      )}
    </div>
  );
}
