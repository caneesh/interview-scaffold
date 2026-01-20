/**
 * Hint Escalation Rules
 *
 * Defines the 5-level help ladder and rules for escalation.
 */

import type {
  HintEscalationRule,
  HintEscalationCondition,
  StateMachineContext,
} from './types.js';
import type { HelpLevel } from '../learner-centric/types.js';

// ============ Escalation Rules ============

export const HINT_ESCALATION_RULES: readonly HintEscalationRule[] = [
  // Level 1 -> 2: After first explicit request or 2 failures
  {
    fromLevel: 1,
    toLevel: 2,
    condition: {
      type: 'combined',
      conditions: [
        { type: 'explicit_request' },
      ],
    },
    cooldownMs: 30 * 1000, // 30 seconds
    scorePenalty: 0.05,
  },
  {
    fromLevel: 1,
    toLevel: 2,
    condition: { type: 'failure_count', threshold: 2 },
    cooldownMs: 0, // No cooldown for failure-triggered
    scorePenalty: 0.05,
  },

  // Level 2 -> 3: After explicit request or 3 failures or 5 minutes stuck
  {
    fromLevel: 2,
    toLevel: 3,
    condition: { type: 'explicit_request' },
    cooldownMs: 60 * 1000, // 1 minute
    scorePenalty: 0.10,
  },
  {
    fromLevel: 2,
    toLevel: 3,
    condition: { type: 'failure_count', threshold: 3 },
    cooldownMs: 0,
    scorePenalty: 0.10,
  },
  {
    fromLevel: 2,
    toLevel: 3,
    condition: { type: 'time_elapsed', thresholdMs: 5 * 60 * 1000 },
    cooldownMs: 0,
    scorePenalty: 0.08,
  },

  // Level 3 -> 4: After explicit request or 4 failures or 10 minutes stuck
  {
    fromLevel: 3,
    toLevel: 4,
    condition: { type: 'explicit_request' },
    cooldownMs: 2 * 60 * 1000, // 2 minutes
    scorePenalty: 0.15,
  },
  {
    fromLevel: 3,
    toLevel: 4,
    condition: { type: 'failure_count', threshold: 4 },
    cooldownMs: 0,
    scorePenalty: 0.15,
  },
  {
    fromLevel: 3,
    toLevel: 4,
    condition: { type: 'time_elapsed', thresholdMs: 10 * 60 * 1000 },
    cooldownMs: 0,
    scorePenalty: 0.12,
  },

  // Level 4 -> 5: Only explicit request (full solution reveal)
  {
    fromLevel: 4,
    toLevel: 5,
    condition: { type: 'explicit_request' },
    cooldownMs: 5 * 60 * 1000, // 5 minutes
    scorePenalty: 0.30, // Significant penalty
  },
];

// ============ Level Descriptions ============

export interface HelpLevelDescription {
  readonly level: HelpLevel;
  readonly name: string;
  readonly description: string;
  readonly contentType: string;
  readonly scorePenalty: number;
}

export const STATE_MACHINE_HELP_LEVEL_DESCRIPTIONS: readonly HelpLevelDescription[] = [
  {
    level: 1,
    name: 'Insight Question',
    description: 'A Socratic question that exposes a missing insight',
    contentType: 'Single question targeting the key blocker',
    scorePenalty: 0.05,
  },
  {
    level: 2,
    name: 'Conceptual Hint',
    description: 'A conceptual hint about the approach',
    contentType: 'High-level guidance without implementation details',
    scorePenalty: 0.10,
  },
  {
    level: 3,
    name: 'Invariant/Condition',
    description: 'The key invariant or condition for correctness',
    contentType: 'Specific condition that must hold for the solution',
    scorePenalty: 0.15,
  },
  {
    level: 4,
    name: 'Structural Skeleton',
    description: 'Code skeleton without the core logic',
    contentType: 'Function signatures, loop structure, but no implementation',
    scorePenalty: 0.25,
  },
  {
    level: 5,
    name: 'Full Solution',
    description: 'Complete solution (only if explicitly requested)',
    contentType: 'Full working code with explanation',
    scorePenalty: 0.50,
  },
];

// ============ Escalation Logic ============

/**
 * Check if a condition is met
 */
export function isConditionMet(
  condition: HintEscalationCondition,
  context: StateMachineContext,
  explicitlyRequested: boolean,
  stageEntryTime: Date
): boolean {
  switch (condition.type) {
    case 'explicit_request':
      return explicitlyRequested;

    case 'failure_count':
      return context.stageFailureCount >= condition.threshold;

    case 'time_elapsed': {
      const elapsed = Date.now() - stageEntryTime.getTime();
      return elapsed >= condition.thresholdMs;
    }

    case 'combined':
      // Any condition in the combination can trigger escalation
      return condition.conditions.some(c =>
        isConditionMet(c, context, explicitlyRequested, stageEntryTime)
      );

    default:
      return false;
  }
}

