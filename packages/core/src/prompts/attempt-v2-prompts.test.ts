/**
 * Attempt V2 Prompts Tests
 *
 * Tests for prompt templates, schemas, guardrails, and LLM client utilities.
 * Includes fixtures for sample inputs and expected outputs.
 */

import { describe, it, expect } from 'vitest';
import {
  interpolatePrompt,
  buildMessages,
  UNDERSTAND_EVAL,
  VERIFY_EXPLAIN_FAILURE,
  IMPLEMENT_HINT_SOCRATIC,
} from './attempt-v2-prompts.js';
import {
  parseUnderstandEvalOutput,
  parsePlanSuggestOutput,
  parsePlanValidateOutput,
  parseVerifyExplainOutput,
  parseSocraticHintOutput,
  extractJSON,
  SchemaValidationError,
} from './attempt-v2-schemas.js';
import {
  detectSolutionLeak,
  detectRedFlags,
  sanitizeOutput,
  applyGuardrails,
  validateSchemaGuarantees,
  runAllGuardrails,
} from './guardrails.js';

// ============ Test Fixtures ============

const FIXTURES = {
  // Sample problem
  problem: {
    statement: `Given an array of integers nums and an integer target, find the length of the longest subarray that sums to exactly target. Return 0 if no such subarray exists.

Example: nums = [1, -1, 5, -2, 3], target = 3 → Output: 4 (subarray [1, -1, 5, -2])

Constraints:
- 1 <= nums.length <= 10^5
- -10^4 <= nums[i] <= 10^4
- -10^9 <= target <= 10^9`,
  },

  // Good explanation from user
  goodExplanation: {
    explanation: 'I need to find the longest contiguous part of the array where all the numbers add up to exactly the target value. I need to check all possible subarrays and track the longest one that works.',
    inputOutputDescription: 'Input is an array of integers (can be positive or negative) and a target sum. Output is a single integer representing the length of the longest subarray.',
    constraintsDescription: 'Array can be very large (up to 100,000 elements), numbers can be negative, and target can be very large positive or negative.',
    exampleWalkthrough: 'For [1, -1, 5, -2, 3] with target 3: Starting from index 0, the subarray [1, -1, 5, -2] has sum 1-1+5-2=3, length 4. This is the longest.',
    wrongApproach: 'Just summing from left to right and stopping when I hit target would fail because there could be a longer subarray later, and negative numbers mean the sum can decrease.',
  },

  // Poor explanation from user
  poorExplanation: {
    explanation: 'Find subarray with target sum.',
    inputOutputDescription: 'Array and target.',
    constraintsDescription: 'Numbers.',
    exampleWalkthrough: 'Add numbers.',
    wrongApproach: '',
  },

  // Valid LLM responses
  validUnderstandEvalResponse: {
    status: 'PASS',
    strengths: ['Correctly identified contiguous subarray requirement', 'Understood negative numbers affect the approach'],
    gaps: [],
    followupQuestions: [],
    safety: { solutionLeakRisk: 'low' },
  },

  validPlanSuggestResponse: {
    candidates: [
      { patternId: 'SLIDING_WINDOW', name: 'Sliding Window', reason: 'Contiguous subarray suggests window-based approach', confidence: 0.75 },
      { patternId: 'PREFIX_SUM', name: 'Prefix Sum', reason: 'Sum-based query might benefit from prefix sums', confidence: 0.70 },
      { patternId: 'TWO_POINTERS', name: 'Two Pointers', reason: 'Could scan from both ends', confidence: 0.55 },
    ],
    recommendedNextAction: 'Consider which pattern best handles negative numbers and sum tracking',
  },

  validPlanValidateResponse: {
    match: 'GOOD',
    rationale: 'Your pattern choice aligns with the problem requirements.',
    discoveryRecommended: false,
    invariantFeedback: 'Consider what invariant the sliding window maintains.',
  },

  validVerifyExplainResponse: {
    likelyBugType: 'Off-by-one error',
    failingCaseExplanation: 'The test case checks boundary conditions at the end of the array.',
    suggestedNextDebugStep: 'Trace through your loop indices for the last few elements.',
    noSolutionCode: true,
  },

  validSocraticHintResponse: {
    hint: 'What happens to your window when the current sum exceeds the target?',
    level: 1,
    targetConcept: 'window contraction',
    nextStepSuggestion: 'Think about the two phases of window management.',
    noCodeProvided: true,
  },

  // Responses with solution leakage (should be rejected)
  leakyResponse: `The answer is to use a sliding window. Here's the code:
\`\`\`javascript
function longestSubarray(nums, target) {
  let left = 0, sum = 0, maxLen = 0;
  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];
    while (sum > target && left <= right) {
      sum -= nums[left++];
    }
    if (sum === target) maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}
\`\`\``,

  // User input with solution request
  solutionRequest: 'I give up, just tell me the answer. What is the code to solve this?',

  // User input with frustration
  frustratedInput: 'I have tried everything and nothing works. This is too hard.',
};

