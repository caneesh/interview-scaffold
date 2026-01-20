'use client';

import { useState, useEffect } from 'react';

interface Question {
  id: string;
  text: string;
  category: string;
}

interface QAEntry {
  questionId: string;
  questionText: string;
  answer: string;
  feedback?: string;
}

interface ProblemFramingStageProps {
  sessionId: string;
  problemStatement: string;
  problemTitle: string;
  currentQuestions: Question[];
  answeredQuestions: QAEntry[];
  understandingScore: number;
  onStageComplete: () => void;
}

export function ProblemFramingStage({
  sessionId,
  problemStatement,
  problemTitle,
  currentQuestions,
  answeredQuestions,
  understandingScore,
  onStageComplete,
}: ProblemFramingStageProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localAnswered, setLocalAnswered] = useState<QAEntry[]>(answeredQuestions);
  const [localQuestions, setLocalQuestions] = useState<Question[]>(currentQuestions);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [localScore, setLocalScore] = useState(understandingScore);
  const [isComplete, setIsComplete] = useState(false);

  // Sync localQuestions when currentQuestions changes (e.g., after initial load)
  useEffect(() => {
    if (currentQuestions.length > 0 && localQuestions.length === 0) {
      setLocalQuestions(currentQuestions);
    }
  }, [currentQuestions, localQuestions.length]);

  async function submitAnswer(questionId: string) {
    const answer = answers[questionId];
    if (!answer || answer.trim().length < 10) {
      setError('Please provide a more detailed answer (at least 10 characters)');
      return;
    }

    setSubmitting(questionId);
    setError(null);
    setFeedback(null);

    try {
      const res = await fetch(`/api/coaching/sessions/${sessionId}/framing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, answer: answer.trim() }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error.message);
        return;
      }

      // Update local state
      const question = localQuestions.find(q => q.id === questionId);
      if (question) {
        setLocalAnswered(prev => [
          ...prev,
          { questionId, questionText: question.text, answer: answer.trim(), feedback: data.response },
        ]);
        setLocalQuestions(prev => prev.filter(q => q.id !== questionId));
      }

      setAnswers(prev => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });

      setFeedback(data.response);
      setLocalScore(data.understandingScore);

      if (data.isComplete) {
        setIsComplete(true);
        setTimeout(() => {
          onStageComplete();
        }, 2000);
      }
    } catch (err) {
      setError('Failed to submit answer');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="coaching-stage problem-framing-stage">
      <div className="stage-header">
        <div className="stage-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="stage-header-content">
          <h2>Problem Framing</h2>
          <p>Answer Socratic questions to demonstrate your understanding before coding.</p>
        </div>
        <div className="stage-score">
          <span className="score-label">Understanding</span>
          <span className="score-value">{Math.round(localScore * 100)}%</span>
        </div>
      </div>

      <div className="problem-context">
        <h3>{problemTitle}</h3>
        <p className="problem-statement-text">{problemStatement}</p>
      </div>

      {isComplete && (
        <div className="stage-complete-banner">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>Problem Framing Complete! Moving to Pattern Recognition...</span>
        </div>
      )}

      {error && (
        <div className="stage-error">
          {error}
          <button onClick={() => setError(null)} className="error-dismiss">x</button>
        </div>
      )}

      {feedback && !isComplete && (
        <div className="stage-feedback">
          <strong>Coach Feedback:</strong> {feedback}
        </div>
      )}

      {/* Answered Questions */}
      {localAnswered.length > 0 && (
        <div className="answered-questions">
          <h4>Your Answers</h4>
          {localAnswered.map((qa, index) => (
            <div key={index} className="answered-qa">
              <div className="qa-question">{qa.questionText}</div>
              <div className="qa-answer">{qa.answer}</div>
              {qa.feedback && (
                <div className="qa-feedback">{qa.feedback}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Current Questions */}
      {!isComplete && localQuestions.length > 0 && (
        <div className="current-questions">
          <h4>
            {localAnswered.length === 0 ? 'Answer these questions to begin:' : 'Continue with:'}
          </h4>
          {localQuestions.map(question => (
            <div key={question.id} className="question-card">
              <div className="question-category">{question.category}</div>
              <div className="question-text">{question.text}</div>
              <textarea
                className="question-input textarea"
                placeholder="Type your answer here..."
                value={answers[question.id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                disabled={submitting === question.id}
              />
              <div className="question-actions">
                <span className="char-count">
                  {(answers[question.id] || '').length} characters
                </span>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => submitAnswer(question.id)}
                  disabled={submitting === question.id || !answers[question.id]?.trim()}
                >
                  {submitting === question.id ? 'Submitting...' : 'Submit Answer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
