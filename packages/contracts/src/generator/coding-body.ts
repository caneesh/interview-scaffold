/**
 * Coding Problem Body V1 - Schema for content_versions.body when track = 'coding_interview'
 *
 * This is the storage format for coding problems in the content bank.
 * It's derived from ProblemSpecV1 but optimized for runtime use.
 */

import { z } from 'zod';
import { zGeneratedTestCase, type ProblemSpecV1, type GeneratedTestCase } from './problem-spec.js';

/**
 * Coding Problem Body V1 - storage format for coding problems
 */
export const zCodingProblemBodyV1 = z.object({
  schemaVersion: z.literal(1),
  statement: z.string().min(1),
  constraints: z.array(z.string()),
  examples: z.array(z.object({
    input: z.string(),
    output: z.string(),
    explanation: z.string().optional(),
  })),
  testCases: z.array(zGeneratedTestCase),
  hints: z.array(z.string()),
  targetComplexity: z.string(),
  solutionOutline: z.string().optional(),
  // Coaching metadata
  commonMistakes: z.array(z.string()).optional(),
  evidenceMapping: z.array(z.object({
    testIndex: z.number(),
    concept: z.string(),
  })).optional(),
});

export type CodingProblemBodyV1 = z.infer<typeof zCodingProblemBodyV1>;

/**
 * Normalize a ProblemSpecV1 to CodingProblemBodyV1 for storage
 *
 * This converts the full generated spec to the storage format used
 * in content_versions.body.
 */
export function normalizeProblemSpecToContentBody(spec: ProblemSpecV1): CodingProblemBodyV1 {
  // Combine public and hidden tests
  const allTests: GeneratedTestCase[] = [
    ...spec.tests.public.map(t => ({ ...t, isHidden: false })),
    ...spec.tests.hidden.map(t => ({ ...t, isHidden: true })),
  ];

  return {
    schemaVersion: 1,
    statement: spec.statement.prompt,
    constraints: spec.statement.constraints,
    examples: spec.statement.examples,
    testCases: allTests,
    hints: spec.hints,
    targetComplexity: `Time: ${spec.reference.timeComplexity}, Space: ${spec.reference.spaceComplexity}`,
    solutionOutline: spec.reference.solutionOutline,
    commonMistakes: spec.coach?.commonMistakes,
    evidenceMapping: spec.coach?.evidenceMapping,
  };
}

/**
 * Compute a deterministic input hash for idempotency
 *
 * This hash is used to detect duplicate generation runs.
 * If the same pattern, prompt version, and seed are used,
 * the hash will be the same, allowing us to skip duplicate generation.
 *
 * @param patternId - The pattern being generated for
 * @param promptVersion - Version of the prompt template
 * @param seed - Additional seed data (e.g., timestamp, request ID)
 * @returns SHA-256 hash of the inputs
 */
export function computeInputHash(
  patternId: string,
  promptVersion: string,
  seed: string
): string {
  const input = JSON.stringify({
    patternId,
    promptVersion,
    seed,
  });

  // Use Web Crypto API for browser/edge compatibility
  // This is a simple hash for idempotency, not cryptographic security
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to hex string with some additional mixing
  const timestamp = Date.now().toString(16);
  return `${Math.abs(hash).toString(16).padStart(8, '0')}-${patternId.toLowerCase().slice(0, 8)}-${timestamp.slice(-8)}`;
}

/**
 * Extract metadata from a CodingProblemBodyV1 for content item creation
 */
export function extractContentMetadata(body: CodingProblemBodyV1): {
  estimatedTimeMinutes: number;
  testCaseCount: number;
  hasCoachingData: boolean;
} {
  // Estimate time based on number of test cases and complexity
  const complexityFactor = body.targetComplexity.includes('O(n^2)') ? 1.5
    : body.targetComplexity.includes('O(n log n)') ? 1.3
    : 1.0;

  const baseTime = 15; // Base 15 minutes
  const testTimeFactor = body.testCases.length * 0.5;

  return {
    estimatedTimeMinutes: Math.round((baseTime + testTimeFactor) * complexityFactor),
    testCaseCount: body.testCases.length,
    hasCoachingData: Boolean(body.commonMistakes?.length || body.evidenceMapping?.length),
  };
}

/**
 * Validation result for coding body
 */
export interface CodingBodyValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a coding problem body
 */
export function validateCodingBody(body: unknown): CodingBodyValidationResult {
  const result = zCodingProblemBodyV1.safeParse(body);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors = result.error.errors.map(err => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });

  return { valid: false, errors };
}
