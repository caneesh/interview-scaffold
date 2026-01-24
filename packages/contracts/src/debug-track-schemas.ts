/**
 * Debug Track API Schemas
 *
 * Zod schemas for request/response validation in the Debug Track feature.
 * Follows existing patterns from schemas.ts.
 */

import { z } from 'zod';

// ============ Enums ============

export const DebugPatternCategorySchema = z.enum([
  'FUNCTIONAL_LOGIC',
  'ALGORITHMIC',
  'PERFORMANCE',
  'RESOURCE',
  'CONCURRENCY',
  'INTEGRATION',
  'DISTRIBUTED',
  'PRODUCTION_REALITY',
]);

export const DebugDifficultySchema = z.enum([
  'BEGINNER',
  'EASY',
  'INTERMEDIATE',
  'MEDIUM',
  'ADVANCED',
  'HARD',
  'EXPERT',
]);

export const DebugGateSchema = z.enum([
  'SYMPTOM_CLASSIFICATION',
  'DETERMINISM_ANALYSIS',
  'PATTERN_CLASSIFICATION',
  'ROOT_CAUSE_HYPOTHESIS',
  'FIX_STRATEGY',
  'REGRESSION_PREVENTION',
  'REFLECTION',
]);

export const DebugAttemptStatusSchema = z.enum([
  'IN_PROGRESS',
  'COMPLETED',
  'ABANDONED',
]);

// ============ Code Artifact ============

export const CodeArtifactSchema = z.object({
  filename: z.string(),
  content: z.string(),
  language: z.string(),
  isBuggy: z.boolean(),
  // Note: bugLineNumbers is NOT included - server-only field
});

// ============ Gate Evaluation Result ============

export const GateEvaluationResultSchema = z.object({
  isCorrect: z.boolean(),
  confidence: z.number().min(0).max(1),
  feedback: z.string(),
  rubricScores: z.record(z.number()),
  nextGate: DebugGateSchema.nullable(),
  allowProceed: z.boolean(),
});

// ============ Gate Submission ============

export const GateSubmissionSchema = z.object({
  gateId: DebugGateSchema,
  answer: z.string(),
  timestamp: z.coerce.date(),
  evaluationResult: GateEvaluationResultSchema,
});

// ============ Debug Attempt Score ============

export const DebugAttemptScoreSchema = z.object({
  overall: z.number().min(0).max(1),
  symptomClassification: z.number().min(0).max(1),
  rootCauseAnalysis: z.number().min(0).max(1),
  fixQuality: z.number().min(0).max(1),
  regressionPrevention: z.number().min(0).max(1),
  hintsDeduction: z.number().min(0).max(1),
});

// ============ Debug Scenario (Client-Safe) ============

/**
 * Debug scenario response schema.
 * IMPORTANT: Does NOT include expectedFindings, bugLineNumbers, or other solution-revealing fields.
 */
export const DebugScenarioResponseSchema = z.object({
  id: z.string(),
  category: DebugPatternCategorySchema,
  patternKey: z.string(),
  difficulty: DebugDifficultySchema,
  symptomDescription: z.string(),
  codeArtifacts: z.array(CodeArtifactSchema),
  tags: z.array(z.string()),
  createdAt: z.coerce.date(),
  // Note: expectedFindings, fixStrategies, regressionExpectation, hintLadder are NOT included
});

/**
 * Scenario list item (minimal info for browsing)
 */
export const DebugScenarioListItemSchema = z.object({
  id: z.string(),
  category: DebugPatternCategorySchema,
  patternKey: z.string(),
  difficulty: DebugDifficultySchema,
  symptomDescription: z.string(),
  tags: z.array(z.string()),
});

// ============ Debug Attempt ============

export const DebugAttemptSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  scenarioId: z.string(),
  currentGate: DebugGateSchema,
  gateHistory: z.array(GateSubmissionSchema),
  hintsUsed: z.number().int().min(0),
  status: DebugAttemptStatusSchema,
  score: DebugAttemptScoreSchema.nullable(),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date(),
});

// ============ API Request Schemas ============

/**
 * POST /api/debug/attempts/start
 */
export const StartDebugAttemptRequestSchema = z.object({
  scenarioId: z.string().uuid(),
});

/**
 * POST /api/debug/attempts/[attemptId]/submit
 */
export const SubmitDebugGateRequestSchema = z.object({
  gateId: DebugGateSchema,
  answer: z.string().min(1, 'Answer is required').max(5000, 'Answer is too long'),
});

