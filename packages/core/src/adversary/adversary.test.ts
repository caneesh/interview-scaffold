import { describe, it, expect } from 'vitest';
import {
  selectAdversaryPrompt,
  getAvailablePrompts,
  DEFAULT_ADVERSARY_PROMPTS,
  PATTERN_ADVERSARY_PROMPTS,
} from './index.js';
import type { AdversaryPrompt } from '../entities/step.js';

describe('Adversary Challenge', () => {
  describe('selectAdversaryPrompt', () => {
    it('should select from problem-specific prompts when available', () => {
      const customPrompts: AdversaryPrompt[] = [
        {
          id: 'custom_1',
          type: 'MEMORY_O1',
          prompt: 'Custom memory constraint prompt',
        },
      ];

      const result = selectAdversaryPrompt('SLIDING_WINDOW', customPrompts);
      expect(result).not.toBeNull();
      expect(result?.id).toBe('custom_1');
      expect(result?.prompt).toBe('Custom memory constraint prompt');
    });

    it('should fall back to pattern-specific prompts when no custom prompts', () => {
      const result = selectAdversaryPrompt('SLIDING_WINDOW');
      expect(result).not.toBeNull();
      // SLIDING_WINDOW should have prompts like INFINITE_STREAM, MEMORY_O1, NEGATIVE_NUMBERS
      expect(['INFINITE_STREAM', 'MEMORY_O1', 'NEGATIVE_NUMBERS']).toContain(result?.type);
    });

    it('should exclude specified types', () => {
      // Keep trying until we confirm exclusion works
      for (let i = 0; i < 20; i++) {
        const result = selectAdversaryPrompt('SLIDING_WINDOW', undefined, ['INFINITE_STREAM']);
        if (result) {
          expect(result.type).not.toBe('INFINITE_STREAM');
        }
      }
    });

    it('should return null when no prompts available after exclusions', () => {
      const result = selectAdversaryPrompt(
        'SLIDING_WINDOW',
        undefined,
        ['INFINITE_STREAM', 'MEMORY_O1', 'NEGATIVE_NUMBERS']
      );
      expect(result).toBeNull();
    });

    it('should prefer custom prompts over defaults', () => {
      const customPrompts: AdversaryPrompt[] = [
        {
          id: 'custom_special',
          type: 'DISTRIBUTED',
          prompt: 'What if this is distributed?',
        },
      ];

      // Run multiple times to verify consistency
      for (let i = 0; i < 5; i++) {
        const result = selectAdversaryPrompt('SLIDING_WINDOW', customPrompts);
        expect(result?.id).toBe('custom_special');
      }
    });
  });

  describe('getAvailablePrompts', () => {
    it('should return all prompts for a pattern', () => {
      const prompts = getAvailablePrompts('TWO_POINTERS');
      expect(prompts.length).toBeGreaterThan(0);

      // Should include pattern-recommended types
      const types = prompts.map(p => p.type);
      expect(types).toContain('INPUT_UNSORTED');
    });

    it('should include custom prompts in addition to defaults', () => {
      const customPrompts: AdversaryPrompt[] = [
        {
          id: 'custom_1',
          type: 'MEMORY_O1',
          prompt: 'Custom prompt',
        },
      ];

      const prompts = getAvailablePrompts('TWO_POINTERS', customPrompts);

      // Should include both custom and default prompts
      const ids = prompts.map(p => p.id);
      expect(ids).toContain('custom_1');
      expect(ids.some(id => id.startsWith('default_'))).toBe(true);
    });

    it('should return empty array for pattern with no recommendations', () => {
      // Test with a non-existent pattern (type assertion for test)
      const prompts = getAvailablePrompts('NON_EXISTENT' as any);
      expect(prompts).toEqual([]);
    });
  });

  describe('DEFAULT_ADVERSARY_PROMPTS', () => {
    it('should have prompts for all defined types', () => {
      const types = [
        'INFINITE_STREAM',
        'MEMORY_O1',
        'INPUT_UNSORTED',
        'MULTIPLE_QUERIES',
        'NEGATIVE_NUMBERS',
        'DUPLICATE_VALUES',
        'ONLINE_UPDATES',
        'DISTRIBUTED',
      ] as const;

      for (const type of types) {
        expect(DEFAULT_ADVERSARY_PROMPTS[type]).toBeDefined();
        expect(DEFAULT_ADVERSARY_PROMPTS[type].prompt.length).toBeGreaterThan(0);
      }
    });

    it('should have hints for all prompts', () => {
      for (const [type, prompt] of Object.entries(DEFAULT_ADVERSARY_PROMPTS)) {
        expect(prompt.hint).toBeDefined();
        expect(prompt.hint!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('PATTERN_ADVERSARY_PROMPTS', () => {
    it('should have recommendations for all core patterns', () => {
      const patterns = [
        'SLIDING_WINDOW',
        'TWO_POINTERS',
        'PREFIX_SUM',
        'BINARY_SEARCH',
        'BFS',
        'DFS',
        'DYNAMIC_PROGRAMMING',
        'BACKTRACKING',
        'GREEDY',
        'HEAP',
        'TRIE',
        'UNION_FIND',
        'INTERVAL_MERGING',
      ] as const;

      for (const pattern of patterns) {
        expect(PATTERN_ADVERSARY_PROMPTS[pattern]).toBeDefined();
        expect(PATTERN_ADVERSARY_PROMPTS[pattern].length).toBeGreaterThan(0);
      }
    });

    it('should only reference valid prompt types', () => {
      const validTypes = new Set([
        'INFINITE_STREAM',
        'MEMORY_O1',
        'INPUT_UNSORTED',
        'MULTIPLE_QUERIES',
        'NEGATIVE_NUMBERS',
        'DUPLICATE_VALUES',
        'ONLINE_UPDATES',
        'DISTRIBUTED',
      ]);

      for (const [pattern, types] of Object.entries(PATTERN_ADVERSARY_PROMPTS)) {
        for (const type of types) {
          expect(validTypes.has(type)).toBe(true);
        }
      }
    });
  });
});

describe('Adversary Step Data', () => {
  it('should structure step data correctly', () => {
    // Test the expected structure of AdversaryChallengeData
    const stepData = {
      type: 'ADVERSARY_CHALLENGE' as const,
      prompt: {
        id: 'test_prompt',
        type: 'MEMORY_O1' as const,
        prompt: 'What if memory is O(1)?',
        hint: 'Consider in-place algorithms',
      },
      userResponse: null,
      skipped: false,
      respondedAt: null,
    };

    expect(stepData.type).toBe('ADVERSARY_CHALLENGE');
    expect(stepData.prompt.id).toBe('test_prompt');
    expect(stepData.userResponse).toBeNull();
    expect(stepData.skipped).toBe(false);
  });

  it('should allow user response to be set', () => {
    const stepData = {
      type: 'ADVERSARY_CHALLENGE' as const,
      prompt: {
        id: 'test_prompt',
        type: 'INFINITE_STREAM' as const,
        prompt: 'What if input is infinite?',
      },
      userResponse: 'I would use a sliding window with fixed size to maintain O(1) memory.',
      skipped: false,
      respondedAt: new Date(),
    };

    expect(stepData.userResponse).toBe(
      'I would use a sliding window with fixed size to maintain O(1) memory.'
    );
    expect(stepData.respondedAt).toBeInstanceOf(Date);
  });

  it('should allow skipping the challenge', () => {
    const stepData = {
      type: 'ADVERSARY_CHALLENGE' as const,
      prompt: {
        id: 'test_prompt',
        type: 'DISTRIBUTED' as const,
        prompt: 'What if data is distributed?',
      },
      userResponse: null,
      skipped: true,
      respondedAt: new Date(),
    };

    expect(stepData.skipped).toBe(true);
    expect(stepData.userResponse).toBeNull();
  });
});