/**
 * Find applicable escalation rule.
 *
 * Cooldown restrictions are only applied to explicit->explicit transitions.
 * Auto-escalations (triggered by failures or time) bypass cooldowns since
 * they are system-initiated to help struggling users.
 *
 * @param currentLevel - Current help level
 * @param context - State machine context
 * @param explicitlyRequested - Whether user explicitly requested this escalation
 * @param stageEntryTime - When user entered current stage
 * @param lastEscalationTime - Time of last escalation (if any)
 * @param lastEscalationWasExplicit - Whether last escalation was explicit (optional, defaults to true)
 */
export function findEscalationRule(
  currentLevel: HelpLevel,
  context: StateMachineContext,
  explicitlyRequested: boolean,
  stageEntryTime: Date,
  lastEscalationTime: Date | null,
  lastEscalationWasExplicit: boolean = true
): HintEscalationRule | null {
  const candidates = HINT_ESCALATION_RULES.filter(rule =>
    rule.fromLevel === currentLevel
  );

  for (const rule of candidates) {
    // Check cooldown - only apply to explicit requests when last was also explicit
    // Auto-escalations (failure/time triggered) bypass cooldown since they're
    // system-initiated to help struggling users
    const isExplicitRule = rule.condition.type === 'explicit_request';
    const shouldApplyCooldown = isExplicitRule && explicitlyRequested && lastEscalationWasExplicit;

    if (shouldApplyCooldown && lastEscalationTime && rule.cooldownMs > 0) {
      const elapsed = Date.now() - lastEscalationTime.getTime();
      if (elapsed < rule.cooldownMs) {
        continue; // Still in cooldown for explicit->explicit
      }
    }

    // Check condition
    if (isConditionMet(rule.condition, context, explicitlyRequested, stageEntryTime)) {
      return rule;
    }
  }

  return null;
}

/**
 * Calculate total score penalty from hints used
 */
export function calculateHintPenalty(hintsUsed: readonly HelpLevel[]): number {
  let totalPenalty = 0;

  for (const level of hintsUsed) {
    const desc = STATE_MACHINE_HELP_LEVEL_DESCRIPTIONS.find(d => d.level === level);
    if (desc) {
      totalPenalty += desc.scorePenalty;
    }
  }

  // Cap at 0.5 to ensure some credit is possible
  return Math.min(totalPenalty, 0.5);
}

/**
 * Get description for a help level
 */
export function getHelpLevelDescription(level: HelpLevel): HelpLevelDescription {
  const desc = STATE_MACHINE_HELP_LEVEL_DESCRIPTIONS.find(d => d.level === level);
  if (!desc) {
    throw new Error(`Unknown help level: ${level}`);
  }
  return desc;
}

/**
 * Check if level 5 (full solution) is allowed
 * Requires explicit request and acknowledgment
 */
export function isLevel5Allowed(
  context: StateMachineContext,
  explicitlyRequested: boolean,
  acknowledged: boolean
): boolean {
  // Must be explicitly requested AND acknowledged
  if (!explicitlyRequested || !acknowledged) {
    return false;
  }

  // Must be at level 4 first
  if (context.helpLevel < 4) {
    return false;
  }

  // Must have made some attempts
  if (context.stageAttemptCount < 3) {
    return false;
  }

  return true;
}

/**
 * Get next allowed help level
 */
export function getNextHelpLevel(currentLevel: HelpLevel): HelpLevel | null {
  if (currentLevel >= 5) return null;
  return (currentLevel + 1) as HelpLevel;
}

/**
 * Check if user can request help escalation.
 *
 * Cooldown only applies to explicit->explicit transitions.
 *
 * @param currentLevel - Current help level
 * @param context - State machine context
 * @param lastEscalationTime - Time of last escalation (if any)
 * @param lastEscalationWasExplicit - Whether last escalation was explicit (default true)
 */
export function canRequestEscalation(
  currentLevel: HelpLevel,
  context: StateMachineContext,
  lastEscalationTime: Date | null,
  lastEscalationWasExplicit: boolean = true
): { allowed: boolean; reason?: string; cooldownRemainingMs?: number } {
  if (currentLevel >= 5) {
    return { allowed: false, reason: 'Already at maximum help level' };
  }

  // Find applicable rule for explicit request
  const explicitRules = HINT_ESCALATION_RULES.filter(
    rule => rule.fromLevel === currentLevel && rule.condition.type === 'explicit_request'
  );

  if (explicitRules.length === 0) {
    return { allowed: false, reason: 'No escalation available from this level' };
  }

  const rule = explicitRules[0];
  if (!rule) {
    return { allowed: false, reason: 'No escalation rule found' };
  }

  // Cooldown only applies to explicit->explicit transitions
  // If last escalation was auto-triggered, no cooldown applies
  if (lastEscalationWasExplicit && lastEscalationTime && rule.cooldownMs > 0) {
    const elapsed = Date.now() - lastEscalationTime.getTime();
    if (elapsed < rule.cooldownMs) {
      return {
        allowed: false,
        reason: 'Escalation in cooldown',
        cooldownRemainingMs: rule.cooldownMs - elapsed,
      };
    }
  }

  return { allowed: true };
}
