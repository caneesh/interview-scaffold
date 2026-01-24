/**
 * Debug Track Entities - Re-export from debug-track module
 *
 * This file provides backward compatibility for existing code that imports
 * from entities/debug-track. The canonical location is now debug-track/index.ts.
 */

// Re-export types needed by seed data
export type {
  DebugPatternCategory,
  DebugDifficulty,
  DebugGate,
  DebugAttemptStatus,
} from '../debug-track/types.js';

export type {
  DebugScenario,
  DebugAttempt,
  GateSubmission,
  EvaluationResult,
  CodeArtifact,
  DebugScore,
  GateTimer,
  SymptomOption,
  DebugPolicyConfig,
} from '../debug-track/entities.js';

// Re-export constants
export {
  DEBUG_PATTERN_CATEGORIES,
  DEBUG_DIFFICULTY_LEVELS,
  DEBUG_GATES,
  DEBUG_ATTEMPT_STATUSES,
} from '../debug-track/types.js';

export {
  DEFAULT_DEBUG_POLICY,
  createDebugAttempt,
} from '../debug-track/entities.js';
