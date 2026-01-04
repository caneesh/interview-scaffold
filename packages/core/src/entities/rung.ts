/**
 * Rung - difficulty level within a pattern (1-5)
 */
export const RUNG_LEVELS = [1, 2, 3, 4, 5] as const;

export type RungLevel = (typeof RUNG_LEVELS)[number];

export interface Rung {
  readonly level: RungLevel;
  readonly name: string;
  readonly description: string;
  readonly unlockThreshold: number; // Score needed to unlock next rung
}

export const RUNG_DEFINITIONS: Record<RungLevel, Rung> = {
  1: {
    level: 1,
    name: 'Foundation',
    description: 'Single pattern, minimal edge cases',
    unlockThreshold: 70, // Score needed to unlock rung 2
  },
  2: {
    level: 2,
    name: 'Reinforcement',
    description: 'Pattern recognition with common variations',
    unlockThreshold: 75, // Score needed to unlock rung 3
  },
  3: {
    level: 3,
    name: 'Application',
    description: 'Real-world constraints and edge cases',
    unlockThreshold: 80, // Score needed to unlock rung 4
  },
  4: {
    level: 4,
    name: 'Integration',
    description: 'Combine with other patterns',
    unlockThreshold: 85, // Score needed to unlock rung 5
  },
  5: {
    level: 5,
    name: 'Mastery',
    description: 'Interview-level complexity',
    unlockThreshold: 90, // Score for mastery maintenance
  },
};

export function isRungUnlocked(currentScore: number, rung: RungLevel): boolean {
  if (rung === 1) return true;
  const previousRung = (rung - 1) as RungLevel;
  return currentScore >= RUNG_DEFINITIONS[previousRung].unlockThreshold;
}
