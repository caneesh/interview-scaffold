/**
 * Claude JSON Output Schemas for Scoring & Gating
 *
 * Strict machine-readable response schemas for Claude LLM outputs.
 * These schemas ensure deterministic parsing and enable:
 * - Safe scoring/gating decisions
 * - Policy enforcement (help ladder, solution reveal)
 * - Stage-specific validation
 */

import { z } from 'zod';
import { PatternIdSchema, HelpLevelSchema, CoachingStageSchema } from './schemas.js';

// ============ Coaching Stage Enum (matches existing types) ============

export const ClaudeStageSchema = z.enum([
  'problem_framing',
  'pattern_gate',
  'feynman_check',
  'strategy_design',
  'coding_review',
  'reflection',
]);

export type ClaudeStage = z.infer<typeof ClaudeStageSchema>;

// ============ Pass/Fail Result ============

export const PassFailSchema = z.enum(['PASS', 'FAIL', 'PARTIAL']);
export type PassFail = z.infer<typeof PassFailSchema>;

// ============ Safety Section ============

/**
 * Safety section to prevent solution leakage.
 * Must be present in all Claude responses.
 */
export const SafetySectionSchema = z.object({
  /** Must always be true - Claude must not reveal solutions */
  no_solution_leak: z.literal(true),
  /** Whether the response contains any code */
  contains_code: z.boolean(),
  /** If contains_code is true, what type */
  code_type: z.enum(['example_only', 'skeleton', 'none']).optional(),
});

export type SafetySection = z.infer<typeof SafetySectionSchema>;

// ============ Scoring Schema ============

/**
 * Numeric scoring with subscores and total.
 * All scores are 0-1 normalized.
 */
export const ScoringSchema = z.object({
  /** Overall score (0-1) */
  total: z.number().min(0).max(1),
  /** Subscores by category */
  subscores: z.object({
    /** Understanding of problem constraints and requirements */
    understanding: z.number().min(0).max(1),
    /** Correctness of pattern selection */
    pattern_accuracy: z.number().min(0).max(1),
    /** Quality of reasoning/explanation */
    reasoning_quality: z.number().min(0).max(1),
    /** Handling of edge cases */
    edge_case_coverage: z.number().min(0).max(1),
    /** Code quality (if applicable) */
    code_quality: z.number().min(0).max(1).optional(),
    /** Complexity analysis accuracy (if applicable) */
    complexity_accuracy: z.number().min(0).max(1).optional(),
  }),
  /** Confidence in the scoring (0-1) */
  confidence: z.number().min(0).max(1),
});

export type Scoring = z.infer<typeof ScoringSchema>;

// ============ Policy Schema ============

/**
 * Policy encoding for help ladder and solution reveal permissions.
 */
export const PolicySchema = z.object({
  /** Current help level (1-5) */
  hint_level_allowed: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  /** Whether solution reveal is permitted */
  solution_reveal_permitted: z.boolean(),
  /** Reason for current policy state */
  policy_reason: z.string(),
  /** Recommended next help level if user asks */
  recommended_next_level: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]).optional(),
});

export type Policy = z.infer<typeof PolicySchema>;

// ============ Detected Issue Schema ============

export const IssueSeveritySchema = z.enum(['CRITICAL', 'MAJOR', 'MINOR', 'INFO']);
export type IssueSeverity = z.infer<typeof IssueSeveritySchema>;

export const DetectedIssueSchema = z.object({
  /** Unique issue identifier */
  id: z.string(),
  /** Severity level */
  severity: IssueSeveritySchema,
  /** Issue category */
  category: z.enum([
    'understanding_gap',
    'pattern_mismatch',
    'reasoning_flaw',
    'edge_case_missed',
    'complexity_error',
    'implementation_bug',
    'style_issue',
    'memorization_signal',
  ]),
  /** Human-readable description */
  description: z.string(),
  /** Specific excerpt from user's response (if applicable) */
  excerpt: z.string().optional(),
  /** Suggested remediation */
  remediation: z.string().optional(),
});

export type DetectedIssue = z.infer<typeof DetectedIssueSchema>;

// ============ Followup Question Schema ============

