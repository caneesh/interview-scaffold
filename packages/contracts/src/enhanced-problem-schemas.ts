/**
 * Enhanced Problem Metadata Zod Schemas
 *
 * Validation schemas for the extended problem metadata.
 */

import { z } from 'zod';
import { PatternIdSchema, RungLevelSchema, TestCaseSchema } from './schemas.js';

// ============ Pattern Family ============

export const PatternFamilySchema = z.enum([
  'ARRAY_TRAVERSAL',
  'SEARCH',
  'OPTIMIZATION',
  'GRAPH',
  'STRING',
  'TREE',
  'BACKTRACKING',
  'INTERVAL',
  'DATA_STRUCTURE',
]);

export type PatternFamily = z.infer<typeof PatternFamilySchema>;

// ============ Prerequisite Skills ============

export const PrerequisiteSkillSchema = z.enum([
  'arrays',
  'linked_lists',
  'stacks',
  'queues',
  'hash_maps',
  'sets',
  'heaps',
  'trees',
  'graphs',
  'recursion',
  'iteration',
  'sorting',
  'searching',
  'divide_and_conquer',
  'dynamic_programming_basics',
  'greedy_basics',
  'graph_traversal',
  'modular_arithmetic',
  'combinatorics',
  'probability',
  'geometry',
  'time_complexity',
  'space_complexity',
  'amortized_analysis',
]);

export type PrerequisiteSkill = z.infer<typeof PrerequisiteSkillSchema>;

// ============ Concept Trigger ============

export const ConceptTriggerSchema = z.object({
  signal: z.string().min(1),
  pattern: PatternIdSchema,
  strength: z.number().min(0).max(1),
  explanation: z.string(),
});

export type ConceptTrigger = z.infer<typeof ConceptTriggerSchema>;

// ============ Common Misconception ============

export const CommonMisconceptionSchema = z.object({
  id: z.string(),
  description: z.string(),
  whyWrong: z.string(),
  correction: z.string(),
  wrongPattern: PatternIdSchema.optional(),
  frequency: z.number().min(0).max(1),
});

export type CommonMisconception = z.infer<typeof CommonMisconceptionSchema>;

// ============ Edge Case Category ============

export const EdgeCaseCategorySchema = z.enum([
  'empty_input',
  'single_element',
  'all_same',
  'sorted_ascending',
  'sorted_descending',
  'max_values',
  'min_values',
  'negative_values',
  'zero_values',
  'duplicates',
  'large_input',
  'boundary_conditions',
  'overflow_potential',
  'special_characters',
  'unicode',
  'null_or_undefined',
]);

export type EdgeCaseCategory = z.infer<typeof EdgeCaseCategorySchema>;

// ============ Edge Case Metadata ============

export const EdgeCaseMetadataSchema = z.object({
  category: EdgeCaseCategorySchema,
  description: z.string(),
  exampleInput: z.string(),
  expectedOutput: z.string(),
  trickyBecause: z.string(),
  priority: z.number().int().positive(),
});

export type EdgeCaseMetadata = z.infer<typeof EdgeCaseMetadataSchema>;

// ============ Scoring Weights ============

/**
 * Epsilon value for floating point comparison in scoring weights.
 * Uses a tighter tolerance than the default 0.001 to catch more precision issues
 * while still allowing for typical IEEE 754 floating point arithmetic errors.
 *
 * Number.EPSILON (~2.22e-16) is too tight for summing 6 numbers,
 * so we use Number.EPSILON * 100 which is approximately 2.22e-14.
 * This is still much tighter than 0.001 but accounts for cumulative error.
 */
const SCORING_WEIGHTS_EPSILON = Number.EPSILON * 100;

export const ScoringWeightsSchema = z.object({
  problemFraming: z.number().min(0).max(1),
  patternRecognition: z.number().min(0).max(1),
  feynmanValidation: z.number().min(0).max(1),
  strategyDesign: z.number().min(0).max(1),
  coding: z.number().min(0).max(1),
  reflection: z.number().min(0).max(1),
}).refine(
  (data) => {
    const sum = data.problemFraming +
                data.patternRecognition +
                data.feynmanValidation +
                data.strategyDesign +
                data.coding +
                data.reflection;
    return Math.abs(sum - 1.0) < SCORING_WEIGHTS_EPSILON;
  },
  { message: 'Scoring weights must sum to 1.0' }
);

export type ScoringWeights = z.infer<typeof ScoringWeightsSchema>;

// ============ Enhanced Test Case ============

export const EnhancedTestCaseSchema = TestCaseSchema.extend({
  category: z.enum(['basic', 'edge', 'performance', 'hidden']),
  validates: z.string(),
  failureHints: z.array(z.string()).optional(),
  timeLimitMs: z.number().positive().optional(),
  memoryLimitBytes: z.number().positive().optional(),
});

export type EnhancedTestCase = z.infer<typeof EnhancedTestCaseSchema>;

// ============ Test Case Metadata ============

