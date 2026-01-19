/**
 * Debug Lab Mode - Taxonomy-aware debugging practice with mini-repos
 *
 * A practice mode where users debug small codebases (3-6 files) with
 * deterministic test-based scoring and optional triage assessment.
 */

// ============ Taxonomy Enums ============

/**
 * Defect categories based on common production bug taxonomies
 */
export const DEFECT_CATEGORIES = [
  'Functional',      // Logic errors, incorrect behavior
  'Concurrency',     // Race conditions, deadlocks, thread safety
  'Resource',        // Memory leaks, file handle leaks, connection exhaustion
  'Distributed',     // Network partitions, consistency issues, timeout handling
  'Heisenbug',       // Non-deterministic bugs that change under observation
  'Environment',     // Config issues, dependency mismatches, path problems
  'Container',       // Docker/K8s specific: resource limits, networking, volumes
  'Performance',     // Slow queries, N+1, inefficient algorithms
  'Observability',   // Missing/wrong metrics, logging issues, tracing gaps
] as const;

export type DefectCategory = (typeof DEFECT_CATEGORIES)[number];

/**
 * Severity levels following standard incident classification
 */
export const SEVERITY_LEVELS = ['Critical', 'Major', 'Minor', 'Low'] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

/**
 * Priority levels for fix ordering
 */
export const PRIORITY_LEVELS = ['High', 'Medium', 'Low'] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

/**
 * Observable signals that indicate the type of defect
 */
export const DEBUG_SIGNALS = [
  'failing_tests',       // Unit/integration tests failing
  'timeout',             // Request/operation timeouts
  'crash',               // Process crash, panic, unhandled exception
  'inconsistent_repro',  // Bug reproduces intermittently
  'metrics_red',         // RED metrics (rate/errors/duration) anomalies
  'metrics_use',         // USE metrics (utilization/saturation/errors) anomalies
  'memory_growth',       // Heap/RSS growing over time
  'cpu_spike',           // Unexpected CPU utilization
  'connection_errors',   // Network/DB connection failures
  'data_corruption',     // Inconsistent or corrupted data
  'log_errors',          // Errors in application logs
  'silent_failure',      // No errors but wrong behavior
] as const;

export type DebugSignal = (typeof DEBUG_SIGNALS)[number];

/**
 * Debugging tools/techniques expected to be used
 */
export const DEBUG_TOOLS = [
  'unit_tests',          // Writing/running unit tests
  'logging',             // Adding/analyzing logs
  'profiling',           // CPU/memory profiling
  'tracing',             // Distributed tracing
  'seed_freeze',         // Freezing random seeds for reproducibility
  'debugger',            // Step-through debugging
  'binary_search',       // Git bisect or manual binary search
  'metrics_analysis',    // Analyzing observability metrics
  'code_review',         // Reading code carefully
  'reproduction',        // Creating minimal reproduction
  'isolation',           // Isolating components
  'rollback',            // Version comparison/rollback
] as const;

export type DebugTool = (typeof DEBUG_TOOLS)[number];

/**
 * Difficulty levels for debug lab items
 */
export const DEBUG_LAB_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'] as const;
export type DebugLabDifficulty = (typeof DEBUG_LAB_DIFFICULTIES)[number];

/**
 * Supported languages for debug lab
 */
export const DEBUG_LAB_LANGUAGES = ['javascript', 'typescript', 'python'] as const;
export type DebugLabLanguage = (typeof DEBUG_LAB_LANGUAGES)[number];

/**
 * Attempt status for debug lab
 */
export const DEBUG_LAB_STATUSES = [
  'STARTED',           // Attempt created, not yet triaged (if required)
  'TRIAGE_COMPLETED',  // Triage submitted (if required), can edit code
  'SUBMITTED',         // Code submitted, awaiting execution
  'PASSED',            // All tests pass
  'FAILED',            // Tests failed or execution error
] as const;

export type DebugLabStatus = (typeof DEBUG_LAB_STATUSES)[number];

// ============ File Structure ============

/**
 * A file in the debug lab workspace
 */
export interface DebugLabFile {
  /** Relative path from workspace root (e.g., "src/utils.js") */
  readonly path: string;
  /** File content */
  readonly content: string;
  /** Whether this file is editable by the user */
  readonly editable: boolean;
}

// ============ Observability Snapshots ============

