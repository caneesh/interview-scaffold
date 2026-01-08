/**
 * Analytics Metrics Calculator.
 * Computes time-efficiency metrics from learning events.
 * PURE TypeScript - no framework dependencies.
 */

import type { PatternId, UserId, TenantId } from '../entities/types.js';
import type { AnyLearningEvent, AnalyticsEvent } from '../entities/LearningEvent.js';
import { EventType } from '../entities/LearningEvent.js';

// ============================================================================
// Metric Types
// ============================================================================

export interface LearningMetrics {
  /** Average minutes to master one rung */
  readonly minutesPerMasteredRung: number;

  /** Rate at which errors recur (0-1) */
  readonly errorRecurrenceRate: number;

  /** Success rate for transfer attempts (0-1) */
  readonly transferSuccessRate: number;

  /** Total time spent learning (minutes) */
  readonly totalLearningTimeMinutes: number;

  /** Total rungs mastered */
  readonly totalRungsMastered: number;

  /** Total errors detected */
  readonly totalErrors: number;

  /** Total transfer attempts */
  readonly totalTransferAttempts: number;

  /** Total transfer successes */
  readonly totalTransferSuccesses: number;

  /** Drill pass rate (0-1) */
  readonly drillPassRate: number;

  /** Total hints used */
  readonly totalHintsUsed: number;

  /** Time overrun count */
  readonly timeOverrunCount: number;
}

export interface PatternMetrics {
  readonly patternId: PatternId;
  readonly minutesPerRung: number;
  readonly errorCount: number;
  readonly rungsMastered: number;
  readonly transferSuccessRate: number;
  readonly drillPassRate: number;
}

// ============================================================================
// Event Filtering
// ============================================================================

const ANALYTICS_EVENT_TYPES: readonly string[] = [
  EventType.HINT_USED,
  EventType.ERROR_DETECTED,
  EventType.MICRO_DRILL_PASSED,
  EventType.MICRO_DRILL_FAILED,
  EventType.TRANSFER_SUCCESS,
  EventType.TRANSFER_FAIL,
  EventType.PROMOTED,
  EventType.TIME_OVERRUN,
];

function isAnalyticsEvent(event: AnyLearningEvent): event is AnalyticsEvent {
  return ANALYTICS_EVENT_TYPES.includes(event.type);
}

function filterEventsByType<T extends AnyLearningEvent['type']>(
  events: readonly AnyLearningEvent[],
  type: T
): readonly AnyLearningEvent[] {
  return events.filter(e => e.type === type);
}

// ============================================================================
// Metrics Calculation
// ============================================================================

/**
 * Calculate overall learning metrics from a set of events.
 */
