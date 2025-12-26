import { useState, useCallback } from 'react';
import { WizardQuestion } from './WizardQuestion';
import { StrategyShortlist } from './StrategyShortlist';
import { ExplanationGate } from './ExplanationGate';
import { CoachingFeedback } from './CoachingFeedback';
import { WIZARD_QUESTIONS, STRATEGIES, PROBLEM_HINTS, computeShortlist, generateReasoning } from './wizardData';
import { WIZARD_PHASES } from './types';

/**
 * StepZeroWizard - Main orchestrator for Socratic pattern selection
 *
 * Flow:
 * 1. QUESTIONS - Walk through 2-3 guiding questions
 * 2. SHORTLIST - Show 2-3 candidate strategies based on answers
 * 3. EXPLANATION - User explains their choice + confidence level
 * 4. FEEDBACK - Coaching feedback based on selection
 */

export function StepZeroWizard({
  problemId = 'two-sum',
  correctStrategy = 'two-pointers',
  onComplete,
  onStrategyConfirmed
}) {
  // Phase management
  const [phase, setPhase] = useState(WIZARD_PHASES.QUESTIONS);

  // Question flow state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  // Strategy selection state
  const [shortlist, setShortlist] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [reasoning, setReasoning] = useState('');

  // Explanation state
  const [explanation, setExplanation] = useState('');
  const [confidence, setConfidence] = useState(null);

  // Hint state
  const [hintsUsed, setHintsUsed] = useState(0);

  // Get current question
  const currentQuestion = WIZARD_QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === WIZARD_QUESTIONS.length - 1;

  // Handle answer selection in questions phase
  const handleAnswerSelect = useCallback((questionId, optionId) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  }, []);

  // Handle next in questions phase
  const handleQuestionNext = useCallback(() => {
    if (isLastQuestion) {
      // Compute shortlist and move to next phase
      const computedShortlist = computeShortlist(answers);
      const computedReasoning = generateReasoning(answers);
      setShortlist(computedShortlist);
      setReasoning(computedReasoning);
      setPhase(WIZARD_PHASES.SHORTLIST);
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [isLastQuestion, answers]);

  // Handle back in questions phase
  const handleQuestionBack = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  // Handle strategy selection in shortlist phase
  const handleStrategySelect = useCallback((strategyId) => {
    setSelectedStrategy(strategyId);
  }, []);

  // Handle continue to explanation phase
  const handleShortlistContinue = useCallback(() => {
    setPhase(WIZARD_PHASES.EXPLANATION);
  }, []);

  // Handle back from shortlist to questions
  const handleShortlistBack = useCallback(() => {
    setPhase(WIZARD_PHASES.QUESTIONS);
    setCurrentQuestionIndex(WIZARD_QUESTIONS.length - 1);
  }, []);

  // Handle explanation submission
  const handleExplanationSubmit = useCallback(() => {
    setPhase(WIZARD_PHASES.FEEDBACK);
  }, []);

  // Handle back from explanation to shortlist
  const handleExplanationBack = useCallback(() => {
    setPhase(WIZARD_PHASES.SHORTLIST);
  }, []);

  // Handle hint reveal
  const handleRevealHint = useCallback(() => {
    setHintsUsed(prev => prev + 1);
  }, []);

  // Handle continue after correct answer
  const handleFeedbackContinue = useCallback(() => {
    const strategy = STRATEGIES[selectedStrategy];
    if (onStrategyConfirmed) {
      onStrategyConfirmed(strategy);
    }
    if (onComplete) {
      onComplete({
        selectedStrategy,
        correctStrategy,
        isCorrect: selectedStrategy === correctStrategy,
        confidence,
        explanation,
        hintsUsed,
        answers
      });
    }
  }, [selectedStrategy, correctStrategy, confidence, explanation, hintsUsed, answers, onComplete, onStrategyConfirmed]);

  // Handle try again after incorrect answer
  const handleTryAgain = useCallback(() => {
    setSelectedStrategy(null);
    setExplanation('');
    setConfidence(null);
    setPhase(WIZARD_PHASES.SHORTLIST);
  }, []);

  // Get problem-specific hints
  const hints = PROBLEM_HINTS[problemId] || [];

  // Get selected strategy object for explanation gate
  const selectedStrategyObj = selectedStrategy ? STRATEGIES[selectedStrategy] : null;

  // Progress indicator
  const getProgress = () => {
    switch (phase) {
      case WIZARD_PHASES.QUESTIONS:
        return { step: currentQuestionIndex + 1, total: WIZARD_QUESTIONS.length + 2, label: 'Analyzing problem' };
      case WIZARD_PHASES.SHORTLIST:
        return { step: WIZARD_QUESTIONS.length + 1, total: WIZARD_QUESTIONS.length + 2, label: 'Choose strategy' };
      case WIZARD_PHASES.EXPLANATION:
        return { step: WIZARD_QUESTIONS.length + 2, total: WIZARD_QUESTIONS.length + 2, label: 'Explain reasoning' };
      case WIZARD_PHASES.FEEDBACK:
        return { step: WIZARD_QUESTIONS.length + 2, total: WIZARD_QUESTIONS.length + 2, label: 'Review' };
      default:
        return { step: 1, total: 5, label: '' };
    }
  };

  const progress = getProgress();

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900">
            Step 0: Choose Your Approach
          </h2>
          <span className="text-sm text-gray-500">
            {progress.step}/{progress.total}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
            style={{ width: `${(progress.step / progress.total) * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">{progress.label}</p>
      </div>

      {/* Phase content */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        {phase === WIZARD_PHASES.QUESTIONS && (
          <WizardQuestion
            question={currentQuestion}
            selectedAnswer={answers[currentQuestion.id]}
            onSelect={handleAnswerSelect}
            onNext={handleQuestionNext}
            onBack={handleQuestionBack}
            isFirst={currentQuestionIndex === 0}
            isLast={isLastQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={WIZARD_QUESTIONS.length}
          />
        )}

        {phase === WIZARD_PHASES.SHORTLIST && (
          <StrategyShortlist
            strategies={shortlist}
            selectedStrategy={selectedStrategy}
            onSelect={handleStrategySelect}
            onContinue={handleShortlistContinue}
            onBack={handleShortlistBack}
            reasoning={reasoning}
            hints={hints}
            hintsUsed={hintsUsed}
            onRevealHint={handleRevealHint}
          />
        )}

        {phase === WIZARD_PHASES.EXPLANATION && selectedStrategyObj && (
          <ExplanationGate
            selectedStrategy={selectedStrategyObj}
            explanation={explanation}
            confidence={confidence}
            onExplanationChange={setExplanation}
            onConfidenceChange={setConfidence}
            onSubmit={handleExplanationSubmit}
            onBack={handleExplanationBack}
          />
        )}

        {phase === WIZARD_PHASES.FEEDBACK && (
          <CoachingFeedback
            selectedStrategy={selectedStrategy}
            correctStrategy={correctStrategy}
            confidence={confidence}
            explanation={explanation}
            strategies={Object.values(STRATEGIES)}
            onContinue={handleFeedbackContinue}
            onTryAgain={handleTryAgain}
          />
        )}
      </div>

      {/* Footer hint */}
      {phase === WIZARD_PHASES.QUESTIONS && (
        <p className="text-center text-xs text-gray-400 mt-4">
          Take your time — this builds interview skills!
        </p>
      )}
    </div>
  );
}

export default StepZeroWizard;
