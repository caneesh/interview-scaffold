/**
 * Session DTOs - Data Transfer Objects for sessions.
 */

import type {
  SessionId,
  TenantId,
  UserId,
  PatternId,
  AttemptMode,
} from '@learning/core';
import type { SessionType, SessionStatus } from '@learning/core';

export interface SessionItemDTO {
  type: 'problem' | 'drill';
  itemId: string;
  order: number;
  completed: boolean;
  skipped: boolean;
}

export interface SessionConfigDTO {
  timeBudgetSec: number | null;
  mode: AttemptMode;
  focusPatterns: string[];
  maxItems: number;
}

export interface SessionMetricsDTO {
  itemsCompleted: number;
  itemsSkipped: number;
  totalTimeSec: number;
  accuracy: number;
  averageConfidence: number;
}

export interface SessionDTO {
  id: string;
  tenantId: string;
  userId: string;
  type: SessionType;
  status: SessionStatus;
  config: SessionConfigDTO;
  items: SessionItemDTO[];
  currentItemIndex: number;
  metrics: SessionMetricsDTO;
  startedAt: string;
  completedAt: string | null;
}

export interface CreateDailySessionRequestDTO {
  availableTimeSec?: number;
  preferredItemCount?: number;
  focusPatterns?: string[];
}

export interface CreateDailySessionResponseDTO {
  session: SessionDTO;
  estimatedTimeSec: number;
}

export interface SessionProgressDTO {
  sessionId: string;
  currentItem: SessionItemDTO | null;
  itemsRemaining: number;
  timeElapsedSec: number;
  timeRemainingEstimateSec: number;
}
