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

// ============ Evidence List (Collapsible) ============

interface EvidenceListProps {
  evidenceRefs: readonly EvidenceRef[];
  title?: string;
  defaultExpanded?: boolean;
  maxVisible?: number;
}

export function EvidenceList({
  evidenceRefs,
  title = 'Evidence',
  defaultExpanded = false,
  maxVisible = 2,
}: EvidenceListProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (evidenceRefs.length === 0) {
    return null;
  }

  const visibleRefs = isExpanded ? evidenceRefs : evidenceRefs.slice(0, maxVisible);
  const hasMore = evidenceRefs.length > maxVisible;

  return (
    <div className="evidence-list">
      <button
        className="evidence-list__header"
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
        {visibleRefs.map((ref, index) => (
          <EvidenceItem key={`${ref.source}-${ref.sourceId}-${index}`} evidence={ref} />
        ))}

        {!isExpanded && hasMore && (
          <button
            className="evidence-list__show-more"
            onClick={() => setIsExpanded(true)}
          >
            Show {evidenceRefs.length - maxVisible} more...
          </button>
        )}
      </div>
    </div>
  );
}

// ============ Evidence Display Card ============

interface EvidenceDisplayProps {
  evidenceRefs: readonly EvidenceRef[];
  confidence?: number;
  source?: 'ai' | 'deterministic';
  showExplainer?: boolean;
  className?: string;
}

export function EvidenceDisplay({
  evidenceRefs,
  confidence,
  source,
  showExplainer = true,
  className = '',
}: EvidenceDisplayProps) {
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  if (evidenceRefs.length === 0 && !showExplainer) {
    return null;
  }

  return (
    <div className={`evidence-display ${className}`}>
      {/* Confidence Score */}
      {confidence !== undefined && (
        <div className="evidence-display__confidence">
          <span className="evidence-display__confidence-label">Confidence</span>
          <div className="evidence-display__confidence-bar">
            <div
              className="evidence-display__confidence-fill"
              style={{ width: `${Math.round(confidence * 100)}%` }}
              data-level={confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low'}
            />
          </div>
          <span className="evidence-display__confidence-value">
            {Math.round(confidence * 100)}%
          </span>
        </div>
      )}

      {/* Source Badge */}
      {source && (
        <div className="evidence-display__source">
          <Badge variant={source === 'ai' ? 'info' : 'default'} size="sm">
            {source === 'ai' ? 'AI-Generated' : 'Rule-Based'}
          </Badge>
        </div>
      )}

      {/* Evidence List */}
      {evidenceRefs.length > 0 && (
        <EvidenceList evidenceRefs={evidenceRefs} title="Based on" defaultExpanded={false} />
      )}

      {/* How Does AI Know This? Explainer */}
      {showExplainer && (
        <div className="evidence-display__explainer">
          <button
            className="evidence-display__explainer-toggle"
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            aria-expanded={showHowItWorks}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            How does AI know this?
          </button>

          {showHowItWorks && (
            <div className="evidence-display__explainer-content">
              <p>
                The AI coaching system makes claims only when backed by verifiable evidence:
              </p>
              <ul>
                <li>
                  <strong>Test Results:</strong> Actual pass/fail outcomes from running your code
                </li>
                <li>
                  <strong>Gate Checks:</strong> Your responses to pattern recognition and understanding gates
                </li>
                <li>
                  <strong>Attempt History:</strong> Patterns from your previous submissions
                </li>
                <li>
                  <strong>Pattern Discovery:</strong> Matches between your approach and known patterns
                </li>
              </ul>
              <p className="evidence-display__explainer-note">
                If the AI cannot verify a claim, it will ask you to provide more information
                (like running tests or tracing code) before making suggestions.
              </p>
            </div>
          )}
        </div>
      )}
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
              className="needs-more-info__action"
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

export default EvidenceDisplay;
