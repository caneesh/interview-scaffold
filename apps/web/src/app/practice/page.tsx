'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Badge, Button } from '@/components/ui';

interface Problem {
  id: string;
  title: string;
  pattern: string;
  rung: number;
  statement: string;
  targetComplexity?: string;
  hasHints: boolean;
  testCaseCount: number;
}

interface RecommendedNext {
  pattern: string;
  rung: number;
  reason: string;
}

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

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Foundation',
  2: 'Reinforcement',
  3: 'Application',
  4: 'Integration',
  5: 'Mastery',
};

const DIFFICULTY_COLORS: Record<number, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  1: 'success',
  2: 'info',
  3: 'warning',
  4: 'error',
  5: 'error',
};

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function StarIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function PracticePage() {
  const router = useRouter();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [recommended, setRecommended] = useState<RecommendedNext | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPattern, setSelectedPattern] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);

  useEffect(() => {
    fetchProblems();
    fetchSkillInfo();
  }, []);

  async function fetchProblems() {
    try {
      const res = await fetch('/api/problems/list');
      const data = await res.json();

      if (data.error) {
        setError(data.error.message);
      } else {
        setProblems(data.problems || []);
      }
    } catch (err) {
      setError('Failed to fetch problems');
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

  async function startAttempt(problemId: string) {
    setStarting(problemId);
    try {
      const res = await fetch('/api/attempts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error.message);
        setStarting(null);
      } else {
        router.push(`/practice/${data.attempt.id}`);
      }
    } catch (err) {
      setError('Failed to start attempt');
      setStarting(null);
    }
  }

  const filteredProblems = useMemo(() => {
    return problems.filter(problem => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = problem.title.toLowerCase().includes(query);
        const matchesPattern = PATTERN_NAMES[problem.pattern]?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesPattern) {
          return false;
        }
      }

      // Pattern filter
      if (selectedPattern && problem.pattern !== selectedPattern) {
        return false;
      }

      // Difficulty filter
      if (selectedDifficulty !== null && problem.rung !== selectedDifficulty) {
        return false;
      }

      return true;
    });
  }, [problems, searchQuery, selectedPattern, selectedDifficulty]);

  // Group problems by pattern for display
  const problemsByPattern = useMemo(() => {
    const grouped: Record<string, Problem[]> = {};
    filteredProblems.forEach(problem => {
      if (!grouped[problem.pattern]) {
        grouped[problem.pattern] = [];
      }
      grouped[problem.pattern]!.push(problem);
    });
    return grouped;
  }, [filteredProblems]);

  const recommendedProblem = useMemo(() => {
    if (!recommended) return null;
    return problems.find(p => p.pattern === recommended.pattern && p.rung === recommended.rung);
  }, [problems, recommended]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedPattern('');
    setSelectedDifficulty(null);
  };

  const hasActiveFilters = searchQuery || selectedPattern || selectedDifficulty !== null;

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem' }}>Loading problems...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <h3>Something went wrong</h3>
        <p>{error}</p>
        <Button
          variant="primary"
          onClick={() => { setError(null); setLoading(true); fetchProblems(); }}
          style={{ marginTop: '1rem' }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="question-bank">
      {/* Header */}
      <div className="question-bank-header">
        <div>
          <h1 className="question-bank-title">Question Bank</h1>
          <p className="question-bank-subtitle">
            {problems.length} problems across {PATTERNS.length} patterns
          </p>
        </div>
      </div>

      {/* Recommended Next */}
      {recommendedProblem && (
        <Card className="question-bank-recommended">
          <Card.Body>
            <div className="recommended-card">
              <div className="recommended-content">
                <div className="recommended-badge">
                  <StarIcon filled />
                  <span>Recommended for you</span>
                </div>
                <h3 className="recommended-title">{recommendedProblem.title}</h3>
                <p className="recommended-reason">{recommended?.reason}</p>
                <div className="recommended-meta">
                  <Badge variant="info">{PATTERN_NAMES[recommendedProblem.pattern]}</Badge>
                  <Badge variant={DIFFICULTY_COLORS[recommendedProblem.rung]}>{DIFFICULTY_LABELS[recommendedProblem.rung]}</Badge>
                </div>
              </div>
              <Button
                variant="primary"
                leftIcon={<PlayIcon />}
                onClick={() => startAttempt(recommendedProblem.id)}
                loading={starting === recommendedProblem.id}
              >
                Start Now
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Filters */}
      <Card className="question-bank-filters">
        <Card.Body>
          <div className="filters-row">
            <div className="filter-search">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search problems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="filter-search-input"
              />
            </div>

            <div className="filter-select">
              <FilterIcon />
              <select
                value={selectedPattern}
                onChange={(e) => setSelectedPattern(e.target.value)}
                className="filter-select-input"
              >
                <option value="">All Patterns</option>
                {PATTERNS.map(pattern => (
                  <option key={pattern} value={pattern}>
                    {PATTERN_NAMES[pattern]}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-select">
              <select
                value={selectedDifficulty ?? ''}
                onChange={(e) => setSelectedDifficulty(e.target.value ? Number(e.target.value) : null)}
                className="filter-select-input"
              >
                <option value="">All Difficulties</option>
                {[1, 2, 3, 4, 5].map(rung => (
                  <option key={rung} value={rung}>
                    Rung {rung}: {DIFFICULTY_LABELS[rung]}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>

          <div className="filters-summary">
            <span>{filteredProblems.length} problem{filteredProblems.length !== 1 ? 's' : ''} found</span>
          </div>
        </Card.Body>
      </Card>

      {/* Problems Grid */}
      {filteredProblems.length === 0 ? (
        <div className="empty-state">
          <h3>No problems found</h3>
          <p>Try adjusting your filters or search query.</p>
          {hasActiveFilters && (
            <Button variant="secondary" onClick={clearFilters} style={{ marginTop: '1rem' }}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="question-bank-grid">
          {filteredProblems.map(problem => (
            <Card
              key={problem.id}
              hoverable
              clickable
              className="problem-card"
              onClick={() => startAttempt(problem.id)}
            >
              <Card.Body>
                <div className="problem-card-header">
                  <h3 className="problem-card-title">{problem.title}</h3>
                  {starting === problem.id && (
                    <div className="spinner" style={{ width: '16px', height: '16px' }} />
                  )}
                </div>
                <p className="problem-card-statement">
                  {problem.statement.length > 120
                    ? problem.statement.substring(0, 120) + '...'
                    : problem.statement}
                </p>
                <div className="problem-card-footer">
                  <div className="problem-card-tags">
                    <Badge variant="default" size="sm">
                      {PATTERN_NAMES[problem.pattern]}
                    </Badge>
                    <Badge variant={DIFFICULTY_COLORS[problem.rung]} size="sm">
                      {DIFFICULTY_LABELS[problem.rung]}
                    </Badge>
                  </div>
                  <div className="problem-card-meta">
                    <span className="problem-card-tests">{problem.testCaseCount} tests</span>
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
