'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, Badge, Button } from '@/components/ui';

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

const PATTERN_DESCRIPTIONS: Record<string, string> = {
  SLIDING_WINDOW: 'Process sequential data with a moving window',
  TWO_POINTERS: 'Traverse arrays from both ends or different speeds',
  PREFIX_SUM: 'Precompute cumulative sums for range queries',
  BINARY_SEARCH: 'Divide and conquer for sorted data',
  BFS: 'Level-order traversal for shortest paths',
  DFS: 'Deep exploration for exhaustive search',
  DYNAMIC_PROGRAMMING: 'Optimal substructure and memoization',
  BACKTRACKING: 'Build solutions incrementally with pruning',
  GREEDY: 'Make locally optimal choices',
  HEAP: 'Priority-based data access',
  TRIE: 'Prefix-based string operations',
  UNION_FIND: 'Disjoint set operations',
  INTERVAL_MERGING: 'Combine overlapping intervals',
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

function ChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillState[]>([]);
  const [recommended, setRecommended] = useState<RecommendedNext | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'matrix'>('grid');

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

  function getPatternProgress(pattern: string): {
    currentRung: number;
    maxScore: number;
    totalAttempts: number;
    status: 'not_started' | 'in_progress' | 'mastered';
  } {
    const patternSkills = skills.filter(s => s.pattern === pattern);
    if (patternSkills.length === 0) {
      return { currentRung: 0, maxScore: 0, totalAttempts: 0, status: 'not_started' };
    }

    const maxRung = Math.max(...patternSkills.map(s => s.rung));
    const maxScore = Math.max(...patternSkills.map(s => s.score));
    const totalAttempts = patternSkills.reduce((sum, s) => sum + s.attemptsCount, 0);

    // Check if mastered (rung 5 with 70%+ score)
    const masteredRung5 = patternSkills.find(s => s.rung === 5 && s.score >= 0.7);

    return {
      currentRung: maxRung,
      maxScore: Math.round(maxScore * 100),
      totalAttempts,
      status: masteredRung5 ? 'mastered' : maxRung > 0 ? 'in_progress' : 'not_started',
    };
  }

  function getRungStatus(pattern: string, rung: number): {
    status: 'locked' | 'unlocked' | 'in_progress' | 'mastered';
    score: number | null;
    attempts: number;
  } {
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
    return { status: 'in_progress', score, attempts: skill.attemptsCount };
  }

  const overallProgress = useMemo(() => {
    const total = PATTERNS.length * 5;
    const mastered = skills.filter(s => s.score >= 0.7).length;
    const inProgress = skills.filter(s => s.score < 0.7).length;
    return {
      mastered,
      inProgress,
      total,
      percentage: Math.round((mastered / total) * 100),
    };
  }, [skills]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem' }}>Loading skills...</p>
      </div>
    );
  }

  return (
    <div className="skills-page">
      {/* Header */}
      <div className="skills-header">
        <div className="skills-header-content">
          <h1 className="skills-title">Skills Dashboard</h1>
          <p className="skills-subtitle">
            Track your mastery across all {PATTERNS.length} patterns
          </p>
        </div>
        <div className="skills-view-toggle">
          <button
            className={`skills-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            Cards
          </button>
          <button
            className={`skills-view-btn ${viewMode === 'matrix' ? 'active' : ''}`}
            onClick={() => setViewMode('matrix')}
          >
            Matrix
          </button>
        </div>
      </div>

      {/* Overall Progress */}
      <Card className="skills-overview">
        <Card.Body>
          <div className="skills-overview-grid">
            <div className="skills-overview-stat">
              <div className="skills-overview-icon">
                <TrophyIcon />
              </div>
              <div className="skills-overview-content">
                <span className="skills-overview-value">{overallProgress.mastered}</span>
                <span className="skills-overview-label">Rungs Mastered</span>
              </div>
            </div>
            <div className="skills-overview-stat">
              <div className="skills-overview-icon skills-overview-icon--info">
                <ChartIcon />
              </div>
              <div className="skills-overview-content">
                <span className="skills-overview-value">{overallProgress.inProgress}</span>
                <span className="skills-overview-label">In Progress</span>
              </div>
            </div>
            <div className="skills-overview-stat skills-overview-stat--large">
              <div className="skills-progress-ring">
                <svg viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--bg-tertiary)"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--success)"
                    strokeWidth="3"
                    strokeDasharray={`${overallProgress.percentage}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="skills-progress-value">{overallProgress.percentage}%</span>
              </div>
              <span className="skills-overview-label">Overall Progress</span>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Recommended Next */}
      {recommended && (
        <Card className="skills-recommended">
          <Card.Body>
            <div className="skills-recommended-content">
              <div className="skills-recommended-badge">
                <StarIcon />
                <span>Recommended Next</span>
              </div>
              <h3 className="skills-recommended-title">
                {PATTERN_NAMES[recommended.pattern]} - Rung {recommended.rung}
              </h3>
              <p className="skills-recommended-reason">{recommended.reason}</p>
            </div>
            <Link href="/practice" className="btn-link">
              <Button variant="primary" leftIcon={<PlayIcon />}>
                Start Practice
              </Button>
            </Link>
          </Card.Body>
        </Card>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="skills-grid">
          {PATTERNS.map(pattern => {
            const progress = getPatternProgress(pattern);
            return (
              <Card key={pattern} hoverable className="skill-card">
                <Card.Body>
                  <div className="skill-card-header">
                    <h3 className="skill-card-title">{PATTERN_NAMES[pattern]}</h3>
                    {progress.status === 'mastered' && (
                      <Badge variant="success" size="sm">Mastered</Badge>
                    )}
                    {progress.status === 'in_progress' && (
                      <Badge variant="info" size="sm">In Progress</Badge>
                    )}
                    {progress.status === 'not_started' && (
                      <Badge variant="default" size="sm">Not Started</Badge>
                    )}
                  </div>
                  <p className="skill-card-desc">{PATTERN_DESCRIPTIONS[pattern]}</p>

                  {/* Rung Progress */}
                  <div className="skill-rungs">
                    {[1, 2, 3, 4, 5].map(rung => {
                      const rungStatus = getRungStatus(pattern, rung);
                      return (
                        <div
                          key={rung}
                          className={`skill-rung-dot skill-rung-dot--${rungStatus.status}`}
                          title={`Rung ${rung}: ${RUNG_NAMES[rung - 1]}${rungStatus.score !== null ? ` (${rungStatus.score}%)` : ''}`}
                        >
                          {rungStatus.status === 'mastered' && <CheckIcon />}
                          {rungStatus.status === 'locked' && <LockIcon />}
                          {rungStatus.status === 'in_progress' && (
                            <span className="skill-rung-score">{rungStatus.score}</span>
                          )}
                          {rungStatus.status === 'unlocked' && rung}
                        </div>
                      );
                    })}
                  </div>

                  <div className="skill-card-footer">
                    <span className="skill-card-meta">
                      {progress.totalAttempts} attempt{progress.totalAttempts !== 1 ? 's' : ''}
                    </span>
                    {progress.currentRung > 0 && (
                      <span className="skill-card-rung">
                        Rung {progress.currentRung}
                      </span>
                    )}
                  </div>
                </Card.Body>
              </Card>
            );
          })}
        </div>
      )}

      {/* Matrix View */}
      {viewMode === 'matrix' && (
        <Card className="skills-matrix-card">
          <Card.Body padding="none">
            <div className="skills-matrix">
              {/* Header row */}
              <div className="skills-matrix-header">
                <div className="skills-matrix-corner">Pattern</div>
                {[1, 2, 3, 4, 5].map(rung => (
                  <div key={rung} className="skills-matrix-col-header">
                    <span className="skills-matrix-rung-num">Rung {rung}</span>
                    <span className="skills-matrix-rung-name">{RUNG_NAMES[rung - 1]}</span>
                  </div>
                ))}
              </div>

              {/* Pattern rows */}
              {PATTERNS.map(pattern => (
                <div key={pattern} className="skills-matrix-row">
                  <div className="skills-matrix-pattern">{PATTERN_NAMES[pattern]}</div>
                  {[1, 2, 3, 4, 5].map(rung => {
                    const status = getRungStatus(pattern, rung);
                    return (
                      <div
                        key={rung}
                        className={`skills-matrix-cell skills-matrix-cell--${status.status}`}
                        title={status.score !== null ? `${status.score}% (${status.attempts} attempts)` : status.status}
                      >
                        {status.status === 'locked' ? (
                          <LockIcon />
                        ) : status.status === 'mastered' ? (
                          <CheckIcon />
                        ) : status.score !== null ? (
                          `${status.score}%`
                        ) : (
                          '-'
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Actions */}
      <div className="skills-actions">
        <Link href="/practice">
          <Button variant="primary">Continue Practice</Button>
        </Link>
        <Link href="/explorer">
          <Button variant="secondary">Explore Patterns</Button>
        </Link>
      </div>
    </div>
  );
}
