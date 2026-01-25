/**
 * Socratic Coach Schemas - Evidence-Gated AI Coaching for Coding Track
 *
 * Core principle: All AI outputs MUST reference evidenceRefs from evaluation results.
 * No fabricated feedback - every claim needs a citation to test results, gate outcomes,
 * or attempt history.
 */

import { z } from 'zod';
import { PatternIdSchema, TestResultDataSchema, HintLevelSchema } from './schemas.js';

// ============ Evidence Reference Schema ============

/**
 * Evidence reference that traces back to evaluation data
 */
export const EvidenceRefSchema = z.object({
  /** Type of evidence source */
  source: z.enum([
    'test_result',       // From coding_test_results / evaluation_runs
    'gate_outcome',      // From thinking gate, reflection gate
    'attempt_history',   // From previous submissions/steps
    'hint_ladder',       // From hint data used
    'pattern_discovery', // From pattern discovery flow
    'submission',        // From current submission data
  ]),
  /** Unique identifier of the source (testId, stepId, etc.) */
  sourceId: z.string(),
  /** Human-readable description of what this evidence shows */
  description: z.string(),
  /** Optional: specific field or value from the source */
  detail: z.string().optional(),
});

export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

// ============ Mistake Analysis Schema ============

/**
 * MistakeAnalysis - Evidence-based analysis of student mistakes
 * Every field MUST be backed by evidenceRefs
 */
export const MistakeAnalysisSchema = z.object({
  /** IDs of tests that failed */
  testsFailed: z.array(z.string()),
  /** Concept the student appears to be struggling with */
  conceptMissed: z.string(),
  /** References to evaluation data backing this analysis */
  evidenceRefs: z.array(EvidenceRefSchema).min(1, 'At least one evidence reference required'),
  /** Suggested area to focus on (without giving answer) */
  suggestedFocus: z.string(),
  /** Confidence in this analysis (0-1) */
  confidence: z.number().min(0).max(1),
  /** Pattern being practiced */
  pattern: PatternIdSchema,
  /** Number of attempts on this problem */
  attemptCount: z.number().int().min(1),
});

export type MistakeAnalysis = z.infer<typeof MistakeAnalysisSchema>;

// ============ Socratic Question Schema ============

/**
 * Difficulty levels for Socratic questions
 */
export const SocraticDifficultySchema = z.enum([
  'hint',      // Gentle nudge in right direction
  'probe',     // Deeper exploration of understanding
  'challenge', // Test depth of knowledge
]);

export type SocraticDifficulty = z.infer<typeof SocraticDifficultySchema>;

/**
 * SocraticQuestion - A question to guide student thinking
 * Must NOT give away the answer; must cite evidence
 */
export const SocraticQuestionSchema = z.object({
  /** Unique ID for this question */
  id: z.string(),
  /** The question text (must not reveal answer) */
  question: z.string(),
  /** Target concept this question addresses */
  targetConcept: z.string(),
  /** Difficulty level of the question */
  difficulty: SocraticDifficultySchema,
  /** Evidence that justifies asking this question */
  evidenceRefs: z.array(EvidenceRefSchema).min(1, 'At least one evidence reference required'),
  /** Optional: expected characteristics of a good answer (for validation) */
  successCriteria: z.array(z.string()).optional(),
  /** Optional: follow-up questions if student is still stuck */
  followUpQuestions: z.array(z.string()).optional(),
});

export type SocraticQuestion = z.infer<typeof SocraticQuestionSchema>;

// ============ Validation Result Schema ============

/**
 * Next action after validating student response
 */
export const SocraticNextActionSchema = z.enum([
  'continue',  // Move to next question/concept
  'retry',     // Ask a clarifying or simpler question
  'escalate',  // Provide more direct hint (move up hint ladder)
  'complete',  // Student has demonstrated understanding
  'needs_more_info', // Insufficient evidence to make decision
]);

export type SocraticNextAction = z.infer<typeof SocraticNextActionSchema>;

/**
 * ValidationResult - Assessment of student's Socratic response
 */
export const SocraticValidationResultSchema = z.object({
  /** Whether the response demonstrates understanding */
  isCorrect: z.boolean(),
  /** Feedback for the student (must not reveal answer) */
  feedback: z.string(),
  /** What should happen next */
  nextAction: SocraticNextActionSchema,
  /** Evidence supporting this validation */
  evidenceRefs: z.array(EvidenceRefSchema),
  /** Confidence in this assessment (0-1) */
  confidence: z.number().min(0).max(1),
  /** If escalating, which hint level to use */
  escalateToHintLevel: HintLevelSchema.optional(),
});

export type SocraticValidationResult = z.infer<typeof SocraticValidationResultSchema>;

// ============ Next Action Schema ============

/**
 * NextAction - Recommended next step with evidence
 */
export const NextActionSchema = z.object({
  /** The recommended action */
  action: z.enum([
    'ask_socratic_question',
    'provide_hint',
    'suggest_trace',
    'suggest_test_case',
    'prompt_pattern_review',
    'prompt_invariant_review',
    'allow_retry',
    'mark_complete',
    'needs_more_info',
  ]),
  /** Reason for this recommendation */
  reason: z.string(),
  /** Evidence supporting this recommendation */
  evidenceRefs: z.array(EvidenceRefSchema).min(1, 'At least one evidence reference required'),
  /** Optional: specific data for the action */
  actionData: z.record(z.unknown()).optional(),
});

export type NextAction = z.infer<typeof NextActionSchema>;

// ============ Socratic Turn Schema ============

/**
 * A turn in the Socratic dialogue
 */
