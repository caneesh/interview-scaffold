/**
 * In-Memory Repository Implementations for TrackC
 *
 * These provide in-memory fallbacks for the new unified content bank system.
 * Used for local development without PostgreSQL.
 */

import { randomUUID } from 'crypto';
import type {
  ContentBankRepoPort,
  SubmissionsRepoPort,
  EvaluationsRepoPort,
  UnifiedAICoachRepoPort,
} from '@scaffold/core/ports';
import type {
  ContentItem,
  ContentItemId,
  ContentVersion,
  ContentVersionId,
  ContentFilter,
  ContentItemWithVersion,
  ContentBody,
  ContentDifficulty,
} from '@scaffold/core/entities';
import type { TenantId } from '@scaffold/core/entities';
import type { Track } from '@scaffold/core/entities';
import type {
  Submission,
  SubmissionId,
  SubmissionType,
  SubmissionContent,
} from '@scaffold/core/entities';
import type {
  EvaluationRun,
  EvaluationRunId,
  EvaluationType,
  EvaluationStatus,
  EvaluationSummary,
  EvaluationDetails,
  CodingTestResult,
  RubricScore,
  DebugDiagnostic,
} from '@scaffold/core/entities';
import type {
  UnifiedAIFeedback,
  AIFeedbackId,
  UnifiedAIFeedbackType,
  AIFeedbackOutput,
  UnifiedSocraticTurn,
  SocraticTurnId,
  SocraticRole,
  UnifiedSocraticQuestion,
  SocraticValidation,
} from '@scaffold/core/ports';

// ============ Track Attempt Types ============

export interface TrackAttempt {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly track: Track;
  readonly contentItemId: string;
  readonly versionId: string;
  readonly status: 'active' | 'completed' | 'abandoned';
  readonly startedAt: Date;
  readonly completedAt?: Date | null;
}

export interface TrackAttemptRepo {
  create(params: Omit<TrackAttempt, 'completedAt'>): Promise<TrackAttempt>;
  findById(tenantId: string, id: string): Promise<TrackAttempt | null>;
  findActiveByContent(tenantId: string, userId: string, contentItemId: string): Promise<TrackAttempt | null>;
  update(attempt: TrackAttempt): Promise<TrackAttempt>;
}

// ============ Global State (persists across hot reloads) ============

declare global {
  // eslint-disable-next-line no-var
  var __contentItemsStore: Map<string, ContentItem> | undefined;
  // eslint-disable-next-line no-var
  var __contentVersionsStore: Map<string, ContentVersion> | undefined;
  // eslint-disable-next-line no-var
  var __submissionsStore: Map<string, Submission> | undefined;
  // eslint-disable-next-line no-var
  var __evaluationRunsStore: Map<string, EvaluationRun> | undefined;
  // eslint-disable-next-line no-var
  var __codingTestResultsStore: Map<string, CodingTestResult[]> | undefined;
  // eslint-disable-next-line no-var
  var __rubricScoresStore: Map<string, RubricScore[]> | undefined;
  // eslint-disable-next-line no-var
  var __debugDiagnosticsStore: Map<string, DebugDiagnostic[]> | undefined;
  // eslint-disable-next-line no-var
  var __aiFeedbackStore: Map<string, UnifiedAIFeedback> | undefined;
  // eslint-disable-next-line no-var
  var __socraticTurnsStore: Map<string, UnifiedSocraticTurn> | undefined;
  // eslint-disable-next-line no-var
  var __trackAttemptsStore: Map<string, TrackAttempt> | undefined;
}

const contentItems = globalThis.__contentItemsStore ?? new Map<string, ContentItem>();
globalThis.__contentItemsStore = contentItems;

const contentVersions = globalThis.__contentVersionsStore ?? new Map<string, ContentVersion>();
globalThis.__contentVersionsStore = contentVersions;

const submissions = globalThis.__submissionsStore ?? new Map<string, Submission>();
globalThis.__submissionsStore = submissions;

const evaluationRuns = globalThis.__evaluationRunsStore ?? new Map<string, EvaluationRun>();
globalThis.__evaluationRunsStore = evaluationRuns;

const codingTestResults = globalThis.__codingTestResultsStore ?? new Map<string, CodingTestResult[]>();
globalThis.__codingTestResultsStore = codingTestResults;

const rubricScores = globalThis.__rubricScoresStore ?? new Map<string, RubricScore[]>();
globalThis.__rubricScoresStore = rubricScores;

const debugDiagnostics = globalThis.__debugDiagnosticsStore ?? new Map<string, DebugDiagnostic[]>();
globalThis.__debugDiagnosticsStore = debugDiagnostics;

