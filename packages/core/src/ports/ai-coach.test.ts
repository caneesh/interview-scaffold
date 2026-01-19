/**
 * Tests for AI Coach Port
 */

import { describe, it, expect } from 'vitest';
import {
  createNullAICoach,
  validateAIResponse,
  getSystemPrompt,
  buildUserPrompt,
} from './ai-coach.js';
import type { AICoachResponse, AICoachRequest, DiagnosticEvidence } from '../entities/diagnostic-coach.js';

describe('AI Coach Port', () => {
  describe('createNullAICoach', () => {
    it('should return isEnabled as false', () => {
      const coach = createNullAICoach();
      expect(coach.isEnabled()).toBe(false);
    });

    it('should return null from getGuidance', async () => {
      const coach = createNullAICoach();
      const result = await coach.getGuidance({
        stage: 'TRIAGE',
        problemContext: {
          problemId: 'p1',
          problemTitle: 'Test',
          problemStatement: 'Find the bug',
          visibleTestCases: [],
        },
        evidence: {},
      });
      expect(result).toBeNull();
    });

    it('should validate any response as valid', () => {
      const coach = createNullAICoach();
      const result = coach.validateResponse({
        guidance: 'Any guidance',
        guidanceType: 'socratic_question',
        confidence: 0.8,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('validateAIResponse', () => {
    it('should accept valid Socratic guidance', () => {
      const response: AICoachResponse = {
        guidance: 'What type of error are you seeing? Have you checked the inputs?',
        guidanceType: 'socratic_question',
        questions: ['What happens with edge cases?'],
        confidence: 0.8,
      };
      expect(validateAIResponse(response)).toEqual({ valid: true });
    });

    it('should reject code blocks', () => {
      const response: AICoachResponse = {
        guidance: 'Here is the fix:\n```javascript\nreturn x + 1;\n```',
        guidanceType: 'next_step',
        confidence: 0.9,
      };
      const result = validateAIResponse(response);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('code block');
    });

    it('should reject inline code with programming keywords', () => {
      const response: AICoachResponse = {
        guidance: 'You should use `const x = 5` here.',
        guidanceType: 'next_step',
        confidence: 0.9,
      };
      const result = validateAIResponse(response);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('inline backticks');
    });

    it('should allow inline code without keywords', () => {
      const response: AICoachResponse = {
        guidance: 'Check the `value` variable.',
        guidanceType: 'socratic_question',
        confidence: 0.8,
      };
      expect(validateAIResponse(response)).toEqual({ valid: true });
    });

    it('should reject line number references', () => {
      const response: AICoachResponse = {
        guidance: 'The bug is on line 42.',
        guidanceType: 'pattern_hint',
        confidence: 0.9,
      };
      const result = validateAIResponse(response);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('line numbers');
    });

    it('should reject "Line 15" format', () => {
      const response: AICoachResponse = {
        guidance: 'Look at Line 15 for the issue.',
        guidanceType: 'pattern_hint',
        confidence: 0.9,
      };
      const result = validateAIResponse(response);
      expect(result.valid).toBe(false);
    });

    it('should reject direct fix instructions - change to', () => {
      const response: AICoachResponse = {
        guidance: 'Change the condition to x > 0.',
        guidanceType: 'next_step',
        confidence: 0.9,
      };
      const result = validateAIResponse(response);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('direct fix');
    });

    it('should reject direct fix instructions - replace with', () => {
      const response: AICoachResponse = {
        guidance: 'Replace Math.floor with Math.ceil.',
        guidanceType: 'next_step',
        confidence: 0.9,
      };
      const result = validateAIResponse(response);
      expect(result.valid).toBe(false);
    });

    it('should reject direct fix instructions - the fix is', () => {
      const response: AICoachResponse = {
        guidance: 'The fix is simple - add a null check.',
        guidanceType: 'next_step',
        confidence: 0.9,
      };
      const result = validateAIResponse(response);
      expect(result.valid).toBe(false);
    });

    it('should reject direct fix instructions - just add', () => {
      const response: AICoachResponse = {
        guidance: 'Just add a return statement.',
        guidanceType: 'next_step',
        confidence: 0.9,
      };
      const result = validateAIResponse(response);
      expect(result.valid).toBe(false);
    });

    it('should reject direct fix instructions - set to', () => {
      const response: AICoachResponse = {
        guidance: 'Set maxRetries to 5 instead.',
        guidanceType: 'next_step',
        confidence: 0.9,
      };
      const result = validateAIResponse(response);
      expect(result.valid).toBe(false);
    });
  });

  describe('getSystemPrompt', () => {
    it('should return prompts with base rules for all stages', () => {
      const stages = ['TRIAGE', 'REPRODUCE', 'LOCALIZE', 'HYPOTHESIZE', 'FIX', 'VERIFY', 'POSTMORTEM'] as const;

      for (const stage of stages) {
        const prompt = getSystemPrompt(stage);
        expect(prompt).toContain('NEVER include code blocks');
        expect(prompt).toContain('NEVER reference specific line numbers');
        expect(prompt).toContain('NEVER give direct fixes');
        expect(prompt).toContain('Socratic');
      }
    });

    it('TRIAGE prompt should focus on classification', () => {
      const prompt = getSystemPrompt('TRIAGE');
      expect(prompt).toContain('TRIAGE');
      expect(prompt).toContain('Category');
      expect(prompt).toContain('Severity');
      expect(prompt).toContain('Priority');
    });

    it('REPRODUCE prompt should focus on reproduction', () => {
      const prompt = getSystemPrompt('REPRODUCE');
      expect(prompt).toContain('REPRODUCE');
      expect(prompt).toContain('deterministic');
      expect(prompt).toContain('minimal reproduction');
    });

    it('LOCALIZE prompt should focus on narrowing down', () => {
      const prompt = getSystemPrompt('LOCALIZE');
      expect(prompt).toContain('LOCALIZE');
      expect(prompt).toContain('binary search');
      expect(prompt).toContain('execution path');
    });

    it('HYPOTHESIZE prompt should focus on forming hypotheses', () => {
      const prompt = getSystemPrompt('HYPOTHESIZE');
      expect(prompt).toContain('HYPOTHESIZE');
      expect(prompt).toContain('testable hypotheses');
    });

    it('FIX prompt should focus on implementation', () => {
      const prompt = getSystemPrompt('FIX');
      expect(prompt).toContain('FIX');
      expect(prompt).toContain('root cause');
      expect(prompt).toContain('NOT suggest what to fix');
    });

    it('VERIFY prompt should focus on verification', () => {
      const prompt = getSystemPrompt('VERIFY');
      expect(prompt).toContain('VERIFY');
      expect(prompt).toContain('edge cases');
      expect(prompt).toContain('regressions');
    });

    it('POSTMORTEM prompt should focus on reflection', () => {
      const prompt = getSystemPrompt('POSTMORTEM');
      expect(prompt).toContain('POSTMORTEM');
      expect(prompt).toContain('root cause');
      expect(prompt).toContain('knowledge card');
    });
  });

  describe('buildUserPrompt', () => {
    const baseRequest: AICoachRequest = {
      stage: 'TRIAGE',
      problemContext: {
        problemId: 'p1',
        problemTitle: 'Binary Search Bug',
        problemStatement: 'Find and fix the bug in binary search',
        visibleTestCases: ['test([1,2,3], 2) === 1', 'test([1,2,3], 4) === -1'],
      },
      evidence: {},
    };

    it('should include problem context', () => {
      const prompt = buildUserPrompt(baseRequest);
      expect(prompt).toContain('Binary Search Bug');
      expect(prompt).toContain('Find and fix the bug');
      expect(prompt).toContain('test([1,2,3], 2) === 1');
    });

    it('should include defect category if provided', () => {
      const request: AICoachRequest = {
        ...baseRequest,
        problemContext: {
          ...baseRequest.problemContext,
          defectCategory: 'functional',
        },
      };
      const prompt = buildUserPrompt(request);
      expect(prompt).toContain('functional');
    });

    it('should include signals if provided', () => {
      const request: AICoachRequest = {
        ...baseRequest,
        problemContext: {
          ...baseRequest.problemContext,
          signals: ['failing_tests', 'wrong_output'],
        },
      };
      const prompt = buildUserPrompt(request);
      expect(prompt).toContain('failing_tests');
      expect(prompt).toContain('wrong_output');
    });

    it('should include triage evidence', () => {
      const request: AICoachRequest = {
        ...baseRequest,
        evidence: {
          triage: {
            defectCategory: 'functional',
            severity: 'high',
            priority: 'urgent',
            observations: 'Off by one error',
            timestamp: new Date(),
          },
        },
      };
      const prompt = buildUserPrompt(request);
      expect(prompt).toContain('Triage Evidence');
      expect(prompt).toContain('Category: functional');
      expect(prompt).toContain('Off by one error');
    });

    it('should include reproduction evidence', () => {
      const request: AICoachRequest = {
        ...baseRequest,
        stage: 'REPRODUCE',
        evidence: {
          reproduction: {
            steps: ['Run test', 'Observe failure'],
            isDeterministic: true,
            reproCommand: 'npm test',
            timestamp: new Date(),
          },
        },
      };
      const prompt = buildUserPrompt(request);
      expect(prompt).toContain('Reproduction Evidence');
      expect(prompt).toContain('Run test');
      expect(prompt).toContain('npm test');
    });

    it('should include localization evidence', () => {
      const request: AICoachRequest = {
        ...baseRequest,
        stage: 'LOCALIZE',
        evidence: {
          localization: {
            suspectedFiles: ['src/search.ts'],
            suspectedFunctions: ['binarySearch'],
            stackTrace: 'Error at line 10',
            timestamp: new Date(),
          },
        },
      };
      const prompt = buildUserPrompt(request);
      expect(prompt).toContain('Localization Evidence');
      expect(prompt).toContain('src/search.ts');
      expect(prompt).toContain('binarySearch');
      expect(prompt).toContain('Has stack trace: yes');
    });

    it('should include hypotheses', () => {
      const request: AICoachRequest = {
        ...baseRequest,
        stage: 'HYPOTHESIZE',
        evidence: {
          hypotheses: [
            { id: '1', hypothesis: 'Off-by-one', testMethod: 'Log values', status: 'untested', timestamp: new Date() },
            { id: '2', hypothesis: 'Wrong comparator', testMethod: 'Unit test', status: 'rejected', timestamp: new Date() },
          ],
        },
      };
      const prompt = buildUserPrompt(request);
      expect(prompt).toContain('Hypotheses');
      expect(prompt).toContain('[untested] Off-by-one');
      expect(prompt).toContain('[rejected] Wrong comparator');
    });

    it('should include fix attempts', () => {
      const request: AICoachRequest = {
        ...baseRequest,
        stage: 'FIX',
        evidence: {
          fixAttempts: [
            { id: '1', hypothesisId: '1', approach: 'Fix bounds', filesModified: ['a.ts'], testsPassed: false, timestamp: new Date() },
          ],
        },
      };
      const prompt = buildUserPrompt(request);
      expect(prompt).toContain('Fix Attempts');
      expect(prompt).toContain('Fix bounds: FAILED');
    });

    it('should include user message', () => {
      const request: AICoachRequest = {
        ...baseRequest,
        userMessage: 'I think the bug is in the comparison',
      };
      const prompt = buildUserPrompt(request);
      expect(prompt).toContain("Developer's Question/Message");
      expect(prompt).toContain('I think the bug is in the comparison');
    });
  });
});
