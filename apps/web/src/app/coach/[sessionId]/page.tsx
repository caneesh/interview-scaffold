'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  StageIndicator,
  ProblemFramingStage,
  PatternGateStage,
  FeynmanStage,
  StrategyStage,
  CodingStage,
  ReflectionStage,
  EvidenceDisplay,
  EvidenceList,
  NeedsMoreInfo,
  type EvidenceRef,
} from '@/components/coaching';
import { Badge, Card, Button, Tooltip } from '@/components/ui';

// ============ Types ============

interface SessionData {
  session: {
    id: string;
    attemptId: string;
    tenantId: string;
    userId: string;
    problemId: string;
    currentStage: string;
    helpLevel: 1 | 2 | 3 | 4 | 5;
    startedAt: string;
    completedAt: string | null;
  };
  currentStage: string;
  progress: {
    stageIndex: number;
    totalStages: number;
    percentComplete: number;
  };
  stageHistory?: Array<{
    stage: string;
    enteredAt: string;
    exitedAt?: string;
    outcome?: string;
  }>;
  validationResults?: Array<{
    stage: string;
    isValid: boolean;
    feedback?: string;
    evidenceRefs?: EvidenceRef[];
    confidence?: number;
  }>;
  socraticQuestions?: Array<{
    id: string;
    question: string;
    targetConcept: string;
    difficulty: string;
    evidenceRefs: EvidenceRef[];
    response?: string;
    isCorrect?: boolean;
  }>;
}

interface ProblemData {
  id: string;
  title: string;
  statement: string;
  pattern: string;
  rung: number;
  testCases: Array<{
    input: string;
    expectedOutput: string;
    isHidden: boolean;
    explanation?: string;
  }>;
  hints: string[];
}

interface FramingQuestion {
  id: string;
  text: string;
  category: string;
}

const ALL_PATTERNS = [
  'TWO_POINTER',
  'SLIDING_WINDOW',
  'HASH_MAP',
  'BINARY_SEARCH',
  'DFS',
  'BFS',
  'DYNAMIC_PROGRAMMING',
  'GREEDY',
  'BACKTRACKING',
  'HEAP',
  'STACK',
  'MONOTONIC_STACK',
  'TRIE',
];

// ============ Stage Progress Card ============

interface StageProgressCardProps {
  stageHistory: SessionData['stageHistory'];
  currentStage: string;
}

