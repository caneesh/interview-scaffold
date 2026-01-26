/**
 * Bulk Generate Patterns Use Case
 *
 * Generates problems for multiple patterns in one operation with:
 * - Concurrency control (worker pool)
 * - Idempotency (skip if same input_hash exists)
 * - Auto-approve policy (optional)
 * - Auto-publish (optional)
 */

import { computeInputHash } from '@scaffold/contracts';
import type {
  GeneratorRepoPort,
  GenerationRun,
  GeneratedCandidate,
} from '../../ports/generator-repo.js';
import type { ContentBankRepoPort } from '../../ports/content-bank-repo.js';
import type { LLMGeneratorPort } from '../../ports/llm-generator-port.js';
import type { IdGenerator } from '../../ports/id-generator.js';
import { computeSeed, type SeedStrategy } from '../../services/seed-strategy.js';
import { autoApproveCandidate } from '../../services/auto-approve-policy.js';
import { createGenerationRun } from './create-generation-run.js';
import { generateCandidates } from './generate-candidates.js';
import { approveCandidates, publishCandidates } from './approve-and-publish.js';

export interface BulkGenerateInput {
  track: 'coding_interview';
  patternIds: string[];
  targetCountPerPattern: number;
  promptVersion: string;
  seedStrategy?: SeedStrategy;
  concurrency?: number;
  autoApprove?: boolean;
  publishAfterApprove?: boolean;
  dryRun?: boolean;
  force?: boolean; // Force regeneration even if run exists
  createdBy?: string;
}

export interface BulkGenerateSummary {
  totalPatterns: number;
  succeeded: number;
  failed: number;
  skipped: number;
  totalCandidatesProposed: number;
  totalApproved: number;
  totalPublished: number;
  durationMs: number;
}

export interface PatternResult {
  patternId: string;
  runId?: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped';
  proposed: number;
  approved: number;
  published: number;
  error?: string;
  durationMs?: number;
}

export interface BulkGenerateOutput {
  summary: BulkGenerateSummary;
  perPattern: PatternResult[];
}

export interface BulkGenerateDeps {
  generatorRepo: GeneratorRepoPort;
  contentBankRepo: ContentBankRepoPort;
  llmGenerator: LLMGeneratorPort;
  idGenerator: IdGenerator;
}

/**
 * Bulk generate problems for multiple patterns
 *
 * This orchestrates:
 * 1. Computing input hashes for each pattern
 * 2. Checking for existing runs (idempotency)
 * 3. Running generation with concurrency control
 * 4. Optionally auto-approving based on policy
 * 5. Optionally publishing approved candidates
 */
