'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Stepper, type StepConfig } from '@/components/Stepper';
import { ProblemStatement } from '@/components/ProblemStatement';
import { ThinkingGate } from '@/components/ThinkingGate';
import { CodeEditor } from '@/components/CodeEditor';
import { TestResults } from '@/components/TestResults';
import { HintPanel } from '@/components/HintPanel';
import { ReflectionForm } from '@/components/ReflectionForm';
import { MicroLessonModal } from '@/components/MicroLessonModal';
import { CompletionSummary } from '@/components/CompletionSummary';

interface Problem {
  id: string;
  title: string;
  statement: string;
  pattern: string;
  rung: number;
  targetComplexity: string;
  hints: string[];
}

interface TestResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  error: string | null;
}

interface Hint {
  level: string;
  text: string;
}

interface Attempt {
  id: string;
  state: string;
  pattern: string;
  rung: number;
  hintsUsed: string[];
  codeSubmissions: number;
  score: {
    overall: number;
    patternRecognition: number;
    implementation: number;
    edgeCases: number;
    efficiency: number;
  } | null;
}

const DEMO_REFLECTION_OPTIONS = [
  { id: 'edge_case', text: 'I missed handling an edge case (empty input, single element, etc.)', isCorrect: true },
  { id: 'off_by_one', text: 'I had an off-by-one error in my loop bounds', isCorrect: true },
  { id: 'wrong_pattern', text: 'I used the wrong algorithmic approach for this problem', isCorrect: false },
  { id: 'syntax', text: 'I had a syntax or compilation error', isCorrect: false },
];

const DEMO_MICRO_LESSONS: Record<string, { title: string; content: string }> = {
  SLIDING_WINDOW: {
    title: 'Sliding Window Best Practices',
    content: `When implementing sliding window:

1. Initialize your window boundaries (left, right pointers)
2. Expand the right boundary to grow the window
3. Contract the left boundary when constraints are violated
4. Track your answer at each valid window state

Common pitfalls:
- Using nested loops (O(n²)) instead of the two-pointer approach (O(n))
- Forgetting to update the answer when shrinking the window
- Off-by-one errors when the window includes/excludes boundaries`
  },
  DEFAULT: {
    title: 'Problem-Solving Tips',
    content: `Before writing code:

1. Understand the problem completely - read it twice
2. Identify the pattern that applies
3. State your invariant - what property will your solution maintain?
4. Consider edge cases: empty input, single element, negative numbers

During implementation:
- Start with the simplest case
- Build up complexity gradually
- Test each piece before moving on`
  }
};