export const FollowupQuestionSchema = z.object({
  /** Question ID */
  id: z.string(),
  /** The question text */
  question: z.string(),
  /** Why this question is being asked */
  purpose: z.enum([
    'clarify_understanding',
    'probe_deeper',
    'challenge_assumption',
    'explore_edge_case',
    'verify_reasoning',
    'socratic_guidance',
  ]),
  /** Priority (1 = most important) */
  priority: z.number().int().positive(),
});

export type FollowupQuestion = z.infer<typeof FollowupQuestionSchema>;

// ============ Shared Envelope Schema ============

/**
 * Shared envelope used by all stage-specific responses.
 * Contains common metadata and safety information.
 */
export const ClaudeResponseEnvelopeSchema = z.object({
  /** Schema version for forward compatibility */
  schema_version: z.literal('1.0'),
  /** Timestamp of response generation */
  timestamp: z.string().datetime(),
  /** The stage this response is for */
  stage: ClaudeStageSchema,
  /** Pass/fail result */
  pass_fail: PassFailSchema,
  /** Reasons for the decision (always non-empty) */
  reasons: z.array(z.string()).min(1),
  /** Detected issues */
  detected_issues: z.array(DetectedIssueSchema),
  /** Followup questions to ask */
  followup_questions: z.array(FollowupQuestionSchema),
  /** Scoring information */
  scoring: ScoringSchema,
  /** Policy state */
  policy: PolicySchema,
  /** Next allowed stage (null if should retry current) */
  next_allowed_stage: ClaudeStageSchema.nullable(),
  /** Safety section - MUST be present */
  safety: SafetySectionSchema,
});

export type ClaudeResponseEnvelope = z.infer<typeof ClaudeResponseEnvelopeSchema>;

// ============ Stage-Specific Response Schemas ============

// --- Problem Framing Stage ---

export const ProblemFramingResponseSchema = ClaudeResponseEnvelopeSchema.extend({
  stage: z.literal('problem_framing'),
  stage_data: z.object({
    /** How well user understood problem constraints */
    constraints_understood: z.boolean(),
    /** How well user understood input/output format */
    io_format_understood: z.boolean(),
    /** Edge cases the user identified */
    edge_cases_identified: z.array(z.string()),
    /** Edge cases the user missed */
    edge_cases_missed: z.array(z.string()),
    /** Quality of problem restatement */
    restatement_quality: z.enum(['POOR', 'ADEQUATE', 'GOOD', 'EXCELLENT']),
    /** Key concepts user should clarify */
    needs_clarification: z.array(z.string()),
  }),
});

export type ProblemFramingResponse = z.infer<typeof ProblemFramingResponseSchema>;

// --- Pattern Gate Stage ---

export const PatternGateResponseSchema = ClaudeResponseEnvelopeSchema.extend({
  stage: z.literal('pattern_gate'),
  stage_data: z.object({
    /** Pattern the user selected */
    selected_pattern: PatternIdSchema.nullable(),
    /** Correct pattern for this problem */
    correct_pattern: PatternIdSchema,
    /** Whether selection is correct */
    pattern_correct: z.boolean(),
    /** Alternative patterns that could work */
    viable_alternatives: z.array(PatternIdSchema),
    /** Quality of justification */
    justification_quality: z.enum(['NONE', 'WEAK', 'ADEQUATE', 'STRONG']),
    /** Specific problems with justification */
    justification_issues: z.array(z.string()),
    /** If incorrect, why the chosen pattern fails */
    why_pattern_fails: z.string().optional(),
    /** Guiding questions to lead toward correct pattern */
    guiding_questions: z.array(z.string()),
  }),
});

export type PatternGateResponse = z.infer<typeof PatternGateResponseSchema>;

// --- Feynman Check Stage ---

export const FeynmanCheckResponseSchema = ClaudeResponseEnvelopeSchema.extend({
  stage: z.literal('feynman_check'),
  stage_data: z.object({
    /** Whether explanation avoids jargon */
    jargon_free: z.boolean(),
    /** Jargon terms found (if any) */
    jargon_found: z.array(z.string()),
    /** Whether explanation avoids circular reasoning */
    no_circular_logic: z.boolean(),
    /** Circular reasoning found (if any) */
    circular_logic_found: z.string().optional(),
    /** Whether 12-year-old could understand */
    age_appropriate: z.boolean(),
    /** Complexity issues */
    complexity_issues: z.array(z.string()),
    /** Number of sentences in explanation */
    sentence_count: z.number().int().positive(),
    /** Whether within 5 sentence limit */
    within_limit: z.boolean(),
    /** Key concepts correctly explained */
    concepts_correct: z.array(z.string()),
    /** Key concepts missing or wrong */
    concepts_missing: z.array(z.string()),
    /** Single clarifying question (max 1) */
    clarifying_question: z.string().optional(),
  }),
});

