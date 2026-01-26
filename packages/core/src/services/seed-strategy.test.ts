import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  computeSeed,
  getSeedStrategyDescription,
  getAvailableSeedStrategies,
  type SeedStrategy,
} from './seed-strategy.js';

describe('computeSeed', () => {
  describe('fixed strategy', () => {
    it('returns base version for fixed strategy', () => {
      const seed = computeSeed({
        strategy: 'fixed',
        patternId: 'SLIDING_WINDOW',
      });

      expect(seed).toBe('v1');
    });

    it('uses custom base version', () => {
      const seed = computeSeed({
        strategy: 'fixed',
        patternId: 'SLIDING_WINDOW',
        baseVersion: 'v2',
      });

      expect(seed).toBe('v2');
    });

    it('ignores pattern index for fixed strategy', () => {
      const seed1 = computeSeed({
        strategy: 'fixed',
        patternId: 'SLIDING_WINDOW',
        patternIndex: 0,
      });

      const seed2 = computeSeed({
        strategy: 'fixed',
        patternId: 'TWO_POINTERS',
        patternIndex: 5,
      });

      expect(seed1).toBe(seed2);
    });
  });

  describe('increment strategy', () => {
    it('includes pattern index in seed', () => {
      const seed = computeSeed({
        strategy: 'increment',
        patternId: 'SLIDING_WINDOW',
        patternIndex: 3,
      });

      expect(seed).toBe('v1:3');
    });

    it('defaults to index 0 if not provided', () => {
      const seed = computeSeed({
        strategy: 'increment',
        patternId: 'SLIDING_WINDOW',
      });

      expect(seed).toBe('v1:0');
    });

    it('produces unique seeds for different indices', () => {
      const seeds = [0, 1, 2, 3, 4].map((i) =>
        computeSeed({
          strategy: 'increment',
          patternId: 'SLIDING_WINDOW',
          patternIndex: i,
        })
      );

      const uniqueSeeds = new Set(seeds);
      expect(uniqueSeeds.size).toBe(5);
    });

    it('uses custom base version', () => {
      const seed = computeSeed({
        strategy: 'increment',
        patternId: 'SLIDING_WINDOW',
        patternIndex: 2,
        baseVersion: 'v3',
      });

      expect(seed).toBe('v3:2');
    });
  });

  describe('timeboxed strategy', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('includes date and hour in seed', () => {
      vi.setSystemTime(new Date('2024-06-15T14:30:00Z'));

      const seed = computeSeed({
        strategy: 'timeboxed',
        patternId: 'SLIDING_WINDOW',
      });

      expect(seed).toBe('v1:20240615-14');
    });

    it('produces same seed within same hour', () => {
      vi.setSystemTime(new Date('2024-06-15T14:00:00Z'));
      const seed1 = computeSeed({
        strategy: 'timeboxed',
        patternId: 'SLIDING_WINDOW',
      });

      vi.setSystemTime(new Date('2024-06-15T14:59:59Z'));
      const seed2 = computeSeed({
        strategy: 'timeboxed',
        patternId: 'SLIDING_WINDOW',
      });

      expect(seed1).toBe(seed2);
    });

    it('produces different seed in different hours', () => {
      vi.setSystemTime(new Date('2024-06-15T14:00:00Z'));
      const seed1 = computeSeed({
        strategy: 'timeboxed',
        patternId: 'SLIDING_WINDOW',
      });

      vi.setSystemTime(new Date('2024-06-15T15:00:00Z'));
      const seed2 = computeSeed({
        strategy: 'timeboxed',
        patternId: 'SLIDING_WINDOW',
      });

      expect(seed1).not.toBe(seed2);
    });

    it('uses UTC time', () => {
      // Set to a specific UTC time
      vi.setSystemTime(new Date('2024-01-01T23:30:00Z'));

      const seed = computeSeed({
        strategy: 'timeboxed',
        patternId: 'SLIDING_WINDOW',
      });

      expect(seed).toBe('v1:20240101-23');
    });

    it('pads month, day, and hour with zeros', () => {
      vi.setSystemTime(new Date('2024-01-05T05:30:00Z'));

      const seed = computeSeed({
        strategy: 'timeboxed',
        patternId: 'SLIDING_WINDOW',
      });

      expect(seed).toBe('v1:20240105-05');
    });
  });

  describe('unknown strategy', () => {
    it('falls back to base version', () => {
      const seed = computeSeed({
        strategy: 'unknown' as SeedStrategy,
        patternId: 'SLIDING_WINDOW',
      });

      expect(seed).toBe('v1');
    });
  });
});

describe('getSeedStrategyDescription', () => {
  it('returns description for fixed strategy', () => {
    const desc = getSeedStrategyDescription('fixed');
    expect(desc).toContain('deterministic');
  });

  it('returns description for increment strategy', () => {
    const desc = getSeedStrategyDescription('increment');
    expect(desc).toContain('pattern');
  });

  it('returns description for timeboxed strategy', () => {
    const desc = getSeedStrategyDescription('timeboxed');
    expect(desc).toContain('hour');
  });

  it('returns unknown for invalid strategy', () => {
    const desc = getSeedStrategyDescription('invalid' as SeedStrategy);
    expect(desc).toContain('Unknown');
  });
});

describe('getAvailableSeedStrategies', () => {
  it('returns array of strategy options', () => {
    const strategies = getAvailableSeedStrategies();

    expect(Array.isArray(strategies)).toBe(true);
    expect(strategies.length).toBe(3);
  });

  it('includes all three strategies', () => {
    const strategies = getAvailableSeedStrategies();
    const values = strategies.map((s) => s.value);

    expect(values).toContain('fixed');
    expect(values).toContain('increment');
    expect(values).toContain('timeboxed');
  });

  it('each strategy has label and description', () => {
    const strategies = getAvailableSeedStrategies();

    strategies.forEach((strategy) => {
      expect(strategy.value).toBeDefined();
      expect(strategy.label).toBeDefined();
      expect(strategy.description).toBeDefined();
      expect(strategy.label.length).toBeGreaterThan(0);
      expect(strategy.description.length).toBeGreaterThan(0);
    });
  });
});
