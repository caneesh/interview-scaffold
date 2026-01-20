'use client';

import { useState } from 'react';

interface FeynmanStageProps {
  sessionId: string;
  patternName: string;
  problemTitle: string;
  onStageComplete: () => void;
}

export function FeynmanStage({
  sessionId,
  patternName,
  problemTitle,
  onStageComplete,
}: FeynmanStageProps) {
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  async function submitExplanation() {
    if (explanation.trim().length < 50) {
      setError('Please provide a more detailed explanation (at least 50 characters)');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/coaching/sessions/${sessionId}/feynman`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          explanation: explanation.trim(),
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error.message);
        return;
      }

      setFeedback(data.response);
      setScore(data.clarityScore);

      if (data.isComplete) {
        setIsComplete(true);
        setTimeout(() => {
          onStageComplete();
        }, 2500);
      }
    } catch (err) {
      setError('Failed to submit explanation');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="coaching-stage feynman-stage">
      <div className="stage-header">
        <div className="stage-icon stage-icon--feynman">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div className="stage-header-content">
          <h2>Feynman Validation</h2>
          <p>Explain your approach in plain language - as if teaching someone new to programming.</p>
        </div>
        {score !== null && (
          <div className="stage-score">
            <span className="score-label">Clarity</span>
            <span className="score-value">{Math.round(score * 100)}%</span>
          </div>
        )}
      </div>

      {isComplete && (
        <div className="stage-complete-banner stage-complete-banner--success">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>Excellent explanation! Moving to Strategy Design...</span>
        </div>
      )}

      {error && (
        <div className="stage-error">
          {error}
          <button onClick={() => setError(null)} className="error-dismiss">x</button>
        </div>
      )}

      <div className="feynman-context">
        <div className="feynman-prompt">
          <h4>The Feynman Technique</h4>
          <p>
            Named after physicist Richard Feynman, this technique validates understanding by
            requiring you to explain concepts in simple terms. If you can not explain it simply,
            you do not understand it well enough.
          </p>
        </div>

        <div className="feynman-task">
          <h4>Your Task</h4>
          <p>
            Explain how you would solve <strong>{problemTitle}</strong> using the{' '}
            <strong>{patternName.replace(/_/g, ' ')}</strong> pattern.
            Write as if explaining to someone who knows basic programming but has never
            seen this pattern before.
          </p>
        </div>
      </div>

      {feedback && (
        <div className={`stage-feedback ${isComplete ? 'stage-feedback--success' : 'stage-feedback--info'}`}>
          <strong>Coach Feedback:</strong> {feedback}
        </div>
      )}

      {!isComplete && (
        <>
          <div className="feynman-input-section">
            <label className="feynman-label">Your Explanation</label>
            <textarea
              className="feynman-input textarea"
              placeholder="Start your explanation here. For example: 'To solve this problem, we need to...' Focus on the key insight, the main steps, and why this approach works."
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              disabled={submitting}
              rows={8}
            />
            <div className="feynman-footer">
              <span className="char-count">
                {explanation.length} characters (min 50)
              </span>
              <div className="feynman-tips">
                <span className="tip">Tip: Avoid jargon. Use analogies if helpful.</span>
              </div>
            </div>
          </div>

          <div className="feynman-checklist">
            <h4>Your explanation should cover:</h4>
            <ul>
              <li>What is the key insight or "aha moment"?</li>
              <li>What are the main steps of the approach?</li>
              <li>Why does this approach guarantee a correct solution?</li>
              <li>What makes this better than brute force?</li>
            </ul>
          </div>

          <div className="stage-actions">
            <button
              className="btn btn-primary"
              onClick={submitExplanation}
              disabled={submitting || explanation.trim().length < 50}
            >
              {submitting ? 'Validating...' : 'Submit Explanation'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