export async function bulkGeneratePatterns(
  input: BulkGenerateInput,
  deps: BulkGenerateDeps
): Promise<BulkGenerateOutput> {
  const {
    track,
    patternIds,
    targetCountPerPattern,
    promptVersion,
    seedStrategy = 'increment',
    concurrency = 3,
    autoApprove = false,
    publishAfterApprove = false,
    dryRun = false,
    force = false,
    createdBy,
  } = input;

  const startTime = Date.now();
  const results: PatternResult[] = [];

  // Initialize all patterns as queued
  for (const patternId of patternIds) {
    results.push({
      patternId,
      status: 'queued',
      proposed: 0,
      approved: 0,
      published: 0,
    });
  }

  // Create a worker pool for concurrent processing
  const workers: Promise<void>[] = [];
  let currentIndex = 0;

  const processPattern = async (patternIndex: number) => {
    const patternId = patternIds[patternIndex];
    if (!patternId) return;

    const result = results[patternIndex];
    if (!result) return;

    const patternStartTime = Date.now();
    result.status = 'running';

    try {
      // Compute seed based on strategy
      const seed = computeSeed({
        strategy: seedStrategy,
        patternId,
        patternIndex,
      });

      // Compute input hash for idempotency
      const inputHash = computeInputHash(patternId, promptVersion, seed);

      // Check for existing run
      const existingRun = await deps.generatorRepo.findRunByInputHash(inputHash);
      if (existingRun && !force) {
        // Skip - already generated
        result.status = 'skipped';
        result.runId = existingRun.id;

        // Get metrics from existing run
        if (existingRun.metrics) {
          result.proposed = existingRun.metrics.validCount ?? 0;
        }

        // Count approved/published from existing run
        const candidates = await deps.generatorRepo.listCandidatesForRun(existingRun.id);
        result.approved = candidates.filter(c => c.status === 'approved' || c.status === 'published').length;
        result.published = candidates.filter(c => c.status === 'published').length;
        result.durationMs = 0;
        return;
      }

      if (dryRun) {
        // Dry run - don't actually generate
        result.status = 'succeeded';
        result.proposed = targetCountPerPattern;
        result.durationMs = Date.now() - patternStartTime;
        return;
      }

      // Create generation run
      const { run, isNew } = await createGenerationRun(
        {
          track,
          patternId,
          targetCount: targetCountPerPattern,
          promptVersion,
          model: deps.llmGenerator.getModelId(),
          seed,
          createdBy,
        },
        {
          generatorRepo: deps.generatorRepo,
          idGenerator: deps.idGenerator,
        }
      );

      result.runId = run.id;

      if (!isNew && !force) {
        // Run already exists and not forcing
        result.status = 'skipped';
        result.durationMs = Date.now() - patternStartTime;
        return;
      }

      // Generate candidates
      const genResult = await generateCandidates(
        { runId: run.id },
        {
          generatorRepo: deps.generatorRepo,
          llmGenerator: deps.llmGenerator,
          idGenerator: deps.idGenerator,
        }
      );

      result.proposed = genResult.validCount;

      // Auto-approve if enabled
      if (autoApprove) {
        const candidatesToApprove = await applyAutoApprovePolicy(
          genResult.candidates
        );

        if (candidatesToApprove.length > 0) {
          await approveCandidates(
            { candidateIds: candidatesToApprove.map(c => c.id) },
            {
              generatorRepo: deps.generatorRepo,
              contentBankRepo: deps.contentBankRepo,
              idGenerator: deps.idGenerator,
            }
          );
          result.approved = candidatesToApprove.length;
        }

        // Publish if enabled
        if (publishAfterApprove && candidatesToApprove.length > 0) {
          const publishResult = await publishCandidates(
            {
              candidateIds: candidatesToApprove.map(c => c.id),
              ladderId: run.ladderId ?? undefined,
            },
            {
              generatorRepo: deps.generatorRepo,
              contentBankRepo: deps.contentBankRepo,
              idGenerator: deps.idGenerator,
            }
          );
          result.published = publishResult.publishedItems.length;
        }
      }

      result.status = 'succeeded';
      result.durationMs = Date.now() - patternStartTime;
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.durationMs = Date.now() - patternStartTime;
    }
  };

  // Process patterns with concurrency control
  const workerFunction = async () => {
    while (currentIndex < patternIds.length) {
      const index = currentIndex++;
      await processPattern(index);
    }
  };

  // Start workers
  for (let i = 0; i < Math.min(concurrency, patternIds.length); i++) {
    workers.push(workerFunction());
  }

  // Wait for all workers to complete
  await Promise.all(workers);

  // Compute summary
  const summary: BulkGenerateSummary = {
    totalPatterns: patternIds.length,
    succeeded: results.filter(r => r.status === 'succeeded').length,
    failed: results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    totalCandidatesProposed: results.reduce((sum, r) => sum + r.proposed, 0),
    totalApproved: results.reduce((sum, r) => sum + r.approved, 0),
    totalPublished: results.reduce((sum, r) => sum + r.published, 0),
    durationMs: Date.now() - startTime,
  };

  return {
    summary,
    perPattern: results,
  };
}

/**
 * Apply auto-approve policy to candidates and return those that pass
 */
async function applyAutoApprovePolicy(
  candidates: GeneratedCandidate[]
): Promise<GeneratedCandidate[]> {
  const approvedCandidates: GeneratedCandidate[] = [];

  for (const candidate of candidates) {
    // Only consider proposed candidates
    if (candidate.status !== 'proposed') {
      continue;
    }

    const result = autoApproveCandidate(candidate.candidate, candidate.validation);

    if (result.approved) {
      approvedCandidates.push(candidate);
    }
    // Non-approved candidates are silently skipped
  }

  return approvedCandidates;
}
