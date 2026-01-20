'use client';

import { useState } from 'react';

interface HelpPanelProps {
  sessionId: string;
  currentLevel: 1 | 2 | 3 | 4 | 5;
  context?: string;
  onHelpReceived?: (level: number, response: string) => void;
}

const HELP_LEVEL_DESCRIPTIONS: Record<number, { name: string; description: string; penalty: string }> = {
  1: {
    name: 'Insight Question',
    description: 'A guiding question to spark your thinking',
    penalty: '-5%',
  },
  2: {
    name: 'Conceptual Hint',
    description: 'High-level direction without specifics',
    penalty: '-10%',
  },
  3: {
    name: 'Key Invariant',
    description: 'The core condition that must be maintained',
    penalty: '-15%',
  },
  4: {
    name: 'Structural Skeleton',
    description: 'Pseudocode outline of the solution',
    penalty: '-25%',
  },
  5: {
    name: 'Full Solution',
    description: 'Complete implementation (requires explicit request)',
    penalty: '-50%',
  },
};

export function HelpPanel({ sessionId, currentLevel, context, onHelpReceived }: HelpPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helpHistory, setHelpHistory] = useState<Array<{ level: number; response: string }>>([]);
  const [confirmLevel5, setConfirmLevel5] = useState(false);

  async function requestHelp(level: 1 | 2 | 3 | 4 | 5) {
    // Level 5 requires explicit confirmation
    if (level === 5 && !confirmLevel5) {
      setConfirmLevel5(true);
      return;
    }

    setLoading(true);
    setError(null);
    setConfirmLevel5(false);

    try {
      const res = await fetch(`/api/coaching/sessions/${sessionId}/help`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedLevel: level,
          explicitlyRequested: level === 5,
          context,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error.message);
        return;
      }

      const newHelp = { level: data.level, response: data.response };
      setHelpHistory(prev => [...prev, newHelp]);
      onHelpReceived?.(data.level, data.response);
    } catch (err) {
      setError('Failed to request help');
    } finally {
      setLoading(false);
    }
  }

  const availableLevels = [1, 2, 3, 4, 5].filter(l => l >= currentLevel) as Array<1 | 2 | 3 | 4 | 5>;

  return (
    <div className="help-panel-container">
      <button
        className="help-panel-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span>Need Help?</span>
        {currentLevel > 1 && (
          <span className="help-level-badge">Level {currentLevel}</span>
        )}
      </button>

      {isOpen && (
        <div className="help-panel">
          <div className="help-panel-header">
            <h3>Tiered Help System</h3>
            <button
              className="help-panel-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close help panel"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="help-panel-body">
            <p className="help-panel-intro">
              Each help level reveals more information but applies a score penalty.
              Start with lower levels to preserve your score.
            </p>

            {error && (
              <div className="help-panel-error">{error}</div>
            )}

            {confirmLevel5 && (
              <div className="help-panel-confirm">
                <p>
                  <strong>Warning:</strong> Level 5 reveals the full solution and applies
                  a 50% score penalty. Are you sure you want to proceed?
                </p>
                <div className="help-panel-confirm-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setConfirmLevel5(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => requestHelp(5)}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Yes, show solution'}
                  </button>
                </div>
              </div>
            )}

            {!confirmLevel5 && (
              <div className="help-levels">
                {availableLevels.map(level => {
                  const info = HELP_LEVEL_DESCRIPTIONS[level];
                  if (!info) return null;
                  const isUsed = helpHistory.some(h => h.level === level);
                  const isDisabled = loading || level < currentLevel;

                  return (
                    <button
                      key={level}
                      className={`help-level-option ${isUsed ? 'used' : ''} ${level === currentLevel ? 'current' : ''}`}
                      onClick={() => requestHelp(level)}
                      disabled={isDisabled}
                    >
                      <div className="help-level-header">
                        <span className="help-level-number">Level {level}</span>
                        <span className="help-level-penalty">{info.penalty}</span>
                      </div>
                      <div className="help-level-name">{info.name}</div>
                      <div className="help-level-description">{info.description}</div>
                      {isUsed && <div className="help-level-used-badge">Used</div>}
                    </button>
                  );
                })}
              </div>
            )}

            {helpHistory.length > 0 && (
              <div className="help-history">
                <h4>Help Received</h4>
                {helpHistory.map((help, index) => {
                  const levelInfo = HELP_LEVEL_DESCRIPTIONS[help.level as keyof typeof HELP_LEVEL_DESCRIPTIONS];
                  return (
                    <div key={index} className="help-history-item">
                      <div className="help-history-header">
                        <span className="help-history-level">
                          Level {help.level}: {levelInfo?.name ?? 'Unknown'}
                        </span>
                      </div>
                      <div className="help-history-response">{help.response}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
