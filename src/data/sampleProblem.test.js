import { describe, it, expect } from 'vitest';
import { sampleProblem } from './sampleProblem';

describe('sampleProblem', () => {
  describe('basic structure', () => {
    it('should have required top-level properties', () => {
      expect(sampleProblem).toHaveProperty('id');
      expect(sampleProblem).toHaveProperty('title');
      expect(sampleProblem).toHaveProperty('difficulty');
      expect(sampleProblem).toHaveProperty('description');
      expect(sampleProblem).toHaveProperty('steps');
    });

    it('should have supported languages array', () => {
      expect(sampleProblem.supportedLanguages).toEqual(
        expect.arrayContaining(['python', 'javascript', 'java'])
      );
    });

    it('should have a default language', () => {
      expect(sampleProblem.defaultLanguage).toBe('python');
      expect(sampleProblem.supportedLanguages).toContain(
        sampleProblem.defaultLanguage
      );
    });

    it('should have multiple steps', () => {
      expect(sampleProblem.steps.length).toBeGreaterThan(0);
    });
  });

  describe('step structure', () => {
    it('should have stepId for each step', () => {
      sampleProblem.steps.forEach((step, index) => {
        expect(step.stepId).toBe(index + 1);
      });
    });

    it('should have instruction for each step', () => {
      sampleProblem.steps.forEach((step) => {
        expect(step.instruction).toBeDefined();
        expect(typeof step.instruction).toBe('string');
        expect(step.instruction.length).toBeGreaterThan(0);
      });
    });

    it('should have hints for each step', () => {
      sampleProblem.steps.forEach((step) => {
        expect(step.hints).toBeDefined();
        expect(Array.isArray(step.hints)).toBe(true);
        expect(step.hints.length).toBeGreaterThan(0);
      });
    });

    it('should have validation rules for each language', () => {
      const { supportedLanguages, steps } = sampleProblem;

      steps.forEach((step) => {
        expect(step.validationRule).toBeDefined();
        supportedLanguages.forEach((lang) => {
          expect(step.validationRule[lang]).toBeDefined();
          expect(typeof step.validationRule[lang]).toBe('string');
        });
      });
    });

    it('should have placeholder code for each language', () => {
      const { supportedLanguages, steps } = sampleProblem;

      steps.forEach((step) => {
        expect(step.placeholderCode).toBeDefined();
        supportedLanguages.forEach((lang) => {
          expect(step.placeholderCode[lang]).toBeDefined();
          expect(typeof step.placeholderCode[lang]).toBe('string');
        });
      });
    });
  });

  describe('validation rules - Python', () => {
    const lang = 'python';

    describe('Step 1: Initialize pointers', () => {
      const rule = new RegExp(sampleProblem.steps[0].validationRule[lang], 's');

      it('should pass valid pointer initialization', () => {
        expect(rule.test('slow = head\nfast = head')).toBe(true);
        expect(rule.test('fast = head\nslow = head')).toBe(true);
        expect(rule.test('slow=head\nfast=head')).toBe(true);
      });

      it('should fail invalid pointer initialization', () => {
        expect(rule.test('slow = head')).toBe(false);
        expect(rule.test('fast = head')).toBe(false);
        expect(rule.test('slow = None')).toBe(false);
      });
    });

    describe('Step 2: While loop condition', () => {
      const rule = new RegExp(sampleProblem.steps[1].validationRule[lang], 's');

      it('should pass valid while loop', () => {
        expect(rule.test('while fast and fast.next:')).toBe(true);
        expect(rule.test('while fast && fast.next:')).toBe(true);
      });

      it('should fail invalid while loop', () => {
        expect(rule.test('while fast:')).toBe(false);
        expect(rule.test('while True:')).toBe(false);
      });
    });

    describe('Step 3: Move pointers', () => {
      const rule = new RegExp(sampleProblem.steps[2].validationRule[lang], 's');

      it('should pass valid pointer movement', () => {
        expect(rule.test('slow = slow.next\nfast = fast.next.next')).toBe(true);
        expect(rule.test('fast = fast.next.next\nslow = slow.next')).toBe(true);
        expect(rule.test('slow=slow.next\nfast=fast.next.next')).toBe(true);
      });

      it('should fail invalid pointer movement', () => {
        expect(rule.test('slow = slow.next')).toBe(false);
        expect(rule.test('fast = fast.next')).toBe(false);
      });
    });

    describe('Step 4: Cycle detection check', () => {
      const rule = new RegExp(sampleProblem.steps[3].validationRule[lang], 's');

      it('should pass valid cycle check', () => {
        expect(rule.test('if slow == fast:')).toBe(true);
        expect(rule.test('if slow is fast:')).toBe(true);
      });

      it('should fail invalid cycle check', () => {
        expect(rule.test('if slow != fast:')).toBe(false);
        expect(rule.test('if fast:')).toBe(false);
      });
    });

    describe('Step 5: Return false', () => {
      const rule = new RegExp(sampleProblem.steps[4].validationRule[lang], 's');

      it('should pass valid return statement', () => {
        expect(rule.test('return False')).toBe(true);
      });

      it('should fail invalid return statement', () => {
        expect(rule.test('return True')).toBe(false);
        expect(rule.test('return None')).toBe(false);
      });
    });
  });

  describe('validation rules - JavaScript', () => {
    const lang = 'javascript';

    describe('Step 1: Initialize pointers', () => {
      const rule = new RegExp(sampleProblem.steps[0].validationRule[lang], 's');

      it('should pass valid pointer initialization', () => {
        expect(rule.test('let slow = head;\nlet fast = head;')).toBe(true);
        expect(rule.test('const slow = head; const fast = head;')).toBe(true);
      });

      it('should fail invalid pointer initialization', () => {
        expect(rule.test('let slow = head;')).toBe(false);
        expect(rule.test('let fast = null;')).toBe(false);
      });
    });

    describe('Step 2: While loop condition', () => {
      const rule = new RegExp(sampleProblem.steps[1].validationRule[lang], 's');

      it('should pass valid while loop', () => {
        expect(rule.test('while (fast && fast.next) {')).toBe(true);
      });

      it('should fail invalid while loop', () => {
        expect(rule.test('while (fast) {')).toBe(false);
        expect(rule.test('while (true) {')).toBe(false);
      });
    });

    describe('Step 3: Move pointers', () => {
      const rule = new RegExp(sampleProblem.steps[2].validationRule[lang], 's');

      it('should pass valid pointer movement', () => {
        expect(rule.test('slow = slow.next;\nfast = fast.next.next;')).toBe(
          true
        );
      });

      it('should fail invalid pointer movement', () => {
        expect(rule.test('slow = slow.next;')).toBe(false);
      });
    });

    describe('Step 4: Cycle detection check', () => {
      const rule = new RegExp(sampleProblem.steps[3].validationRule[lang], 's');

      it('should pass valid cycle check', () => {
        expect(rule.test('if (slow === fast) {')).toBe(true);
        expect(rule.test('if (slow == fast) {')).toBe(true);
      });

      it('should fail invalid cycle check', () => {
        expect(rule.test('if (slow !== fast) {')).toBe(false);
      });
    });

    describe('Step 5: Return false', () => {
      const rule = new RegExp(sampleProblem.steps[4].validationRule[lang], 's');

      it('should pass valid return statement', () => {
        expect(rule.test('return false;')).toBe(true);
      });

      it('should fail invalid return statement', () => {
        expect(rule.test('return true;')).toBe(false);
      });
    });
  });

  describe('validation rules - Java', () => {
    const lang = 'java';

    describe('Step 1: Initialize pointers', () => {
      const rule = new RegExp(sampleProblem.steps[0].validationRule[lang], 's');

      it('should pass valid pointer initialization', () => {
        expect(rule.test('ListNode slow = head;\nListNode fast = head;')).toBe(
          true
        );
        expect(rule.test('slow = head; fast = head;')).toBe(true);
      });

      it('should fail invalid pointer initialization', () => {
        expect(rule.test('ListNode slow = head;')).toBe(false);
      });
    });

    describe('Step 2: While loop condition', () => {
      const rule = new RegExp(sampleProblem.steps[1].validationRule[lang], 's');

      it('should pass valid while loop', () => {
        expect(rule.test('while (fast != null && fast.next != null) {')).toBe(
          true
        );
      });

      it('should fail invalid while loop', () => {
        expect(rule.test('while (fast != null) {')).toBe(false);
      });
    });

    describe('Step 3: Move pointers', () => {
      const rule = new RegExp(sampleProblem.steps[2].validationRule[lang], 's');

      it('should pass valid pointer movement', () => {
        expect(rule.test('slow = slow.next;\nfast = fast.next.next;')).toBe(
          true
        );
      });

      it('should fail invalid pointer movement', () => {
        expect(rule.test('slow = slow.next;')).toBe(false);
      });
    });

    describe('Step 4: Cycle detection check', () => {
      const rule = new RegExp(sampleProblem.steps[3].validationRule[lang], 's');

      it('should pass valid cycle check', () => {
        expect(rule.test('if (slow == fast) {')).toBe(true);
      });

      it('should fail invalid cycle check', () => {
        expect(rule.test('if (slow != fast) {')).toBe(false);
      });
    });

    describe('Step 5: Return false', () => {
      const rule = new RegExp(sampleProblem.steps[4].validationRule[lang], 's');

      it('should pass valid return statement', () => {
        expect(rule.test('return false;')).toBe(true);
      });

      it('should fail invalid return statement', () => {
        expect(rule.test('return true;')).toBe(false);
      });
    });
  });

  describe('pattern selection', () => {
    it('should have pattern selection configuration', () => {
      expect(sampleProblem.patternSelection).toBeDefined();
      expect(sampleProblem.patternSelection.correctAnswer).toBe('two-pointers');
    });

    it('should have multiple pattern options', () => {
      const { options } = sampleProblem.patternSelection;
      expect(options.length).toBeGreaterThan(3);
      options.forEach((option) => {
        expect(option).toHaveProperty('id');
        expect(option).toHaveProperty('label');
        expect(option).toHaveProperty('description');
      });
    });

    it('should have feedback for correct and incorrect answers', () => {
      const { feedback } = sampleProblem.patternSelection;
      expect(feedback.correct).toBeDefined();
      expect(feedback.incorrect).toBeDefined();
    });
  });

  describe('interview question', () => {
    it('should have interview question configuration', () => {
      expect(sampleProblem.interviewQuestion).toBeDefined();
      expect(sampleProblem.interviewQuestion.correctAnswer).toBe('two-pointers');
    });

    it('should have multiple approach options', () => {
      const { options } = sampleProblem.interviewQuestion;
      expect(options.length).toBeGreaterThan(3);
      options.forEach((option) => {
        expect(option).toHaveProperty('id');
        expect(option).toHaveProperty('label');
        expect(option).toHaveProperty('feedback');
      });
    });
  });

  describe('mistake analysis', () => {
    it('should have mistake analysis challenges', () => {
      expect(sampleProblem.mistakeAnalysis).toBeDefined();
      expect(sampleProblem.mistakeAnalysis.challenges.length).toBeGreaterThan(0);
    });

    it('should have properly structured challenges', () => {
      sampleProblem.mistakeAnalysis.challenges.forEach((challenge) => {
        expect(challenge).toHaveProperty('id');
        expect(challenge).toHaveProperty('type');
        expect(challenge).toHaveProperty('title');
        expect(challenge).toHaveProperty('code');
        expect(challenge).toHaveProperty('options');
        expect(challenge).toHaveProperty('correctAnswer');
      });
    });

    it('should have exactly one correct answer per challenge', () => {
      sampleProblem.mistakeAnalysis.challenges.forEach((challenge) => {
        const correctOptions = challenge.options.filter((opt) => opt.isCorrect);
        expect(correctOptions.length).toBe(1);
      });
    });
  });

  describe('concepts and patterns', () => {
    it('should have concepts array', () => {
      expect(sampleProblem.concepts).toBeDefined();
      expect(Array.isArray(sampleProblem.concepts)).toBe(true);
    });

    it('should have pattern explanations', () => {
      expect(sampleProblem.patternExplanations).toBeDefined();
      expect(sampleProblem.patternExplanations.length).toBeGreaterThan(0);
    });

    it('should have key takeaways', () => {
      expect(sampleProblem.keyTakeaways).toBeDefined();
      expect(sampleProblem.keyTakeaways.length).toBeGreaterThan(0);
    });
  });
});