export default function AttemptPage() {
  const params = useParams();
  const attemptId = params.attemptId as string;

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Step states
  const [stepLoading, setStepLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [hints, setHints] = useState<Hint[]>([]);
  const [hintLoading, setHintLoading] = useState(false);

  // Micro-lesson modal
  const [microLesson, setMicroLesson] = useState<{ title: string; content: string } | null>(null);

  // Problem statement collapse
  const [problemCollapsed, setProblemCollapsed] = useState(false);

  useEffect(() => {
    fetchAttempt();
  }, [attemptId]);

  async function fetchAttempt() {
    try {
      const res = await fetch(`/api/attempts/${attemptId}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error.message);
      } else {
        setAttempt(data.attempt);
        setProblem(data.problem);

        // Restore hints from attempt
        if (data.attempt.hintsUsed?.length > 0) {
          // In a real app, we'd fetch hint texts from the steps
          // For demo, we'll rebuild them
        }
      }
    } catch (err) {
      setError('Failed to load attempt');
    } finally {
      setLoading(false);
    }
  }

  const getStepConfig = useCallback((): StepConfig[] => {
    if (!attempt) return [];

    const state = attempt.state;
    const hasReflection = state === 'REFLECTION' || testResults.some(r => !r.passed);

    const steps: StepConfig[] = [
      {
        id: 'approach',
        label: 'Approach',
        status: state === 'THINKING_GATE' ? 'active' : 'completed'
      },
      {
        id: 'code',
        label: 'Code',
        status: state === 'THINKING_GATE' ? 'pending' :
                state === 'CODING' || state === 'HINT' ? 'active' :
                'completed'
      },
      {
        id: 'test',
        label: 'Test',
        status: testResults.length === 0 ? 'pending' :
                testResults.every(r => r.passed) ? 'completed' :
                'active'
      },
    ];

    if (hasReflection || state === 'REFLECTION') {
      steps.push({
        id: 'reflection',
        label: 'Reflection',
        status: state === 'REFLECTION' ? 'active' :
                state === 'COMPLETED' ? 'completed' : 'pending'
      });
    }

    if (state === 'COMPLETED') {
      steps.push({
        id: 'complete',
        label: 'Complete',
        status: 'completed'
      });
    }

    return steps;
  }, [attempt, testResults]);

  async function handleThinkingGateSubmit(data: {
    selectedPattern: string;
    statedInvariant: string;
    statedComplexity?: string;
  }) {
    setStepLoading(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepType: 'THINKING_GATE',
          ...data
        }),
      });

      const result = await res.json();

      if (result.error) {
        setError(result.error.message);
      } else {
        setAttempt(result.attempt);

        // Show micro-lesson if pattern doesn't match
        if (!result.passed && problem) {
          const lesson = DEMO_MICRO_LESSONS[problem.pattern] ?? DEMO_MICRO_LESSONS['DEFAULT'];
          if (lesson) {
            setMicroLesson(lesson);
          }
        }
      }
    } catch (err) {
      setError('Failed to submit thinking gate');
    } finally {
      setStepLoading(false);
    }
  }

  async function handleCodeSubmit(data: { code: string; language: string }) {
    setStepLoading(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.error) {
        setError(result.error.message);
      } else {
        setAttempt(result.attempt);
        setTestResults(result.testResults);
        setProblemCollapsed(true);
      }
    } catch (err) {
      setError('Failed to submit code');
    } finally {
      setStepLoading(false);
    }
  }

  async function handleRequestHint() {
    setHintLoading(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await res.json();

      if (result.error) {
        if (result.error.code === 'NO_MORE_HINTS') {
          // No more hints available
        } else {
          setError(result.error.message);
        }
      } else {
        setAttempt(result.attempt);
        setHints(prev => [...prev, result.hint]);
      }
    } catch (err) {
      setError('Failed to get hint');
    } finally {
      setHintLoading(false);
    }
  }

  async function handleReflectionSubmit(selectedId: string, isCorrect: boolean) {
    setStepLoading(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepType: 'REFLECTION',
          selectedOptionId: selectedId,
          correct: isCorrect
        }),
      });

      const result = await res.json();

      if (result.error) {
        setError(result.error.message);
      } else {
        setAttempt(result.attempt);
        setTestResults([]); // Clear results to allow retry
      }
    } catch (err) {
      setError('Failed to submit reflection');
    } finally {
      setStepLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem' }}>Loading problem...</p>
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
          onClick={() => { setError(null); setLoading(true); fetchAttempt(); }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!attempt || !problem) {
    return (
      <div className="empty-state">
        <h3>Attempt not found</h3>
        <a href="/practice" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Practice
        </a>
      </div>
    );
  }

  // Completed state
  if (attempt.state === 'COMPLETED' && attempt.score) {
    return (
      <CompletionSummary
        score={attempt.score}
        pattern={attempt.pattern}
        rung={attempt.rung}
        hintsUsed={attempt.hintsUsed.length}
        codeSubmissions={attempt.codeSubmissions}
      />
    );
  }

  return (
    <div>
      <Stepper steps={getStepConfig()} />

      <ProblemStatement
        problem={problem}
        collapsed={problemCollapsed}
        onToggle={() => setProblemCollapsed(!problemCollapsed)}
      />

      {/* Thinking Gate Step */}
      {attempt.state === 'THINKING_GATE' && (
        <ThinkingGate
          onSubmit={handleThinkingGateSubmit}
          loading={stepLoading}
        />
      )}

      {/* Coding Step */}
      {(attempt.state === 'CODING' || attempt.state === 'HINT') && (
        <>
          <CodeEditor
            onSubmit={handleCodeSubmit}
            onRequestHint={handleRequestHint}
            loading={stepLoading}
            hintLoading={hintLoading}
            hintsRemaining={5 - attempt.hintsUsed.length}
          />

          <HintPanel hints={hints} />

          {testResults.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <TestResults results={testResults} />
            </div>
          )}
        </>
      )}

      {/* Reflection Step */}
      {attempt.state === 'REFLECTION' && (
        <ReflectionForm
          question="What do you think caused the test failures?"
          options={DEMO_REFLECTION_OPTIONS}
          onSubmit={handleReflectionSubmit}
          loading={stepLoading}
        />
      )}

      {/* Micro-lesson Modal */}
      <MicroLessonModal
        isOpen={microLesson !== null}
        title={microLesson?.title || ''}
        content={microLesson?.content || ''}
        onComplete={() => setMicroLesson(null)}
      />
    </div>
  );
}
