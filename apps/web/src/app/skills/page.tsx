'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const PATTERNS = [
  'SLIDING_WINDOW',
  'TWO_POINTERS',
  'PREFIX_SUM',
  'BINARY_SEARCH',
  'BFS',
  'DFS',
  'DYNAMIC_PROGRAMMING',
  'BACKTRACKING',
  'GREEDY',
  'HEAP',
  'TRIE',
  'UNION_FIND',
  'INTERVAL_MERGING',
];

const PATTERN_NAMES: Record<string, string> = {
  SLIDING_WINDOW: 'Sliding Window',
  TWO_POINTERS: 'Two Pointers',
  PREFIX_SUM: 'Prefix Sum',
  BINARY_SEARCH: 'Binary Search',
  BFS: 'BFS',
  DFS: 'DFS',
  DYNAMIC_PROGRAMMING: 'Dynamic Programming',
  BACKTRACKING: 'Backtracking',
  GREEDY: 'Greedy',
  HEAP: 'Heap',
  TRIE: 'Trie',
  UNION_FIND: 'Union Find',
  INTERVAL_MERGING: 'Interval Merging',
};

const RUNG_NAMES = ['Foundation', 'Reinforcement', 'Application', 'Integration', 'Mastery'];

interface SkillState {
  pattern: string;
  rung: number;
  score: number;
  attemptsCount: number;
}

interface RecommendedNext {
  pattern: string;
  rung: number;
  reason: string;
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillState[]>([]);
  const [recommended, setRecommended] = useState<RecommendedNext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSkills();
  }, []);

  async function fetchSkills() {
    try {
      const res = await fetch('/api/skills');
      const data = await res.json();
      if (data.skills) {
        setSkills(data.skills);
      }
      if (data.recommendedNext) {
        setRecommended(data.recommendedNext);
      }
    } catch (err) {
      // Skills fetch failed
    } finally {
      setLoading(false);
    }
  }

  function getSkillState(pattern: string, rung: number): { status: 'locked' | 'unlocked' | 'mastered'; score: number | null; attempts: number } {
    const skill = skills.find(s => s.pattern === pattern && s.rung === rung);

    if (!skill) {
      // Check if previous rung is mastered
      if (rung === 1) {
        return { status: 'unlocked', score: null, attempts: 0 };
      }
      const prevSkill = skills.find(s => s.pattern === pattern && s.rung === rung - 1);
      if (prevSkill && prevSkill.score >= 0.7) {
        return { status: 'unlocked', score: null, attempts: 0 };
      }
      return { status: 'locked', score: null, attempts: 0 };
    }

    const score = Math.round(skill.score * 100);
    if (score >= 70) {
      return { status: 'mastered', score, attempts: skill.attemptsCount };
    }
    return { status: 'unlocked', score, attempts: skill.attemptsCount };
  }

  function calculateOverallProgress(): { mastered: number; total: number; percentage: number } {
    const total = PATTERNS.length * 5; // 13 patterns x 5 rungs
    const mastered = skills.filter(s => s.score >= 0.7).length;
    return {
      mastered,
      total,
      percentage: Math.round((mastered / total) * 100)
    };
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem' }}>Loading skills...</p>
      </div>
    );
  }

  const progress = calculateOverallProgress();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Skills Matrix</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Track your mastery across all patterns and difficulty levels
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem 2rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: '600', color: 'var(--accent)' }}>
            {progress.percentage}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {progress.mastered}/{progress.total} mastered
          </div>
        </div>
      </div>

      {recommended && (
        <Link
          href={`/explorer?pattern=${recommended.pattern}&rung=${recommended.rung}`}
          className="card"
          style={{
            display: 'block',
            marginBottom: '2rem',
            background: 'rgba(59, 130, 246, 0.1)',
            borderColor: 'rgba(59, 130, 246, 0.3)',
            textDecoration: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 8.5l-5 3a.5.5 0 0 1-.75-.43V5a.5.5 0 0 1 .75-.43l5 3a.5.5 0 0 1 0 .86z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                Recommended Next: {PATTERN_NAMES[recommended.pattern]} - Rung {recommended.rung}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {recommended.reason}
              </div>
            </div>
          </div>
        </Link>
      )}

      <div className="card">
        {/* Header row */}
        <div className="skill-row" style={{ marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <div style={{ fontWeight: '500', color: 'var(--text-muted)' }}>Pattern</div>
          {[1, 2, 3, 4, 5].map(rung => (
            <div key={rung} style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <div>Rung {rung}</div>
              <div>{RUNG_NAMES[rung - 1]}</div>
            </div>
          ))}
        </div>

        {/* Pattern rows */}
        <div className="skill-matrix">
          {PATTERNS.map(pattern => (
            <div key={pattern} className="skill-row">
              <div className="skill-pattern-name">{PATTERN_NAMES[pattern]}</div>
              {[1, 2, 3, 4, 5].map(rung => {
                const state = getSkillState(pattern, rung);
                return (
                  <div
                    key={rung}
                    className={`skill-rung ${state.status}`}
                    title={state.score !== null ? `${state.score}% (${state.attempts} attempts)` : state.status}
                  >
                    {state.status === 'locked' ? (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.5 5V4.5a3.5 3.5 0 1 0-7 0V5H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1.5zM6 4.5a2 2 0 1 1 4 0V5H6V4.5z"/>
                      </svg>
                    ) : state.score !== null ? (
                      `${state.score}%`
                    ) : (
                      '-'
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <Link href="/practice" className="btn btn-primary">
          Continue Practice
        </Link>
        <Link href="/explorer" className="btn btn-secondary">
          Explore Patterns
        </Link>
      </div>
    </div>
  );
}