export const SocraticTurnSchema = z.object({
  /** Unique ID for this turn */
  id: z.string(),
  /** Role in the dialogue */
  role: z.enum(['assistant', 'user']),
  /** Content of the turn */
  content: z.string(),
  /** For assistant: the question asked; for user: analysis of response */
  metadata: z.object({
    /** For assistant turns: reference to the SocraticQuestion */
    questionId: z.string().optional(),
    /** For user turns: validation result */
    validationResult: SocraticValidationResultSchema.optional(),
    /** Timestamp */
    timestamp: z.string().datetime(),
  }),
});

export type SocraticTurn = z.infer<typeof SocraticTurnSchema>;

// ============ AI Feedback Artifact Schema ============

/**
 * Types of AI feedback artifacts
 */
export const AIFeedbackTypeSchema = z.enum([
  'mistake_analysis',
  'socratic_question',
  'socratic_validation',
  'next_action',
]);

export type AIFeedbackType = z.infer<typeof AIFeedbackTypeSchema>;

/**
 * AI Feedback - Persisted AI-generated feedback artifact
 */
export const AIFeedbackSchema = z.object({
  /** Unique ID */
  id: z.string(),
  /** Attempt this feedback relates to */
  attemptId: z.string(),
  /** Step this feedback relates to (optional) */
  stepId: z.string().optional(),
  /** Type of feedback */
  type: AIFeedbackTypeSchema,
  /** The feedback content (MistakeAnalysis, SocraticQuestion, etc.) */
  content: z.union([
    MistakeAnalysisSchema,
    SocraticQuestionSchema,
    SocraticValidationResultSchema,
    NextActionSchema,
  ]),
  /** Whether AI was used or deterministic fallback */
  source: z.enum(['ai', 'deterministic']),
  /** Model used (if AI) */
  model: z.string().optional(),
  /** Created timestamp */
  createdAt: z.string().datetime(),
});

export type AIFeedback = z.infer<typeof AIFeedbackSchema>;

// ============ Socratic Context Schema ============

/**
 * Context provided to AI for generating Socratic questions
 */
export const SocraticContextSchema = z.object({
  /** Attempt ID */
  attemptId: z.string(),
  /** Problem ID */
  problemId: z.string(),
  /** Problem statement (no solution) */
  problemStatement: z.string(),
  /** Expected pattern */
  pattern: PatternIdSchema,
  /** Current rung level */
  rung: z.number().int().min(1).max(5),
  /** Latest submission code */
  latestCode: z.string(),
  /** Latest submission language */
  language: z.string(),
  /** Test results from evaluation */
  testResults: z.array(TestResultDataSchema),
  /** Thinking gate data if available */
  thinkingGateData: z.object({
    selectedPattern: z.string().nullable(),
    statedInvariant: z.string().nullable(),
    passed: z.boolean(),
  }).optional(),
  /** Previous Socratic turns in this session */
  previousTurns: z.array(SocraticTurnSchema),
  /** Hints already used */
  hintsUsed: z.array(HintLevelSchema),
  /** Number of code submissions */
  codeSubmissions: z.number().int().min(0),
});

export type SocraticContext = z.infer<typeof SocraticContextSchema>;

// ============ Validation Context Schema ============

/**
 * Context provided to AI for validating Socratic response
 */
export const ValidationContextSchema = z.object({
  /** The Socratic question that was asked */
  question: SocraticQuestionSchema,
  /** Student's response */
  userResponse: z.string(),
  /** Full context of the attempt */
  attemptContext: SocraticContextSchema,
  /** Success criteria from the question (if any) */
  successCriteria: z.array(z.string()).optional(),
});

export type ValidationContext = z.infer<typeof ValidationContextSchema>;

// ============ API Request/Response Schemas ============

/**
 * POST /api/socratic-coach/generate-question
 */
export const GenerateSocraticQuestionRequestSchema = z.object({
  attemptId: z.string(),
  /** Optional: specific concept to focus on */
  focusConcept: z.string().optional(),
  /** Optional: preferred difficulty */
  preferredDifficulty: SocraticDifficultySchema.optional(),
});

export const GenerateSocraticQuestionResponseSchema = z.object({
  /** The generated question */
  question: SocraticQuestionSchema,
  /** Analysis of the mistake */
  mistakeAnalysis: MistakeAnalysisSchema,
  /** Recommended next action */
  nextAction: NextActionSchema,
  /** Whether AI or deterministic was used */
  source: z.enum(['ai', 'deterministic']),
});

/**
 * POST /api/socratic-coach/validate-response
 */
export const ValidateSocraticResponseRequestSchema = z.object({
  attemptId: z.string(),
  questionId: z.string(),
  userResponse: z.string(),
});

export const ValidateSocraticResponseResponseSchema = z.object({
  /** Validation result */
  validation: SocraticValidationResultSchema,
  /** Follow-up question if continuing */
  followUpQuestion: SocraticQuestionSchema.optional(),
  /** Recommended next action */
  nextAction: NextActionSchema,
  /** Whether AI or deterministic was used */
  source: z.enum(['ai', 'deterministic']),
});

// ============ Type Exports ============

export type GenerateSocraticQuestionRequest = z.infer<typeof GenerateSocraticQuestionRequestSchema>;
export type GenerateSocraticQuestionResponse = z.infer<typeof GenerateSocraticQuestionResponseSchema>;
export type ValidateSocraticResponseRequest = z.infer<typeof ValidateSocraticResponseRequestSchema>;
export type ValidateSocraticResponseResponse = z.infer<typeof ValidateSocraticResponseResponseSchema>;
