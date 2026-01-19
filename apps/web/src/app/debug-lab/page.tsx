'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { TriageForm } from '@/components/TriageForm';
import { ObservabilityPanel } from '@/components/ObservabilityPanel';
import { MultiFileEditor } from '@/components/MultiFileEditor';
import type {
  DebugLabItem,
  DebugLabAttempt,
  DebugLabFile,
  TriageAnswers,
  TriageScore,
  ExecutionResult,
  DefectCategory,
  SeverityLevel,
  PriorityLevel,
  DebugSignal,
  ObservabilitySnapshot,
} from '@scaffold/core';

type ViewMode = 'list' | 'solve';
type SolvePhase = 'triage' | 'coding' | 'result';

interface ClientDebugLabItem {
  id: string;
  tenantId?: string;
  title: string;
  description: string;
  difficulty: string;
  language: string;
  files?: DebugLabFile[];
  testCommand?: string;
  defectCategory: DefectCategory;
  severity: SeverityLevel;
  priority: PriorityLevel;
  signals: DebugSignal[];
  toolsExpected?: string[];
  requiredTriage: boolean;
  observabilitySnapshot?: ObservabilitySnapshot;
  createdAt?: string;
}

export default function DebugLabPage() {
  const [items, setItems] = useState<ClientDebugLabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedItem, setSelectedItem] = useState<ClientDebugLabItem | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<DebugLabAttempt | null>(null);
  const [solvePhase, setSolvePhase] = useState<SolvePhase>('triage');

  // Triage state
  const [triageScore, setTriageScore] = useState<TriageScore | null>(null);
  const [rubricExplanation, setRubricExplanation] = useState<string | undefined>();

  // Code editing state
  const [modifiedFiles, setModifiedFiles] = useState<Record<string, string>>({});
  const [explanation, setExplanation] = useState('');

  // Execution state
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [submitResult, setSubmitResult] = useState<{
    passed: boolean;
    solutionExplanation?: string;
    taxonomy?: {
      defectCategory: DefectCategory;
      severity: SeverityLevel;
      priority: PriorityLevel;
      signals: DebugSignal[];
    };
  } | null>(null);

  // Filter state
  const [filterCategory, setFilterCategory] = useState<DefectCategory | ''>('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');

  // Fetch items
  useEffect(() => {
    async function fetchItems() {
      try {
        let url = '/api/debug-lab/items';
        const params = new URLSearchParams();
        if (filterCategory) params.set('category', filterCategory);
        if (filterDifficulty) params.set('difficulty', filterDifficulty);
        if (params.toString()) url += '?' + params.toString();

        const res = await fetch(url);
        const data = await res.json();
        setItems(data.items || []);
      } catch (error) {
        console.error('Failed to fetch items:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchItems();
  }, [filterCategory, filterDifficulty]);

  // Start attempt
  const startAttempt = useCallback(async (item: ClientDebugLabItem) => {
    try {
      const res = await fetch('/api/debug-lab/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json();

      if (data.attempt && data.item) {
        setSelectedItem(data.item);
        setCurrentAttempt(data.attempt);
        setModifiedFiles({});
        setExplanation('');
        setExecutionResult(null);
        setSubmitResult(null);
        setTriageScore(null);
        setRubricExplanation(undefined);

        // Set initial phase based on whether triage is required
        setSolvePhase(data.item.requiredTriage ? 'triage' : 'coding');
        setViewMode('solve');
      }
    } catch (error) {
      console.error('Failed to start attempt:', error);
    }
  }, []);

  // Submit triage
  const submitTriage = useCallback(async (answers: TriageAnswers) => {
    if (!currentAttempt) return;

    const res = await fetch(`/api/debug-lab/${currentAttempt.id}/triage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triageAnswers: answers }),
    });
    const data = await res.json();

    if (data.attempt) {
      setCurrentAttempt(data.attempt);
      setTriageScore(data.triageScore);
      setRubricExplanation(data.rubricExplanation);
      setSolvePhase('coding');
    }
  }, [currentAttempt]);

  // Run tests
  const runTests = useCallback(async () => {
    if (!currentAttempt || !selectedItem) return;

    setRunning(true);
    setExecutionResult(null);

    try {
      const res = await fetch(`/api/debug-lab/${currentAttempt.id}/run-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: modifiedFiles }),
      });
      const data = await res.json();

      if (data.executionResult) {
        setExecutionResult(data.executionResult);
        setCurrentAttempt(data.attempt);
      }
    } catch (error) {
      console.error('Failed to run tests:', error);
    } finally {
      setRunning(false);
    }
  }, [currentAttempt, selectedItem, modifiedFiles]);

  // Submit solution
  const submitSolution = useCallback(async () => {
    if (!currentAttempt || explanation.length < 10) return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/debug-lab/${currentAttempt.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: modifiedFiles, explanation }),
      });
      const data = await res.json();

      if (data.attempt) {
        setCurrentAttempt(data.attempt);
        setExecutionResult(data.executionResult);
        setSubmitResult({
          passed: data.passed,
          solutionExplanation: data.solutionExplanation,
          taxonomy: data.taxonomy,
        });
        setSolvePhase('result');
      }
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setSubmitting(false);
    }
  }, [currentAttempt, modifiedFiles, explanation]);

  // Handle file changes
  const handleFileChange = useCallback((path: string, content: string) => {
    setModifiedFiles(prev => ({ ...prev, [path]: content }));
  }, []);

  // Go back to list
  const goBack = useCallback(() => {
    setViewMode('list');
    setSelectedItem(null);
    setCurrentAttempt(null);
    setSolvePhase('triage');
    setModifiedFiles({});
    setExplanation('');
    setExecutionResult(null);
    setSubmitResult(null);
    setTriageScore(null);
  }, []);

  // Difficulty badge color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'var(--success)';
      case 'MEDIUM': return 'var(--warning)';
      case 'HARD': return 'var(--error)';
      case 'EXPERT': return 'var(--primary)';
      default: return 'var(--text-secondary)';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading debug lab challenges...</p>
        </div>
      </div>
    );
  }

  // Solve view
  if (viewMode === 'solve' && selectedItem && currentAttempt) {
    return (
      <div className="container debug-lab-solve">
        {/* Header */}
        <header className="debug-lab-header">
          <button className="btn btn-ghost" onClick={goBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="debug-lab-header-info">
            <h1>{selectedItem.title}</h1>
            <div className="debug-lab-badges">
              <span className="badge" style={{ color: getDifficultyColor(selectedItem.difficulty) }}>
                {selectedItem.difficulty}
              </span>
              <span className="badge">{selectedItem.defectCategory}</span>
              <span className="badge">{selectedItem.language}</span>
            </div>
          </div>
        </header>

        {/* Problem Description */}
        <div className="debug-lab-description">
          <h2>Scenario</h2>
          <p>{selectedItem.description}</p>
        </div>

        {/* Signals */}
        {selectedItem.signals && selectedItem.signals.length > 0 && (
          <div className="debug-lab-signals">
            <h3>Observed Signals</h3>
            <div className="signal-tags">
              {selectedItem.signals.map(signal => (
                <span key={signal} className="signal-tag">{signal.replace(/_/g, ' ')}</span>
              ))}
            </div>
          </div>
        )}

        {/* Observability Data */}
        {selectedItem.observabilitySnapshot && (
          <ObservabilityPanel snapshot={selectedItem.observabilitySnapshot} />
        )}

        {/* Triage Phase */}
        {solvePhase === 'triage' && selectedItem.requiredTriage && (
          <TriageForm
            onSubmit={submitTriage}
            existingAnswers={currentAttempt.triageAnswers}
            existingScore={triageScore}
            rubricExplanation={rubricExplanation}
          />
        )}

        {/* Coding Phase */}
        {(solvePhase === 'coding' || solvePhase === 'result') && selectedItem.files && (
          <>
            {/* Triage Summary (if completed) */}
            {currentAttempt.triageAnswers && triageScore && (
              <div className="triage-summary">
                <div className="triage-summary-header">
                  <span>Triage Score: {Math.round(triageScore.overall * 100)}%</span>
                  <span className="triage-category">
                    Your assessment: {currentAttempt.triageAnswers.category} / {currentAttempt.triageAnswers.severity} / {currentAttempt.triageAnswers.priority}
                  </span>
                </div>
              </div>
            )}

            {/* Editor */}
            <div className="debug-lab-editor-section">
              <h2>Fix the Bug</h2>
              <MultiFileEditor
                files={selectedItem.files as DebugLabFile[]}
                modifiedFiles={modifiedFiles}
                onFileChange={handleFileChange}
                disabled={solvePhase === 'result'}
                language={selectedItem.language}
              />
            </div>

            {/* Explanation */}
            <div className="debug-lab-explanation">
              <label htmlFor="explanation">Explain your fix:</label>
              <textarea
                id="explanation"
                className="textarea"
                placeholder="Describe what the bug was and how your fix addresses it..."
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                disabled={solvePhase === 'result'}
                rows={4}
              />
              <span className="char-count">
                {explanation.length} characters {explanation.length < 10 && '(min 10)'}
              </span>
            </div>

            {/* Execution Result */}
            {executionResult && (
              <div className={`execution-result ${executionResult.passed ? 'passed' : 'failed'}`}>
                <div className="execution-result-header">
                  <span className={`execution-status ${executionResult.signalType}`}>
                    {executionResult.signalType === 'success' ? '✓ All Tests Passed' :
                     executionResult.signalType === 'test_failure' ? '✗ Tests Failed' :
                     executionResult.signalType === 'timeout' ? '⏱ Timeout' :
                     executionResult.signalType === 'crash' ? '💥 Crash' :
                     executionResult.signalType === 'compile_error' ? '🔴 Compile Error' :
                     '⚠ Runtime Error'}
                  </span>
                  <span className="execution-stats">
                    {executionResult.testsPassed}/{executionResult.testsTotal} tests passed
                    {' · '}
                    {executionResult.executionTimeMs}ms
                  </span>
                </div>
                {(executionResult.stdout || executionResult.stderr) && (
                  <details className="execution-output">
                    <summary>View Output</summary>
                    <pre>{executionResult.stdout}\n{executionResult.stderr}</pre>
                  </details>
                )}
              </div>
            )}

            {/* Actions */}
            {solvePhase === 'coding' && (
              <div className="debug-lab-actions">
                <button
                  className="btn btn-secondary"
                  onClick={runTests}
                  disabled={running}
                >
                  {running ? (
                    <>
                      <span className="spinner" style={{ width: '1rem', height: '1rem' }} />
                      Running...
                    </>
                  ) : (
                    'Run Tests'
                  )}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={submitSolution}
                  disabled={submitting || explanation.length < 10}
                >
                  {submitting ? (
                    <>
                      <span className="spinner" style={{ width: '1rem', height: '1rem' }} />
                      Submitting...
                    </>
                  ) : (
                    'Submit Fix'
                  )}
                </button>
              </div>
            )}

            {/* Result Phase */}
            {solvePhase === 'result' && submitResult && (
              <div className={`submit-result ${submitResult.passed ? 'passed' : 'failed'}`}>
                <div className="submit-result-header">
                  <h2>{submitResult.passed ? '🎉 Bug Fixed!' : '❌ Not Quite Right'}</h2>
                </div>

                {submitResult.taxonomy && (
                  <div className="taxonomy-reveal">
                    <h3>Defect Classification</h3>
                    <div className="taxonomy-grid">
                      <div className="taxonomy-item">
                        <span className="taxonomy-label">Category</span>
                        <span className="taxonomy-value">{submitResult.taxonomy.defectCategory}</span>
                      </div>
                      <div className="taxonomy-item">
                        <span className="taxonomy-label">Severity</span>
                        <span className="taxonomy-value">{submitResult.taxonomy.severity}</span>
                      </div>
                      <div className="taxonomy-item">
                        <span className="taxonomy-label">Priority</span>
                        <span className="taxonomy-value">{submitResult.taxonomy.priority}</span>
                      </div>
                    </div>
                    <div className="taxonomy-signals">
                      <span className="taxonomy-label">Signals:</span>
                      {submitResult.taxonomy.signals.map(s => (
                        <span key={s} className="signal-tag">{s.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                  </div>
                )}

                {submitResult.solutionExplanation && (
                  <div className="solution-explanation">
                    <h3>Solution Explanation</h3>
                    <pre>{submitResult.solutionExplanation}</pre>
                  </div>
                )}

                <div className="result-actions">
                  {!submitResult.passed && (
                    <button className="btn btn-secondary" onClick={() => setSolvePhase('coding')}>
                      Try Again
                    </button>
                  )}
                  <button className="btn btn-primary" onClick={goBack}>
                    Next Challenge
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="container debug-lab-list">
      <header className="debug-lab-list-header">
        <div>
          <h1>Debug Lab</h1>
          <p className="debug-lab-list-subtitle">
            Practice debugging real-world scenarios with taxonomy-based assessment.
          </p>
        </div>
        <Link href="/" className="btn btn-ghost">
          Back to Home
        </Link>
      </header>

      <div className="debug-lab-filters">
        <div className="filter-group">
          <label htmlFor="category-filter">Category:</label>
          <select
            id="category-filter"
            className="select"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value as DefectCategory | '')}
          >
            <option value="">All categories</option>
            <option value="Functional">Functional</option>
            <option value="Concurrency">Concurrency</option>
            <option value="Resource">Resource</option>
            <option value="Distributed">Distributed</option>
            <option value="Performance">Performance</option>
            <option value="Environment">Environment</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="difficulty-filter">Difficulty:</label>
          <select
            id="difficulty-filter"
            className="select"
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value)}
          >
            <option value="">All difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
            <option value="EXPERT">Expert</option>
          </select>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <h3>No challenges available</h3>
          <p>Check back later for new debug lab challenges.</p>
        </div>
      ) : (
        <div className="debug-lab-grid">
          {items.map(item => (
            <div key={item.id} className="debug-lab-card">
              <div className="debug-lab-card-header">
                <h3>{item.title}</h3>
                <span
                  className="debug-lab-difficulty"
                  style={{ color: getDifficultyColor(item.difficulty) }}
                >
                  {item.difficulty}
                </span>
              </div>
              <p className="debug-lab-card-description">{item.description}</p>
              <div className="debug-lab-card-meta">
                <span className="debug-lab-category">{item.defectCategory}</span>
                <span className="debug-lab-severity">{item.severity}</span>
                {item.requiredTriage && (
                  <span className="debug-lab-triage-badge">Triage Required</span>
                )}
              </div>
              <div className="debug-lab-card-signals">
                {item.signals.slice(0, 3).map(signal => (
                  <span key={signal} className="signal-tag small">{signal.replace(/_/g, ' ')}</span>
                ))}
              </div>
              <button
                className="btn btn-primary debug-lab-start-btn"
                onClick={() => startAttempt(item)}
              >
                Start Challenge
              </button>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .debug-lab-list-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }

        .debug-lab-list-subtitle {
          color: var(--text-secondary);
          margin-top: 0.5rem;
        }

        .debug-lab-filters {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .filter-group label {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .debug-lab-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        .debug-lab-card {
          background: var(--bg-secondary);
          border-radius: 8px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .debug-lab-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .debug-lab-card-header h3 {
          margin: 0;
          font-size: 1.125rem;
        }

        .debug-lab-difficulty {
          font-size: 0.75rem;
          font-weight: 600;
        }

        .debug-lab-card-description {
          color: var(--text-secondary);
          font-size: 0.875rem;
          line-height: 1.5;
          flex: 1;
        }

        .debug-lab-card-meta {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .debug-lab-category,
        .debug-lab-severity,
        .debug-lab-triage-badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          background: var(--bg-tertiary);
        }

        .debug-lab-triage-badge {
          background: var(--primary);
          color: white;
        }

        .debug-lab-card-signals {
          display: flex;
          gap: 0.25rem;
          flex-wrap: wrap;
        }

        .signal-tag {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }

        .signal-tag.small {
          font-size: 0.625rem;
          padding: 0.125rem 0.375rem;
        }

        .debug-lab-start-btn {
          margin-top: auto;
        }

        /* Solve view styles */
        .debug-lab-solve {
          max-width: 1000px;
        }

        .debug-lab-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .debug-lab-header-info h1 {
          margin: 0;
        }

        .debug-lab-badges {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          background: var(--bg-secondary);
        }

        .debug-lab-description {
          margin-bottom: 1.5rem;
        }

        .debug-lab-description h2 {
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }

        .debug-lab-description p {
          color: var(--text-secondary);
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .debug-lab-signals {
          margin-bottom: 1rem;
        }

        .debug-lab-signals h3 {
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
          color: var(--text-secondary);
        }

        .signal-tags {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .triage-summary {
          background: var(--bg-secondary);
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .triage-summary-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
        }

        .triage-category {
          color: var(--text-secondary);
        }

        .debug-lab-editor-section {
          margin-bottom: 1.5rem;
        }

        .debug-lab-editor-section h2 {
          font-size: 1rem;
          margin-bottom: 0.75rem;
        }

        .debug-lab-explanation {
          margin-bottom: 1.5rem;
        }

        .debug-lab-explanation label {
          display: block;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }

        .char-count {
          display: block;
          text-align: right;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        .execution-result {
          background: var(--bg-secondary);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .execution-result.passed {
          border-left: 4px solid var(--success);
        }

        .execution-result.failed {
          border-left: 4px solid var(--error);
        }

        .execution-result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .execution-status {
          font-weight: 500;
        }

        .execution-status.success { color: var(--success); }
        .execution-status.test_failure { color: var(--error); }
        .execution-status.timeout { color: var(--warning); }
        .execution-status.crash { color: var(--error); }
        .execution-status.compile_error { color: var(--error); }
        .execution-status.runtime_error { color: var(--warning); }

        .execution-stats {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .execution-output {
          margin-top: 1rem;
        }

        .execution-output summary {
          cursor: pointer;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .execution-output pre {
          margin-top: 0.5rem;
          padding: 0.75rem;
          background: var(--bg-primary);
          border-radius: 4px;
          font-size: 0.75rem;
          overflow-x: auto;
          white-space: pre-wrap;
        }

        .debug-lab-actions {
          display: flex;
          gap: 1rem;
        }

        .submit-result {
          background: var(--bg-secondary);
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 1.5rem;
        }

        .submit-result.passed {
          border-left: 4px solid var(--success);
        }

        .submit-result.failed {
          border-left: 4px solid var(--error);
        }

        .submit-result-header h2 {
          margin: 0;
        }

        .taxonomy-reveal {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border);
        }

        .taxonomy-reveal h3 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
        }

        .taxonomy-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .taxonomy-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .taxonomy-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .taxonomy-value {
          font-weight: 500;
        }

        .taxonomy-signals {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .solution-explanation {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border);
        }

        .solution-explanation h3 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
        }

        .solution-explanation pre {
          background: var(--bg-primary);
          padding: 1rem;
          border-radius: 4px;
          white-space: pre-wrap;
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .result-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
