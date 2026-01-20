'use client';

import { useState } from 'react';
import { MemorizationWarning } from './MemorizationWarning';

interface RepromptQuestion {
  id: string;
  question: string;
}

interface StrategyStageProps {
  sessionId: string;
  problemTitle: string;
  patternName: string;
  onStageComplete: () => void;
}

export function StrategyStage({
  sessionId,
  problemTitle,
  patternName,
  onStageComplete,
}: StrategyStageProps) {
  const [strategy, setStrategy] = useState('');
  const [dataStructures, setDataStructures] = useState('');
  const [complexity, setComplexity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [adversaryQuestion, setAdversaryQuestion] = useState<string | null>(null);
  const [adversaryResponse, setAdversaryResponse] = useState('');
  const [phase, setPhase] = useState<'strategy' | 'adversary' | 'complete'>('strategy');

  // Memorization warning state
  const [memorizationWarning, setMemorizationWarning] = useState<{
    type: 'likely_memorized' | 'partially_memorized';
    message: string;
    repromptQuestions: RepromptQuestion[];
    requiresReExplanation?: boolean;
  } | null>(null);

  async function submitStrategy() {
    if (strategy.trim().length < 30) {
      setError('Please provide a more detailed strategy (at least 30 characters)');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/coaching/sessions/${sessionId}/strategy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy: strategy.trim(),
          dataStructures: dataStructures.trim(),
          expectedComplexity: complexity.trim(),
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error.message);
        return;
      }

      // Check for memorization warning
      if (data.warning) {
        setMemorizationWarning({
          type: data.warningType,
          message: data.warningMessage,
          repromptQuestions: data.repromptQuestions || [],
          requiresReExplanation: data.requiresReExplanation,
        });
        // Clear strategy to require re-entry
        setStrategy('');
        return;
      }

      setFeedback(data.response);
      // Clear any previous memorization warning on success
      setMemorizationWarning(null);

      if (data.adversaryQuestion) {
        setAdversaryQuestion(data.adversaryQuestion);
        setPhase('adversary');
      } else if (data.isComplete) {
        setPhase('complete');
        setTimeout(() => {
          onStageComplete();
        }, 2000);
      }
    } catch (err) {
      setError('Failed to submit strategy');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitAdversaryResponse() {
    if (adversaryResponse.trim().length < 20) {
      setError('Please provide a more detailed response (at least 20 characters)');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/coaching/sessions/${sessionId}/strategy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adversaryResponse: adversaryResponse.trim(),
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error.message);
        return;
      }

      setFeedback(data.response);

      if (data.isComplete) {
        setPhase('complete');
        setTimeout(() => {
          onStageComplete();
        }, 2000);
      } else if (data.adversaryQuestion) {
        // Another adversary question
        setAdversaryQuestion(data.adversaryQuestion);
        setAdversaryResponse('');
      }
    } catch (err) {
      setError('Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="coaching-stage strategy-stage">
      <div className="stage-header">
        <div className="stage-icon stage-icon--strategy">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>
        <div className="stage-header-content">
          <h2>Strategy Design</h2>
          <p>Design your solution strategy and defend it against adversarial questions.</p>
        </div>
      </div>

      {phase === 'complete' && (
        <div className="stage-complete-banner stage-complete-banner--success">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>Strategy approved! Moving to Coding...</span>
        </div>
      )}

      {error && (
        <div className="stage-error">
          {error}
          <button onClick={() => setError(null)} className="error-dismiss">x</button>
        </div>
      )}

      {feedback && phase !== 'complete' && (
        <div className="stage-feedback">
          <strong>Coach:</strong> {feedback}
        </div>
      )}

      {memorizationWarning && (
        <MemorizationWarning
          warningType={memorizationWarning.type}
          warningMessage={memorizationWarning.message}
          repromptQuestions={memorizationWarning.repromptQuestions}
          onRepromptAnswer={async (questionId, answer) => {
            // Submit reprompt answer
            try {
              const res = await fetch(`/api/coaching/sessions/${sessionId}/strategy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  strategy: answer,
                  repromptQuestionId: questionId,
                }),
              });
              const data = await res.json();
              if (!data.warning) {
                setMemorizationWarning(null);
                if (data.response) {
                  setFeedback(data.response);
                }
                if (data.isReady) {
                  setPhase('complete');
                  setTimeout(() => onStageComplete(), 2000);
                }
              }
            } catch (err) {
              setError('Failed to submit reprompt answer');
            }
          }}
          onDismiss={() => setMemorizationWarning(null)}
        />
      )}

      {phase === 'strategy' && !memorizationWarning && (
        <>
          <div className="strategy-context">
            <p>
              You are solving <strong>{problemTitle}</strong> using the{' '}
              <strong>{patternName.replace(/_/g, ' ')}</strong> pattern.
              Outline your approach before coding.
            </p>
          </div>

          <div className="strategy-form">
            <div className="strategy-field">
              <label className="strategy-label">
                Describe your high-level approach
              </label>
              <textarea
                className="textarea"
                placeholder="Step 1: Initialize... Step 2: Iterate through... Step 3: Update... The key insight is..."
                value={strategy}
                onChange={e => setStrategy(e.target.value)}
                disabled={submitting}
                rows={5}
              />
              <span className="char-count">{strategy.length} characters (min 30)</span>
            </div>

            <div className="strategy-field">
              <label className="strategy-label">
                What data structures will you use?
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g., hash map, two pointers, stack, etc."
                value={dataStructures}
                onChange={e => setDataStructures(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="strategy-field">
              <label className="strategy-label">
                Expected time and space complexity
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g., O(n) time, O(1) space"
                value={complexity}
                onChange={e => setComplexity(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="stage-actions">
            <button
              className="btn btn-primary"
              onClick={submitStrategy}
              disabled={submitting || strategy.trim().length < 30}
            >
              {submitting ? 'Submitting...' : 'Submit Strategy'}
            </button>
          </div>
        </>
      )}

      {phase === 'adversary' && adversaryQuestion && (
        <div className="adversary-section">
          <div className="adversary-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Adversarial Challenge</span>
          </div>

          <div className="adversary-question">
            <p>{adversaryQuestion}</p>
          </div>

          <div className="adversary-response">
            <label className="strategy-label">Your response</label>
            <textarea
              className="textarea"
              placeholder="Defend your strategy or explain how you would handle this edge case..."
              value={adversaryResponse}
              onChange={e => setAdversaryResponse(e.target.value)}
              disabled={submitting}
              rows={4}
            />
            <span className="char-count">{adversaryResponse.length} characters (min 20)</span>
          </div>

          <div className="stage-actions">
            <button
              className="btn btn-primary"
              onClick={submitAdversaryResponse}
              disabled={submitting || adversaryResponse.trim().length < 20}
            >
              {submitting ? 'Submitting...' : 'Submit Response'}
            </button>
          </div>

          <div className="adversary-hint">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>
              Adversarial questions test the robustness of your strategy.
              Consider edge cases and potential weaknesses in your approach.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