const aiFeedback = globalThis.__aiFeedbackStore ?? new Map<string, UnifiedAIFeedback>();
globalThis.__aiFeedbackStore = aiFeedback;

const socraticTurns = globalThis.__socraticTurnsStore ?? new Map<string, UnifiedSocraticTurn>();
globalThis.__socraticTurnsStore = socraticTurns;

const trackAttempts = globalThis.__trackAttemptsStore ?? new Map<string, TrackAttempt>();
globalThis.__trackAttemptsStore = trackAttempts;

// ============ Content Bank Repository ============

export function createInMemoryContentBankRepo(): ContentBankRepoPort {
  return {
    async listPublishedContent(filter?: ContentFilter): Promise<readonly ContentItemWithVersion[]> {
      const result: ContentItemWithVersion[] = [];

      for (const item of contentItems.values()) {
        // Apply filters
        if (filter?.tenantId !== undefined && item.tenantId !== filter.tenantId) continue;
        if (filter?.track && item.track !== filter.track) continue;
        if (filter?.difficulty && item.difficulty !== filter.difficulty) continue;
        if (filter?.pattern && item.pattern !== filter.pattern) continue;
        if (filter?.rung !== undefined && item.rung !== filter.rung) continue;

        // Find published version
        const publishedVersion = Array.from(contentVersions.values()).find(
          (v) => v.contentItemId === item.id && v.status === 'published'
        );

        if (publishedVersion) {
          result.push({ item, version: publishedVersion });
        }
      }

      // Apply pagination
      const offset = filter?.offset ?? 0;
      const limit = filter?.limit ?? result.length;
      return result.slice(offset, offset + limit);
    },

    async getContentItem(id: ContentItemId): Promise<ContentItem | null> {
      return contentItems.get(id) ?? null;
    },

    async getPublishedContentVersion(contentItemId: ContentItemId): Promise<ContentVersion | null> {
      for (const version of contentVersions.values()) {
        if (version.contentItemId === contentItemId && version.status === 'published') {
          return version;
        }
      }
      return null;
    },

    async getContentVersion(id: ContentVersionId): Promise<ContentVersion | null> {
      return contentVersions.get(id) ?? null;
    },

    async getContentBySlug(
      tenantId: TenantId | null,
      track: Track,
      slug: string
    ): Promise<ContentItemWithVersion | null> {
      for (const item of contentItems.values()) {
        if (item.tenantId === tenantId && item.track === track && item.slug === slug) {
          const version = await this.getPublishedContentVersion(item.id);
          if (version) {
            return { item, version };
          }
        }
      }
      return null;
    },

    async createContentItemDraft(params: {
      tenantId: TenantId | null;
      track: Track;
      slug: string;
      title: string;
      summary?: string | null;
      difficulty: ContentDifficulty;
      pattern?: string | null;
      rung?: number | null;
      tags?: readonly string[];
      estimatedTimeMinutes?: number | null;
      body: ContentBody;
      schemaVersion?: number;
    }): Promise<{ item: ContentItem; version: ContentVersion }> {
      const itemId = randomUUID();
      const versionId = randomUUID();
      const now = new Date();

      const item: ContentItem = {
        id: itemId,
        tenantId: params.tenantId,
        track: params.track,
        slug: params.slug,
        title: params.title,
        summary: params.summary ?? null,
        difficulty: params.difficulty,
        pattern: params.pattern ?? null,
        rung: params.rung ?? null,
        tags: params.tags ?? [],
        estimatedTimeMinutes: params.estimatedTimeMinutes ?? null,
        createdAt: now,
      };

      const version: ContentVersion = {
        id: versionId,
        contentItemId: itemId,
        version: 1,
        status: 'draft',
        body: params.body,
        schemaVersion: params.schemaVersion ?? 1,
        createdAt: now,
        publishedAt: null,
      };

      contentItems.set(itemId, item);
      contentVersions.set(versionId, version);

      return { item, version };
    },

    async createContentVersion(params: {
      contentItemId: ContentItemId;
      body: ContentBody;
      schemaVersion?: number;
    }): Promise<ContentVersion> {
      const existingVersions = Array.from(contentVersions.values()).filter(
        (v) => v.contentItemId === params.contentItemId
      );
      const nextVersion = Math.max(0, ...existingVersions.map((v) => v.version)) + 1;

      const version: ContentVersion = {
        id: randomUUID(),
        contentItemId: params.contentItemId,
        version: nextVersion,
        status: 'draft',
        body: params.body,
        schemaVersion: params.schemaVersion ?? 1,
        createdAt: new Date(),
        publishedAt: null,
      };

      contentVersions.set(version.id, version);
      return version;
    },

    async publishContentVersion(versionId: ContentVersionId): Promise<ContentVersion> {
      const version = contentVersions.get(versionId);
      if (!version) throw new Error('Version not found');

      // Archive any existing published version
      for (const v of contentVersions.values()) {
        if (v.contentItemId === version.contentItemId && v.status === 'published') {
          contentVersions.set(v.id, { ...v, status: 'archived' });
        }
      }

      const published: ContentVersion = {
        ...version,
        status: 'published',
        publishedAt: new Date(),
      };
      contentVersions.set(versionId, published);
      return published;
    },

    async archiveContentVersion(versionId: ContentVersionId): Promise<ContentVersion> {
      const version = contentVersions.get(versionId);
      if (!version) throw new Error('Version not found');

      const archived: ContentVersion = { ...version, status: 'archived' };
      contentVersions.set(versionId, archived);
      return archived;
    },

    async updateContentItem(
      id: ContentItemId,
      updates: Partial<{
        title: string;
        summary: string | null;
        difficulty: ContentDifficulty;
        pattern: string | null;
        rung: number | null;
        tags: readonly string[];
        estimatedTimeMinutes: number | null;
      }>
    ): Promise<ContentItem> {
      const item = contentItems.get(id);
      if (!item) throw new Error('Item not found');

      const updated: ContentItem = { ...item, ...updates };
      contentItems.set(id, updated);
      return updated;
    },

    async countContent(filter?: ContentFilter): Promise<number> {
      const published = await this.listPublishedContent(filter);
      return published.length;
    },
  };
}

