/**
 * HintDrawer - Progressive hint system with optional penalty indicator
 */

export function HintDrawer({
  hints = [],
  hintsUsed = 0,
  onRevealHint,
  maxFreeHints = 2
}) {
  const revealedHints = hints.slice(0, hintsUsed);
  const hasMore = hintsUsed < hints.length;
  const isPenalty = hintsUsed >= maxFreeHints;

  if (hints.length === 0) return null;

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-700 flex items-center gap-2">
          <span className="text-lg">💡</span>
          <span>Need a hint?</span>
        </h4>
        <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
          {hintsUsed}/{hints.length} revealed
        </span>
      </div>

      {/* Revealed hints */}
      {revealedHints.length > 0 && (
        <div className="space-y-2 mb-3">
          {revealedHints.map((hint, i) => (
            <div
              key={i}
              className="bg-white p-3 rounded-lg border border-gray-200 text-sm text-gray-700
                         animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <span className="text-gray-400 font-medium mr-2">#{i + 1}</span>
              {hint}
            </div>
          ))}
        </div>
      )}

      {/* Reveal more button */}
      {hasMore && (
        <button
          onClick={onRevealHint}
          className={`
            w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2
            transition-all duration-200
            ${isPenalty
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200'
            }
            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
            ${isPenalty ? 'focus-visible:ring-amber-500' : 'focus-visible:ring-blue-500'}
          `}
        >
          {isPenalty && <span>⚠️</span>}
          <span>Reveal hint #{hintsUsed + 1}</span>
          {isPenalty && (
            <span className="text-xs opacity-75">(affects score)</span>
          )}
        </button>
      )}

      {/* All hints revealed */}
      {!hasMore && hintsUsed > 0 && (
        <p className="text-center text-sm text-gray-500 py-2">
          All hints revealed. Take your time to think!
        </p>
      )}
    </div>
  );
}

export default HintDrawer;
