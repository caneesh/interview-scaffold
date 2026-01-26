/**
 * Generator Use Cases
 *
 * Use cases for the Pattern Ladder Generator system.
 */

export {
  createGenerationRun,
  type CreateGenerationRunInput,
  type CreateGenerationRunOutput,
  type CreateGenerationRunDeps,
} from './create-generation-run.js';

export {
  generateCandidates,
  type GenerateCandidatesInput,
  type GenerateCandidatesOutput,
  type GenerateCandidatesDeps,
} from './generate-candidates.js';

export {
  validateCandidates,
  type ValidateCandidatesInput,
  type CandidateValidationResult,
  type ValidateCandidatesOutput,
  type ValidateCandidatesDeps,
} from './validate-candidates.js';

export {
  buildLadderGraph,
  validateEdgeLevelMonotonicity,
  type BuildLadderGraphInput,
  type BuildLadderGraphOutput,
  type BuildLadderGraphDeps,
} from './build-ladder-graph.js';

export {
  approveCandidates,
  rejectCandidates,
  publishCandidates,
  approveAndPublishRun,
  type ApproveCandidatesInput,
  type ApproveCandidatesOutput,
  type PublishCandidatesInput,
  type PublishedItem,
  type PublishCandidatesOutput,
  type ApproveAndPublishDeps,
} from './approve-and-publish.js';
