'use client';

import { useState } from 'react';
import { HintPanel } from './HintPanel';
import { Button, Badge, Card, Tooltip } from '@/components/ui';
import {
  EvidenceDisplay,
  EvidenceList,
  NeedsMoreInfo,
  type EvidenceRef,
} from '@/components/coaching/EvidenceDisplay';

// ============ Types ============

interface Hint {
  level: string;
  text: string;
  evidenceRefs?: readonly EvidenceRef[];
  confidence?: number;
}

interface CoachDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Hint functionality */
  hints: Hint[];
  onRequestHint: (level?: HintLevel) => Promise<void>;
  hintLoading?: boolean;
  hintsRemaining?: number;
  maxHints?: number;
  /** Evidence and validation */
  latestEvidence?: readonly EvidenceRef[];
  latestConfidence?: number;
  needsMoreInfo?: boolean;
  needsMoreInfoMessage?: string;
  onRunTests?: () => void;
  onTraceCode?: () => void;
  /** Optional: Skip/abandon functionality */
  onAbandon?: () => void;
  /** Optional: Show analytics */
  submissionCount?: number;
  elapsedTime?: string;
}

type HintLevel = 'DIRECTIONAL_QUESTION' | 'HEURISTIC_HINT' | 'CONCEPT_INJECTION' | 'MICRO_EXAMPLE' | 'PATCH_SNIPPET';

// ============ Hint Cost Information ============

interface HintLevelInfo {
  level: HintLevel;
  name: string;
  cost: number;
  description: string;
}

const HINT_LEVELS: HintLevelInfo[] = [
  {
    level: 'DIRECTIONAL_QUESTION',
    name: 'Directional Question',
    cost: 1,
    description: 'A question to guide your thinking in the right direction',
  },
  {
    level: 'HEURISTIC_HINT',
    name: 'Heuristic Hint',
    cost: 2,
    description: 'A general principle or rule of thumb to consider',
  },
  {
    level: 'CONCEPT_INJECTION',
    name: 'Concept Injection',
    cost: 3,
    description: 'Introduces a key concept you may be missing',
  },
  {
    level: 'MICRO_EXAMPLE',
    name: 'Micro Example',
    cost: 4,
    description: 'A small worked example demonstrating the concept',
  },
  {
    level: 'PATCH_SNIPPET',
    name: 'Code Snippet',
    cost: 5,
    description: 'A code snippet showing part of the solution',
  },
];

// ============ Budget Meter Component ============

interface HintBudgetMeterProps {
  remaining: number;
  max: number;
}

function HintBudgetMeter({ remaining, max }: HintBudgetMeterProps) {
  const percentage = (remaining / max) * 100;
  const level = percentage > 60 ? 'healthy' : percentage > 30 ? 'warning' : 'critical';

  return (
    <div className="hint-budget-meter">
      <div className="hint-budget-meter__header">
        <span className="hint-budget-meter__label">Hint Budget</span>
        <span className="hint-budget-meter__count">{remaining} of {max}</span>
      </div>
      <div className="hint-budget-meter__bar">
        <div
          className="hint-budget-meter__fill"
          data-level={level}
          style={{ width: `${percentage}%` }}
        />
        {/* Tick marks */}
        {Array.from({ length: max }, (_, i) => (
          <div
            key={i}
            className="hint-budget-meter__tick"
            style={{ left: `${((i + 1) / max) * 100}%` }}
          />
        ))}
      </div>
      {level === 'critical' && (
        <p className="hint-budget-meter__warning">
          Low on hints! Use wisely.
        </p>
      )}
    </div>
  );
}

// ============ Hint Cost Selector ============

interface HintCostSelectorProps {
  levels: HintLevelInfo[];
  onSelect: (level: HintLevel) => void;
  hintsRemaining: number;
  disabled?: boolean;
}