// ============ Submissions Repository ============

export function createInMemorySubmissionsRepo(): SubmissionsRepoPort {
  return {
    async createSubmission(params: {
      id: SubmissionId;
      attemptId: string;
      userId: string;
      type: SubmissionType;
      language?: string | null;
      contentText?: string | null;
      contentJson?: SubmissionContent;
      isFinal?: boolean;
    }): Promise<Submission> {
      const submission: Submission = {
        id: params.id,
        attemptId: params.attemptId,
        userId: params.userId,
        type: params.type,
        language: params.language ?? null,
        contentText: params.contentText ?? null,
        contentJson: params.contentJson ?? {},
        isFinal: params.isFinal ?? false,
        createdAt: new Date(),
      };

      submissions.set(params.id, submission);
      return submission;
    },

    async getSubmission(id: SubmissionId): Promise<Submission | null> {
      return submissions.get(id) ?? null;
    },

    async listSubmissionsForAttempt(
      attemptId: string,
      options?: {
        type?: SubmissionType;
        limit?: number;
        offset?: number;
      }
    ): Promise<readonly Submission[]> {
      let result = Array.from(submissions.values()).filter(
        (s) => s.attemptId === attemptId
      );

      if (options?.type) {
        result = result.filter((s) => s.type === options.type);
      }

      result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const offset = options?.offset ?? 0;
      const limit = options?.limit ?? result.length;
      return result.slice(offset, offset + limit);
    },

    async getLatestSubmission(
      attemptId: string,
      type?: SubmissionType
    ): Promise<Submission | null> {
      let result = Array.from(submissions.values()).filter(
        (s) => s.attemptId === attemptId
      );

      if (type) {
        result = result.filter((s) => s.type === type);
      }

      result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return result[0] ?? null;
    },

    async markSubmissionFinal(id: SubmissionId): Promise<Submission> {
      const submission = submissions.get(id);
      if (!submission) throw new Error('Submission not found');

      const updated: Submission = { ...submission, isFinal: true };
      submissions.set(id, updated);
      return updated;
    },

    async countSubmissionsForAttempt(
      attemptId: string,
      type?: SubmissionType
    ): Promise<number> {
      let result = Array.from(submissions.values()).filter(
        (s) => s.attemptId === attemptId
      );

      if (type) {
        result = result.filter((s) => s.type === type);
      }

      return result.length;
    },
  };
}

// ============ Evaluations Repository ============

