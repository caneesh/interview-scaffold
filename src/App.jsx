import { useScaffoldedLearning } from './hooks/useScaffoldedLearning';
import { sampleProblem } from './data/sampleProblem';

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
 * Step indicator component showing completed/current/upcoming steps
 */
function StepIndicator({ steps, currentStepIndex, isCompleted }) {
  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
      {steps.map((step, index) => {
        const isComplete = index < currentStepIndex || isCompleted;
        const isCurrent = index === currentStepIndex && !isCompleted;

        return (
          <div key={step.stepId} className="flex items-center">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300
                ${isComplete ? 'bg-green-500 text-white' : ''}
                ${isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-200' : ''}
                ${!isComplete && !isCurrent ? 'bg-gray-200 text-gray-500' : ''}
              `}
            >
              {isComplete ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-8 h-0.5 mx-1 ${index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
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
 */
function CodeEditor({ code, onChange, placeholder }) {
  return (
    <div className="h-full flex flex-col">
      <div className="bg-slate-800 px-4 py-2 rounded-t-lg border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-3 text-slate-400 text-sm">solution.py</span>
        </div>
      </div>
      <div className="flex-1 bg-slate-900 rounded-b-lg overflow-hidden">
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="code-editor w-full h-full bg-transparent text-green-400 font-mono text-sm p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
          spellCheck="false"
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>
    </div>
  );
}

/**
 * Completion screen component
 */
function CompletionScreen({ problem, onReset }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Problem Completed!
        </h2>
        <p className="text-gray-600 mb-6">
          You successfully solved "{problem.title}"
        </p>
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-2">What you learned:</h3>
          <ul className="text-left text-gray-600 space-y-1">
            <li>• Floyd's Tortoise and Hare algorithm</li>
            <li>• Two-pointer technique</li>
            <li>• Cycle detection in linked lists</li>
          </ul>
        </div>
        <button
          onClick={onReset}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Practice Again
        </button>
      </div>
    </div>
  );
}

/**
 * Left panel - Problem information and instructions
 */
function LeftPanel({
  problem,
  currentStep,
  currentStepIndex,
  totalSteps,
  progress,
  hintLevel,
  hasMoreHints,
  revealNextHint,
  validationMessage,
  isValidationError,
  isCompleted,
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
        <StepIndicator
          steps={problem.steps}
          currentStepIndex={currentStepIndex}
          isCompleted={isCompleted}
        />
      </div>

      {/* Current step instruction */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 bg-blue-600 text-white text-sm font-medium rounded">
              Step {currentStep.stepId}
            </span>
          </div>
          <p className="text-gray-800 leading-relaxed">
            {currentStep.instruction}
          </p>
        </div>

        {/* Help & Hints section */}
        <HelpAndHints
          hints={currentStep.hints}
          hintLevel={hintLevel}
          hasMoreHints={hasMoreHints}
          onRevealNextHint={revealNextHint}
        />

        {/* Validation message */}
        <ValidationMessage
          message={validationMessage}
          isError={isValidationError}
        />
      </div>
    </div>
  );
}

/**
 * Right panel - Code editor
 */
function RightPanel({ userCode, updateCode, submitStep, isLastStep, currentStep }) {
  return (
    <div className="h-full flex flex-col bg-slate-800 p-6">
      {/* Editor header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white mb-1">Your Solution</h2>
        <p className="text-slate-400 text-sm">
          Write your code below to complete Step {currentStep.stepId}
        </p>
      </div>

      {/* Code editor */}
      <div className="flex-1 mb-4">
        <CodeEditor
          code={userCode}
          onChange={updateCode}
          placeholder={currentStep.placeholderCode}
        />
      </div>

      {/* Submit button */}
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
    </div>
  );
}

/**
 * Main App component - Scaffolded Learning Application
 */
function App() {
  const {
    currentStepIndex,
    currentStep,
    userCode,
    hintLevel,
    hasMoreHints,
    validationMessage,
    isValidationError,
    isCompleted,
    totalSteps,
    isLastStep,
    progress,
    updateCode,
    revealNextHint,
    submitStep,
    resetProblem,
  } = useScaffoldedLearning(sampleProblem);

  // Show completion screen when problem is completed
  if (isCompleted) {
    return <CompletionScreen problem={sampleProblem} onReset={resetProblem} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
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

      {/* Main content - Split screen layout */}
      <div className="flex h-[calc(100vh-57px)]">
        {/* Left Panel - Problem & Instructions */}
        <div className="w-1/2 border-r border-gray-200 overflow-hidden">
          <LeftPanel
            problem={sampleProblem}
            currentStep={currentStep}
            currentStepIndex={currentStepIndex}
            totalSteps={totalSteps}
            progress={progress}
            hintLevel={hintLevel}
            hasMoreHints={hasMoreHints}
            revealNextHint={revealNextHint}
            validationMessage={validationMessage}
            isValidationError={isValidationError}
            isCompleted={isCompleted}
          />
        </div>

        {/* Right Panel - Code Editor */}
        <div className="w-1/2 overflow-hidden">
          <RightPanel
            userCode={userCode}
            updateCode={updateCode}
            submitStep={submitStep}
            isLastStep={isLastStep}
            currentStep={currentStep}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
