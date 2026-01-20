/**
 * Learner-Centric Interview Coaching System - Core Types
 *
 * This module defines the type system for the coaching stages:
 * 1. Problem Framing - Socratic questions for problem understanding
 * 2. Pattern Recognition Gate - Pattern identification with justification
 * 3. Feynman Validator - Conceptual clarity via Feynman Technique
 * 4. Strategy Design - Reasoning ability and gap identification
 * 5. Coding Silent Interviewer - Non-directive coding guidance
 * 6. Tiered Help System - 5-level progressive hint ladder
 * 7. Reflection and Reinforcement - Post-solution learning
 */

import type { PatternId } from '../entities/pattern.js';
import type { Problem } from '../entities/problem.js';

// ============ Coaching Session Types ============

/**
 * Coaching stages in order of a typical interview flow
 */
export const COACHING_STAGES = [
  'PROBLEM_FRAMING',
  'PATTERN_RECOGNITION',
  'FEYNMAN_VALIDATION',
  'STRATEGY_DESIGN',
  'CODING',
  'REFLECTION',
] as const;

export type CoachingStage = (typeof COACHING_STAGES)[number];

/**
 * Overall coaching session state
 */
export interface CoachingSession {
  readonly id: string;
  readonly attemptId: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly problemId: string;
  readonly currentStage: CoachingStage;
  readonly stageData: CoachingStageData;
  readonly helpLevel: HelpLevel;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
}

/**
 * Stage-specific data container
 */
export interface CoachingStageData {
  readonly problemFraming: ProblemFramingData | null;
  readonly patternRecognition: PatternRecognitionData | null;
  readonly feynmanValidation: FeynmanValidationData | null;
  readonly strategyDesign: StrategyDesignData | null;
  readonly coding: CodingCoachData | null;
  readonly reflection: CoachingReflectionData | null;
}

// ============ Problem Framing (Stage 1) ============

/**
 * Problem framing ensures understanding before pattern/code
 * - No code allowed
 * - No patterns mentioned
 * - At most 3 questions at a time
 * - Probes deeper on shallow answers
 */
export interface ProblemFramingData {
  readonly questions: readonly ProblemFramingQuestion[];
  readonly currentQuestionBatch: readonly string[];
  readonly isComplete: boolean;
  readonly understandingScore: number; // 0-1
}

export interface ProblemFramingQuestion {
  readonly id: string;
  readonly question: string;
  readonly category: ProblemFramingCategory;
  readonly userAnswer: string | null;
  readonly answerQuality: AnswerQuality | null;
  readonly followUpQuestion: string | null;
  readonly timestamp: Date;
}

export const PROBLEM_FRAMING_CATEGORIES = [
  'INPUT_OUTPUT',      // What is the input/output format?
  'CONSTRAINTS',       // What are the constraints?
  'EDGE_CASES',        // What are edge cases?
  'EXAMPLES',          // Can you walk through an example?
  'CLARIFICATION',     // What needs clarification?
  'RESTATEMENT',       // Can you restate the problem?
] as const;

export type ProblemFramingCategory = (typeof PROBLEM_FRAMING_CATEGORIES)[number];

export const ANSWER_QUALITIES = ['SHALLOW', 'ADEQUATE', 'DEEP'] as const;
export type AnswerQuality = (typeof ANSWER_QUALITIES)[number];

// ============ Pattern Recognition Gate (Stage 2) ============

/**
 * Pattern recognition gate validates pattern selection
 * - Accept only pattern names
 * - Require justification
 * - Guide with questions if incorrect (never reveal)
 * - Return PASSED/FAILED status
 */
export interface PatternRecognitionData {
  readonly selectedPattern: PatternId | null;
  readonly justification: string | null;
  readonly attempts: readonly PatternAttempt[];
  readonly status: PatternGateStatus;
  readonly guidingQuestions: readonly string[];
}

export interface PatternAttempt {
  readonly pattern: PatternId;
  readonly justification: string;
  readonly isCorrect: boolean;
  readonly feedback: PatternFeedback;
  readonly timestamp: Date;
}

