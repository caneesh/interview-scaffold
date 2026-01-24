/**
 * Debug Track - Canonical Taxonomy Types
 * Pure TypeScript - no external dependencies
 */

// ============ Pattern Categories ============

/**
 * DebugPatternCategory - the type of bug being debugged
 * These represent the major categories of debugging scenarios.
 */
export const DEBUG_PATTERN_CATEGORIES = [
  'FUNCTIONAL_LOGIC',    // Off-by-one, wrong comparisons, incorrect branching
  'ALGORITHMIC',         // Wrong algorithm choice, incorrect invariants
  'PERFORMANCE',         // O(n^2) vs O(n), memory leaks, inefficient data structures
  'RESOURCE',            // File handles, database connections, memory allocation
  'CONCURRENCY',         // Race conditions, deadlocks, thread safety
  'INTEGRATION',         // API misuse, contract violations, boundary issues
  'DISTRIBUTED',         // Network partitions, consistency issues, timeout handling
  'PRODUCTION_REALITY',  // Flaky tests, environment-specific bugs, monitoring gaps
] as const;

export type DebugPatternCategory = (typeof DEBUG_PATTERN_CATEGORIES)[number];

// ============ Debug Gates ============

/**
 * DebugGate - the sequential gates a user must pass during debugging
 * Gates progress from understanding symptoms to preventing regression.
 */
export const DEBUG_GATES = [
  'SYMPTOM_CLASSIFICATION',   // Identify and categorize the observed symptoms
  'DETERMINISM_ANALYSIS',     // Is the bug deterministic, flaky, or timing-dependent?
  'PATTERN_CLASSIFICATION',   // What category of bug is this?
  'ROOT_CAUSE_HYPOTHESIS',    // Form a hypothesis about the root cause
  'FIX_STRATEGY',             // Propose a fix strategy
  'REGRESSION_PREVENTION',    // How to prevent this from recurring
  'REFLECTION',               // What was learned? Low-stakes consolidation
] as const;

export type DebugGate = (typeof DEBUG_GATES)[number];

// ============ Difficulty Levels ============

/**
 * DebugDifficulty - the complexity level of a debug scenario
 * Includes legacy aliases (EASY, MEDIUM, HARD) for backward compatibility
 */
export const DEBUG_DIFFICULTY_LEVELS = [
  'BEGINNER',      // Simple, single-cause bugs with clear symptoms
  'EASY',          // Alias for BEGINNER (legacy)
  'INTERMEDIATE',  // Multi-step debugging, requires some investigation
  'MEDIUM',        // Alias for INTERMEDIATE (legacy)
  'ADVANCED',      // Complex bugs, multiple contributing factors
  'HARD',          // Alias for ADVANCED (legacy)
  'EXPERT',        // Production-level complexity, subtle root causes
] as const;

export type DebugDifficulty = (typeof DEBUG_DIFFICULTY_LEVELS)[number];

// ============ Attempt Status ============

/**
 * DebugAttemptStatus - the lifecycle state of a debug attempt
 */
export const DEBUG_ATTEMPT_STATUSES = [
  'IN_PROGRESS',  // User is actively working through gates
  'COMPLETED',    // All gates passed, attempt finalized
  'ABANDONED',    // User gave up or timed out
] as const;

export type DebugAttemptStatus = (typeof DEBUG_ATTEMPT_STATUSES)[number];

// ============ Determinism Types ============

/**
 * DeterminismType - classification of bug reproducibility
 */
export const DETERMINISM_TYPES = [
  'DETERMINISTIC',      // Bug reproduces consistently with same inputs
  'NON_DETERMINISTIC',  // Bug appears randomly even with same inputs
  'RACE_CONDITION',     // Bug depends on timing/ordering of operations
  'ENVIRONMENT_DEPENDENT', // Bug only appears in certain environments
  'FLAKY',              // Bug appears intermittently, cause unknown
] as const;

export type DeterminismType = (typeof DETERMINISM_TYPES)[number];

// ============ Hint Levels ============

/**
 * DebugHintLevel - progressive hint disclosure levels
 */
export const DEBUG_HINT_LEVELS = [
  'DIRECTIONAL',    // Points toward the right area without revealing answer
  'CONTEXTUAL',     // Provides relevant context or background
  'DIAGNOSTIC',     // Suggests a specific diagnostic approach
  'REVEALING',      // Reveals significant portion of the answer
  'SOLUTION',       // Full solution (only if exhausted all retries)
] as const;

export type DebugHintLevel = (typeof DEBUG_HINT_LEVELS)[number];

// ============ Rubric Criteria ============

/**
 * RubricCriterion - what aspects are evaluated at each gate
 */
export const RUBRIC_CRITERIA = [
  'ACCURACY',           // Is the answer correct?
  'COMPLETENESS',       // Does it cover all aspects?
  'SPECIFICITY',        // Is it specific enough vs. too vague?
  'TECHNICAL_DEPTH',    // Does it demonstrate understanding?
  'CLARITY',            // Is the explanation clear?
  'ACTIONABILITY',      // Can the answer be acted upon?
] as const;

export type RubricCriterion = (typeof RUBRIC_CRITERIA)[number];

// ============ Fix Strategy Types ============

/**
 * FixStrategyType - categories of bug fixes
 */
export const FIX_STRATEGY_TYPES = [
  'LOGIC_CORRECTION',     // Fix incorrect logic/conditionals
  'ALGORITHM_CHANGE',     // Switch to different algorithm
  'SYNCHRONIZATION',      // Add locks, semaphores, etc.
  'RESOURCE_MANAGEMENT',  // Proper cleanup, pooling, etc.
  'ERROR_HANDLING',       // Add/improve error handling
  'CONFIGURATION',        // Fix config, environment, dependencies
  'REFACTORING',          // Structural change to prevent bug class
  'MONITORING',           // Add observability to catch issues
] as const;

export type FixStrategyType = (typeof FIX_STRATEGY_TYPES)[number];

// ============ Score Components ============

/**
 * ScoreComponent - individual scoring dimensions
 */
export const SCORE_COMPONENTS = [
  'TIME_TO_DIAGNOSIS',      // How quickly was pattern identified?
  'FIX_ACCURACY',           // How accurately was fix proposed?
  'HINTS_PENALTY',          // Deduction for hints used
  'EDGE_CASES_CONSIDERED',  // Bonus for regression prevention breadth
  'EXPLANATION_QUALITY',    // Quality of hypothesis and reflection
] as const;

export type ScoreComponent = (typeof SCORE_COMPONENTS)[number];
