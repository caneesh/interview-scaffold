'use client';

/**
 * Interview Mode page - simulates real interview conditions.
 * - Timer on
 * - Hints hidden by default (but available from problem data)
 * - Forced explanations (approach, invariant, complexity)
 * - Backend connected: fetches problem, executes code, shows results
 */

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { TestResults } from '@/components/TestResults';
import { LLMFeedback } from '@/components/LLMFeedback';

type InterviewStep =
  | 'not-started'
  | 'pattern-selection'
  | 'approach'
  | 'invariant'
  | 'complexity'
  | 'code'
  | 'results';

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

interface InterviewState {
  // Step management
  step: InterviewStep;

  // User answers
  patternSelection: string;
  approach: string;
  invariant: string;
  complexity: string;
  code: string;
  language: string;

  // Timer
  startTime: number | null;
  elapsedSeconds: number;

  // UI state
  showHints: boolean;
  currentHintIndex: number;
  problemCollapsed: boolean;

  // Backend integration
  problem: Problem | null;
  attemptId: string | null;
  attempt: Attempt | null;
  testResults: TestResult[];
  validation: ValidationData | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
}

export default function InterviewModePage() {
  const [state, setState] = useState<InterviewState>({
    step: 'not-started',
    patternSelection: '',
    approach: '',
    invariant: '',
    complexity: '',
    code: '',
    language: 'python',
    startTime: null,
    elapsedSeconds: 0,
    showHints: false,
    currentHintIndex: 0,
    problemCollapsed: false,
    problem: null,
    attemptId: null,
    attempt: null,
    testResults: [],
    validation: null,
    loading: false,
    submitting: false,
    error: null,
  });

  // Timer logic
  useEffect(() => {
    if (state.startTime === null) return;

    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        elapsedSeconds: Math.floor((Date.now() - (prev.startTime ?? Date.now())) / 1000),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [state.startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start interview and fetch problem
  const startInterview = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch('/api/problems/next');
      const data = await res.json();

      if (data.error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: data.error.message || 'Failed to load problem',
        }));
        return;
      }

      if (!data.problem) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'No problems available. Please seed the database with problems first.',
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        problem: data.problem,
        step: 'pattern-selection',
        startTime: Date.now(),
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Network error. Please check your connection.',
      }));
    }
  }, []);

  const goToStep = useCallback((step: InterviewStep) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  const updateField = useCallback((field: keyof InterviewState, value: string) => {
    setState(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleHints = useCallback(() => {
    setState(prev => ({ ...prev, showHints: !prev.showHints }));
  }, []);

  const showNextHint = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentHintIndex: Math.min(prev.currentHintIndex + 1, (prev.problem?.hints.length ?? 1) - 1),
    }));
  }, []);

  // Submit solution: create attempt, submit thinking gate, submit code
  const submitSolution = useCallback(async () => {
    if (!state.problem) return;

    setState(prev => ({ ...prev, submitting: true, error: null }));

    try {
      // Step 1: Start attempt
      const attemptRes = await fetch('/api/attempts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId: state.problem.id }),
      });

      const attemptData = await attemptRes.json();

      if (attemptData.error) {
        setState(prev => ({
          ...prev,
          submitting: false,
          error: attemptData.error.message || 'Failed to start attempt',
        }));
        return;
      }

      const attemptId = attemptData.attempt.id;

      // Step 2: Submit thinking gate
      const thinkingGateRes = await fetch(`/api/attempts/${attemptId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepType: 'THINKING_GATE',
          selectedPattern: state.patternSelection,
          statedInvariant: state.invariant,
          statedComplexity: state.complexity,
        }),
      });

      const thinkingGateData = await thinkingGateRes.json();

      if (thinkingGateData.error) {
        setState(prev => ({
          ...prev,
          submitting: false,
          error: thinkingGateData.error.message || 'Failed to submit thinking gate',
        }));
        return;
      }

      // Step 3: Submit code
      const codeRes = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: state.code,
          language: state.language,
        }),
      });

      const codeData = await codeRes.json();

      if (codeData.error) {
        setState(prev => ({
          ...prev,
          submitting: false,
          error: codeData.error.message || 'Failed to submit code',
        }));
        return;
      }

      // Success - transition to results
      setState(prev => ({
        ...prev,
        submitting: false,
        attemptId,
        attempt: codeData.attempt,
        testResults: codeData.testResults || [],
        validation: codeData.validation ?? null,
        step: 'results',
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        submitting: false,
        error: 'Network error. Please check your connection.',
      }));
    }
  }, [state.problem, state.patternSelection, state.invariant, state.complexity, state.code, state.language]);

  const steps: { id: InterviewStep; label: string; required: boolean }[] = [
    { id: 'pattern-selection', label: '1. Pattern', required: true },
    { id: 'approach', label: '2. Approach', required: true },
    { id: 'invariant', label: '3. Invariant', required: true },
    { id: 'complexity', label: '4. Complexity', required: true },
    { id: 'code', label: '5. Code', required: true },
    { id: 'results', label: '6. Results', required: false },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === state.step);
  const allTestsPassed = state.testResults.length > 0 && state.testResults.every(t => t.passed);

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      {/* Header with Timer */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-gray-400 hover:text-white"
            >
              &larr; Exit
            </Link>
            <h1 className="text-xl font-bold">Interview Mode</h1>
            {state.problem && (
              <span className="px-2 py-1 bg-blue-600/30 text-blue-300 text-sm rounded">
                {state.problem.pattern} • Rung {state.problem.rung}
              </span>
            )}
          </div>

          <div className="flex items-center gap-6">
            {/* Timer */}
            {state.startTime && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Time:</span>
                <span className={`font-mono text-xl ${state.elapsedSeconds > 2700 ? 'text-red-500' : 'text-green-400'}`}>
                  {formatTime(state.elapsedSeconds)}
                </span>
              </div>
            )}

            {/* Hints toggle */}
            {state.problem && state.step !== 'not-started' && state.step !== 'results' && (
              <button
                onClick={toggleHints}
                className={`px-3 py-1 rounded text-sm ${
                  state.showHints
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                Hints {state.showHints ? 'ON' : 'OFF'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      {state.step !== 'not-started' && (
        <div className="bg-gray-800 border-b border-gray-700 py-4">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
                >
                  <button
                    onClick={() => index <= currentStepIndex && goToStep(step.id)}
                    disabled={index > currentStepIndex}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      state.step === step.id
                        ? 'bg-blue-600 text-white'
                        : index < currentStepIndex
                          ? 'bg-green-700 text-white cursor-pointer'
                          : 'bg-gray-700 text-gray-400'
                    } ${index > currentStepIndex ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {step.label}
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      index < currentStepIndex ? 'bg-green-600' : 'bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-8">
        {/* Not Started - Start Screen */}
        {state.step === 'not-started' && (
          <div className="text-center py-16">
            {state.loading ? (
              <>
                <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-2xl font-bold mb-4">Loading your interview problem...</h2>
              </>
            ) : state.error ? (
              <>
                <div className="text-6xl mb-6">⚠️</div>
                <h2 className="text-2xl font-bold mb-4 text-red-400">Failed to Load Problem</h2>
                <p className="text-gray-400 mb-8">{state.error}</p>
                <button
                  onClick={startInterview}
                  className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </>
            ) : (
              <>
                <div className="text-6xl mb-6">🎯</div>
                <h2 className="text-3xl font-bold mb-4">Ready for Interview Mode?</h2>
                <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                  This simulates real interview conditions:
                </p>
                <ul className="text-gray-400 mb-8 max-w-md mx-auto text-left list-disc list-inside">
                  <li>Timer is always running</li>
                  <li>Hints are hidden by default</li>
                  <li>You must explain your approach</li>
                  <li>You must identify loop invariants</li>
                  <li>You must analyze complexity</li>
                  <li>Your code will be executed and graded</li>
                </ul>
                <button
                  onClick={startInterview}
                  className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start Interview
                </button>
              </>
            )}
          </div>
        )}

        {/* Problem Statement (shown throughout interview) */}
        {state.problem && state.step !== 'not-started' && state.step !== 'results' && (
          <div className="mb-6">
            <div
              className="bg-gray-800 rounded-lg border border-gray-700 cursor-pointer"
              onClick={() => setState(prev => ({ ...prev, problemCollapsed: !prev.problemCollapsed }))}
            >
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">{state.problem.title}</h3>
                  <p className="text-sm text-gray-400">
                    Target: {state.problem.targetComplexity}
                  </p>
                </div>
                <span className="text-gray-400">
                  {state.problemCollapsed ? '▼ Show' : '▲ Hide'}
                </span>
              </div>
              {!state.problemCollapsed && (
                <div className="px-4 pb-4 border-t border-gray-700 pt-4">
                  <div className="prose prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-gray-300 text-sm">
                      {state.problem.statement}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Hints Panel (when enabled) */}
            {state.showHints && state.problem.hints.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-900/30 border border-yellow-600/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-yellow-400 font-semibold">
                    Hint {state.currentHintIndex + 1} of {state.problem.hints.length}
                  </span>
                  {state.currentHintIndex < state.problem.hints.length - 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); showNextHint(); }}
                      className="text-sm text-yellow-400 hover:text-yellow-300"
                    >
                      Next Hint →
                    </button>
                  )}
                </div>
                <p className="text-yellow-200 text-sm">
                  💡 {state.problem.hints[state.currentHintIndex]}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Interview Steps */}
        {state.step === 'pattern-selection' && (
          <StepCard
            title="Step 1: Pattern Selection"
            description="What pattern do you think applies to this problem? This locks after submission."
            isLocked={false}
          >
            <textarea
              value={state.patternSelection}
              onChange={(e) => updateField('patternSelection', e.target.value)}
              placeholder="I think this problem uses the [pattern] pattern because..."
              className="w-full h-32 bg-gray-800 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={() => goToStep('approach')}
              disabled={!state.patternSelection.trim()}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Lock & Continue →
            </button>
          </StepCard>
        )}

        {state.step === 'approach' && (
          <StepCard
            title="Step 2: Approach"
            description="Explain your approach to solving this problem. Be specific about your strategy."
            isLocked={true}
            previousValue={state.patternSelection}
            previousLabel="Pattern Selection"
          >
            <textarea
              value={state.approach}
              onChange={(e) => updateField('approach', e.target.value)}
              placeholder="My approach is to use [pattern] by...&#10;&#10;1. First, I will...&#10;2. Then, I will...&#10;3. Finally, I will..."
              className="w-full h-48 bg-gray-800 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={() => goToStep('invariant')}
              disabled={!state.approach.trim()}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          </StepCard>
        )}

        {state.step === 'invariant' && (
          <StepCard
            title="Step 3: Loop Invariant"
            description="What invariant does your main loop maintain? This is crucial for correctness."
            isLocked={true}
          >
            <textarea
              value={state.invariant}
              onChange={(e) => updateField('invariant', e.target.value)}
              placeholder="At the start of each iteration of the loop:&#10;- [property 1]&#10;- [property 2]&#10;&#10;This invariant ensures..."
              className="w-full h-40 bg-gray-800 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={() => goToStep('complexity')}
              disabled={!state.invariant.trim()}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          </StepCard>
        )}

        {state.step === 'complexity' && (
          <StepCard
            title="Step 4: Complexity Analysis"
            description="Analyze the time and space complexity of your solution."
            isLocked={true}
          >
            <textarea
              value={state.complexity}
              onChange={(e) => updateField('complexity', e.target.value)}
              placeholder="Time Complexity: O(?)&#10;Explanation: Each element is visited at most...&#10;&#10;Space Complexity: O(?)&#10;Explanation: We use..."
              className="w-full h-40 bg-gray-800 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={() => goToStep('code')}
              disabled={!state.complexity.trim()}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          </StepCard>
        )}

        {state.step === 'code' && (
          <StepCard
            title="Step 5: Implementation"
            description="Write your solution code. When you submit, it will be executed against test cases."
            isLocked={true}
          >
            {/* Language selector */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 mr-2">Language:</label>
              <select
                value={state.language}
                onChange={(e) => updateField('language', e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
              </select>
            </div>

            <textarea
              value={state.code}
              onChange={(e) => updateField('code', e.target.value)}
              placeholder={state.language === 'python'
                ? "def solution(arr):\n    # Your code here\n    pass"
                : "function solution(arr) {\n    // Your code here\n}"}
              className="w-full h-64 bg-gray-800 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-500 font-mono text-sm focus:border-blue-500 focus:outline-none"
            />

            {state.error && (
              <div className="mt-4 p-4 bg-red-900/30 border border-red-600/30 rounded-lg">
                <p className="text-red-400">{state.error}</p>
              </div>
            )}

            <button
              onClick={submitSolution}
              disabled={!state.code.trim() || state.submitting}
              className="mt-6 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {state.submitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Submitting...
                </>
              ) : (
                'Submit Solution'
              )}
            </button>
          </StepCard>
        )}

        {/* Results */}
        {state.step === 'results' && (
          <div className="space-y-6">
            {/* Score Banner */}
            <div className={`rounded-lg border p-6 text-center ${
              allTestsPassed
                ? 'bg-green-900/30 border-green-600/30'
                : 'bg-yellow-900/30 border-yellow-600/30'
            }`}>
              <div className="text-5xl mb-4">{allTestsPassed ? '🎉' : '📝'}</div>
              <h2 className="text-2xl font-bold mb-2">
                {allTestsPassed ? 'Interview Complete!' : 'Interview Submitted'}
              </h2>
              <p className="text-gray-400">
                Total time: {formatTime(state.elapsedSeconds)}
              </p>

              {/* Score breakdown */}
              {state.attempt?.score && (
                <div className="mt-6 grid grid-cols-5 gap-4 max-w-lg mx-auto">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{state.attempt.score.overall}</div>
                    <div className="text-xs text-gray-400">Overall</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-300">{state.attempt.score.patternRecognition}</div>
                    <div className="text-xs text-gray-400">Pattern</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-300">{state.attempt.score.implementation}</div>
                    <div className="text-xs text-gray-400">Code</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-300">{state.attempt.score.edgeCases}</div>
                    <div className="text-xs text-gray-400">Edge Cases</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-300">{state.attempt.score.efficiency}</div>
                    <div className="text-xs text-gray-400">Efficiency</div>
                  </div>
                </div>
              )}
            </div>

            {/* Test Results */}
            {state.testResults.length > 0 && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-bold mb-4">Test Results</h3>
                <TestResults results={state.testResults} />
              </div>
            )}

            {/* LLM Feedback */}
            {state.validation?.llmFeedback && state.validation.llmConfidence !== undefined && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <LLMFeedback
                  feedback={state.validation.llmFeedback}
                  confidence={state.validation.llmConfidence}
                  grade={state.validation.rubricGrade}
                  microLessonId={state.validation.microLessonId}
                />
              </div>
            )}

            {/* Your Answers */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-bold mb-4">Your Interview Answers</h3>
              <div className="space-y-4">
                <ResultSection title="Pattern Selection" content={state.patternSelection} />
                <ResultSection title="Approach" content={state.approach} />
                <ResultSection title="Loop Invariant" content={state.invariant} />
                <ResultSection title="Complexity Analysis" content={state.complexity} />
                <ResultSection title="Code" content={state.code} isCode />
              </div>
            </div>

            {/* Problem info */}
            {state.problem && (
              <div className="text-center text-sm text-gray-400">
                Problem: {state.problem.title} ({state.problem.pattern})
              </div>
            )}

            <div className="text-center">
              <Link
                href="/"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 inline-block"
              >
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StepCard({
  title,
  description,
  children,
  isLocked,
  previousValue,
  previousLabel,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  isLocked: boolean;
  previousValue?: string;
  previousLabel?: string;
}) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-gray-400 mt-1">{description}</p>
        </div>
        {isLocked && (
          <span className="px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded">
            🔒 Previous steps locked
          </span>
        )}
      </div>

      {previousValue && previousLabel && (
        <div className="mb-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
          <p className="text-xs text-gray-400 mb-1">{previousLabel} (locked):</p>
          <p className="text-sm text-gray-300">{previousValue}</p>
        </div>
      )}

      {children}
    </div>
  );
}

function ResultSection({
  title,
  content,
  isCode = false,
}: {
  title: string;
  content: string;
  isCode?: boolean;
}) {
  return (
    <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
      <h3 className="text-sm font-semibold text-gray-400 mb-2">{title}</h3>
      <pre className={`text-gray-200 whitespace-pre-wrap ${isCode ? 'font-mono text-sm' : ''}`}>
        {content}
      </pre>
    </div>
  );
}
