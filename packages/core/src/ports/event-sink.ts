import type { TenantId } from '../entities/tenant.js';
import type { AttemptId } from '../entities/attempt.js';
import type { PatternId } from '../entities/pattern.js';
import type { RungLevel } from '../entities/rung.js';
import type { StepType, HintLevel } from '../entities/step.js';

/**
 * EventSink - port for analytics/event tracking
 */
export interface EventSink {
  emit(event: DomainEvent): Promise<void>;
}

export type DomainEvent =
  | AttemptStartedEvent
  | StepCompletedEvent
  | AttemptCompletedEvent
  | SkillUpdatedEvent
  | HintRequestedEvent;

export interface AttemptStartedEvent {
  readonly type: 'ATTEMPT_STARTED';
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: AttemptId;
  readonly pattern: PatternId;
  readonly rung: RungLevel;
  readonly timestamp: Date;
}

export interface StepCompletedEvent {
  readonly type: 'STEP_COMPLETED';
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: AttemptId;
  readonly stepType: StepType;
  readonly result: 'PASS' | 'FAIL' | 'SKIP';
  readonly durationMs: number;
  readonly timestamp: Date;
}

export interface AttemptCompletedEvent {
  readonly type: 'ATTEMPT_COMPLETED';
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: AttemptId;
  readonly pattern: PatternId;
  readonly rung: RungLevel;
  readonly score: number;
  readonly hintsUsed: number;
  readonly codeSubmissions: number;
  readonly durationMs: number;
  readonly timestamp: Date;
}

export interface SkillUpdatedEvent {
  readonly type: 'SKILL_UPDATED';
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly pattern: PatternId;
  readonly rung: RungLevel;
  readonly previousScore: number;
  readonly newScore: number;
  readonly timestamp: Date;
}

export interface HintRequestedEvent {
  readonly type: 'HINT_REQUESTED';
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: AttemptId;
  readonly hintLevel: HintLevel;
  readonly timestamp: Date;
}
