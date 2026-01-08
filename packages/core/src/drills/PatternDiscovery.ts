/**
 * Pattern Discovery - Socratic questioning to help identify patterns.
 * PURE TypeScript - no framework dependencies.
 */

import type {
  PatternDiscoveryConfig,
  SocraticQuestion,
  DiscoveryAnswer,
  DiscoveryResult,
  DiscoveryConstraint,
} from './types.js';
import { DISCOVERY_CONFIGS } from './types.js';
import type { PatternId } from '../entities/types.js';

// ============================================================================
// Discovery Session
// ============================================================================

export interface DiscoverySession {
  readonly sessionId: string;
  readonly config: PatternDiscoveryConfig;
  readonly answers: readonly DiscoveryAnswer[];
  readonly currentQuestionIndex: number;
  readonly isComplete: boolean;
}

// ============================================================================
// Discovery Functions
// ============================================================================

/**
 * Gets discovery config for a pattern.
 */
export function getDiscoveryConfig(patternId: PatternId): PatternDiscoveryConfig | null {
  return DISCOVERY_CONFIGS.find(c => c.patternId === patternId) ?? null;
}

/**
 * Gets all available discovery patterns.
 */
export function getAvailableDiscoveryPatterns(): readonly PatternDiscoveryConfig[] {
  return DISCOVERY_CONFIGS;
}

/**
 * Creates a new discovery session.
 */
export function createDiscoverySession(
  sessionId: string,
  patternId: PatternId
): DiscoverySession | null {
  const config = getDiscoveryConfig(patternId);
  if (!config) {
    return null;
  }

  return {
    sessionId,
    config,
    answers: [],
    currentQuestionIndex: 0,
    isComplete: false,
  };
}

/**
 * Gets the current question in a discovery session.
 */
export function getCurrentQuestion(session: DiscoverySession): SocraticQuestion | null {
  if (session.isComplete) {
    return null;
  }

  return session.config.questions[session.currentQuestionIndex] ?? null;
}

/**
 * Submits an answer to the current question.
 */
export function submitDiscoveryAnswer(
  session: DiscoverySession,
  answer: 'yes' | 'no' | 'depends'
): DiscoverySession {
  const currentQuestion = getCurrentQuestion(session);
  if (!currentQuestion) {
    return session;
  }

  const newAnswer: DiscoveryAnswer = {
    questionId: currentQuestion.id,
    answer,
  };

  const newAnswers = [...session.answers, newAnswer];
  const newIndex = session.currentQuestionIndex + 1;
  const isComplete = newIndex >= session.config.questions.length;

  return {
    ...session,
    answers: newAnswers,
    currentQuestionIndex: newIndex,
    isComplete,
  };
}

/**
 * Gets follow-up message for the current answer.
 */
export function getFollowUp(
  session: DiscoverySession,
  answer: 'yes' | 'no' | 'depends'
): string | null {
  const currentQuestion = getCurrentQuestion(session);
  if (!currentQuestion) {
    return null;
  }

  if (answer === 'yes' && currentQuestion.followUpOnYes) {
    return currentQuestion.followUpOnYes;
  }

  if (answer === 'no' && currentQuestion.followUpOnNo) {
    return currentQuestion.followUpOnNo;
  }

  return null;
}

// ============================================================================
// Evaluation
// ============================================================================

/**
 * Evaluates a completed discovery session.
 */
export function evaluateDiscovery(session: DiscoverySession): DiscoveryResult {
  const { config, answers } = session;

  // Count correct answers
  let correctCount = 0;
  const identifiedConstraints: DiscoveryConstraint[] = [];

  for (const answer of answers) {
    const question = config.questions.find(q => q.id === answer.questionId);
    if (question && answer.answer === question.expectedAnswer) {
      correctCount++;
      if (!identifiedConstraints.includes(question.targetConstraint)) {
        identifiedConstraints.push(question.targetConstraint);
      }
    }
  }

  const inferredCorrectly = correctCount >= config.revealThreshold;

  return {
    patternId: config.patternId,
    patternName: config.patternName,
    inferredCorrectly,
    answersCorrect: correctCount,
    answersTotal: answers.length,
    constraintsIdentified: identifiedConstraints,
    countsAsHint1: true, // Discovery always counts as Hint1 usage
  };
}

// ============================================================================
// Pattern Inference
// ============================================================================

/**
 * Infers the most likely pattern from a problem description.
 * Uses constraint-based reasoning.
 */
export function inferPatternFromConstraints(
  constraints: readonly DiscoveryConstraint[]
): PatternId | null {
  if (constraints.length === 0) {
    return null;
  }

  // Score each pattern based on matching constraints
  const scores = new Map<PatternId, number>();

  for (const config of DISCOVERY_CONFIGS) {
    let score = 0;
    const patternConstraints = new Set(
      config.questions.map(q => q.targetConstraint)
    );

    for (const constraint of constraints) {
      if (patternConstraints.has(constraint)) {
        score++;
      }
    }

    if (score > 0) {
      scores.set(config.patternId, score);
    }
  }

  // Return pattern with highest score
  let bestPattern: PatternId | null = null;
  let bestScore = 0;

  for (const [pattern, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestPattern = pattern;
    }
  }

  return bestPattern;
}

// ============================================================================
// Question Shuffling (for variety)
// ============================================================================

/**
 * Creates a discovery config with shuffled questions.
 * Uses deterministic shuffling based on seed for reproducibility.
 */
export function shuffleQuestions(
  config: PatternDiscoveryConfig,
  seed: number
): PatternDiscoveryConfig {
  const shuffled = [...config.questions];

  // Simple seeded shuffle (Fisher-Yates with seeded random)
  let currentSeed = seed;
  const seededRandom = () => {
    currentSeed = (currentSeed * 1103515245 + 12345) % 2147483648;
    return currentSeed / 2147483648;
  };

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  return {
    ...config,
    questions: shuffled,
  };
}

// ============================================================================
// Discovery Progress
// ============================================================================

export interface DiscoveryProgress {
  readonly questionsAnswered: number;
  readonly questionsTotal: number;
  readonly percentComplete: number;
  readonly correctSoFar: number;
  readonly canRevealPattern: boolean;
}

/**
 * Calculates progress through a discovery session.
 */
export function calculateDiscoveryProgress(
  session: DiscoverySession
): DiscoveryProgress {
  const questionsTotal = session.config.questions.length;
  const questionsAnswered = session.answers.length;

  // Count correct so far
  let correctSoFar = 0;
  for (const answer of session.answers) {
    const question = session.config.questions.find(q => q.id === answer.questionId);
    if (question && answer.answer === question.expectedAnswer) {
      correctSoFar++;
    }
  }

  return {
    questionsAnswered,
    questionsTotal,
    percentComplete: (questionsAnswered / questionsTotal) * 100,
    correctSoFar,
    canRevealPattern: correctSoFar >= session.config.revealThreshold,
  };
}
