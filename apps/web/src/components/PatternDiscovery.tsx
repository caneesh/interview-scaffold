'use client';

import { useState } from 'react';

interface QAEntry {
  questionId: string;
  question: string;
  answer: string;
}

interface PatternDiscoveryProps {
  /** Initial question to display */
  initialQuestion: string;
  initialQuestionId: string;
  /** Step ID for the discovery session */
  stepId: string;
  /** Current mode (for display) */
  mode: 'HEURISTIC' | 'SOCRATIC';
  /** Handler for submitting an answer */
  onSubmitAnswer: (data: { stepId: string; questionId: string; answer: string }) => Promise<{
    nextQuestion?: string;
    nextQuestionId?: string;
    discoveredPattern?: string;
    completed: boolean;
    qaLog: QAEntry[];
  }>;
  /** Handler for when a pattern is discovered */
  onPatternDiscovered: (pattern: string) => void;
  /** Handler for abandoning discovery */
  onAbandon: (stepId: string) => Promise<void>;
  /** Loading state */
  loading?: boolean;
}

// Pattern display names
const PATTERN_NAMES: Record<string, string> = {
  SLIDING_WINDOW: 'Sliding Window',
  TWO_POINTERS: 'Two Pointers',
  PREFIX_SUM: 'Prefix Sum',
  BINARY_SEARCH: 'Binary Search',
  BFS: 'Breadth-First Search',
  DFS: 'Depth-First Search',
  DYNAMIC_PROGRAMMING: 'Dynamic Programming',
  BACKTRACKING: 'Backtracking',
  GREEDY: 'Greedy',
  HEAP: 'Heap / Priority Queue',
  TRIE: 'Trie',
  UNION_FIND: 'Union Find',
  INTERVAL_MERGING: 'Interval Merging',
};

export function PatternDiscovery({
  initialQuestion,
  initialQuestionId,
  stepId,
  mode,
  onSubmitAnswer,
  onPatternDiscovered,
  onAbandon,
  loading,
}: PatternDiscoveryProps) {
  const [currentQuestion, setCurrentQuestion] = useState(initialQuestion);
  const [currentQuestionId, setCurrentQuestionId] = useState(initialQuestionId);
  const [answer, setAnswer] = useState('');
  const [qaLog, setQaLog] = useState<QAEntry[]>([]);
  const [discoveredPattern, setDiscoveredPattern] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || submitting) return;

    setSubmitting(true);
    try {
      const result = await onSubmitAnswer({
        stepId,
        questionId: currentQuestionId,
        answer: answer.trim(),
      });

      // Update Q&A log
      setQaLog(result.qaLog);

      if (result.completed && result.discoveredPattern) {
        setDiscoveredPattern(result.discoveredPattern);
      } else if (result.nextQuestion && result.nextQuestionId) {
        setCurrentQuestion(result.nextQuestion);
        setCurrentQuestionId(result.nextQuestionId);
        setAnswer('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUsePattern = () => {
    if (discoveredPattern) {
      onPatternDiscovered(discoveredPattern);
    }
  };

  const handleAbandon = async () => {
    await onAbandon(stepId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  };

  // Pattern discovered view
  if (discoveredPattern) {
    return (
      <div className="pattern-discovery pattern-discovery--completed">
        <div className="pattern-discovery-header">
          <div className="pattern-discovery-icon pattern-discovery-icon--success">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h3 className="pattern-discovery-title">Pattern Identified</h3>
        </div>

        <div className="pattern-discovery-result">
          <div className="pattern-discovery-pattern">
            {PATTERN_NAMES[discoveredPattern] || discoveredPattern}
          </div>
          <p className="pattern-discovery-explanation">
            Based on your answers, this pattern best fits the problem structure.
          </p>
        </div>

        {/* Q&A Summary */}
        {qaLog.length > 0 && (
          <div className="pattern-discovery-log">
            <h4 className="pattern-discovery-log-title">Your Discovery Path</h4>
            {qaLog.map((qa, index) => (
              <div key={index} className="pattern-discovery-qa">
                <div className="pattern-discovery-q">Q: {qa.question}</div>
                <div className="pattern-discovery-a">A: {qa.answer}</div>
              </div>
            ))}
          </div>
        )}

        <div className="pattern-discovery-actions">
          <button
            className="btn btn-primary"
            onClick={handleUsePattern}
            disabled={loading}
          >
            Use This Pattern
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginLeft: '0.5rem' }}>
              <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
            </svg>
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleAbandon}
            disabled={loading}
          >
            Choose Different Pattern
          </button>
        </div>
      </div>
    );
  }

  // Active discovery view
  return (
    <div className="pattern-discovery">
      <div className="pattern-discovery-header">
        <div className="pattern-discovery-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h3 className="pattern-discovery-title">Let's Find the Pattern</h3>
        <p className="pattern-discovery-subtitle">
          Answer a few questions to identify the best approach.
          {mode === 'SOCRATIC' && <span className="pattern-discovery-mode"> (AI-guided)</span>}
        </p>
      </div>

      {/* Previous Q&A */}
      {qaLog.length > 0 && (
        <div className="pattern-discovery-history">
          {qaLog.map((qa, index) => (
            <div key={index} className="pattern-discovery-qa pattern-discovery-qa--answered">
              <div className="pattern-discovery-q">Q{index + 1}: {qa.question}</div>
              <div className="pattern-discovery-a">{qa.answer}</div>
            </div>
          ))}
        </div>
      )}

      {/* Current Question */}
      <div className="pattern-discovery-current">
        <div className="pattern-discovery-question-number">
          Question {qaLog.length + 1}
        </div>
        <p className="pattern-discovery-question">{currentQuestion}</p>

        <textarea
          className="textarea pattern-discovery-input"
          placeholder="Type your answer..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={submitting}
        />

        <div className="pattern-discovery-actions">
          <button
            className="btn btn-primary"
            onClick={handleSubmitAnswer}
            disabled={!answer.trim() || submitting}
          >
            {submitting ? (
              <>
                <span className="spinner" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                Analyzing...
              </>
            ) : (
              'Continue'
            )}
          </button>
          <button
            className="btn btn-ghost"
            onClick={handleAbandon}
            disabled={submitting}
          >
            I'll pick manually
          </button>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="pattern-discovery-progress">
        <div className="pattern-discovery-progress-dots">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`pattern-discovery-dot ${i < qaLog.length ? 'completed' : i === qaLog.length ? 'active' : ''}`}
            />
          ))}
        </div>
        <span className="pattern-discovery-progress-text">
          {qaLog.length} of ~5 questions
        </span>
      </div>
    </div>
  );
}
