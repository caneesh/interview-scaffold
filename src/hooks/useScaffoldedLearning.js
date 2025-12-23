import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for managing scaffolded learning state.
 * Handles step progression, code input, hint visibility, and validation.
 *
 * @param {Object} problem - The problem data following the scaffolded learning data model
 * @returns {Object} State and handlers for the scaffolded learning component
 */
export function useScaffoldedLearning(problem) {
  // Step Zero - Pattern selection state (must complete before interview)
  const [isPatternComplete, setIsPatternComplete] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [patternSubmitted, setPatternSubmitted] = useState(false);
  const [patternAttempts, setPatternAttempts] = useState(0);

  // Interview simulation state - must complete before coding
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const [selectedApproach, setSelectedApproach] = useState(null);
  const [interviewSubmitted, setInterviewSubmitted] = useState(false);

  // Strategy planning state - "Reasoning Out Loud" (must complete before coding)
  const [isStrategyComplete, setIsStrategyComplete] = useState(false);
  const [strategyText, setStrategyText] = useState('');
  const [strategySubmitted, setStrategySubmitted] = useState(false);
  const [strategyValidation, setStrategyValidation] = useState(null);
  const [strategyHintLevel, setStrategyHintLevel] = useState(0);

  // Current step index (0-based) - represents actual progress
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Viewing step index - which step is currently being viewed (can differ from currentStepIndex in review mode)
  const [viewingStepIndex, setViewingStepIndex] = useState(0);

  // User's code input for each step (keyed by stepId)
  const [userCodeByStep, setUserCodeByStep] = useState(() => {
    const initial = {};
    problem.steps.forEach(step => {
      initial[step.stepId] = step.placeholderCode || '';
    });
    return initial;
  });

  // Hint level state (progressive hints)
  // 0 = No hints shown, 1 = First hint shown, 2 = Second hint shown, etc.
  const [hintLevel, setHintLevel] = useState(0);

  // Track hints used per step (for victory stats)
  const [hintsUsedByStep, setHintsUsedByStep] = useState(() => {
    const initial = {};
    problem.steps.forEach(step => {
      initial[step.stepId] = 0;
    });
    return initial;
  });

  // Validation feedback
  const [validationMessage, setValidationMessage] = useState(null);
  const [isValidationError, setIsValidationError] = useState(false);

  // Completion state
  const [isCompleted, setIsCompleted] = useState(false);

  // Derived state
  const currentStep = useMemo(() =>
    problem.steps[currentStepIndex],
    [problem.steps, currentStepIndex]
  );

  // The step being viewed (may differ from currentStep in review mode)
  const viewingStep = useMemo(() =>
    problem.steps[viewingStepIndex],
    [problem.steps, viewingStepIndex]
  );

  // Review mode: viewing a completed step that isn't the current active step
  const isReviewMode = viewingStepIndex < currentStepIndex;

  // Code for the step being viewed
  const userCode = useMemo(() =>
    userCodeByStep[viewingStep?.stepId] || '',
    [userCodeByStep, viewingStep]
  );

  // Code for the current active step (used when returning from review)
  const activeStepCode = useMemo(() =>
    userCodeByStep[currentStep?.stepId] || '',
    [userCodeByStep, currentStep]
  );

  const totalSteps = problem.steps.length;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const progress = ((currentStepIndex + (isCompleted ? 1 : 0)) / totalSteps) * 100;

  // Calculate total hints used across all steps
  const totalHintsUsed = useMemo(() =>
    Object.values(hintsUsedByStep).reduce((sum, count) => sum + count, 0),
    [hintsUsedByStep]
  );

  // Pattern selection derived state
  const patternSelection = problem.patternSelection;
  const hasPatternSelection = !!patternSelection;

  // Get the pattern feedback based on selection
  const patternFeedback = useMemo(() => {
    if (!selectedPattern || !patternSelection) return null;
    const isCorrect = selectedPattern === patternSelection.correctAnswer;
    if (isCorrect) {
      return patternSelection.feedback.correct;
    }
    return patternSelection.feedback.incorrect[selectedPattern] || null;
  }, [selectedPattern, patternSelection]);

  // Check if selected pattern is correct
  const isPatternCorrect = useMemo(() => {
    if (!selectedPattern || !patternSelection) return false;
    return selectedPattern === patternSelection.correctAnswer;
  }, [selectedPattern, patternSelection]);

  // Strategy step derived state
  const strategyStep = problem.strategyStep;
  const hasStrategyStep = !!strategyStep;
  const strategyHints = strategyStep?.hints || [];
  const hasMoreStrategyHints = strategyHintLevel < strategyHints.length;

  // Validate strategy text against required concepts
  const validateStrategyText = useCallback((text) => {
    if (!strategyStep || !text.trim()) {
      return { isValid: false, score: 0, matched: [], missing: [], feedback: null };
    }

    const lowerText = text.toLowerCase();
    const matched = [];
    const missing = [];
    let score = 0;

    strategyStep.requiredConcepts.forEach(concept => {
      const hasKeyword = concept.keywords.some(keyword =>
        lowerText.includes(keyword.toLowerCase())
      );
      if (hasKeyword) {
        matched.push(concept);
        score += concept.weight;
      } else {
        missing.push(concept);
      }
    });

    const minScore = strategyStep.minScore || 5;
    const isValid = score >= minScore;
    const totalPossible = strategyStep.requiredConcepts.reduce((sum, c) => sum + c.weight, 0);

    let feedback;
    if (score >= totalPossible * 0.9) {
      feedback = { ...strategyStep.feedback.excellent, type: 'excellent' };
    } else if (isValid) {
      feedback = {
        ...strategyStep.feedback.good,
        type: 'good',
        missing: missing.map(m => m.description)
      };
    } else {
      feedback = {
        ...strategyStep.feedback.needsWork,
        type: 'needsWork',
        missing: missing.map(m => m.description)
      };
    }

    return { isValid, score, totalPossible, matched, missing, feedback };
  }, [strategyStep]);

  // Interview question derived state
  const interviewQuestion = problem.interviewQuestion;
  const hasInterviewQuestion = !!interviewQuestion;

  // Get the selected option's feedback
  const interviewFeedback = useMemo(() => {
    if (!selectedApproach || !interviewQuestion) return null;
    const option = interviewQuestion.options.find(opt => opt.id === selectedApproach);
    return option ? option.feedback : null;
  }, [selectedApproach, interviewQuestion]);

  // Check if selected approach is correct or partially correct
  const isInterviewCorrect = useMemo(() => {
    if (!selectedApproach || !interviewQuestion) return false;
    const option = interviewQuestion.options.find(opt => opt.id === selectedApproach);
    return option?.isCorrect || false;
  }, [selectedApproach, interviewQuestion]);

  const isInterviewPartiallyCorrect = useMemo(() => {
    if (!selectedApproach || !interviewQuestion) return false;
    const option = interviewQuestion.options.find(opt => opt.id === selectedApproach);
    return option?.isPartiallyCorrect || false;
  }, [selectedApproach, interviewQuestion]);

  // Select a pattern (Step Zero - before submitting)
  const selectPattern = useCallback((patternId) => {
    if (!patternSubmitted) {
      setSelectedPattern(patternId);
    }
  }, [patternSubmitted]);

  // Submit pattern selection
  const submitPattern = useCallback(() => {
    if (selectedPattern && patternSelection) {
      setPatternSubmitted(true);
      setPatternAttempts(prev => prev + 1);
    }
  }, [selectedPattern, patternSelection]);

  // Try again after wrong pattern (reset for another attempt)
  const retryPattern = useCallback(() => {
    setSelectedPattern(null);
    setPatternSubmitted(false);
  }, []);

  // Proceed to interview/coding after correct pattern
  const proceedFromPattern = useCallback(() => {
    setIsPatternComplete(true);
  }, []);

  // Update strategy text (Reasoning Out Loud)
  const updateStrategyText = useCallback((text) => {
    if (!strategySubmitted) {
      setStrategyText(text);
      // Clear validation when user types
      if (strategyValidation) {
        setStrategyValidation(null);
      }
    }
  }, [strategySubmitted, strategyValidation]);

  // Submit strategy for validation
  const submitStrategy = useCallback(() => {
    if (strategyText.trim() && strategyStep) {
      const validation = validateStrategyText(strategyText);
      setStrategyValidation(validation);
      setStrategySubmitted(true);
    }
  }, [strategyText, strategyStep, validateStrategyText]);

  // Retry strategy after feedback
  const retryStrategy = useCallback(() => {
    setStrategySubmitted(false);
    setStrategyValidation(null);
    // Keep the text so they can edit it
  }, []);

  // Proceed to coding after valid strategy
  const proceedFromStrategy = useCallback(() => {
    setIsStrategyComplete(true);
  }, []);

  // Reveal next strategy hint
  const revealStrategyHint = useCallback(() => {
    if (strategyHintLevel < strategyHints.length) {
      setStrategyHintLevel(prev => prev + 1);
    }
  }, [strategyHintLevel, strategyHints.length]);

  // Select an approach (before submitting)
  const selectApproach = useCallback((approachId) => {
    if (!interviewSubmitted) {
      setSelectedApproach(approachId);
    }
  }, [interviewSubmitted]);

  // Submit interview answer
  const submitInterview = useCallback(() => {
    if (selectedApproach) {
      setInterviewSubmitted(true);
    }
  }, [selectedApproach]);

  // Proceed to coding after interview
  const proceedToCoding = useCallback(() => {
    setIsInterviewComplete(true);
  }, []);

  // Update code for current step (only when not in review mode)
  const updateCode = useCallback((newCode) => {
    if (!currentStep || isReviewMode) return;

    setUserCodeByStep(prev => ({
      ...prev,
      [currentStep.stepId]: newCode
    }));

    // Clear validation message when user types
    if (validationMessage) {
      setValidationMessage(null);
      setIsValidationError(false);
    }
  }, [currentStep, validationMessage, isReviewMode]);

  // Derived hint state (based on viewing step)
  const maxHints = viewingStep?.hints?.length || 0;
  const hasMoreHints = hintLevel < maxHints;

  // Reveal next hint (increments hint level and tracks usage)
  const revealNextHint = useCallback(() => {
    if (!currentStep) return;

    const maxHints = currentStep.hints?.length || 0;
    if (hintLevel < maxHints) {
      setHintLevel(prev => prev + 1);
      // Track hint usage for this step
      setHintsUsedByStep(prev => ({
        ...prev,
        [currentStep.stepId]: Math.max(prev[currentStep.stepId] || 0, hintLevel + 1)
      }));
    }
  }, [currentStep, hintLevel]);

  // Validate current step's code against the validation rule
  const validateStep = useCallback(() => {
    if (!currentStep) return false;

    const { validationType, validationRule } = currentStep;
    const code = userCode;

    if (validationType === 'regex') {
      try {
        // Create regex with multiline and case-insensitive flags
        const regex = new RegExp(validationRule, 'is');
        return regex.test(code);
      } catch (e) {
        console.error('Invalid regex pattern:', validationRule, e);
        return false;
      }
    }

    // Add more validation types here as needed
    return false;
  }, [currentStep, userCode]);

  // Submit current step
  const submitStep = useCallback(() => {
    const isValid = validateStep();

    if (isValid) {
      if (isLastStep) {
        // Problem completed!
        setIsCompleted(true);
        setValidationMessage('Congratulations! You have completed the problem!');
        setIsValidationError(false);
      } else {
        // Move to next step
        const nextIndex = currentStepIndex + 1;
        setCurrentStepIndex(nextIndex);
        setViewingStepIndex(nextIndex); // Also update viewing to the new step
        setValidationMessage('Correct! Moving to the next step...');
        setIsValidationError(false);
        setHintLevel(0); // Reset hint level for next step

        // Clear success message after a delay
        setTimeout(() => {
          setValidationMessage(null);
        }, 2000);
      }
    } else {
      setValidationMessage('Incorrect. Please check your code and try again. Use hints if you need help!');
      setIsValidationError(true);
    }

    return isValid;
  }, [validateStep, isLastStep]);

  // View a specific step (for review mode - doesn't change progress)
  const viewStep = useCallback((stepIndex) => {
    if (stepIndex >= 0 && stepIndex <= currentStepIndex) {
      setViewingStepIndex(stepIndex);
      setHintLevel(0); // Reset hint level when viewing different step
      setValidationMessage(null);
      setIsValidationError(false);
    }
  }, [currentStepIndex]);

  // Return to current active step from review mode
  const returnToCurrentStep = useCallback(() => {
    setViewingStepIndex(currentStepIndex);
    setHintLevel(0);
    setValidationMessage(null);
    setIsValidationError(false);
  }, [currentStepIndex]);

  // Reset the entire problem
  const resetProblem = useCallback(() => {
    // Reset pattern selection state
    setIsPatternComplete(false);
    setSelectedPattern(null);
    setPatternSubmitted(false);
    setPatternAttempts(0);

    // Reset interview state
    setIsInterviewComplete(false);
    setSelectedApproach(null);
    setInterviewSubmitted(false);

    // Reset strategy state
    setIsStrategyComplete(false);
    setStrategyText('');
    setStrategySubmitted(false);
    setStrategyValidation(null);
    setStrategyHintLevel(0);

    // Reset coding state
    setCurrentStepIndex(0);
    setViewingStepIndex(0); // Also reset viewing step
    setUserCodeByStep(() => {
      const initial = {};
      problem.steps.forEach(step => {
        initial[step.stepId] = step.placeholderCode || '';
      });
      return initial;
    });
    setHintLevel(0); // Reset hint level
    setHintsUsedByStep(() => {
      const initial = {};
      problem.steps.forEach(step => {
        initial[step.stepId] = 0;
      });
      return initial;
    }); // Reset hints tracking
    setValidationMessage(null);
    setIsValidationError(false);
    setIsCompleted(false);
  }, [problem.steps]);

  return {
    // Pattern selection state (Step Zero)
    hasPatternSelection,
    isPatternComplete,
    selectedPattern,
    patternSubmitted,
    patternFeedback,
    isPatternCorrect,
    patternAttempts,
    patternSelection,

    // Interview state
    hasInterviewQuestion,
    isInterviewComplete,
    selectedApproach,
    interviewSubmitted,
    interviewFeedback,
    isInterviewCorrect,
    isInterviewPartiallyCorrect,
    interviewQuestion,

    // Strategy planning state (Reasoning Out Loud)
    hasStrategyStep,
    isStrategyComplete,
    strategyText,
    strategySubmitted,
    strategyValidation,
    strategyStep,
    strategyHintLevel,
    strategyHints,
    hasMoreStrategyHints,

    // Coding state
    currentStepIndex,
    viewingStepIndex,
    currentStep,
    viewingStep,
    userCode,
    isReviewMode,
    hintLevel,
    maxHints,
    hasMoreHints,
    totalHintsUsed,
    validationMessage,
    isValidationError,
    isCompleted,
    totalSteps,
    isLastStep,
    progress,

    // Pattern selection actions
    selectPattern,
    submitPattern,
    retryPattern,
    proceedFromPattern,

    // Strategy planning actions
    updateStrategyText,
    submitStrategy,
    retryStrategy,
    proceedFromStrategy,
    revealStrategyHint,

    // Interview actions
    selectApproach,
    submitInterview,
    proceedToCoding,

    // Coding actions
    updateCode,
    revealNextHint,
    submitStep,
    viewStep,
    returnToCurrentStep,
    resetProblem,
  };
}

export default useScaffoldedLearning;
