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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-8 relative overflow-hidden">
      {/* Confetti Animation */}
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={true}
          numberOfPieces={300}
          gravity={0.2}
          colors={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899']}
        />
      )}

      {/* Success Card */}
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-xl text-center relative z-10 animate-fadeIn">
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
