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

type ActivityStatus = 'completed' | 'in-progress' | 'failed' | 'pending';
type ActivityType = 'practice' | 'debug' | 'coach';
type TrackFilter = 'all' | 'practice' | 'debug' | 'coach';

interface RecentActivity {
  id: string;
  type: ActivityType;
  title: string;
  pattern?: string;
  score?: number;
  status: ActivityStatus;
  timestamp: string;
  attemptId?: string;
}

interface ActiveAttempt {
  id: string;
  problemTitle: string;
  pattern: string;
  step: string;
  progress: number;
  lastActive: string;
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

// Mock recent activity with status for demo
const MOCK_ACTIVITY: RecentActivity[] = [
  { id: '1', type: 'practice', title: 'Max Sum Subarray', pattern: 'SLIDING_WINDOW', score: 85, status: 'completed', timestamp: '2 hours ago' },
  { id: '2', type: 'debug', title: 'Race Condition Fix', score: 92, status: 'completed', timestamp: '1 day ago' },
  { id: '3', type: 'practice', title: 'Binary Search Target', pattern: 'BINARY_SEARCH', status: 'in-progress', timestamp: '2 days ago', attemptId: 'attempt-123' },
  { id: '4', type: 'coach', title: 'Two Pointers Strategy', pattern: 'TWO_POINTERS', status: 'completed', timestamp: '2 days ago' },
  { id: '5', type: 'practice', title: 'Minimum Window Substring', pattern: 'SLIDING_WINDOW', status: 'failed', timestamp: '3 days ago' },
];

// Icons
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

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5C3 18 3 21 3 21C3 21 6 21 7.5 19.5C8.16667 18.8333 8.5 17.5 8.5 17.5M12 15L9 12M12 15C12 15 18.5 14 20.5 6.5C20.5 6.5 12 2 6.5 9.5C6.5 9.5 5 13.5 9 12" />
      <circle cx="17" cy="7" r="1" />
    </svg>
  );
}

// Status pill icons
function CheckCircleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function LoaderIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6V12L16 14" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// Status Pill Component
function StatusPill({ status }: { status: ActivityStatus }) {
  const statusConfig = {
    'completed': { label: 'Completed', icon: <CheckCircleIcon /> },
    'in-progress': { label: 'In Progress', icon: <LoaderIcon /> },
    'failed': { label: 'Failed', icon: <XCircleIcon /> },
    'pending': { label: 'Pending', icon: <ClockIcon /> },
  };

  const config = statusConfig[status];

  return (
    <span className={`status-pill status-pill--${status}`}>
      <span className="status-pill__icon">{config.icon}</span>
      {config.label}
    </span>
  );
}

// Score Badge Component
function ScoreBadge({ score }: { score: number }) {
  const level = score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low';
  return (
    <span className={`score-badge score-badge--${level}`}>
      {score}%
    </span>
  );
}

