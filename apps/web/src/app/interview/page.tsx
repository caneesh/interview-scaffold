'use client';

/**
 * Interview Mode page - simulates real interview conditions.
 * - Timer on
 * - Hints hidden by default
 * - Forced explanations (approach, invariant, complexity)
 * - Uses same rubric + scoring
 */

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

type InterviewStep =
  | 'pattern-selection'
  | 'approach'
  | 'invariant'
  | 'complexity'
  | 'code'
  | 'results';

interface InterviewState {
  step: InterviewStep;
  patternSelection: string;
  approach: string;
  invariant: string;
  complexity: string;
  code: string;
  startTime: number | null;
  elapsedSeconds: number;
  showHints: boolean;
}

export default function InterviewModePage() {
  const [state, setState] = useState<InterviewState>({
    step: 'pattern-selection',
    patternSelection: '',
    approach: '',
    invariant: '',
    complexity: '',
    code: '',
    startTime: null,
    elapsedSeconds: 0,
    showHints: false,
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

  const startInterview = useCallback(() => {
    setState(prev => ({
      ...prev,
      startTime: Date.now(),
    }));
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

  const steps: { id: InterviewStep; label: string; required: boolean }[] = [
    { id: 'pattern-selection', label: '1. Pattern Selection', required: true },
    { id: 'approach', label: '2. Approach', required: true },
    { id: 'invariant', label: '3. Invariant', required: true },
    { id: 'complexity', label: '4. Complexity', required: true },
    { id: 'code', label: '5. Code', required: true },
    { id: 'results', label: '6. Results', required: false },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === state.step);

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
          </div>

          <div className="flex items-center gap-6">
            {/* Timer */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Time:</span>
              <span className={`font-mono text-xl ${state.elapsedSeconds > 2700 ? 'text-red-500' : 'text-green-400'}`}>
                {formatTime(state.elapsedSeconds)}
              </span>
            </div>

            {/* Hints toggle */}
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
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-gray-800 border-b border-gray-700 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
              >
                <button
                  onClick={() => goToStep(step.id)}
                  disabled={index > currentStepIndex + 1}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    state.step === step.id
                      ? 'bg-blue-600 text-white'
                      : index < currentStepIndex
                        ? 'bg-green-700 text-white'
                        : 'bg-gray-700 text-gray-400'
                  } ${index > currentStepIndex + 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
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

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-8">
        {state.startTime === null ? (
          /* Start Screen */
          <div className="text-center py-16">
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
            </ul>
            <button
              onClick={startInterview}
              className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Interview
            </button>
          </div>
        ) : (
          /* Interview Steps */
          <div>
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
                {state.showHints && (
                  <div className="mt-4 p-4 bg-yellow-900/30 border border-yellow-600/30 rounded-lg">
                    <p className="text-yellow-400 text-sm">
                      💡 Hint: Consider the constraints. Look for keywords like "contiguous", "sorted", "pairs", etc.
                    </p>
                  </div>
                )}
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
                {state.showHints && (
                  <div className="mt-4 p-4 bg-yellow-900/30 border border-yellow-600/30 rounded-lg">
                    <p className="text-yellow-400 text-sm">
                      💡 Hint: Think about edge cases. What happens with empty input? Single element?
                    </p>
                  </div>
                )}
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
                description="Write your solution code."
                isLocked={true}
              >
                <textarea
                  value={state.code}
                  onChange={(e) => updateField('code', e.target.value)}
                  placeholder="def solution(arr):&#10;    # Your code here&#10;    pass"
                  className="w-full h-64 bg-gray-800 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-500 font-mono text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={() => goToStep('results')}
                  disabled={!state.code.trim()}
                  className="mt-6 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Solution
                </button>
              </StepCard>
            )}

            {state.step === 'results' && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-8">
                <div className="text-center mb-8">
                  <div className="text-5xl mb-4">🎉</div>
                  <h2 className="text-2xl font-bold mb-2">Interview Complete!</h2>
                  <p className="text-gray-400">
                    Total time: {formatTime(state.elapsedSeconds)}
                  </p>
                </div>

                <div className="space-y-4">
                  <ResultSection title="Pattern Selection" content={state.patternSelection} />
                  <ResultSection title="Approach" content={state.approach} />
                  <ResultSection title="Loop Invariant" content={state.invariant} />
                  <ResultSection title="Complexity Analysis" content={state.complexity} />
                  <ResultSection title="Code" content={state.code} isCode />
                </div>

                <div className="mt-8 text-center">
                  <Link
                    href="/"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            )}
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
