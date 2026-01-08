/**
 * WizardQuestion - Single question screen in the Socratic flow
 * Uses coaching language and progressive disclosure
 */

export function WizardQuestion({
  question,
  selectedOption,
  onSelect,
  onBack,
  questionNumber,
  totalQuestions
}) {
  return (
    <div className="space-y-6">
      {/* Coaching intro */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-lg">💭</span>
        </div>
        <p className="text-gray-500 text-sm italic pt-1">
          {question.coachingIntro}
        </p>
      </div>

      {/* Question */}
      <h3 className="text-xl font-semibold text-gray-900">
        {question.prompt}
      </h3>

      {/* Options */}
      <div className="space-y-3" role="radiogroup" aria-label={question.prompt}>
        {question.options.map((option) => {
          const isSelected = selectedOption === option.id;

          return (
            <button
              key={option.id}
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(option.id)}
              className={`
                w-full p-4 rounded-xl border-2 text-left transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-center gap-3">
                {/* Radio circle */}
                <div className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                  ${isSelected
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                  }
                `}>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>

                {/* Label and description */}
                <div className="flex-1">
                  <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>
                    {option.label}
                  </span>
                  {option.description && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {option.description}
                    </p>
                  )}
                </div>

                {/* Arrow indicator when selected */}
                {isSelected && (
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        {onBack ? (
          <button
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1
                       focus:outline-none focus-visible:underline"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back
          </button>
        ) : (
          <div />
        )}

        <span className="text-sm text-gray-400">
          Question {questionNumber} of {totalQuestions}
        </span>
      </div>
    </div>
  );
}

export default WizardQuestion;
