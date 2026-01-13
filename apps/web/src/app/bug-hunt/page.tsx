'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface BugHuntItem {
  id: string;
  pattern: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  language: string;
  code: string;
  prompt: string;
  title: string;
}

interface BugHuntAttempt {
  id: string;
  itemId: string;
  submission: { selectedLines: number[]; explanation: string } | null;
  validation: {
    result: 'CORRECT' | 'PARTIAL' | 'INCORRECT';
    lineSelectionCorrect: boolean;
    linesFound: number;
    totalBugLines: number;
    conceptsMatched: boolean;
    matchedConcepts: string[];
    totalConcepts: number;
  } | null;
  startedAt: string;
  completedAt: string | null;
  attemptNumber: number;
}

type ViewMode = 'list' | 'solve';

export default function BugHuntPage() {
  const [items, setItems] = useState<BugHuntItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedItem, setSelectedItem] = useState<BugHuntItem | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<BugHuntAttempt | null>(null);
  const [selectedLines, setSelectedLines] = useState<number[]>([]);
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    validation: BugHuntAttempt['validation'];
    explanation?: string;
    hint?: string;
  } | null>(null);
  const [filterPattern, setFilterPattern] = useState<string>('');

  // Fetch items
  useEffect(() => {
    async function fetchItems() {
      try {
        const url = filterPattern
          ? `/api/bug-hunt/items?pattern=${filterPattern}`
          : '/api/bug-hunt/items';
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
  }, [filterPattern]);

  // Start attempt
  const startAttempt = useCallback(async (item: BugHuntItem) => {
    try {
      const res = await fetch('/api/bug-hunt/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json();

      if (data.attempt) {
        setSelectedItem(item);
        setCurrentAttempt(data.attempt);
        setSelectedLines([]);
        setExplanation('');
        setResult(null);
        setViewMode('solve');
      }
    } catch (error) {
      console.error('Failed to start attempt:', error);
    }
  }, []);

  // Toggle line selection
  const toggleLine = useCallback((lineNumber: number) => {
    setSelectedLines(prev =>
      prev.includes(lineNumber)
        ? prev.filter(n => n !== lineNumber)
        : [...prev, lineNumber].sort((a, b) => a - b)
    );
  }, []);

  // Submit answer
  const submitAnswer = useCallback(async () => {
    if (!currentAttempt || selectedLines.length === 0 || explanation.length < 10) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/bug-hunt/attempts/${currentAttempt.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission: { selectedLines, explanation },
        }),
      });
      const data = await res.json();

      if (data.validation) {
        setResult({
          validation: data.validation,
          explanation: data.explanation,
          hint: data.hint,
        });
        setCurrentAttempt(data.attempt);
      }
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setSubmitting(false);
    }
  }, [currentAttempt, selectedLines, explanation]);

  // Reset to list view
  const goBack = useCallback(() => {
    setViewMode('list');
    setSelectedItem(null);
    setCurrentAttempt(null);
    setSelectedLines([]);
    setExplanation('');
    setResult(null);
  }, []);

  // Try again
  const tryAgain = useCallback(() => {
    if (selectedItem) {
      startAttempt(selectedItem);
    }
  }, [selectedItem, startAttempt]);

  // Difficulty badge color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'var(--success)';
      case 'MEDIUM':
        return 'var(--warning)';
      case 'HARD':
        return 'var(--error)';
      default:
        return 'var(--text-secondary)';
    }
  };

  // Result badge color
  const getResultColor = (result: string) => {
    switch (result) {
      case 'CORRECT':
        return 'var(--success)';
      case 'PARTIAL':
        return 'var(--warning)';
      case 'INCORRECT':
        return 'var(--error)';
      default:
        return 'var(--text-secondary)';
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading bug hunt challenges...</p>
        </div>
      </div>
    );
  }

  // Solve view
  if (viewMode === 'solve' && selectedItem) {
    const codeLines = selectedItem.code.split('\n');

    return (
      <div className="container bug-hunt-solve">
        <header className="bug-hunt-header">
          <button className="btn btn-ghost" onClick={goBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="bug-hunt-header-info">
            <h1 className="bug-hunt-title">{selectedItem.title}</h1>
            <span
              className="bug-hunt-difficulty"
              style={{ color: getDifficultyColor(selectedItem.difficulty) }}
            >
              {selectedItem.difficulty}
            </span>
          </div>
        </header>

        <div className="bug-hunt-prompt">
          <h2>Problem</h2>
          <p>{selectedItem.prompt}</p>
        </div>

        <div className="bug-hunt-instructions">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <p>Click on lines that contain bugs, then explain what's wrong.</p>
        </div>

        <div className="bug-hunt-code-container">
          <div className="bug-hunt-code-header">
            <span className="bug-hunt-language">{selectedItem.language}</span>
            <span className="bug-hunt-selected-count">
              {selectedLines.length} line{selectedLines.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="bug-hunt-code">
            {codeLines.map((line, idx) => {
              const lineNumber = idx + 1;
              const isSelected = selectedLines.includes(lineNumber);

              return (
                <div
                  key={idx}
                  className={`bug-hunt-code-line ${isSelected ? 'selected' : ''}`}
                  onClick={() => !result && toggleLine(lineNumber)}
                >
                  <span className="bug-hunt-line-number">{lineNumber}</span>
                  <span className="bug-hunt-line-content">
                    <pre>{line || ' '}</pre>
                  </span>
                  {isSelected && (
                    <span className="bug-hunt-line-marker">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bug-hunt-explanation">
          <label htmlFor="explanation">Explain the bug:</label>
          <textarea
            id="explanation"
            className="textarea"
            placeholder="Describe what's wrong with the selected line(s) and why it causes a bug..."
            value={explanation}
            onChange={e => setExplanation(e.target.value)}
            disabled={!!result}
            rows={4}
          />
          <span className="bug-hunt-char-count">
            {explanation.length} characters {explanation.length < 10 && '(min 10)'}
          </span>
        </div>

        {!result && (
          <div className="bug-hunt-actions">
            <button
              className="btn btn-primary"
              onClick={submitAnswer}
              disabled={submitting || selectedLines.length === 0 || explanation.length < 10}
            >
              {submitting ? (
                <>
                  <span className="spinner" style={{ width: '1rem', height: '1rem' }} />
                  Checking...
                </>
              ) : (
                'Submit Answer'
              )}
            </button>
          </div>
        )}

        {result && (
          <div className={`bug-hunt-result bug-hunt-result--${result.validation?.result.toLowerCase()}`}>
            <div className="bug-hunt-result-header">
              <span
                className="bug-hunt-result-badge"
                style={{ backgroundColor: getResultColor(result.validation?.result || '') }}
              >
                {result.validation?.result}
              </span>
            </div>

            <div className="bug-hunt-result-details">
              <div className="bug-hunt-result-row">
                <span className="bug-hunt-result-label">Line selection:</span>
                <span className={result.validation?.lineSelectionCorrect ? 'correct' : 'incorrect'}>
                  {result.validation?.lineSelectionCorrect ? 'Correct' : 'Incorrect'}
                  {' '}({result.validation?.linesFound}/{result.validation?.totalBugLines} bug lines found)
                </span>
              </div>
              <div className="bug-hunt-result-row">
                <span className="bug-hunt-result-label">Concept coverage:</span>
                <span className={result.validation?.conceptsMatched ? 'correct' : 'incorrect'}>
                  {result.validation?.conceptsMatched ? 'Good' : 'Needs work'}
                  {' '}({result.validation?.matchedConcepts.length}/{result.validation?.totalConcepts} concepts)
                </span>
              </div>
              {result.validation?.matchedConcepts.length ? (
                <div className="bug-hunt-result-row">
                  <span className="bug-hunt-result-label">Matched:</span>
                  <span className="bug-hunt-concepts">
                    {result.validation.matchedConcepts.join(', ')}
                  </span>
                </div>
              ) : null}
            </div>

            {result.explanation && (
              <div className="bug-hunt-explanation-reveal">
                <h3>Explanation</h3>
                <p>{result.explanation}</p>
              </div>
            )}

            {result.hint && (
              <div className="bug-hunt-hint">
                <h3>Hint</h3>
                <p>{result.hint}</p>
              </div>
            )}

            <div className="bug-hunt-result-actions">
              {result.validation?.result !== 'CORRECT' && (
                <button className="btn btn-secondary" onClick={tryAgain}>
                  Try Again
                </button>
              )}
              <button className="btn btn-primary" onClick={goBack}>
                Next Challenge
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="container bug-hunt-list">
      <header className="bug-hunt-list-header">
        <div>
          <h1>Bug Hunt</h1>
          <p className="bug-hunt-list-subtitle">
            Find and explain bugs in code snippets to improve your debugging skills.
          </p>
        </div>
        <Link href="/" className="btn btn-ghost">
          Back to Home
        </Link>
      </header>

      <div className="bug-hunt-filters">
        <label htmlFor="pattern-filter">Filter by pattern:</label>
        <select
          id="pattern-filter"
          className="select"
          value={filterPattern}
          onChange={e => setFilterPattern(e.target.value)}
        >
          <option value="">All patterns</option>
          <option value="SLIDING_WINDOW">Sliding Window</option>
          <option value="TWO_POINTERS">Two Pointers</option>
          <option value="BINARY_SEARCH">Binary Search</option>
        </select>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <h3>No challenges available</h3>
          <p>Check back later for new bug hunt challenges.</p>
        </div>
      ) : (
        <div className="bug-hunt-grid">
          {items.map(item => (
            <div key={item.id} className="bug-hunt-card">
              <div className="bug-hunt-card-header">
                <h3>{item.title}</h3>
                <span
                  className="bug-hunt-difficulty"
                  style={{ color: getDifficultyColor(item.difficulty) }}
                >
                  {item.difficulty}
                </span>
              </div>
              <p className="bug-hunt-card-prompt">{item.prompt}</p>
              <div className="bug-hunt-card-meta">
                <span className="bug-hunt-pattern">{item.pattern.replace(/_/g, ' ')}</span>
                <span className="bug-hunt-language">{item.language}</span>
              </div>
              <button
                className="btn btn-primary bug-hunt-start-btn"
                onClick={() => startAttempt(item)}
              >
                Start Challenge
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
