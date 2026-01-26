'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

// Pattern IDs available for generation
const PATTERNS = [
  'SLIDING_WINDOW',
  'TWO_POINTERS',
  'FAST_SLOW_POINTERS',
  'MERGE_INTERVALS',
  'CYCLIC_SORT',
  'IN_PLACE_REVERSAL',
  'BFS',
  'DFS',
  'TWO_HEAPS',
  'SUBSETS',
  'MODIFIED_BINARY_SEARCH',
  'BITWISE_XOR',
  'TOP_K',
  'K_WAY_MERGE',
  'DYNAMIC_PROGRAMMING',
  'TOPOLOGICAL_SORT',
];

interface GenerationRun {
  id: string;
  patternId: string;
  targetCount: number;
  promptVersion: string;
  model: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  metrics: {
    totalGenerated: number;
    validCount: number;
    duplicatesRemoved: number;
  } | null;
  createdBy: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface Candidate {
  id: string;
  level: number;
  title: string;
  summary?: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  status: 'proposed' | 'approved' | 'rejected' | 'published';
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null;
  createdAt: string;
}

interface RunDetails {
  run: GenerationRun;
  candidates: Candidate[];
  summary: {
    total: number;
    byStatus: Record<string, number>;
    byLevel: Record<string, number>;
  };
}

export default function GeneratorAdminPage() {
  const [selectedPattern, setSelectedPattern] = useState<string>(PATTERNS[0] ?? '');
  const [targetCount, setTargetCount] = useState<number>(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [runs, setRuns] = useState<GenerationRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Fetch runs on mount
  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    try {
      const res = await fetch('/api/admin/generator/run', {
        headers: { 'x-admin-email': 'admin@example.com' },
      });
      if (!res.ok) throw new Error('Failed to fetch runs');
      const data = await res.json();
      setRuns(data.runs);
    } catch (err) {
      console.error('Error fetching runs:', err);
    }
  };

  const fetchRunDetails = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`/api/admin/generator/run/${runId}`, {
        headers: { 'x-admin-email': 'admin@example.com' },
      });
      if (!res.ok) throw new Error('Failed to fetch run details');
      const data = await res.json();
      setSelectedRun(data);
    } catch (err) {
      console.error('Error fetching run details:', err);
    }
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/generator/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': 'admin@example.com',
        },
        body: JSON.stringify({
          patternId: selectedPattern,
          targetCount,
          promptVersion: 'v1',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message ?? 'Generation failed');
      }

      const data = await res.json();

      // Refresh runs list
      await fetchRuns();

      // Select the new run
      if (data.run?.id) {
        await fetchRunDetails(data.run.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async (candidateId: string) => {
    if (!selectedRun) return;

    try {
      const res = await fetch(
        `/api/admin/generator/run/${selectedRun.run.id}/candidate/${candidateId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-email': 'admin@example.com',
          },
          body: JSON.stringify({ status: 'approved' }),
        }
      );

      if (!res.ok) throw new Error('Failed to approve');

      // Refresh run details
      await fetchRunDetails(selectedRun.run.id);
    } catch (err) {
      console.error('Error approving candidate:', err);
    }
  };

  const handleReject = async (candidateId: string) => {
    if (!selectedRun) return;

    try {
      const res = await fetch(
        `/api/admin/generator/run/${selectedRun.run.id}/candidate/${candidateId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-email': 'admin@example.com',
          },
          body: JSON.stringify({ status: 'rejected' }),
        }
      );

      if (!res.ok) throw new Error('Failed to reject');

      // Refresh run details
      await fetchRunDetails(selectedRun.run.id);
    } catch (err) {
      console.error('Error rejecting candidate:', err);
    }
  };

  const handlePublish = async () => {
    if (!selectedRun) return;

    setIsPublishing(true);
    try {
      const res = await fetch(
        `/api/admin/generator/run/${selectedRun.run.id}/publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-email': 'admin@example.com',
          },
        }
      );

      if (!res.ok) throw new Error('Failed to publish');

      const data = await res.json();
      console.log('Published:', data);

      // Refresh run details
      await fetchRunDetails(selectedRun.run.id);
    } catch (err) {
      console.error('Error publishing:', err);
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setIsPublishing(false);
    }
  };

  const approvedCount = selectedRun?.candidates.filter(c => c.status === 'approved').length ?? 0;

  return (
    <div className="admin-generator">
      <header className="admin-generator__header">
        <h1>Pattern Ladder Generator</h1>
        <p className="admin-generator__subtitle">
          Generate original coding problems for difficulty ladders
        </p>
      </header>

      <div className="admin-generator__content">
        {/* Generator Controls */}
        <Card className="admin-generator__controls">
          <Card.Header title="Generate New Problems" />
          <Card.Body>
            <div className="admin-generator__form">
              <div className="admin-generator__field">
                <label htmlFor="pattern">Pattern</label>
                <select
                  id="pattern"
                  value={selectedPattern}
                  onChange={(e) => setSelectedPattern(e.target.value)}
                  className="admin-generator__select"
                >
                  {PATTERNS.map((p) => (
                    <option key={p} value={p}>
                      {p.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-generator__field">
                <label htmlFor="count">Target Count</label>
                <input
                  id="count"
                  type="number"
                  min={1}
                  max={50}
                  value={targetCount}
                  onChange={(e) => setTargetCount(parseInt(e.target.value, 10) || 10)}
                  className="admin-generator__input"
                />
              </div>

              <Button
                onClick={handleGenerate}
                loading={isGenerating}
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate Problems'}
              </Button>

              {error && <p className="admin-generator__error">{error}</p>}
            </div>
          </Card.Body>
        </Card>

        {/* Recent Runs */}
        <Card className="admin-generator__runs">
          <Card.Header title="Recent Runs" />
          <Card.Body padding="none">
            <div className="admin-generator__runs-list">
              {runs.length === 0 ? (
                <p className="admin-generator__empty">No generation runs yet</p>
              ) : (
                runs.map((run) => (
                  <button
                    key={run.id}
                    className={`admin-generator__run-item ${
                      selectedRun?.run.id === run.id ? 'admin-generator__run-item--selected' : ''
                    }`}
                    onClick={() => fetchRunDetails(run.id)}
                  >
                    <div className="admin-generator__run-header">
                      <span className="admin-generator__run-pattern">
                        {run.patternId.replace(/_/g, ' ')}
                      </span>
                      <StatusBadge status={run.status} />
                    </div>
                    <div className="admin-generator__run-meta">
                      <span>{new Date(run.createdAt).toLocaleString()}</span>
                      {run.metrics && (
                        <span>
                          {run.metrics.validCount}/{run.metrics.totalGenerated} valid
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card.Body>
        </Card>

        {/* Candidates */}
        {selectedRun && (
          <Card className="admin-generator__candidates">
            <Card.Header
              title={`Candidates: ${selectedRun.run.patternId.replace(/_/g, ' ')}`}
              subtitle={`${selectedRun.summary.total} total, ${approvedCount} approved`}
              actions={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePublish}
                  disabled={approvedCount === 0 || isPublishing}
                  loading={isPublishing}
                >
                  Publish Approved ({approvedCount})
                </Button>
              }
            />
            <Card.Body padding="none">
              {[0, 1, 2, 3, 4].map((level) => {
                const levelCandidates = selectedRun.candidates.filter(
                  (c) => c.level === level
                );
                if (levelCandidates.length === 0) return null;

                return (
                  <div key={level} className="admin-generator__level-group">
                    <h3 className="admin-generator__level-title">
                      Level {level}
                      <Badge variant="default" size="sm">
                        {levelCandidates.length}
                      </Badge>
                    </h3>
                    <div className="admin-generator__candidate-list">
                      {levelCandidates.map((candidate) => (
                        <CandidateCard
                          key={candidate.id}
                          candidate={candidate}
                          onApprove={() => handleApprove(candidate.id)}
                          onReject={() => handleReject(candidate.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </Card.Body>
          </Card>
        )}
      </div>

      <style jsx>{`
        .admin-generator {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .admin-generator__header {
          margin-bottom: 2rem;
        }

        .admin-generator__header h1 {
          font-size: 1.75rem;
          font-weight: 600;
          color: var(--gray-900);
          margin: 0;
        }

        .admin-generator__subtitle {
          color: var(--gray-600);
          margin-top: 0.5rem;
        }

        .admin-generator__content {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 1.5rem;
        }

        .admin-generator__controls {
          grid-column: 1 / -1;
        }

        .admin-generator__form {
          display: flex;
          gap: 1rem;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .admin-generator__field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .admin-generator__field label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--gray-700);
        }

        .admin-generator__select,
        .admin-generator__input {
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--gray-300);
          border-radius: 6px;
          font-size: 0.875rem;
          background: white;
          min-width: 200px;
        }

        .admin-generator__input {
          width: 100px;
          min-width: 100px;
        }

        .admin-generator__error {
          color: var(--red-600);
          font-size: 0.875rem;
          margin: 0;
        }

        .admin-generator__runs-list {
          display: flex;
          flex-direction: column;
        }

        .admin-generator__empty {
          padding: 2rem;
          text-align: center;
          color: var(--gray-500);
        }

        .admin-generator__run-item {
          display: block;
          width: 100%;
          padding: 0.75rem 1rem;
          border: none;
          border-bottom: 1px solid var(--gray-200);
          background: white;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s;
        }

        .admin-generator__run-item:hover {
          background: var(--gray-50);
        }

        .admin-generator__run-item--selected {
          background: var(--blue-50);
          border-left: 3px solid var(--blue-500);
        }

        .admin-generator__run-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .admin-generator__run-pattern {
          font-weight: 500;
          font-size: 0.875rem;
        }

        .admin-generator__run-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .admin-generator__candidates {
          grid-column: 2;
        }

        .admin-generator__level-group {
          border-bottom: 1px solid var(--gray-200);
          padding: 1rem;
        }

        .admin-generator__level-group:last-child {
          border-bottom: none;
        }

        .admin-generator__level-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--gray-700);
          margin: 0 0 0.75rem 0;
        }

        .admin-generator__candidate-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        @media (max-width: 900px) {
          .admin-generator__content {
            grid-template-columns: 1fr;
          }

          .admin-generator__candidates {
            grid-column: 1;
          }
        }
      `}</style>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'succeeded'
      ? 'success'
      : status === 'failed'
        ? 'error'
        : status === 'running'
          ? 'info'
          : 'default';

  return (
    <Badge variant={variant} size="sm">
      {status}
    </Badge>
  );
}

function CandidateCard({
  candidate,
  onApprove,
  onReject,
}: {
  candidate: Candidate;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isActioned = candidate.status !== 'proposed';

  return (
    <div className="candidate-card">
      <div className="candidate-card__header">
        <span className="candidate-card__title">{candidate.title}</span>
        <div className="candidate-card__badges">
          <DifficultyBadge difficulty={candidate.difficulty} />
          <CandidateStatusBadge status={candidate.status} />
        </div>
      </div>

      {candidate.summary && (
        <p className="candidate-card__summary">{candidate.summary}</p>
      )}

      {candidate.validation && (
        <div className="candidate-card__validation">
          {candidate.validation.errors.length > 0 && (
            <div className="candidate-card__errors">
              {candidate.validation.errors.map((e, i) => (
                <span key={i} className="candidate-card__error">
                  {e}
                </span>
              ))}
            </div>
          )}
          {candidate.validation.warnings.length > 0 && (
            <div className="candidate-card__warnings">
              {candidate.validation.warnings.slice(0, 2).map((w, i) => (
                <span key={i} className="candidate-card__warning">
                  {w}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {!isActioned && (
        <div className="candidate-card__actions">
          <Button variant="primary" size="sm" onClick={onApprove}>
            Approve
          </Button>
          <Button variant="ghost" size="sm" onClick={onReject}>
            Reject
          </Button>
        </div>
      )}

      <style jsx>{`
        .candidate-card {
          padding: 0.75rem;
          border: 1px solid var(--gray-200);
          border-radius: 8px;
          background: white;
        }

        .candidate-card__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .candidate-card__title {
          font-weight: 500;
          font-size: 0.875rem;
          color: var(--gray-900);
        }

        .candidate-card__badges {
          display: flex;
          gap: 0.25rem;
          flex-shrink: 0;
        }

        .candidate-card__summary {
          font-size: 0.8125rem;
          color: var(--gray-600);
          margin: 0 0 0.5rem 0;
          line-height: 1.4;
        }

        .candidate-card__validation {
          margin-bottom: 0.5rem;
        }

        .candidate-card__errors,
        .candidate-card__warnings {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.75rem;
        }

        .candidate-card__error {
          color: var(--red-600);
        }

        .candidate-card__warning {
          color: var(--yellow-700);
        }

        .candidate-card__actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }
      `}</style>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const variant =
    difficulty === 'EASY'
      ? 'success'
      : difficulty === 'MEDIUM'
        ? 'warning'
        : difficulty === 'HARD' || difficulty === 'EXPERT'
          ? 'error'
          : 'default';

  return (
    <Badge variant={variant} size="sm">
      {difficulty}
    </Badge>
  );
}

function CandidateStatusBadge({ status }: { status: string }) {
  const variant =
    status === 'approved'
      ? 'success'
      : status === 'rejected'
        ? 'error'
        : status === 'published'
          ? 'info'
          : 'default';

  return (
    <Badge variant={variant} size="sm">
      {status}
    </Badge>
  );
}