/**
 * POST /api/debug/attempts/[attemptId]/hint
 */
export const RequestDebugHintRequestSchema = z.object({
  // No body required, but including for consistency
});

/**
 * POST /api/debug/attempts/[attemptId]/finalize
 */
export const FinalizeDebugAttemptRequestSchema = z.object({
  // No body required
});

/**
 * GET /api/debug/scenarios (query params)
 */
export const ListDebugScenariosQuerySchema = z.object({
  category: DebugPatternCategorySchema.optional(),
  difficulty: DebugDifficultySchema.optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// ============ API Response Schemas ============

/**
 * Response for POST /api/debug/attempts/start
 */
export const StartDebugAttemptResponseSchema = z.object({
  attempt: DebugAttemptSchema,
  scenario: DebugScenarioResponseSchema,
  currentGatePrompt: z.string(),
});

/**
 * Response for POST /api/debug/attempts/[attemptId]/submit
 */
export const SubmitDebugGateResponseSchema = z.object({
  attempt: DebugAttemptSchema,
  evaluation: GateEvaluationResultSchema,
  nextGatePrompt: z.string().nullable(),
  isComplete: z.boolean(),
});

/**
 * Response for POST /api/debug/attempts/[attemptId]/hint
 */
export const RequestDebugHintResponseSchema = z.object({
  attempt: DebugAttemptSchema,
  hint: z.string(),
  hintNumber: z.number().int().positive(),
  hintsRemaining: z.number().int().min(0),
});

/**
 * Response for POST /api/debug/attempts/[attemptId]/finalize
 */
export const FinalizeDebugAttemptResponseSchema = z.object({
  attempt: DebugAttemptSchema,
  score: DebugAttemptScoreSchema,
  summary: z.object({
    gatesCompleted: z.number().int(),
    totalGates: z.number().int(),
    hintsUsed: z.number().int(),
    timeSpentSeconds: z.number(),
  }),
});

/**
 * Response for GET /api/debug/scenarios
 */
export const ListDebugScenariosResponseSchema = z.object({
  scenarios: z.array(DebugScenarioListItemSchema),
  total: z.number().int().min(0),
  hasMore: z.boolean(),
});

/**
 * Response for GET /api/debug/attempts/[attemptId]
 */
export const GetDebugAttemptResponseSchema = z.object({
  attempt: DebugAttemptSchema,
  scenario: DebugScenarioResponseSchema,
  currentGatePrompt: z.string().nullable(),
});

// ============ Error Response ============

export const DebugTrackErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

// ============ Type Exports ============

export type DebugPatternCategory = z.infer<typeof DebugPatternCategorySchema>;
export type DebugDifficulty = z.infer<typeof DebugDifficultySchema>;
export type DebugGate = z.infer<typeof DebugGateSchema>;
export type DebugAttemptStatus = z.infer<typeof DebugAttemptStatusSchema>;
export type CodeArtifact = z.infer<typeof CodeArtifactSchema>;
export type GateEvaluationResult = z.infer<typeof GateEvaluationResultSchema>;
export type GateSubmission = z.infer<typeof GateSubmissionSchema>;
export type DebugAttemptScore = z.infer<typeof DebugAttemptScoreSchema>;
export type DebugScenarioResponse = z.infer<typeof DebugScenarioResponseSchema>;
export type DebugAttempt = z.infer<typeof DebugAttemptSchema>;
export type StartDebugAttemptRequest = z.infer<typeof StartDebugAttemptRequestSchema>;
export type SubmitDebugGateRequest = z.infer<typeof SubmitDebugGateRequestSchema>;
export type ListDebugScenariosQuery = z.infer<typeof ListDebugScenariosQuerySchema>;
export type StartDebugAttemptResponse = z.infer<typeof StartDebugAttemptResponseSchema>;
export type SubmitDebugGateResponse = z.infer<typeof SubmitDebugGateResponseSchema>;
export type RequestDebugHintResponse = z.infer<typeof RequestDebugHintResponseSchema>;
export type FinalizeDebugAttemptResponse = z.infer<typeof FinalizeDebugAttemptResponseSchema>;
export type ListDebugScenariosResponse = z.infer<typeof ListDebugScenariosResponseSchema>;
export type GetDebugAttemptResponse = z.infer<typeof GetDebugAttemptResponseSchema>;
