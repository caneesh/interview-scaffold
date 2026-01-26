/**
 * Validate Candidates Use Case
 *
 * Re-validates candidates with additional checks like DAG validation
 * and more thorough uniqueness checking.
 */

import {
  validateProblemSpec,
  getExpectedDifficulty,
  type ProblemSpecV1,
} from '@scaffold/contracts';
import type {
  GeneratorRepoPort,
  GeneratedCandidate,
  GeneratedCandidateId,
  CandidateValidation,
} from '../../ports/generator-repo.js';

export interface ValidateCandidatesInput {
  candidateIds: GeneratedCandidateId[];
  strictMode?: boolean; // More thorough validation
}

export interface CandidateValidationResult {
  candidateId: GeneratedCandidateId;
  validation: CandidateValidation;
  previousStatus: string;
  newStatus: 'proposed' | 'rejected';
}

export interface ValidateCandidatesOutput {
  results: CandidateValidationResult[];
  validCount: number;
  rejectedCount: number;
}

export interface ValidateCandidatesDeps {
  generatorRepo: GeneratorRepoPort;
}

/**
 * Re-validate candidates with additional checks
 */
export async function validateCandidates(
  input: ValidateCandidatesInput,
  deps: ValidateCandidatesDeps
): Promise<ValidateCandidatesOutput> {
  const { generatorRepo } = deps;
  const results: CandidateValidationResult[] = [];
  let validCount = 0;
  let rejectedCount = 0;

  // Get all existing titles for uniqueness check
  const existingTitles = await generatorRepo.getAllExistingTitles('coding_interview');

  for (const candidateId of input.candidateIds) {
    const candidate = await generatorRepo.getCandidate(candidateId);
    if (!candidate) {
      continue;
    }

    const validation = performFullValidation(
      candidate.candidate,
      candidate.level,
      existingTitles,
      input.strictMode ?? false
    );

    // Update the candidate with new validation
    await generatorRepo.updateCandidateValidation(candidateId, validation);

    // Update status based on validation
    const newStatus = validation.isValid ? 'proposed' : 'rejected';
    if (candidate.status !== newStatus) {
      await generatorRepo.updateCandidateStatus(candidateId, newStatus);
    }

    if (validation.isValid) {
      validCount++;
    } else {
      rejectedCount++;
    }

    results.push({
      candidateId,
      validation,
      previousStatus: candidate.status,
      newStatus,
    });
  }

  return {
    results,
    validCount,
    rejectedCount,
  };
}

/**
 * Perform full validation on a candidate
 */
function performFullValidation(
  spec: ProblemSpecV1,
  level: number,
  existingTitles: string[],
  strictMode: boolean
): CandidateValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Schema validation
  const schemaResult = validateProblemSpec(spec);
  if (!schemaResult.valid) {
    return {
      isValid: false,
      errors: schemaResult.errors,
      warnings: schemaResult.warnings,
    };
  }
  warnings.push(...schemaResult.warnings);

  // Difficulty calibration
  const expectedDifficulty = getExpectedDifficulty(level);
  if (spec.difficulty !== expectedDifficulty) {
    if (strictMode) {
      errors.push(`Difficulty mismatch: expected ${expectedDifficulty} for level ${level}, got ${spec.difficulty}`);
    } else {
      warnings.push(`Difficulty mismatch: expected ${expectedDifficulty} for level ${level}, got ${spec.difficulty}`);
    }
  }

  // Test case validation
  const testValidation = validateTestCases(spec, strictMode);
  errors.push(...testValidation.errors);
  warnings.push(...testValidation.warnings);

  // Evidence mapping validation
  if (spec.coach?.evidenceMapping) {
    const evidenceValidation = validateEvidenceMapping(spec);
    errors.push(...evidenceValidation.errors);
    warnings.push(...evidenceValidation.warnings);
  }

  // Uniqueness check
  const similarTitles = findSimilarTitles(spec.title, existingTitles);
  if (similarTitles.exact.length > 0) {
    errors.push(`Duplicate title found: "${similarTitles.exact[0]}"`);
  }
  if (similarTitles.similar.length > 0) {
    warnings.push(`Similar titles found: ${similarTitles.similar.join(', ')}`);
  }

  // Content quality checks
  const qualityValidation = validateContentQuality(spec, strictMode);
  errors.push(...qualityValidation.errors);
  warnings.push(...qualityValidation.warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    similarTo: similarTitles.similar.length > 0 ? similarTitles.similar : undefined,
    dedupeScore: similarTitles.maxSimilarity,
  };
}

/**
 * Validate test cases
 */
