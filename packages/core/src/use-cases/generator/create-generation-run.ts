/**
 * Create Generation Run Use Case
 *
 * Creates a new generation run for a pattern. This is idempotent -
 * if a run with the same input hash already exists, it returns that run.
 */

import { computeInputHash } from '@scaffold/contracts';
import type {
  GeneratorRepoPort,
  GenerationRun,
  GenerationRunId,
} from '../../ports/generator-repo.js';
import type { IdGenerator } from '../../ports/id-generator.js';

export interface CreateGenerationRunInput {
  track: string;
  patternId: string;
  targetCount: number;
  promptVersion: string;
  model: string;
  seed?: string;
  createdBy?: string;
}

export interface CreateGenerationRunOutput {
  run: GenerationRun;
  isNew: boolean;
}

export interface CreateGenerationRunDeps {
  generatorRepo: GeneratorRepoPort;
  idGenerator: IdGenerator;
}

/**
 * Create a generation run
 *
 * This is idempotent - if a run with the same inputs exists, it returns that run.
 * The input hash is computed from (patternId, promptVersion, seed).
 */
export async function createGenerationRun(
  input: CreateGenerationRunInput,
  deps: CreateGenerationRunDeps
): Promise<CreateGenerationRunOutput> {
  const { generatorRepo, idGenerator } = deps;

  // Compute input hash for idempotency
  const seed = input.seed ?? new Date().toISOString();
  const inputHash = computeInputHash(input.patternId, input.promptVersion, seed);

  // Check for existing run with same hash
  const existingRun = await generatorRepo.findRunByInputHash(inputHash);
  if (existingRun) {
    return { run: existingRun, isNew: false };
  }

  // Find or create the ladder for this pattern
  let ladder = await generatorRepo.findLadderByPattern(input.track, input.patternId);
  if (!ladder) {
    // Create a new ladder for this pattern
    ladder = await generatorRepo.createLadder({
      track: input.track,
      patternId: input.patternId,
      name: `${input.patternId} Ladder`,
      description: `Auto-generated ladder for ${input.patternId} pattern`,
    });
  }

  // Create the run
  const runId: GenerationRunId = idGenerator.generate();
  const run = await generatorRepo.createRun({
    id: runId,
    track: input.track,
    patternId: input.patternId,
    ladderId: ladder.id,
    targetCount: input.targetCount,
    promptVersion: input.promptVersion,
    model: input.model,
    inputHash,
    createdBy: input.createdBy,
  });

  return { run, isNew: true };
}