export type FeynmanCheckResponse = z.infer<typeof FeynmanCheckResponseSchema>;

// --- Strategy Design Stage ---

export const StrategyDesignResponseSchema = ClaudeResponseEnvelopeSchema.extend({
  stage: z.literal('strategy_design'),
  stage_data: z.object({
    /** Overall coherence of strategy */
    is_coherent: z.boolean(),
    /** Logical gaps in reasoning */
    logical_gaps: z.array(z.object({
      id: z.string(),
      description: z.string(),
      severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL']),
    })),
    /** Contradictions found */
    contradictions: z.array(z.object({
      statement1: z.string(),
      statement2: z.string(),
      explanation: z.string(),
    })),
    /** Edge cases not addressed */
    missing_edge_cases: z.array(z.string()),
    /** Adversarial "what if" questions */
    adversarial_questions: z.array(z.object({
      id: z.string(),
      question: z.string(),
      category: z.enum(['EDGE_CASE', 'CONSTRAINT', 'INVARIANT', 'COMPLEXITY', 'STATE']),
    })),
    /** Whether user is ready to code */
    ready_to_code: z.boolean(),
    /** Blockers preventing coding */
    blockers: z.array(z.string()),
  }),
});

export type StrategyDesignResponse = z.infer<typeof StrategyDesignResponseSchema>;

// --- Coding Review Stage ---

export const CodingReviewResponseSchema = ClaudeResponseEnvelopeSchema.extend({
  stage: z.literal('coding_review'),
  stage_data: z.object({
    /** Code compiles/parses correctly */
    syntactically_valid: z.boolean(),
    /** Syntax errors found */
    syntax_errors: z.array(z.object({
      line: z.number().int().positive(),
      message: z.string(),
    })),
    /** Pattern correctly implemented */
    pattern_implemented: z.boolean(),
    /** Pattern implementation issues */
    pattern_issues: z.array(z.string()),
    /** Time complexity analysis */
    time_complexity: z.object({
      stated: z.string().optional(),
      actual: z.string(),
      is_optimal: z.boolean(),
    }),
    /** Space complexity analysis */
    space_complexity: z.object({
      stated: z.string().optional(),
      actual: z.string(),
      is_optimal: z.boolean(),
    }),
    /** Invariant violations detected */
    invariant_violations: z.array(z.object({
      id: z.string(),
      description: z.string(),
      line: z.number().int().positive().optional(),
    })),
    /** Potential bugs/issues */
    potential_bugs: z.array(z.object({
      id: z.string(),
      type: z.enum([
        'off_by_one',
        'null_check',
        'boundary',
        'infinite_loop',
        'state_mutation',
        'wrong_operator',
        'other',
      ]),
      description: z.string(),
      line: z.number().int().positive().optional(),
    })),
    /** Non-directive questions about code */
    code_questions: z.array(z.object({
      id: z.string(),
      question: z.string(),
      target_line: z.number().int().positive().optional(),
      category: z.enum([
        'variable_purpose',
        'condition_guarantee',
        'loop_invariant',
        'termination',
        'boundary',
      ]),
    })),
  }),
});

export type CodingReviewResponse = z.infer<typeof CodingReviewResponseSchema>;

// --- Reflection Stage ---

export const ReflectionResponseSchema = ClaudeResponseEnvelopeSchema.extend({
  stage: z.literal('reflection'),
  stage_data: z.object({
    /** Quality of key insight provided */
    insight_quality: z.enum(['SHALLOW', 'ADEQUATE', 'DEEP']),
    /** Whether insight captures core learning */
    insight_captures_core: z.boolean(),
    /** Missing elements in insight */
    insight_missing: z.array(z.string()),
    /** Pattern triggers identified by user */
    pattern_triggers_identified: z.array(z.object({
      signal: z.string(),
      pattern: PatternIdSchema,
      is_valid: z.boolean(),
    })),
    /** Suggested pattern triggers user missed */
    suggested_triggers: z.array(z.object({
      signal: z.string(),
      pattern: PatternIdSchema,
    })),
    /** Follow-up problems to reinforce learning */
    suggested_followups: z.array(z.object({
      problem_id: z.string(),
      reason: z.string(),
      difficulty: z.enum(['EASIER', 'SIMILAR', 'HARDER']),
      type: z.enum(['TWIST', 'TRICK', 'REINFORCEMENT']),
    })),
    /** Summary of learning journey */
    learning_summary: z.string(),
  }),
});

