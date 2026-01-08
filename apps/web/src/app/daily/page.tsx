'use client';

/**
 * Daily Session page - 10-minute structured learning session.
 * Block A: 2-min spaced review drill
 * Block B: 6-min MEP-selected task
 * Block C: 2-min reflection
 */

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

type SessionBlock = 'not-started' | 'spaced-review' | 'mep-task' | 'reflection' | 'complete';

interface SessionState {
  currentBlock: SessionBlock;
  startTime: number | null;
  blockStartTime: number | null;
  elapsedSeconds: number;
  blockElapsedSeconds: number;
  reviewDrillAnswer: string | null;
  taskProgress: string;
  reflectionConfidence: number;
  reflectionNotes: string;
}

const BLOCK_DURATIONS = {
  'spaced-review': 120, // 2 minutes
  'mep-task': 360,      // 6 minutes
  'reflection': 120,    // 2 minutes
};

export default function DailySessionPage() {
  const [state, setState] = useState<SessionState>({
    currentBlock: 'not-started',
    startTime: null,
    blockStartTime: null,
    elapsedSeconds: 0,
    blockElapsedSeconds: 0,
    reviewDrillAnswer: null,
    taskProgress: '',
    reflectionConfidence: 3,
    reflectionNotes: '',
  });

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

  const advanceToNextBlock = useCallback(() => {
    const now = Date.now();
    setState(prev => {
      const nextBlock: SessionBlock =
        prev.currentBlock === 'spaced-review'
          ? 'mep-task'
          : prev.currentBlock === 'mep-task'
            ? 'reflection'
            : 'complete';

      return {
        ...prev,
        currentBlock: nextBlock,
        blockStartTime: now,
        blockElapsedSeconds: 0,
      };
    });
  }, []);

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

        {state.currentBlock === 'spaced-review' && (
          <BlockCard
            title="Block A: Spaced Review"
            description="Quick drill on previously learned patterns"
            timeRemaining={getBlockTimeRemaining()}
            progress={getBlockProgress()}
          >
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                Pattern: Sliding Window
              </h3>
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
              onClick={advanceToNextBlock}
              disabled={!state.reviewDrillAnswer}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Practice →
            </button>
          </BlockCard>
        )}

        {state.currentBlock === 'mep-task' && (
          <BlockCard
            title="Block B: Focused Practice"
            description="MEP-selected problem based on your progress"
            timeRemaining={getBlockTimeRemaining()}
            progress={getBlockProgress()}
          >
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                  Two Pointers
                </span>
                <span className="text-sm text-gray-500">Difficulty: Medium</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-3">
                Two Sum II - Input Array Is Sorted
              </h3>
              <p className="text-gray-700 mb-4">
                Given a 1-indexed array of integers that is already sorted in non-decreasing order, find two numbers such that they add up to a specific target number.
              </p>
              <textarea
                value={state.taskProgress}
                onChange={(e) => setState(prev => ({ ...prev, taskProgress: e.target.value }))}
                placeholder="Write your approach and solution here..."
                className="w-full h-40 border border-gray-200 rounded-lg p-4 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={advanceToNextBlock}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Continue to Reflection →
            </button>
          </BlockCard>
        )}

        {state.currentBlock === 'reflection' && (
          <BlockCard
            title="Block C: Reflection"
            description="Self-assessment and confidence rating"
            timeRemaining={getBlockTimeRemaining()}
            progress={getBlockProgress()}
          >
            <div className="space-y-6">
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
              onClick={advanceToNextBlock}
              className="w-full mt-6 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
            >
              Complete Session
            </button>
          </BlockCard>
        )}

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
              <StatCard label="Practice" value="✓" />
              <StatCard label="Confidence" value={`${state.reflectionConfidence}/5`} />
            </div>
            <Link
              href="/"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Back to Home
            </Link>
          </div>
        )}
      </div>
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
