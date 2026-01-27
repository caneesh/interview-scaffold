/**
 * Attempt V2 Use Cases
 *
 * Use cases for the 5-step attempt flow:
 * UNDERSTAND -> PLAN -> IMPLEMENT -> VERIFY -> REFLECT
 */

// Evaluate Understanding (UNDERSTAND phase)
export {
  evaluateUnderstanding,
  EvaluateUnderstandingError,
  type EvaluateUnderstandingInput,
  type EvaluateUnderstandingOutput,
  type EvaluateUnderstandingDeps,
} from './evaluate-understanding.js';

// Suggest Patterns (PLAN phase)
export {
  suggestPatterns,
  SuggestPatternsError,
  type SuggestPatternsInput,
  type SuggestPatternsOutput,
  type SuggestPatternsDeps,
} from './suggest-patterns.js';

// Validate Pattern Choice (PLAN phase)
export {
  validatePatternChoice,
  ValidatePatternChoiceError,
  type ValidatePatternChoiceInput,
  type ValidatePatternChoiceOutput,
  type ValidatePatternChoiceDeps,
} from './validate-pattern-choice.js';

// Explain Failure (VERIFY phase)
export {
  explainFailure,
  ExplainFailureError,
  type ExplainFailureInput,
  type ExplainFailureOutput,
  type ExplainFailureDeps,
} from './explain-failure.js';