function validateTestCases(
  spec: ProblemSpecV1,
  strictMode: boolean
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const publicTests = spec.tests.public;
  const hiddenTests = spec.tests.hidden;
  const allTests = [...publicTests, ...hiddenTests];

  // Check for duplicate inputs
  const inputs = allTests.map(t => t.input);
  const uniqueInputs = new Set(inputs);
  if (uniqueInputs.size !== inputs.length) {
    if (strictMode) {
      errors.push('Duplicate test inputs found');
    } else {
      warnings.push('Duplicate test inputs found');
    }
  }

  // Check for valid input/output format
  for (let i = 0; i < allTests.length; i++) {
    const test = allTests[i];
    if (!test) continue;

    // Check for empty outputs
    if (!test.expectedOutput || test.expectedOutput.trim() === '') {
      errors.push(`Test ${i}: Expected output is empty`);
    }

    // Check for suspiciously long inputs/outputs
    if (test.input.length > 10000) {
      warnings.push(`Test ${i}: Input is very long (${test.input.length} chars)`);
    }
    if (test.expectedOutput.length > 10000) {
      warnings.push(`Test ${i}: Output is very long (${test.expectedOutput.length} chars)`);
    }
  }

  // Strict mode: require certain edge cases
  if (strictMode) {
    const hasEmptyCase = inputs.some(
      i => i === '' || i === '[]' || i === '{}' || i === '""' || i === 'null'
    );
    if (!hasEmptyCase) {
      warnings.push('Missing edge case: empty/null input');
    }

    const hasSingleElement = inputs.some(
      i => i.match(/^\[.+\]$/) && !i.includes(',')
    );
    if (!hasSingleElement && spec.patternIds.some((p: string) => p.includes('ARRAY') || p.includes('WINDOW'))) {
      warnings.push('Missing edge case: single-element array');
    }
  }

  return { errors, warnings };
}

/**
 * Validate evidence mapping
 */
function validateEvidenceMapping(
  spec: ProblemSpecV1
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!spec.coach?.evidenceMapping) {
    return { errors, warnings };
  }

  const totalTests = spec.tests.public.length + spec.tests.hidden.length;
  const mappedIndices = new Set<number>();

  for (const mapping of spec.coach.evidenceMapping) {
    // Check index bounds
    if (mapping.testIndex < 0 || mapping.testIndex >= totalTests) {
      errors.push(`Evidence mapping: invalid test index ${mapping.testIndex} (max: ${totalTests - 1})`);
      continue;
    }

    mappedIndices.add(mapping.testIndex);

    // Check concept is non-empty
    if (!mapping.concept || mapping.concept.trim() === '') {
      warnings.push(`Evidence mapping: empty concept for test ${mapping.testIndex}`);
    }
  }

  // Check coverage
  if (mappedIndices.size < totalTests / 2) {
    warnings.push(`Evidence mapping only covers ${mappedIndices.size}/${totalTests} tests`);
  }

  return { errors, warnings };
}

/**
 * Validate content quality
 */
function validateContentQuality(
  spec: ProblemSpecV1,
  strictMode: boolean
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check hint quality
  for (let i = 0; i < spec.hints.length; i++) {
    const hint = spec.hints[i];
    if (!hint) continue;

    if (hint.length < 10) {
      warnings.push(`Hint ${i + 1} is very short (${hint.length} chars)`);
    }

    // Check for generic hints
    const genericPhrases = ['try again', 'think harder', 'read carefully'];
    if (genericPhrases.some(p => hint.toLowerCase().includes(p))) {
      warnings.push(`Hint ${i + 1} appears generic`);
    }
  }

  // Check common mistakes quality
  if (spec.coach?.commonMistakes) {
    for (let i = 0; i < spec.coach.commonMistakes.length; i++) {
      const mistake = spec.coach.commonMistakes[i];
      if (!mistake) continue;

      if (mistake.length < 20) {
        warnings.push(`Common mistake ${i + 1} is very short`);
      }
    }
  }

  // Check solution outline quality
  if (spec.reference.solutionOutline.length < 50) {
    warnings.push('Solution outline is brief - consider expanding');
  }

  // Strict mode: check for completeness
  if (strictMode) {
    if (!spec.coach) {
      errors.push('Missing coach section (required in strict mode)');
    }
    if (!spec.coach?.evidenceMapping || spec.coach.evidenceMapping.length === 0) {
      warnings.push('Missing evidence mapping');
    }
  }

  return { errors, warnings };
}

/**
 * Find similar and exact title matches
 */
function findSimilarTitles(
  title: string,
  existingTitles: string[]
): { exact: string[]; similar: string[]; maxSimilarity: number } {
  const normalizedTitle = normalizeTitle(title);
  const exact: string[] = [];
  const similar: string[] = [];
  let maxSimilarity = 0;

  for (const existing of existingTitles) {
    const normalizedExisting = normalizeTitle(existing);

    if (normalizedTitle === normalizedExisting) {
      exact.push(existing);
      maxSimilarity = 1.0;
    } else {
      const similarity = stringSimilarity(normalizedTitle, normalizedExisting);
      maxSimilarity = Math.max(maxSimilarity, similarity);

      if (similarity > 0.7) {
        similar.push(existing);
      }
    }
  }

  return {
    exact,
    similar: similar.slice(0, 5),
    maxSimilarity,
  };
}

/**
 * Normalize title for comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simple string similarity using Jaccard index
 */
function stringSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(' ').filter(w => w.length > 2));
  const wordsB = new Set(b.split(' ').filter(w => w.length > 2));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}
