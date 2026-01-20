/**
 * Coaching Session Manager
 *
 * Orchestrates the learner-centric coaching flow across all stages:
 * 1. Problem Framing
 * 2. Pattern Recognition
 * 3. Feynman Validation
 * 4. Strategy Design
 * 5. Coding (Silent Interviewer)
 * 6. Reflection
 */

import type { Problem } from '../entities/problem.js';
import type {
  CoachingSession,
  CoachingStage,
  CoachingStageData,
  CoachResponse,
  HelpLevel,
} from './types.js';

import {
  createInitialFramingData,
  processFramingAnswer,
  generateFramingResponse,
  type ProblemFramingInput,
} from './problem-framing.js';

import {
  createInitialPatternData,
  processPatternAttempt,
  generatePatternResponse,
  type PatternValidationInput,
} from './pattern-recognition-gate.js';

import {
  createInitialFeynmanData,
  processFeynmanAttempt,
  generateFeynmanResponse,
  type FeynmanValidationInput,
} from './feynman-validator.js';

import {
  createInitialStrategyData,
  processStrategyDesign,
  processAdversarialAnswer,
  generateStrategyResponse,
  type StrategyValidationInput,
} from './strategy-design.js';

import {
  createInitialCodingData,
  analyzeCode,
  updateCodingData,
  generateCodingResponse,
  type CodeAnalysisInput,
} from './coding-silent-interviewer.js';

import {
  createInitialHelpState,
  processHelpRequest,
  generateHelpResponse,
  HELP_LEVEL_PENALTIES,
  type HelpState,
  type HelpGenerationInput,
} from './tiered-help-system.js';

import {
  createInitialReflectionData,
  processReflection,
  generateReflectionResponse,
  type ReflectionInput,
} from './reflection-reinforcement.js';

// ============ Stage Data Recovery ============

/**
 * Error class for missing stage data that includes recovery instructions
 */
export class StageDataNotInitializedError extends Error {
  constructor(
    public readonly stageName: string,
    public readonly expectedStage: CoachingStage
  ) {
    super(
      `${stageName} data not initialized. ` +
      `Expected current stage: ${expectedStage}. ` +
      `Recovery: Re-create the session or navigate to the correct stage.`
    );
    this.name = 'StageDataNotInitializedError';
  }
}

/**
 * Ensure stage data is initialized, auto-recovering if possible
 * Returns the session with initialized stage data
 */
export function ensureStageDataInitialized(
  session: CoachingSession,
  problem: Problem
): CoachingSession {
  const stage = session.currentStage;
  let stageData = session.stageData;
  let needsUpdate = false;

  switch (stage) {
    case 'PROBLEM_FRAMING':
      if (!stageData.problemFraming) {
        stageData = { ...stageData, problemFraming: createInitialFramingData(problem) };
        needsUpdate = true;
      }
      break;
    case 'PATTERN_RECOGNITION':
      if (!stageData.patternRecognition) {
        stageData = { ...stageData, patternRecognition: createInitialPatternData() };
        needsUpdate = true;
      }
      break;
    case 'FEYNMAN_VALIDATION':
      if (!stageData.feynmanValidation) {
        stageData = { ...stageData, feynmanValidation: createInitialFeynmanData() };
        needsUpdate = true;
      }
      break;
    case 'STRATEGY_DESIGN':
      if (!stageData.strategyDesign) {
        stageData = { ...stageData, strategyDesign: createInitialStrategyData() };
        needsUpdate = true;
      }
      break;
    case 'CODING':
      if (!stageData.coding) {
        stageData = { ...stageData, coding: createInitialCodingData() };
        needsUpdate = true;
      }
      break;
    case 'REFLECTION':
      if (!stageData.reflection) {
        stageData = { ...stageData, reflection: createInitialReflectionData() };
        needsUpdate = true;
      }
      break;
  }

  if (needsUpdate) {
    return { ...session, stageData };
  }
  return session;
}

/**
 * Check if session is healthy (has required stage data for current stage)
 */
