import { describe, it, expect } from 'vitest';
import { patternVault } from './patternVault';

describe('patternVault', () => {
  describe('structure', () => {
    it('should be an array of patterns', () => {
      expect(Array.isArray(patternVault)).toBe(true);
      expect(patternVault.length).toBeGreaterThan(0);
    });

    it('should have unique pattern IDs', () => {
      const ids = patternVault.map((p) => p.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should have required fields for each pattern', () => {
      const requiredFields = [
        'id',
        'name',
        'icon',
        'color',
        'difficulty',
        'description',
        'whenToUse',
        'primitives',
        'variants',
        'templateCode',
        'complexity',
        'keyInsight',
        'commonMistakes',
        'relatedProblems',
      ];

      patternVault.forEach((pattern) => {
        requiredFields.forEach((field) => {
          expect(pattern).toHaveProperty(field);
        });
      });
    });
  });

  describe('core patterns', () => {
    it('should have Two Pointers pattern', () => {
      const twoPointers = patternVault.find((p) => p.id === 'two-pointers');
      expect(twoPointers).toBeDefined();
      expect(twoPointers.name).toBe('Two Pointers');
    });

    it('should have Sliding Window pattern', () => {
      const slidingWindow = patternVault.find((p) => p.id === 'sliding-window');
      expect(slidingWindow).toBeDefined();
      expect(slidingWindow.name).toBe('Sliding Window');
    });

    it('should have Binary Search pattern', () => {
      const binarySearch = patternVault.find((p) => p.id === 'binary-search');
      expect(binarySearch).toBeDefined();
      expect(binarySearch.name).toBe('Binary Search');
    });

    it('should have DFS/BFS pattern', () => {
      const dfsBfs = patternVault.find((p) => p.id === 'dfs-bfs');
      expect(dfsBfs).toBeDefined();
      expect(dfsBfs.name).toBe('DFS / BFS');
    });

    it('should have Dynamic Programming pattern', () => {
      const dp = patternVault.find((p) => p.id === 'dynamic-programming');
      expect(dp).toBeDefined();
      expect(dp.name).toBe('Dynamic Programming');
    });

    it('should have Backtracking pattern', () => {
      const backtracking = patternVault.find((p) => p.id === 'backtracking');
      expect(backtracking).toBeDefined();
      expect(backtracking.name).toBe('Backtracking');
    });
  });

  describe('whenToUse arrays', () => {
    it('should have non-empty whenToUse for each pattern', () => {
      patternVault.forEach((pattern) => {
        expect(Array.isArray(pattern.whenToUse)).toBe(true);
        expect(pattern.whenToUse.length).toBeGreaterThan(0);
      });
    });

    it('should have meaningful use cases', () => {
      patternVault.forEach((pattern) => {
        pattern.whenToUse.forEach((useCase) => {
          expect(typeof useCase).toBe('string');
          expect(useCase.length).toBeGreaterThan(5);
        });
      });
    });
  });

  describe('primitives', () => {
    it('should have primitives with name and description', () => {
      patternVault.forEach((pattern) => {
        expect(Array.isArray(pattern.primitives)).toBe(true);
        pattern.primitives.forEach((primitive) => {
          expect(primitive).toHaveProperty('name');
          expect(primitive).toHaveProperty('type');
          expect(primitive).toHaveProperty('description');
        });
      });
    });
  });

  describe('variants', () => {
    it('should have variants with name and description', () => {
      patternVault.forEach((pattern) => {
        expect(Array.isArray(pattern.variants)).toBe(true);
        expect(pattern.variants.length).toBeGreaterThan(0);

        pattern.variants.forEach((variant) => {
          expect(variant).toHaveProperty('name');
          expect(variant).toHaveProperty('description');
          expect(variant).toHaveProperty('useCase');
        });
      });
    });
  });

  describe('templateCode', () => {
    it('should have Python template code for each pattern', () => {
      patternVault.forEach((pattern) => {
        expect(pattern.templateCode).toHaveProperty('language');
        expect(pattern.templateCode.language).toBe('python');
        expect(pattern.templateCode).toHaveProperty('code');
        expect(pattern.templateCode.code.length).toBeGreaterThan(50);
      });
    });

    it('should have valid Python syntax in templates', () => {
      patternVault.forEach((pattern) => {
        const code = pattern.templateCode.code;
        // Check for basic Python patterns
        expect(code).toMatch(/def\s+\w+|class\s+\w+|from\s+\w+\s+import/);
      });
    });
  });

  describe('complexity', () => {
    it('should have time and space complexity', () => {
      patternVault.forEach((pattern) => {
        expect(pattern.complexity).toHaveProperty('time');
        expect(pattern.complexity).toHaveProperty('space');
      });
    });

    it('should mention Big-O notation', () => {
      patternVault.forEach((pattern) => {
        expect(pattern.complexity.time).toMatch(/O\(/);
        expect(pattern.complexity.space).toMatch(/O\(/);
      });
    });
  });

  describe('keyInsight', () => {
    it('should have meaningful key insights', () => {
      patternVault.forEach((pattern) => {
        expect(typeof pattern.keyInsight).toBe('string');
        expect(pattern.keyInsight.length).toBeGreaterThan(20);
      });
    });
  });

  describe('commonMistakes', () => {
    it('should list common mistakes', () => {
      patternVault.forEach((pattern) => {
        expect(Array.isArray(pattern.commonMistakes)).toBe(true);
        expect(pattern.commonMistakes.length).toBeGreaterThan(0);
      });
    });
  });

  describe('relatedProblems', () => {
    it('should have related problems with title and difficulty', () => {
      patternVault.forEach((pattern) => {
        expect(Array.isArray(pattern.relatedProblems)).toBe(true);
        expect(pattern.relatedProblems.length).toBeGreaterThan(0);

        pattern.relatedProblems.forEach((problem) => {
          expect(problem).toHaveProperty('title');
          expect(problem).toHaveProperty('difficulty');
          expect(['Easy', 'Medium', 'Hard']).toContain(problem.difficulty);
        });
      });
    });
  });

  describe('difficulty levels', () => {
    it('should have valid difficulty for each pattern', () => {
      const validDifficulties = [
        'Easy',
        'Medium',
        'Hard',
        'Easy-Medium',
        'Medium-Hard',
      ];

      patternVault.forEach((pattern) => {
        expect(validDifficulties).toContain(pattern.difficulty);
      });
    });
  });

  describe('colors', () => {
    it('should have color for visual styling', () => {
      patternVault.forEach((pattern) => {
        expect(typeof pattern.color).toBe('string');
        expect(pattern.color.length).toBeGreaterThan(0);
      });
    });
  });

  describe('specific pattern content', () => {
    describe('Two Pointers', () => {
      const twoPointers = patternVault.find((p) => p.id === 'two-pointers');

      it('should have opposite direction variant', () => {
        const hasOpposite = twoPointers.variants.some((v) =>
          v.name.includes('Opposite')
        );
        expect(hasOpposite).toBe(true);
      });

      it('should have fast/slow variant', () => {
        const hasFastSlow = twoPointers.variants.some(
          (v) => v.name.includes('Fast') || v.name.includes('Slow')
        );
        expect(hasFastSlow).toBe(true);
      });

      it('should mention cycle detection in use cases', () => {
        const hasCycleDetection = twoPointers.whenToUse.some((w) =>
          w.toLowerCase().includes('cycle')
        );
        expect(hasCycleDetection).toBe(true);
      });
    });

    describe('Dynamic Programming', () => {
      const dp = patternVault.find((p) => p.id === 'dynamic-programming');

      it('should mention memoization and tabulation', () => {
        const variantNames = dp.variants.map((v) => v.name.toLowerCase());
        const hasMemoization = variantNames.some(
          (n) => n.includes('memoization') || n.includes('top-down')
        );
        const hasTabulation = variantNames.some(
          (n) => n.includes('tabulation') || n.includes('bottom-up')
        );

        expect(hasMemoization).toBe(true);
        expect(hasTabulation).toBe(true);
      });

      it('should have dp array as primitive', () => {
        const hasDpPrimitive = dp.primitives.some(
          (p) => p.name.includes('dp') || p.type.includes('array')
        );
        expect(hasDpPrimitive).toBe(true);
      });
    });

    describe('Sliding Window', () => {
      const slidingWindow = patternVault.find((p) => p.id === 'sliding-window');

      it('should have fixed and variable window variants', () => {
        const variantNames = slidingWindow.variants.map((v) =>
          v.name.toLowerCase()
        );
        const hasFixed = variantNames.some((n) => n.includes('fixed'));
        const hasVariable = variantNames.some((n) => n.includes('variable'));

        expect(hasFixed).toBe(true);
        expect(hasVariable).toBe(true);
      });
    });
  });
});