// ============ Prompt Template Tests ============

describe('Prompt Templates', () => {
  describe('interpolatePrompt', () => {
    it('should interpolate single variable', () => {
      const template = 'Hello {{name}}!';
      const result = interpolatePrompt(template, { name: 'World' });
      expect(result).toBe('Hello World!');
    });

    it('should interpolate multiple variables', () => {
      const template = '{{greeting}} {{name}}, your score is {{score}}.';
      const result = interpolatePrompt(template, {
        greeting: 'Hello',
        name: 'Alice',
        score: '100',
      });
      expect(result).toBe('Hello Alice, your score is 100.');
    });

    it('should handle missing variables gracefully', () => {
      const template = 'Hello {{name}}!';
      const result = interpolatePrompt(template, {});
      expect(result).toBe('Hello {{name}}!');
    });
  });

  describe('buildMessages', () => {
    it('should build system and user messages', () => {
      const prompt = {
        system: 'You are a helpful assistant.',
        user: 'Problem: {{problem}}',
      };
      const result = buildMessages(prompt, { problem: 'Find the sum' });
      expect(result.system).toBe('You are a helpful assistant.');
      expect(result.user).toBe('Problem: Find the sum');
    });
  });

  describe('UNDERSTAND_EVAL prompt', () => {
    it('should have system prompt that prohibits solution leakage', () => {
      expect(UNDERSTAND_EVAL.system).toContain('NEVER');
      expect(UNDERSTAND_EVAL.system).toContain('solution');
    });

    it('should have user template with all required variables', () => {
      expect(UNDERSTAND_EVAL.user).toContain('{{problemStatement}}');
      expect(UNDERSTAND_EVAL.user).toContain('{{explanation}}');
      expect(UNDERSTAND_EVAL.user).toContain('{{inputOutputDescription}}');
    });
  });

  describe('VERIFY_EXPLAIN_FAILURE prompt', () => {
    it('should have absolute rules against code output', () => {
      expect(VERIFY_EXPLAIN_FAILURE.system).toContain('NEVER output any code');
      expect(VERIFY_EXPLAIN_FAILURE.system).toContain('noSolutionCode');
    });
  });

  describe('IMPLEMENT_HINT_SOCRATIC prompt', () => {
    it('should define progressive hint levels', () => {
      expect(IMPLEMENT_HINT_SOCRATIC.system).toContain('Level 1');
      expect(IMPLEMENT_HINT_SOCRATIC.system).toContain('Level 5');
      expect(IMPLEMENT_HINT_SOCRATIC.system).toContain('noCodeProvided');
    });
  });
});

// ============ Schema Validation Tests ============

