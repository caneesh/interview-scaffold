import { useState } from 'react';
import { StrategyCard } from './StrategyCard';
import { HintDrawer } from './HintDrawer';

/**
 * StrategyShortlist - Shows narrowed down strategies (2-3 options)
 * with reasoning explanation and hint system
 */

export function StrategyShortlist({
  strategies,
  selectedStrategy,
  onSelect,
  onContinue,
  onBack,
  reasoning,
  hints = [],
  hintsUsed = 0,
  onRevealHint
}) {
  const [showCompare, setShowCompare] = useState(false);

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-lg">🎯</span>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">
            Based on your reasoning, these strategies fit best:
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {reasoning || "Select the one you think works best for this problem."}
          </p>
        </div>
      </div>

      {/* Strategy cards */}
      <div className="space-y-3">
        {strategies.map((strategy) => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            isSelected={selectedStrategy === strategy.id}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Compare toggle (only if 2 strategies) */}
      {strategies.length === 2 && (
        <button
          onClick={() => setShowCompare(!showCompare)}
          className="w-full text-center text-sm text-blue-600 hover:text-blue-700
                     py-2 hover:bg-blue-50 rounded-lg transition-all
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {showCompare ? 'Hide comparison' : 'Compare these strategies side-by-side'}
        </button>
      )}

      {/* Side-by-side comparison */}
      {showCompare && strategies.length === 2 && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h4 className="font-medium text-gray-700 mb-4 text-center">Key Differences</h4>
          <div className="grid grid-cols-2 gap-4">
            {strategies.map((strategy) => (
              <div key={strategy.id} className="space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <span className="text-xl">{strategy.icon}</span>
                  <span className="font-medium text-gray-900">{strategy.name}</span>
                </div>
                <div className="text-xs space-y-2">
                  <div>
                    <span className="text-gray-500">Time:</span>
                    <code className="ml-1 bg-gray-200 px-1 rounded">{strategy.timeComplexity}</code>
                  </div>
                  <div>
                    <span className="text-gray-500">Space:</span>
                    <code className="ml-1 bg-gray-200 px-1 rounded">{strategy.spaceComplexity}</code>
                  </div>
                  <div className="pt-1">
                    <span className="text-gray-500">Key insight:</span>
                    <p className="text-gray-700 mt-1">{strategy.keyInsight}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hint drawer */}
      {hints.length > 0 && (
        <HintDrawer
          hints={hints}
          hintsUsed={hintsUsed}
          onRevealHint={onRevealHint}
        />
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="px-4 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-100
                     transition-all duration-200 focus:outline-none focus-visible:ring-2
                     focus-visible:ring-gray-500 focus-visible:ring-offset-2"
        >
          ← Reconsider
        </button>
        <button
          onClick={onContinue}
          disabled={!selectedStrategy}
          className={`
            flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-200
            flex items-center justify-center gap-2
            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
            ${selectedStrategy
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg focus-visible:ring-blue-500'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <span>Explain my choice</span>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default StrategyShortlist;