/**
 * RED metrics snapshot (Rate, Errors, Duration)
 */
export interface REDMetrics {
  /** Requests per second */
  readonly rate: number;
  /** Error rate (0-1) */
  readonly errorRate: number;
  /** Duration percentiles in ms */
  readonly duration: {
    readonly p50: number;
    readonly p95: number;
    readonly p99: number;
  };
  /** Optional label for the metric source */
  readonly label?: string;
}

/**
 * USE metrics snapshot (Utilization, Saturation, Errors)
 */
export interface USEMetrics {
  /** Resource utilization (0-1) */
  readonly utilization: number;
  /** Queue depth or saturation indicator */
  readonly saturation: number;
  /** Error count */
  readonly errors: number;
  /** Resource type (cpu, memory, disk, network) */
  readonly resource: string;
  /** Optional label */
  readonly label?: string;
}

/**
 * Observability data shown in the UI
 */
export interface ObservabilitySnapshot {
  /** RED metrics (if applicable) */
  readonly red?: readonly REDMetrics[];
  /** USE metrics (if applicable) */
  readonly use?: readonly USEMetrics[];
  /** Raw log lines to display */
  readonly logs?: readonly string[];
  /** Timestamp label for the snapshot */
  readonly timestamp?: string;
}

// ============ Triage Rubric ============

/**
 * Expected triage answers for scoring
 */
export interface TriageRubric {
  /** Expected defect category */
  readonly expectedCategory: DefectCategory;
  /** Expected severity */
  readonly expectedSeverity: SeverityLevel;
  /** Expected priority */
  readonly expectedPriority: PriorityLevel;
  /** Expected first debugging actions (keywords to match) */
  readonly expectedFirstActions: readonly string[];
  /** Explanation shown after triage scoring */
  readonly explanation?: string;
}

// ============ Debug Lab Item ============

/**
 * A debug lab item - a mini-repo with intentional bugs
 */
export interface DebugLabItem {
  /** Unique identifier */
  readonly id: string;
  /** Tenant ID for multi-tenancy */
  readonly tenantId: string;
  /** Display title */
  readonly title: string;
  /** Problem description / scenario */
  readonly description: string;
  /** Difficulty level */
  readonly difficulty: DebugLabDifficulty;
  /** Programming language */
  readonly language: DebugLabLanguage;

  // ---- Workspace Files ----
  /** Files in the mini-repo workspace */
  readonly files: readonly DebugLabFile[];
  /** Command to run tests (e.g., "npm test", "pytest") */
  readonly testCommand: string;
  /** Optional: runner script content if custom execution needed */
  readonly runnerScript?: string;
  /** Hidden test files (server-only, not shown to user) */
  readonly hiddenTests?: readonly DebugLabFile[];

  // ---- Taxonomy Fields ----
  /** Primary defect category */
  readonly defectCategory: DefectCategory;
  /** Severity of the defect */
  readonly severity: SeverityLevel;
  /** Priority for fixing */
  readonly priority: PriorityLevel;
  /** Observable signals present in this bug */
  readonly signals: readonly DebugSignal[];
  /** Tools/techniques expected to debug this */
  readonly toolsExpected: readonly DebugTool[];

  // ---- Triage Assessment ----
  /** Whether triage step is required before editing code */
  readonly requiredTriage: boolean;
  /** Rubric for scoring triage answers (if requiredTriage) */
  readonly triageRubric?: TriageRubric;

  // ---- Observability Data ----
  /** Optional metrics snapshots to display in UI */
  readonly observabilitySnapshot?: ObservabilitySnapshot;

  // ---- Solution Reference (server-only) ----
  /** Reference solution for grading explanations (not sent to client) */
  readonly solutionExplanation?: string;
  /** Files after fix applied (for reference, not sent to client) */
  readonly solutionFiles?: readonly DebugLabFile[];

  /** When this item was created */
  readonly createdAt: Date;
}

// ============ User Triage Submission ============

/**
 * User's triage assessment answers
 */
export interface TriageAnswers {
  /** User's selected defect category */
  readonly category: DefectCategory;
  /** User's selected severity */
  readonly severity: SeverityLevel;
  /** User's selected priority */
  readonly priority: PriorityLevel;
  /** User's first debugging actions (free text) */
  readonly firstActions: string;
}

/**
 * Triage scoring result
 */
