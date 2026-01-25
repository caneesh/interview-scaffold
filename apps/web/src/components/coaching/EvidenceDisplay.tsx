'use client';

import { useState, type ReactNode } from 'react';
import { Badge, Card, Tooltip } from '@/components/ui';

// ============ Evidence Reference Types ============

export type EvidenceSource =
  | 'test_result'
  | 'gate_outcome'
  | 'attempt_history'
  | 'hint_ladder'
  | 'pattern_discovery'
  | 'submission';

export interface EvidenceRef {
  readonly source: EvidenceSource;
  readonly sourceId: string;
  readonly description: string;
  readonly detail?: string;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

// ============ Source Metadata ============

interface SourceMeta {
  label: string;
  icon: ReactNode;
  variant: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const SOURCE_META: Record<EvidenceSource, SourceMeta> = {
  test_result: {
    label: 'Test Result',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    variant: 'info',
  },
  gate_outcome: {
    label: 'Gate Check',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    variant: 'warning',
  },
  attempt_history: {
    label: 'Attempt History',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    variant: 'default',
  },
  hint_ladder: {
    label: 'Hint Usage',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
    variant: 'info',
  },
  pattern_discovery: {
    label: 'Pattern Discovery',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    variant: 'success',
  },
  submission: {
    label: 'Code Submission',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    variant: 'default',
  },
};

// ============ Confidence Icons ============

function HighConfidenceIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function MediumConfidenceIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function LowConfidenceIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// ============ Confidence Indicator Component ============

interface ConfidenceIndicatorProps {
  confidence: number;
  showLabel?: boolean;
  showBar?: boolean;
  size?: 'sm' | 'md';
}

export function ConfidenceIndicator({
  confidence,
  showLabel = true,
  showBar = true,
  size = 'md',
}: ConfidenceIndicatorProps) {
  const level: ConfidenceLevel = confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low';
  const percentage = Math.round(confidence * 100);

  const levelConfig = {
    high: {
      label: 'High Confidence',
      icon: <HighConfidenceIcon />,
      description: 'Strong evidence supports this assessment',
    },
    medium: {
      label: 'Medium Confidence',
      icon: <MediumConfidenceIcon />,
      description: 'Some evidence, but more data would improve accuracy',
    },
    low: {
      label: 'Low Confidence',
      icon: <LowConfidenceIcon />,
      description: 'Limited evidence - consider providing more context',
    },
  };

  const config = levelConfig[level];

  return (
    <Tooltip content={config.description}>
      <div className={`confidence-indicator confidence-indicator--${size}`}>
        <span className={`confidence-indicator__icon confidence-indicator__icon--${level}`}>
          {config.icon}
        </span>
        {showBar && (
          <div className="confidence-indicator__bar">
            <div
              className={`confidence-indicator__fill confidence-indicator__fill--${level}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
        {showLabel && (
          <span className={`confidence-indicator__label confidence-indicator__label--${level}`}>
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </span>
        )}
      </div>
    </Tooltip>
  );
}

// ============ Single Evidence Item ============

interface EvidenceItemProps {
  evidence: EvidenceRef;
  compact?: boolean;
}

export function EvidenceItem({ evidence, compact = false }: EvidenceItemProps) {
  const meta = SOURCE_META[evidence.source];

  if (compact) {
    return (
      <Tooltip content={`${meta.label}: ${evidence.description}`}>
        <Badge variant={meta.variant} size="sm" icon={meta.icon}>
          {meta.label}
        </Badge>
      </Tooltip>
    );
  }

  return (
    <div className="evidence-item">
      <div className="evidence-item__header">
        <Badge variant={meta.variant} size="sm" icon={meta.icon}>
          {meta.label}
        </Badge>
        <span className="evidence-item__id">{evidence.sourceId}</span>
      </div>
      <p className="evidence-item__description">{evidence.description}</p>
      {evidence.detail && (
        <p className="evidence-item__detail">{evidence.detail}</p>
      )}
    </div>
  );
}

// ============ Evidence List (Always Visible) ============

interface EvidenceListProps {
  evidenceRefs: readonly EvidenceRef[];
  title?: string;
  defaultExpanded?: boolean;
  maxVisible?: number;
  alwaysShow?: boolean;
}

export function EvidenceList({
  evidenceRefs,
  title = 'Evidence',
  defaultExpanded = true,
  maxVisible = 3,
  alwaysShow = true,
}: EvidenceListProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Always show the component even if empty when alwaysShow is true
  if (evidenceRefs.length === 0 && !alwaysShow) {
    return null;
  }

  const visibleRefs = isExpanded ? evidenceRefs : evidenceRefs.slice(0, maxVisible);
  const hasMore = evidenceRefs.length > maxVisible;

  return (
    <div className="evidence-list">
      <button
        className="evidence-list__header focus-ring"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="evidence-list__title">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`evidence-list__chevron ${isExpanded ? 'expanded' : ''}`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          {title}
        </span>
        <Badge variant="default" size="sm">
          {evidenceRefs.length} source{evidenceRefs.length !== 1 ? 's' : ''}
        </Badge>
      </button>

      <div className={`evidence-list__content ${isExpanded ? 'expanded' : ''}`}>
        {evidenceRefs.length === 0 ? (
          <div className="evidence-list__empty">
            <p>No evidence collected yet. Run tests or complete gate checks to generate evidence.</p>
          </div>
        ) : (
          <>
            {visibleRefs.map((ref, index) => (
              <EvidenceItem key={`${ref.source}-${ref.sourceId}-${index}`} evidence={ref} />
            ))}

            {!isExpanded && hasMore && (
              <button
                className="evidence-list__show-more focus-ring"
                onClick={() => setIsExpanded(true)}
              >
                Show {evidenceRefs.length - maxVisible} more...
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============ Why Am I Seeing This Explainer ============

interface WhyExplainerProps {
  defaultExpanded?: boolean;
}

export function WhyExplainer({ defaultExpanded = false }: WhyExplainerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="evidence-display__explainer">
      <button
        className="evidence-display__explainer-toggle focus-ring"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        Why am I seeing this?
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`evidence-display__explainer-chevron ${isExpanded ? 'expanded' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isExpanded && (
        <div className="evidence-display__explainer-content">
          <h4 className="evidence-display__explainer-title">How AI Coaching Works</h4>
          <p className="evidence-display__explainer-intro">
            Every suggestion you see is backed by verifiable evidence. The AI only makes claims
            it can support with data from your session.
          </p>

          <div className="evidence-display__explainer-sources">
            <div className="evidence-display__explainer-source">
              <Badge variant="info" size="sm" icon={SOURCE_META.test_result.icon}>
                Test Results
              </Badge>
              <p>Actual pass/fail outcomes from running your code against test cases</p>
            </div>

            <div className="evidence-display__explainer-source">
              <Badge variant="warning" size="sm" icon={SOURCE_META.gate_outcome.icon}>
                Gate Checks
              </Badge>
              <p>Your responses to pattern recognition and understanding checkpoints</p>
            </div>

            <div className="evidence-display__explainer-source">
              <Badge variant="default" size="sm" icon={SOURCE_META.attempt_history.icon}>
                Attempt History
              </Badge>
              <p>Patterns identified from your previous submissions and approaches</p>
            </div>

            <div className="evidence-display__explainer-source">
              <Badge variant="success" size="sm" icon={SOURCE_META.pattern_discovery.icon}>
                Pattern Discovery
              </Badge>
              <p>Matches between your solution approach and known algorithmic patterns</p>
            </div>
          </div>

          <div className="evidence-display__explainer-note">
            <strong>Confidence Levels:</strong>
            <ul>
              <li><span className="confidence-indicator__label--high">High</span> - Multiple evidence sources confirm the assessment</li>
              <li><span className="confidence-indicator__label--medium">Medium</span> - Some evidence supports this, but more data would help</li>
              <li><span className="confidence-indicator__label--low">Low</span> - Limited evidence - the AI may ask clarifying questions</li>
            </ul>
          </div>

          <p className="evidence-display__explainer-footer">
            If the AI cannot verify a claim, it will ask you to provide more information
            (like running tests or tracing code) before making suggestions.
          </p>
        </div>
      )}
    </div>
  );
}

// ============ Evidence Display Card ============

interface EvidenceDisplayProps {
  evidenceRefs: readonly EvidenceRef[];
  confidence?: number;
  source?: 'ai' | 'deterministic';
  showExplainer?: boolean;
  showEvidenceList?: boolean;
  className?: string;
}

export function EvidenceDisplay({
  evidenceRefs,
  confidence,
  source,
  showExplainer = true,
  showEvidenceList = true,
  className = '',
}: EvidenceDisplayProps) {
  return (
    <div className={`evidence-display ${className}`}>
      {/* Header with Confidence and Source */}
      <div className="evidence-display__header">
        {/* Confidence Indicator - always show if provided */}
        {confidence !== undefined && (
          <ConfidenceIndicator confidence={confidence} />
        )}

        {/* Source Badge */}
        {source && (
          <div className="evidence-display__source">
            <Badge variant={source === 'ai' ? 'info' : 'default'} size="sm">
              {source === 'ai' ? 'AI-Generated' : 'Rule-Based'}
            </Badge>
          </div>
        )}
      </div>

      {/* Evidence List - always visible */}
      {showEvidenceList && (
        <EvidenceList
          evidenceRefs={evidenceRefs}
          title="Based on"
          defaultExpanded={true}
          alwaysShow={true}
        />
      )}

      {/* Why Am I Seeing This Explainer */}
      {showExplainer && <WhyExplainer />}
    </div>
  );
}

// ============ Needs More Info State ============

interface SuggestedAction {
  label: string;
  description: string;
  action?: () => void;
}

interface NeedsMoreInfoProps {
  message?: string;
  suggestedActions?: SuggestedAction[];
}

export function NeedsMoreInfo({
  message = 'The AI needs more information to provide accurate guidance.',
  suggestedActions = [],
}: NeedsMoreInfoProps) {
  const defaultActions: SuggestedAction[] = [
    {
      label: 'Run Tests',
      description: 'Execute your code against test cases to generate evidence',
    },
    {
      label: 'Trace Your Code',
      description: 'Step through your logic with a specific input',
    },
    {
      label: 'Review Pattern',
      description: 'Revisit the expected pattern for this problem type',
    },
  ];

  const actions: SuggestedAction[] = suggestedActions.length > 0 ? suggestedActions : defaultActions;

  return (
    <Card className="needs-more-info">
      <Card.Body>
        <div className="needs-more-info__header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Needs More Information</span>
        </div>
        <p className="needs-more-info__message">{message}</p>
        <div className="needs-more-info__actions">
          <p className="needs-more-info__actions-label">Try one of these actions:</p>
          {actions.map((action, index) => (
            <button
              key={index}
              className="needs-more-info__action focus-ring"
              onClick={action.action}
              disabled={!action.action}
            >
              <span className="needs-more-info__action-label">{action.label}</span>
              <span className="needs-more-info__action-description">{action.description}</span>
            </button>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
}

// ============ Inline Evidence Badges ============

interface InlineEvidenceProps {
  evidenceRefs: readonly EvidenceRef[];
}

export function InlineEvidence({ evidenceRefs }: InlineEvidenceProps) {
  if (evidenceRefs.length === 0) return null;

  return (
    <span className="inline-evidence">
      {evidenceRefs.slice(0, 3).map((ref, index) => (
        <EvidenceItem key={`${ref.source}-${ref.sourceId}-${index}`} evidence={ref} compact />
      ))}
      {evidenceRefs.length > 3 && (
        <Badge variant="default" size="sm">+{evidenceRefs.length - 3}</Badge>
      )}
    </span>
  );
}

// ============ Rubric Score Display ============

interface RubricScore {
  category: string;
  score: number;
  maxScore: number;
  feedback?: string;
}

interface RubricScoresProps {
  scores: RubricScore[];
  showDetails?: boolean;
}

export function RubricScores({ scores, showDetails = true }: RubricScoresProps) {
  if (scores.length === 0) return null;

  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const maxTotal = scores.reduce((sum, s) => sum + s.maxScore, 0);
  const percentage = Math.round((totalScore / maxTotal) * 100);

  return (
    <div className="rubric-scores">
      <div className="rubric-scores__header">
        <span className="rubric-scores__title">Rubric Assessment</span>
        <span className="rubric-scores__total">
          {totalScore}/{maxTotal} ({percentage}%)
        </span>
      </div>
      {showDetails && (
        <div className="rubric-scores__list">
          {scores.map((score, index) => (
            <div key={index} className="rubric-scores__item">
              <div className="rubric-scores__item-header">
                <span className="rubric-scores__category">{score.category}</span>
                <span className="rubric-scores__value">{score.score}/{score.maxScore}</span>
              </div>
              <div className="rubric-scores__bar">
                <div
                  className="rubric-scores__bar-fill"
                  style={{ width: `${(score.score / score.maxScore) * 100}%` }}
                  data-level={score.score / score.maxScore >= 0.8 ? 'high' : score.score / score.maxScore >= 0.5 ? 'medium' : 'low'}
                />
              </div>
              {score.feedback && (
                <p className="rubric-scores__feedback">{score.feedback}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default EvidenceDisplay;
