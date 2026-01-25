'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';

interface SkillState {
  pattern: string;
  rung: number;
  score: number;
  attemptsCount: number;
}

interface RecentActivity {
  type: 'practice' | 'debug' | 'coach';
  title: string;
  pattern?: string;
  score?: number;
  timestamp: string;
}

interface ProgressSummary {
  totalProblems: number;
  completedProblems: number;
  totalPatterns: number;
  masteredPatterns: number;
  currentStreak: number;
  recommendedNext?: {
    pattern: string;
    rung: number;
    reason: string;
  };
}

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

// Mock recent activity for demo
const MOCK_ACTIVITY: RecentActivity[] = [
  { type: 'practice', title: 'Max Sum Subarray', pattern: 'SLIDING_WINDOW', score: 85, timestamp: '2 hours ago' },
  { type: 'debug', title: 'Race Condition Fix', score: 92, timestamp: '1 day ago' },
  { type: 'coach', title: 'Two Pointers Strategy', pattern: 'TWO_POINTERS', timestamp: '2 days ago' },
];

function CodeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 18L22 12L16 6M8 6L2 12L8 18" />
    </svg>
  );
}

function BugIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 2L8.5 5M16 2L15.5 5M3 10H6M18 10H21M3 14H6M18 14H21M8 22L8.5 19M16 22L15.5 19" />
      <ellipse cx="12" cy="12" rx="6" ry="7" />
      <path d="M12 5V19M7 12H17" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" />
    </svg>
  );
}

function TrendingUpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
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

function ZapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export default function HomePage() {
  const [skills, setSkills] = useState<SkillState[]>([]);
  const [progress, setProgress] = useState<ProgressSummary>({
    totalProblems: 65,
    completedProblems: 12,
    totalPatterns: 13,
    masteredPatterns: 2,
    currentStreak: 3,
  });
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
        // Calculate progress from skills
        const mastered = data.skills.filter((s: SkillState) => s.score >= 0.7).length;
        const uniquePatterns = new Set(data.skills.map((s: SkillState) => s.pattern)).size;
        setProgress(prev => ({
          ...prev,
          masteredPatterns: mastered,
          totalPatterns: Math.max(uniquePatterns, 13),
          completedProblems: data.skills.reduce((acc: number, s: SkillState) => acc + s.attemptsCount, 0),
        }));
        if (data.recommendedNext) {
          setProgress(prev => ({ ...prev, recommendedNext: data.recommendedNext }));
        }
      }
    } catch (err) {
      // Skills fetch failed, use defaults
    } finally {
      setLoading(false);
    }
  }

  const progressPercent = Math.round((progress.completedProblems / progress.totalProblems) * 100);

  return (
    <div className="dashboard">
      {/* Welcome Section */}
      <section className="dashboard-welcome">
        <div className="dashboard-welcome-content">
          <h1 className="dashboard-welcome-title">Welcome back</h1>
          <p className="dashboard-welcome-subtitle">
            Continue your pattern-first interview preparation journey.
          </p>
        </div>
        <div className="dashboard-streak">
          <ZapIcon />
          <span className="dashboard-streak-count">{progress.currentStreak}</span>
          <span className="dashboard-streak-label">day streak</span>
        </div>
      </section>

      {/* Progress Summary */}
      <section className="dashboard-progress">
        <Card>
          <Card.Body>
            <div className="dashboard-progress-grid">
              <div className="dashboard-stat">
                <div className="dashboard-stat-icon">
                  <TargetIcon />
                </div>
                <div className="dashboard-stat-content">
                  <span className="dashboard-stat-value">{progress.completedProblems}</span>
                  <span className="dashboard-stat-label">Problems Solved</span>
                </div>
              </div>
              <div className="dashboard-stat">
                <div className="dashboard-stat-icon dashboard-stat-icon--success">
                  <TrendingUpIcon />
                </div>
                <div className="dashboard-stat-content">
                  <span className="dashboard-stat-value">{progress.masteredPatterns}</span>
                  <span className="dashboard-stat-label">Patterns Mastered</span>
                </div>
              </div>
              <div className="dashboard-stat">
                <div className="dashboard-stat-icon dashboard-stat-icon--info">
                  <CalendarIcon />
                </div>
                <div className="dashboard-stat-content">
                  <span className="dashboard-stat-value">{progressPercent}%</span>
                  <span className="dashboard-stat-label">Overall Progress</span>
                </div>
              </div>
            </div>
            {progress.recommendedNext && (
              <div className="dashboard-recommendation">
                <span className="dashboard-recommendation-label">Recommended Next:</span>
                <Link href="/practice" className="dashboard-recommendation-link">
                  {PATTERN_NAMES[progress.recommendedNext.pattern] || progress.recommendedNext.pattern} - Rung {progress.recommendedNext.rung}
                  <ChevronRightIcon />
                </Link>
              </div>
            )}
          </Card.Body>
        </Card>
      </section>

      {/* Quick Actions */}
      <section className="dashboard-actions">
        <h2 className="dashboard-section-title">Quick Actions</h2>
        <div className="dashboard-actions-grid">
          <Link href="/practice" className="dashboard-action-card dashboard-action-card--primary">
            <div className="dashboard-action-icon">
              <CodeIcon />
            </div>
            <div className="dashboard-action-content">
              <h3 className="dashboard-action-title">Practice</h3>
              <p className="dashboard-action-desc">
                Guided problem solving with pattern discovery and Socratic coaching.
              </p>
            </div>
            <div className="dashboard-action-tags">
              <Badge variant="info" size="sm">Guided</Badge>
              <Badge variant="default" size="sm">Adaptive</Badge>
            </div>
          </Link>

          <Link href="/debug" className="dashboard-action-card">
            <div className="dashboard-action-icon dashboard-action-icon--warning">
              <BugIcon />
            </div>
            <div className="dashboard-action-content">
              <h3 className="dashboard-action-title">Debug Lab</h3>
              <p className="dashboard-action-desc">
                Practice debugging real-world scenarios with triage assessment.
              </p>
            </div>
            <div className="dashboard-action-tags">
              <Badge variant="warning" size="sm">Multi-file</Badge>
              <Badge variant="default" size="sm">Realistic</Badge>
            </div>
          </Link>

          <Link href="/coach" className="dashboard-action-card">
            <div className="dashboard-action-icon dashboard-action-icon--success">
              <ChatIcon />
            </div>
            <div className="dashboard-action-content">
              <h3 className="dashboard-action-title">AI Coach</h3>
              <p className="dashboard-action-desc">
                Get personalized guidance and explanations from your AI tutor.
              </p>
            </div>
            <div className="dashboard-action-tags">
              <Badge variant="success" size="sm">Interactive</Badge>
              <Badge variant="default" size="sm">Personalized</Badge>
            </div>
          </Link>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="dashboard-activity">
        <div className="dashboard-section-header">
          <h2 className="dashboard-section-title">Recent Activity</h2>
          <Link href="/skills" className="dashboard-section-link">
            View all <ChevronRightIcon />
          </Link>
        </div>
        <Card>
          <Card.Body padding="none">
            <div className="dashboard-activity-list">
              {MOCK_ACTIVITY.map((activity, index) => (
                <div key={index} className="dashboard-activity-item">
                  <div className={`dashboard-activity-icon dashboard-activity-icon--${activity.type}`}>
                    {activity.type === 'practice' && <CodeIcon />}
                    {activity.type === 'debug' && <BugIcon />}
                    {activity.type === 'coach' && <ChatIcon />}
                  </div>
                  <div className="dashboard-activity-content">
                    <span className="dashboard-activity-title">{activity.title}</span>
                    <span className="dashboard-activity-meta">
                      {activity.pattern && PATTERN_NAMES[activity.pattern]}
                      {activity.pattern && activity.score && ' - '}
                      {activity.score && `${activity.score}%`}
                    </span>
                  </div>
                  <span className="dashboard-activity-time">{activity.timestamp}</span>
                </div>
              ))}
              {MOCK_ACTIVITY.length === 0 && (
                <div className="dashboard-activity-empty">
                  <p>No recent activity. Start practicing to see your progress here.</p>
                </div>
              )}
            </div>
          </Card.Body>
        </Card>
      </section>

      {/* How It Works */}
      <section className="dashboard-howto">
        <h2 className="dashboard-section-title">How It Works</h2>
        <div className="dashboard-howto-grid">
          <Card hoverable>
            <Card.Body>
              <div className="dashboard-howto-step">
                <span className="dashboard-howto-number">1</span>
                <h3>Approach</h3>
                <p>Identify the pattern before writing code. State the invariant that guides your solution.</p>
              </div>
            </Card.Body>
          </Card>
          <Card hoverable>
            <Card.Body>
              <div className="dashboard-howto-step">
                <span className="dashboard-howto-number">2</span>
                <h3>Implement</h3>
                <p>Write your solution with the pattern in mind. Submit code and see test results instantly.</p>
              </div>
            </Card.Body>
          </Card>
          <Card hoverable>
            <Card.Body>
              <div className="dashboard-howto-step">
                <span className="dashboard-howto-number">3</span>
                <h3>Reflect</h3>
                <p>Learn from mistakes through guided reflection. Unlock micro-lessons when needed.</p>
              </div>
            </Card.Body>
          </Card>
        </div>
      </section>
    </div>
  );
}
