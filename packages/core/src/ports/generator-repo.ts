/**
 * Generator Repository Port - interface for generation data access
 *
 * This port defines the contract for accessing pattern ladders,
 * generation runs, and generated candidates.
 */

import type { ProblemSpecV1 } from '@scaffold/contracts';

// ============ Entity Types ============

export type GenerationRunId = string;
export type GeneratedCandidateId = string;
export type PatternLadderId = string;
export type LadderNodeId = string;
export type ContentItemEdgeId = string;

export type GenerationStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type CandidateStatus = 'proposed' | 'approved' | 'rejected' | 'published';
export type EdgeType = 'prereq' | 'recommended' | 'remediation';

/**
 * Pattern Ladder - organized difficulty progression
 */
export interface PatternLadder {
  readonly id: PatternLadderId;
  readonly track: string;
  readonly patternId: string;
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Ladder Node - problem within a ladder
 */
export interface LadderNode {
  readonly id: LadderNodeId;
  readonly ladderId: PatternLadderId;
  readonly contentItemId: string;
  readonly level: number;
  readonly position: number;
  readonly variantTag: string | null;
  readonly createdAt: Date;
}

/**
 * Content Item Edge - prerequisite/relationship between content
 */
export interface ContentItemEdge {
  readonly id: ContentItemEdgeId;
  readonly fromContentItemId: string;
  readonly toContentItemId: string;
  readonly edgeType: EdgeType;
  readonly reason: string | null;
  readonly createdAt: Date;
}

/**
 * Generation Run - tracks a generation job
 */
export interface GenerationRun {
  readonly id: GenerationRunId;
  readonly track: string;
  readonly patternId: string;
  readonly ladderId: PatternLadderId | null;
  readonly targetCount: number;
  readonly promptVersion: string;
  readonly model: string;
  readonly inputHash: string;
  readonly status: GenerationStatus;
  readonly metrics: GenerationMetrics | null;
  readonly createdBy: string | null;
  readonly createdAt: Date;
  readonly completedAt: Date | null;
}

/**
 * Generation metrics
 */
export interface GenerationMetrics {
  totalGenerated: number;
  validCount: number;
  duplicatesRemoved: number;
  tokensUsed?: number;
  durationMs?: number;
}

/**
 * Validation result for a candidate
 */
export interface CandidateValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  similarTo?: string[]; // IDs of similar existing problems
  dedupeScore?: number;
}

/**
 * Generated Candidate - problem from a generation run
 */
export interface GeneratedCandidate {
  readonly id: GeneratedCandidateId;
  readonly runId: GenerationRunId;
  readonly level: number;
  readonly candidate: ProblemSpecV1;
  readonly validation: CandidateValidation | null;
  readonly status: CandidateStatus;
  readonly createdAt: Date;
}

// ============ Repository Port ============

/**
 * Generator Repository Port
 */
export interface GeneratorRepoPort {
  // ============ Pattern Ladders ============

  /**
   * Create a new pattern ladder
   */
  createLadder(params: {
    track: string;
    patternId: string;
    name: string;
    description?: string | null;
  }): Promise<PatternLadder>;

  /**
   * Get a ladder by ID
   */
  getLadder(id: PatternLadderId): Promise<PatternLadder | null>;

  /**
   * Find ladder by track and pattern
   */
  findLadderByPattern(track: string, patternId: string): Promise<PatternLadder | null>;

  /**
   * List all ladders for a track
   */
  listLadders(track: string): Promise<readonly PatternLadder[]>;

  /**
   * Update a ladder
   */
  updateLadder(
    id: PatternLadderId,
    updates: Partial<{ name: string; description: string | null }>
  ): Promise<PatternLadder>;

  // ============ Ladder Nodes ============

  /**
   * Add a node to a ladder
   */
  addLadderNode(params: {
    ladderId: PatternLadderId;
    contentItemId: string;
    level: number;
    position: number;
    variantTag?: string | null;
  }): Promise<LadderNode>;