export interface PatternFeedback {
  readonly type: 'CORRECT' | 'CLOSE' | 'INCORRECT';
  readonly guidingQuestion: string | null;
  readonly hint: string | null;
}

export const PATTERN_GATE_STATUSES = ['PENDING', 'PASSED', 'FAILED'] as const;
export type PatternGateStatus = (typeof PATTERN_GATE_STATUSES)[number];

// ============ Feynman Validator (Stage 3) ============

/**
 * Feynman validation checks conceptual clarity
 * - No jargon allowed
 * - No circular logic
 * - Understandable by 12-year-old
 * - Max 5 sentences
 * - Ask ONE clarifying question if weak
 */
export interface FeynmanValidationData {
  readonly explanation: string | null;
  readonly validation: FeynmanValidationResult | null;
  readonly attempts: readonly FeynmanAttempt[];
  readonly isComplete: boolean;
}

export interface FeynmanAttempt {
  readonly explanation: string;
  readonly validation: FeynmanValidationResult;
  readonly timestamp: Date;
}

export interface FeynmanValidationResult {
  readonly isValid: boolean;
  readonly score: number; // 0-1
  readonly issues: readonly FeynmanIssue[];
  readonly clarifyingQuestion: string | null;
}

export interface FeynmanIssue {
  readonly type: FeynmanIssueType;
  readonly description: string;
  readonly excerpt: string | null;
}

export const FEYNMAN_ISSUE_TYPES = [
  'JARGON',           // Contains technical jargon
  'CIRCULAR',         // Circular reasoning
  'TOO_COMPLEX',      // Not understandable by 12yo
  'TOO_LONG',         // Exceeds 5 sentences
  'INCOMPLETE',       // Missing key concept
  'VAGUE',            // Too vague or hand-wavy
] as const;

export type FeynmanIssueType = (typeof FEYNMAN_ISSUE_TYPES)[number];

// ============ Strategy Design (Stage 4) ============

/**
 * Strategy design validates reasoning ability
 * - Identify logical gaps
 * - Identify contradictions
 * - Identify missing edge cases
 * - Ask adversarial "what if" questions
 * - Confirm readiness if coherent
 */
export interface StrategyDesignData {
  readonly strategy: string | null;
  readonly validation: StrategyValidationResult | null;
  readonly adversarialQuestions: readonly AdversarialQuestion[];
  readonly isReadyToCode: boolean;
}

export interface StrategyValidationResult {
  readonly isCoherent: boolean;
  readonly gaps: readonly StrategyGap[];
  readonly contradictions: readonly StrategyContradiction[];
  readonly missingEdgeCases: readonly string[];
  readonly overallScore: number; // 0-1
}

export interface StrategyGap {
  readonly id: string;
  readonly description: string;
  readonly severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  readonly suggestion: string | null;
}

export interface StrategyContradiction {
  readonly id: string;
  readonly statement1: string;
  readonly statement2: string;
  readonly explanation: string;
}

export interface AdversarialQuestion {
  readonly id: string;
  readonly question: string;
  readonly category: AdversarialCategory;
  readonly userAnswer: string | null;
  readonly isResolved: boolean;
  readonly timestamp: Date;
}

export const ADVERSARIAL_CATEGORIES = [
  'EDGE_CASE',        // What if input is empty?
  'CONSTRAINT',       // What if value exceeds limit?
  'INVARIANT',        // How do you maintain this property?
  'COMPLEXITY',       // What is the time complexity of this step?
  'STATE',            // What state changes here?
] as const;

export type AdversarialCategory = (typeof ADVERSARIAL_CATEGORIES)[number];

// ============ Coding Silent Interviewer (Stage 5) ============

/**
 * Coding silent interviewer provides non-directive guidance
 * - Never provide full code or complete functions
 * - Point out invariant violations
 * - Ask what variables represent
 * - Ask what conditions guarantee correctness
 * - Warn about off-by-one or state drift
 */