function StageProgressCard({ stageHistory, currentStage }: StageProgressCardProps) {
  if (!stageHistory || stageHistory.length === 0) return null;

  return (
    <Card className="stage-progress-card">
      <Card.Header title="Stage Progress" />
      <Card.Body padding="sm">
        <div className="stage-progress-timeline">
          {stageHistory.map((entry, index) => {
            const isCurrent = entry.stage === currentStage && !entry.exitedAt;
            const isCompleted = !!entry.exitedAt;
            const duration = entry.exitedAt
              ? getTimeDiff(entry.enteredAt, entry.exitedAt)
              : getTimeDiff(entry.enteredAt, new Date().toISOString());

            return (
              <div
                key={`${entry.stage}-${index}`}
                className={`stage-progress-item ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''}`}
              >
                <div className="stage-progress-dot">
                  {isCompleted ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : isCurrent ? (
                    <div className="stage-progress-dot__pulse" />
                  ) : null}
                </div>
                <div className="stage-progress-content">
                  <span className="stage-progress-name">
                    {formatStageName(entry.stage)}
                  </span>
                  <span className="stage-progress-time">{duration}</span>
                  {entry.outcome && (
                    <Badge
                      variant={entry.outcome === 'passed' ? 'success' : 'warning'}
                      size="sm"
                    >
                      {entry.outcome}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card.Body>
    </Card>
  );
}

// ============ Validation Results Panel ============

interface ValidationResultsPanelProps {
  validationResults: SessionData['validationResults'];
  currentStage: string;
}

function ValidationResultsPanel({ validationResults, currentStage }: ValidationResultsPanelProps) {
  if (!validationResults || validationResults.length === 0) return null;

  const currentStageValidation = validationResults.find(v => v.stage === currentStage);
  const hasEvidence = currentStageValidation?.evidenceRefs && currentStageValidation.evidenceRefs.length > 0;

  return (
    <Card className="validation-results-panel">
      <Card.Header
        title="Validation Results"
        actions={
          currentStageValidation?.isValid !== undefined && (
            <Badge variant={currentStageValidation.isValid ? 'success' : 'warning'}>
              {currentStageValidation.isValid ? 'Validated' : 'Needs Work'}
            </Badge>
          )
        }
      />
      <Card.Body padding="sm">
        {currentStageValidation?.feedback && (
          <p className="validation-feedback">{currentStageValidation.feedback}</p>
        )}
        {currentStageValidation?.confidence !== undefined && (
          <div className="validation-confidence">
            <span className="validation-confidence-label">Confidence:</span>
            <div className="validation-confidence-bar">
              <div
                className="validation-confidence-fill"
                style={{ width: `${Math.round(currentStageValidation.confidence * 100)}%` }}
                data-level={
                  currentStageValidation.confidence >= 0.8 ? 'high' :
                  currentStageValidation.confidence >= 0.5 ? 'medium' : 'low'
                }
              />
            </div>
            <span className="validation-confidence-value">
              {Math.round(currentStageValidation.confidence * 100)}%
            </span>
          </div>
        )}
        {hasEvidence && (
          <EvidenceList
            evidenceRefs={currentStageValidation!.evidenceRefs!}
            title="Evidence"
            defaultExpanded={false}
          />
        )}
      </Card.Body>
    </Card>
  );
}

// ============ Socratic Questions Panel ============

interface SocraticQuestionsPanelProps {
  socraticQuestions: SessionData['socraticQuestions'];
}

function SocraticQuestionsPanel({ socraticQuestions }: SocraticQuestionsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!socraticQuestions || socraticQuestions.length === 0) return null;

  return (
    <Card className="socratic-questions-panel">
      <Card.Header title="Coaching Questions" />
      <Card.Body padding="sm">
        <div className="socratic-questions-list">
          {socraticQuestions.map((q) => (
            <div
              key={q.id}
              className={`socratic-question ${q.isCorrect !== undefined ? (q.isCorrect ? 'answered-correct' : 'answered-incorrect') : ''}`}
            >
              <div
                className="socratic-question-header"
                onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
              >
                <div className="socratic-question-main">
                  <Badge variant={getDifficultyVariant(q.difficulty)} size="sm">
                    {q.difficulty}
                  </Badge>
                  <span className="socratic-question-text">{q.question}</span>
                </div>
                {q.isCorrect !== undefined && (
                  <Badge variant={q.isCorrect ? 'success' : 'error'} size="sm">
                    {q.isCorrect ? 'Correct' : 'Try Again'}
                  </Badge>
                )}
              </div>

              {expandedId === q.id && (
                <div className="socratic-question-details">
                  <div className="socratic-question-concept">
                    <strong>Target Concept:</strong> {q.targetConcept}
                  </div>
                  {q.response && (
                    <div className="socratic-question-response">
                      <strong>Your Response:</strong> {q.response}
                    </div>
                  )}
                  {q.evidenceRefs && q.evidenceRefs.length > 0 && (
                    <EvidenceList
                      evidenceRefs={q.evidenceRefs}
                      title="Why this question"
                      maxVisible={2}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
}

// ============ Helper Functions ============

function formatStageName(stage: string): string {
  return stage
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getTimeDiff(start: string, end: string): string {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

function getDifficultyVariant(difficulty: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (difficulty.toLowerCase()) {
    case 'hint':
      return 'success';
    case 'probe':
      return 'info';
    case 'challenge':
      return 'warning';
    default:
      return 'default';
  }
}

// ============ Main Page Component ============

export default function CoachingSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [problem, setProblem] = useState<ProblemData | null>(null);
  const [framingQuestions, setFramingQuestions] = useState<FramingQuestion[]>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<
    Array<{ questionId: string; questionText: string; answer: string }>
  >([]);
  const [showSidebar, setShowSidebar] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/coaching/sessions/${sessionId}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error.message);
        return;
      }

      setSession(data);

      // Use framing questions from the API if available
      if (data.framingQuestions && data.framingQuestions.length > 0) {
        setFramingQuestions(data.framingQuestions);
      }

      // Fetch problem data if we have it
      if (data.session?.problemId) {
        const problemRes = await fetch(`/api/problems/list`);
        const problemData = await problemRes.json();
        const problemInfo = problemData.problems?.find(
          (p: ProblemData) => p.id === data.session.problemId
        );
        if (problemInfo) {
          setProblem(problemInfo);
        }
      }
    } catch (err) {
      setError('Failed to load coaching session');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Fallback: Generate questions if API didn't return any
  useEffect(() => {
    if (problem && session?.currentStage === 'PROBLEM_FRAMING' && framingQuestions.length === 0) {
      // Only use fallback if API didn't return questions
      setFramingQuestions([
        {
          id: 'fallback-q1',
          text: `What are the inputs and outputs of this problem?`,
          category: 'Understanding',
        },
        {
          id: 'fallback-q2',
          text: `What constraints should you consider?`,
          category: 'Constraints',
        },
        {
          id: 'fallback-q3',
          text: `Can you describe a simple example?`,
          category: 'Examples',
        },
      ]);
    }
  }, [problem, session?.currentStage, framingQuestions.length]);

  function handleStageComplete() {
    // Refresh session to get updated stage
    fetchSession();
  }

  function handleSessionComplete() {
    // Session is complete, can show final state or redirect
    fetchSession();
  }

  if (loading) {
    return (
      <div className="coaching-session-loading">
        <div className="spinner"></div>
        <p>Loading coaching session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="coaching-session-error">
        <h2>Error Loading Session</h2>
        <p>{error}</p>
        <Link href="/coach" className="btn btn-primary">
          Back to Coach
        </Link>
      </div>
    );
  }

  if (!session || !problem) {
    return (
      <div className="coaching-session-error">
        <h2>Session Not Found</h2>
        <p>The coaching session you are looking for does not exist.</p>
        <Link href="/coach" className="btn btn-primary">
          Back to Coach
        </Link>
      </div>
    );
  }

  const currentStage = session.currentStage;
  const isCompleted = session.session.completedAt !== null;

  // Collect all evidence from the session
  const allEvidence: EvidenceRef[] = [];
  session.validationResults?.forEach(v => {
    if (v.evidenceRefs) {
      allEvidence.push(...v.evidenceRefs);
    }
  });
  session.socraticQuestions?.forEach(q => {
    if (q.evidenceRefs) {
      allEvidence.push(...q.evidenceRefs);
    }
  });

  return (
    <div className="coaching-session coaching-session--with-sidebar">
      {/* Header */}
      <div className="coaching-session-header">
        <div className="session-info">
          <h1>{problem.title}</h1>
          <div className="session-meta">
            <Badge variant="info">{problem.pattern.replace(/_/g, ' ')}</Badge>
            <Badge variant="default">Rung {problem.rung}</Badge>
            {session.session.helpLevel > 1 && (
              <Badge variant="warning">Help Level {session.session.helpLevel}</Badge>
            )}
          </div>
        </div>
        <div className="session-actions">
          <Tooltip content={showSidebar ? 'Hide sidebar' : 'Show sidebar'}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              aria-label={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {showSidebar ? (
                  <>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="15" y1="3" x2="15" y2="21" />
                  </>
                ) : (
                  <>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                  </>
                )}
              </svg>
            </Button>
          </Tooltip>
          <div className="session-progress">
            <div className="progress-ring">
              <svg viewBox="0 0 36 36" className="progress-ring-svg">
                <path
                  className="progress-ring-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="progress-ring-fill"
                  strokeDasharray={`${session.progress.percentComplete}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="progress-ring-text">
                {Math.round(session.progress.percentComplete)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stage Indicator */}
      <StageIndicator currentStage={currentStage} />

      {/* Main Content Area */}
      <div className={`coaching-session-layout ${showSidebar ? '' : 'sidebar-hidden'}`}>
        {/* Main Content */}
        <div className="coaching-session-content">
          {currentStage === 'PROBLEM_FRAMING' && (
            <ProblemFramingStage
              sessionId={sessionId}
              problemStatement={problem.statement}
              problemTitle={problem.title}
              currentQuestions={framingQuestions}
              answeredQuestions={answeredQuestions}
              understandingScore={0}
              onStageComplete={handleStageComplete}
            />
          )}

          {currentStage === 'PATTERN_RECOGNITION' && (
            <PatternGateStage
              sessionId={sessionId}
              problemTitle={problem.title}
              correctPattern={problem.pattern}
              availablePatterns={ALL_PATTERNS}
              onStageComplete={handleStageComplete}
            />
          )}

          {currentStage === 'FEYNMAN_VALIDATION' && (
            <FeynmanStage
              sessionId={sessionId}
              patternName={problem.pattern}
              problemTitle={problem.title}
              onStageComplete={handleStageComplete}
            />
          )}

          {currentStage === 'STRATEGY_DESIGN' && (
            <StrategyStage
              sessionId={sessionId}
              problemTitle={problem.title}
              patternName={problem.pattern}
              onStageComplete={handleStageComplete}
            />
          )}

          {currentStage === 'CODING' && (
            <CodingStage
              sessionId={sessionId}
              attemptId={session.session.attemptId}
              problemTitle={problem.title}
              problemStatement={problem.statement}
              patternName={problem.pattern}
              testCases={problem.testCases}
              helpLevel={session.session.helpLevel}
              onStageComplete={handleStageComplete}
            />
          )}

          {currentStage === 'REFLECTION' && (
            <ReflectionStage
              sessionId={sessionId}
              problemTitle={problem.title}
              patternName={problem.pattern}
              helpLevel={session.session.helpLevel}
              onComplete={handleSessionComplete}
            />
          )}

          {isCompleted && currentStage !== 'REFLECTION' && (
            <div className="session-completed-banner">
              <h2>Session Completed</h2>
              <p>This coaching session has been completed.</p>
              <div className="completed-actions">
                <Link href="/coach" className="btn btn-primary">
                  Back to Coach
                </Link>
                <Link href="/practice" className="btn btn-secondary">
                  Practice More
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <aside className="coaching-session-sidebar">
            {/* Stage Progress */}
            <StageProgressCard
              stageHistory={session.stageHistory}
              currentStage={currentStage}
            />

            {/* Validation Results */}
            <ValidationResultsPanel
              validationResults={session.validationResults}
              currentStage={currentStage}
            />

            {/* Socratic Questions */}
            <SocraticQuestionsPanel socraticQuestions={session.socraticQuestions} />

            {/* Evidence Summary */}
            {allEvidence.length > 0 && (
              <Card className="evidence-summary-card">
                <Card.Header title="Session Evidence" />
                <Card.Body padding="sm">
                  <EvidenceDisplay
                    evidenceRefs={allEvidence}
                    showExplainer={true}
                  />
                </Card.Body>
              </Card>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
