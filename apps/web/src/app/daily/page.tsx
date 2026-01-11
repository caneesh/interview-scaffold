'use client';

/**
 * Daily Session page - 10-minute structured learning session.
 * Block A: 2-min spaced review drill (placeholder - coming soon)
 * Block B: 6-min MEP-selected task (connected to backend)
 * Block C: 2-min reflection
 */

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { ProblemStatement } from '@/components/ProblemStatement';
import { ThinkingGate } from '@/components/ThinkingGate';
import { CodeEditor } from '@/components/CodeEditor';
import { TestResults } from '@/components/TestResults';
import { HintPanel } from '@/components/HintPanel';
import { ReflectionForm } from '@/components/ReflectionForm';
import { MicroLessonModal } from '@/components/MicroLessonModal';
import { LLMFeedback } from '@/components/LLMFeedback';

type SessionBlock = 'not-started' | 'spaced-review' | 'mep-task' | 'reflection' | 'complete';

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

interface ValidationData {
  rubricGrade: 'PASS' | 'PARTIAL' | 'FAIL';
  llmFeedback?: string;
  llmConfidence?: number;
  microLessonId?: string;
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

interface SessionState {
  // Block management
  currentBlock: SessionBlock;
  startTime: number | null;
  blockStartTime: number | null;
  elapsedSeconds: number;
  blockElapsedSeconds: number;

  // Block A state
  reviewDrillAnswer: string | null;

  // Block B state - backend integration
  attemptId: string | null;
  problem: Problem | null;
  attempt: Attempt | null;
  testResults: TestResult[];
  hints: Hint[];
  validation: ValidationData | null;
  problemCollapsed: boolean;

  // Block C state
  reflectionConfidence: number;
  reflectionNotes: string;