export type ReflectionResponse = z.infer<typeof ReflectionResponseSchema>;

// ============ Union of All Stage Responses ============

export const ClaudeStageResponseSchema = z.discriminatedUnion('stage', [
  ProblemFramingResponseSchema,
  PatternGateResponseSchema,
  FeynmanCheckResponseSchema,
  StrategyDesignResponseSchema,
  CodingReviewResponseSchema,
  ReflectionResponseSchema,
]);

export type ClaudeStageResponse = z.infer<typeof ClaudeStageResponseSchema>;

// ============ Helper Functions ============

/**
 * Create a default safety section (always safe).
 *
 * WARNING: This helper unconditionally sets `no_solution_leak: true`.
 * Callers MUST verify that the content being marked as "safe" does NOT
 * contain solution code or reveal the answer before using this helper.
 *
 * This function does NOT validate the content - it is the caller's
 * responsibility to ensure the content is truly safe. Misuse of this
 * helper could result in solution leakage to users.
 *
 * @param containsCode - Whether the response contains any code.
 *                      If true, code_type defaults to 'example_only'.
 *                      Caller must verify any code is truly example-only.
 * @returns A SafetySection object with no_solution_leak set to true
 *
 * @example
 * // CORRECT: Content has been verified to not contain solutions
 * const safeContent = "Consider what happens at the boundaries";
 * const safety = createSafetySection(false);
 *
 * @example
 * // INCORRECT: Never use without verifying content!
 * // const safety = createSafetySection(true); // DON'T DO THIS
 */
export function createSafetySection(containsCode: boolean = false): SafetySection {
  return {
    no_solution_leak: true,
    contains_code: containsCode,
    code_type: containsCode ? 'example_only' : 'none',
  };
}

/**
 * Create a default policy for a given help level
 */
export function createDefaultPolicy(hintLevel: 1 | 2 | 3 | 4 | 5): Policy {
  return {
    hint_level_allowed: hintLevel,
    solution_reveal_permitted: hintLevel === 5,
    policy_reason: `User is at help level ${hintLevel}`,
    recommended_next_level: hintLevel < 5 ? ((hintLevel + 1) as 1 | 2 | 3 | 4 | 5) : undefined,
  };
}

/**
 * Create an empty scoring object
 */
export function createEmptyScoring(): Scoring {
  return {
    total: 0,
    subscores: {
      understanding: 0,
      pattern_accuracy: 0,
      reasoning_quality: 0,
      edge_case_coverage: 0,
    },
    confidence: 0,
  };
}

/**
 * Validate a Claude response and return typed result
 */
export function parseClaudeResponse(response: unknown): ClaudeStageResponse {
  return ClaudeStageResponseSchema.parse(response);
}

/**
 * Safe parse that returns null on error
 */
export function safeParseClaudeResponse(
  response: unknown
): { success: true; data: ClaudeStageResponse } | { success: false; error: z.ZodError } {
  const result = ClaudeStageResponseSchema.safeParse(response);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ============ Stage Mapping ============

/**
 * Map between coaching stage names and Claude stage names
 */
export const COACHING_TO_CLAUDE_STAGE: Record<string, ClaudeStage> = {
  'PROBLEM_FRAMING': 'problem_framing',
  'PATTERN_RECOGNITION': 'pattern_gate',
  'FEYNMAN_VALIDATION': 'feynman_check',
  'STRATEGY_DESIGN': 'strategy_design',
  'CODING': 'coding_review',
  'REFLECTION': 'reflection',
};

export const CLAUDE_TO_COACHING_STAGE: Record<ClaudeStage, string> = {
  'problem_framing': 'PROBLEM_FRAMING',
  'pattern_gate': 'PATTERN_RECOGNITION',
  'feynman_check': 'FEYNMAN_VALIDATION',
  'strategy_design': 'STRATEGY_DESIGN',
  'coding_review': 'CODING',
  'reflection': 'REFLECTION',
};