export const TestCaseMetadataSchema = z.object({
  totalCount: z.number().int().min(0),
  visibleCount: z.number().int().min(0),
  hiddenCount: z.number().int().min(0),
  edgeCaseCount: z.number().int().min(0),
  performanceCount: z.number().int().min(0),
  categoriesCovered: z.array(EdgeCaseCategorySchema),
});

export type TestCaseMetadata = z.infer<typeof TestCaseMetadataSchema>;

// ============ Follow-up Type ============

export const FollowupTypeSchema = z.enum([
  'easier',
  'harder',
  'twist',
  'trick',
  'related',
  'composite',
]);

export type FollowupType = z.infer<typeof FollowupTypeSchema>;

// ============ Follow-up Problem Reference ============

export const FollowupProblemRefSchema = z.object({
  problemId: z.string(),
  type: FollowupTypeSchema,
  reason: z.string(),
  suggestWhen: z.enum(['after_success', 'after_struggle', 'always']),
  priority: z.number().int().positive(),
});

export type FollowupProblemRef = z.infer<typeof FollowupProblemRefSchema>;

// ============ Anti-Cheat Marker ============

export const AntiCheatMarkerSchema = z.object({
  phrase: z.string().min(1),
  isRegex: z.boolean(),
  confidence: z.number().min(0).max(1),
  source: z.string().optional(),
});

export type AntiCheatMarker = z.infer<typeof AntiCheatMarkerSchema>;

// ============ Enhanced Problem Schema ============

export const EnhancedProblemSchema = z.object({
  // Base problem fields
  id: z.string(),
  tenantId: z.string(),
  title: z.string(),
  statement: z.string(),
  pattern: PatternIdSchema,
  rung: RungLevelSchema,
  targetComplexity: z.string(),
  testCases: z.array(TestCaseSchema),
  hints: z.array(z.string()),
  timeoutBudgetMs: z.number().positive().optional(),
  largeHiddenTests: z.array(TestCaseSchema).optional(),
  createdAt: z.coerce.date(),

  // Enhanced fields
  patternFamily: PatternFamilySchema,
  secondaryPatterns: z.array(PatternIdSchema),
  prerequisiteSkills: z.array(PrerequisiteSkillSchema),
  conceptTriggers: z.array(ConceptTriggerSchema),
  commonMisconceptions: z.array(CommonMisconceptionSchema),
  edgeCases: z.array(EdgeCaseMetadataSchema),
  scoringWeights: ScoringWeightsSchema.optional(),
  testCaseMetadata: TestCaseMetadataSchema,
  enhancedTestCases: z.array(EnhancedTestCaseSchema).optional(),
  followupProblems: z.array(FollowupProblemRefSchema),
  antiCheatMarkers: z.array(AntiCheatMarkerSchema),

  // Additional metadata
  tags: z.array(z.string()).optional(),
  companies: z.array(z.string()).optional(),
  estimatedTimeMinutes: z.number().positive().optional(),
  historicalSuccessRate: z.number().min(0).max(1).optional(),
  averageAttempts: z.number().positive().optional(),
});

export type EnhancedProblem = z.infer<typeof EnhancedProblemSchema>;

// ============ Partial Update Schema ============

/**
 * Schema for partial updates to enhanced problem metadata
 */
export const EnhancedProblemUpdateSchema = EnhancedProblemSchema.partial().omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export type EnhancedProblemUpdate = z.infer<typeof EnhancedProblemUpdateSchema>;

// ============ API Schemas ============

/**
 * Request to get problem with enhanced metadata
 */
export const GetEnhancedProblemRequestSchema = z.object({
  problemId: z.string(),
  includeAntiCheat: z.boolean().default(false), // Admin only
});

export type GetEnhancedProblemRequest = z.infer<typeof GetEnhancedProblemRequestSchema>;

/**
 * Response with enhanced problem data
 * Note: Anti-cheat markers are omitted unless explicitly requested (admin only)
 */
export const GetEnhancedProblemResponseSchema = z.object({
  problem: EnhancedProblemSchema.omit({ antiCheatMarkers: true }),
  antiCheatMarkers: z.array(AntiCheatMarkerSchema).optional(),
});

export type GetEnhancedProblemResponse = z.infer<typeof GetEnhancedProblemResponseSchema>;

/**
 * Request to get follow-up problem suggestions
 */
export const GetFollowupSuggestionsRequestSchema = z.object({
  problemId: z.string(),
  completionStatus: z.enum(['success', 'struggle', 'abandoned']),
  hintsUsed: z.number().int().min(0),
  attemptCount: z.number().int().min(1),
});

export type GetFollowupSuggestionsRequest = z.infer<typeof GetFollowupSuggestionsRequestSchema>;

/**
 * Response with follow-up suggestions
 */
export const GetFollowupSuggestionsResponseSchema = z.object({
  suggestions: z.array(z.object({
    problem: EnhancedProblemSchema.pick({
      id: true,
      title: true,
      pattern: true,
      rung: true,
      patternFamily: true,
    }),
    type: FollowupTypeSchema,
    reason: z.string(),
    priority: z.number().int().positive(),
  })),
});

export type GetFollowupSuggestionsResponse = z.infer<typeof GetFollowupSuggestionsResponseSchema>;
