import { CONFIDENCE_LEVELS } from './types';

/**
 * ExplanationGate - Requires user to explain their reasoning before proceeding
 * Includes confidence level selection
 */

export function ExplanationGate({
  selectedStrategy,
  explanation,
  confidence,
  onExplanationChange,
  onConfidenceChange,
  onSubmit,
  onBack,
  minLength = 50
}) {
  const charCount = explanation.length;
  const isValidLength = charCount >= minLength;
  const isValid = isValidLength && confidence !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-xl">{selectedStrategy.icon}</span>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">
            Why {selectedStrategy.name}?
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Explain your reasoning in 2-3 sentences. This builds interview skills!
          </p>
        </div>
      </div>

      {/* Explanation textarea */}
      <div>
        <label htmlFor="explanation" className="sr-only">Your explanation</label>
        <textarea
          id="explanation"
          value={explanation}
          onChange={(e) => onExplanationChange(e.target.value)}
          placeholder="I chose this strategy because the problem involves... and this approach helps by..."
          className="w-full h-32 p-4 border-2 border-gray-200 rounded-xl text-gray-800 resize-none
                     placeholder:text-gray-400 transition-all duration-200
                     focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
        <div className="flex justify-between items-center mt-2 text-xs">
          <span className={`flex items-center gap-1 ${isValidLength ? 'text-green-600' : 'text-amber-600'}`}>
            {isValidLength ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {charCount}/{minLength} characters minimum
          </span>
          <span className="text-gray-400">Be specific about the problem</span>
        </div>
      </div>

      {/* Confidence selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          How confident are you in this choice?
        </label>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(CONFIDENCE_LEVELS).map(([level, config]) => (
            <button
              key={level}
              onClick={() => onConfidenceChange(level)}
              className={`
                py-3 px-3 rounded-xl text-sm font-medium transition-all duration-200
                flex flex-col items-center gap-1
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                ${confidence === level
                  ? level === 'low'
                    ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300 focus-visible:ring-amber-500'
                    : level === 'medium'
                      ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300 focus-visible:ring-blue-500'
                      : 'bg-green-100 text-green-700 ring-2 ring-green-300 focus-visible:ring-green-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 focus-visible:ring-gray-500'
                }
              `}
            >
              <span className="text-lg">{config.emoji}</span>
              <span>{config.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Helper text based on confidence */}
      {confidence && (
        <div className={`
          p-3 rounded-lg text-sm
          ${confidence === 'low'
            ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : confidence === 'medium'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }
        `}>
          {confidence === 'low' && (
            <p>That's okay! Reasoning through uncertainty is a valuable skill. I'll provide extra guidance.</p>
          )}
          {confidence === 'medium' && (
            <p>Good! Let's validate your thinking together.</p>
          )}
          {confidence === 'high' && (
            <p>Great! Let's see if your reasoning holds up.</p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="px-4 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-100
                     transition-all duration-200 focus:outline-none focus-visible:ring-2
                     focus-visible:ring-gray-500 focus-visible:ring-offset-2"
        >
          ← Change strategy
        </button>
        <button
          onClick={onSubmit}
          disabled={!isValid}
          className={`
            flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-200
            flex items-center justify-center gap-2
            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
            ${isValid
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg focus-visible:ring-blue-500'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <span>Continue</span>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default ExplanationGate;
