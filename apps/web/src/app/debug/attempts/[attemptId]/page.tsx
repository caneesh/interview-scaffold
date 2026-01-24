'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CodeArtifactViewer,
  DebugProgressIndicator,
  DebugGatePanel,
  DebugFeedbackPanel,
  DebugHintPanel,
  DebugScoreBreakdown,
} from '@/components/debug';
import {
  DEBUG_GATES,
  type DebugGate,
  type DebugAttemptDetail,
  type EvaluationResult,
  type DebugHint,
  type MasteryUpdate,
  getGateDisplayName,
  getCategoryDisplayName,
  getDifficultyDisplayName,
} from '@/components/debug/types';

// Gate input type configuration
const GATE_INPUT_TYPES: Record<DebugGate, 'mcq' | 'text'> = {
  SYMPTOM_CLASSIFICATION: 'mcq',
  DETERMINISM_ANALYSIS: 'mcq',
  PATTERN_CLASSIFICATION: 'mcq',
  ROOT_CAUSE_HYPOTHESIS: 'text',
  FIX_STRATEGY: 'text',
  REGRESSION_PREVENTION: 'text',
  REFLECTION: 'text',
};

// Default gate prompts (overridden by API if available)
const DEFAULT_GATE_PROMPTS: Record<DebugGate, string> = {
  SYMPTOM_CLASSIFICATION:
    'Based on the symptom description, what type of bug symptom is this?',
  DETERMINISM_ANALYSIS:
    'Is this bug deterministic or non-deterministic? What factors might affect reproducibility?',
  PATTERN_CLASSIFICATION:
    'What debugging pattern does this bug likely match? Consider the category and common causes.',
  ROOT_CAUSE_HYPOTHESIS:
    'What do you think is the root cause of this bug? Form a hypothesis based on your analysis.',
  FIX_STRATEGY:
    'How would you fix this bug? Describe your approach without writing actual code.',
  REGRESSION_PREVENTION:
    'How would you prevent this bug from recurring? What tests or practices would help?',
  REFLECTION:
    'What did you learn from debugging this issue? What would you do differently next time?',
};

// Default MCQ options for classification gates
const DEFAULT_SYMPTOM_OPTIONS = [
  'Crash / Exception',
  'Wrong Output',
  'Performance Degradation',
  'Intermittent Failure',
  'Resource Exhaustion',
  'Incorrect State',
];

const DEFAULT_DETERMINISM_OPTIONS = [
  'Deterministic - reproduces consistently',
  'Non-deterministic - appears randomly',
  'Race condition - timing dependent',
  'Environment dependent - only in certain contexts',
  'Flaky - intermittent, cause unclear',
];

const DEFAULT_PATTERN_OPTIONS = [
  'Functional Logic (off-by-one, wrong comparison)',
  'Algorithmic (wrong algorithm, incorrect invariant)',
  'Performance (inefficient complexity, N+1)',
  'Resource (leak, exhaustion)',
  'Concurrency (race condition, deadlock)',
  'Integration (API misuse, contract violation)',
];