export interface TriageScore {
  /** Overall triage score (0-1) */
  readonly overall: number;
  /** Category match (exact = 1, adjacent = 0.5, wrong = 0) */
  readonly categoryScore: number;
  /** Severity match */
  readonly severityScore: number;
  /** Priority match */
  readonly priorityScore: number;
  /** First actions keyword match score */
  readonly actionsScore: number;
  /** Keywords matched from expected actions */
  readonly matchedActions: readonly string[];
  /** Optional LLM feedback on triage */
  readonly llmFeedback?: string;
}

// ============ Execution Result ============

/**
 * Signal type from test execution
 */
export const EXECUTION_SIGNAL_TYPES = [
  'test_failure',    // Tests ran but assertions failed
  'timeout',         // Execution timed out
  'crash',           // Process crashed
  'compile_error',   // Compilation/syntax error
  'runtime_error',   // Runtime exception
  'success',         // All tests passed
] as const;

export type ExecutionSignalType = (typeof EXECUTION_SIGNAL_TYPES)[number];

/**
 * Result of running tests
 */
export interface ExecutionResult {
  /** Whether all tests passed */
  readonly passed: boolean;
  /** Signal type for UI display */
  readonly signalType: ExecutionSignalType;
  /** Number of tests that passed */
  readonly testsPassed: number;
  /** Total number of tests */
  readonly testsTotal: number;
  /** Raw stdout from test execution */
  readonly stdout: string;
  /** Raw stderr from test execution */
  readonly stderr: string;
  /** Exit code */
  readonly exitCode: number;
  /** Execution time in ms */
  readonly executionTimeMs: number;
  /** Hidden tests result (if applicable, summary only) */
  readonly hiddenTestsResult?: {
    readonly passed: boolean;
    readonly testsPassed: number;
    readonly testsTotal: number;
  };
}

// ============ Code Submission ============

/**
 * User's code submission (patch)
 */
export interface DebugLabSubmission {
  /** Modified files (path -> new content) */
  readonly files: Record<string, string>;
  /** User's explanation of the fix */
  readonly explanation: string;
  /** Timestamp of submission */
  readonly submittedAt: Date;
}

// ============ Debug Lab Attempt ============

/**
 * A user's attempt at a debug lab item
 */
export interface DebugLabAttempt {
  /** Unique identifier */
  readonly id: string;
  /** Tenant ID */
  readonly tenantId: string;
  /** User who made the attempt */
  readonly userId: string;
  /** Debug lab item being attempted */
  readonly itemId: string;
  /** Current status */
  readonly status: DebugLabStatus;

  // ---- Triage (if required) ----
  /** User's triage answers (null if not yet submitted or not required) */
  readonly triageAnswers: TriageAnswers | null;
  /** Triage score (null if not yet scored) */
  readonly triageScore: TriageScore | null;

  // ---- Code Submission ----
  /** User's code submission (null if not yet submitted) */
  readonly submission: DebugLabSubmission | null;
  /** Latest execution result (null if not yet run) */
  readonly executionResult: ExecutionResult | null;

  // ---- Attempt Metadata ----
  /** Number of test runs (optional runs before final submit) */
  readonly testRunCount: number;
  /** Number of submissions */
  readonly submissionCount: number;
  /** When the attempt was started */
  readonly startedAt: Date;
  /** When the attempt was completed */
  readonly completedAt: Date | null;
}

// ============ Helper Functions ============

/**
 * Check if triage category matches (exact or adjacent)
 */
export function scoreCategoryMatch(
  userCategory: DefectCategory,
  expectedCategory: DefectCategory
): number {
  if (userCategory === expectedCategory) return 1;

  // Define adjacent categories for partial credit
  const adjacentMap: Record<DefectCategory, DefectCategory[]> = {
    Functional: ['Performance'],
    Concurrency: ['Heisenbug', 'Distributed'],
    Resource: ['Performance', 'Container'],
    Distributed: ['Concurrency', 'Environment'],
    Heisenbug: ['Concurrency', 'Environment'],
    Environment: ['Container', 'Distributed'],
    Container: ['Environment', 'Resource'],
    Performance: ['Resource', 'Functional'],
    Observability: ['Environment'],
  };

  if (adjacentMap[expectedCategory]?.includes(userCategory)) {
    return 0.5;
  }

  return 0;
}

