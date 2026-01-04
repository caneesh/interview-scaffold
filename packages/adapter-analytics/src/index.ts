import type { EventSink, DomainEvent } from '@scaffold/core/ports';

/**
 * Console event sink for development - logs events to console
 */
export function createConsoleEventSink(): EventSink {
  return {
    async emit(event: DomainEvent): Promise<void> {
      console.log('[EVENT]', event.type, JSON.stringify(event, null, 2));
    },
  };
}

/**
 * Noop event sink - discards all events (for testing)
 */
export function createNoopEventSink(): EventSink {
  return {
    async emit(_event: DomainEvent): Promise<void> {
      // Intentionally empty
    },
  };
}

/**
 * Buffered event sink - collects events for batch processing
 */
export function createBufferedEventSink(
  flushFn: (events: DomainEvent[]) => Promise<void>,
  options?: { maxBufferSize?: number; flushIntervalMs?: number }
): EventSink & { flush(): Promise<void> } {
  const buffer: DomainEvent[] = [];
  const maxSize = options?.maxBufferSize ?? 100;
  const flushInterval = options?.flushIntervalMs ?? 5000;

  let flushTimer: NodeJS.Timeout | null = null;

  const flush = async () => {
    if (buffer.length === 0) return;
    const events = buffer.splice(0, buffer.length);
    await flushFn(events);
  };

  const scheduleFlush = () => {
    if (flushTimer) return;
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      await flush();
    }, flushInterval);
  };

  return {
    async emit(event: DomainEvent): Promise<void> {
      buffer.push(event);
      if (buffer.length >= maxSize) {
        await flush();
      } else {
        scheduleFlush();
      }
    },
    flush,
  };
}

/**
 * Multi-sink - emits to multiple sinks
 */
export function createMultiEventSink(...sinks: EventSink[]): EventSink {
  return {
    async emit(event: DomainEvent): Promise<void> {
      await Promise.all(sinks.map((sink) => sink.emit(event)));
    },
  };
}

export type { EventSink, DomainEvent };
