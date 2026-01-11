'use client';

import { useState } from 'react';
import { HintPanel } from './HintPanel';

interface Hint {
  level: string;
  text: string;
}

interface CoachDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Hint functionality */
  hints: Hint[];
  onRequestHint: () => Promise<void>;
  hintLoading?: boolean;
  hintsRemaining?: number;
  /** Optional: Skip/abandon functionality */
  onAbandon?: () => void;
  /** Optional: Show analytics */
  submissionCount?: number;
  elapsedTime?: string;
}

/**
 * Coach Tools Drawer - Single entry point for all secondary tools
 *
 * Contains:
 * - Hints (with request button)
 * - Tutor/Explain features (future)
 * - Skip/rewind controls
 * - Analytics and extra controls
 */
export function CoachDrawer({
  isOpen,
  onClose,
  hints,
  onRequestHint,
  hintLoading,
  hintsRemaining = 5,
  onAbandon,
  submissionCount,
  elapsedTime,
}: CoachDrawerProps) {
  const [activeTab, setActiveTab] = useState<'hints' | 'tools'>('hints');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="drawer-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="drawer drawer--right">
        <div className="drawer-header">
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Coach Tools</h3>
          <button
            className="btn btn-ghost"
            onClick={onClose}
            aria-label="Close drawer"
            style={{ padding: '0.25rem' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="drawer-tabs">
          <button
            className={`drawer-tab ${activeTab === 'hints' ? 'active' : ''}`}
            onClick={() => setActiveTab('hints')}
          >
            Hints ({hints.length})
          </button>
          <button
            className={`drawer-tab ${activeTab === 'tools' ? 'active' : ''}`}
            onClick={() => setActiveTab('tools')}
          >
            Tools
          </button>
        </div>

        <div className="drawer-body">
          {activeTab === 'hints' && (
            <div>
              {/* Request Hint Button */}
              <button
                className="btn btn-secondary"
                style={{ width: '100%', marginBottom: '1rem' }}
                onClick={onRequestHint}
                disabled={hintLoading || hintsRemaining === 0}
              >
                {hintLoading ? (
                  <>
                    <span className="spinner" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                    Loading hint...
                  </>
                ) : hintsRemaining === 0 ? (
                  'No hints remaining'
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '0.5rem' }}>
                      <path d="M8 1.5a5.5 5.5 0 00-2.456 10.422c.152.086.282.194.382.327.1.132.17.28.202.438l.2 1.313h3.344l.2-1.313c.031-.158.102-.306.202-.438.1-.133.23-.241.382-.327A5.5 5.5 0 008 1.5zM6.5 14.5A.5.5 0 017 14h2a.5.5 0 01.5.5v.5a.5.5 0 01-.5.5H7a.5.5 0 01-.5-.5v-.5z"/>
                    </svg>
                    Get Hint ({hintsRemaining} left)
                  </>
                )}
              </button>

              {/* Hint cost warning */}
              {hintsRemaining > 0 && hintsRemaining <= 2 && (
                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--warning)',
                  marginBottom: '1rem',
                  padding: '0.5rem',
                  background: 'rgba(234, 179, 8, 0.1)',
                  borderRadius: '0.25rem',
                }}>
                  Hints affect your score. Use wisely!
                </p>
              )}

              {/* Hints list */}
              {hints.length > 0 ? (
                <HintPanel hints={hints} />
              ) : (
                <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>
                    No hints used yet. Stuck? Request a hint above.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tools' && (
            <div>
              {/* Session Stats */}
              {(submissionCount !== undefined || elapsedTime) && (
                <div style={{
                  padding: '1rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem',
                }}>
                  <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Session Stats
                  </h4>
                  {submissionCount !== undefined && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      <span>Submissions:</span>
                      <span style={{ fontWeight: '500' }}>{submissionCount}</span>
                    </div>
                  )}
                  {elapsedTime && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span>Time:</span>
                      <span style={{ fontWeight: '500' }}>{elapsedTime}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tutor placeholder */}
              <div style={{
                padding: '1rem',
                background: 'var(--bg-tertiary)',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                opacity: 0.6,
              }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem' }}>
                  AI Tutor
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Coming soon: Ask questions about your approach
                </p>
              </div>

              {/* Abandon button */}
              {onAbandon && (
                <button
                  className="btn btn-ghost"
                  style={{
                    width: '100%',
                    color: 'var(--text-muted)',
                    marginTop: '1rem',
                  }}
                  onClick={onAbandon}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '0.5rem' }}>
                    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM4.5 7.5a.5.5 0 000 1h7a.5.5 0 000-1h-7z"/>
                  </svg>
                  Abandon Attempt
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Coach Tools Button - Trigger for opening the drawer
 */
interface CoachButtonProps {
  onClick: () => void;
  hintsCount?: number;
}

export function CoachButton({ onClick, hintsCount = 0 }: CoachButtonProps) {
  return (
    <button
      className="btn btn-secondary coach-button"
      onClick={onClick}
      title="Open Coach Tools"
    >
      <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1.5a5.5 5.5 0 00-2.456 10.422c.152.086.282.194.382.327.1.132.17.28.202.438l.2 1.313h3.344l.2-1.313c.031-.158.102-.306.202-.438.1-.133.23-.241.382-.327A5.5 5.5 0 008 1.5zM6.5 14.5A.5.5 0 017 14h2a.5.5 0 01.5.5v.5a.5.5 0 01-.5.5H7a.5.5 0 01-.5-.5v-.5z"/>
      </svg>
      <span>Coach</span>
      {hintsCount > 0 && (
        <span className="coach-button-badge">{hintsCount}</span>
      )}
    </button>
  );
}