// Track Chip Component
function TrackChip({
  type,
  active,
  onClick,
  children
}: {
  type: TrackFilter;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const typeClass = type !== 'all' ? `track-chip--${type}` : '';
  const activeClass = active ? `track-chip--${type === 'all' ? 'active' : type}` : '';

  return (
    <button
      className={`track-chip ${typeClass} ${activeClass}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

// Continue Attempt Card Component
function ContinueAttemptCard({ attempt, onDismiss }: { attempt: ActiveAttempt; onDismiss: () => void }) {
  return (
    <Card className="continue-card">
      <Card.Body>
        <div className="continue-card__header">
          <div>
            <div className="continue-card__label">
              <PlayIcon />
              Continue where you left off
            </div>
            <h3 className="continue-card__title">{attempt.problemTitle}</h3>
            <div className="continue-card__meta">
              <span>{PATTERN_NAMES[attempt.pattern] || attempt.pattern}</span>
              <span>Step: {attempt.step}</span>
              <span>Last active: {attempt.lastActive}</span>
            </div>
          </div>
          <StatusPill status="in-progress" />
        </div>
        <div className="continue-card__progress">
          <div className="continue-card__progress-bar">
            <div
              className="continue-card__progress-fill"
              style={{ width: `${attempt.progress}%` }}
            />
          </div>
          <span>{attempt.progress}% complete</span>
        </div>
        <div className="continue-card__actions">
          <Button
            variant="primary"
            leftIcon={<PlayIcon />}
            onClick={() => window.location.href = `/practice/${attempt.id}`}
          >
            Resume
          </Button>
          <Button variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

// Empty State / Onboarding Panel Component
function OnboardingPanel() {
  return (
    <Card className="onboarding-panel">
      <Card.Body>
        <div className="onboarding-panel__header">
          <div className="onboarding-panel__icon">
            <RocketIcon />
          </div>
          <h3 className="onboarding-panel__title">Get started with your interview prep</h3>
        </div>
        <div className="onboarding-panel__steps">
          <div className="onboarding-step">
            <span className="onboarding-step__number">1</span>
            <div className="onboarding-step__content">
              <h4 className="onboarding-step__title">Start with Practice Mode</h4>
              <p className="onboarding-step__description">
                Work through problems with guided pattern discovery and Socratic coaching.
              </p>
            </div>
          </div>
          <div className="onboarding-step">
            <span className="onboarding-step__number">2</span>
            <div className="onboarding-step__content">
              <h4 className="onboarding-step__title">Identify the Pattern</h4>
              <p className="onboarding-step__description">
                Before writing code, state the pattern and invariant that guides your solution.
              </p>
            </div>
          </div>
          <div className="onboarding-step">
            <span className="onboarding-step__number">3</span>
            <div className="onboarding-step__content">
              <h4 className="onboarding-step__title">Learn from Feedback</h4>
              <p className="onboarding-step__description">
                Use AI coaching and micro-lessons to reinforce your understanding.
              </p>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 'var(--space-6)' }}>
          <Link href="/practice">
            <Button variant="primary" leftIcon={<PlayIcon />}>
              Start Your First Problem
            </Button>
          </Link>
        </div>
      </Card.Body>
    </Card>
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
  const [activeAttempt, setActiveAttempt] = useState<ActiveAttempt | null>(null);
  const [trackFilter, setTrackFilter] = useState<TrackFilter>('all');
  const [activity, setActivity] = useState<RecentActivity[]>(MOCK_ACTIVITY);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    fetchSkills();
    fetchActiveAttempt();
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
        // Show onboarding if no activity
        if (data.skills.length === 0) {
          setShowOnboarding(true);
        }
      }
    } catch (err) {
      // Skills fetch failed, use defaults
    } finally {
      setLoading(false);
    }
  }

  async function fetchActiveAttempt() {
    try {
      const res = await fetch('/api/attempts/active');
      if (res.ok) {
        const data = await res.json();
        if (data.attempt) {
          setActiveAttempt(data.attempt);
        }
      }
    } catch (err) {
      // No active attempt or fetch failed - gracefully degrade
    }
  }

  function dismissActiveAttempt() {
    setActiveAttempt(null);
  }

  const progressPercent = Math.round((progress.completedProblems / progress.totalProblems) * 100);

  // Filter activity based on track selection
  const filteredActivity = trackFilter === 'all'
    ? activity
    : activity.filter(a => a.type === trackFilter);

  // Filter action cards based on track (show all if 'all', otherwise show matching + coach for practice)
  const showActionCard = (type: ActivityType) => {
    if (trackFilter === 'all') return true;
    if (trackFilter === type) return true;
    return false;
  };

  // Check if we should show onboarding (no completed activity)
  const hasActivity = activity.length > 0;

  return (
    <div className="dashboard">
      {/* Welcome Section */}
      <section className="dashboard-welcome">
        <div className="dashboard-welcome-content">
          <h1 className="dashboard-welcome-title page-title">Welcome back</h1>
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

      {/* Continue Attempt Card */}
      {activeAttempt && (
        <section>
          <ContinueAttemptCard
            attempt={activeAttempt}
            onDismiss={dismissActiveAttempt}
          />
        </section>
      )}

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

      {/* Track Switcher */}
      <section>
        <div className="track-switcher">
          <TrackChip
            type="all"
            active={trackFilter === 'all'}
            onClick={() => setTrackFilter('all')}
          >
            All
          </TrackChip>
          <TrackChip
            type="practice"
            active={trackFilter === 'practice'}
            onClick={() => setTrackFilter('practice')}
          >
            <CodeIcon />
            Practice
          </TrackChip>
          <TrackChip
            type="debug"
            active={trackFilter === 'debug'}
            onClick={() => setTrackFilter('debug')}
          >
            <BugIcon />
            Debug
          </TrackChip>
          <TrackChip
            type="coach"
            active={trackFilter === 'coach'}
            onClick={() => setTrackFilter('coach')}
          >
            <ChatIcon />
            Coach
          </TrackChip>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="dashboard-actions">
        <h2 className="dashboard-section-title section-title">Quick Actions</h2>
        <div className="dashboard-actions-grid">
          {showActionCard('practice') && (
            <div className="dashboard-action-card dashboard-action-card--primary card-interactive">
              <div className="dashboard-action-icon">
                <CodeIcon />
              </div>
              <div className="dashboard-action-content">
                <h3 className="dashboard-action-title card-title">Practice</h3>
                <p className="dashboard-action-desc">
                  Guided problem solving with pattern discovery and Socratic coaching.
                </p>
              </div>
              <div className="dashboard-action-tags">
                <Badge variant="info" size="sm">Guided</Badge>
                <Badge variant="default" size="sm">Adaptive</Badge>
              </div>
              <Link href="/practice">
                <Button variant="primary" size="sm">
                  Start Practice
                </Button>
              </Link>
            </div>
          )}

          {showActionCard('debug') && (
            <div className="dashboard-action-card card-interactive">
              <div className="dashboard-action-icon dashboard-action-icon--warning">
                <BugIcon />
              </div>
              <div className="dashboard-action-content">
                <h3 className="dashboard-action-title card-title">Debug Lab</h3>
                <p className="dashboard-action-desc">
                  Practice debugging real-world scenarios with triage assessment.
                </p>
              </div>
              <div className="dashboard-action-tags">
                <Badge variant="warning" size="sm">Multi-file</Badge>
                <Badge variant="default" size="sm">Realistic</Badge>
              </div>
              <Link href="/debug">
                <Button variant="secondary" size="sm">
                  Enter Lab
                </Button>
              </Link>
            </div>
          )}

          {showActionCard('coach') && (
            <div className="dashboard-action-card card-interactive">
              <div className="dashboard-action-icon dashboard-action-icon--success">
                <ChatIcon />
              </div>
              <div className="dashboard-action-content">
                <h3 className="dashboard-action-title card-title">AI Coach</h3>
                <p className="dashboard-action-desc">
                  Get personalized guidance and explanations from your AI tutor.
                </p>
              </div>
              <div className="dashboard-action-tags">
                <Badge variant="success" size="sm">Interactive</Badge>
                <Badge variant="default" size="sm">Personalized</Badge>
              </div>
              <Link href="/coach">
                <Button variant="secondary" size="sm">
                  Start Session
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="dashboard-activity">
        <div className="dashboard-section-header">
          <h2 className="dashboard-section-title section-title">Recent Activity</h2>
          <Link href="/skills" className="dashboard-section-link">
            View all <ChevronRightIcon />
          </Link>
        </div>

        {!hasActivity || showOnboarding ? (
          <OnboardingPanel />
        ) : (
          <Card>
            <Card.Body padding="none">
              <div className="dashboard-activity-list">
                {filteredActivity.length > 0 ? (
                  filteredActivity.map((activityItem) => (
                    <div
                      key={activityItem.id}
                      className={`dashboard-activity-item ${activityItem.status === 'in-progress' ? 'dashboard-activity-item--interactive' : ''}`}
                    >
                      <div className={`dashboard-activity-icon dashboard-activity-icon--${activityItem.type}`}>
                        {activityItem.type === 'practice' && <CodeIcon />}
                        {activityItem.type === 'debug' && <BugIcon />}
                        {activityItem.type === 'coach' && <ChatIcon />}
                      </div>
                      <div className="dashboard-activity-content">
                        <span className="dashboard-activity-title">{activityItem.title}</span>
                        <span className="dashboard-activity-meta">
                          {activityItem.pattern && PATTERN_NAMES[activityItem.pattern]}
                        </span>
                      </div>
                      <div className="activity-status">
                        {activityItem.score !== undefined && (
                          <ScoreBadge score={activityItem.score} />
                        )}
                        <StatusPill status={activityItem.status} />
                        {activityItem.status === 'in-progress' && activityItem.attemptId && (
                          <Link
                            href={`/practice/${activityItem.attemptId}`}
                            className="activity-resume-btn"
                          >
                            <Button variant="ghost" size="sm">
                              Resume
                            </Button>
                          </Link>
                        )}
                      </div>
                      <span className="dashboard-activity-time">{activityItem.timestamp}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-state__icon">
                      {trackFilter === 'practice' && <CodeIcon />}
                      {trackFilter === 'debug' && <BugIcon />}
                      {trackFilter === 'coach' && <ChatIcon />}
                    </div>
                    <h3 className="empty-state__title">No {trackFilter} activity yet</h3>
                    <p className="empty-state__description">
                      {trackFilter === 'practice' && 'Start solving problems to see your practice history here.'}
                      {trackFilter === 'debug' && 'Complete debug scenarios to see your debugging history here.'}
                      {trackFilter === 'coach' && 'Start a coaching session to see your coaching history here.'}
                    </p>
                    <div className="empty-state__actions">
                      <Link href={trackFilter === 'practice' ? '/practice' : trackFilter === 'debug' ? '/debug' : '/coach'}>
                        <Button variant="primary" size="sm">
                          {trackFilter === 'practice' && 'Start Practicing'}
                          {trackFilter === 'debug' && 'Enter Debug Lab'}
                          {trackFilter === 'coach' && 'Start Coaching'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        )}
      </section>

      {/* How It Works */}
      <section className="dashboard-howto">
        <h2 className="dashboard-section-title section-title">How It Works</h2>
        <div className="dashboard-howto-grid">
          <Card hoverable className="card-interactive">
            <Card.Body>
              <div className="dashboard-howto-step">
                <span className="dashboard-howto-number">1</span>
                <h3>Approach</h3>
                <p>Identify the pattern before writing code. State the invariant that guides your solution.</p>
              </div>
            </Card.Body>
          </Card>
          <Card hoverable className="card-interactive">
            <Card.Body>
              <div className="dashboard-howto-step">
                <span className="dashboard-howto-number">2</span>
                <h3>Implement</h3>
                <p>Write your solution with the pattern in mind. Submit code and see test results instantly.</p>
              </div>
            </Card.Body>
          </Card>
          <Card hoverable className="card-interactive">
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
