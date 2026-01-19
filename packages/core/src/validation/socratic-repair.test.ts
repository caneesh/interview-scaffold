import { describe, it, expect } from 'vitest';
import {
  generateSocraticRepairResponse,
  classifyErrorType,
  buildRepairContext,
  isGibberishInput,
  classifyValidationOutcome,
  type SocraticRepairContext,
} from './socratic-repair.js';

describe('Socratic Repair Service', () => {
  describe('isGibberishInput', () => {
    it('should detect random letter sequences', () => {
      expect(isGibberishInput('adadadadad')).toBe(true);
      expect(isGibberishInput('asdfghjkl')).toBe(true);
      expect(isGibberishInput('qwertyuiop')).toBe(true);
    });

    it('should accept valid input', () => {
      expect(isGibberishInput('use sliding window pattern')).toBe(false);
      expect(isGibberishInput('two pointer approach')).toBe(false);
      expect(isGibberishInput('loop through array')).toBe(false);
    });

    it('should detect short input as gibberish', () => {
      expect(isGibberishInput('ab')).toBe(true);
      expect(isGibberishInput('x')).toBe(true);
    });

    it('should accept short valid words', () => {
      expect(isGibberishInput('use loop')).toBe(false);
    });
  });

  describe('classifyErrorType', () => {
    it('should detect off-by-one errors', () => {
      expect(classifyErrorType('off by one error in loop', 'SLIDING_WINDOW')).toBe('off_by_one');
      expect(classifyErrorType('boundary index issue', 'TWO_POINTERS')).toBe('off_by_one');
    });

    it('should detect complexity issues', () => {
      expect(classifyErrorType('time complexity too high', 'DFS')).toBe('complexity_issue');
      expect(classifyErrorType('solution is too slow', 'BINARY_SEARCH')).toBe('complexity_issue');
    });

    it('should detect invariant violations', () => {
      expect(classifyErrorType('invariant not maintained', 'SLIDING_WINDOW')).toBe('invariant_violation');
    });

    it('should detect gibberish input', () => {
      expect(classifyErrorType('invalid or gibberish input', 'DFS')).toBe('gibberish_input');
    });

    it('should default to logic error', () => {
      expect(classifyErrorType('some generic error', 'GREEDY')).toBe('logic_error');
    });
  });

  describe('classifyValidationOutcome', () => {
    it('should return ACCEPT for valid and correct', () => {
      expect(classifyValidationOutcome(true, true, 0.9)).toBe('ACCEPT');
    });

    it('should return REJECT_INVALID for invalid', () => {
      expect(classifyValidationOutcome(false, false, 0.9)).toBe('REJECT_INVALID');
    });

    it('should return REJECT_INCORRECT for valid but incorrect with high confidence', () => {
      expect(classifyValidationOutcome(true, false, 0.8)).toBe('REJECT_INCORRECT');
    });

    it('should return UNSURE for valid but incorrect with low confidence', () => {
      expect(classifyValidationOutcome(true, false, 0.3)).toBe('UNSURE');
    });
  });

  describe('buildRepairContext', () => {
    it('should build context from validation failure', () => {
      const context = buildRepairContext(
        'SLIDING_WINDOW',
        'Maximum Sum Subarray',
        1,
        'Pattern Selection',
        'Selected sliding window pattern',
        'Use two pointers to track window',
        'adadadadad',
        'invalid or gibberish input'
      );

      expect(context.problemContext.pattern).toBe('SLIDING_WINDOW');
      expect(context.currentError.errorType).toBe('gibberish_input');
      expect(context.previousValidStep.stepId).toBe(1);
    });
  });

  describe('generateSocraticRepairResponse', () => {
    it('should generate pause message', () => {
      const context: SocraticRepairContext = {
        previousValidStep: {
          stepId: 0,
          stepTitle: 'Pattern Selection',
          stepContent: 'Selected sliding window pattern',
          userAnswer: 'Use sliding window',
        },
        currentError: {
          description: 'Loop boundary incorrect',
          errorType: 'off_by_one',
          studentInput: 'for (i = 0; i <= n; i++)',
        },
        violatedPrinciple: {
          name: 'Boundary Handling',
          description: 'Loop indices must be precise',
          category: 'edge_cases',
        },
        problemContext: {
          pattern: 'SLIDING_WINDOW',
          problemTitle: 'Maximum Sum Subarray',
        },
      };

      const response = generateSocraticRepairResponse(context);

      expect(response.pauseMessage).toBeTruthy();
      expect(response.pauseMessage.length).toBeGreaterThan(10);
      expect(response.rewindReference.stepLabel).toBe('Step 1');
      expect(response.bridgeQuestion).toBeTruthy();
      expect(response.gentleNudge).toBeTruthy();
      expect(response.highlightStepId).toBe(0);
    });

    it('should include pattern-specific hints when available', () => {
      const context: SocraticRepairContext = {
        previousValidStep: {
          stepId: 0,
          stepTitle: 'Pattern Selection',
          stepContent: 'Selected sliding window',
        },
        currentError: {
          description: 'Wrong complexity',
          errorType: 'complexity_issue',
        },
        violatedPrinciple: {
          name: 'Complexity Budget',
          description: 'Must be O(n)',
          category: 'complexity',
        },
        problemContext: {
          pattern: 'SLIDING_WINDOW',
          problemTitle: 'Test Problem',
        },
      };

      const response = generateSocraticRepairResponse(context);

      // Should have pattern-specific hint for sliding window
      expect(response.gentleNudge.toLowerCase()).toMatch(/(window|element|slide)/);
    });

    it('should not give away the answer', () => {
      const context: SocraticRepairContext = {
        previousValidStep: {
          stepId: 0,
          stepTitle: 'Pattern Selection',
          stepContent: 'Selected DFS',
        },
        currentError: {
          description: 'Missing visited check',
          errorType: 'logic_error',
        },
        violatedPrinciple: {
          name: 'Visited Tracking',
          description: 'Must track visited nodes',
          category: 'algorithm',
        },
        problemContext: {
          pattern: 'DFS',
          problemTitle: 'Island Count',
        },
      };

      const response = generateSocraticRepairResponse(context);

      // Should ask questions, not give answers
      expect(response.bridgeQuestion).toMatch(/\?/);
      // Should not contain direct code fixes
      expect(response.bridgeQuestion).not.toMatch(/visited\[/);
      expect(response.bridgeQuestion).not.toMatch(/visited\.add/);
    });
  });
});
