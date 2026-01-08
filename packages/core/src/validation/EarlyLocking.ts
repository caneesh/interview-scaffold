/**
 * Early checkpoint locking - prevents code submission until prerequisites pass.
 * PURE TypeScript - no framework dependencies.
 */

import type {
  CheckpointResult,
  CheckpointType,
  GradeResult,
  ValidationError,
} from './types.js';
import { GradeResult as GradeResultEnum, CheckpointType as CheckpointTypeEnum } from './types.js';

// ============================================================================
// Locking Constants
// ============================================================================

export const LOCKING_CONSTANTS = {
  /** Checkpoints that must pass before code submission */
  REQUIRED_CHECKPOINTS_FOR_CODE: ['APPROACH', 'INVARIANT', 'PLAN'] as const,

  /** Whether to allow partial grades to proceed */
  ALLOW_PARTIAL_TO_PROCEED: false,

  /** Maximum retries before forcing review */
  MAX_CHECKPOINT_RETRIES: 3,
} as const;

// ============================================================================
// Locking Types
// ============================================================================

export interface LockingState {
  readonly checkpointResults: Map<CheckpointType, CheckpointResult>;
  readonly retryCount: Map<CheckpointType, number>;
}

export interface LockCheckResult {
  readonly isLocked: boolean;
  readonly reason: string | null;
  readonly missingCheckpoints: readonly CheckpointType[];
  readonly failedCheckpoints: readonly CheckpointType[];
  readonly canProceed: boolean;
}

export interface CheckpointSubmission {
  readonly checkpoint: CheckpointType;
  readonly result: CheckpointResult;
  readonly currentState: LockingState;
}

// ============================================================================
// Locking Functions
// ============================================================================

/**
 * Checks if code submission is locked due to failing prerequisites.
 */
export function checkCodeSubmissionLock(
  checkpointResults: readonly CheckpointResult[]
): LockCheckResult {
  const resultMap = new Map<CheckpointType, CheckpointResult>();
  for (const result of checkpointResults) {
    resultMap.set(result.checkpoint, result);
  }

  const missingCheckpoints: CheckpointType[] = [];
  const failedCheckpoints: CheckpointType[] = [];

  for (const required of LOCKING_CONSTANTS.REQUIRED_CHECKPOINTS_FOR_CODE) {
    const result = resultMap.get(required);

    if (!result) {
      missingCheckpoints.push(required);
    } else if (result.grade === GradeResultEnum.FAIL) {
      failedCheckpoints.push(required);
    } else if (
      result.grade === GradeResultEnum.PARTIAL &&
      !LOCKING_CONSTANTS.ALLOW_PARTIAL_TO_PROCEED
    ) {
      failedCheckpoints.push(required);
    }
  }

  const isLocked = missingCheckpoints.length > 0 || failedCheckpoints.length > 0;

  let reason: string | null = null;
  if (missingCheckpoints.length > 0) {
    reason = `Complete these checkpoints first: ${missingCheckpoints.join(', ')}`;
  } else if (failedCheckpoints.length > 0) {
    reason = `Fix these checkpoints before submitting code: ${failedCheckpoints.join(', ')}`;
  }

  return {
    isLocked,
    reason,
    missingCheckpoints,
    failedCheckpoints,
    canProceed: !isLocked,
  };
}

/**
 * Determines if a checkpoint can be attempted.
 */
export function canAttemptCheckpoint(
  targetCheckpoint: CheckpointType,
  completedCheckpoints: readonly CheckpointResult[]
): { canAttempt: boolean; reason: string | null } {
  const checkpointOrder: CheckpointType[] = [
    CheckpointTypeEnum.APPROACH,
    CheckpointTypeEnum.INVARIANT,
    CheckpointTypeEnum.PLAN,
    CheckpointTypeEnum.CODE,
  ];

  const targetIndex = checkpointOrder.indexOf(targetCheckpoint);

  // Can always attempt APPROACH
  if (targetIndex === 0) {
    return { canAttempt: true, reason: null };
  }

  // Check all previous checkpoints are passed
  for (let i = 0; i < targetIndex; i++) {
    const previousCheckpoint = checkpointOrder[i];
    const result = completedCheckpoints.find(r => r.checkpoint === previousCheckpoint);

    if (!result) {
      return {
        canAttempt: false,
        reason: `Complete ${previousCheckpoint} checkpoint first`,
      };
    }

    if (result.grade === GradeResultEnum.FAIL) {
      return {
        canAttempt: false,
        reason: `${previousCheckpoint} checkpoint must pass before attempting ${targetCheckpoint}`,
      };
    }

    if (
      result.grade === GradeResultEnum.PARTIAL &&
      !LOCKING_CONSTANTS.ALLOW_PARTIAL_TO_PROCEED
    ) {
      return {
        canAttempt: false,
        reason: `${previousCheckpoint} checkpoint needs full pass (currently partial)`,
      };
    }
  }

  return { canAttempt: true, reason: null };
}

/**
 * Gets the next required checkpoint.
 */
export function getNextRequiredCheckpoint(
  completedCheckpoints: readonly CheckpointResult[]
): CheckpointType | null {
  const checkpointOrder: CheckpointType[] = [
    CheckpointTypeEnum.APPROACH,
    CheckpointTypeEnum.INVARIANT,
    CheckpointTypeEnum.PLAN,
    CheckpointTypeEnum.CODE,
  ];

  const passedCheckpoints = new Set(
    completedCheckpoints
      .filter(r => r.grade === GradeResultEnum.PASS)
      .map(r => r.checkpoint)
  );

  for (const checkpoint of checkpointOrder) {
    if (!passedCheckpoints.has(checkpoint)) {
      return checkpoint;
    }
  }

  return null; // All checkpoints passed
}

/**
 * Calculates progress through checkpoints.
 */
export function calculateCheckpointProgress(
  completedCheckpoints: readonly CheckpointResult[]
): {
  passed: number;
  total: number;
  percentage: number;
  currentCheckpoint: CheckpointType | null;
} {
  const allCheckpoints: CheckpointType[] = [
    CheckpointTypeEnum.APPROACH,
    CheckpointTypeEnum.INVARIANT,
    CheckpointTypeEnum.PLAN,
    CheckpointTypeEnum.CODE,
  ];

  const passedCount = completedCheckpoints.filter(
    r => r.grade === GradeResultEnum.PASS
  ).length;

  return {
    passed: passedCount,
    total: allCheckpoints.length,
    percentage: (passedCount / allCheckpoints.length) * 100,
    currentCheckpoint: getNextRequiredCheckpoint(completedCheckpoints),
  };
}

// ============================================================================
// Validation Errors for Locking
// ============================================================================

/**
 * Creates validation error for locked submission.
 */
export function createLockingError(
  lockResult: LockCheckResult
): ValidationError {
  return {
    type: 'PATTERN_VIOLATION',
    message: lockResult.reason ?? 'Code submission is locked',
    severity: 'error',
    suggestion: lockResult.missingCheckpoints.length > 0
      ? `Complete the ${lockResult.missingCheckpoints[0]} checkpoint to continue`
      : `Review and fix the ${lockResult.failedCheckpoints[0]} checkpoint`,
  };
}