export interface CodingCoachData {
  readonly observations: readonly CodingObservation[];
  readonly questions: readonly CodingQuestion[];
  readonly warnings: readonly CodingWarning[];
}

export interface CodingObservation {
  readonly id: string;
  readonly type: CodingObservationType;
  readonly description: string;
  readonly lineNumber: number | null;
  readonly codeExcerpt: string | null;
  readonly timestamp: Date;
}

export const CODING_OBSERVATION_TYPES = [
  'INVARIANT_VIOLATION',
  'STATE_DRIFT',
  'OFF_BY_ONE_RISK',
  'MISSING_CHECK',
  'COMPLEXITY_CONCERN',
  'PATTERN_MISMATCH',
] as const;

export type CodingObservationType = (typeof CODING_OBSERVATION_TYPES)[number];

export interface CodingQuestion {
  readonly id: string;
  readonly question: string;
  readonly category: CodingQuestionCategory;
  readonly targetVariable: string | null;
  readonly userAnswer: string | null;
  readonly timestamp: Date;
}

export const CODING_QUESTION_CATEGORIES = [
  'VARIABLE_PURPOSE',     // What does this variable represent?
  'CONDITION_GUARANTEE',  // What condition guarantees correctness?
  'LOOP_INVARIANT',       // What is the loop invariant?
  'TERMINATION',          // How does this terminate?
  'BOUNDARY',             // What happens at the boundary?
] as const;

export type CodingQuestionCategory = (typeof CODING_QUESTION_CATEGORIES)[number];

export interface CodingWarning {
  readonly id: string;
  readonly type: CodingWarningType;
  readonly description: string;
  readonly lineNumber: number | null;
  readonly timestamp: Date;
}

export const CODING_WARNING_TYPES = [
  'OFF_BY_ONE',
  'INDEX_BOUNDS',
  'NULL_CHECK',
  'INFINITE_LOOP_RISK',
  'STATE_MUTATION',
  'MISSING_RETURN',
] as const;

export type CodingWarningType = (typeof CODING_WARNING_TYPES)[number];

// ============ Tiered Help System (Stage 6) ============

/**
 * 5-level help ladder:
 * Level 1: Question exposing missing insight
 * Level 2: Conceptual hint
 * Level 3: Condition or invariant
 * Level 4: Structural skeleton without logic
 * Level 5: Full solution (only if explicitly requested)
 */
export const HELP_LEVELS = [1, 2, 3, 4, 5] as const;
export type HelpLevel = (typeof HELP_LEVELS)[number];

export interface TieredHelp {
  readonly level: HelpLevel;
  readonly content: string;
  readonly type: HelpType;
  readonly isExplicitlyRequested: boolean;
}

export const HELP_TYPES = [
  'INSIGHT_QUESTION',     // Level 1: Question exposing missing insight
  'CONCEPTUAL_HINT',      // Level 2: Conceptual hint
  'INVARIANT_CONDITION',  // Level 3: Condition or invariant
  'STRUCTURAL_SKELETON',  // Level 4: Skeleton without logic
  'FULL_SOLUTION',        // Level 5: Full solution
] as const;

export type HelpType = (typeof HELP_TYPES)[number];

export interface HelpRequest {
  readonly currentLevel: HelpLevel;
  readonly requestedLevel: HelpLevel;
  readonly reason: string | null;
  readonly timestamp: Date;
}

// ============ Reflection and Reinforcement (Stage 7) ============

/**
 * Reflection captures learnings:
 * - Key insight
 * - What almost misled you
 * - How to recognize faster
 * - Pattern trigger signals
 * - Follow-up problems
 */
export interface CoachingReflectionData {
  readonly keyInsight: string | null;
  readonly misleadingFactors: readonly string[];
  readonly recognitionTips: string | null;
  readonly patternTriggers: readonly PatternTrigger[];
  readonly suggestedFollowUps: readonly FollowUpProblem[];
  readonly isComplete: boolean;
}