export function calculateLearningMetrics(
  events: readonly AnyLearningEvent[]
): LearningMetrics {
  // Count events by type
  const promotedEvents = filterEventsByType(events, EventType.PROMOTED);
  const errorEvents = filterEventsByType(events, EventType.ERROR_DETECTED);
  const transferSuccessEvents = filterEventsByType(events, EventType.TRANSFER_SUCCESS);
  const transferFailEvents = filterEventsByType(events, EventType.TRANSFER_FAIL);
  const drillPassedEvents = filterEventsByType(events, EventType.MICRO_DRILL_PASSED);
  const drillFailedEvents = filterEventsByType(events, EventType.MICRO_DRILL_FAILED);
  const hintEvents = filterEventsByType(events, EventType.HINT_USED);
  const timeOverrunEvents = filterEventsByType(events, EventType.TIME_OVERRUN);

  // Calculate totals
  const totalRungsMastered = promotedEvents.length;
  const totalErrors = errorEvents.length;
  const totalTransferSuccesses = transferSuccessEvents.length;
  const totalTransferAttempts = transferSuccessEvents.length + transferFailEvents.length;
  const totalDrillAttempts = drillPassedEvents.length + drillFailedEvents.length;
  const totalHintsUsed = hintEvents.length;
  const timeOverrunCount = timeOverrunEvents.length;

  // Calculate total learning time from events with time data
  const analyticsEvents = events.filter(isAnalyticsEvent) as AnalyticsEvent[];
  const totalLearningTimeSec = analyticsEvents.reduce((sum, event) => {
    return sum + (event.timeTakenSec ?? 0);
  }, 0);
  const totalLearningTimeMinutes = totalLearningTimeSec / 60;

  // Calculate minutesPerMasteredRung
  const minutesPerMasteredRung = totalRungsMastered > 0
    ? totalLearningTimeMinutes / totalRungsMastered
    : 0;

  // Calculate error recurrence rate
  // We consider an error recurrent if the same error type appears more than once
  const errorRecurrenceRate = calculateErrorRecurrenceRate(events);

  // Calculate transfer success rate
  const transferSuccessRate = totalTransferAttempts > 0
    ? totalTransferSuccesses / totalTransferAttempts
    : 0;

  // Calculate drill pass rate
  const drillPassRate = totalDrillAttempts > 0
    ? drillPassedEvents.length / totalDrillAttempts
    : 0;

  return {
    minutesPerMasteredRung,
    errorRecurrenceRate,
    transferSuccessRate,
    totalLearningTimeMinutes,
    totalRungsMastered,
    totalErrors,
    totalTransferAttempts,
    totalTransferSuccesses,
    drillPassRate,
    totalHintsUsed,
    timeOverrunCount,
  };
}

/**
 * Calculate error recurrence rate.
 * An error is considered recurrent if it appears in multiple distinct events.
 */
function calculateErrorRecurrenceRate(events: readonly AnyLearningEvent[]): number {
  const errorEvents = filterEventsByType(events, EventType.ERROR_DETECTED) as AnalyticsEvent[];

  if (errorEvents.length <= 1) {
    return 0;
  }

  // Group errors by pattern and problem
  const errorKeys = new Map<string, number>();
  for (const event of errorEvents) {
    const key = `${event.patternId ?? 'unknown'}-${event.problemId ?? 'unknown'}`;
    errorKeys.set(key, (errorKeys.get(key) ?? 0) + 1);
  }

  // Count how many error keys have more than one occurrence
  let recurrentCount = 0;
  let totalErrorKeys = 0;

  for (const count of errorKeys.values()) {
    totalErrorKeys++;
    if (count > 1) {
      recurrentCount++;
    }
  }

  return totalErrorKeys > 0 ? recurrentCount / totalErrorKeys : 0;
}

/**
 * Calculate metrics for a specific pattern.
 */
export function calculatePatternMetrics(
  events: readonly AnyLearningEvent[],
  patternId: PatternId
): PatternMetrics {
  // Filter events for this pattern
  const patternEvents = events.filter(event => {
    if (isAnalyticsEvent(event)) {
      return event.patternId === patternId;
    }
    return false;
  }) as AnalyticsEvent[];

  const promotedEvents = patternEvents.filter(e => e.type === EventType.PROMOTED);
  const errorEvents = patternEvents.filter(e => e.type === EventType.ERROR_DETECTED);
  const transferSuccessEvents = patternEvents.filter(e => e.type === EventType.TRANSFER_SUCCESS);
  const transferFailEvents = patternEvents.filter(e => e.type === EventType.TRANSFER_FAIL);
  const drillPassedEvents = patternEvents.filter(e => e.type === EventType.MICRO_DRILL_PASSED);
  const drillFailedEvents = patternEvents.filter(e => e.type === EventType.MICRO_DRILL_FAILED);

  const rungsMastered = promotedEvents.length;
  const errorCount = errorEvents.length;

  // Calculate time per rung
  const totalTimeSec = patternEvents.reduce((sum, event) => {
    return sum + (event.timeTakenSec ?? 0);
  }, 0);
  const minutesPerRung = rungsMastered > 0 ? (totalTimeSec / 60) / rungsMastered : 0;

  // Transfer success rate
  const totalTransfers = transferSuccessEvents.length + transferFailEvents.length;
  const transferSuccessRate = totalTransfers > 0
    ? transferSuccessEvents.length / totalTransfers
    : 0;

  // Drill pass rate
  const totalDrills = drillPassedEvents.length + drillFailedEvents.length;
  const drillPassRate = totalDrills > 0
    ? drillPassedEvents.length / totalDrills
    : 0;

  return {
    patternId,
    minutesPerRung,
    errorCount,
    rungsMastered,
    transferSuccessRate,
    drillPassRate,
  };
}

