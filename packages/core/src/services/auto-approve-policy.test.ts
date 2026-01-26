import { describe, it, expect } from 'vitest';
import {
  autoApproveCandidate,
  getAutoApprovePolicyRequirements,
} from './auto-approve-policy.js';
import type { ProblemSpecV1 } from '@scaffold/contracts';
import type { CandidateValidation } from '../ports/generator-repo.js';

function createValidSpec(overrides: Partial<ProblemSpecV1> = {}): ProblemSpecV1 {
  return {
    title: 'Find Maximum Subarray Sum',
    summary: 'Find the maximum sum of a contiguous subarray',
    patternIds: ['SLIDING_WINDOW'],
    categories: ['arrays', 'dynamic-programming'],
    level: 2,
    difficulty: 'MEDIUM',
    statement: {
      prompt: 'Given an array of integers, find the maximum sum of a contiguous subarray.',
      constraints: [
        '1 <= array.length <= 10^5',
        '-10^4 <= array[i] <= 10^4',
      ],
      examples: [
        { input: '[1, -2, 3, 4, -1]', output: '7', explanation: 'Subarray [3, 4] has max sum' },
        { input: '[-1, -2, -3]', output: '-1', explanation: 'Single element -1' },
      ],
    },
    io: {
      format: 'array_integer',
      signature: 'maxSubarraySum(nums: number[]): number',
    },
    tests: {
      public: [
        { input: '[1, -2, 3, 4, -1]', expected: '7' },
        { input: '[-1, -2, -3]', expected: '-1' },
        { input: '[1, 2, 3]', expected: '6' },
        { input: '[-1]', expected: '-1' },
        { input: '[5, -1, 5]', expected: '9' },
      ],
      hidden: [
        { input: '[0, 0, 0]', expected: '0' },
        { input: '[100, -1, 100]', expected: '199' },
        { input: '[-5, 10, -3, 8]', expected: '15' },
      ],
    },
    hints: [
      { level: 'pattern', content: 'Consider using a sliding window or dynamic programming approach' },
      { level: 'approach', content: 'Think about tracking the current sum and maximum sum' },
      { level: 'implementation', content: 'Use Kadanes algorithm: max(current + nums[i], nums[i])' },
    ],
    reference: {
      solutionOutline: 'Use Kadanes algorithm to track current sum and max sum in O(n) time.',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
    },
    coach: {
      commonMistakes: ['Forgetting to reset current sum when it goes negative'],
      evidenceMapping: [],
    },
    ...overrides,
  };
}

function createValidValidation(overrides: Partial<CandidateValidation> = {}): CandidateValidation {
  return {
    isValid: true,
    errors: [],
    warnings: [],
    dedupeScore: 0.3,
    ...overrides,
  };
}