export function isSessionHealthy(session: CoachingSession): boolean {
  const stage = session.currentStage;
  switch (stage) {
    case 'PROBLEM_FRAMING':
      return session.stageData.problemFraming !== null;
    case 'PATTERN_RECOGNITION':
      return session.stageData.patternRecognition !== null;
    case 'FEYNMAN_VALIDATION':
      return session.stageData.feynmanValidation !== null;
    case 'STRATEGY_DESIGN':
      return session.stageData.strategyDesign !== null;
    case 'CODING':
      return session.stageData.coding !== null;
    case 'REFLECTION':
      return session.stageData.reflection !== null;
    default:
      return true;
  }
}

// ============ Session Factory ============

/**
 * Create a new coaching session
 */
export function createCoachingSession(
  id: string,
  attemptId: string,
  tenantId: string,
  userId: string,
  problem: Problem
): CoachingSession {
  return {
    id,
    attemptId,
    tenantId,
    userId,
    problemId: problem.id,
    currentStage: 'PROBLEM_FRAMING',
    stageData: {
      problemFraming: createInitialFramingData(problem),
      patternRecognition: null,
      feynmanValidation: null,
      strategyDesign: null,
      coding: null,
      reflection: null,
    },
    helpLevel: 1,
    startedAt: new Date(),
    completedAt: null,
  };
}

// ============ Stage Transition ============

const STAGE_ORDER: readonly CoachingStage[] = [
  'PROBLEM_FRAMING',
  'PATTERN_RECOGNITION',
  'FEYNMAN_VALIDATION',
  'STRATEGY_DESIGN',
  'CODING',
  'REFLECTION',
];

/**
 * Get the next stage
 */
export function getNextStage(currentStage: CoachingStage): CoachingStage | null {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) {
    return null;
  }
  return STAGE_ORDER[currentIndex + 1] ?? null;
}

/**
 * Advance session to next stage
 */
export function advanceStage(
  session: CoachingSession,
  problem: Problem
): CoachingSession {
  const nextStage = getNextStage(session.currentStage);
  if (!nextStage) {
    // Complete the session
    return {
      ...session,
      completedAt: new Date(),
    };
  }

  // Initialize data for the next stage
  const updatedStageData = { ...session.stageData };

  switch (nextStage) {
    case 'PATTERN_RECOGNITION':
      updatedStageData.patternRecognition = createInitialPatternData();
      break;
    case 'FEYNMAN_VALIDATION':
      updatedStageData.feynmanValidation = createInitialFeynmanData();
      break;
    case 'STRATEGY_DESIGN':
      updatedStageData.strategyDesign = createInitialStrategyData();
      break;
    case 'CODING':
      updatedStageData.coding = createInitialCodingData();
      break;
    case 'REFLECTION':
      updatedStageData.reflection = createInitialReflectionData();
      break;
  }

  return {
    ...session,
    currentStage: nextStage,
    stageData: updatedStageData,
  };
}

// ============ Stage Processing ============

export interface StageProcessingResult {
  readonly session: CoachingSession;
  readonly response: CoachResponse;
  readonly shouldAdvance: boolean;
}

/**
 * Process problem framing answer
 */
export function processProblemFraming(
  session: CoachingSession,
  problem: Problem,
  questionId: string,
  answer: string
): StageProcessingResult {
  // Auto-initialize stage data if missing (CRITICAL-4 fix)
  const recoveredSession = ensureStageDataInitialized(session, problem);
  const framingData = recoveredSession.stageData.problemFraming;

  if (!framingData) {
    throw new StageDataNotInitializedError('Problem framing', 'PROBLEM_FRAMING');
  }

  const input: ProblemFramingInput = { problem, questionId, answer };
  const result = processFramingAnswer(input, framingData);

  const updatedData = {
    ...framingData,
    questions: framingData.questions.map(q =>
      q.id === questionId ? result.question : q
    ),
    understandingScore: result.understandingScore,
    isComplete: result.isComplete,
  };

  const updatedSession: CoachingSession = {
    ...recoveredSession,
    stageData: {
      ...recoveredSession.stageData,
      problemFraming: updatedData,
    },
  };

  const response = generateFramingResponse(result, updatedData.questions.length);

  return {
    session: result.isComplete ? advanceStage(updatedSession, problem) : updatedSession,
    response,
    shouldAdvance: result.isComplete,
  };
}

/**
 * Process pattern recognition attempt
 */