/**
 * Calculate metrics for all patterns from events.
 */
export function calculateAllPatternMetrics(
  events: readonly AnyLearningEvent[]
): readonly PatternMetrics[] {
  // Find unique pattern IDs from analytics events
  const patternIds = new Set<PatternId>();

  for (const event of events) {
    if (isAnalyticsEvent(event) && event.patternId !== null) {
      patternIds.add(event.patternId);
    }
  }

  // Calculate metrics for each pattern
  return Array.from(patternIds).map(patternId =>
    calculatePatternMetrics(events, patternId)
  );
}

// ============================================================================
// Time-based Metrics
// ============================================================================

export interface TimeSeriesMetric {
  readonly timestamp: number;
  readonly value: number;
}

/**
 * Calculate cumulative learning progress over time.
 */
export function calculateCumulativeProgress(
  events: readonly AnyLearningEvent[]
): readonly TimeSeriesMetric[] {
  const promotedEvents = [...filterEventsByType(events, EventType.PROMOTED)]
    .sort((a: AnyLearningEvent, b: AnyLearningEvent) => a.timestamp - b.timestamp);

  let cumulative = 0;
  return promotedEvents.map((event: AnyLearningEvent) => {
    cumulative++;
    return {
      timestamp: event.timestamp,
      value: cumulative,
    };
  });
}

/**
 * Calculate daily learning metrics.
 */
export function calculateDailyMetrics(
  events: readonly AnyLearningEvent[]
): Map<string, LearningMetrics> {
  // Group events by day
  const eventsByDay = new Map<string, AnyLearningEvent[]>();

  for (const event of events) {
    const date = new Date(event.timestamp).toISOString().split('T')[0]!;
    if (!eventsByDay.has(date)) {
      eventsByDay.set(date, []);
    }
    eventsByDay.get(date)!.push(event);
  }

  // Calculate metrics for each day
  const dailyMetrics = new Map<string, LearningMetrics>();
  for (const [date, dayEvents] of eventsByDay) {
    dailyMetrics.set(date, calculateLearningMetrics(dayEvents));
  }

  return dailyMetrics;
}

// ============================================================================
// User-specific Metrics
// ============================================================================

export interface UserMetricsSummary {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly metrics: LearningMetrics;
  readonly patternMetrics: readonly PatternMetrics[];
  readonly activeDays: number;
  readonly averageSessionMinutes: number;
}

/**
 * Calculate comprehensive metrics for a specific user.
 */
export function calculateUserMetrics(
  events: readonly AnyLearningEvent[],
  tenantId: TenantId,
  userId: UserId
): UserMetricsSummary {
  // Filter events for this user
  const userEvents = events.filter(
    event => event.tenantId === tenantId && event.userId === userId
  );

  const metrics = calculateLearningMetrics(userEvents);
  const patternMetrics = calculateAllPatternMetrics(userEvents);

  // Calculate active days
  const activeDays = new Set(
    userEvents.map(e => new Date(e.timestamp).toISOString().split('T')[0])
  ).size;

  // Calculate average session time
  const sessionEvents = userEvents.filter(
    e => e.type === EventType.SESSION_STARTED || e.type === EventType.SESSION_COMPLETED
  );
  const sessionPairs = Math.floor(sessionEvents.length / 2);
  const averageSessionMinutes = sessionPairs > 0
    ? metrics.totalLearningTimeMinutes / sessionPairs
    : metrics.totalLearningTimeMinutes;

  return {
    tenantId,
    userId,
    metrics,
    patternMetrics,
    activeDays,
    averageSessionMinutes,
  };
}
