/**
 * Approve and Publish Use Case
 *
 * Approves candidates and publishes them to the content bank.
 * This is the final step in the generation pipeline.
 */

import {
  normalizeProblemSpecToContentBody,
  extractContentMetadata,
  type ProblemSpecV1,
} from '@scaffold/contracts';
import type {
  GeneratorRepoPort,
  GeneratedCandidateId,
  PatternLadderId,
} from '../../ports/generator-repo.js';
import type { ContentBankRepoPort } from '../../ports/content-bank-repo.js';
import type { IdGenerator } from '../../ports/id-generator.js';

export interface ApproveCandidatesInput {
  candidateIds: GeneratedCandidateId[];
  approvedBy?: string;
}

export interface ApproveCandidatesOutput {
  approvedCount: number;
  alreadyApproved: number;
  errors: Array<{ candidateId: string; error: string }>;
}

export interface PublishCandidatesInput {
  candidateIds: GeneratedCandidateId[];
  ladderId?: PatternLadderId;
  publishedBy?: string;
}

export interface PublishedItem {
  candidateId: GeneratedCandidateId;
  contentItemId: string;
  contentVersionId: string;
  nodeId?: string;
}

export interface PublishCandidatesOutput {
  publishedItems: PublishedItem[];
  errors: Array<{ candidateId: string; error: string }>;
}

export interface ApproveAndPublishDeps {
  generatorRepo: GeneratorRepoPort;
  contentBankRepo: ContentBankRepoPort;
  idGenerator: IdGenerator;
}

/**
 * Approve candidates for publishing
 */
