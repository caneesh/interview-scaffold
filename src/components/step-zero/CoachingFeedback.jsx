import { COACHING_FEEDBACK } from './types';

/**
 * CoachingFeedback - Non-judgmental feedback based on selection and confidence
 * Replaces CORRECT/INCORRECT with coaching language
 */

export function CoachingFeedback({
  selectedStrategy,
  correctStrategy,
  confidence,
  explanation,
  strategies,
  onContinue,
  onTryAgain
}) {
  const isCorrect = selectedStrategy === correctStrategy;
  const selected = strategies.find(s => s.id === selectedStrategy);
  const correct = strategies.find(s => s.id === correctStrategy);

  // Determine feedback type and generate message
  const getFeedback = () => {
    if (isCorrect) {
      // Correct answer
      if (confidence === 'low') {
        return {
          type: 'optimal',
          title: "Trust your instincts!",
          message: `You picked ${selected.name} even while uncertain — and it's the right call! This pattern works well because the problem involves a sorted array where we need O(1) space.`,
          showDeepDive: true,
          encouragement: "Your intuition is developing nicely. Let's reinforce why this works.",
        };
      }
      if (confidence === 'medium') {
        return {
          type: 'optimal',
          title: "Solid reasoning!",
          message: `${selected.name} is exactly right. Your thinking about the problem constraints led you to a great solution.`,
          showDeepDive: false,
          encouragement: "You're building strong pattern recognition skills.",
        };
      }
      return {
        type: 'optimal',
        title: "Exactly right!",
        message: `${selected.name} is the optimal approach here. Your confidence is well-placed.`,
        showDeepDive: false,
        encouragement: "Ready to implement!",
      };
    } else {
      // Incorrect answer
      if (confidence === 'high') {
        return {
          type: 'mismatch',
          title: "Interesting reasoning...",
          message: `I can see why you'd think ${selected.name} works here. It's a valid strategy in many cases! However, for this specific problem, ${correct.name} is more efficient because we can leverage the sorted property of the input.`,
          showComparison: true,
          encouragement: "Let's explore the difference between these approaches.",
        };
      }
      if (confidence === 'low') {
        return {
          type: 'mismatch',
          title: "Good instinct to be cautious!",
          message: `${selected.name} is a reasonable thought, but there's a better fit. Since the array is sorted and we need O(1) space, ${correct.name} gives us the efficiency we need.`,
          showHint: true,
          encouragement: "Being uncertain here shows good self-awareness. Let's learn together.",
        };
      }
      return {
        type: 'mismatch',
        title: "Let's think about this differently",
        message: `${selected.name} could work, but ${correct.name} is more optimal for this problem. The key insight is that we can use the sorted property to avoid extra space.`,
        showComparison: true,
        encouragement: "This is exactly how we build pattern recognition — through exploration.",
      };
    }
  };

  const feedback = getFeedback();
  const config = COACHING_FEEDBACK[feedback.type];

  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: 'bg-emerald-200 text-emerald-700',
      title: 'text-emerald-800',
      text: 'text-emerald-700',
      button: 'from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'bg-amber-200 text-amber-700',
      title: 'text-amber-800',
      text: 'text-amber-700',
      button: 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'bg-blue-200 text-blue-700',
      title: 'text-blue-800',
      text: 'text-blue-700',
      button: 'from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700',
    },
  };

  const colors = colorClasses[config.color];

  return (
    <div className="space-y-6">
      {/* Feedback card */}
      <div className={`rounded-xl p-6 border ${colors.bg} ${colors.border}`}>
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${colors.icon}`}>
            {isCorrect ? (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className={`font-bold text-xl mb-2 ${colors.title}`}>
              {feedback.title}
            </h3>
            <p className={`mb-3 ${colors.text}`}>
              {feedback.message}
            </p>
            <p className={`text-sm italic ${colors.text} opacity-80`}>
              {feedback.encouragement}
            </p>
          </div>
        </div>
      </div>

      {/* Comparison view (when showing wrong answer with high confidence) */}
      {feedback.showComparison && !isCorrect && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h4 className="font-medium text-gray-700 mb-4 text-center">
            Why {correct.name} works better here
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {/* Selected (wrong) */}
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                <span className="text-lg">{selected.icon}</span>
                <span className="font-medium text-gray-600 text-sm">{selected.name}</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Your choice</span>
              </div>
              <p className="text-xs text-gray-600">{selected.keyInsight}</p>
            </div>

            {/* Correct */}
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-emerald-100">
                <span className="text-lg">{correct.icon}</span>
                <span className="font-medium text-emerald-700 text-sm">{correct.name}</span>
                <span className="text-xs bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded">Better fit</span>
              </div>
              <p className="text-xs text-emerald-700">{correct.keyInsight}</p>
            </div>
          </div>
        </div>
      )}

      {/* Deep dive for correct but uncertain */}
      {feedback.showDeepDive && isCorrect && (
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
            <span>📚</span> Why this works
          </h4>
          <p className="text-sm text-blue-700">
            {selected.keyInsight}
          </p>
        </div>
      )}

      {/* Your explanation (reflection) */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
          <span>💭</span> Your reasoning
        </h4>
        <p className="text-sm text-gray-600 italic">"{explanation}"</p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        {isCorrect ? (
          <button
            onClick={onContinue}
            className={`
              flex-1 py-3 px-6 rounded-xl font-semibold text-white
              bg-gradient-to-r ${colors.button} shadow-lg
              transition-all duration-200 flex items-center justify-center gap-2
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500
            `}
          >
            <span>Continue to coding</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        ) : (
          <>
            <button
              onClick={onTryAgain}
              className="flex-1 py-3 px-6 rounded-xl font-semibold text-white
                         bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700
                         shadow-lg transition-all duration-200 flex items-center justify-center gap-2
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              <span>Try again with new insight</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default CoachingFeedback;
