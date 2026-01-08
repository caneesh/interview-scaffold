/**
 * EventSink port - interface for recording learning events.
 * PURE TypeScript - no framework dependencies.
 */

import type { TenantId, UserId } from '../entities/types.js';
import type { AnyLearningEvent, EventType } from '../entities/LearningEvent.js';

export interface EventQuery {
  readonly tenantId: TenantId;
  readonly userId?: UserId;
  readonly eventTypes?: readonly EventType[];
  readonly startTime?: number;
  readonly endTime?: number;
  readonly limit?: number;
  readonly offset?: number;
}

export interface EventSink {
  /**
   * Records a single learning event.
   */
  record(event: AnyLearningEvent): Promise<void>;

  /**
   * Records multiple learning events.
   */
  recordBatch(events: readonly AnyLearningEvent[]): Promise<void>;

  /**
   * Queries events (optional, for analytics).
   */
  query?(query: EventQuery): Promise<readonly AnyLearningEvent[]>;

  /**
   * Flushes any buffered events.
   */
  flush?(): Promise<void>;
}

/**
 * No-op event sink for testing or when analytics is disabled.
 */
export const NoOpEventSink: EventSink = {
  record: async () => {},
  recordBatch: async () => {},
  flush: async () => {},
};
