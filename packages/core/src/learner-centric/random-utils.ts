/**
 * Random Utility Module
 *
 * Provides seeded random selection for deterministic testing.
 * Uses a simple linear congruential generator (LCG) for seeded randomness.
 */

/**
 * Simple seeded random number generator using Linear Congruential Generator
 * Parameters chosen to work well with 32-bit integers
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    // Ensure seed is a positive integer
    this.seed = Math.abs(Math.floor(seed)) || 1;
  }

  /**
   * Generate next random number between 0 and 1
   */
  next(): number {
    // LCG parameters (same as glibc)
    const a = 1103515245;
    const c = 12345;
    const m = 2 ** 31;
    this.seed = (a * this.seed + c) % m;
    return this.seed / m;
  }

  /**
   * Generate random integer in range [0, max)
   */
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
}

/**
 * Global random context for testing
 * Can be set to a SeededRandom instance for deterministic behavior
 */
let globalRandomContext: SeededRandom | null = null;

/**
 * Set a seed for deterministic random selection (useful for testing)
 * Pass null to reset to normal Math.random behavior
 */
export function setRandomSeed(seed: number | null): void {
  globalRandomContext = seed !== null ? new SeededRandom(seed) : null;
}

/**
 * Get the current random seed context
 */
export function getRandomSeed(): SeededRandom | null {
  return globalRandomContext;
}

/**
 * Select a random element from an array
 * Uses seeded random if set, otherwise uses Math.random
 */
export function selectRandom<T>(arr: readonly T[]): T | undefined {
  if (arr.length === 0) return undefined;
  const index = globalRandomContext
    ? globalRandomContext.nextInt(arr.length)
    : Math.floor(Math.random() * arr.length);
  return arr[index];
}

/**
 * Select a random index from an array
 * Uses seeded random if set, otherwise uses Math.random
 */
export function randomIndex(length: number): number {
  if (length <= 0) return 0;
  return globalRandomContext
    ? globalRandomContext.nextInt(length)
    : Math.floor(Math.random() * length);
}
