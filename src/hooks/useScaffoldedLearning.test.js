import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScaffoldedLearning } from './useScaffoldedLearning';
import { sampleProblem } from '../data/sampleProblem';

// Helper to create a fresh hook for each test
const createHook = () => {
  return renderHook(() => useScaffoldedLearning(sampleProblem));
};

describe('useScaffoldedLearning', () => {

  describe('initial state', () => {
    it('should start at step 0', () => {
      const { result } = createHook();
      expect(result.current.currentStepIndex).toBe(0);
      expect(result.current.viewingStepIndex).toBe(0);
    });

    it('should not be completed', () => {
      const { result } = createHook();
      expect(result.current.isCompleted).toBe(false);
    });

    it('should have pattern selection available', () => {
      const { result } = createHook();
      expect(result.current.hasPatternSelection).toBe(true);
      expect(result.current.isPatternComplete).toBe(false);
    });

    it('should have interview question available', () => {
      const { result } = createHook();
      expect(result.current.hasInterviewQuestion).toBe(true);
      expect(result.current.isInterviewComplete).toBe(false);
    });

    it('should have strategy step available', () => {
      const { result } = createHook();
      expect(result.current.hasStrategyStep).toBe(true);
      expect(result.current.isStrategyComplete).toBe(false);
    });

    it('should start with default language', () => {
      const { result } = createHook();
      expect(result.current.selectedLanguage).toBe('python');
    });

    it('should have supported languages', () => {
      const { result } = createHook();
      expect(result.current.supportedLanguages).toEqual([
        'python',
        'javascript',
        'java',
      ]);
    });

    it('should have no hints revealed initially', () => {
      const { result } = createHook();
      expect(result.current.hintLevel).toBe(0);
      expect(result.current.totalHintsUsed).toBe(0);
    });

    it('should have initial placeholder code', () => {
      const { result } = createHook();
      expect(result.current.userCode).toContain('slow');
      expect(result.current.userCode).toContain('fast');
    });
  });

  describe('language switching', () => {
    it('should change language when valid', () => {
      const { result } = createHook();
      act(() => {
        result.current.changeLanguage('javascript');
      });

      expect(result.current.selectedLanguage).toBe('javascript');
    });

    it('should not change language when invalid', () => {
      const { result } = createHook();
      act(() => {
        result.current.changeLanguage('ruby');
      });

      expect(result.current.selectedLanguage).toBe('python');
    });

    it('should preserve code for each language separately', () => {
      const { result } = createHook();
      const pythonCode = 'slow = head\nfast = head';
      const jsCode = 'let slow = head;\nlet fast = head;';

      act(() => {
        result.current.updateCode(pythonCode);
      });

      act(() => {
        result.current.changeLanguage('javascript');
      });

      act(() => {
        result.current.updateCode(jsCode);
      });

      expect(result.current.userCode).toBe(jsCode);

      act(() => {
        result.current.changeLanguage('python');
      });

      expect(result.current.userCode).toBe(pythonCode);
    });
  });

  describe('pattern selection (Step Zero)', () => {
    it('should allow selecting a pattern', () => {
      const { result } = createHook();
      act(() => {
        result.current.selectPattern('two-pointers');
      });

      expect(result.current.selectedPattern).toBe('two-pointers');
    });

    it('should allow submitting pattern selection', () => {
      const { result } = createHook();
      act(() => {
        result.current.selectPattern('two-pointers');
      });

      act(() => {
        result.current.submitPattern();
      });

      expect(result.current.patternSubmitted).toBe(true);
      expect(result.current.isPatternCorrect).toBe(true);
    });

    it('should detect incorrect pattern', () => {
      const { result } = createHook();
      act(() => {
        result.current.selectPattern('dfs');
      });

      act(() => {
        result.current.submitPattern();
      });

      expect(result.current.patternSubmitted).toBe(true);
      expect(result.current.isPatternCorrect).toBe(false);
      expect(result.current.patternFeedback).toBeTruthy();
    });

    it('should allow retry after incorrect pattern', () => {
      const { result } = createHook();
      act(() => {
        result.current.selectPattern('dfs');
        result.current.submitPattern();
      });

      act(() => {
        result.current.retryPattern();
      });

      expect(result.current.patternSubmitted).toBe(false);
      expect(result.current.selectedPattern).toBe(null);
    });

    it('should track pattern attempts', () => {
      const { result } = createHook();
      act(() => {
        result.current.selectPattern('dfs');
      });
      act(() => {
        result.current.submitPattern();
      });

      expect(result.current.patternAttempts).toBe(1);

      act(() => {
        result.current.retryPattern();
      });
      act(() => {
        result.current.selectPattern('sliding-window');
      });
      act(() => {
        result.current.submitPattern();
      });

      expect(result.current.patternAttempts).toBe(2);
    });

    it('should proceed from pattern after correct selection', () => {
      const { result } = createHook();
      act(() => {
        result.current.selectPattern('two-pointers');
        result.current.submitPattern();
      });

      act(() => {
        result.current.proceedFromPattern();
      });

      expect(result.current.isPatternComplete).toBe(true);
    });
  });

  describe('interview simulation', () => {
    it('should allow selecting an approach', () => {
      const { result } = createHook();
      act(() => {
        result.current.selectApproach('two-pointers');
      });

      expect(result.current.selectedApproach).toBe('two-pointers');
    });

    it('should allow submitting interview answer', () => {
      const { result } = createHook();
      act(() => {
        result.current.selectApproach('two-pointers');
      });

      act(() => {
        result.current.submitInterview();
      });

      expect(result.current.interviewSubmitted).toBe(true);
      expect(result.current.isInterviewCorrect).toBe(true);
    });

    it('should detect partially correct answer', () => {
      const { result } = createHook();
      act(() => {
        result.current.selectApproach('hash-set');
      });

      act(() => {
        result.current.submitInterview();
      });

      expect(result.current.interviewSubmitted).toBe(true);
      expect(result.current.isInterviewCorrect).toBe(false);
      expect(result.current.isInterviewPartiallyCorrect).toBe(true);
    });

    it('should proceed to coding after interview', () => {
      const { result } = createHook();
      act(() => {
        result.current.selectApproach('two-pointers');
        result.current.submitInterview();
      });

      act(() => {
        result.current.proceedToCoding();
      });

      expect(result.current.isInterviewComplete).toBe(true);
    });
  });

  describe('strategy planning (Reasoning Out Loud)', () => {
    it('should allow updating strategy text', () => {
      const { result } = createHook();
      act(() => {
        result.current.updateStrategyText('I will use two pointers moving at different speeds');
      });

      expect(result.current.strategyText).toBe(
        'I will use two pointers moving at different speeds'
      );
    });

    it('should validate strategy text and detect matching concepts', () => {
      const { result } = createHook();
      act(() => {
        result.current.updateStrategyText(
          'I will use two pointers. The slow pointer moves one step and the fast pointer moves two steps. ' +
          'I will loop while checking if they meet. If slow equals fast, there is a cycle. ' +
          'If fast reaches null, there is no cycle.'
        );
      });

      act(() => {
        result.current.submitStrategy();
      });

      expect(result.current.strategySubmitted).toBe(true);
      expect(result.current.strategyValidation).toBeTruthy();
      expect(result.current.strategyValidation.isValid).toBe(true);
    });

    it('should detect missing concepts in strategy', () => {
      const { result } = createHook();
      act(() => {
        result.current.updateStrategyText('I will use a variable.');
      });

      act(() => {
        result.current.submitStrategy();
      });

      expect(result.current.strategySubmitted).toBe(true);
      expect(result.current.strategyValidation.isValid).toBe(false);
      expect(result.current.strategyValidation.missing.length).toBeGreaterThan(0);
    });

    it('should allow revealing strategy hints', () => {
      const { result } = createHook();
      expect(result.current.strategyHintLevel).toBe(0);

      act(() => {
        result.current.revealStrategyHint();
      });

      expect(result.current.strategyHintLevel).toBe(1);
    });

    it('should allow retry after invalid strategy', () => {
      const { result } = createHook();
      act(() => {
        result.current.updateStrategyText('short');
        result.current.submitStrategy();
      });

      act(() => {
        result.current.retryStrategy();
      });

      expect(result.current.strategySubmitted).toBe(false);
      expect(result.current.strategyValidation).toBe(null);
      // Should preserve text for editing
      expect(result.current.strategyText).toBe('short');
    });

    it('should proceed from strategy after valid submission', () => {
      const { result } = createHook();
      act(() => {
        result.current.updateStrategyText(
          'I will use slow and fast pointers. They move at different speeds in a while loop. ' +
          'When they meet, we found a cycle. If we reach the end, no cycle.'
        );
        result.current.submitStrategy();
      });

      act(() => {
        result.current.proceedFromStrategy();
      });

      expect(result.current.isStrategyComplete).toBe(true);
    });
  });

  describe('code editing and validation', () => {
    it('should update code when editing', () => {
      const { result } = createHook();
      const newCode = 'slow = head\nfast = head';

      act(() => {
        result.current.updateCode(newCode);
      });

      expect(result.current.userCode).toBe(newCode);
    });

    it('should validate correct Python code for step 1', () => {
      const { result } = createHook();
      act(() => {
        result.current.updateCode('slow = head\nfast = head');
      });

      let isValid;
      act(() => {
        isValid = result.current.submitStep();
      });

      expect(isValid).toBe(true);
      expect(result.current.currentStepIndex).toBe(1);
    });

    it('should reject incorrect code', () => {
      const { result } = createHook();
      act(() => {
        result.current.updateCode('slow = None');
      });

      let isValid;
      act(() => {
        isValid = result.current.submitStep();
      });

      expect(isValid).toBe(false);
      expect(result.current.currentStepIndex).toBe(0);
      expect(result.current.isValidationError).toBe(true);
    });

    it('should validate JavaScript code after language switch', () => {
      const { result } = createHook();
      act(() => {
        result.current.changeLanguage('javascript');
      });

      act(() => {
        result.current.updateCode('let slow = head;\nlet fast = head;');
      });

      let isValid;
      act(() => {
        isValid = result.current.submitStep();
      });

      expect(isValid).toBe(true);
    });

    it('should validate Java code after language switch', () => {
      const { result } = createHook();
      act(() => {
        result.current.changeLanguage('java');
      });

      act(() => {
        result.current.updateCode('ListNode slow = head;\nListNode fast = head;');
      });

      let isValid;
      act(() => {
        isValid = result.current.submitStep();
      });

      expect(isValid).toBe(true);
    });
  });

  describe('hint system', () => {
    it('should reveal hints progressively', () => {
      const { result } = createHook();
      expect(result.current.hintLevel).toBe(0);

      act(() => {
        result.current.revealNextHint();
      });

      expect(result.current.hintLevel).toBe(1);
      expect(result.current.totalHintsUsed).toBe(1);

      act(() => {
        result.current.revealNextHint();
      });

      expect(result.current.hintLevel).toBe(2);
      expect(result.current.totalHintsUsed).toBe(2);
    });

    it('should track hints per step', () => {
      const { result } = createHook();
      // Use 2 hints on step 1 (separate acts for state updates)
      act(() => {
        result.current.revealNextHint();
      });
      act(() => {
        result.current.revealNextHint();
      });

      // Complete step 1
      act(() => {
        result.current.updateCode('slow = head\nfast = head');
      });
      act(() => {
        result.current.submitStep();
      });

      // Use 1 hint on step 2
      act(() => {
        result.current.revealNextHint();
      });

      expect(result.current.totalHintsUsed).toBe(3);
    });

    it('should reset hint level when moving to next step', () => {
      const { result } = createHook();
      act(() => {
        result.current.revealNextHint();
        result.current.revealNextHint();
      });

      act(() => {
        result.current.updateCode('slow = head\nfast = head');
      });

      act(() => {
        result.current.submitStep();
      });

      expect(result.current.hintLevel).toBe(0);
    });
  });

  describe('step progression', () => {
    it('should progress through steps correctly', () => {
      const { result } = createHook();
      // Step 1
      act(() => {
        result.current.updateCode('slow = head\nfast = head');
      });
      act(() => {
        result.current.submitStep();
      });
      expect(result.current.currentStepIndex).toBe(1);

      // Step 2
      act(() => {
        result.current.updateCode('while fast and fast.next:\n    pass');
      });
      act(() => {
        result.current.submitStep();
      });
      expect(result.current.currentStepIndex).toBe(2);

      // Step 3
      act(() => {
        result.current.updateCode(
          'slow = slow.next\nfast = fast.next.next'
        );
      });
      act(() => {
        result.current.submitStep();
      });
      expect(result.current.currentStepIndex).toBe(3);

      // Step 4
      act(() => {
        result.current.updateCode('if slow == fast:\n    return True');
      });
      act(() => {
        result.current.submitStep();
      });
      expect(result.current.currentStepIndex).toBe(4);

      // Step 5 (last step)
      expect(result.current.isLastStep).toBe(true);
      act(() => {
        result.current.updateCode('return False');
      });
      act(() => {
        result.current.submitStep();
      });
      expect(result.current.isCompleted).toBe(true);
    });

    it('should calculate progress correctly', () => {
      const { result } = createHook();
      expect(result.current.progress).toBe(0);

      act(() => {
        result.current.updateCode('slow = head\nfast = head');
      });
      act(() => {
        result.current.submitStep();
      });

      expect(result.current.progress).toBe(20); // 1/5 = 20%
    });
  });

  describe('review mode', () => {
    // Helper to set up a hook with step 1 completed
    const createHookWithStep1Complete = () => {
      const hook = createHook();
      act(() => {
        hook.result.current.updateCode('slow = head\nfast = head');
      });
      act(() => {
        hook.result.current.submitStep();
      });
      return hook;
    };

    it('should allow viewing completed steps', () => {
      const { result } = createHookWithStep1Complete();
      expect(result.current.currentStepIndex).toBe(1);

      act(() => {
        result.current.viewStep(0);
      });

      expect(result.current.viewingStepIndex).toBe(0);
      expect(result.current.isReviewMode).toBe(true);
    });

    it('should not allow viewing future steps', () => {
      const { result } = createHookWithStep1Complete();
      act(() => {
        result.current.viewStep(3);
      });

      expect(result.current.viewingStepIndex).toBe(1);
    });

    it('should return to current step from review', () => {
      const { result } = createHookWithStep1Complete();
      act(() => {
        result.current.viewStep(0);
      });

      act(() => {
        result.current.returnToCurrentStep();
      });

      expect(result.current.viewingStepIndex).toBe(1);
      expect(result.current.isReviewMode).toBe(false);
    });

    it('should not update code in review mode', () => {
      const { result } = createHookWithStep1Complete();

      act(() => {
        result.current.viewStep(0);
      });

      act(() => {
        result.current.updateCode('modified code');
      });

      // Should be in review mode
      expect(result.current.isReviewMode).toBe(true);
    });
  });

  describe('reset functionality', () => {
    it('should reset all state when resetProblem is called', () => {
      const { result } = createHook();

      // Set up some state first
      act(() => {
        result.current.selectPattern('two-pointers');
        result.current.submitPattern();
        result.current.proceedFromPattern();
      });

      act(() => {
        result.current.selectApproach('two-pointers');
        result.current.submitInterview();
        result.current.proceedToCoding();
      });

      act(() => {
        result.current.updateCode('slow = head\nfast = head');
      });
      act(() => {
        result.current.submitStep();
      });
      act(() => {
        result.current.revealNextHint();
      });

      // Now reset
      act(() => {
        result.current.resetProblem();
      });

      // Pattern state
      expect(result.current.isPatternComplete).toBe(false);
      expect(result.current.selectedPattern).toBe(null);
      expect(result.current.patternSubmitted).toBe(false);
      expect(result.current.patternAttempts).toBe(0);

      // Interview state
      expect(result.current.isInterviewComplete).toBe(false);
      expect(result.current.selectedApproach).toBe(null);
      expect(result.current.interviewSubmitted).toBe(false);

      // Strategy state
      expect(result.current.isStrategyComplete).toBe(false);
      expect(result.current.strategyText).toBe('');
      expect(result.current.strategySubmitted).toBe(false);

      // Coding state
      expect(result.current.currentStepIndex).toBe(0);
      expect(result.current.viewingStepIndex).toBe(0);
      expect(result.current.hintLevel).toBe(0);
      expect(result.current.isCompleted).toBe(false);
    });
  });

  describe('completion state', () => {
    it('should set isCompleted when all steps are done', () => {
      const { result } = createHook();
      const steps = [
        'slow = head\nfast = head',
        'while fast and fast.next:\n    pass',
        'slow = slow.next\nfast = fast.next.next',
        'if slow == fast:\n    return True',
        'return False',
      ];

      steps.forEach((code) => {
        act(() => {
          result.current.updateCode(code);
        });
        act(() => {
          result.current.submitStep();
        });
      });

      expect(result.current.isCompleted).toBe(true);
      expect(result.current.progress).toBe(100);
    });
  });
});
