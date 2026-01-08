import { describe, it, expect } from 'vitest';
import {
  evaluateGating,
  createGatingState,
  addErrorToState,
  addHintToState,
  incrementRetry,
  GATING_CONSTANTS,
} from '../../src/validation/MicroLessonGating.js';
import { PatternId } from '../../src/entities/types.js';

describe('MicroLessonGating', () => {
  describe('createGatingState', () => {
    it('should create initial state with correct defaults', () => {
      const state = createGatingState(PatternId('two-pointers'));

      expect(state.patternId).toBe('two-pointers');
      expect(state.errorHistory).toEqual([]);
      expect(state.hintsUsed).toEqual([]);
      expect(state.retryCount).toBe(0);
    });
  });

  describe('addErrorToState', () => {
    it('should add error to history', () => {
      let state = createGatingState(PatternId('sliding-window'));
      state = addErrorToState(state, 'NESTED_LOOP_IN_SLIDING_WINDOW');

      expect(state.errorHistory).toContain('NESTED_LOOP_IN_SLIDING_WINDOW');
      expect(state.errorHistory).toHaveLength(1);
    });

    it('should track multiple occurrences of same error', () => {
      let state = createGatingState(PatternId('sliding-window'));
      state = addErrorToState(state, 'NESTED_LOOP_IN_SLIDING_WINDOW');
      state = addErrorToState(state, 'NESTED_LOOP_IN_SLIDING_WINDOW');

      expect(state.errorHistory).toHaveLength(2);
      expect(state.errorHistory.filter(e => e === 'NESTED_LOOP_IN_SLIDING_WINDOW')).toHaveLength(2);
    });

    it('should track different errors independently', () => {
      let state = createGatingState(PatternId('dfs-grid'));
      state = addErrorToState(state, 'MISSING_VISITED_SET');
      state = addErrorToState(state, 'MISSING_BACKTRACK');

      expect(state.errorHistory).toContain('MISSING_VISITED_SET');
      expect(state.errorHistory).toContain('MISSING_BACKTRACK');
      expect(state.errorHistory).toHaveLength(2);
    });
  });

  describe('addHintToState', () => {
    it('should add hint level to state', () => {
      let state = createGatingState(PatternId('two-pointers'));
      state = addHintToState(state, 1);

      expect(state.hintsUsed).toContain(1);
    });

    it('should track multiple hints', () => {
      let state = createGatingState(PatternId('two-pointers'));
      state = addHintToState(state, 1);
      state = addHintToState(state, 2);

      expect(state.hintsUsed).toEqual([1, 2]);
    });

    it('should track same hint level multiple times', () => {
      let state = createGatingState(PatternId('two-pointers'));
      state = addHintToState(state, 2);
      state = addHintToState(state, 2);

      expect(state.hintsUsed).toEqual([2, 2]);
    });
  });

  describe('incrementRetry', () => {
    it('should increment retry count', () => {
      let state = createGatingState(PatternId('two-pointers'));
      state = incrementRetry(state);

      expect(state.retryCount).toBe(1);
    });

    it('should track multiple retries', () => {
      let state = createGatingState(PatternId('two-pointers'));
      state = incrementRetry(state);
      state = incrementRetry(state);
      state = incrementRetry(state);

      expect(state.retryCount).toBe(3);
    });
  });

  describe('evaluateGating', () => {
    it('should not gate when no issues', () => {
      const state = createGatingState(PatternId('two-pointers'));

      const decision = evaluateGating(state);

      expect(decision.shouldGate).toBe(false);
      expect(decision.reason).toBeNull();
    });

    it('should gate when same error occurs twice', () => {
      let state = createGatingState(PatternId('sliding-window'));
      state = addErrorToState(state, 'NESTED_LOOP_IN_SLIDING_WINDOW');
      state = addErrorToState(state, 'NESTED_LOOP_IN_SLIDING_WINDOW');

      const decision = evaluateGating(state);

      expect(decision.shouldGate).toBe(true);
      expect(decision.reason).toBe('SAME_ERROR_TWICE');
      expect(decision.errorHistory).toContain('NESTED_LOOP_IN_SLIDING_WINDOW');
    });

    it('should gate when Hint2 used twice', () => {
      let state = createGatingState(PatternId('two-pointers'));
      state = addHintToState(state, GATING_CONSTANTS.HINT2_LEVEL);
      state = addHintToState(state, GATING_CONSTANTS.HINT2_LEVEL);

      const decision = evaluateGating(state);

      expect(decision.shouldGate).toBe(true);
      expect(decision.reason).toBe('HINT2_TWICE');
    });

    it('should not gate when Hint1 used twice', () => {
      let state = createGatingState(PatternId('two-pointers'));
      state = addHintToState(state, 1);
      state = addHintToState(state, 1);

      const decision = evaluateGating(state);

      expect(decision.shouldGate).toBe(false);
    });

    it('should gate when retries exceed threshold', () => {
      let state = createGatingState(PatternId('two-pointers'));
      for (let i = 0; i < GATING_CONSTANTS.RETRY_THRESHOLD; i++) {
        state = incrementRetry(state);
      }

      const decision = evaluateGating(state);

      expect(decision.shouldGate).toBe(true);
      expect(decision.reason).toBe('RETRIES_EXCEEDED');
    });

    it('should not gate when retries below threshold', () => {
      let state = createGatingState(PatternId('two-pointers'));
      state = incrementRetry(state);

      const decision = evaluateGating(state);

      expect(decision.shouldGate).toBe(false);
    });

    it('should recommend lesson based on pattern', () => {
      let state = createGatingState(PatternId('sliding-window'));
      state = addErrorToState(state, 'NESTED_LOOP_IN_SLIDING_WINDOW');
      state = addErrorToState(state, 'NESTED_LOOP_IN_SLIDING_WINDOW');

      const decision = evaluateGating(state);

      expect(decision.recommendedLessonId).toBeDefined();
      expect(decision.recommendedLessonId).toContain('sliding-window');
    });

    it('should prioritize error gating over retry gating', () => {
      let state = createGatingState(PatternId('sliding-window'));
      // Both conditions met
      state = addErrorToState(state, 'NESTED_LOOP_IN_SLIDING_WINDOW');
      state = addErrorToState(state, 'NESTED_LOOP_IN_SLIDING_WINDOW');
      for (let i = 0; i < GATING_CONSTANTS.RETRY_THRESHOLD; i++) {
        state = incrementRetry(state);
      }

      const decision = evaluateGating(state);

      // Should report the more specific error reason
      expect(decision.shouldGate).toBe(true);
      expect(decision.reason).toBe('SAME_ERROR_TWICE');
    });
  });

  describe('GATING_CONSTANTS', () => {
    it('should have expected threshold values', () => {
      expect(GATING_CONSTANTS.SAME_ERROR_THRESHOLD).toBe(2);
      expect(GATING_CONSTANTS.HINT2_THRESHOLD).toBe(2);
      expect(GATING_CONSTANTS.RETRY_THRESHOLD).toBe(2);
      expect(GATING_CONSTANTS.HINT2_LEVEL).toBe(2);
    });
  });
});