export default function DebugAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;

  // Attempt state
  const [attempt, setAttempt] = useState<DebugAttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Gate interaction state
  const [submitting, setSubmitting] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<EvaluationResult | null>(null);

  // Hint state
  const [hints, setHints] = useState<DebugHint[]>([]);
  const [hintLoading, setHintLoading] = useState(false);
  const [currentHintText, setCurrentHintText] = useState<string | undefined>();

  // Completion state
  const [masteryUpdate, setMasteryUpdate] = useState<MasteryUpdate | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);

  // Fetch attempt on mount
  useEffect(() => {
    fetchAttempt();
  }, [attemptId]);

  async function fetchAttempt() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/debug/attempts/${attemptId}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error.message || 'Failed to load attempt');
      } else {
        // Merge scenario into attempt (API returns them separately)
        setAttempt({ ...data.attempt, scenario: data.scenario });
        // Restore hints from attempt if any
        if (data.hints) {
          setHints(data.hints);
        }
        if (data.masteryUpdate) {
          setMasteryUpdate(data.masteryUpdate);
        }
        if (data.recommendation) {
          setRecommendation(data.recommendation);
        }
      }
    } catch (err) {
      setError('Failed to load debug attempt');
    } finally {
      setLoading(false);
    }
  }

  async function handleGateSubmit(answer: string) {
    if (!attempt) return;

    setSubmitting(true);
    setLastFeedback(null);
    setError(null);

    try {
      const res = await fetch(`/api/debug/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateId: attempt.currentGate,
          answer,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error.message || 'Failed to submit answer');
      } else {
        // API returns 'evaluation', not 'evaluationResult'
        const evalResult = data.evaluation || data.evaluationResult;
        setLastFeedback(evalResult);
        // Preserve scenario when updating attempt
        setAttempt((prev) => prev ? { ...data.attempt, scenario: prev.scenario } : data.attempt);
        // Clear current hint text when moving to next gate
        if (evalResult?.isCorrect) {
          setCurrentHintText(undefined);
        }
        // Handle completion data
        if (data.masteryUpdate) {
          setMasteryUpdate(data.masteryUpdate);
        }
        if (data.recommendation) {
          setRecommendation(data.recommendation);
        }
      }
    } catch (err) {
      setError('Failed to submit answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestHint() {
    if (!attempt) return;

    setHintLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/debug/attempts/${attemptId}/hint`, {
        method: 'POST',
      });

      const data = await res.json();

      if (data.error) {
        if (data.error.code === 'NO_MORE_HINTS') {
          // Handle no more hints gracefully
        } else {
          setError(data.error.message || 'Failed to get hint');
        }
      } else {
        // API returns hint as string directly, not { text: string }
        const hintText = typeof data.hint === 'string' ? data.hint : data.hint?.text || `Hint ${hints.length + 1}`;
        const newHint: DebugHint = {
          level: hints.length + 1,
          text: hintText,
        };
        setHints((prev) => [...prev, newHint]);
        setCurrentHintText(hintText);
        // Preserve scenario when updating attempt
        setAttempt((prev) => prev ? { ...data.attempt, scenario: prev.scenario } : data.attempt);
      }
    } catch (err) {
      setError('Failed to get hint. Please try again.');
    } finally {
      setHintLoading(false);
    }
  }

  // Derive completed gates from gate history
  const getCompletedGates = useCallback((): DebugGate[] => {
    if (!attempt) return [];
    const completed = new Set<DebugGate>();
    for (const submission of attempt.gateHistory) {
      if (submission.evaluationResult.isCorrect) {
        completed.add(submission.gateId);
      }
    }
    return DEBUG_GATES.filter((g) => completed.has(g));
  }, [attempt]);

  // Get MCQ options for current gate
  const getGateOptions = useCallback((): string[] => {
    if (!attempt) return [];

    const gate = attempt.currentGate;

    // Use scenario-provided options if available
    if (gate === 'SYMPTOM_CLASSIFICATION' && attempt.scenario.symptomOptions) {
      return attempt.scenario.symptomOptions.map((opt) => opt.label);
    }

    // Fall back to defaults
    switch (gate) {
      case 'SYMPTOM_CLASSIFICATION':
        return DEFAULT_SYMPTOM_OPTIONS;
      case 'DETERMINISM_ANALYSIS':
        return DEFAULT_DETERMINISM_OPTIONS;
      case 'PATTERN_CLASSIFICATION':
        return DEFAULT_PATTERN_OPTIONS;
      default:
        return [];
    }
  }, [attempt]);

  // Loading state
  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem' }}>Loading debug session...</p>
      </div>
    );
  }

  // Error state
  if (error && !attempt) {
    return (
      <div className="empty-state">
        <h3>Something went wrong</h3>
        <p>{error}</p>
        <button
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchAttempt();
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Not found
  if (!attempt) {
    return (
      <div className="empty-state">
        <h3>Attempt not found</h3>
        <a href="/debug" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Debug
        </a>
      </div>
    );
  }

  // Completed state
  if (attempt.status === 'COMPLETED' && attempt.scoreJson) {
    const score = {
      timeToDiagnosis: Math.round(attempt.scoreJson.timeToDiagnosisMs / 1000), // Convert to seconds for display
      fixAccuracy: attempt.scoreJson.fixAccuracy,
      hintsUsed: attempt.scoreJson.hintsPenalty,
      edgeCasesConsidered: attempt.scoreJson.edgeCasesConsidered,
      explanationQuality: attempt.scoreJson.explanationQuality,
      overall: attempt.scoreJson.overall,
    };

    return (
      <div className="debug-completion">
        <div className="debug-completion-header">
          <h1>Debug Session Complete</h1>
          <p className="debug-completion-scenario">
            {getCategoryDisplayName(attempt.scenario.category)} -{' '}
            {getDifficultyDisplayName(attempt.scenario.difficulty)}
          </p>
        </div>

        <DebugScoreBreakdown
          score={score}
          masteryUpdate={
            masteryUpdate
              ? { before: masteryUpdate.before, after: masteryUpdate.after }
              : undefined
          }
        />

        {/* Recommendation */}
        {recommendation && (
          <div className="debug-recommendation">
            <h3>What to Improve</h3>
            <p>{recommendation}</p>
          </div>
        )}

        {/* Actions */}
        <div className="debug-completion-actions">
          <button
            className="btn btn-primary"
            onClick={() => router.push('/debug')}
          >
            Try Another
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => router.push('/debug')}
          >
            Back to Debug
          </button>
        </div>
      </div>
    );
  }

  // Active attempt - three panel layout
  return (
    <div className="debug-attempt-layout">
      {/* Progress indicator */}
      <div className="debug-attempt-progress">
        <DebugProgressIndicator
          gates={[...DEBUG_GATES]}
          currentGate={attempt.currentGate}
          completedGates={getCompletedGates()}
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className="debug-error-banner">
          <p>{error}</p>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="debug-attempt-panels">
        {/* Left Panel - Scenario Context */}
        <div className="debug-panel debug-panel-left">
          <div className="debug-panel-header">
            <h2>Scenario Context</h2>
            <span className="debug-panel-badge">
              {getDifficultyDisplayName(attempt.scenario.difficulty)}
            </span>
          </div>

          {/* Symptom description */}
          <div className="debug-context-section">
            <h3>Symptom</h3>
            <p className="debug-symptom-text">
              {attempt.scenario.symptomDescription}
            </p>
          </div>

          {/* Code artifacts */}
          <div className="debug-context-section">
            <h3>Code</h3>
            <CodeArtifactViewer artifacts={attempt.scenario.codeArtifacts} />
          </div>
        </div>

        {/* Center Panel - Gate Flow */}
        <div className="debug-panel debug-panel-center">
          <div className="debug-panel-header">
            <h2>{getGateDisplayName(attempt.currentGate)}</h2>
            <span className="debug-panel-gate-number">
              Gate {DEBUG_GATES.indexOf(attempt.currentGate) + 1} of {DEBUG_GATES.length}
            </span>
          </div>

          {/* Gate input */}
          <DebugGatePanel
            gate={attempt.currentGate}
            prompt={DEFAULT_GATE_PROMPTS[attempt.currentGate]}
            inputType={GATE_INPUT_TYPES[attempt.currentGate]}
            options={getGateOptions()}
            onSubmit={handleGateSubmit}
            disabled={submitting}
          />

          {/* Feedback panel */}
          {lastFeedback && (
            <DebugFeedbackPanel
              isCorrect={lastFeedback.isCorrect}
              feedback={lastFeedback.feedback}
              rubricScores={lastFeedback.rubricScores}
              nextGate={lastFeedback.nextGate}
            />
          )}
        </div>

        {/* Right Panel - Help */}
        <div className="debug-panel debug-panel-right">
          <div className="debug-panel-header">
            <h2>Help</h2>
          </div>

          <DebugHintPanel
            currentHint={attempt.hintsUsed}
            totalHints={5}
            hintText={currentHintText}
            onRequestHint={handleRequestHint}
            disabled={hintLoading}
          />

          {/* Previous hints */}
          {hints.length > 0 && (
            <div className="debug-hints-history">
              <h4>Previous Hints</h4>
              {hints.map((hint, index) => (
                <div key={index} className="debug-hint-item">
                  <span className="debug-hint-level">Hint {hint.level}</span>
                  <p className="debug-hint-text">{hint.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