/**
 * Check if severity matches (exact or adjacent)
 */
export function scoreSeverityMatch(
  userSeverity: SeverityLevel,
  expectedSeverity: SeverityLevel
): number {
  if (userSeverity === expectedSeverity) return 1;

  const severityOrder: SeverityLevel[] = ['Critical', 'Major', 'Minor', 'Low'];
  const userIdx = severityOrder.indexOf(userSeverity);
  const expectedIdx = severityOrder.indexOf(expectedSeverity);

  // Adjacent severity gets partial credit
  if (Math.abs(userIdx - expectedIdx) === 1) return 0.5;

  return 0;
}

/**
 * Check if priority matches (exact or adjacent)
 */
export function scorePriorityMatch(
  userPriority: PriorityLevel,
  expectedPriority: PriorityLevel
): number {
  if (userPriority === expectedPriority) return 1;

  const priorityOrder: PriorityLevel[] = ['High', 'Medium', 'Low'];
  const userIdx = priorityOrder.indexOf(userPriority);
  const expectedIdx = priorityOrder.indexOf(expectedPriority);

  // Adjacent priority gets partial credit
  if (Math.abs(userIdx - expectedIdx) === 1) return 0.5;

  return 0;
}

/**
 * Score first actions keyword match
 */
export function scoreActionsMatch(
  userActions: string,
  expectedActions: readonly string[]
): { score: number; matchedActions: string[] } {
  const lowerActions = userActions.toLowerCase();
  const matchedActions: string[] = [];

  for (const action of expectedActions) {
    const actionLower = action.toLowerCase();
    const variations = [
      actionLower,
      actionLower.replace(/-/g, ' '),
      actionLower.replace(/_/g, ' '),
      actionLower.replace(/ /g, '-'),
    ];

    if (variations.some(v => lowerActions.includes(v))) {
      matchedActions.push(action);
    }
  }

  const score = expectedActions.length > 0
    ? matchedActions.length / expectedActions.length
    : 1;

  return { score, matchedActions };
}

/**
 * Calculate overall triage score
 */
export function calculateTriageScore(
  answers: TriageAnswers,
  rubric: TriageRubric
): TriageScore {
  const categoryScore = scoreCategoryMatch(answers.category, rubric.expectedCategory);
  const severityScore = scoreSeverityMatch(answers.severity, rubric.expectedSeverity);
  const priorityScore = scorePriorityMatch(answers.priority, rubric.expectedPriority);
  const { score: actionsScore, matchedActions } = scoreActionsMatch(
    answers.firstActions,
    rubric.expectedFirstActions
  );

  // Weighted average: category is most important
  const overall = (
    categoryScore * 0.4 +
    severityScore * 0.2 +
    priorityScore * 0.15 +
    actionsScore * 0.25
  );

  return {
    overall,
    categoryScore,
    severityScore,
    priorityScore,
    actionsScore,
    matchedActions,
  };
}

/**
 * Determine execution signal type from result
 */
export function determineSignalType(
  exitCode: number,
  stdout: string,
  stderr: string,
  timedOut: boolean
): ExecutionSignalType {
  if (timedOut) return 'timeout';
  if (exitCode === 0) return 'success';

  const stderrLower = stderr.toLowerCase();
  const stdoutLower = stdout.toLowerCase();

  // Check for compilation/syntax errors
  if (
    stderrLower.includes('syntaxerror') ||
    stderrLower.includes('syntax error') ||
    stderrLower.includes('compileerror') ||
    stderrLower.includes('compilation failed')
  ) {
    return 'compile_error';
  }

  // Check for crashes
  if (
    stderrLower.includes('segmentation fault') ||
    stderrLower.includes('killed') ||
    stderrLower.includes('fatal error') ||
    stderrLower.includes('panic')
  ) {
    return 'crash';
  }

  // Check for test failures (common test framework output)
  if (
    stdoutLower.includes('fail') ||
    stdoutLower.includes('assert') ||
    stderrLower.includes('assertionerror') ||
    stdoutLower.includes('expected') ||
    stdoutLower.includes('test failed')
  ) {
    return 'test_failure';
  }

  // Generic runtime error
  if (
    stderrLower.includes('error') ||
    stderrLower.includes('exception') ||
    stderrLower.includes('traceback')
  ) {
    return 'runtime_error';
  }

  return 'test_failure';
}
