/**
 * Services
 *
 * Pure functions and policies for the generator system.
 */

export {
  autoApproveCandidate,
  getAutoApprovePolicyRequirements,
  type AutoApproveResult,
} from './auto-approve-policy.js';

export {
  computeSeed,
  getSeedStrategyDescription,
  getAvailableSeedStrategies,
  type SeedStrategy,
  type SeedStrategyInput,
} from './seed-strategy.js';