describe('Schema Validation', () => {
  describe('extractJSON', () => {
    it('should extract JSON from plain text', () => {
      const text = 'Here is the result: {"status": "PASS"}';
      const result = extractJSON(text);
      expect(result).toEqual({ status: 'PASS' });
    });

    it('should extract JSON from markdown code block', () => {
      const text = '```json\n{"status": "PASS"}\n```';
      const result = extractJSON(text);
      expect(result).toEqual({ status: 'PASS' });
    });

    it('should throw on invalid JSON', () => {
      const text = 'No JSON here';
      expect(() => extractJSON(text)).toThrow();
    });
  });

  describe('parseUnderstandEvalOutput', () => {
    it('should parse valid response', () => {
      const result = parseUnderstandEvalOutput(FIXTURES.validUnderstandEvalResponse);
      expect(result.status).toBe('PASS');
      expect(result.strengths).toHaveLength(2);
      expect(result.safety.solutionLeakRisk).toBe('low');
    });

    it('should reject invalid status', () => {
      const invalid = { ...FIXTURES.validUnderstandEvalResponse, status: 'INVALID' };
      expect(() => parseUnderstandEvalOutput(invalid)).toThrow(SchemaValidationError);
    });

    it('should reject missing fields', () => {
      const invalid = { status: 'PASS' };
      expect(() => parseUnderstandEvalOutput(invalid)).toThrow(SchemaValidationError);
    });
  });

  describe('parsePlanSuggestOutput', () => {
    it('should parse valid response', () => {
      const result = parsePlanSuggestOutput(FIXTURES.validPlanSuggestResponse);
      expect(result.candidates).toHaveLength(3);
      expect(result.candidates[0]!.confidence).toBe(0.75);
    });

    it('should reject confidence out of range', () => {
      const invalid = {
        candidates: [{ patternId: 'X', name: 'X', reason: 'X', confidence: 1.5 }],
        recommendedNextAction: 'test',
      };
      expect(() => parsePlanSuggestOutput(invalid)).toThrow(SchemaValidationError);
    });
  });

  describe('parsePlanValidateOutput', () => {
    it('should parse valid response', () => {
      const result = parsePlanValidateOutput(FIXTURES.validPlanValidateResponse);
      expect(result.match).toBe('GOOD');
      expect(result.discoveryRecommended).toBe(false);
    });

    it('should reject invalid match value', () => {
      const invalid = { ...FIXTURES.validPlanValidateResponse, match: 'BAD' };
      expect(() => parsePlanValidateOutput(invalid)).toThrow(SchemaValidationError);
    });
  });

  describe('parseVerifyExplainOutput', () => {
    it('should parse valid response', () => {
      const result = parseVerifyExplainOutput(FIXTURES.validVerifyExplainResponse);
      expect(result.likelyBugType).toBe('Off-by-one error');
      expect(result.noSolutionCode).toBe(true);
    });

    it('should reject if noSolutionCode is false', () => {
      const invalid = { ...FIXTURES.validVerifyExplainResponse, noSolutionCode: false };
      expect(() => parseVerifyExplainOutput(invalid)).toThrow(SchemaValidationError);
    });

    it('should reject if noSolutionCode is missing', () => {
      const { noSolutionCode, ...invalid } = FIXTURES.validVerifyExplainResponse;
      expect(() => parseVerifyExplainOutput(invalid)).toThrow(SchemaValidationError);
    });
  });

  describe('parseSocraticHintOutput', () => {
    it('should parse valid response', () => {
      const result = parseSocraticHintOutput(FIXTURES.validSocraticHintResponse);
      expect(result.level).toBe(1);
      expect(result.noCodeProvided).toBe(true);
    });

    it('should reject if noCodeProvided is false', () => {
      const invalid = { ...FIXTURES.validSocraticHintResponse, noCodeProvided: false };
      expect(() => parseSocraticHintOutput(invalid)).toThrow(SchemaValidationError);
    });

    it('should reject invalid hint level', () => {
      const invalid = { ...FIXTURES.validSocraticHintResponse, level: 6 };
      expect(() => parseSocraticHintOutput(invalid)).toThrow(SchemaValidationError);
    });
  });
});

