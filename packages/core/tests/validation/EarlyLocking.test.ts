import { describe, it, expect } from 'vitest';
import {
  checkCodeSubmissionLock,
  canAttemptCheckpoint,
  getNextRequiredCheckpoint,
  calculateCheckpointProgress,
  LOCKING_CONSTANTS,
} from '../../src/validation/EarlyLocking.js';
import type { CheckpointResult } from '../../src/validation/types.js';

describe('EarlyLocking', () => {
  const createCheckpointResult = (
    checkpoint: 'APPROACH' | 'INVARIANT' | 'PLAN' | 'CODE',
    grade: 'PASS' | 'PARTIAL' | 'FAIL'
  ): CheckpointResult => ({
    checkpoint,
    grade,
    feedback: `${checkpoint} ${grade}`,
    errors: [],
    timestamp: Date.now(),
  });

  describe('checkCodeSubmissionLock', () => {
    it('should lock code submission when APPROACH not passed', () => {
      const results: CheckpointResult[] = [];

      const lockResult = checkCodeSubmissionLock(results);

      expect(lockResult.isLocked).toBe(true);
      expect(lockResult.missingCheckpoints).toContain('APPROACH');
    });

    it('should lock code submission when INVARIANT failed', () => {
      const results: CheckpointResult[] = [
        createCheckpointResult('APPROACH', 'PASS'),
        createCheckpointResult('INVARIANT', 'FAIL'),
      ];

      const lockResult = checkCodeSubmissionLock(results);

      expect(lockResult.isLocked).toBe(true);
      expect(lockResult.failedCheckpoints).toContain('INVARIANT');
    });

    it('should lock code submission when PLAN is partial (strict mode)', () => {
      const results: CheckpointResult[] = [
        createCheckpointResult('APPROACH', 'PASS'),
        createCheckpointResult('INVARIANT', 'PASS'),
        createCheckpointResult('PLAN', 'PARTIAL'),
      ];

      const lockResult = checkCodeSubmissionLock(results);

      // Depends on ALLOW_PARTIAL_TO_PROCEED constant
      if (!LOCKING_CONSTANTS.ALLOW_PARTIAL_TO_PROCEED) {
        expect(lockResult.isLocked).toBe(true);
      }
    });

    it('should unlock code submission when all prerequisites pass', () => {
      const results: CheckpointResult[] = [
        createCheckpointResult('APPROACH', 'PASS'),
        createCheckpointResult('INVARIANT', 'PASS'),
        createCheckpointResult('PLAN', 'PASS'),
      ];

      const lockResult = checkCodeSubmissionLock(results);

      expect(lockResult.isLocked).toBe(false);
      expect(lockResult.canProceed).toBe(true);
    });

    it('should include reason for locking', () => {
      const results: CheckpointResult[] = [
        createCheckpointResult('APPROACH', 'FAIL'),
      ];

      const lockResult = checkCodeSubmissionLock(results);

      expect(lockResult.reason).toBeDefined();
      // When APPROACH fails but INVARIANT/PLAN are missing, reason mentions missing ones
      expect(lockResult.failedCheckpoints).toContain('APPROACH');
    });
  });

  describe('canAttemptCheckpoint', () => {
    it('should always allow APPROACH checkpoint', () => {
      const result = canAttemptCheckpoint('APPROACH', []);

      expect(result.canAttempt).toBe(true);
    });

    it('should block INVARIANT when APPROACH not done', () => {
      const result = canAttemptCheckpoint('INVARIANT', []);

      expect(result.canAttempt).toBe(false);
      expect(result.reason).toContain('APPROACH');
    });

    it('should block CODE when earlier checkpoints failed', () => {
      const results: CheckpointResult[] = [
        createCheckpointResult('APPROACH', 'PASS'),
        createCheckpointResult('INVARIANT', 'FAIL'),
      ];

      const result = canAttemptCheckpoint('CODE', results);

      expect(result.canAttempt).toBe(false);
    });

    it('should allow CODE when all prerequisites pass', () => {
      const results: CheckpointResult[] = [
        createCheckpointResult('APPROACH', 'PASS'),
        createCheckpointResult('INVARIANT', 'PASS'),
        createCheckpointResult('PLAN', 'PASS'),
      ];

      const result = canAttemptCheckpoint('CODE', results);

      expect(result.canAttempt).toBe(true);
    });
  });

  describe('getNextRequiredCheckpoint', () => {
    it('should return APPROACH when nothing completed', () => {
      const result = getNextRequiredCheckpoint([]);

      expect(result).toBe('APPROACH');
    });

    it('should return next checkpoint after passed ones', () => {
      const results: CheckpointResult[] = [
        createCheckpointResult('APPROACH', 'PASS'),
      ];

      const result = getNextRequiredCheckpoint(results);

      expect(result).toBe('INVARIANT');
    });

    it('should return null when all checkpoints passed', () => {
      const results: CheckpointResult[] = [
        createCheckpointResult('APPROACH', 'PASS'),
        createCheckpointResult('INVARIANT', 'PASS'),
        createCheckpointResult('PLAN', 'PASS'),
        createCheckpointResult('CODE', 'PASS'),
      ];

      const result = getNextRequiredCheckpoint(results);

      expect(result).toBeNull();
    });

    it('should return failed checkpoint that needs retry', () => {
      const results: CheckpointResult[] = [
        createCheckpointResult('APPROACH', 'PASS'),
        createCheckpointResult('INVARIANT', 'FAIL'),
      ];

      const result = getNextRequiredCheckpoint(results);

      expect(result).toBe('INVARIANT');
    });
  });

  describe('calculateCheckpointProgress', () => {
    it('should calculate 0% for no completions', () => {
      const progress = calculateCheckpointProgress([]);

      expect(progress.passed).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it('should calculate correct percentage', () => {
      const results: CheckpointResult[] = [
        createCheckpointResult('APPROACH', 'PASS'),
        createCheckpointResult('INVARIANT', 'PASS'),
      ];

      const progress = calculateCheckpointProgress(results);

      expect(progress.passed).toBe(2);
      expect(progress.total).toBe(4);
      expect(progress.percentage).toBe(50);
    });

    it('should identify current checkpoint', () => {
      const results: CheckpointResult[] = [
        createCheckpointResult('APPROACH', 'PASS'),
      ];

      const progress = calculateCheckpointProgress(results);

      expect(progress.currentCheckpoint).toBe('INVARIANT');
    });
  });
});