export function createInMemoryEvaluationsRepo(): EvaluationsRepoPort {
  return {
    async createEvaluationRunQueued(params: {
      id: EvaluationRunId;
      attemptId: string;
      submissionId?: SubmissionId | null;
      userId: string;
      track: Track;
      type: EvaluationType;
    }): Promise<EvaluationRun> {
      const run: EvaluationRun = {
        id: params.id,
        attemptId: params.attemptId,
        submissionId: params.submissionId ?? null,
        userId: params.userId,
        track: params.track,
        type: params.type,
        status: 'queued',
        startedAt: null,
        completedAt: null,
        summary: null,
        details: null,
        createdAt: new Date(),
      };

      evaluationRuns.set(params.id, run);
      return run;
    },

    async getEvaluationRun(id: EvaluationRunId): Promise<EvaluationRun | null> {
      return evaluationRuns.get(id) ?? null;
    },

    async markEvaluationRunRunning(id: EvaluationRunId): Promise<EvaluationRun> {
      const run = evaluationRuns.get(id);
      if (!run) throw new Error('Evaluation run not found');

      const updated: EvaluationRun = {
        ...run,
        status: 'running',
        startedAt: new Date(),
      };
      evaluationRuns.set(id, updated);
      return updated;
    },

    async markEvaluationRunCompleted(
      id: EvaluationRunId,
      params: {
        status: 'succeeded' | 'failed' | 'canceled';
        summary?: EvaluationSummary | null;
        details?: EvaluationDetails | null;
      }
    ): Promise<EvaluationRun> {
      const run = evaluationRuns.get(id);
      if (!run) throw new Error('Evaluation run not found');

      const updated: EvaluationRun = {
        ...run,
        status: params.status,
        summary: params.summary ?? null,
        details: params.details ?? null,
        completedAt: new Date(),
      };
      evaluationRuns.set(id, updated);
      return updated;
    },

    async listEvaluationRunsForAttempt(
      attemptId: string,
      options?: {
        type?: EvaluationType;
        status?: EvaluationStatus;
        limit?: number;
      }
    ): Promise<readonly EvaluationRun[]> {
      let result = Array.from(evaluationRuns.values()).filter(
        (r) => r.attemptId === attemptId
      );

      if (options?.type) {
        result = result.filter((r) => r.type === options.type);
      }
      if (options?.status) {
        result = result.filter((r) => r.status === options.status);
      }

      result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      if (options?.limit) {
        result = result.slice(0, options.limit);
      }

      return result;
    },

    async getLatestEvaluationRun(
      attemptId: string,
      type?: EvaluationType
    ): Promise<EvaluationRun | null> {
      let result = Array.from(evaluationRuns.values()).filter(
        (r) => r.attemptId === attemptId
      );

      if (type) {
        result = result.filter((r) => r.type === type);
      }

      result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return result[0] ?? null;
    },

    async writeCodingTestResults(
      evaluationRunId: EvaluationRunId,
      results: readonly Omit<CodingTestResult, 'evaluationRunId'>[]
    ): Promise<readonly CodingTestResult[]> {
      const fullResults = results.map((r) => ({
        ...r,
        evaluationRunId,
      }));
      codingTestResults.set(evaluationRunId, [...fullResults]);
      return fullResults;
    },

    async getCodingTestResults(
      evaluationRunId: EvaluationRunId
    ): Promise<readonly CodingTestResult[]> {
      return codingTestResults.get(evaluationRunId) ?? [];
    },

    async writeRubricScores(
      evaluationRunId: EvaluationRunId,
      scores: readonly Omit<RubricScore, 'evaluationRunId'>[]
    ): Promise<readonly RubricScore[]> {
      const fullScores = scores.map((s) => ({
        ...s,
        evaluationRunId,
      }));
      rubricScores.set(evaluationRunId, [...fullScores]);
      return fullScores;
    },

    async getRubricScores(
      evaluationRunId: EvaluationRunId
    ): Promise<readonly RubricScore[]> {
      return rubricScores.get(evaluationRunId) ?? [];
    },

    async writeDebugDiagnostics(
      evaluationRunId: EvaluationRunId,
      diagnostics: readonly Omit<DebugDiagnostic, 'evaluationRunId'>[]
    ): Promise<readonly DebugDiagnostic[]> {
      const fullDiagnostics = diagnostics.map((d) => ({
        ...d,
        evaluationRunId,
      }));
      debugDiagnostics.set(evaluationRunId, [...fullDiagnostics]);
      return fullDiagnostics;
    },

    async getDebugDiagnostics(
      evaluationRunId: EvaluationRunId
    ): Promise<readonly DebugDiagnostic[]> {
      return debugDiagnostics.get(evaluationRunId) ?? [];
    },
  };
}

// ============ AI Coach Repository ============

