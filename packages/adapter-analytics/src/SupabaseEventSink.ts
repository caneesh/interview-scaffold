/**
 * Supabase implementation of EventSink.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { EventSink, EventQuery, AnyLearningEvent } from '@learning/core';

export class SupabaseEventSink implements EventSink {
  constructor(private readonly client: SupabaseClient) {}

  async record(event: AnyLearningEvent): Promise<void> {
    const { error } = await this.client
      .from('learning_events')
      .insert(this.mapEventToRow(event));

    if (error) {
      console.error('Failed to record event:', error);
      // Don't throw - analytics shouldn't break the app
    }
  }

  async recordBatch(events: readonly AnyLearningEvent[]): Promise<void> {
    if (events.length === 0) return;

    const { error } = await this.client
      .from('learning_events')
      .insert(events.map(e => this.mapEventToRow(e)));

    if (error) {
      console.error('Failed to record events batch:', error);
    }
  }

  async query(query: EventQuery): Promise<readonly AnyLearningEvent[]> {
    let q = this.client
      .from('learning_events')
      .select('*')
      .eq('tenant_id', query.tenantId);

    if (query.userId) {
      q = q.eq('user_id', query.userId);
    }
    if (query.eventTypes && query.eventTypes.length > 0) {
      q = q.in('type', [...query.eventTypes]);
    }
    if (query.startTime) {
      q = q.gte('timestamp', new Date(query.startTime).toISOString());
    }
    if (query.endTime) {
      q = q.lte('timestamp', new Date(query.endTime).toISOString());
    }
    if (query.limit) {
      q = q.limit(query.limit);
    }
    if (query.offset) {
      q = q.range(query.offset, query.offset + (query.limit ?? 100) - 1);
    }

    q = q.order('timestamp', { ascending: false });

    const { data, error } = await q;

    if (error || !data) return [];

    return data.map(row => this.mapRowToEvent(row));
  }

  async flush(): Promise<void> {
    // Supabase writes are immediate, no flush needed
  }

  private mapEventToRow(event: AnyLearningEvent): Record<string, unknown> {
    return {
      id: event.id,
      tenant_id: event.tenantId,
      user_id: event.userId,
      type: event.type,
      timestamp: new Date(event.timestamp).toISOString(),
      metadata: event.metadata,
      // Flatten common optional fields
      session_id: 'sessionId' in event ? event.sessionId : null,
      problem_id: 'problemId' in event ? event.problemId : null,
      drill_id: 'drillId' in event ? event.drillId : null,
      pattern_id: 'patternId' in event ? event.patternId : null,
      mode: 'mode' in event ? event.mode : null,
      is_correct: 'isCorrect' in event ? event.isCorrect : null,
      error_type: 'errorType' in event ? event.errorType : null,
      previous_value: 'previousValue' in event ? event.previousValue : null,
      new_value: 'newValue' in event ? event.newValue : null,
      confidence_level: 'confidenceLevel' in event ? event.confidenceLevel : null,
      // Analytics event fields (Prompt 06)
      rung_level: 'rungLevel' in event ? event.rungLevel : null,
      time_taken_sec: 'timeTakenSec' in event ? event.timeTakenSec : null,
      action: 'action' in event ? event.action : null,
    };
  }

  private mapRowToEvent(row: Record<string, unknown>): AnyLearningEvent {
    const base = {
      id: row['id'] as string,
      tenantId: row['tenant_id'] as AnyLearningEvent['tenantId'],
      userId: row['user_id'] as AnyLearningEvent['userId'],
      type: row['type'] as AnyLearningEvent['type'],
      timestamp: new Date(row['timestamp'] as string).getTime(),
      metadata: (row['metadata'] as Record<string, unknown>) ?? {},
    };

    // Return with optional fields based on what's present
    return {
      ...base,
      ...(row['session_id'] ? { sessionId: row['session_id'] } : {}),
      ...(row['problem_id'] ? { problemId: row['problem_id'] } : {}),
      ...(row['drill_id'] ? { drillId: row['drill_id'] } : {}),
      ...(row['pattern_id'] ? { patternId: row['pattern_id'] } : {}),
      ...(row['mode'] ? { mode: row['mode'] } : {}),
      ...(row['is_correct'] !== null ? { isCorrect: row['is_correct'] } : {}),
      ...(row['error_type'] ? { errorType: row['error_type'] } : {}),
      ...(row['previous_value'] !== null ? { previousValue: row['previous_value'] } : {}),
      ...(row['new_value'] !== null ? { newValue: row['new_value'] } : {}),
      ...(row['confidence_level'] ? { confidenceLevel: row['confidence_level'] } : {}),
      // Analytics event fields (Prompt 06)
      ...(row['rung_level'] !== null ? { rungLevel: row['rung_level'] } : {}),
      ...(row['time_taken_sec'] !== null ? { timeTakenSec: row['time_taken_sec'] } : {}),
      ...(row['action'] ? { action: row['action'] } : {}),
    } as AnyLearningEvent;
  }
}
