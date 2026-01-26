/**
 * Seed Strategy Service
 *
 * Provides deterministic seed generation for bulk generation runs.
 * Seeds are used to ensure idempotency - same inputs produce same input_hash.
 */

export type SeedStrategy = 'fixed' | 'increment' | 'timeboxed';

export interface SeedStrategyInput {
  strategy: SeedStrategy;
  patternId: string;
  patternIndex?: number;
  baseVersion?: string;
}

/**
 * Compute a deterministic seed based on the strategy
 *
 * Strategies:
 * - 'fixed': Always returns "v1" - all patterns get the same seed
 * - 'increment': Returns "v1:<patternIndex>" - each pattern gets a unique seed
 * - 'timeboxed': Returns "v1:<YYYYMMDD-HH>" - stable within an hour
 */
export function computeSeed(input: SeedStrategyInput): string {
  const baseVersion = input.baseVersion ?? 'v1';

  switch (input.strategy) {
    case 'fixed':
      return baseVersion;

    case 'increment': {
      const index = input.patternIndex ?? 0;
      return `${baseVersion}:${index}`;
    }

    case 'timeboxed': {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');
      const hour = String(now.getUTCHours()).padStart(2, '0');
      return `${baseVersion}:${year}${month}${day}-${hour}`;
    }

    default:
      return baseVersion;
  }
}

/**
 * Get a description of each seed strategy
 */
export function getSeedStrategyDescription(strategy: SeedStrategy): string {
  switch (strategy) {
    case 'fixed':
      return 'Same seed for all patterns (most deterministic)';
    case 'increment':
      return 'Unique seed per pattern index (allows re-runs with different results)';
    case 'timeboxed':
      return 'Seed changes hourly (stable within the same hour)';
    default:
      return 'Unknown strategy';
  }
}

/**
 * Get all available seed strategies
 */
export function getAvailableSeedStrategies(): Array<{
  value: SeedStrategy;
  label: string;
  description: string;
}> {
  return [
    {
      value: 'fixed',
      label: 'Fixed',
      description: getSeedStrategyDescription('fixed'),
    },
    {
      value: 'increment',
      label: 'Increment',
      description: getSeedStrategyDescription('increment'),
    },
    {
      value: 'timeboxed',
      label: 'Timeboxed',
      description: getSeedStrategyDescription('timeboxed'),
    },
  ];
}
