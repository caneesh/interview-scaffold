'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Problem {
  id: string;
  title: string;
  pattern: string;
  rung: number;
  statement: string;
}

interface RecommendedNext {
  pattern: string;
  rung: number;
  reason: string;
}

export default function PracticePage() {
  const router = useRouter();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [reason, setReason] = useState<string>('');
  const [recommended, setRecommended] = useState<RecommendedNext | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNextProblem();
    fetchSkillInfo();
  }, []);

  async function fetchNextProblem() {
    try {
      const res = await fetch('/api/problems/next');
      const data = await res.json();

      if (data.error) {
        setError(data.error.message);
      } else {
        setProblem(data.problem);
        setReason(data.reason);
      }
    } catch (err) {
      setError('Failed to fetch next problem');
    } finally {
      setLoading(false);
    }
  }

  async function fetchSkillInfo() {
    try {
      const res = await fetch('/api/skills');
      const data = await res.json();
      if (data.recommendedNext) {
        setRecommended(data.recommendedNext);
      }
    } catch (err) {
      // Skill info is optional
    }
  }

  async function startAttempt() {
    if (!problem) return;

    setStarting(true);
    try {
      const res = await fetch('/api/attempts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId: problem.id }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error.message);
        setStarting(false);
      } else {
        router.push(`/practice/${data.attempt.id}`);
      }
    } catch (err) {
      setError('Failed to start attempt');
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem' }}>Finding your next problem...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <h3>Something went wrong</h3>
        <p>{error}</p>
        <button
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
          onClick={() => { setError(null); setLoading(true); fetchNextProblem(); }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="empty-state">
        <h3>No problems available</h3>
        <p>Check back later for new problems, or explore patterns in Explorer mode.</p>
        <a href="/explorer" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Explore Patterns
        </a>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem' }}>Practice</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{reason}</p>

      {recommended && (
        <div
          className="card"
          style={{
            marginBottom: '1.5rem',
            background: 'rgba(59, 130, 246, 0.1)',
            borderColor: 'rgba(59, 130, 246, 0.3)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ color: 'var(--accent)', fontWeight: '500' }}>Recommended</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {recommended.pattern.replace(/_/g, ' ')} - Rung {recommended.rung}: {recommended.reason}
          </p>
        </div>
      )}

      <div className="card">
        <div className="problem-statement">
          <h2 className="problem-title">{problem.title}</h2>
          <div className="problem-meta">
            <span className="problem-tag">{problem.pattern.replace(/_/g, ' ')}</span>
            <span className="problem-tag">Rung {problem.rung}</span>
          </div>
          <div className="problem-body">
            {problem.statement}
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.75rem' }}
          onClick={startAttempt}
          disabled={starting}
        >
          {starting ? 'Starting...' : 'Start Problem'}
        </button>
      </div>
    </div>
  );
}
