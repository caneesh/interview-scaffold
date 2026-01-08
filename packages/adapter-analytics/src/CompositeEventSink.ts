/**
 * Composite event sink that sends events to multiple sinks.
 */

import type { EventSink, AnyLearningEvent } from '@learning/core';

export class CompositeEventSink implements EventSink {
  constructor(private readonly sinks: EventSink[]) {}

  async record(event: AnyLearningEvent): Promise<void> {
    await Promise.all(
      this.sinks.map(sink => sink.record(event).catch(console.error))
    );
  }

  async recordBatch(events: readonly AnyLearningEvent[]): Promise<void> {
    await Promise.all(
      this.sinks.map(sink => sink.recordBatch(events).catch(console.error))
    );
  }

  async flush(): Promise<void> {
    await Promise.all(
      this.sinks.map(sink => sink.flush?.().catch(console.error))
    );
  }
}

/**
 * Console event sink for debugging.
 */
export class ConsoleEventSink implements EventSink {
  constructor(private readonly prefix = '[EVENT]') {}

  async record(event: AnyLearningEvent): Promise<void> {
    console.log(this.prefix, event.type, {
      userId: event.userId,
      timestamp: new Date(event.timestamp).toISOString(),
      ...event.metadata,
    });
  }

  async recordBatch(events: readonly AnyLearningEvent[]): Promise<void> {
    for (const event of events) {
      await this.record(event);
    }
  }

  async flush(): Promise<void> {
    // Nothing to flush
  }
}
