/**
 * SubmitMicroDrillAttempt use-case.
 * Handles micro-drill submission and grading.
 */

import type { TenantId, UserId, MicroDrillId, AttemptId } from '../entities/types.js';
import type { ProgressRepo } from '../ports/ProgressRepo.js';
import type { ContentRepo } from '../ports/ContentRepo.js';
import type { Clock } from '../ports/Clock.js';
import type { EventSink } from '../ports/EventSink.js';
import type { Drill, DrillSubmission, DrillResult } from '../drills/types.js';
import { gradeDrill } from '../drills/DrillGrader.js';
import { EventType, createLearningEvent, type DrillEvent } from '../entities/LearningEvent.js';

// ============================================================================
// Input/Output Types
// ============================================================================

export interface SubmitMicroDrillAttemptInput {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly drillId: MicroDrillId;
  readonly answer: string | boolean | readonly string[];
  readonly timeTakenSec: number;
}

export interface SubmitMicroDrillAttemptOutput {
  readonly result: DrillResult;
  readonly passed: boolean;
  readonly progressUpdated: boolean;
  readonly shouldServeDrill: boolean;
  readonly nextDrillId: MicroDrillId | null;
}

export interface SubmitMicroDrillAttemptDeps {
  readonly progressRepo: ProgressRepo;
  readonly contentRepo: ContentRepo;
  readonly clock: Clock;
  readonly eventSink: EventSink;
}

// ============================================================================
// Use Case
// ============================================================================

export async function submitMicroDrillAttempt(
  input: SubmitMicroDrillAttemptInput,
  deps: SubmitMicroDrillAttemptDeps
): Promise<SubmitMicroDrillAttemptOutput> {
  const { tenantId, userId, drillId, answer, timeTakenSec } = input;
  const { progressRepo, contentRepo, clock, eventSink } = deps;

  // Get the drill content
  const drill = await contentRepo.getMicroDrill(tenantId, drillId);
  if (!drill) {
    throw new Error(`Drill not found: ${drillId}`);
  }

  // Convert to internal drill format
  const internalDrill = convertToInternalDrill(drill);

  // Create submission
  const submission: DrillSubmission = {
    drillId,
    answer,
    timeTakenSec,
  };

  // Grade the drill
  const result = gradeDrill(internalDrill, submission);

  // Update progress
  const drillProgress = await progressRepo.getDrillProgress(tenantId, userId, drillId);
  const newProgress = {
    tenantId,
    userId,
    drillId,
    isCompleted: result.isCorrect || (drillProgress?.isCompleted ?? false),
    bestTimeSec: drillProgress?.bestTimeSec
      ? Math.min(drillProgress.bestTimeSec, timeTakenSec)
      : timeTakenSec,
    attemptCount: (drillProgress?.attemptCount ?? 0) + 1,
    correctCount: (drillProgress?.correctCount ?? 0) + (result.isCorrect ? 1 : 0),
    lastAttemptAt: clock.now(),
    createdAt: drillProgress?.createdAt ?? clock.now(),
    updatedAt: clock.now(),
  };
  await progressRepo.saveDrillProgress(newProgress);

  // Emit event
  await eventSink.record(createLearningEvent<DrillEvent>({
    tenantId,
    userId,
    type: EventType.DRILL_COMPLETED,
    drillId,
    sessionId: null,
    metadata: {
      isCorrect: result.isCorrect,
      score: result.score,
      timeTakenSec,
      patternId: drill.patternId,
    },
  }));

  // Determine if we should serve another drill
  const accuracy = newProgress.correctCount / newProgress.attemptCount;
  const shouldServeDrill = !result.isCorrect || accuracy < 0.8;

  // Get next drill if needed
  let nextDrillId: MicroDrillId | null = null;
  if (shouldServeDrill) {
    const drills = await contentRepo.getMicroDrillsByPattern(tenantId, drill.patternId);
    const nextDrill = drills.find(d => d.id !== drillId);
    nextDrillId = nextDrill?.id ?? null;
  }

  return {
    result,
    passed: result.isCorrect,
    progressUpdated: true,
    shouldServeDrill,
    nextDrillId,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function convertToInternalDrill(drill: import('../entities/MicroDrill.js').MicroDrill): Drill {
  // Map from entity MicroDrill to internal Drill format
  // This handles the format-specific fields
  const base = {
    id: drill.id,
    patternId: drill.patternId,
    difficulty: drill.difficulty,
    estimatedTimeSec: drill.timeBudgetSec,
    targetErrorType: null, // MicroDrill entity doesn't have this field
  };

  // Get hint if available
  const firstHint = drill.hints[0];

  switch (drill.type) {
    case 'PATTERN_RECOGNITION':
    case 'COMPLEXITY_ANALYSIS':
      // Treat as MCQ - options have DrillOption structure with id, text, isCorrect
      return {
        ...base,
        format: 'MCQ' as const,
        question: drill.prompt,
        options: (drill.options ?? []).map((opt) => ({
          id: opt.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
          ...(opt.feedback ? { explanation: opt.feedback } : {}),
        })),
        ...(firstHint !== undefined ? { hint: firstHint } : {}),
      };

    case 'CODE_COMPLETION':
      return {
        ...base,
        format: 'CODE_COMPLETION' as const,
        prompt: drill.prompt,
        codeTemplate: drill.codeSnippet?.code ?? '',
        expectedOutput: drill.expectedAnswer ?? '',
        ...(firstHint !== undefined ? { hint: firstHint } : {}),
      };

    case 'BUG_FIX':
    case 'EDGE_CASE_IDENTIFICATION':
    default:
      // Default to short text
      return {
        ...base,
        format: 'SHORT_TEXT' as const,
        question: drill.prompt,
        acceptedAnswers: drill.expectedAnswer ? [drill.expectedAnswer] : [],
        caseSensitive: false,
        ...(firstHint !== undefined ? { hint: firstHint } : {}),
      };
  }
}
