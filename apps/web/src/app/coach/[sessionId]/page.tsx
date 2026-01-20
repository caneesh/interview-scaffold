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
} from '@/components/coaching';

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

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/coaching/sessions/${sessionId}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error.message);
        return;
      }

      setSession(data);

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

  // When starting a session, fetch initial framing questions
  useEffect(() => {
    if (session?.currentStage === 'PROBLEM_FRAMING' && framingQuestions.length === 0) {
      // Initial questions are returned when session is created
      // For now, generate some placeholder questions based on problem
      if (problem) {
        setFramingQuestions([
          {
            id: 'q1',
            text: `What are the inputs and outputs of this problem?`,
            category: 'Understanding',
          },
          {
            id: 'q2',
            text: `What constraints should you consider?`,
            category: 'Constraints',
          },
          {
            id: 'q3',
            text: `Can you describe a simple example?`,
            category: 'Examples',
          },
        ]);
      }
    }
  }, [session?.currentStage, framingQuestions.length, problem]);

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

  return (
    <div className="coaching-session">
      <div className="coaching-session-header">
        <div className="session-info">
          <h1>{problem.title}</h1>
          <div className="session-meta">
            <span className="problem-tag">{problem.pattern.replace(/_/g, ' ')}</span>
            <span className="problem-tag">Rung {problem.rung}</span>
            {session.session.helpLevel > 1 && (
              <span className="problem-tag problem-tag--help">
                Help Level {session.session.helpLevel}
              </span>
            )}
          </div>
        </div>
        <div className="session-progress">
          <span className="progress-text">
            {Math.round(session.progress.percentComplete)}% Complete
          </span>
        </div>
      </div>

      <StageIndicator currentStage={currentStage} />

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
    </div>
  );
}
