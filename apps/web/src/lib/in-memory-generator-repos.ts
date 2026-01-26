/**
 * In-Memory Generator Repository Implementation
 *
 * Provides in-memory storage for pattern ladders, generation runs,
 * and generated candidates when a database is not configured.
 */

import { randomUUID } from 'crypto';
import type {
  GeneratorRepoPort,
  PatternLadder,
  PatternLadderId,
  LadderNode,
  LadderNodeId,
  ContentItemEdge,
  ContentItemEdgeId,
  GenerationRun,
  GenerationRunId,
  GeneratedCandidate,
  GeneratedCandidateId,
  CandidateStatus,
  GenerationStatus,
  GenerationMetrics,
  CandidateValidation,
  EdgeType,
} from '@scaffold/core/ports';
import type { ProblemSpecV1 } from '@scaffold/contracts';

// ============ Global State (persists across hot reloads) ============

declare global {
  // eslint-disable-next-line no-var
  var __patternLaddersStore: Map<string, PatternLadder> | undefined;
  // eslint-disable-next-line no-var
  var __ladderNodesStore: Map<string, LadderNode> | undefined;
  // eslint-disable-next-line no-var
  var __contentItemEdgesStore: Map<string, ContentItemEdge> | undefined;
  // eslint-disable-next-line no-var
  var __generationRunsStore: Map<string, GenerationRun> | undefined;
  // eslint-disable-next-line no-var
  var __generatedCandidatesStore: Map<string, GeneratedCandidate> | undefined;
}

const patternLadders = globalThis.__patternLaddersStore ?? new Map<string, PatternLadder>();
globalThis.__patternLaddersStore = patternLadders;

const ladderNodes = globalThis.__ladderNodesStore ?? new Map<string, LadderNode>();
globalThis.__ladderNodesStore = ladderNodes;

const contentItemEdges = globalThis.__contentItemEdgesStore ?? new Map<string, ContentItemEdge>();
globalThis.__contentItemEdgesStore = contentItemEdges;

const generationRuns = globalThis.__generationRunsStore ?? new Map<string, GenerationRun>();
globalThis.__generationRunsStore = generationRuns;

const generatedCandidates = globalThis.__generatedCandidatesStore ?? new Map<string, GeneratedCandidate>();
globalThis.__generatedCandidatesStore = generatedCandidates;

// ============ In-Memory Generator Repository ============