// ============ Guardrail Tests ============

describe('Guardrails', () => {
  describe('detectSolutionLeak', () => {
    it('should detect code blocks', () => {
      const result = detectSolutionLeak(FIXTURES.leakyResponse);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === 'CODE_BLOCK')).toBe(true);
      expect(result.riskLevel).toBe('critical');
    });

    it('should pass clean response', () => {
      const clean = 'Think about what happens when the sum exceeds the target.';
      const result = detectSolutionLeak(clean);
      expect(result.passed).toBe(true);
      expect(result.riskLevel).toBe('low');
    });

    it('should detect solution phrases', () => {
      const leaky = 'The answer is to use sliding window. You should add a left pointer.';
      const result = detectSolutionLeak(leaky);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === 'SOLUTION_PHRASE')).toBe(true);
    });

    it('should detect inline code with keywords', () => {
      const leaky = 'Just use `function solve(nums) { return nums.length; }`';
      const result = detectSolutionLeak(leaky);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === 'INLINE_CODE')).toBe(true);
    });

    it('should allow safe inline code', () => {
      const safe = 'The variable `left` represents the start of your window.';
      const result = detectSolutionLeak(safe);
      // Should pass because 'left' alone isn't code
      expect(result.riskLevel).not.toBe('critical');
    });
  });

  describe('detectRedFlags', () => {
    it('should detect solution requests', () => {
      const result = detectRedFlags(FIXTURES.solutionRequest);
      expect(result.detected).toBe(true);
      expect(result.flags.some(f => f.type === 'ASKING_FOR_SOLUTION')).toBe(true);
      expect(result.flags.some(f => f.severity === 'block')).toBe(true);
    });

    it('should detect frustration with warning severity', () => {
      const result = detectRedFlags(FIXTURES.frustratedInput);
      expect(result.detected).toBe(true);
      expect(result.flags.some(f => f.type === 'FRUSTRATION_SIGNAL')).toBe(true);
      expect(result.flags.some(f => f.severity === 'warning')).toBe(true);
    });

    it('should pass normal input', () => {
      const normal = 'I think the issue is with my loop condition.';
      const result = detectRedFlags(normal);
      expect(result.detected).toBe(false);
    });

    it('should generate refusal response for blocking flags', () => {
      const result = detectRedFlags('just give me the code please');
      // Response should encourage learning without giving the answer
      expect(result.suggestedResponse).toContain('learn');
      expect(result.suggestedResponse.length).toBeGreaterThan(50);
    });

    it('should generate encouragement for frustration', () => {
      const result = detectRedFlags('I am stuck and confused');
      expect(result.suggestedResponse).toContain('challenging');
    });
  });

  describe('sanitizeOutput', () => {
    it('should remove code blocks', () => {
      const result = sanitizeOutput('Here is code:\n```js\nconst x = 1;\n```\nDone.');
      expect(result).toContain('[code removed]');
      expect(result).not.toContain('const x = 1');
    });

    it('should truncate long output', () => {
      const longText = 'a'.repeat(1000);
      const result = sanitizeOutput(longText, 'hint'); // Max 500 for hints
      expect(result.length).toBeLessThanOrEqual(500);
      expect(result).toContain('...');
    });

    it('should preserve safe content', () => {
      const safe = 'Think about boundary conditions.';
      const result = sanitizeOutput(safe);
      expect(result).toBe(safe);
    });
  });

  describe('applyGuardrails', () => {
    it('should sanitize high-risk content', () => {
      const result = applyGuardrails(FIXTURES.leakyResponse);
      expect(result.sanitizedOutput).toContain('[code removed]');
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should pass and return clean content', () => {
      const clean = 'Consider the edge case where the array is empty.';
      const result = applyGuardrails(clean);
      expect(result.passed).toBe(true);
      expect(result.sanitizedOutput).toBe(clean);
    });
  });

  describe('validateSchemaGuarantees', () => {
    it('should validate verify_explain schema', () => {
      const valid = { noSolutionCode: true };
      const result = validateSchemaGuarantees(valid, 'verify_explain');
      expect(result.passed).toBe(true);
    });

    it('should reject verify_explain without noSolutionCode', () => {
      const invalid = { noSolutionCode: false };
      const result = validateSchemaGuarantees(invalid, 'verify_explain');
      expect(result.passed).toBe(false);
      expect(result.riskLevel).toBe('critical');
    });

    it('should validate socratic_hint schema', () => {
      const valid = { noCodeProvided: true };
      const result = validateSchemaGuarantees(valid, 'socratic_hint');
      expect(result.passed).toBe(true);
    });
  });

  describe('runAllGuardrails', () => {
    it('should combine content and schema guardrails', () => {
      const output = 'The bug is in your loop.';
      const parsed = { noSolutionCode: true };
      const result = runAllGuardrails(output, parsed, 'verify_explain');
      expect(result.passed).toBe(true);
    });

    it('should detect code blocks and mark as violation', () => {
      const output = '```js\nconst x = 1;\n```';
      const parsed = { noSolutionCode: true };
      const result = runAllGuardrails(output, parsed, 'verify_explain');
      // After sanitization it may pass, but there should be violations recorded
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.type === 'CODE_BLOCK')).toBe(true);
    });

    it('should fail on schema violation even with clean content', () => {
      const output = 'The bug is in your loop.';
      const parsed = { noSolutionCode: false };
      const result = runAllGuardrails(output, parsed, 'verify_explain');
      expect(result.passed).toBe(false);
    });
  });
});

