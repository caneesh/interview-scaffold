import { describe, it, expect } from 'vitest';
import {
  generateHelp,
  validateHelpRequest,
  createInitialHelpState,
  processHelpRequest,
  HELP_LEVEL_TYPES,
  HELP_LEVEL_PENALTIES,
} from './tiered-help-system.js';
import type { Problem } from '../entities/problem.js';

// Test fixtures
const mockProblem: Problem = {
  id: 'test-problem-1',
  tenantId: 'test-tenant',
  title: 'Two Sum',
  statement: 'Find two numbers that add to target in sorted array.',
  pattern: 'TWO_POINTERS',
  rung: 1,
  targetComplexity: 'O(n)',
  testCases: [],
  hints: ['Use two pointers', 'Start from both ends'],
  createdAt: new Date(),
};

describe('Tiered Help System Module', () => {
  describe('generateHelp', () => {
    it('should generate level 1 insight question', () => {
      const help = generateHelp({
        problem: mockProblem,
        requestedLevel: 1,
        explicitlyRequested: false,
      });

      expect(help.level).toBe(1);
      expect(help.type).toBe('INSIGHT_QUESTION');
      expect(help.content.length).toBeGreaterThan(0);
    });

    it('should generate level 2 conceptual hint', () => {
      const help = generateHelp({
        problem: mockProblem,
        requestedLevel: 2,
        explicitlyRequested: false,
      });

      expect(help.level).toBe(2);
      expect(help.type).toBe('CONCEPTUAL_HINT');
    });

    it('should generate level 3 invariant condition', () => {
      const help = generateHelp({
        problem: mockProblem,
        requestedLevel: 3,
        explicitlyRequested: false,
      });

      expect(help.level).toBe(3);
      expect(help.type).toBe('INVARIANT_CONDITION');
    });

    it('should generate level 4 structural skeleton', () => {
      const help = generateHelp({
        problem: mockProblem,
        requestedLevel: 4,
        explicitlyRequested: false,
      });

      expect(help.level).toBe(4);
      expect(help.type).toBe('STRUCTURAL_SKELETON');
      expect(help.content).toContain('left');
      expect(help.content).toContain('right');
    });

    it('should require explicit request for level 5', () => {
      const help = generateHelp({
        problem: mockProblem,
        requestedLevel: 5,
        explicitlyRequested: false,
      });

      // Should downgrade to level 4
      expect(help.level).toBe(4);
    });

    it('should provide level 5 when explicitly requested', () => {
      const help = generateHelp({
        problem: mockProblem,
        requestedLevel: 5,
        explicitlyRequested: true,
      });

      expect(help.level).toBe(5);
      expect(help.type).toBe('FULL_SOLUTION');
    });
  });

  describe('validateHelpRequest', () => {
    it('should approve single-level advancement', () => {
      const result = validateHelpRequest(1, 2, false);
      expect(result.approvedLevel).toBe(2);
      expect(result.warning).toBeNull();
    });

    it('should limit multi-level jumps without explicit request', () => {
      const result = validateHelpRequest(1, 4, false);
      expect(result.approvedLevel).toBe(2); // Only advance by one
      expect(result.warning).not.toBeNull();
    });

    it('should allow multi-level jumps with explicit request', () => {
      const result = validateHelpRequest(1, 4, true);
      expect(result.approvedLevel).toBe(4);
      expect(result.warning).toBeNull();
    });

    it('should block level 5 without explicit confirmation', () => {
      const result = validateHelpRequest(4, 5, false);
      expect(result.approvedLevel).toBe(4);
      expect(result.warning).toContain('Level 5');
    });

    it('should allow level 5 with explicit confirmation', () => {
      const result = validateHelpRequest(4, 5, true);
      expect(result.approvedLevel).toBe(5);
      expect(result.warning).toBeNull();
    });
  });

  describe('createInitialHelpState', () => {
    it('should create initial state at level 1', () => {
      const state = createInitialHelpState();

      expect(state.currentLevel).toBe(1);
      expect(state.history).toHaveLength(0);
      expect(state.totalPenalty).toBe(0);
    });
  });

  describe('processHelpRequest', () => {
    it('should process help request and update state', () => {
      const state = createInitialHelpState();

      const { help, updatedState, warning } = processHelpRequest(
        {
          problem: mockProblem,
          requestedLevel: 2,
          explicitlyRequested: false,
        },
        state
      );

      expect(help.level).toBe(2);
      expect(updatedState.currentLevel).toBe(2);
      expect(updatedState.history.length).toBe(1);
      expect(updatedState.totalPenalty).toBe(HELP_LEVEL_PENALTIES[2]);
    });

    it('should accumulate penalties', () => {
      let state = createInitialHelpState();

      // Request level 1
      const result1 = processHelpRequest(
        { problem: mockProblem, requestedLevel: 1, explicitlyRequested: false },
        state
      );
      state = result1.updatedState;
      expect(state.totalPenalty).toBe(HELP_LEVEL_PENALTIES[1]);

      // Request level 2
      const result2 = processHelpRequest(
        { problem: mockProblem, requestedLevel: 2, explicitlyRequested: false },
        state
      );
      state = result2.updatedState;
      expect(state.totalPenalty).toBe(HELP_LEVEL_PENALTIES[1] + HELP_LEVEL_PENALTIES[2]);
    });

    it('should record help history', () => {
      let state = createInitialHelpState();

      // Make several requests
      for (let level = 1; level <= 3; level++) {
        const result = processHelpRequest(
          { problem: mockProblem, requestedLevel: level as 1 | 2 | 3 | 4 | 5, explicitlyRequested: false },
          state
        );
        state = result.updatedState;
      }

      expect(state.history.length).toBe(3);
    });
  });

  describe('HELP_LEVEL_PENALTIES', () => {
    it('should have increasing penalties for higher levels', () => {
      expect(HELP_LEVEL_PENALTIES[1]).toBeLessThan(HELP_LEVEL_PENALTIES[2]);
      expect(HELP_LEVEL_PENALTIES[2]).toBeLessThan(HELP_LEVEL_PENALTIES[3]);
      expect(HELP_LEVEL_PENALTIES[3]).toBeLessThan(HELP_LEVEL_PENALTIES[4]);
      expect(HELP_LEVEL_PENALTIES[4]).toBeLessThan(HELP_LEVEL_PENALTIES[5]);
    });

    it('should have level 5 penalty of 0.5', () => {
      expect(HELP_LEVEL_PENALTIES[5]).toBe(0.5);
    });
  });

  describe('HELP_LEVEL_TYPES', () => {
    it('should map levels to correct types', () => {
      expect(HELP_LEVEL_TYPES[1]).toBe('INSIGHT_QUESTION');
      expect(HELP_LEVEL_TYPES[2]).toBe('CONCEPTUAL_HINT');
      expect(HELP_LEVEL_TYPES[3]).toBe('INVARIANT_CONDITION');
      expect(HELP_LEVEL_TYPES[4]).toBe('STRUCTURAL_SKELETON');
      expect(HELP_LEVEL_TYPES[5]).toBe('FULL_SOLUTION');
    });
  });
});