export function createInMemoryGeneratorRepo(): GeneratorRepoPort {
  return {
    // ============ Pattern Ladders ============

    async createLadder(params: {
      track: string;
      patternId: string;
      name: string;
      description?: string | null;
    }): Promise<PatternLadder> {
      const id = randomUUID();
      const now = new Date();

      const ladder: PatternLadder = {
        id,
        track: params.track,
        patternId: params.patternId,
        name: params.name,
        description: params.description ?? null,
        createdAt: now,
        updatedAt: now,
      };

      patternLadders.set(id, ladder);
      return ladder;
    },

    async getLadder(id: PatternLadderId): Promise<PatternLadder | null> {
      return patternLadders.get(id) ?? null;
    },

    async findLadderByPattern(track: string, patternId: string): Promise<PatternLadder | null> {
      for (const ladder of patternLadders.values()) {
        if (ladder.track === track && ladder.patternId === patternId) {
          return ladder;
        }
      }
      return null;
    },

    async listLadders(track: string): Promise<readonly PatternLadder[]> {
      return Array.from(patternLadders.values())
        .filter(l => l.track === track)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },

    async updateLadder(
      id: PatternLadderId,
      updates: Partial<{ name: string; description: string | null }>
    ): Promise<PatternLadder> {
      const ladder = patternLadders.get(id);
      if (!ladder) {
        throw new Error(`Ladder not found: ${id}`);
      }

      const updated: PatternLadder = {
        ...ladder,
        ...updates,
        updatedAt: new Date(),
      };

      patternLadders.set(id, updated);
      return updated;
    },

    // ============ Ladder Nodes ============

    async addLadderNode(params: {
      ladderId: PatternLadderId;
      contentItemId: string;
      level: number;
      position: number;
      variantTag?: string | null;
    }): Promise<LadderNode> {
      const id = randomUUID();

      const node: LadderNode = {
        id,
        ladderId: params.ladderId,
        contentItemId: params.contentItemId,
        level: params.level,
        position: params.position,
        variantTag: params.variantTag ?? null,
        createdAt: new Date(),
      };

      ladderNodes.set(id, node);
      return node;
    },

    async getLadderNodes(ladderId: PatternLadderId): Promise<readonly LadderNode[]> {
      return Array.from(ladderNodes.values())
        .filter(n => n.ladderId === ladderId)
        .sort((a, b) => a.level - b.level || a.position - b.position);
    },

    async getLadderNodesAtLevel(ladderId: PatternLadderId, level: number): Promise<readonly LadderNode[]> {
      return Array.from(ladderNodes.values())
        .filter(n => n.ladderId === ladderId && n.level === level)
        .sort((a, b) => a.position - b.position);
    },

    async removeLadderNode(id: LadderNodeId): Promise<void> {
      ladderNodes.delete(id);
    },

    // ============ Content Item Edges ============

    async createEdge(params: {
      fromContentItemId: string;
      toContentItemId: string;
      edgeType: EdgeType;
      reason?: string | null;
    }): Promise<ContentItemEdge> {
      // Check for existing edge
      for (const edge of contentItemEdges.values()) {
        if (
          edge.fromContentItemId === params.fromContentItemId &&
          edge.toContentItemId === params.toContentItemId &&
          edge.edgeType === params.edgeType
        ) {
          throw new Error('Edge already exists (unique constraint violation)');
        }
      }

      const id = randomUUID();

      const edge: ContentItemEdge = {
        id,
        fromContentItemId: params.fromContentItemId,
        toContentItemId: params.toContentItemId,
        edgeType: params.edgeType,
        reason: params.reason ?? null,
        createdAt: new Date(),
      };

      contentItemEdges.set(id, edge);
      return edge;
    },

    async getOutgoingEdges(contentItemId: string): Promise<readonly ContentItemEdge[]> {
      return Array.from(contentItemEdges.values())
        .filter(e => e.fromContentItemId === contentItemId);
    },

    async getIncomingEdges(contentItemId: string): Promise<readonly ContentItemEdge[]> {
      return Array.from(contentItemEdges.values())
        .filter(e => e.toContentItemId === contentItemId);
    },

    async deleteEdge(id: ContentItemEdgeId): Promise<void> {
      contentItemEdges.delete(id);
    },

    // ============ Generation Runs ============

    async createRun(params: {
      id: GenerationRunId;
      track: string;
      patternId: string;
      ladderId?: PatternLadderId | null;
      targetCount: number;
      promptVersion: string;
      model: string;
      inputHash: string;
      createdBy?: string | null;
    }): Promise<GenerationRun> {
      const run: GenerationRun = {
        id: params.id,
        track: params.track,
        patternId: params.patternId,
        ladderId: params.ladderId ?? null,
        targetCount: params.targetCount,
        promptVersion: params.promptVersion,
        model: params.model,
        inputHash: params.inputHash,
        status: 'queued',
        metrics: null,
        createdBy: params.createdBy ?? null,
        createdAt: new Date(),
        completedAt: null,
      };

      generationRuns.set(params.id, run);
      return run;
    },

    async getRun(id: GenerationRunId): Promise<GenerationRun | null> {
      return generationRuns.get(id) ?? null;
    },

    async findRunByInputHash(inputHash: string): Promise<GenerationRun | null> {
      for (const run of generationRuns.values()) {
        if (run.inputHash === inputHash) {
          return run;
        }
      }
      return null;
    },

    async markRunRunning(id: GenerationRunId): Promise<GenerationRun> {
      const run = generationRuns.get(id);
      if (!run) {
        throw new Error(`Run not found: ${id}`);
      }

      const updated: GenerationRun = {
        ...run,
        status: 'running',
      };

      generationRuns.set(id, updated);
      return updated;
    },

    async markRunCompleted(
      id: GenerationRunId,
      params: {
        status: 'succeeded' | 'failed';
        metrics?: GenerationMetrics | null;
      }
    ): Promise<GenerationRun> {
      const run = generationRuns.get(id);
      if (!run) {
        throw new Error(`Run not found: ${id}`);
      }

      const updated: GenerationRun = {
        ...run,
        status: params.status,
        metrics: params.metrics ?? null,
        completedAt: new Date(),
      };

      generationRuns.set(id, updated);
      return updated;
    },

    async listRuns(options?: {
      track?: string;
      patternId?: string;
      status?: GenerationStatus;
      limit?: number;
    }): Promise<readonly GenerationRun[]> {
      let result = Array.from(generationRuns.values());

      if (options?.track) {
        result = result.filter(r => r.track === options.track);
      }
      if (options?.patternId) {
        result = result.filter(r => r.patternId === options.patternId);
      }
      if (options?.status) {
        result = result.filter(r => r.status === options.status);
      }

      result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      if (options?.limit) {
        result = result.slice(0, options.limit);
      }

      return result;
    },

    // ============ Generated Candidates ============

    async createCandidate(params: {
      id: GeneratedCandidateId;
      runId: GenerationRunId;
      level: number;
      candidate: ProblemSpecV1;
      validation?: CandidateValidation | null;
      status?: CandidateStatus;
    }): Promise<GeneratedCandidate> {
      const candidate: GeneratedCandidate = {
        id: params.id,
        runId: params.runId,
        level: params.level,
        candidate: params.candidate,
        validation: params.validation ?? null,
        status: params.status ?? 'proposed',
        createdAt: new Date(),
      };

      generatedCandidates.set(params.id, candidate);
      return candidate;
    },

    async getCandidate(id: GeneratedCandidateId): Promise<GeneratedCandidate | null> {
      return generatedCandidates.get(id) ?? null;
    },

    async listCandidatesForRun(
      runId: GenerationRunId,
      options?: {
        status?: CandidateStatus;
        level?: number;
      }
    ): Promise<readonly GeneratedCandidate[]> {
      let result = Array.from(generatedCandidates.values())
        .filter(c => c.runId === runId);

      if (options?.status) {
        result = result.filter(c => c.status === options.status);
      }
      if (options?.level !== undefined) {
        result = result.filter(c => c.level === options.level);
      }

      result.sort((a, b) => a.level - b.level || a.createdAt.getTime() - b.createdAt.getTime());

      return result;
    },

    async updateCandidateStatus(
      id: GeneratedCandidateId,
      status: CandidateStatus
    ): Promise<GeneratedCandidate> {
      const candidate = generatedCandidates.get(id);
      if (!candidate) {
        throw new Error(`Candidate not found: ${id}`);
      }

      const updated: GeneratedCandidate = {
        ...candidate,
        status,
      };

      generatedCandidates.set(id, updated);
      return updated;
    },

    async updateCandidateValidation(
      id: GeneratedCandidateId,
      validation: CandidateValidation
    ): Promise<GeneratedCandidate> {
      const candidate = generatedCandidates.get(id);
      if (!candidate) {
        throw new Error(`Candidate not found: ${id}`);
      }

      const updated: GeneratedCandidate = {
        ...candidate,
        validation,
      };

      generatedCandidates.set(id, updated);
      return updated;
    },

    async bulkUpdateCandidateStatus(
      ids: GeneratedCandidateId[],
      status: CandidateStatus
    ): Promise<number> {
      let count = 0;

      for (const id of ids) {
        const candidate = generatedCandidates.get(id);
        if (candidate) {
          generatedCandidates.set(id, { ...candidate, status });
          count++;
        }
      }

      return count;
    },

    async getAllExistingTitles(track: string): Promise<string[]> {
      const titles: string[] = [];

      // Get titles from published candidates
      for (const candidate of generatedCandidates.values()) {
        if (candidate.status === 'published') {
          titles.push(candidate.candidate.title);
        }
      }

      // In a real implementation, this would also query the content bank
      // For the in-memory version, we just return titles from candidates

      return titles;
    },
  };
}

/**
 * Reset all in-memory generator stores (useful for testing)
 */
export function resetInMemoryGeneratorStores(): void {
  patternLadders.clear();
  ladderNodes.clear();
  contentItemEdges.clear();
  generationRuns.clear();
  generatedCandidates.clear();
}

/**
 * Get statistics about in-memory stores (useful for debugging)
 */
export function getInMemoryGeneratorStats(): {
  ladders: number;
  nodes: number;
  edges: number;
  runs: number;
  candidates: number;
} {
  return {
    ladders: patternLadders.size,
    nodes: ladderNodes.size,
    edges: contentItemEdges.size,
    runs: generationRuns.size,
    candidates: generatedCandidates.size,
  };
}