  // UI state
  loading: boolean;
  stepLoading: boolean;
  hintLoading: boolean;
  error: string | null;
}

const BLOCK_DURATIONS = {
  'spaced-review': 120, // 2 minutes
  'mep-task': 360,      // 6 minutes
  'reflection': 120,    // 2 minutes
};

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
- Using nested loops (O(n^2)) instead of the two-pointer approach (O(n))
- Forgetting to update the answer when shrinking the window
- Off-by-one errors when the window includes/excludes boundaries`
  },
  BACKTRACKING: {
    title: 'Backtracking Fundamentals',
    content: `When implementing backtracking:

1. Define your base case - when to stop recursing
2. Make a choice and recurse
3. Undo the choice (backtrack) after exploring that path
4. Track visited state to avoid cycles

Common pitfalls:
- Forgetting to undo state changes after recursion
- Not marking cells as visited before recursing
- Missing boundary checks in grid problems`
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

export default function DailySessionPage() {
  const [state, setState] = useState<SessionState>({
    currentBlock: 'not-started',
    startTime: null,
    blockStartTime: null,
    elapsedSeconds: 0,
    blockElapsedSeconds: 0,
    reviewDrillAnswer: null,
    attemptId: null,
    problem: null,
    attempt: null,
    testResults: [],
    hints: [],
    validation: null,
    problemCollapsed: false,
    reflectionConfidence: 3,
    reflectionNotes: '',
    loading: false,
    stepLoading: false,
    hintLoading: false,
    error: null,
  });

  // Micro-lesson modal
  const [microLesson, setMicroLesson] = useState<{ title: string; content: string } | null>(null);

  // Timer logic
  useEffect(() => {
    if (state.startTime === null) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setState(prev => ({
        ...prev,
        elapsedSeconds: Math.floor((now - (prev.startTime ?? now)) / 1000),
        blockElapsedSeconds: Math.floor((now - (prev.blockStartTime ?? now)) / 1000),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [state.startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = useCallback(() => {
    const now = Date.now();
    setState(prev => ({
      ...prev,
      currentBlock: 'spaced-review',
      startTime: now,
      blockStartTime: now,
    }));
  }, []);

  // Fetch MEP problem and start attempt when entering Block B
  const startMEPTask = useCallback(async () => {
    const now = Date.now();
    setState(prev => ({
      ...prev,
      currentBlock: 'mep-task',
      blockStartTime: now,
      blockElapsedSeconds: 0,
      loading: true,
      error: null,
    }));

    try {
      // Step 1: Get next recommended problem
      const problemRes = await fetch('/api/problems/next');
      const problemData = await problemRes.json();

      if (problemData.error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: problemData.error.message || 'Failed to get problem',
        }));
        return;
      }

      if (!problemData.problem) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'No problems available. Please seed the database with problems first.',
        }));
        return;
      }

      // Step 2: Start an attempt on this problem
      const attemptRes = await fetch('/api/attempts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId: problemData.problem.id }),
      });

      const attemptData = await attemptRes.json();

      if (attemptData.error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: attemptData.error.message || 'Failed to start attempt',
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        attemptId: attemptData.attempt.id,
        problem: attemptData.problem,
        attempt: attemptData.attempt,
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Network error. Please check your connection.',
      }));
    }
  }, []);

  const advanceToReflection = useCallback(() => {
    const now = Date.now();
    setState(prev => ({
      ...prev,
      currentBlock: 'reflection',
      blockStartTime: now,
      blockElapsedSeconds: 0,
    }));
  }, []);

  const completeSession = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentBlock: 'complete',
    }));
  }, []);

  // Handler for thinking gate submission
  const handleThinkingGateSubmit = useCallback(async (data: {
    selectedPattern: string;
    statedInvariant: string;
    statedComplexity?: string;
  }) => {
    if (!state.attemptId) return;

    setState(prev => ({ ...prev, stepLoading: true, error: null }));

    try {
      const res = await fetch(`/api/attempts/${state.attemptId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepType: 'THINKING_GATE',
          ...data
        }),
      });

      const result = await res.json();

      if (result.error) {
        setState(prev => ({ ...prev, stepLoading: false, error: result.error.message }));
      } else {
        setState(prev => ({ ...prev, stepLoading: false, attempt: result.attempt }));

        // Show micro-lesson if pattern doesn't match
        if (!result.passed && state.problem) {
          const lesson = DEMO_MICRO_LESSONS[state.problem.pattern] ?? DEMO_MICRO_LESSONS['DEFAULT'];
          if (lesson) {
            setMicroLesson(lesson);
          }
        }
      }
    } catch (err) {
      setState(prev => ({ ...prev, stepLoading: false, error: 'Failed to submit thinking gate' }));
    }
  }, [state.attemptId, state.problem]);

  // Handler for code submission
  const handleCodeSubmit = useCallback(async (data: { code: string; language: string }) => {
    if (!state.attemptId) return;

    setState(prev => ({ ...prev, stepLoading: true, error: null }));

    try {
      const res = await fetch(`/api/attempts/${state.attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.error) {
        setState(prev => ({ ...prev, stepLoading: false, error: result.error.message }));
      } else {
        setState(prev => ({
          ...prev,
          stepLoading: false,
          attempt: result.attempt,
          testResults: result.testResults || [],
          validation: result.validation ?? null,
          problemCollapsed: true,
        }));
      }
    } catch (err) {
      setState(prev => ({ ...prev, stepLoading: false, error: 'Failed to submit code' }));
    }
  }, [state.attemptId]);

  // Handler for hint request
  const handleRequestHint = useCallback(async () => {
    if (!state.attemptId) return;

    setState(prev => ({ ...prev, hintLoading: true }));

    try {
      const res = await fetch(`/api/attempts/${state.attemptId}/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await res.json();

      if (result.error) {
        if (result.error.code !== 'NO_MORE_HINTS') {
          setState(prev => ({ ...prev, hintLoading: false, error: result.error.message }));
        } else {
          setState(prev => ({ ...prev, hintLoading: false }));
        }
      } else {
        setState(prev => ({
          ...prev,
          hintLoading: false,
          attempt: result.attempt,
          hints: [...prev.hints, result.hint],
        }));
      }
    } catch (err) {
      setState(prev => ({ ...prev, hintLoading: false, error: 'Failed to get hint' }));
    }
  }, [state.attemptId]);

  // Handler for reflection (when tests fail during practice)
  const handlePracticeReflectionSubmit = useCallback(async (selectedId: string, isCorrect: boolean) => {
    if (!state.attemptId) return;

    setState(prev => ({ ...prev, stepLoading: true, error: null }));

    try {
      const res = await fetch(`/api/attempts/${state.attemptId}/step`, {
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
        setState(prev => ({ ...prev, stepLoading: false, error: result.error.message }));
      } else {
        setState(prev => ({
          ...prev,
          stepLoading: false,
          attempt: result.attempt,
          testResults: [],
          validation: null,
        }));
      }
    } catch (err) {
      setState(prev => ({ ...prev, stepLoading: false, error: 'Failed to submit reflection' }));
    }
  }, [state.attemptId]);

  const getBlockTimeRemaining = () => {
    const currentBlockKey = state.currentBlock as keyof typeof BLOCK_DURATIONS;
    const duration = BLOCK_DURATIONS[currentBlockKey] ?? 0;
    return Math.max(0, duration - state.blockElapsedSeconds);
  };

  const getBlockProgress = () => {
    const currentBlockKey = state.currentBlock as keyof typeof BLOCK_DURATIONS;
    const duration = BLOCK_DURATIONS[currentBlockKey] ?? 0;
    if (duration === 0) return 0;
    return Math.min(100, (state.blockElapsedSeconds / duration) * 100);
  };

  // Determine if attempt is completed
  const isAttemptCompleted = state.attempt?.state === 'COMPLETED';

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-700"
            >
              &larr; Exit
            </Link>
            <h1 className="text-xl font-bold text-gray-900">10-Minute Daily Session</h1>
          </div>

          {state.startTime && (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-xs text-gray-500">Total Time</div>
                <div className="font-mono text-lg font-semibold text-gray-900">
                  {formatTime(state.elapsedSeconds)} / 10:00
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Progress Bar */}
      {state.startTime && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto py-4 px-4">
            <div className="flex items-center gap-2 mb-3">
              <BlockIndicator
                label="A"
                name="Review"
                isActive={state.currentBlock === 'spaced-review'}
                isComplete={['mep-task', 'reflection', 'complete'].includes(state.currentBlock)}
              />
              <div className="flex-1 h-1 bg-gray-200">
                <div
                  className={`h-full transition-all ${
                    state.currentBlock === 'spaced-review' ? 'bg-blue-600' :
                    ['mep-task', 'reflection', 'complete'].includes(state.currentBlock) ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                  style={{ width: state.currentBlock === 'spaced-review' ? `${getBlockProgress()}%` :
                    ['mep-task', 'reflection', 'complete'].includes(state.currentBlock) ? '100%' : '0%' }}
                />
              </div>
              <BlockIndicator
                label="B"
                name="Practice"
                isActive={state.currentBlock === 'mep-task'}
                isComplete={['reflection', 'complete'].includes(state.currentBlock)}
              />
              <div className="flex-1 h-1 bg-gray-200">
                <div
                  className={`h-full transition-all ${
                    state.currentBlock === 'mep-task' ? 'bg-blue-600' :
                    ['reflection', 'complete'].includes(state.currentBlock) ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                  style={{ width: state.currentBlock === 'mep-task' ? `${getBlockProgress()}%` :
                    ['reflection', 'complete'].includes(state.currentBlock) ? '100%' : '0%' }}
                />
              </div>
              <BlockIndicator
                label="C"
                name="Reflect"
                isActive={state.currentBlock === 'reflection'}
                isComplete={state.currentBlock === 'complete'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-8">
        {state.currentBlock === 'not-started' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-6xl mb-6">🎯</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ready for Your Daily Session?
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Your 10-minute session includes:
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
              <TimeBlock label="Block A" time="2 min" description="Spaced Review" />
              <TimeBlock label="Block B" time="6 min" description="MEP Practice" />
              <TimeBlock label="Block C" time="2 min" description="Reflection" />
            </div>
            <button
              onClick={startSession}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Start Session
            </button>
          </div>
        )}

        {/* Block A: Spaced Review (Placeholder) */}
        {state.currentBlock === 'spaced-review' && (
          <BlockCard
            title="Block A: Spaced Review"
            description="Quick drill on previously learned patterns"
            timeRemaining={getBlockTimeRemaining()}
            progress={getBlockProgress()}
          >
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">
                  Pattern: Sliding Window
                </h3>
                <span className="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded">
                  Coming soon: personalized review
                </span>
              </div>
              <p className="text-gray-700 mb-4">
                What is the time complexity of the sliding window pattern for finding the maximum sum of a contiguous subarray of size k?
              </p>
              <div className="grid grid-cols-2 gap-3">
                {['O(n)', 'O(n log n)', 'O(n²)', 'O(k)'].map((option) => (
                  <button
                    key={option}
                    onClick={() => setState(prev => ({ ...prev, reviewDrillAnswer: option }))}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      state.reviewDrillAnswer === option
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={startMEPTask}
              disabled={!state.reviewDrillAnswer}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Practice →
            </button>
          </BlockCard>
        )}

        {/* Block B: MEP Practice (Connected to Backend) */}
        {state.currentBlock === 'mep-task' && (
          <BlockCard
            title="Block B: Focused Practice"
            description={state.problem ? `Pattern: ${state.problem.pattern} • Rung ${state.problem.rung}` : 'MEP-selected problem based on your progress'}
            timeRemaining={getBlockTimeRemaining()}
            progress={getBlockProgress()}
          >
            {/* Loading state */}
            {state.loading && (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600">Loading your personalized problem...</p>
              </div>
            )}

            {/* Error state */}
            {state.error && !state.loading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-700 mb-4">{state.error}</p>
                <button
                  onClick={startMEPTask}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Practice flow */}
            {!state.loading && !state.error && state.problem && state.attempt && (
              <div className="space-y-6">
                {/* Problem Statement */}
                <ProblemStatement
                  problem={state.problem}
                  collapsed={state.problemCollapsed}
                  onToggle={() => setState(prev => ({ ...prev, problemCollapsed: !prev.problemCollapsed }))}
                />

                {/* Thinking Gate */}
                {state.attempt.state === 'THINKING_GATE' && (
                  <ThinkingGate
                    onSubmit={handleThinkingGateSubmit}
                    loading={state.stepLoading}
                  />
                )}

                {/* Coding */}
                {(state.attempt.state === 'CODING' || state.attempt.state === 'HINT') && (
                  <>
                    <CodeEditor
                      onSubmit={handleCodeSubmit}
                      loading={state.stepLoading}
                    />

                    {/* Hint Request Button */}
                    <div style={{ marginTop: '1rem' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={handleRequestHint}
                        disabled={state.hintLoading || 5 - state.attempt.hintsUsed.length === 0}
                        style={{ width: '100%' }}
                      >
                        {state.hintLoading ? 'Loading hint...' : `Get Hint (${5 - state.attempt.hintsUsed.length} left)`}
                      </button>
                    </div>

                    <HintPanel hints={state.hints} />

                    {state.testResults.length > 0 && (
                      <TestResults results={state.testResults} />
                    )}

                    {state.validation?.llmFeedback && state.validation.llmConfidence !== undefined && (
                      <LLMFeedback
                        feedback={state.validation.llmFeedback}
                        confidence={state.validation.llmConfidence}
                        grade={state.validation.rubricGrade}
                        microLessonId={state.validation.microLessonId}
                      />
                    )}
                  </>
                )}

                {/* Reflection (after failed tests) */}
                {state.attempt.state === 'REFLECTION' && (
                  <ReflectionForm
                    question="What do you think caused the test failures?"
                    options={DEMO_REFLECTION_OPTIONS}
                    onSubmit={handlePracticeReflectionSubmit}
                    loading={state.stepLoading}
                  />
                )}

                {/* Completed state */}
                {state.attempt.state === 'COMPLETED' && state.attempt.score && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="text-center mb-4">
                      <span className="text-4xl">🎉</span>
                      <h3 className="text-xl font-bold text-green-800 mt-2">Problem Completed!</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">{state.attempt.score.overall}</div>
                        <div className="text-xs text-gray-500">Overall Score</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600">{state.attempt.codeSubmissions}</div>
                        <div className="text-xs text-gray-500">Submissions</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Continue button */}
                <button
                  onClick={advanceToReflection}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  {isAttemptCompleted ? 'Continue to Session Reflection →' : 'Skip to Reflection →'}
                </button>
              </div>
            )}

            {/* No problem loaded yet and no error */}
            {!state.loading && !state.error && !state.problem && (
              <div className="text-center py-12">
                <p className="text-gray-600">Problem will load shortly...</p>
              </div>
            )}
          </BlockCard>
        )}

        {/* Block C: Session Reflection */}
        {state.currentBlock === 'reflection' && (
          <BlockCard
            title="Block C: Reflection"
            description="Self-assessment and confidence rating"
            timeRemaining={getBlockTimeRemaining()}
            progress={getBlockProgress()}
          >
            <div className="space-y-6">
              {/* Show attempt score if completed */}
              {isAttemptCompleted && state.attempt?.score && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Today&apos;s Practice Score</h4>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-xl font-bold text-blue-600">{state.attempt.score.overall}</div>
                      <div className="text-xs text-gray-500">Overall</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-700">{state.attempt.score.patternRecognition}</div>
                      <div className="text-xs text-gray-500">Pattern</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-700">{state.attempt.score.implementation}</div>
                      <div className="text-xs text-gray-500">Code</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-700">{state.attempt.score.edgeCases}</div>
                      <div className="text-xs text-gray-500">Edge Cases</div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How confident do you feel about today&apos;s practice?
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => setState(prev => ({ ...prev, reflectionConfidence: level }))}
                      className={`flex-1 py-3 rounded-lg border text-center transition-colors ${
                        state.reflectionConfidence === level
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Not confident</span>
                  <span>Very confident</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What did you learn or struggle with today?
                </label>
                <textarea
                  value={state.reflectionNotes}
                  onChange={(e) => setState(prev => ({ ...prev, reflectionNotes: e.target.value }))}
                  placeholder="I learned... / I struggled with..."
                  className="w-full h-24 border border-gray-200 rounded-lg p-4 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={completeSession}
              className="w-full mt-6 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
            >
              Complete Session
            </button>
          </BlockCard>
        )}

        {/* Session Complete */}
        {state.currentBlock === 'complete' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Session Complete!
            </h2>
            <p className="text-gray-600 mb-6">
              Total time: {formatTime(state.elapsedSeconds)}
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
              <StatCard label="Review" value="✓" />
              <StatCard
                label="Practice"
                value={isAttemptCompleted ? `${state.attempt?.score?.overall ?? '—'}` : 'Skipped'}
              />
              <StatCard label="Confidence" value={`${state.reflectionConfidence}/5`} />
            </div>
            {state.problem && (
              <p className="text-sm text-gray-500 mb-6">
                Practiced: {state.problem.title} ({state.problem.pattern})
              </p>
            )}
            <Link
              href="/"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 inline-block"
            >
              Back to Home
            </Link>
          </div>
        )}
      </div>

      {/* Micro-lesson Modal */}
      <MicroLessonModal
        isOpen={microLesson !== null}
        title={microLesson?.title || ''}
        content={microLesson?.content || ''}
        onComplete={() => setMicroLesson(null)}
      />
    </main>
  );
}

function BlockIndicator({
  label,
  name,
  isActive,
  isComplete,
}: {
  label: string;
  name: string;
  isActive: boolean;
  isComplete: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          isComplete
            ? 'bg-green-600 text-white'
            : isActive
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-500'
        }`}
      >
        {isComplete ? '✓' : label}
      </div>
      <span className="text-xs text-gray-500 mt-1">{name}</span>
    </div>
  );
}

function TimeBlock({
  label,
  time,
  description,
}: {
  label: string;
  time: string;
  description: string;
}) {
  return (
    <div className="text-center p-3 bg-gray-50 rounded-lg">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-bold text-gray-900">{time}</div>
      <div className="text-xs text-gray-600">{description}</div>
    </div>
  );
}

function BlockCard({
  title,
  description,
  timeRemaining,
  progress,
  children,
}: {
  title: string;
  description: string;
  timeRemaining: number;
  progress: number;
  children: React.ReactNode;
}) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <span className={`font-mono text-lg ${timeRemaining < 30 ? 'text-red-600' : 'text-gray-600'}`}>
            {formatTime(timeRemaining)}
          </span>
        </div>
        <p className="text-gray-600 text-sm">{description}</p>
        <div className="mt-3 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-center">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