  /**
   * Get nodes for a ladder
   */
  getLadderNodes(ladderId: PatternLadderId): Promise<readonly LadderNode[]>;

  /**
   * Get nodes at a specific level
   */
  getLadderNodesAtLevel(ladderId: PatternLadderId, level: number): Promise<readonly LadderNode[]>;

  /**
   * Remove a node from a ladder
   */
  removeLadderNode(id: LadderNodeId): Promise<void>;

  // ============ Content Item Edges ============

  /**
   * Create an edge between content items
   */
  createEdge(params: {
    fromContentItemId: string;
    toContentItemId: string;
    edgeType: EdgeType;
    reason?: string | null;
  }): Promise<ContentItemEdge>;

  /**
   * Get outgoing edges from a content item
   */
  getOutgoingEdges(contentItemId: string): Promise<readonly ContentItemEdge[]>;

  /**
   * Get incoming edges to a content item
   */
  getIncomingEdges(contentItemId: string): Promise<readonly ContentItemEdge[]>;

  /**
   * Delete an edge
   */
  deleteEdge(id: ContentItemEdgeId): Promise<void>;

  // ============ Generation Runs ============

  /**
   * Create a new generation run (queued status)
   */
  createRun(params: {
    id: GenerationRunId;
    track: string;
    patternId: string;
    ladderId?: PatternLadderId | null;
    targetCount: number;
    promptVersion: string;
    model: string;
    inputHash: string;
    createdBy?: string | null;
  }): Promise<GenerationRun>;

  /**
   * Get a run by ID
   */
  getRun(id: GenerationRunId): Promise<GenerationRun | null>;

  /**
   * Find run by input hash (for idempotency)
   */
  findRunByInputHash(inputHash: string): Promise<GenerationRun | null>;

  /**
   * Mark run as running
   */
  markRunRunning(id: GenerationRunId): Promise<GenerationRun>;

  /**
   * Mark run as completed (succeeded/failed)
   */
  markRunCompleted(
    id: GenerationRunId,
    params: {
      status: 'succeeded' | 'failed';
      metrics?: GenerationMetrics | null;
    }
  ): Promise<GenerationRun>;

  /**
   * List runs for a pattern
   */
  listRuns(options?: {
    track?: string;
    patternId?: string;
    status?: GenerationStatus;
    limit?: number;
  }): Promise<readonly GenerationRun[]>;

  // ============ Generated Candidates ============

  /**
   * Create a candidate
   */
  createCandidate(params: {
    id: GeneratedCandidateId;
    runId: GenerationRunId;
    level: number;
    candidate: ProblemSpecV1;
    validation?: CandidateValidation | null;
    status?: CandidateStatus;
  }): Promise<GeneratedCandidate>;

  /**
   * Get a candidate by ID
   */
  getCandidate(id: GeneratedCandidateId): Promise<GeneratedCandidate | null>;

  /**
   * List candidates for a run
   */
  listCandidatesForRun(
    runId: GenerationRunId,
    options?: {
      status?: CandidateStatus;
      level?: number;
    }
  ): Promise<readonly GeneratedCandidate[]>;

  /**
   * Update candidate status
   */
  updateCandidateStatus(
    id: GeneratedCandidateId,
    status: CandidateStatus
  ): Promise<GeneratedCandidate>;

  /**
   * Update candidate validation
   */
  updateCandidateValidation(
    id: GeneratedCandidateId,
    validation: CandidateValidation
  ): Promise<GeneratedCandidate>;

  /**
   * Bulk update candidate statuses
   */
  bulkUpdateCandidateStatus(
    ids: GeneratedCandidateId[],
    status: CandidateStatus
  ): Promise<number>;

  /**
   * Get all existing titles for deduplication
   */
  getAllExistingTitles(track: string): Promise<string[]>;
}
