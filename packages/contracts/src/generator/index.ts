/**
 * Generator Contracts
 *
 * Schemas and types for the Pattern Ladder Generator system.
 */

// Problem Specification
export {
  // Schemas
  zGeneratedTestCase,
  zProblemDifficulty,
  zProblemExample,
  zProblemStatement,
  zIOSpec,
  zGeneratedTestSuite,
  zReferenceSection,
  zEvidenceMapping,
  zCoachSection,
  zProblemSpecV1,
  // Types
  type GeneratedTestCase,
  type ProblemDifficulty,
  type ProblemExample,
  type ProblemStatement,
  type IOSpec,
  type GeneratedTestSuite,
  type ReferenceSection,
  type EvidenceMapping,
  type CoachSection,
  type ProblemSpecV1,
  // Validation
  type ProblemSpecValidationResult,
  validateProblemSpec,
  // Utilities
  LEVEL_DIFFICULTY_MAP,
  getExpectedDifficulty,
} from './problem-spec.js';

// Coding Body (storage format)
export {
  // Schemas
  zCodingProblemBodyV1,
  // Types
  type CodingProblemBodyV1,
  type CodingBodyValidationResult,
  // Functions
  normalizeProblemSpecToContentBody,
  computeInputHash,
  extractContentMetadata,
  validateCodingBody,
} from './coding-body.js';