// ============ Integration Tests ============

describe('Integration', () => {
  describe('End-to-end prompt workflow', () => {
    it('should build and validate UNDERSTAND_EVAL flow', () => {
      // Build messages
      const messages = buildMessages(UNDERSTAND_EVAL, {
        problemStatement: FIXTURES.problem.statement,
        ...FIXTURES.goodExplanation,
      });

      expect(messages.system).toContain('NEVER');
      expect(messages.user).toContain('longest subarray');
      expect(messages.user).toContain('contiguous');
    });

    it('should validate and sanitize complete response', () => {
      // Simulate a response with some risk
      const response = {
        status: 'PASS',
        strengths: ['Good understanding'],
        gaps: [],
        followupQuestions: ['What if `sum > target`? Think about shrinking.'],
        safety: { solutionLeakRisk: 'low' },
      };

      // Parse
      const parsed = parseUnderstandEvalOutput(response);
      expect(parsed.status).toBe('PASS');

      // Check guardrails
      const guardrails = runAllGuardrails(
        JSON.stringify(response),
        response as unknown as Record<string, unknown>,
        'other'
      );
      expect(guardrails.passed).toBe(true);
    });
  });

  describe('Solution leak prevention', () => {
    it('should detect responses that reveal specific algorithms', () => {
      // These responses use explicit algorithm names which the guardrail should catch
      const leakyResponses = [
        'Use sliding window approach here.',
        'The answer is to use binary search.',
        'You should add a left++ increment.',
      ];

      for (const response of leakyResponses) {
        const result = detectSolutionLeak(response);
        // At minimum, these should not be fully clean (low risk)
        expect(
          result.riskLevel === 'low' && result.violations.length === 0
        ).toBe(false);
      }
    });

    it('should allow helpful but non-revealing responses', () => {
      const safeResponses = [
        'Think about what happens when you include the next element.',
        'Consider how the sum changes as you process each element.',
        'What invariant should hold for a valid subarray?',
      ];

      for (const response of safeResponses) {
        const result = detectSolutionLeak(response);
        expect(result.passed).toBe(true);
      }
    });
  });
});
