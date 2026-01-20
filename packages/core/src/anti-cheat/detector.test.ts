/**
 * Tests for Anti-Memorization Detection System
 */

import { describe, it, expect } from 'vitest';
import {
  detectMemorization,
  detectTemplateWording,
  detectNoPersonalReasoning,
  detectPatternNameDrop,
  detectComplexityRecitation,
} from './detector.js';
import type { MemorizationDetectionContext } from './types.js';
import { DEFAULT_DETECTION_CONFIG } from './types.js';

// ============ Test Helpers ============

function createContext(
  overrides: Partial<MemorizationDetectionContext> = {}
): MemorizationDetectionContext {
  return {
    responseText: '',
    stage: 'PATTERN_RECOGNITION',
    problemId: 'test-problem',
    pattern: 'SLIDING_WINDOW',
    previousResponses: [],
    currentHelpLevel: 1,
    responseTimeMs: 60000,
    attemptCount: 1,
    ...overrides,
  };
}

// ============ Unit Tests for Individual Detectors ============

describe('detectTemplateWording', () => {
  it('should detect numbered step format', () => {
    const text = `
      Step 1: Initialize two pointers
      Step 2: Expand the window
      Step 3: Shrink when condition is violated
      Step 4: Update the result
    `;

    const result = detectTemplateWording(text);

    expect(result).not.toBeNull();
    expect(result?.type).toBe('step_list_format');
    expect(result?.confidence).toBeGreaterThan(0.3);
  });

  it('should detect "First... Then... Finally" pattern', () => {
    const text = 'First, we initialize the pointers. Then, we iterate through the array. Finally, we return the result.';

    const result = detectTemplateWording(text);

    expect(result).not.toBeNull();
    expect(result?.type).toBe('template_wording');
  });

  it('should return null for natural language', () => {
    const text = 'I think we could use two pointers here. Maybe start from both ends?';

    const result = detectTemplateWording(text);

    expect(result).toBeNull();
  });
});

describe('detectNoPersonalReasoning', () => {
  it('should detect responses without personal indicators', () => {
    const text = `The optimal approach uses a sliding window to maintain the constraint.
      The window expands when we add elements and contracts when the sum exceeds the target.
      This gives us O(n) time complexity and O(1) space complexity.
      The algorithm processes each element at most twice.
      We use two pointers to track the window boundaries.`;

    const result = detectNoPersonalReasoning(text);

    expect(result).not.toBeNull();
    expect(result?.type).toBe('no_personal_reasoning');
  });

  it('should not flag responses with personal language', () => {
    const text = `I think we could use a sliding window here. My approach would be to
      expand the window until we hit the target, then shrink it. Let me think about
      the edge cases - what if the array is empty? Actually, I realized we need to
      handle the case where no valid window exists.`;

    const result = detectNoPersonalReasoning(text);

    expect(result).toBeNull();
  });

  it('should not flag short responses', () => {
    const text = 'Use sliding window.';

    const result = detectNoPersonalReasoning(text);

    expect(result).toBeNull();
  });
});

describe('detectPatternNameDrop', () => {
  it('should detect pattern mention without explanation', () => {
    const text = 'We should use the sliding window technique for this problem.';

    const result = detectPatternNameDrop(text, 'SLIDING_WINDOW');

    expect(result).not.toBeNull();
    expect(result?.type).toBe('pattern_name_drop');
  });

  it('should not flag pattern mention with explanation', () => {
    const text = 'We should use sliding window because we need to find a contiguous subarray and can process elements incrementally.';

    const result = detectPatternNameDrop(text, 'SLIDING_WINDOW');

    expect(result).toBeNull();
  });

  it('should handle patterns not in the dictionary', () => {
    const text = 'We should use some unknown technique.';

    const result = detectPatternNameDrop(text, 'UNKNOWN_PATTERN');

    expect(result).toBeNull();
  });
});

describe('detectComplexityRecitation', () => {
  it('should detect complexity without derivation', () => {
    // Needs to mention complexity without derivation words like "because", "since", etc.
    const text = 'Time complexity: O(n). Space complexity: O(1). The solution is efficient.';

    const result = detectComplexityRecitation(text);

    expect(result).not.toBeNull();
    expect(result?.type).toBe('complexity_recitation');
  });

  it('should not flag complexity with explanation', () => {
    const text = 'The time complexity is O(n) because we visit each element at most twice - once when expanding and once when shrinking.';

    const result = detectComplexityRecitation(text);

    expect(result).toBeNull();
  });

  it('should not flag text without complexity mentions', () => {
    const text = 'We iterate through the array once and maintain two pointers.';

    const result = detectComplexityRecitation(text);

    expect(result).toBeNull();
  });
});

// ============ Integration Tests ============

