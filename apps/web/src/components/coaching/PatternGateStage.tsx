'use client';

import { useState } from 'react';
import { MemorizationWarning } from './MemorizationWarning';

interface RepromptQuestion {
  id: string;
  question: string;
}

interface PatternGateStageProps {
  sessionId: string;
  problemTitle: string;
  correctPattern: string;
  availablePatterns: string[];
  onStageComplete: () => void;
}

const PATTERN_DISPLAY_NAMES: Record<string, string> = {
  TWO_POINTER: 'Two Pointer',
  SLIDING_WINDOW: 'Sliding Window',
  HASH_MAP: 'Hash Map',
  BINARY_SEARCH: 'Binary Search',
  DFS: 'Depth-First Search',
  BFS: 'Breadth-First Search',
  DYNAMIC_PROGRAMMING: 'Dynamic Programming',
  GREEDY: 'Greedy',
  BACKTRACKING: 'Backtracking',
  HEAP: 'Heap',
  STACK: 'Stack',
  MONOTONIC_STACK: 'Monotonic Stack',
  TRIE: 'Trie',
};

function formatPatternName(pattern: string): string {
  return PATTERN_DISPLAY_NAMES[pattern] || pattern.replace(/_/g, ' ');
}

export function PatternGateStage({
  sessionId,
  problemTitle,
  correctPattern,
  availablePatterns,
  onStageComplete,
}: PatternGateStageProps) {
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);

  // Memorization warning state
  const [memorizationWarning, setMemorizationWarning] = useState<{
    type: 'likely_memorized' | 'partially_memorized';
    message: string;
    repromptQuestions: RepromptQuestion[];
    allowedHelpLevel?: number;
  } | null>(null);

  async function submitPattern() {
    if (!selectedPattern) {
      setError('Please select a pattern');
      return;
    }
    if (justification.trim().length < 20) {
      setError('Please provide a more detailed justification (at least 20 characters)');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/coaching/sessions/${sessionId}/pattern`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedPattern,
          justification: justification.trim(),
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
          allowedHelpLevel: data.allowedHelpLevel,
        });
        setSelectedPattern(null);
        setJustification('');
        return;
      }

      setFeedback(data.response);
      setAttempts(prev => prev + 1);

      if (data.isCorrect) {
        setIsCorrect(true);
        // Clear any previous memorization warning on success
        setMemorizationWarning(null);
        setTimeout(() => {
          onStageComplete();
        }, 2000);
      } else {
        // Allow retry with feedback
        setSelectedPattern(null);
        setJustification('');
      }
    } catch (err) {
      setError('Failed to submit pattern selection');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="coaching-stage pattern-gate-stage">
      <div className="stage-header">
        <div className="stage-icon stage-icon--pattern">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        </div>
        <div className="stage-header-content">
          <h2>Pattern Recognition Gate</h2>
          <p>Identify the underlying pattern and explain why it applies to this problem.</p>
        </div>
        {attempts > 0 && (
          <div className="stage-attempts">
            <span className="attempts-label">Attempts</span>
            <span className="attempts-value">{attempts}</span>
          </div>
        )}
      </div>

      {isCorrect && (
        <div className="stage-complete-banner stage-complete-banner--success">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>Correct! Moving to Feynman Validation...</span>
        </div>
      )}

      {error && (
        <div className="stage-error">
          {error}
          <button onClick={() => setError(null)} className="error-dismiss">x</button>
        </div>
      )}

      {feedback && !isCorrect && (
        <div className="stage-feedback stage-feedback--retry">
          <strong>Feedback:</strong> {feedback}
          <p className="feedback-hint">Consider the feedback above and try again.</p>
        </div>
      )}

      {memorizationWarning && (
        <MemorizationWarning
          warningType={memorizationWarning.type}
          warningMessage={memorizationWarning.message}
          repromptQuestions={memorizationWarning.repromptQuestions}
          allowedHelpLevel={memorizationWarning.allowedHelpLevel}
          onRepromptAnswer={async (questionId, answer) => {
            // Submit reprompt answer to API
            try {
              const res = await fetch(`/api/coaching/sessions/${sessionId}/pattern`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  selectedPattern: selectedPattern || memorizationWarning.repromptQuestions[0]?.id,
                  justification: answer,
                  repromptQuestionId: questionId,
                }),
              });
              const data = await res.json();
              if (!data.warning) {
                // Reprompt answered satisfactorily
                setMemorizationWarning(null);
              }
            } catch (err) {
              setError('Failed to submit reprompt answer');
            }
          }}
          onDismiss={() => setMemorizationWarning(null)}
        />
      )}

      {!isCorrect && !memorizationWarning && (
        <>
          <div className="pattern-selection">
            <h4>Select the pattern that best fits this problem:</h4>
            <div className="pattern-options">
              {availablePatterns.map(pattern => (
                <button
                  key={pattern}
                  className={`pattern-option ${selectedPattern === pattern ? 'selected' : ''}`}
                  onClick={() => setSelectedPattern(pattern)}
                  disabled={submitting}
                >
                  {formatPatternName(pattern)}
                </button>
              ))}
            </div>
          </div>

          <div className="justification-section">
            <label className="justification-label">
              Why does this pattern apply? (Explain in your own words)
            </label>
            <textarea
              className="justification-input textarea"
              placeholder="Explain why you chose this pattern. Consider: What problem characteristics make this pattern suitable? What would the key invariant be?"
              value={justification}
              onChange={e => setJustification(e.target.value)}
              disabled={submitting}
            />
            <div className="justification-footer">
              <span className="char-count">{justification.length} characters (min 20)</span>
            </div>
          </div>

          <div className="stage-actions">
            <button
              className="btn btn-primary"
              onClick={submitPattern}
              disabled={submitting || !selectedPattern || justification.trim().length < 20}
            >
              {submitting ? 'Validating...' : 'Submit Pattern Selection'}
            </button>
          </div>

          <div className="pattern-gate-hint">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>
              This gate prevents memorized solutions. You must demonstrate understanding
              of why this pattern applies, not just identify it.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