function HintCostSelector({ levels, onSelect, hintsRemaining, disabled }: HintCostSelectorProps) {
  const [selectedLevel, setSelectedLevel] = useState<HintLevel | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleSelect(level: HintLevelInfo) {
    if (level.cost > hintsRemaining) return;
    setSelectedLevel(level.level);
    if (level.cost >= 3) {
      // Expensive hint - require confirmation
      setShowConfirm(true);
    } else {
      onSelect(level.level);
    }
  }

  function confirmHint() {
    if (selectedLevel) {
      onSelect(selectedLevel);
      setShowConfirm(false);
      setSelectedLevel(null);
    }
  }

  if (showConfirm && selectedLevel) {
    const levelInfo = levels.find(l => l.level === selectedLevel);
    return (
      <div className="hint-confirm-modal">
        <div className="hint-confirm-modal__content">
          <h4>Confirm Expensive Hint</h4>
          <p>
            <strong>{levelInfo?.name}</strong> costs <strong>{levelInfo?.cost} hint{(levelInfo?.cost ?? 0) > 1 ? 's' : ''}</strong>.
          </p>
          <p className="hint-confirm-modal__description">
            {levelInfo?.description}
          </p>
          <p className="hint-confirm-modal__warning">
            You will have <strong>{hintsRemaining - (levelInfo?.cost ?? 0)}</strong> hint{hintsRemaining - (levelInfo?.cost ?? 0) !== 1 ? 's' : ''} remaining.
          </p>
          <div className="hint-confirm-modal__actions">
            <Button variant="ghost" size="sm" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={confirmHint}>
              Use Hint
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hint-cost-selector">
      <p className="hint-cost-selector__label">Choose hint level:</p>
      <div className="hint-cost-selector__options">
        {levels.map((level) => {
          const canAfford = level.cost <= hintsRemaining;
          return (
            <button
              key={level.level}
              className={`hint-cost-option ${!canAfford ? 'disabled' : ''}`}
              onClick={() => handleSelect(level)}
              disabled={disabled || !canAfford}
            >
              <div className="hint-cost-option__header">
                <span className="hint-cost-option__name">{level.name}</span>
                <Badge
                  variant={canAfford ? (level.cost >= 4 ? 'warning' : 'default') : 'error'}
                  size="sm"
                >
                  {level.cost} {level.cost === 1 ? 'hint' : 'hints'}
                </Badge>
              </div>
              <p className="hint-cost-option__description">{level.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============ Main CoachDrawer Component ============

/**
 * Coach Tools Drawer - Single entry point for all secondary tools
 *
 * Contains:
 * - Hints (with request button and cost display)
 * - Evidence display and AI explainer
 * - Budget meter
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
  maxHints = 5,
  latestEvidence = [],
  latestConfidence,
  needsMoreInfo = false,
  needsMoreInfoMessage,
  onRunTests,
  onTraceCode,
  onAbandon,
  submissionCount,
  elapsedTime,
}: CoachDrawerProps) {
  const [activeTab, setActiveTab] = useState<'hints' | 'evidence' | 'tools'>('hints');
  const [showHintSelector, setShowHintSelector] = useState(false);

  if (!isOpen) return null;

  async function handleRequestHint(level?: HintLevel) {
    setShowHintSelector(false);
    await onRequestHint(level);
  }

  // Get evidence from hints if available
  const allEvidence: EvidenceRef[] = [];
  hints.forEach(hint => {
    if (hint.evidenceRefs) {
      allEvidence.push(...hint.evidenceRefs);
    }
  });
  if (latestEvidence.length > 0) {
    allEvidence.push(...latestEvidence);
  }

  // Calculate average confidence
  const hintConfidences = hints.filter(h => h.confidence !== undefined).map(h => h.confidence!);
  const avgConfidence = hintConfidences.length > 0
    ? hintConfidences.reduce((a, b) => a + b, 0) / hintConfidences.length
    : latestConfidence;

  return (
    <>
      {/* Backdrop */}
      <div
        className="drawer-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="drawer drawer--right coach-drawer">
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

        {/* Budget Meter */}
        <div className="drawer-budget">
          <HintBudgetMeter remaining={hintsRemaining} max={maxHints} />
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
            className={`drawer-tab ${activeTab === 'evidence' ? 'active' : ''}`}
            onClick={() => setActiveTab('evidence')}
          >
            Evidence
            {allEvidence.length > 0 && (
              <Badge variant="info" size="sm" style={{ marginLeft: '0.25rem' }}>
                {allEvidence.length}
              </Badge>
            )}
          </button>
          <button
            className={`drawer-tab ${activeTab === 'tools' ? 'active' : ''}`}
            onClick={() => setActiveTab('tools')}
          >
            Tools
          </button>
        </div>

        <div className="drawer-body">
          {/* Needs More Info State */}
          {needsMoreInfo && activeTab === 'hints' && (
            <NeedsMoreInfo
              message={needsMoreInfoMessage}
              suggestedActions={[
                {
                  label: 'Run Tests',
                  description: 'Execute your code to generate evidence',
                  action: onRunTests,
                },
                {
                  label: 'Trace Code',
                  description: 'Step through your logic manually',
                  action: onTraceCode,
                },
              ]}
            />
          )}

          {activeTab === 'hints' && !needsMoreInfo && (
            <div>
              {/* Request Hint Section */}
              {showHintSelector ? (
                <HintCostSelector
                  levels={HINT_LEVELS}
                  onSelect={handleRequestHint}
                  hintsRemaining={hintsRemaining}
                  disabled={hintLoading}
                />
              ) : (
                <>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setShowHintSelector(true)}
                    disabled={hintLoading || hintsRemaining === 0}
                    loading={hintLoading}
                    leftIcon={
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 1.5a5.5 5.5 0 00-2.456 10.422c.152.086.282.194.382.327.1.132.17.28.202.438l.2 1.313h3.344l.2-1.313c.031-.158.102-.306.202-.438.1-.133.23-.241.382-.327A5.5 5.5 0 008 1.5zM6.5 14.5A.5.5 0 017 14h2a.5.5 0 01.5.5v.5a.5.5 0 01-.5.5H7a.5.5 0 01-.5-.5v-.5z"/>
                      </svg>
                    }
                  >
                    {hintsRemaining === 0 ? 'No hints remaining' : 'Get Hint'}
                  </Button>

                  {/* Quick hint button for simple hints */}
                  {hintsRemaining > 0 && (
                    <button
                      className="quick-hint-btn"
                      onClick={() => handleRequestHint('DIRECTIONAL_QUESTION')}
                      disabled={hintLoading}
                    >
                      Quick hint (1 point)
                    </button>
                  )}
                </>
              )}

              {/* Hints list */}
              {hints.length > 0 ? (
                <div className="coach-hints-list">
                  {hints.map((hint, index) => (
                    <div key={index} className="coach-hint">
                      <HintPanel hints={[hint]} />
                      {hint.confidence !== undefined && (
                        <div className="coach-hint__confidence">
                          <Tooltip content={`AI confidence: ${Math.round(hint.confidence * 100)}%`}>
                            <Badge
                              variant={hint.confidence >= 0.8 ? 'success' : hint.confidence >= 0.5 ? 'warning' : 'error'}
                              size="sm"
                            >
                              {Math.round(hint.confidence * 100)}% confident
                            </Badge>
                          </Tooltip>
                        </div>
                      )}
                      {hint.evidenceRefs && hint.evidenceRefs.length > 0 && (
                        <EvidenceList
                          evidenceRefs={hint.evidenceRefs}
                          title="Based on"
                          maxVisible={1}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>
                    No hints used yet. Stuck? Request a hint above.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'evidence' && (
            <div className="evidence-tab">
              <EvidenceDisplay
                evidenceRefs={allEvidence}
                confidence={avgConfidence}
                showExplainer={true}
              />

              {allEvidence.length === 0 && (
                <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', textAlign: 'center' }}>
                    No evidence collected yet.
                  </p>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Evidence is gathered from test results, gate outcomes, and your submissions.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tools' && (
            <div>
              {/* Session Stats */}
              {(submissionCount !== undefined || elapsedTime) && (
                <Card className="session-stats-card">
                  <Card.Body padding="sm">
                    <h4 className="session-stats-title">Session Stats</h4>
                    {submissionCount !== undefined && (
                      <div className="session-stat">
                        <span>Submissions:</span>
                        <span className="session-stat-value">{submissionCount}</span>
                      </div>
                    )}
                    {elapsedTime && (
                      <div className="session-stat">
                        <span>Time:</span>
                        <span className="session-stat-value">{elapsedTime}</span>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="coach-tools-actions">
                {onRunTests && (
                  <Button variant="secondary" fullWidth onClick={onRunTests}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}>
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Run Tests
                  </Button>
                )}
                {onTraceCode && (
                  <Button variant="secondary" fullWidth onClick={onTraceCode}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}>
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Trace Code
                  </Button>
                )}
              </div>

              {/* Abandon button */}
              {onAbandon && (
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={onAbandon}
                  className="abandon-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '0.5rem' }}>
                    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM4.5 7.5a.5.5 0 000 1h7a.5.5 0 000-1h-7z"/>
                  </svg>
                  Abandon Attempt
                </Button>
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
  hasEvidence?: boolean;
}

export function CoachButton({ onClick, hintsCount = 0, hasEvidence = false }: CoachButtonProps) {
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
      {hasEvidence && !hintsCount && (
        <span className="coach-button-evidence-dot" />
      )}
    </button>
  );
}