export function processPatternRecognition(
  session: CoachingSession,
  problem: Problem,
  selectedPattern: string,
  justification: string
): StageProcessingResult {
  // Auto-initialize stage data if missing (CRITICAL-4 fix)
  const recoveredSession = ensureStageDataInitialized(session, problem);
  const patternData = recoveredSession.stageData.patternRecognition;

  if (!patternData) {
    throw new StageDataNotInitializedError('Pattern recognition', 'PATTERN_RECOGNITION');
  }

  const input: PatternValidationInput = { problem, selectedPattern, justification };
  const { result, updatedData } = processPatternAttempt(input, patternData);

  const updatedSession: CoachingSession = {
    ...recoveredSession,
    stageData: {
      ...recoveredSession.stageData,
      patternRecognition: updatedData,
    },
  };

  const response = generatePatternResponse(result, updatedData.attempts.length);
  const shouldAdvance = result.isCorrect;

  return {
    session: shouldAdvance ? advanceStage(updatedSession, problem) : updatedSession,
    response,
    shouldAdvance,
  };
}

/**
 * Process Feynman explanation
 */
export function processFeynman(
  session: CoachingSession,
  problem: Problem,
  explanation: string
): StageProcessingResult {
  // Auto-initialize stage data if missing (CRITICAL-4 fix)
  const recoveredSession = ensureStageDataInitialized(session, problem);
  const feynmanData = recoveredSession.stageData.feynmanValidation;

  if (!feynmanData) {
    throw new StageDataNotInitializedError('Feynman validation', 'FEYNMAN_VALIDATION');
  }

  const input: FeynmanValidationInput = { problem, explanation };
  const { result, updatedData } = processFeynmanAttempt(input, feynmanData);

  const updatedSession: CoachingSession = {
    ...recoveredSession,
    stageData: {
      ...recoveredSession.stageData,
      feynmanValidation: updatedData,
    },
  };

  const response = generateFeynmanResponse(result, updatedData.attempts.length);
  const shouldAdvance = updatedData.isComplete;

  return {
    session: shouldAdvance ? advanceStage(updatedSession, problem) : updatedSession,
    response,
    shouldAdvance,
  };
}

/**
 * Process strategy design
 */
export function processStrategy(
  session: CoachingSession,
  problem: Problem,
  strategy: string
): StageProcessingResult {
  // Auto-initialize stage data if missing (CRITICAL-4 fix)
  const recoveredSession = ensureStageDataInitialized(session, problem);
  const strategyData = recoveredSession.stageData.strategyDesign;

  if (!strategyData) {
    throw new StageDataNotInitializedError('Strategy design', 'STRATEGY_DESIGN');
  }

  const input: StrategyValidationInput = { problem, strategy };
  const { result, adversarialQuestions, updatedData } = processStrategyDesign(
    input,
    strategyData
  );

  const updatedSession: CoachingSession = {
    ...recoveredSession,
    stageData: {
      ...recoveredSession.stageData,
      strategyDesign: updatedData,
    },
  };

  const response = generateStrategyResponse(result, adversarialQuestions);
  const shouldAdvance = updatedData.isReadyToCode;

  return {
    session: shouldAdvance ? advanceStage(updatedSession, problem) : updatedSession,
    response,
    shouldAdvance,
  };
}

/**
 * Process adversarial question answer
 */
export function processAdversarial(
  session: CoachingSession,
  problem: Problem,
  questionId: string,
  answer: string
): StageProcessingResult {
  // Auto-initialize stage data if missing (CRITICAL-4 fix)
  const recoveredSession = ensureStageDataInitialized(session, problem);
  const strategyData = recoveredSession.stageData.strategyDesign;

  if (!strategyData) {
    throw new StageDataNotInitializedError('Strategy design', 'STRATEGY_DESIGN');
  }

  const updatedData = processAdversarialAnswer(
    questionId,
    answer,
    strategyData
  );

  const updatedSession: CoachingSession = {
    ...recoveredSession,
    stageData: {
      ...recoveredSession.stageData,
      strategyDesign: updatedData,
    },
  };

  const shouldAdvance = updatedData.isReadyToCode;

  const response: CoachResponse = shouldAdvance
    ? {
        type: 'CONGRATULATIONS',
        content: 'Your strategy addresses the key concerns. Ready to code!',
        questions: [],
        helpLevel: null,
        nextAction: 'ADVANCE',
        metadata: {
          stage: 'STRATEGY_DESIGN',
          attemptCount: 0,
          helpUsed: 0,
          timeElapsed: 0,
        },
      }
    : {
        type: 'FEEDBACK',
        content: 'Thanks for addressing that. Any remaining questions?',
        questions: updatedData.adversarialQuestions
          .filter(q => !q.isResolved)
          .map(q => q.question),
        helpLevel: null,
        nextAction: 'CONTINUE',
        metadata: {
          stage: 'STRATEGY_DESIGN',
          attemptCount: 0,
          helpUsed: 0,
          timeElapsed: 0,
        },
      };

  return {
    session: shouldAdvance ? advanceStage(updatedSession, problem) : updatedSession,
    response,
    shouldAdvance,
  };
}