export interface PatternTrigger {
  readonly signal: string;
  readonly patternId: PatternId;
  readonly confidence: number; // 0-1
}

export interface FollowUpProblem {
  readonly problemId: string;
  readonly title: string;
  readonly reason: string | null;
}

// ============ Coach Response Types ============

/**
 * Unified response type for all coaching interactions
 */
export interface CoachResponse {
  readonly type: CoachResponseType;
  readonly content: string;
  readonly questions: readonly string[];
  readonly helpLevel: HelpLevel | null;
  readonly nextAction: CoachNextAction;
  readonly metadata: CoachResponseMetadata;
}

export const COACH_RESPONSE_TYPES = [
  'QUESTION',
  'FEEDBACK',
  'GUIDANCE',
  'WARNING',
  'HINT',
  'CONGRATULATIONS',
  'NEXT_STAGE',
] as const;

export type CoachResponseType = (typeof COACH_RESPONSE_TYPES)[number];

export const COACH_NEXT_ACTIONS = [
  'CONTINUE',           // Continue in current stage
  'ADVANCE',            // Move to next stage
  'RETRY',              // Retry current step
  'REQUEST_HELP',       // User should request help
  'COMPLETE',           // Session complete
] as const;

export type CoachNextAction = (typeof COACH_NEXT_ACTIONS)[number];

export interface CoachResponseMetadata {
  readonly stage: CoachingStage;
  readonly attemptCount: number;
  readonly helpUsed: number;
  readonly timeElapsed: number;
}

// ============ LLM Port Interface ============

/**
 * Port for LLM-powered coaching features
 */
export interface CoachingLLMPort {
  /**
   * Check if LLM is available
   */
  isEnabled(): boolean;

  /**
   * Generate Socratic questions for problem framing
   */
  generateFramingQuestions(
    problem: Problem,
    previousAnswers: readonly ProblemFramingQuestion[]
  ): Promise<readonly string[]>;

  /**
   * Validate Feynman explanation
   */
  validateFeynmanExplanation(
    problem: Problem,
    explanation: string
  ): Promise<FeynmanValidationResult>;

  /**
   * Generate adversarial questions for strategy
   */
  generateAdversarialQuestions(
    problem: Problem,
    strategy: string
  ): Promise<readonly AdversarialQuestion[]>;

  /**
   * Analyze code for silent interviewer observations
   */
  analyzeCode(
    problem: Problem,
    code: string,
    language: string
  ): Promise<{
    observations: readonly CodingObservation[];
    questions: readonly CodingQuestion[];
    warnings: readonly CodingWarning[];
  }>;

  /**
   * Generate tiered help content
   */
  generateHelp(
    problem: Problem,
    level: HelpLevel,
    context: { code?: string; strategy?: string }
  ): Promise<TieredHelp>;

  /**
   * Generate reflection summary and follow-ups
   */
  generateReflection(
    problem: Problem,
    session: CoachingSession
  ): Promise<{
    keyInsight: string;
    patternTriggers: readonly PatternTrigger[];
    suggestedFollowUps: readonly FollowUpProblem[];
  }>;
}

/**
 * Creates a null LLM port (uses deterministic rules only)
 */
export function createNullCoachingLLM(): CoachingLLMPort {
  return {
    isEnabled: () => false,
    generateFramingQuestions: async () => [],
    validateFeynmanExplanation: async () => ({
      isValid: true,
      score: 0,
      issues: [],
      clarifyingQuestion: null,
    }),
    generateAdversarialQuestions: async () => [],
    analyzeCode: async () => ({
      observations: [],
      questions: [],
      warnings: [],
    }),
    generateHelp: async (_problem, level) => ({
      level,
      content: '',
      type: 'INSIGHT_QUESTION' as const,
      isExplicitlyRequested: false,
    }),
    generateReflection: async () => ({
      keyInsight: '',
      patternTriggers: [],
      suggestedFollowUps: [],
    }),
  };
}
