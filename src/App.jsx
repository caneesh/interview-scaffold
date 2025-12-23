import { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { useScaffoldedLearning } from './hooks/useScaffoldedLearning';
import { sampleProblem } from './data/sampleProblem';

/**
 * Custom hook to get window dimensions for confetti
 */
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

/**
 * Difficulty badge component
 */
function DifficultyBadge({ difficulty }) {
  const colorClasses = {
    Easy: 'bg-green-100 text-green-800 border-green-200',
    Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Hard: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${colorClasses[difficulty] || colorClasses.Medium}`}>
      {difficulty}
    </span>
  );
}

/**
 * Progress bar component
 */
function ProgressBar({ progress, currentStep, totalSteps }) {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-600">Progress</span>
        <span className="text-sm font-medium text-gray-600">
          Step {currentStep} of {totalSteps}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Stepper navigation component with clickable completed steps for review mode
 * - Completed Steps: Green circle with checkmark (clickable)
 * - Current Step: Blue circle with step number
 * - Future Steps: Gray circle (disabled)
 * - Lines turn green when step is completed
 */
function Stepper({ steps, currentStepIndex, viewingStepIndex, isCompleted, onStepClick }) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-center gap-0">
        {steps.map((step, index) => {
          const isComplete = index < currentStepIndex || isCompleted;
          const isCurrent = index === currentStepIndex && !isCompleted;
          const isFuture = index > currentStepIndex;
          const isViewing = index === viewingStepIndex;
          const isClickable = isComplete; // Only completed steps are clickable

          return (
            <div key={step.stepId} className="flex items-center">
              {/* Step Circle */}
              <button
                onClick={() => isClickable && onStepClick(index)}
                disabled={!isClickable}
                className={`
                  relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                  transition-all duration-300 focus:outline-none
                  ${isComplete ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer shadow-md' : ''}
                  ${isCurrent ? 'bg-blue-600 text-white shadow-lg' : ''}
                  ${isFuture ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : ''}
                  ${isViewing && !isCurrent ? 'ring-4 ring-blue-300 ring-offset-2' : ''}
                  ${isCurrent ? 'ring-4 ring-blue-200' : ''}
                `}
                title={isComplete ? `Review Step ${index + 1}` : isCurrent ? 'Current Step' : 'Locked'}
              >
                {isComplete ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  index + 1
                )}
              </button>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    w-12 h-1 mx-1 rounded-full transition-all duration-500
                    ${index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Labels */}
      <div className="flex items-center justify-center gap-0 mt-2">
        {steps.map((step, index) => {
          const isComplete = index < currentStepIndex || isCompleted;
          const isCurrent = index === currentStepIndex && !isCompleted;

          return (
            <div key={`label-${step.stepId}`} className="flex items-center">
              <div className="w-10 text-center">
                <span className={`
                  text-xs font-medium
                  ${isComplete ? 'text-green-600' : ''}
                  ${isCurrent ? 'text-blue-600' : ''}
                  ${!isComplete && !isCurrent ? 'text-gray-400' : ''}
                `}>
                  {isComplete ? 'Done' : isCurrent ? 'Active' : 'Locked'}
                </span>
              </div>
              {index < steps.length - 1 && <div className="w-14" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Help & Hints section component with progressive hint reveal
 * hintLevel: 0 = no hints, 1 = first hint, 2 = second hint, etc.
 */
function HelpAndHints({ hints, hintLevel, hasMoreHints, onRevealNextHint }) {
  if (!hints || hints.length === 0) return null;

  // Show all hints with index < hintLevel
  const visibleHints = hints.slice(0, hintLevel);
  const hintsRemaining = hints.length - hintLevel;

  return (
    <div className="mt-6">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-800">Help & Hints</h3>
        <span className="text-sm text-gray-500">
          ({hintLevel}/{hints.length} revealed)
        </span>
      </div>

      {/* Revealed Hints */}
      {visibleHints.length > 0 && (
        <div className="space-y-3 mb-4">
          {visibleHints.map((hint, index) => (
            <div
              key={index}
              className="bg-amber-50 border border-amber-200 rounded-lg p-4 animate-fadeIn"
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-amber-200 text-amber-700 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <p className="text-amber-800">{hint}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reveal Next Hint Button or No More Hints Message */}
      <div className="flex items-center gap-4">
        {hasMoreHints ? (
          <>
            <button
              onClick={onRevealNextHint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium rounded-lg transition-colors border border-amber-300"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Reveal Next Hint
              <span className="text-amber-600 text-sm">({hintsRemaining} remaining)</span>
            </button>
            {/* Penalty Warning */}
            <span className="text-sm text-orange-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Using a hint adds 5 minutes to your time
            </span>
          </>
        ) : hintLevel > 0 ? (
          <div className="flex items-center gap-2 text-gray-500 bg-gray-100 px-4 py-2 rounded-lg">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">All hints revealed</span>
          </div>
        ) : (
          <button
            onClick={onRevealNextHint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium rounded-lg transition-colors border border-amber-300"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            Need Help? Reveal First Hint
            <span className="text-sm text-orange-600 flex items-center gap-1 ml-2">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              +5 min penalty
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Validation message component
 */
function ValidationMessage({ message, isError }) {
  if (!message) return null;

  return (
    <div
      className={`
        mt-4 p-4 rounded-lg flex items-center gap-3 animate-fadeIn
        ${isError ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}
      `}
    >
      {isError ? (
        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )}
      <span>{message}</span>
    </div>
  );
}

/**
 * Code editor component (simplified textarea)
 * Supports read-only mode for reviewing previous steps
 */
function CodeEditor({ code, onChange, placeholder, readOnly = false }) {
  return (
    <div className="h-full flex flex-col">
      <div className={`px-4 py-2 rounded-t-lg border-b ${readOnly ? 'bg-slate-700 border-slate-600' : 'bg-slate-800 border-slate-700'}`}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-3 text-slate-400 text-sm">solution.py</span>
          {readOnly && (
            <span className="ml-auto px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded">
              READ ONLY
            </span>
          )}
        </div>
      </div>
      <div className={`flex-1 rounded-b-lg overflow-hidden ${readOnly ? 'bg-slate-800' : 'bg-slate-900'}`}>
        <textarea
          value={code}
          onChange={(e) => !readOnly && onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`
            code-editor w-full h-full bg-transparent font-mono text-sm p-4 resize-none focus:outline-none
            ${readOnly
              ? 'text-slate-400 cursor-not-allowed'
              : 'text-green-400 focus:ring-2 focus:ring-blue-500 focus:ring-inset'
            }
          `}
          spellCheck="false"
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>
    </div>
  );
}

/**
 * Concept icon component - returns appropriate icon based on type
 */
function ConceptIcon({ icon, className = "w-5 h-5" }) {
  const icons = {
    pointers: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    ),
    cycle: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
      </svg>
    ),
    loop: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    ),
    memory: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path d="M13 7H7v6h6V7z" />
        <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
      </svg>
    ),
    default: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
      </svg>
    )
  };
  return icons[icon] || icons.default;
}

/**
 * Concept Lens - Collapsible panel for pattern recognition training
 * Shows concepts used and why this problem matches each pattern
 */
function ConceptLens({ concepts, patternExplanations, keyTakeaways }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('concepts');

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  return (
    <div className="mt-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-indigo-100/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-900 text-lg">Concept Lens</h3>
            <p className="text-sm text-indigo-600">Pattern recognition training</p>
          </div>
        </div>
        <svg
          className={`w-6 h-6 text-indigo-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-6 pb-6 animate-fadeIn">
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4 border-b border-indigo-200 pb-3">
            <button
              onClick={() => setActiveTab('concepts')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'concepts'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              Concepts Used
            </button>
            <button
              onClick={() => setActiveTab('why')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'why'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              Why This Pattern
            </button>
            <button
              onClick={() => setActiveTab('takeaways')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'takeaways'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              Key Takeaways
            </button>
          </div>

          {/* Concepts Tab */}
          {activeTab === 'concepts' && (
            <div className="space-y-3">
              {concepts?.map((concept, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${colorClasses[concept.color] || colorClasses.blue}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      concept.color === 'blue' ? 'bg-blue-200' :
                      concept.color === 'purple' ? 'bg-purple-200' :
                      concept.color === 'green' ? 'bg-green-200' :
                      'bg-amber-200'
                    }`}>
                      <ConceptIcon icon={concept.icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{concept.name}</h4>
                      <p className="text-sm opacity-80 mt-1">{concept.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Why This Pattern Tab */}
          {activeTab === 'why' && (
            <div className="space-y-4">
              {patternExplanations?.map((item, index) => (
                <div key={index} className="bg-white rounded-xl p-4 border border-indigo-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-sm font-medium">
                      {item.pattern}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-2">
                    <span className="font-medium text-gray-900">Why: </span>
                    {item.reason}
                  </p>
                  <div className="flex items-start gap-2 bg-gradient-to-r from-yellow-50 to-amber-50 p-3 rounded-lg border border-amber-200">
                    <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                    </svg>
                    <p className="text-amber-800 text-sm">
                      <span className="font-medium">Insight: </span>
                      {item.insight}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Key Takeaways Tab */}
          {activeTab === 'takeaways' && (
            <div className="bg-white rounded-xl p-5 border border-indigo-100 shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                </svg>
                Remember for Future Problems
              </h4>
              <ul className="space-y-3">
                {keyTakeaways?.map((takeaway, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                      {index + 1}
                    </span>
                    <p className="text-gray-700">{takeaway}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pattern Recognition Quiz - Transfer Learning Component
 * Helps users identify similar problems that use the same core patterns
 */
function PatternQuiz({ quiz }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selections, setSelections] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!quiz || !quiz.problems) return null;

  const toggleSelection = (problemId) => {
    if (isSubmitted) return;
    setSelections(prev => ({
      ...prev,
      [problemId]: !prev[problemId]
    }));
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setSelections({});
    setIsSubmitted(false);
  };

  // Calculate score
  const calculateScore = () => {
    let correct = 0;
    quiz.problems.forEach(problem => {
      const userSelected = selections[problem.id] || false;
      if (userSelected === problem.usesSamePattern) {
        correct++;
      }
    });
    return correct;
  };

  const score = isSubmitted ? calculateScore() : 0;
  const totalProblems = quiz.problems.length;

  const difficultyColors = {
    Easy: 'bg-green-100 text-green-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Hard: 'bg-red-100 text-red-700',
  };

  return (
    <div className="mt-6 bg-gradient-to-br from-cyan-50 to-teal-50 rounded-2xl border border-cyan-200 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-cyan-100/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-900 text-lg">Pattern Recognition Quiz</h3>
            <p className="text-sm text-cyan-600">Test your transfer learning skills</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isSubmitted && (
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              score === totalProblems ? 'bg-green-100 text-green-700' :
              score >= totalProblems / 2 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {score}/{totalProblems}
            </span>
          )}
          <svg
            className={`w-6 h-6 text-cyan-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-6 pb-6 animate-fadeIn">
          {/* Question */}
          <div className="bg-white rounded-xl p-4 mb-4 border border-cyan-100 shadow-sm">
            <p className="text-gray-800 font-medium">{quiz.question}</p>
            <p className="text-sm text-gray-500 mt-1">Select all problems that apply, then submit to check your answers.</p>
          </div>

          {/* Problem List */}
          <div className="space-y-3 mb-4">
            {quiz.problems.map((problem) => {
              const isSelected = selections[problem.id] || false;
              const isCorrect = isSubmitted && (isSelected === problem.usesSamePattern);
              const isWrong = isSubmitted && (isSelected !== problem.usesSamePattern);

              return (
                <div
                  key={problem.id}
                  className={`
                    rounded-xl border-2 transition-all duration-200 overflow-hidden
                    ${isSubmitted
                      ? isCorrect
                        ? 'border-green-300 bg-green-50'
                        : 'border-red-300 bg-red-50'
                      : isSelected
                        ? 'border-cyan-400 bg-cyan-50'
                        : 'border-gray-200 bg-white hover:border-cyan-300'
                    }
                  `}
                >
                  {/* Problem Header - Clickable */}
                  <button
                    onClick={() => toggleSelection(problem.id)}
                    disabled={isSubmitted}
                    className={`w-full p-4 text-left flex items-start gap-3 ${isSubmitted ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {/* Checkbox */}
                    <div className={`
                      flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center mt-0.5 transition-all
                      ${isSubmitted
                        ? isCorrect
                          ? 'bg-green-500 border-green-500'
                          : 'bg-red-500 border-red-500'
                        : isSelected
                          ? 'bg-cyan-500 border-cyan-500'
                          : 'border-gray-300 bg-white'
                      }
                    `}>
                      {isSelected && !isSubmitted && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {isSubmitted && isCorrect && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {isSubmitted && isWrong && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>

                    {/* Problem Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{problem.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${difficultyColors[problem.difficulty]}`}>
                          {problem.difficulty}
                        </span>
                        {isSubmitted && problem.usesSamePattern && (
                          <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded text-xs font-medium">
                            Same Pattern
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{problem.description}</p>
                    </div>
                  </button>

                  {/* Explanation - Only shown after submission */}
                  {isSubmitted && (
                    <div className={`px-4 pb-4 pt-0 ml-9 animate-fadeIn`}>
                      <div className={`p-3 rounded-lg ${
                        problem.usesSamePattern ? 'bg-cyan-100/50' : 'bg-gray-100'
                      }`}>
                        <div className="flex items-start gap-2">
                          <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                            problem.usesSamePattern ? 'text-cyan-600' : 'text-gray-500'
                          }`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                          </svg>
                          <p className={`text-sm ${
                            problem.usesSamePattern ? 'text-cyan-800' : 'text-gray-700'
                          }`}>
                            {problem.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit/Reset Button */}
          {!isSubmitted ? (
            <button
              onClick={handleSubmit}
              className="w-full py-3 px-6 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-teal-600 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Check My Answers
            </button>
          ) : (
            <div className="space-y-3">
              {/* Score Summary */}
              <div className={`p-4 rounded-xl text-center ${
                score === totalProblems ? 'bg-green-100 border border-green-200' :
                score >= totalProblems / 2 ? 'bg-yellow-100 border border-yellow-200' :
                'bg-red-100 border border-red-200'
              }`}>
                <p className={`text-lg font-bold ${
                  score === totalProblems ? 'text-green-700' :
                  score >= totalProblems / 2 ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  {score === totalProblems ? '🎯 Perfect! You\'ve mastered this pattern!' :
                   score >= totalProblems / 2 ? '👍 Good job! Review the explanations to solidify your understanding.' :
                   '📚 Keep learning! Read the explanations carefully.'}
                </p>
              </div>

              {/* Try Again Button */}
              <button
                onClick={handleReset}
                className="w-full py-3 px-6 bg-white text-cyan-600 font-semibold rounded-xl border-2 border-cyan-200 hover:bg-cyan-50 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pattern Graph Node Icon - renders appropriate icon for each pattern type
 */
function PatternNodeIcon({ icon, className = "w-4 h-4" }) {
  const icons = {
    tree: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
      </svg>
    ),
    pointers: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    ),
    speed: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
      </svg>
    ),
    cycle: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
      </svg>
    ),
    target: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12zm0-2a4 4 0 100-8 4 4 0 000 8zm0-2a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
      </svg>
    ),
    lock: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
      </svg>
    ),
    check: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ),
    star: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ),
    window: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm1 0v12h12V4H4z" clipRule="evenodd" />
        <path d="M7 8h6v4H7V8z" />
      </svg>
    ),
    search: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
      </svg>
    ),
    graph: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
      </svg>
    ),
    table: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
      </svg>
    ),
    stack: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 4.5A2.5 2.5 0 014.5 2h11A2.5 2.5 0 0118 4.5v.75H2v-.75zM2 7h16v2H2V7zm0 4h16v2H2v-2zm0 4h16v.5a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 012 15.5V15z" />
      </svg>
    ),
    default: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
      </svg>
    )
  };
  return icons[icon] || icons.default;
}

/**
 * Pattern Graph - Visual DAG showing pattern hierarchy and progress
 * Helps users understand where they are in the learning journey
 */
function PatternGraph({ patternGraph }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

  if (!patternGraph || !patternGraph.nodes) return null;

  const { nodes, currentPath, unlocks } = patternGraph;

  const colorClasses = {
    blue: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700', fill: 'bg-blue-500' },
    purple: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700', fill: 'bg-purple-500' },
    green: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700', fill: 'bg-green-500' },
    amber: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700', fill: 'bg-amber-500' },
    teal: { bg: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-700', fill: 'bg-teal-500' },
    orange: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700', fill: 'bg-orange-500' },
    pink: { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-700', fill: 'bg-pink-500' },
    red: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', fill: 'bg-red-500' },
    indigo: { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-700', fill: 'bg-indigo-500' },
  };

  // Render a single node in the tree
  const renderNode = (nodeId, depth = 0) => {
    const node = nodes[nodeId];
    if (!node) return null;

    const isInPath = currentPath.includes(nodeId);
    const isCurrent = node.isCurrent;
    const willUnlock = unlocks?.includes(nodeId);
    const colors = colorClasses[node.color] || colorClasses.blue;

    return (
      <div key={nodeId} className="relative">
        {/* Node */}
        <button
          onClick={() => setSelectedNode(selectedNode === nodeId ? null : nodeId)}
          className={`
            w-full text-left p-3 rounded-xl border-2 transition-all duration-200 mb-2
            ${node.isUnlocked
              ? isCurrent
                ? `${colors.bg} ${colors.border} ring-2 ring-offset-2 ring-purple-400`
                : isInPath
                  ? `${colors.bg} ${colors.border}`
                  : 'bg-white border-gray-200 hover:border-gray-300'
              : 'bg-gray-50 border-gray-200 opacity-60'
            }
            ${willUnlock ? 'ring-2 ring-green-300 ring-offset-1' : ''}
          `}
        >
          <div className="flex items-center gap-3">
            {/* Status Icon */}
            <div className={`
              w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
              ${node.isUnlocked
                ? isCurrent
                  ? colors.fill + ' text-white'
                  : isInPath
                    ? colors.fill + ' text-white'
                    : 'bg-gray-200 text-gray-500'
                : 'bg-gray-200 text-gray-400'
              }
              ${willUnlock ? 'bg-green-500 text-white' : ''}
            `}>
              {!node.isUnlocked && !willUnlock ? (
                <PatternNodeIcon icon="lock" className="w-4 h-4" />
              ) : isCurrent ? (
                <PatternNodeIcon icon="star" className="w-4 h-4" />
              ) : isInPath || willUnlock ? (
                <PatternNodeIcon icon="check" className="w-4 h-4" />
              ) : (
                <PatternNodeIcon icon={node.icon} className="w-4 h-4" />
              )}
            </div>

            {/* Node Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={`font-semibold text-sm ${node.isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                  {node.name}
                </h4>
                {isCurrent && (
                  <span className="px-2 py-0.5 bg-purple-500 text-white text-xs font-bold rounded-full">
                    CURRENT
                  </span>
                )}
                {willUnlock && (
                  <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full animate-pulse">
                    UNLOCKED!
                  </span>
                )}
              </div>
              {selectedNode === nodeId && (
                <p className={`text-xs mt-1 ${node.isUnlocked ? 'text-gray-600' : 'text-gray-400'}`}>
                  {node.description}
                </p>
              )}
            </div>

            {/* Expand indicator if has children */}
            {node.children && node.children.length > 0 && (
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${selectedNode === nodeId ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </button>

        {/* Children */}
        {node.children && node.children.length > 0 && (selectedNode === nodeId || currentPath.includes(nodeId) || node.children.some(c => currentPath.includes(c))) && (
          <div className="ml-6 pl-4 border-l-2 border-gray-200">
            {node.children.map(childId => renderNode(childId, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Get the top-level patterns (children of root)
  const topLevelPatterns = nodes.root?.children || [];

  return (
    <div className="mt-6 bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-100/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-gray-700 rounded-xl flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-900 text-lg">Pattern Map</h3>
            <p className="text-sm text-slate-600">Your structured learning path</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">{currentPath.length} patterns mastered</span>
            <div className="flex -space-x-1">
              {currentPath.slice(0, 3).map((pathNode, i) => (
                <div
                  key={pathNode}
                  className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-xs ${colorClasses[nodes[pathNode]?.color]?.fill || 'bg-gray-400'}`}
                >
                  <PatternNodeIcon icon="check" className="w-3 h-3" />
                </div>
              ))}
            </div>
          </div>
          <svg
            className={`w-6 h-6 text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-6 pb-6 animate-fadeIn">
          {/* Current Path Breadcrumb */}
          <div className="bg-white rounded-xl p-4 mb-4 border border-slate-200">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Current Learning Path</p>
            <div className="flex items-center gap-2 flex-wrap">
              {currentPath.map((nodeId, index) => (
                <div key={nodeId} className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium ${colorClasses[nodes[nodeId]?.color]?.bg} ${colorClasses[nodes[nodeId]?.color]?.text}`}>
                    {nodes[nodeId]?.name}
                  </span>
                  {index < currentPath.length - 1 && (
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Unlocked Patterns */}
          {unlocks && unlocks.length > 0 && (
            <div className="bg-green-50 rounded-xl p-4 mb-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                <p className="text-green-800 font-semibold">New Patterns Unlocked!</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {unlocks.map(nodeId => (
                  <span key={nodeId} className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                    {nodes[nodeId]?.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pattern Tree */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">All Patterns</p>
            {topLevelPatterns.map(patternId => renderNode(patternId))}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Legend</p>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded flex items-center justify-center">
                  <PatternNodeIcon icon="star" className="w-3 h-3 text-white" />
                </div>
                <span className="text-gray-600">Current</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded flex items-center justify-center">
                  <PatternNodeIcon icon="check" className="w-3 h-3 text-white" />
                </div>
                <span className="text-gray-600">Mastered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded flex items-center justify-center">
                  <PatternNodeIcon icon="check" className="w-3 h-3 text-white" />
                </div>
                <span className="text-gray-600">Just Unlocked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded flex items-center justify-center">
                  <PatternNodeIcon icon="lock" className="w-3 h-3 text-gray-400" />
                </div>
                <span className="text-gray-600">Locked</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * MistakeChallenge - Mistake-Centered Learning component
 * Shows buggy code or wrong approaches for users to critique and debug
 */
function MistakeChallenge({ mistakeAnalysis }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [showExplanation, setShowExplanation] = useState(false);

  if (!mistakeAnalysis || !mistakeAnalysis.challenges || mistakeAnalysis.challenges.length === 0) {
    return null;
  }

  const { challenges, learningOutcomes } = mistakeAnalysis;
  const currentChallenge = challenges[currentChallengeIndex];
  const isCorrect = selectedAnswer === currentChallenge.correctAnswer;
  const selectedOption = currentChallenge.options.find(opt => opt.id === selectedAnswer);

  const handleSubmit = () => {
    if (selectedAnswer) {
      setHasSubmitted(true);
      if (!completedChallenges.includes(currentChallengeIndex)) {
        setCompletedChallenges([...completedChallenges, currentChallengeIndex]);
      }
    }
  };

  const handleNextChallenge = () => {
    if (currentChallengeIndex < challenges.length - 1) {
      setCurrentChallengeIndex(currentChallengeIndex + 1);
      setSelectedAnswer(null);
      setHasSubmitted(false);
      setShowExplanation(false);
    }
  };

  const handlePrevChallenge = () => {
    if (currentChallengeIndex > 0) {
      setCurrentChallengeIndex(currentChallengeIndex - 1);
      setSelectedAnswer(null);
      setHasSubmitted(false);
      setShowExplanation(false);
    }
  };

  // Get the badge color based on challenge type
  const getTypeBadge = (type) => {
    switch (type) {
      case 'buggy-code':
        return { text: 'Buggy Code', bg: 'bg-red-100', color: 'text-red-700', border: 'border-red-200' };
      case 'wrong-approach':
        return { text: 'Wrong Approach', bg: 'bg-amber-100', color: 'text-amber-700', border: 'border-amber-200' };
      case 'subtle-bug':
        return { text: 'Subtle Bug', bg: 'bg-purple-100', color: 'text-purple-700', border: 'border-purple-200' };
      default:
        return { text: 'Challenge', bg: 'bg-gray-100', color: 'text-gray-700', border: 'border-gray-200' };
    }
  };

  const typeBadge = getTypeBadge(currentChallenge.type);

  return (
    <div className="mt-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-200 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-red-100/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-900 text-lg">Debug Challenge</h3>
            <p className="text-sm text-red-600">Find the bugs in other candidates' solutions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
            {completedChallenges.length}/{challenges.length} completed
          </span>
          <svg
            className={`w-6 h-6 text-red-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-6 pb-6 animate-fadeIn">
          {/* Challenge Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevChallenge}
              disabled={currentChallengeIndex === 0}
              className={`px-3 py-1.5 rounded-lg font-medium text-sm flex items-center gap-1 ${
                currentChallengeIndex === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Previous
            </button>
            <span className="text-sm text-gray-600 font-medium">
              Challenge {currentChallengeIndex + 1} of {challenges.length}
            </span>
            <button
              onClick={handleNextChallenge}
              disabled={currentChallengeIndex === challenges.length - 1}
              className={`px-3 py-1.5 rounded-lg font-medium text-sm flex items-center gap-1 ${
                currentChallengeIndex === challenges.length - 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Next
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Challenge Card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Challenge Header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-gray-900">{currentChallenge.title}</h4>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${typeBadge.bg} ${typeBadge.color} ${typeBadge.border} border`}>
                  {typeBadge.text}
                </span>
              </div>
              <p className="text-gray-600 text-sm">{currentChallenge.scenario}</p>
            </div>

            {/* Code Display */}
            <div className="bg-slate-900 rounded-lg m-4 overflow-hidden">
              <div className="px-4 py-2 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-3 text-slate-400 text-sm">candidate_solution.py</span>
                </div>
              </div>
              <pre className="p-4 text-sm font-mono text-green-400 overflow-x-auto">
                <code>{currentChallenge.code}</code>
              </pre>
            </div>

            {/* Options */}
            <div className="p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 mb-3">What is the flaw in this code?</p>
              {currentChallenge.options.map((option) => {
                const isSelected = selectedAnswer === option.id;
                const showResult = hasSubmitted && isSelected;
                const isOptionCorrect = option.isCorrect;

                return (
                  <button
                    key={option.id}
                    onClick={() => !hasSubmitted && setSelectedAnswer(option.id)}
                    disabled={hasSubmitted}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                      hasSubmitted
                        ? isSelected
                          ? isOptionCorrect
                            ? 'border-green-500 bg-green-50'
                            : 'border-red-500 bg-red-50'
                          : option.isCorrect
                            ? 'border-green-300 bg-green-50/50'
                            : 'border-gray-200 bg-gray-50 opacity-60'
                        : isSelected
                          ? 'border-red-400 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        hasSubmitted
                          ? isSelected
                            ? isOptionCorrect
                              ? 'border-green-500 bg-green-500'
                              : 'border-red-500 bg-red-500'
                            : option.isCorrect
                              ? 'border-green-400 bg-green-400'
                              : 'border-gray-300'
                          : isSelected
                            ? 'border-red-400 bg-red-400'
                            : 'border-gray-300'
                      }`}>
                        {hasSubmitted && (isSelected || option.isCorrect) && (
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            {(isSelected && isOptionCorrect) || (!isSelected && option.isCorrect) ? (
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            ) : (
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            )}
                          </svg>
                        )}
                        {!hasSubmitted && isSelected && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${hasSubmitted && isSelected && !isOptionCorrect ? 'text-red-700' : 'text-gray-800'}`}>
                          {option.text}
                        </p>
                        {/* Show feedback after submission */}
                        {hasSubmitted && isSelected && (
                          <p className={`mt-2 text-sm ${isOptionCorrect ? 'text-green-600' : 'text-red-600'}`}>
                            {option.feedback}
                          </p>
                        )}
                        {hasSubmitted && !isSelected && option.isCorrect && (
                          <p className="mt-2 text-sm text-green-600">
                            {option.feedback}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Submit / Continue Button */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              {!hasSubmitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={!selectedAnswer}
                  className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                    selectedAnswer
                      ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-700 hover:to-orange-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Submit Answer
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Toggle detailed explanation */}
                  <button
                    onClick={() => setShowExplanation(!showExplanation)}
                    className="w-full py-3 rounded-xl font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {showExplanation ? 'Hide' : 'Show'} Detailed Explanation
                  </button>

                  {/* Next challenge button */}
                  {currentChallengeIndex < challenges.length - 1 && (
                    <button
                      onClick={handleNextChallenge}
                      className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                      Next Challenge
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Detailed Explanation */}
            {showExplanation && currentChallenge.detailedExplanation && (
              <div className="p-4 border-t border-gray-100 bg-amber-50 animate-fadeIn">
                <h5 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Deep Dive
                </h5>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="font-semibold text-red-700 mb-1">What Went Wrong:</p>
                    <p className="text-gray-700">{currentChallenge.detailedExplanation.whatWentWrong}</p>
                  </div>
                  {currentChallenge.detailedExplanation.testCase && (
                    <div>
                      <p className="font-semibold text-blue-700 mb-1">Test Case:</p>
                      <p className="text-gray-700 font-mono text-xs bg-white p-2 rounded border border-gray-200">
                        {currentChallenge.detailedExplanation.testCase}
                      </p>
                    </div>
                  )}
                  {currentChallenge.detailedExplanation.correctFix && (
                    <div>
                      <p className="font-semibold text-green-700 mb-1">Correct Fix:</p>
                      <p className="text-gray-700 font-mono text-xs bg-white p-2 rounded border border-gray-200">
                        {currentChallenge.detailedExplanation.correctFix}
                      </p>
                    </div>
                  )}
                  {currentChallenge.detailedExplanation.whyNotOptimal && (
                    <div>
                      <p className="font-semibold text-amber-700 mb-1">Why It's Not Optimal:</p>
                      <p className="text-gray-700">{currentChallenge.detailedExplanation.whyNotOptimal}</p>
                    </div>
                  )}
                  {currentChallenge.detailedExplanation.optimalAlternative && (
                    <div>
                      <p className="font-semibold text-green-700 mb-1">Optimal Alternative:</p>
                      <p className="text-gray-700">{currentChallenge.detailedExplanation.optimalAlternative}</p>
                    </div>
                  )}
                  <div className="bg-indigo-100 rounded-lg p-3 border border-indigo-200">
                    <p className="font-semibold text-indigo-700 mb-1">Key Lesson:</p>
                    <p className="text-indigo-900">{currentChallenge.detailedExplanation.lesson}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Learning Outcomes Summary (shown after all challenges completed) */}
          {completedChallenges.length === challenges.length && learningOutcomes && (
            <div className="mt-4 bg-white rounded-xl border border-green-200 p-4 animate-fadeIn">
              <h5 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                What You Learned
              </h5>
              <ul className="space-y-2">
                {learningOutcomes.map((outcome, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {outcome}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Approach Icon - renders icon for each interview approach option
 */
function ApproachIcon({ icon, className = "w-6 h-6" }) {
  const icons = {
    brute: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    ),
    hash: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.94l1-4H9.03z" clipRule="evenodd" />
      </svg>
    ),
    pointers: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    ),
    sort: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
      </svg>
    ),
    recursion: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
      </svg>
    ),
    dp: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
      </svg>
    ),
    default: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
    )
  };
  return icons[icon] || icons.default;
}

/**
 * Interview Simulation - "What Would You Try First?" Mode
 * Forces users to think about approach before coding
 */
function InterviewSimulation({
  problem,
  interviewQuestion,
  selectedApproach,
  interviewSubmitted,
  interviewFeedback,
  isInterviewCorrect,
  isInterviewPartiallyCorrect,
  onSelectApproach,
  onSubmit,
  onProceed
}) {
  if (!interviewQuestion) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Interview Mode</h1>
              <p className="text-violet-200 text-sm">Think before you code</p>
            </div>
          </div>
        </div>

        {/* Problem Context */}
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs font-semibold rounded">
              {problem.difficulty}
            </span>
            <h2 className="font-semibold text-gray-900">{problem.title}</h2>
          </div>
          <p className="text-gray-600 text-sm">{problem.description}</p>
        </div>

        {/* Question */}
        <div className="px-8 py-6">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-violet-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">{interviewQuestion.prompt}</p>
              <p className="text-sm text-gray-500 mt-1">{interviewQuestion.hint}</p>
            </div>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {interviewQuestion.options.map((option) => {
              const isSelected = selectedApproach === option.id;
              const showResult = interviewSubmitted && isSelected;
              const isCorrect = option.isCorrect;
              const isPartial = option.isPartiallyCorrect;

              return (
                <button
                  key={option.id}
                  onClick={() => !interviewSubmitted && onSelectApproach(option.id)}
                  disabled={interviewSubmitted}
                  className={`
                    p-4 rounded-xl border-2 text-left transition-all duration-200
                    ${interviewSubmitted
                      ? isSelected
                        ? isCorrect
                          ? 'border-green-400 bg-green-50'
                          : isPartial
                            ? 'border-amber-400 bg-amber-50'
                            : 'border-red-400 bg-red-50'
                        : 'border-gray-200 bg-gray-50 opacity-50'
                      : isSelected
                        ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-200'
                        : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center
                      ${interviewSubmitted && isSelected
                        ? isCorrect
                          ? 'bg-green-200 text-green-700'
                          : isPartial
                            ? 'bg-amber-200 text-amber-700'
                            : 'bg-red-200 text-red-700'
                        : isSelected
                          ? 'bg-violet-200 text-violet-700'
                          : 'bg-gray-100 text-gray-500'
                      }
                    `}>
                      <ApproachIcon icon={option.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                          {option.label}
                        </span>
                        {showResult && (
                          isCorrect ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">OPTIMAL</span>
                          ) : isPartial ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">VALID</span>
                          ) : null
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{option.description}</p>
                    </div>
                    {isSelected && !interviewSubmitted && (
                      <svg className="w-5 h-5 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Submit Button (before submission) */}
          {!interviewSubmitted && (
            <button
              onClick={onSubmit}
              disabled={!selectedApproach}
              className={`
                w-full py-3 px-6 rounded-xl font-semibold text-lg transition-all duration-200
                flex items-center justify-center gap-2
                ${selectedApproach
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
              </svg>
              Lock In My Answer
            </button>
          )}

          {/* Feedback (after submission) */}
          {interviewSubmitted && interviewFeedback && (
            <div className="animate-fadeIn">
              {/* Result Banner */}
              <div className={`
                p-4 rounded-xl mb-4
                ${isInterviewCorrect
                  ? 'bg-green-100 border border-green-200'
                  : isInterviewPartiallyCorrect
                    ? 'bg-amber-100 border border-amber-200'
                    : 'bg-red-100 border border-red-200'
                }
              `}>
                <div className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${isInterviewCorrect
                      ? 'bg-green-500 text-white'
                      : isInterviewPartiallyCorrect
                        ? 'bg-amber-500 text-white'
                        : 'bg-red-500 text-white'
                    }
                  `}>
                    {isInterviewCorrect ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : isInterviewPartiallyCorrect ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className={`font-bold text-lg ${
                      isInterviewCorrect ? 'text-green-800' :
                      isInterviewPartiallyCorrect ? 'text-amber-800' :
                      'text-red-800'
                    }`}>
                      {interviewFeedback.title}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Detailed Feedback */}
              <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                <div>
                  <p className="text-gray-700">{interviewFeedback.explanation}</p>
                </div>

                {interviewFeedback.whyYes && (
                  <div className="flex items-start gap-2 bg-green-50 p-3 rounded-lg">
                    <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-green-800 text-sm"><span className="font-semibold">Why this works: </span>{interviewFeedback.whyYes}</p>
                  </div>
                )}

                {interviewFeedback.whyNot && (
                  <div className="flex items-start gap-2 bg-red-50 p-3 rounded-lg">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-red-800 text-sm"><span className="font-semibold">Why not optimal: </span>{interviewFeedback.whyNot}</p>
                  </div>
                )}

                {interviewFeedback.betterApproach && (
                  <div className="flex items-start gap-2 bg-violet-50 p-3 rounded-lg">
                    <svg className="w-5 h-5 text-violet-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                    </svg>
                    <p className="text-violet-800 text-sm"><span className="font-semibold">Think about: </span>{interviewFeedback.betterApproach}</p>
                  </div>
                )}

                {interviewFeedback.interviewTip && (
                  <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-blue-800 text-sm"><span className="font-semibold">Interview Tip: </span>{interviewFeedback.interviewTip}</p>
                  </div>
                )}

                {interviewFeedback.partialCredit && (
                  <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-lg">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <p className="text-amber-800 text-sm">{interviewFeedback.partialCredit}</p>
                  </div>
                )}
              </div>

              {/* Proceed Button */}
              <button
                onClick={onProceed}
                className="w-full mt-6 py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold text-lg rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                {isInterviewCorrect ? "Let's Code It!" : "Learn By Coding"}
              </button>
            </div>
          )}
        </div>

        {/* Interview Context Footer */}
        {!interviewSubmitted && interviewQuestion.interviewContext && (
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              <span className="font-semibold">Pro tip:</span> {interviewQuestion.interviewContext.whatInterviewerWants}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Victory/Completion screen component with confetti celebration
 */
function CompletionScreen({ problem, totalSteps, totalHintsUsed, onReset }) {
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(true);

  // Stop confetti after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  // Calculate performance rating based on hints used
  const getPerformanceRating = () => {
    if (totalHintsUsed === 0) return { label: 'Perfect!', emoji: '🏆', color: 'text-yellow-500' };
    if (totalHintsUsed <= 2) return { label: 'Excellent!', emoji: '🌟', color: 'text-green-500' };
    if (totalHintsUsed <= 5) return { label: 'Great Job!', emoji: '👏', color: 'text-blue-500' };
    return { label: 'Well Done!', emoji: '✅', color: 'text-gray-600' };
  };

  const rating = getPerformanceRating();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-start justify-center p-8 relative overflow-auto">
      {/* Confetti Animation */}
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={true}
          numberOfPieces={300}
          gravity={0.2}
          colors={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899']}
          style={{ position: 'fixed', top: 0, left: 0 }}
        />
      )}

      {/* Success Card */}
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-2xl w-full text-center relative z-10 animate-fadeIn my-8">
        {/* Trophy Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <svg className="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          {/* Decorative rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 border-4 border-yellow-200 rounded-full animate-ping opacity-30"></div>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Problem Solved!
        </h1>
        <p className={`text-2xl font-semibold ${rating.color} mb-2`}>
          {rating.emoji} {rating.label}
        </p>
        <p className="text-gray-600 mb-8">
          You successfully completed "{problem.title}"
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-4">
            <div className="text-3xl font-bold text-green-600">{totalSteps}</div>
            <div className="text-sm text-green-700 font-medium">Steps Completed</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-yellow-100 rounded-xl p-4">
            <div className="text-3xl font-bold text-amber-600">{totalHintsUsed}</div>
            <div className="text-sm text-amber-700 font-medium">Hints Used</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-4">
            <div className="text-3xl font-bold text-blue-600">
              {totalHintsUsed === 0 ? '100' : Math.max(0, 100 - (totalHintsUsed * 10))}%
            </div>
            <div className="text-sm text-blue-700 font-medium">Score</div>
          </div>
        </div>

        {/* Concept Lens - Pattern Recognition Training */}
        <ConceptLens
          concepts={problem.concepts}
          patternExplanations={problem.patternExplanations}
          keyTakeaways={problem.keyTakeaways}
        />

        {/* Pattern Recognition Quiz - Transfer Learning */}
        <PatternQuiz quiz={problem.patternQuiz} />

        {/* Pattern Map - Global DAG */}
        <PatternGraph patternGraph={problem.patternGraph} />

        {/* Mistake-Centered Learning - Debug Challenge */}
        <MistakeChallenge mistakeAnalysis={problem.mistakeAnalysis} />

        {/* Restart Button */}
        <button
          onClick={onReset}
          className="w-full py-4 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-lg rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          Restart Problem
        </button>
      </div>
    </div>
  );
}

/**
 * Left panel - Problem information and instructions
 * Supports review mode showing instructions for the viewed step
 */
function LeftPanel({
  problem,
  viewingStep,
  currentStepIndex,
  totalSteps,
  progress,
  hintLevel,
  hasMoreHints,
  revealNextHint,
  validationMessage,
  isValidationError,
  isReviewMode,
}) {
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-900">{problem.title}</h1>
          <DifficultyBadge difficulty={problem.difficulty} />
        </div>
        <p className="text-gray-600">{problem.description}</p>
      </div>

      {/* Progress */}
      <div className="px-6 pt-6">
        <ProgressBar
          progress={progress}
          currentStep={currentStepIndex + 1}
          totalSteps={totalSteps}
        />
      </div>

      {/* Current step instruction */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Review Mode Indicator */}
        {isReviewMode && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-amber-800 font-medium">Reviewing Step {viewingStep.stepId}</p>
              <p className="text-amber-700 text-sm">
                You're reviewing a completed step. Your current progress is on Step {currentStepIndex + 1}.
              </p>
            </div>
          </div>
        )}

        <div className={`rounded-lg p-5 ${isReviewMode ? 'bg-gray-50 border border-gray-200' : 'bg-blue-50 border border-blue-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2.5 py-1 text-white text-sm font-medium rounded ${isReviewMode ? 'bg-gray-500' : 'bg-blue-600'}`}>
              Step {viewingStep.stepId}
            </span>
            {isReviewMode && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                Completed
              </span>
            )}
          </div>
          <p className="text-gray-800 leading-relaxed">
            {viewingStep.instruction}
          </p>
        </div>

        {/* Help & Hints section - show in review mode to see what hints were used */}
        <HelpAndHints
          hints={viewingStep.hints}
          hintLevel={hintLevel}
          hasMoreHints={hasMoreHints}
          onRevealNextHint={revealNextHint}
        />

        {/* Validation message - only show when not in review mode */}
        {!isReviewMode && (
          <ValidationMessage
            message={validationMessage}
            isError={isValidationError}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Right panel - Code editor
 * Supports review mode with read-only editor and "Return to Current Step" button
 */
function RightPanel({
  userCode,
  updateCode,
  submitStep,
  isLastStep,
  viewingStep,
  isReviewMode,
  currentStepIndex,
  returnToCurrentStep,
}) {
  return (
    <div className="h-full flex flex-col bg-slate-800 p-6">
      {/* Review Mode Banner */}
      {isReviewMode && (
        <div className="mb-4 bg-amber-500/20 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-amber-400 font-medium">Review Mode</p>
              <p className="text-amber-400/70 text-sm">
                Viewing your completed solution for Step {viewingStep.stepId}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Editor header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white mb-1">
          {isReviewMode ? 'Your Completed Solution' : 'Your Solution'}
        </h2>
        <p className="text-slate-400 text-sm">
          {isReviewMode
            ? `This is the code you wrote for Step ${viewingStep.stepId}`
            : `Write your code below to complete Step ${viewingStep.stepId}`
          }
        </p>
      </div>

      {/* Code editor */}
      <div className="flex-1 mb-4">
        <CodeEditor
          code={userCode}
          onChange={updateCode}
          placeholder={viewingStep.placeholderCode}
          readOnly={isReviewMode}
        />
      </div>

      {/* Action buttons */}
      {isReviewMode ? (
        <button
          onClick={returnToCurrentStep}
          className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Return to Current Step (Step {currentStepIndex + 1})
        </button>
      ) : (
        <button
          onClick={submitStep}
          className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
        >
          {isLastStep ? (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Complete Problem
            </>
          ) : (
            <>
              Submit Step
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </>
          )}
        </button>
      )}
    </div>
  );
}

/**
 * Main App component - Scaffolded Learning Application
 */
function App() {
  const {
    // Interview state
    hasInterviewQuestion,
    isInterviewComplete,
    selectedApproach,
    interviewSubmitted,
    interviewFeedback,
    isInterviewCorrect,
    isInterviewPartiallyCorrect,
    interviewQuestion,
    // Interview actions
    selectApproach,
    submitInterview,
    proceedToCoding,
    // Coding state
    currentStepIndex,
    viewingStepIndex,
    viewingStep,
    userCode,
    isReviewMode,
    hintLevel,
    hasMoreHints,
    totalHintsUsed,
    validationMessage,
    isValidationError,
    isCompleted,
    totalSteps,
    isLastStep,
    progress,
    // Coding actions
    updateCode,
    revealNextHint,
    submitStep,
    viewStep,
    returnToCurrentStep,
    resetProblem,
  } = useScaffoldedLearning(sampleProblem);

  // Show completion screen when problem is completed
  if (isCompleted) {
    return (
      <CompletionScreen
        problem={sampleProblem}
        totalSteps={totalSteps}
        totalHintsUsed={totalHintsUsed}
        onReset={resetProblem}
      />
    );
  }

  // Show interview simulation if not yet completed
  if (hasInterviewQuestion && !isInterviewComplete) {
    return (
      <InterviewSimulation
        problem={sampleProblem}
        interviewQuestion={interviewQuestion}
        selectedApproach={selectedApproach}
        interviewSubmitted={interviewSubmitted}
        interviewFeedback={interviewFeedback}
        isInterviewCorrect={isInterviewCorrect}
        isInterviewPartiallyCorrect={isInterviewPartiallyCorrect}
        onSelectApproach={selectApproach}
        onSubmit={submitInterview}
        onProceed={proceedToCoding}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top navigation bar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">Scaffolded Learning</span>
          </div>
          <button
            onClick={resetProblem}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Reset
          </button>
        </div>
      </nav>

      {/* Stepper Navigation - Visual Progress Bar */}
      <Stepper
        steps={sampleProblem.steps}
        currentStepIndex={currentStepIndex}
        viewingStepIndex={viewingStepIndex}
        isCompleted={isCompleted}
        onStepClick={viewStep}
      />

      {/* Main content - Split screen layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Problem & Instructions */}
        <div className="w-1/2 border-r border-gray-200 overflow-hidden">
          <LeftPanel
            problem={sampleProblem}
            viewingStep={viewingStep}
            currentStepIndex={currentStepIndex}
            totalSteps={totalSteps}
            progress={progress}
            hintLevel={hintLevel}
            hasMoreHints={hasMoreHints}
            revealNextHint={revealNextHint}
            validationMessage={validationMessage}
            isValidationError={isValidationError}
            isReviewMode={isReviewMode}
          />
        </div>

        {/* Right Panel - Code Editor */}
        <div className="w-1/2 overflow-hidden">
          <RightPanel
            userCode={userCode}
            updateCode={updateCode}
            submitStep={submitStep}
            isLastStep={isLastStep}
            viewingStep={viewingStep}
            isReviewMode={isReviewMode}
            currentStepIndex={currentStepIndex}
            returnToCurrentStep={returnToCurrentStep}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
