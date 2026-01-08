/**
 * Buffered event sink that batches events before sending.
 */

import type { EventSink, AnyLearningEvent } from '@learning/core';

export interface BufferedEventSinkConfig {
  maxBufferSize?: number;
  flushIntervalMs?: number;
}

export class BufferedEventSink implements EventSink {
  private buffer: AnyLearningEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private readonly maxBufferSize: number;
  private readonly flushIntervalMs: number;

  constructor(
    private readonly sink: EventSink,
    config?: BufferedEventSinkConfig
  ) {
    this.maxBufferSize = config?.maxBufferSize ?? 50;
    this.flushIntervalMs = config?.flushIntervalMs ?? 5000;

    this.startFlushTimer();
  }

  async record(event: AnyLearningEvent): Promise<void> {
    this.buffer.push(event);

    if (this.buffer.length >= this.maxBufferSize) {
      await this.flush();
    }
  }

  async recordBatch(events: readonly AnyLearningEvent[]): Promise<void> {
    this.buffer.push(...events);

    if (this.buffer.length >= this.maxBufferSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const eventsToSend = [...this.buffer];
    this.buffer = [];

    try {
      await this.sink.recordBatch(eventsToSend);
    } catch (error) {
      // Put events back in buffer for retry
      this.buffer.unshift(...eventsToSend);
      console.error('Failed to flush events:', error);
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, this.flushIntervalMs);
  }

  dispose(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