describe('autoApproveCandidate', () => {
  it('approves a valid candidate with all quality gates passing', () => {
    const spec = createValidSpec();
    const validation = createValidValidation();

    const result = autoApproveCandidate(spec, validation);

    expect(result.approved).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('rejects candidate with failed schema validation', () => {
    const spec = createValidSpec();
    const validation = createValidValidation({ isValid: false });

    const result = autoApproveCandidate(spec, validation);

    expect(result.approved).toBe(false);
    expect(result.reasons).toContain('Schema validation failed');
  });

  it('rejects candidate with validation errors', () => {
    const spec = createValidSpec();
    const validation = createValidValidation({
      errors: ['Missing required field'],
    });

    const result = autoApproveCandidate(spec, validation);

    expect(result.approved).toBe(false);
    expect(result.reasons[0]).toContain('validation error');
  });

  it('rejects candidate with insufficient examples', () => {
    const spec = createValidSpec({
      statement: {
        prompt: 'Test prompt',
        constraints: ['c1', 'c2'],
        examples: [{ input: 'a', output: 'b' }], // Only 1 example
      },
    });
    const validation = createValidValidation();

    const result = autoApproveCandidate(spec, validation);

    expect(result.approved).toBe(false);
    expect(result.reasons.some(r => r.includes('example'))).toBe(true);
  });

  it('rejects candidate with insufficient tests', () => {
    const spec = createValidSpec({
      tests: {
        public: [{ input: 'a', expected: 'b' }],
        hidden: [{ input: 'c', expected: 'd' }],
      },
    });
    const validation = createValidValidation();

    const result = autoApproveCandidate(spec, validation);

    expect(result.approved).toBe(false);
    expect(result.reasons.some(r => r.includes('test'))).toBe(true);
  });

  it('rejects candidate with insufficient hidden tests', () => {
    const spec = createValidSpec({
      tests: {
        public: [
          { input: '1', expected: '1' },
          { input: '2', expected: '2' },
          { input: '3', expected: '3' },
          { input: '4', expected: '4' },
          { input: '5', expected: '5' },
          { input: '6', expected: '6' },
        ],
        hidden: [
          { input: '7', expected: '7' },
          { input: '8', expected: '8' },
        ], // Only 2 hidden tests
      },
    });
    const validation = createValidValidation();

    const result = autoApproveCandidate(spec, validation);

    expect(result.approved).toBe(false);
    expect(result.reasons.some(r => r.includes('hidden test'))).toBe(true);
  });

  it('rejects candidate with insufficient constraints', () => {
    const spec = createValidSpec({
      statement: {
        prompt: 'Test prompt',
        constraints: ['c1'], // Only 1 constraint
        examples: [
          { input: 'a', output: 'b' },
          { input: 'c', output: 'd' },
        ],
      },
    });
    const validation = createValidValidation();

    const result = autoApproveCandidate(spec, validation);

    expect(result.approved).toBe(false);
    expect(result.reasons.some(r => r.includes('constraint'))).toBe(true);
  });

  it('rejects candidate with insufficient hints', () => {
    const spec = createValidSpec({
      hints: [
        { level: 'pattern', content: 'hint 1' },
        { level: 'approach', content: 'hint 2' },
      ], // Only 2 hints
    });
    const validation = createValidValidation();

    const result = autoApproveCandidate(spec, validation);

    expect(result.approved).toBe(false);
    expect(result.reasons.some(r => r.includes('hint'))).toBe(true);
  });

  it('rejects candidate with title too short', () => {
    const spec = createValidSpec({ title: 'Hi' }); // Too short
    const validation = createValidValidation();

    const result = autoApproveCandidate(spec, validation);

    expect(result.approved).toBe(false);
    expect(result.reasons.some(r => r.includes('Title too short'))).toBe(true);
  });

  it('rejects candidate with title too long', () => {
    const spec = createValidSpec({
      title: 'A'.repeat(100), // Too long
    });
    const validation = createValidValidation();

    const result = autoApproveCandidate(spec, validation);

    expect(result.approved).toBe(false);
    expect(result.reasons.some(r => r.includes('Title too long'))).toBe(true);
  });

  it('rejects candidate with banned terms', () => {
    const spec = createValidSpec({
      title: 'LeetCode Two Sum Problem',
    });
    const validation = createValidValidation();

    const result = autoApproveCandidate(spec, validation);

    expect(result.approved).toBe(false);
    expect(result.reasons.some(r => r.includes('banned term'))).toBe(true);
  });

  it('rejects candidate with high dedupe score', () => {
    const spec = createValidSpec();
    const validation = createValidValidation({ dedupeScore: 0.85 });

    const result = autoApproveCandidate(spec, validation);

    expect(result.approved).toBe(false);
    expect(result.reasons.some(r => r.includes('Dedupe score too high'))).toBe(true);
  });

  it('rejects candidate with missing solution outline', () => {
    const spec = createValidSpec({
      reference: {
        solutionOutline: '', // Empty
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
      },
    });
    const validation = createValidValidation();

    const result = autoApproveCandidate(spec, validation);

    expect(result.approved).toBe(false);
    expect(result.reasons.some(r => r.includes('solution outline'))).toBe(true);
  });

  it('rejects candidate with missing complexity analysis', () => {
    const spec = createValidSpec({
      reference: {
        solutionOutline: 'A detailed solution outline with enough content.',
        timeComplexity: '',
        spaceComplexity: 'O(1)',
      },
    });
    const validation = createValidValidation();

    const result = autoApproveCandidate(spec, validation);

    expect(result.approved).toBe(false);
    expect(result.reasons.some(r => r.includes('complexity'))).toBe(true);
  });

  it('accepts custom dedupe threshold', () => {
    const spec = createValidSpec();
    const validation = createValidValidation({ dedupeScore: 0.75 });

    const resultDefault = autoApproveCandidate(spec, validation);
    const resultCustom = autoApproveCandidate(spec, validation, { maxDedupeScore: 0.8 });

    expect(resultDefault.approved).toBe(false);
    expect(resultCustom.approved).toBe(true);
  });

  it('collects multiple rejection reasons', () => {
    const spec = createValidSpec({
      title: 'Hi', // Too short
      hints: [{ level: 'pattern', content: 'h1' }], // Only 1 hint
    });
    const validation = createValidValidation();

    const result = autoApproveCandidate(spec, validation);

    expect(result.approved).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(1);
  });
});

describe('getAutoApprovePolicyRequirements', () => {
  it('returns list of requirements', () => {
    const requirements = getAutoApprovePolicyRequirements();

    expect(Array.isArray(requirements)).toBe(true);
    expect(requirements.length).toBeGreaterThan(5);
    expect(requirements.some(r => r.includes('examples'))).toBe(true);
    expect(requirements.some(r => r.includes('tests'))).toBe(true);
    expect(requirements.some(r => r.includes('hints'))).toBe(true);
  });
});
