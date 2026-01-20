'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ReflectionStageProps {
  sessionId: string;
  problemTitle: string;
  patternName: string;
  helpLevel: number;
  onComplete: () => void;
}

const REFLECTION_QUESTIONS = [
  {
    id: 'pattern_clarity',
    question: 'How confident are you in recognizing this pattern in future problems?',
    options: ['Not confident', 'Somewhat confident', 'Confident', 'Very confident'],
  },
  {
    id: 'key_insight',
    question: 'What was the key insight or "aha moment" in this problem?',
    type: 'text',
  },
  {
    id: 'difficulty',
    question: 'What was the most challenging part?',
    options: [
      'Understanding the problem',
      'Recognizing the pattern',
      'Designing the strategy',
      'Implementing the code',
      'Handling edge cases',
    ],
  },
  {
    id: 'improvement',
    question: 'What would you do differently next time?',
    type: 'text',
  },
];

export function ReflectionStage({
  sessionId,
  problemTitle,
  patternName,
  helpLevel,
  onComplete,
}: ReflectionStageProps) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  function updateResponse(questionId: string, value: string) {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  }

  async function submitReflection() {
    // Check all questions are answered
    const unanswered = REFLECTION_QUESTIONS.filter(q => !responses[q.id]);
    if (unanswered.length > 0) {
      setError('Please answer all reflection questions');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/coaching/sessions/${sessionId}/reflection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error.message);
        return;
      }

      setFinalScore(data.finalScore);
      setIsComplete(true);
      onComplete();
    } catch (err) {
      setError('Failed to submit reflection');
    } finally {
      setSubmitting(false);
    }
  }

  if (isComplete) {
    return (
      <div className="coaching-stage reflection-stage reflection-stage--complete">
        <div className="reflection-complete">
          <div className="reflection-complete-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2>Session Complete!</h2>
          <p className="reflection-problem">{problemTitle}</p>

          {finalScore !== null && (
            <div className="reflection-final-score">
              <span className="score-label">Final Score</span>
              <span className="score-value">{Math.round(finalScore * 100)}%</span>
            </div>
          )}

          <div className="reflection-summary">
            <div className="summary-item">
              <span className="summary-label">Pattern Practiced</span>
              <span className="summary-value">{patternName.replace(/_/g, ' ')}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Help Level Used</span>
              <span className="summary-value">Level {helpLevel}</span>
            </div>
          </div>

          <div className="reflection-next-steps">
            <h4>Reinforce Your Learning</h4>
            <ul>
              <li>Practice another {patternName.replace(/_/g, ' ')} problem</li>
              <li>Explain this pattern to someone else</li>
              <li>Review the key invariant in 24 hours</li>
            </ul>
          </div>

          <div className="reflection-actions">
            <Link href="/coach" className="btn btn-primary">
              Back to Coach
            </Link>
            <Link href="/practice" className="btn btn-secondary">
              Practice More
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="coaching-stage reflection-stage">
      <div className="stage-header">
        <div className="stage-icon stage-icon--reflection">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="stage-header-content">
          <h2>Reflection</h2>
          <p>Solidify your learning with targeted reflection questions.</p>
        </div>
      </div>

      {error && (
        <div className="stage-error">
          {error}
          <button onClick={() => setError(null)} className="error-dismiss">x</button>
        </div>
      )}

      <div className="reflection-intro">
        <p>
          You have completed <strong>{problemTitle}</strong> using the{' '}
          <strong>{patternName.replace(/_/g, ' ')}</strong> pattern.
          Take a moment to reflect on what you learned.
        </p>
      </div>

      <div className="reflection-questions">
        {REFLECTION_QUESTIONS.map((q, index) => (
          <div key={q.id} className="reflection-question">
            <div className="question-number">{index + 1}</div>
            <div className="question-content">
              <label className="question-label">{q.question}</label>
              {q.type === 'text' ? (
                <textarea
                  className="textarea"
                  placeholder="Your response..."
                  value={responses[q.id] || ''}
                  onChange={e => updateResponse(q.id, e.target.value)}
                  disabled={submitting}
                  rows={3}
                />
              ) : q.options ? (
                <div className="question-options">
                  {q.options.map(option => (
                    <button
                      key={option}
                      className={`option-btn ${responses[q.id] === option ? 'selected' : ''}`}
                      onClick={() => updateResponse(q.id, option)}
                      disabled={submitting}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="stage-actions">
        <button
          className="btn btn-primary"
          onClick={submitReflection}
          disabled={submitting}
        >
          {submitting ? 'Completing...' : 'Complete Session'}
        </button>
      </div>

      <div className="reflection-tip">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          Research shows that reflection significantly improves long-term retention.
          Thoughtful answers here will help you in future interviews.
        </span>
      </div>
    </div>
  );
}
