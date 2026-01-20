/**
 * Cooldown Rules
 *
 * Manages cooldown periods after repeated failures to prevent
 * rapid retry spamming and encourage reflection.
 */

import type { CooldownRule, InterviewState, StateMachineContext } from './types.js';

// ============ Global Cooldown Limits ============

/**
 * Maximum cooldown duration (15 minutes) to prevent permanent deadlock.
 * This is an absolute cap that overrides any per-state maxDurationMs.
 */
export const GLOBAL_MAX_COOLDOWN_MS = 15 * 60 * 1000;

// ============ Cooldown Configuration ============

export const COOLDOWN_RULES: readonly CooldownRule[] = [
  {
    state: 'problem_framing',
    failureThreshold: 3,
    durationMs: 30 * 1000, // 30 seconds
    exponentialBackoff: false,
    maxDurationMs: 30 * 1000,
  },
  {
    state: 'pattern_gate',
    failureThreshold: 2,
    durationMs: 60 * 1000, // 1 minute
    exponentialBackoff: true,
    maxDurationMs: 5 * 60 * 1000, // Max 5 minutes
  },
  {
    state: 'feynman_check',
    failureThreshold: 2,
    durationMs: 45 * 1000, // 45 seconds
    exponentialBackoff: true,
    maxDurationMs: 3 * 60 * 1000, // Max 3 minutes
  },
  {
    state: 'strategy_design',
    failureThreshold: 2,
    durationMs: 60 * 1000, // 1 minute
    exponentialBackoff: true,
    maxDurationMs: 5 * 60 * 1000, // Max 5 minutes
  },
  {
    state: 'coding',
    failureThreshold: 5,
    durationMs: 30 * 1000, // 30 seconds
    exponentialBackoff: true,
    maxDurationMs: 3 * 60 * 1000, // Max 3 minutes
  },
  {
    state: 'reflection',
    failureThreshold: 2,
    durationMs: 20 * 1000, // 20 seconds
    exponentialBackoff: false,
    maxDurationMs: 20 * 1000,
  },
];

// ============ Cooldown Logic ============

/**
 * Get cooldown rule for a state
 */
export function getCooldownRule(state: InterviewState): CooldownRule | null {
  return COOLDOWN_RULES.find(rule => rule.state === state) ?? null;
}

/**
 * Check if cooldown should be triggered
 */
export function shouldTriggerCooldown(
  state: InterviewState,
  failureCount: number
): boolean {
  const rule = getCooldownRule(state);
  if (!rule) return false;
  return failureCount >= rule.failureThreshold && failureCount % rule.failureThreshold === 0;
}

/**
 * Calculate cooldown duration with optional exponential backoff.
 * Duration is capped by both the per-state maxDurationMs and the global
 * GLOBAL_MAX_COOLDOWN_MS (15 minutes) to prevent permanent deadlock.
 */
export function calculateCooldownDuration(
  state: InterviewState,
  consecutiveCooldowns: number
): number {
  const rule = getCooldownRule(state);
  if (!rule) return 0;

  let duration = rule.durationMs;

  if (rule.exponentialBackoff && consecutiveCooldowns > 0) {
    // Double duration for each consecutive cooldown
    duration = rule.durationMs * Math.pow(2, consecutiveCooldowns);
  }

  // Apply per-state limit, then global limit to prevent deadlock
  return Math.min(duration, rule.maxDurationMs, GLOBAL_MAX_COOLDOWN_MS);
}

/**
 * Apply cooldown to context
 */
export function applyCooldown(
  context: StateMachineContext,
  durationMs: number
): Partial<StateMachineContext> {
  return {
    inCooldown: true,
    cooldownExpiresAt: new Date(Date.now() + durationMs),
    lastUpdatedAt: new Date(),
  };
}

/**
 * Clear cooldown from context
 */
export function clearCooldown(context: StateMachineContext): Partial<StateMachineContext> {
  return {
    inCooldown: false,
    cooldownExpiresAt: null,
    lastUpdatedAt: new Date(),
  };
}

/**
 * Check if currently in cooldown.
 * Cooldowns auto-expire when cooldownExpiresAt is in the past,
 * preventing permanent deadlock even if COOLDOWN_COMPLETE event is missed.
 */
export function isInCooldown(context: StateMachineContext): boolean {
  if (!context.inCooldown) return false;
  if (!context.cooldownExpiresAt) return false;

  // Auto-expire: if cooldown time has passed, consider it expired
  // This prevents permanent deadlock if COOLDOWN_COMPLETE event is never fired
  return new Date() < context.cooldownExpiresAt;
}

/**
 * Get remaining cooldown time in ms
 */
export function getRemainingCooldownMs(context: StateMachineContext): number {
  if (!context.cooldownExpiresAt) return 0;
  const remaining = context.cooldownExpiresAt.getTime() - Date.now();
  return Math.max(0, remaining);
}

/**
 * Format cooldown time for display
 */
export function formatCooldownTime(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// ============ Cooldown Tracking ============

/**
 * Track consecutive cooldowns for exponential backoff
 */
export interface CooldownTracker {
  readonly state: InterviewState;
  readonly consecutiveCount: number;
  readonly lastCooldownAt: Date | null;
}

/**
 * Update cooldown tracker after a cooldown
 */
export function updateCooldownTracker(
  tracker: CooldownTracker | null,
  state: InterviewState
): CooldownTracker {
  if (!tracker || tracker.state !== state) {
    return {
      state,
      consecutiveCount: 1,
      lastCooldownAt: new Date(),
    };
  }

  return {
    ...tracker,
    consecutiveCount: tracker.consecutiveCount + 1,
    lastCooldownAt: new Date(),
  };
}

/**
 * Reset cooldown tracker when progressing to next state
 */
export function resetCooldownTracker(): CooldownTracker | null {
  return null;
}
