import { useState } from 'react';

/**
 * StrategyCard - Expandable card with inline pattern help
 * Shows "When to use", "Watch out for", and example
 */

export function StrategyCard({
  strategy,
  isSelected,
  onSelect,
  showExpandByDefault = false
}) {
  const [isExpanded, setIsExpanded] = useState(showExpandByDefault);

  const handleCardClick = () => {
    onSelect(strategy.id);
  };

  const handleExpandClick = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className={`
        rounded-xl border-2 transition-all duration-200 overflow-hidden
        ${isSelected
          ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200'
          : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
        }
      `}
    >
      {/* Main card content - clickable to select */}
      <button
        onClick={handleCardClick}
        className="w-full p-4 text-left focus:outline-none focus-visible:ring-2
                   focus-visible:ring-blue-500 focus-visible:ring-inset"
        aria-pressed={isSelected}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`
            w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0
            ${isSelected
              ? 'bg-blue-200'
              : 'bg-gray-100'
            }
          `}>
            {strategy.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                {strategy.name}
              </h4>
              {isSelected && (
                <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-xs font-medium rounded-full">
                  Selected
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {strategy.oneLiner}
            </p>
          </div>

          {/* Selection indicator */}
          <div className={`
            w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
            ${isSelected
              ? 'border-blue-500 bg-blue-500'
              : 'border-gray-300'
            }
          `}>
            {isSelected && (
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
      </button>

      {/* Expand toggle */}
      <button
        onClick={handleExpandClick}
        className="w-full px-4 py-2.5 text-sm font-medium border-t border-gray-100
                   flex items-center justify-center gap-1.5 transition-colors
                   text-blue-600 hover:bg-blue-50 focus:outline-none focus-visible:bg-blue-50"
      >
        {isExpanded ? (
          <>
            <span>Hide details</span>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </>
        ) : (
          <>
            <span>When to use this?</span>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 space-y-4 border-t border-gray-100 bg-gray-50">
          {/* When to use */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <span>📍</span> When to use
            </h5>
            <ul className="text-sm text-gray-600 space-y-1.5">
              {strategy.whenToUse.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Common traps */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <span>🚨</span> Watch out for
            </h5>
            <ul className="text-sm text-gray-600 space-y-1.5">
              {strategy.commonTraps.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick example */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <span>💡</span> Quick example
            </h5>
            <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
              {strategy.example}
            </p>
          </div>

          {/* Complexity info */}
          <div className="flex gap-4 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>⏱️</span>
              <span>Time: <code className="bg-gray-200 px-1 rounded">{strategy.timeComplexity}</code></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>💾</span>
              <span>Space: <code className="bg-gray-200 px-1 rounded">{strategy.spaceComplexity}</code></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StrategyCard;