export function createInMemoryAICoachRepo(): UnifiedAICoachRepoPort {
  return {
    async writeAIFeedback(params: {
      id: AIFeedbackId;
      userId: string;
      attemptId?: string | null;
      submissionId?: string | null;
      type: UnifiedAIFeedbackType;
      model: string;
      promptVersion: string;
      inputHash: string;
      output: AIFeedbackOutput;
      evidence?: Record<string, unknown> | null;
    }): Promise<UnifiedAIFeedback> {
      const feedback: UnifiedAIFeedback = {
        id: params.id,
        userId: params.userId,
        attemptId: params.attemptId ?? null,
        submissionId: params.submissionId ?? null,
        type: params.type,
        model: params.model,
        promptVersion: params.promptVersion,
        inputHash: params.inputHash,
        output: params.output,
        evidence: params.evidence ?? null,
        createdAt: new Date(),
      };

      aiFeedback.set(params.id, feedback);
      return feedback;
    },

    async getAIFeedback(id: AIFeedbackId): Promise<UnifiedAIFeedback | null> {
      return aiFeedback.get(id) ?? null;
    },

    async getAIFeedbackByInputHash(inputHash: string): Promise<UnifiedAIFeedback | null> {
      for (const feedback of aiFeedback.values()) {
        if (feedback.inputHash === inputHash) {
          return feedback;
        }
      }
      return null;
    },

    async listAIFeedbackForAttempt(
      attemptId: string,
      options?: {
        type?: UnifiedAIFeedbackType;
        limit?: number;
      }
    ): Promise<readonly UnifiedAIFeedback[]> {
      let result = Array.from(aiFeedback.values()).filter(
        (f) => f.attemptId === attemptId
      );

      if (options?.type) {
        result = result.filter((f) => f.type === options.type);
      }

      result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      if (options?.limit) {
        result = result.slice(0, options.limit);
      }

      return result;
    },

    async appendSocraticTurn(params: {
      id: SocraticTurnId;
      attemptId: string;
      userId: string;
      turnIndex: number;
      role: SocraticRole;
      message: string;
      question?: UnifiedSocraticQuestion | null;
      validation?: SocraticValidation | null;
    }): Promise<UnifiedSocraticTurn> {
      const turn: UnifiedSocraticTurn = {
        id: params.id,
        attemptId: params.attemptId,
        userId: params.userId,
        turnIndex: params.turnIndex,
        role: params.role,
        message: params.message,
        question: params.question ?? null,
        validation: params.validation ?? null,
        createdAt: new Date(),
      };

      socraticTurns.set(params.id, turn);
      return turn;
    },

    async getSocraticTurn(id: SocraticTurnId): Promise<UnifiedSocraticTurn | null> {
      return socraticTurns.get(id) ?? null;
    },

    async listSocraticTurns(
      attemptId: string,
      options?: {
        limit?: number;
        offset?: number;
      }
    ): Promise<readonly UnifiedSocraticTurn[]> {
      let result = Array.from(socraticTurns.values()).filter(
        (t) => t.attemptId === attemptId
      );

      result.sort((a, b) => a.turnIndex - b.turnIndex);

      const offset = options?.offset ?? 0;
      const limit = options?.limit ?? result.length;
      return result.slice(offset, offset + limit);
    },

    async getLatestTurnIndex(attemptId: string): Promise<number> {
      const turns = Array.from(socraticTurns.values()).filter(
        (t) => t.attemptId === attemptId
      );

      if (turns.length === 0) return -1;
      return Math.max(...turns.map((t) => t.turnIndex));
    },

    async countSocraticTurns(attemptId: string): Promise<number> {
      return Array.from(socraticTurns.values()).filter(
        (t) => t.attemptId === attemptId
      ).length;
    },
  };
}

// ============ Track Attempt Repository ============

export function createInMemoryTrackAttemptRepo(): TrackAttemptRepo {
  return {
    async create(params: Omit<TrackAttempt, 'completedAt'>): Promise<TrackAttempt> {
      const attempt: TrackAttempt = {
        ...params,
        completedAt: null,
      };

      trackAttempts.set(params.id, attempt);
      return attempt;
    },

    async findById(tenantId: string, id: string): Promise<TrackAttempt | null> {
      const attempt = trackAttempts.get(id);
      if (!attempt || attempt.tenantId !== tenantId) return null;
      return attempt;
    },

    async findActiveByContent(
      tenantId: string,
      userId: string,
      contentItemId: string
    ): Promise<TrackAttempt | null> {
      for (const attempt of trackAttempts.values()) {
        if (
          attempt.tenantId === tenantId &&
          attempt.userId === userId &&
          attempt.contentItemId === contentItemId &&
          attempt.status === 'active'
        ) {
          return attempt;
        }
      }
      return null;
    },

    async update(attempt: TrackAttempt): Promise<TrackAttempt> {
      trackAttempts.set(attempt.id, attempt);
      return attempt;
    },
  };
}
