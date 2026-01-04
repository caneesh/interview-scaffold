'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PATTERNS = [
  { id: 'SLIDING_WINDOW', name: 'Sliding Window', desc: 'Maintain a window over a contiguous sequence', prereqs: [] },
  { id: 'TWO_POINTERS', name: 'Two Pointers', desc: 'Use two pointers to traverse from different positions', prereqs: [] },
  { id: 'PREFIX_SUM', name: 'Prefix Sum', desc: 'Precompute cumulative sums for range queries', prereqs: [] },
  { id: 'BINARY_SEARCH', name: 'Binary Search', desc: 'Divide search space in half each iteration', prereqs: [] },
  { id: 'BFS', name: 'Breadth-First Search', desc: 'Explore neighbors level by level', prereqs: [] },
  { id: 'DFS', name: 'Depth-First Search', desc: 'Explore as deep as possible before backtracking', prereqs: [] },
  { id: 'DYNAMIC_PROGRAMMING', name: 'Dynamic Programming', desc: 'Break problem into overlapping subproblems', prereqs: [] },
  { id: 'BACKTRACKING', name: 'Backtracking', desc: 'Build candidates and abandon invalid paths', prereqs: ['DFS'] },
  { id: 'GREEDY', name: 'Greedy', desc: 'Make locally optimal choices', prereqs: [] },
  { id: 'HEAP', name: 'Heap / Priority Queue', desc: 'Efficiently track min/max elements', prereqs: [] },
  { id: 'TRIE', name: 'Trie', desc: 'Prefix tree for string operations', prereqs: [] },
  { id: 'UNION_FIND', name: 'Union Find', desc: 'Track connected components with path compression', prereqs: [] },
  { id: 'INTERVAL_MERGING', name: 'Interval Merging', desc: 'Sort and merge overlapping intervals', prereqs: [] },
];

const RUNG_NAMES = ['Foundation', 'Reinforcement', 'Application', 'Integration', 'Mastery'];

interface UnlockedRung {
  pattern: string;
  rung: number;
  score: number;
}

interface Problem {
  id: string;
  title: string;
  pattern: string;
  rung: number;
  statement: string;
}

export default function ExplorerPage() {
  const router = useRouter();
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [selectedRung, setSelectedRung] = useState<number>(1);
  const [unlockedRungs, setUnlockedRungs] = useState<UnlockedRung[]>([]);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchSkills();
  }, []);

  useEffect(() => {
    if (selectedPattern && selectedRung) {
      fetchProblem();
    }
  }, [selectedPattern, selectedRung]);

  async function fetchSkills() {
    try {
      const res = await fetch('/api/skills');
      const data = await res.json();
      if (data.unlockedRungs) {
        setUnlockedRungs(data.unlockedRungs);
      }
    } catch (err) {
      // Skills are optional
    }
  }

  async function fetchProblem() {
    setLoading(true);
    setProblem(null);
    try {
      const res = await fetch(`/api/problems/next?pattern=${selectedPattern}&rung=${selectedRung}`);
      const data = await res.json();
      if (data.problem) {
        setProblem(data.problem);
      }
    } catch (err) {
      // Problem fetch failed
    } finally {
      setLoading(false);
    }
  }

  function isRungUnlocked(pattern: string, rung: number): boolean {
    // Rung 1 is always unlocked
    if (rung === 1) return true;
    // Check if user has unlocked this rung
    return unlockedRungs.some(ur => ur.pattern === pattern && ur.rung === rung);
  }

  function getRungScore(pattern: string, rung: number): number | null {
    const found = unlockedRungs.find(ur => ur.pattern === pattern && ur.rung === rung);
    return found ? Math.round(found.score * 100) : null;
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

      if (!data.error) {
        router.push(`/practice/${data.attempt.id}`);
      }
    } catch (err) {
      // Start failed
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem' }}>Explorer Mode</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Choose a pattern and difficulty level to practice
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Pattern Selection */}
        <div>
          <h3 style={{ marginBottom: '1rem' }}>Select Pattern</h3>
          <div className="pattern-grid" style={{ gridTemplateColumns: '1fr' }}>
            {PATTERNS.map((pattern) => (
              <div
                key={pattern.id}
                className={`pattern-card ${selectedPattern === pattern.id ? 'selected' : ''}`}
                onClick={() => { setSelectedPattern(pattern.id); setSelectedRung(1); }}
              >
                <div className="pattern-name">{pattern.name}</div>
                <div className="pattern-desc">{pattern.desc}</div>
                {pattern.prereqs.length > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Requires: {pattern.prereqs.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Rung Selection and Problem Preview */}
        <div>
          {selectedPattern ? (
            <>
              <h3 style={{ marginBottom: '1rem' }}>
                {PATTERNS.find(p => p.id === selectedPattern)?.name} - Select Rung
              </h3>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5].map((rung) => {
                  const unlocked = isRungUnlocked(selectedPattern, rung);
                  const score = getRungScore(selectedPattern, rung);

                  return (
                    <button
                      key={rung}
                      className={`btn ${selectedRung === rung ? 'btn-primary' : 'btn-secondary'}`}
                      style={{
                        opacity: unlocked ? 1 : 0.5,
                        cursor: unlocked ? 'pointer' : 'not-allowed',
                        flex: '1',
                        minWidth: '80px'
                      }}
                      onClick={() => unlocked && setSelectedRung(rung)}
                      disabled={!unlocked}
                    >
                      <div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Rung {rung}</div>
                        <div style={{ fontSize: '0.875rem' }}>{RUNG_NAMES[rung - 1]}</div>
                        {score !== null && (
                          <div style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>
                            {score}%
                          </div>
                        )}
                        {!unlocked && (
                          <div style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>
                            Locked
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Problem Preview */}
              {loading ? (
                <div className="card">
                  <div className="loading-state" style={{ padding: '2rem' }}>
                    <div className="spinner"></div>
                    <p style={{ marginTop: '0.5rem' }}>Finding problem...</p>
                  </div>
                </div>
              ) : problem ? (
                <div className="card">
                  <h4 style={{ marginBottom: '0.5rem' }}>{problem.title}</h4>
                  <div className="problem-meta" style={{ marginBottom: '1rem' }}>
                    <span className="problem-tag">Rung {problem.rung}</span>
                    <span className="problem-tag">{RUNG_NAMES[problem.rung - 1]}</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                    {problem.statement.substring(0, 200)}...
                  </p>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.75rem' }}
                    onClick={startAttempt}
                    disabled={starting}
                  >
                    {starting ? 'Starting...' : 'Start This Problem'}
                  </button>
                </div>
              ) : (
                <div className="card empty-state">
                  <h4>No problems available</h4>
                  <p>There are no problems for this pattern and rung yet.</p>
                </div>
              )}
            </>
          ) : (
            <div className="card empty-state" style={{ marginTop: '2.5rem' }}>
              <h4>Select a Pattern</h4>
              <p>Choose a pattern from the left to see available problems</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
