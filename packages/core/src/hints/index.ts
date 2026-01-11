/**
 * Hint Generation Pipeline
 * Generates progressive hints based on problem context and user progress
 */

export {
  generateHint,
  getNextHintLevel,
  getHintBudgetState,
  computeHintCost,
  isHintBudgetExhausted,
  HINT_BUDGET,
  HINT_COSTS,
} from './generator.js';

export type {
  HintGenerationInput,
  HintGenerationOutput,
  HintBudgetState,
} from './generator.js';