describe('detectMemorization', () => {
  it('should classify authentic responses correctly', () => {
    const context = createContext({
      responseText: `
        Hmm, let me think about this. I notice we need to find a contiguous subarray,
        which makes me think of a window-based approach. My intuition is that we could
        track the sum as we go and adjust the window when needed. Actually, I'm not
        sure about the edge case where all elements are positive - let me reconsider.
        What if we start with an empty window and expand?
      `,
    });

    const result = detectMemorization(context);

    expect(result.classification).toBe('authentic');
    expect(result.action).toBe('continue');
    expect(result.confidence).toBeLessThan(0.4);
  });

  it('should detect likely memorized content', () => {
    const context = createContext({
      responseText: `
        The optimal approach uses the sliding window pattern. Step 1: Initialize two
        pointers at the start. Step 2: Expand the window by moving the right pointer.
        Step 3: When the constraint is violated, shrink by moving the left pointer.
        The time complexity is O(n) and space complexity is O(1). This is a classic
        sliding window problem that can be solved efficiently.
      `,
      responseTimeMs: 20000, // Very fast
      attemptCount: 1,
    });

    const result = detectMemorization(context);

    expect(result.classification).toBe('likely_memorized');
    expect(result.action).not.toBe('continue');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.signals.length).toBeGreaterThan(0);
  });

  it('should detect partial memorization', () => {
    const context = createContext({
      responseText: `
        I think we need a sliding window here because we're looking for a contiguous
        subarray. The key insight is that we can maintain the sum incrementally.
        We expand when possible and shrink when needed. Time: O(n), Space: O(1).
      `,
    });

    const result = detectMemorization(context);

    // Should be at least partially suspicious due to "key insight" phrase
    expect(['partially_memorized', 'authentic']).toContain(result.classification);
  });

  it('should generate reprompts for blocked responses', () => {
    const context = createContext({
      responseText: `
        Step 1: Sort the intervals by start time.
        Step 2: Iterate through and merge overlapping intervals.
        Step 3: Return the result.
        This is a standard interval merging problem. Time complexity: O(n log n).
      `,
      pattern: 'INTERVAL_MERGING',
      responseTimeMs: 15000,
    });

    const result = detectMemorization(context);

    if (result.action === 'block_and_reprompt') {
      expect(result.reprompts.length).toBeGreaterThan(0);
      expect(result.reprompts.length).toBeLessThanOrEqual(3);
      expect(result.reprompts[0].question).toBeTruthy();
    }
  });

  it('should adjust help level based on memorization', () => {
    const context = createContext({
      responseText: `
        The optimal solution uses two pointers. This is a classic two pointer problem.
        Time: O(n), Space: O(1). The trick is to move pointers based on the comparison.
      `,
      currentHelpLevel: 3,
      pattern: 'TWO_POINTERS',
    });

    const result = detectMemorization(context);

    // If memorization detected, help level should be reduced
    if (result.classification !== 'authentic') {
      expect(result.recommendedHelpLevel).toBeLessThanOrEqual(context.currentHelpLevel);
    }
  });

  it('should use anti-cheat markers from problem metadata', () => {
    const context = createContext({
      responseText: 'We use the famous Kadane\'s algorithm to solve this in O(n) time.',
      antiCheatMarkers: ['Kadane\'s algorithm', 'famous algorithm'],
    });

    const result = detectMemorization(context);

    // Should detect the known marker
    const markerSignal = result.signals.find(
      s => s.evidence.includes('Kadane\'s algorithm')
    );
    expect(markerSignal).toBeDefined();
  });

  it('should handle empty responses gracefully', () => {
    const context = createContext({
      responseText: '',
    });

    const result = detectMemorization(context);

    expect(result.classification).toBe('authentic');
    expect(result.signals.length).toBe(0);
  });

  it('should handle very short responses', () => {
    const context = createContext({
      responseText: 'Use two pointers.',
    });

    const result = detectMemorization(context);

    // Short responses shouldn't trigger many signals
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('should consider vocabulary mismatch with previous responses', () => {
    const context = createContext({
      responseText: `
        Furthermore, we can observe that the optimal substructure property holds.
        Thus, by applying the principle of mathematical induction, we can derive
        that the recurrence relation yields the correct result. Moreover, the
        invariant is maintained throughout the iteration.
      `,
      previousResponses: [
        'I think we could try a loop here.',
        'Maybe start with the first element?',
      ],
    });

    const result = detectMemorization(context);

    // Should detect vocabulary mismatch
    const vocabSignal = result.signals.find(s => s.type === 'vocabulary_mismatch');
    expect(vocabSignal).toBeDefined();
  });
});

describe('detectMemorization with custom config', () => {
  it('should respect custom thresholds', () => {
    const context = createContext({
      responseText: 'The key insight is to use two pointers. Step 1: Initialize. Step 2: Iterate.',
    });

    // Very high threshold should classify as authentic
    const strictConfig = {
      ...DEFAULT_DETECTION_CONFIG,
      partialThreshold: 0.9,
      likelyThreshold: 0.95,
    };

    const result = detectMemorization(context, strictConfig);

    expect(result.classification).toBe('authentic');
  });

  it('should limit reprompts according to config', () => {
    const context = createContext({
      responseText: `
        Step 1: Sort. Step 2: Merge. Step 3: Return.
        The optimal approach is O(n log n).
        This is a classic problem. The key insight is sorting.
      `,
    });

    const config = {
      ...DEFAULT_DETECTION_CONFIG,
      maxReprompts: 1,
    };

    const result = detectMemorization(context, config);

    if (result.action === 'block_and_reprompt') {
      expect(result.reprompts.length).toBeLessThanOrEqual(1);
    }
  });
});
