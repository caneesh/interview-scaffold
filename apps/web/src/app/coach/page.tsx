'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ProblemSummary {
  id: string;
  title: string;
  pattern: string;
  rung: number;
  statement: string;
  targetComplexity: string;
  hasHints: boolean;
  testCaseCount: number;
}

interface CoachingSessionSummary {
  id: string;
  attemptId: string;
  problemId: string;
  problemTitle: string;
  problemPattern: string;
  problemRung: number;
  currentStage: string;
  helpLevel: number;
  startedAt: string;
  completedAt: string | null;
  isCompleted: boolean;
}

const STAGE_DISPLAY_NAMES: Record<string, string> = {
  PROBLEM_FRAMING: 'Problem Framing',
  PATTERN_RECOGNITION: 'Pattern Recognition',
  FEYNMAN_VALIDATION: 'Feynman Validation',
  STRATEGY_DESIGN: 'Strategy Design',
  CODING: 'Coding',
  REFLECTION: 'Reflection',
};

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

function formatStageName(stage: string): string {
  return STAGE_DISPLAY_NAMES[stage] || stage.replace(/_/g, ' ');
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function CoachLandingPage() {
  const router = useRouter();
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [sessions, setSessions] = useState<CoachingSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchProblems(), fetchSessions()])
      .finally(() => setLoading(false));
  }, []);

  async function fetchProblems() {
    try {
      const res = await fetch('/api/problems/list');
      const data = await res.json();
      if (data.error) {
        setError(data.error.message);
      } else {
        setProblems(data.problems);
      }
    } catch (err) {
      setError('Failed to fetch problems');
    }
  }

  async function fetchSessions() {
    try {
      const res = await fetch('/api/coaching/sessions/list');
      const data = await res.json();
      if (!data.error) {
        setSessions(data.sessions);
      }
    } catch (err) {
      // Sessions are optional, don't error
    }
  }

  async function startCoachingSession(problemId: string) {
    setStarting(problemId);
    setError(null);

    try {
      // First, start an attempt for the problem
      const attemptRes = await fetch('/api/attempts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId }),
      });

      const attemptData = await attemptRes.json();

      if (attemptData.error) {
        setError(attemptData.error.message);
        setStarting(null);
        return;
      }

      const attemptId = attemptData.attempt.id;

      // Then, create a coaching session for the attempt
      const sessionRes = await fetch('/api/coaching/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, problemId }),
      });

      const sessionData = await sessionRes.json();

      if (sessionData.error) {
        setError(sessionData.error.message);
        setStarting(null);
        return;
      }

      // Navigate to the coaching session
      router.push(`/coach/${sessionData.session.id}`);
    } catch (err) {
      setError('Failed to start coaching session');
      setStarting(null);
    }
  }

  function resumeSession(sessionId: string) {
    router.push(`/coach/${sessionId}`);
  }

  // Group problems by pattern
  const problemsByPattern = problems.reduce((acc, problem) => {
    const pattern = problem.pattern;
    if (!acc[pattern]) {
      acc[pattern] = [];
    }
    acc[pattern]!.push(problem);
    return acc;
  }, {} as Record<string, ProblemSummary[]>);

  // Get unique patterns sorted
  const patterns = Object.keys(problemsByPattern).sort();

  // Filter problems if pattern is selected
  const displayedProblems = selectedPattern
    ? problemsByPattern[selectedPattern] || []
    : problems;

  // Get active sessions (not completed)
  const activeSessions = sessions.filter(s => !s.isCompleted);
  const completedSessions = sessions.filter(s => s.isCompleted);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem' }}>Loading coaching dashboard...</p>
      </div>
    );
  }

  return (
    <div className="coach-landing">
      <header className="coach-header">
        <h1>Coaching Mode</h1>
        <p className="coach-subtitle">
          Master problem-solving through guided practice with Socratic questioning,
          pattern recognition gates, and structured reflection.
        </p>
      </header>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          {error}
          <button
            onClick={() => setError(null)}
            className="alert-dismiss"
            aria-label="Dismiss error"
          >
            x
          </button>
        </div>
      )}

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <section className="coach-section">
          <h2 className="section-title">Continue Learning</h2>
          <div className="session-grid">
            {activeSessions.map(session => (
              <div key={session.id} className="session-card session-card--active">
                <div className="session-card-header">
                  <span className="session-stage-badge">
                    {formatStageName(session.currentStage)}
                  </span>
                  <span className="session-time">{formatTimeAgo(session.startedAt)}</span>
                </div>
                <h3 className="session-problem-title">{session.problemTitle}</h3>
                <div className="session-meta">
                  <span className="problem-tag">{formatPatternName(session.problemPattern)}</span>
                  <span className="problem-tag">Rung {session.problemRung}</span>
                  {session.helpLevel > 1 && (
                    <span className="problem-tag problem-tag--help">
                      Help Level {session.helpLevel}
                    </span>
                  )}
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => resumeSession(session.id)}
                >
                  Continue Session
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Problem Selection */}
      <section className="coach-section">
        <div className="section-header">
          <h2 className="section-title">Start New Session</h2>
          <div className="pattern-filter">
            <label htmlFor="pattern-select" className="sr-only">Filter by pattern</label>
            <select
              id="pattern-select"
              value={selectedPattern || ''}
              onChange={(e) => setSelectedPattern(e.target.value || null)}
              className="pattern-select"
            >
              <option value="">All Patterns ({problems.length})</option>
              {patterns.map(pattern => (
                <option key={pattern} value={pattern}>
                  {formatPatternName(pattern)} ({problemsByPattern[pattern]?.length ?? 0})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="problem-grid">
          {displayedProblems
            .sort((a, b) => a.rung - b.rung || a.title.localeCompare(b.title))
            .map(problem => {
              const isStarting = starting === problem.id;
              const hasActiveSession = activeSessions.some(s => s.problemId === problem.id);

              return (
                <div key={problem.id} className="problem-card">
                  <div className="problem-card-header">
                    <div className="problem-meta">
                      <span className="problem-tag">{formatPatternName(problem.pattern)}</span>
                      <span className="problem-tag">Rung {problem.rung}</span>
                    </div>
                    <span className="problem-complexity">{problem.targetComplexity}</span>
                  </div>
                  <h3 className="problem-card-title">{problem.title}</h3>
                  <p className="problem-card-statement">
                    {problem.statement.length > 150
                      ? problem.statement.slice(0, 150) + '...'
                      : problem.statement}
                  </p>
                  <div className="problem-card-footer">
                    <span className="problem-info">
                      {problem.testCaseCount} test cases
                      {problem.hasHints && ' | Hints available'}
                    </span>
                    {hasActiveSession ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          const session = activeSessions.find(s => s.problemId === problem.id);
                          if (session) resumeSession(session.id);
                        }}
                      >
                        Resume
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => startCoachingSession(problem.id)}
                        disabled={isStarting}
                      >
                        {isStarting ? 'Starting...' : 'Start'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {displayedProblems.length === 0 && (
          <div className="empty-state">
            <p>No problems found for the selected pattern.</p>
          </div>
        )}
      </section>

      {/* Completed Sessions */}
      {completedSessions.length > 0 && (
        <section className="coach-section">
          <h2 className="section-title">Completed Sessions</h2>
          <div className="completed-sessions-list">
            {completedSessions.slice(0, 5).map(session => (
              <div key={session.id} className="completed-session-item">
                <div className="completed-session-info">
                  <span className="completed-session-title">{session.problemTitle}</span>
                  <span className="completed-session-meta">
                    {formatPatternName(session.problemPattern)} | Rung {session.problemRung}
                  </span>
                </div>
                <div className="completed-session-status">
                  <span className="completed-badge">Completed</span>
                  <span className="completed-time">
                    {session.completedAt ? formatTimeAgo(session.completedAt) : ''}
                  </span>
                </div>
                <Link href={`/coach/${session.id}`} className="btn btn-ghost btn-sm">
                  Review
                </Link>
              </div>
            ))}
          </div>
          {completedSessions.length > 5 && (
            <p className="see-more-text">
              and {completedSessions.length - 5} more completed sessions
            </p>
          )}
        </section>
      )}

      {/* How It Works */}
      <section className="coach-section coach-section--info">
        <h2 className="section-title">How Coaching Mode Works</h2>
        <div className="coaching-stages-overview">
          <div className="stage-overview-item">
            <div className="stage-number">1</div>
            <div className="stage-overview-content">
              <h4>Problem Framing</h4>
              <p>Understand the problem through Socratic questions before jumping to code.</p>
            </div>
          </div>
          <div className="stage-overview-item">
            <div className="stage-number">2</div>
            <div className="stage-overview-content">
              <h4>Pattern Recognition</h4>
              <p>Identify the underlying pattern and prove you understand it, not just memorize it.</p>
            </div>
          </div>
          <div className="stage-overview-item">
            <div className="stage-number">3</div>
            <div className="stage-overview-content">
              <h4>Feynman Validation</h4>
              <p>Explain your approach in plain language to verify deep understanding.</p>
            </div>
          </div>
          <div className="stage-overview-item">
            <div className="stage-number">4</div>
            <div className="stage-overview-content">
              <h4>Strategy Design</h4>
              <p>Design your solution strategy with adversarial questions to stress-test your plan.</p>
            </div>
          </div>
          <div className="stage-overview-item">
            <div className="stage-number">5</div>
            <div className="stage-overview-content">
              <h4>Coding</h4>
              <p>Implement your solution with a silent interviewer - hints available if needed.</p>
            </div>
          </div>
          <div className="stage-overview-item">
            <div className="stage-number">6</div>
            <div className="stage-overview-content">
              <h4>Reflection</h4>
              <p>Review what you learned and reinforce the pattern for long-term retention.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