/**
 * Process code submission for analysis
 */
export function processCodeAnalysis(
  session: CoachingSession,
  problem: Problem,
  code: string,
  language: string
): StageProcessingResult {
  // Auto-initialize stage data if missing (CRITICAL-4 fix)
  const recoveredSession = ensureStageDataInitialized(session, problem);
  const codingData = recoveredSession.stageData.coding;

  if (!codingData) {
    throw new StageDataNotInitializedError('Coding', 'CODING');
  }

  const input: CodeAnalysisInput = { problem, code, language };
  const result = analyzeCode(input);
  const updatedData = updateCodingData(codingData, result);

  const updatedSession: CoachingSession = {
    ...recoveredSession,
    stageData: {
      ...recoveredSession.stageData,
      coding: updatedData,
    },
  };

  const response = generateCodingResponse(result, updatedData.observations.length);

  // Don't auto-advance from coding - that's based on test results
  return {
    session: updatedSession,
    response,
    shouldAdvance: false,
  };
}

/**
 * Process reflection submission
 */
export function processReflectionSubmission(
  session: CoachingSession,
  problem: Problem,
  input: ReflectionInput
): StageProcessingResult {
  // Auto-initialize stage data if missing (CRITICAL-4 fix)
  const recoveredSession = ensureStageDataInitialized(session, problem);

  const reflectionData = processReflection(input, problem, recoveredSession);

  const updatedSession: CoachingSession = {
    ...recoveredSession,
    stageData: {
      ...recoveredSession.stageData,
      reflection: reflectionData,
    },
    completedAt: new Date(),
  };

  const response = generateReflectionResponse(reflectionData, problem);

  return {
    session: updatedSession,
    response,
    shouldAdvance: true,
  };
}

// ============ Help Processing ============

export interface HelpProcessingResult {
  readonly session: CoachingSession;
  readonly helpState: HelpState;
  readonly response: CoachResponse;
}

/**
 * Process help request
 */
export function processHelp(
  session: CoachingSession,
  helpState: HelpState,
  problem: Problem,
  requestedLevel: HelpLevel,
  explicitlyRequested: boolean,
  context?: { code?: string; strategy?: string }
): HelpProcessingResult {
  const input: HelpGenerationInput = {
    problem,
    requestedLevel,
    currentCode: context?.code,
    currentStrategy: context?.strategy,
    explicitlyRequested,
  };

  const { help, updatedState, warning } = processHelpRequest(input, helpState);

  const updatedSession: CoachingSession = {
    ...session,
    helpLevel: updatedState.currentLevel,
  };

  const response = generateHelpResponse(
    help,
    HELP_LEVEL_PENALTIES[help.level],
    warning
  );

  return {
    session: updatedSession,
    helpState: updatedState,
    response,
  };
}

// ============ Session Completion ============

/**
 * Complete the coaching session
 */
export function completeSession(session: CoachingSession): CoachingSession {
  return {
    ...session,
    completedAt: new Date(),
  };
}

/**
 * Check if session is complete
 */
export function isSessionComplete(session: CoachingSession): boolean {
  return session.completedAt !== null;
}

/**
 * Get session progress
 */
export function getSessionProgress(session: CoachingSession): {
  currentStage: CoachingStage;
  stageIndex: number;
  totalStages: number;
  percentComplete: number;
} {
  const stageIndex = STAGE_ORDER.indexOf(session.currentStage);
  const totalStages = STAGE_ORDER.length;
  const percentComplete = Math.round((stageIndex / totalStages) * 100);

  return {
    currentStage: session.currentStage,
    stageIndex,
    totalStages,
    percentComplete,
  };
}