export async function approveCandidates(
  input: ApproveCandidatesInput,
  deps: ApproveAndPublishDeps
): Promise<ApproveCandidatesOutput> {
  const { generatorRepo } = deps;
  let approvedCount = 0;
  let alreadyApproved = 0;
  const errors: Array<{ candidateId: string; error: string }> = [];

  for (const candidateId of input.candidateIds) {
    try {
      const candidate = await generatorRepo.getCandidate(candidateId);
      if (!candidate) {
        errors.push({ candidateId, error: 'Candidate not found' });
        continue;
      }

      if (candidate.status === 'approved') {
        alreadyApproved++;
        continue;
      }

      if (candidate.status === 'published') {
        alreadyApproved++;
        continue;
      }

      if (candidate.status === 'rejected') {
        errors.push({ candidateId, error: 'Cannot approve rejected candidate' });
        continue;
      }

      // Check validation
      if (candidate.validation && !candidate.validation.isValid) {
        errors.push({ candidateId, error: 'Candidate has validation errors' });
        continue;
      }

      await generatorRepo.updateCandidateStatus(candidateId, 'approved');
      approvedCount++;
    } catch (error) {
      errors.push({
        candidateId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { approvedCount, alreadyApproved, errors };
}

/**
 * Reject candidates
 */
export async function rejectCandidates(
  candidateIds: GeneratedCandidateId[],
  deps: { generatorRepo: GeneratorRepoPort }
): Promise<{ rejectedCount: number; errors: Array<{ candidateId: string; error: string }> }> {
  const { generatorRepo } = deps;
  let rejectedCount = 0;
  const errors: Array<{ candidateId: string; error: string }> = [];

  for (const candidateId of candidateIds) {
    try {
      const candidate = await generatorRepo.getCandidate(candidateId);
      if (!candidate) {
        errors.push({ candidateId, error: 'Candidate not found' });
        continue;
      }

      if (candidate.status === 'published') {
        errors.push({ candidateId, error: 'Cannot reject published candidate' });
        continue;
      }

      await generatorRepo.updateCandidateStatus(candidateId, 'rejected');
      rejectedCount++;
    } catch (error) {
      errors.push({
        candidateId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { rejectedCount, errors };
}

/**
 * Publish approved candidates to content bank
 */
export async function publishCandidates(
  input: PublishCandidatesInput,
  deps: ApproveAndPublishDeps
): Promise<PublishCandidatesOutput> {
  const { generatorRepo, contentBankRepo, idGenerator } = deps;
  const publishedItems: PublishedItem[] = [];
  const errors: Array<{ candidateId: string; error: string }> = [];

  for (const candidateId of input.candidateIds) {
    try {
      const candidate = await generatorRepo.getCandidate(candidateId);
      if (!candidate) {
        errors.push({ candidateId, error: 'Candidate not found' });
        continue;
      }

      if (candidate.status !== 'approved') {
        errors.push({ candidateId, error: `Cannot publish candidate with status: ${candidate.status}` });
        continue;
      }

      // Create content item and version
      const result = await createContentFromCandidate(
        candidate.candidate,
        candidate.level,
        { contentBankRepo, idGenerator }
      );

      // Mark as published
      await generatorRepo.updateCandidateStatus(candidateId, 'published');

      // Add to ladder if specified
      let nodeId: string | undefined;
      if (input.ladderId) {
        // Get existing nodes at this level to determine position
        const existingNodes = await generatorRepo.getLadderNodesAtLevel(
          input.ladderId,
          candidate.level
        );
        const nextPosition = existingNodes.length;

        const node = await generatorRepo.addLadderNode({
          ladderId: input.ladderId,
          contentItemId: result.contentItemId,
          level: candidate.level,
          position: nextPosition,
          variantTag: extractVariantTag(candidate.candidate),
        });
        nodeId = node.id;
      }

      publishedItems.push({
        candidateId,
        contentItemId: result.contentItemId,
        contentVersionId: result.contentVersionId,
        nodeId,
      });
    } catch (error) {
      errors.push({
        candidateId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { publishedItems, errors };
}

/**
 * Create content item and version from a problem spec
 */
async function createContentFromCandidate(
  spec: ProblemSpecV1,
  level: number,
  deps: { contentBankRepo: ContentBankRepoPort; idGenerator: IdGenerator }
): Promise<{ contentItemId: string; contentVersionId: string }> {
  const { contentBankRepo } = deps;

  // Convert spec to content body
  const body = normalizeProblemSpecToContentBody(spec);
  const metadata = extractContentMetadata(body);

  // Generate slug from title
  const slug = generateSlug(spec.title);

  // Map difficulty to ContentDifficulty
  const difficulty = mapDifficulty(spec.difficulty);

  // Create content item with draft version
  const result = await contentBankRepo.createContentItemDraft({
    tenantId: null, // Global content
    track: 'coding_interview',
    slug,
    title: spec.title,
    summary: spec.summary,
    difficulty,
    pattern: spec.patternIds[0] ?? null,
    rung: level,
    tags: [...spec.categories, ...spec.patternIds],
    estimatedTimeMinutes: metadata.estimatedTimeMinutes,
    body,
    schemaVersion: 1,
  });

  // Publish the version
  const publishedVersion = await contentBankRepo.publishContentVersion(result.version.id);

  return {
    contentItemId: result.item.id,
    contentVersionId: publishedVersion.id,
  };
}

/**
 * Generate a URL-safe slug from a title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/**
 * Map ProblemDifficulty to ContentDifficulty
 */
function mapDifficulty(difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT'): 'easy' | 'medium' | 'hard' {
  switch (difficulty) {
    case 'EASY':
      return 'easy';
    case 'MEDIUM':
      return 'medium';
    case 'HARD':
    case 'EXPERT':
      return 'hard';
  }
}

/**
 * Extract a variant tag from the problem spec
 */
function extractVariantTag(spec: ProblemSpecV1): string | null {
  // Try to detect the main data structure from categories or problem
  const text = `${spec.title} ${spec.summary} ${spec.statement.prompt}`.toLowerCase();

  if (text.includes('tree') || text.includes('binary')) return 'tree';
  if (text.includes('graph') || text.includes('vertex') || text.includes('edge')) return 'graph';
  if (text.includes('linked list') || text.includes('node')) return 'linked-list';
  if (text.includes('string') || text.includes('character') || text.includes('substring')) return 'string';
  if (text.includes('array') || text.includes('list') || text.includes('element')) return 'array';
  if (text.includes('matrix') || text.includes('grid') || text.includes('2d')) return 'matrix';
  if (text.includes('hash') || text.includes('map') || text.includes('dictionary')) return 'hash';
  if (text.includes('stack') || text.includes('queue')) return 'stack-queue';

  return null;
}

/**
 * Bulk approve and publish all valid candidates from a run
 */
export async function approveAndPublishRun(
  runId: string,
  deps: ApproveAndPublishDeps
): Promise<{
  approvedCount: number;
  publishedCount: number;
  errors: Array<{ candidateId: string; error: string }>;
}> {
  const { generatorRepo } = deps;

  // Get the run
  const run = await generatorRepo.getRun(runId);
  if (!run) {
    throw new Error(`Run not found: ${runId}`);
  }

  // Get all proposed candidates
  const candidates = await generatorRepo.listCandidatesForRun(runId, { status: 'proposed' });

  // Approve all valid candidates
  const candidateIds = candidates
    .filter(c => !c.validation || c.validation.isValid)
    .map(c => c.id);

  const approveResult = await approveCandidates({ candidateIds }, deps);

  // Publish all approved candidates
  const approvedCandidates = await generatorRepo.listCandidatesForRun(runId, { status: 'approved' });
  const publishResult = await publishCandidates(
    {
      candidateIds: approvedCandidates.map(c => c.id),
      ladderId: run.ladderId ?? undefined,
    },
    deps
  );

  return {
    approvedCount: approveResult.approvedCount,
    publishedCount: publishResult.publishedItems.length,
    errors: [...approveResult.errors, ...publishResult.errors],
  };
}
