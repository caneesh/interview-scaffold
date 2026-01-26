/**
 * Generate Candidates Use Case
 *
 * Generates problem candidates for a pattern using the LLM generator.
 * This use case orchestrates the generation, validation, and storage of candidates.
 */

import { validateProblemSpec, type ProblemSpecV1 } from '@scaffold/contracts';
import type {
  GeneratorRepoPort,
  GenerationRun,
  GenerationRunId,
  GeneratedCandidate,
  GeneratedCandidateId,
  CandidateValidation,
} from '../../ports/generator-repo.js';
import type { LLMGeneratorPort } from '../../ports/llm-generator-port.js';
import type { IdGenerator } from '../../ports/id-generator.js';

export interface GenerateCandidatesInput {
  runId: GenerationRunId;
  context?: {
    focusAreas?: string[];
    excludeTopics?: string[];
    targetComplexity?: string;
  };
}

export interface GenerateCandidatesOutput {
  run: GenerationRun;
  candidates: GeneratedCandidate[];
  totalGenerated: number;
  validCount: number;
  duplicatesRemoved: number;
}

export interface GenerateCandidatesDeps {
  generatorRepo: GeneratorRepoPort;
  llmGenerator: LLMGeneratorPort;
  idGenerator: IdGenerator;
}

/**
 * Generate candidates for a run
 *
 * This orchestrates:
 * 1. Getting existing titles for deduplication
 * 2. Calling the LLM generator
 * 3. Validating each candidate
 * 4. Storing valid candidates
 * 5. Updating run status and metrics
 */
export async function generateCandidates(
  input: GenerateCandidatesInput,
  deps: GenerateCandidatesDeps
): Promise<GenerateCandidatesOutput> {
  const { generatorRepo, llmGenerator, idGenerator } = deps;
  const startTime = Date.now();

  // Get the run
  const run = await generatorRepo.getRun(input.runId);
  if (!run) {
    throw new Error(`Generation run not found: ${input.runId}`);
  }

  if (run.status !== 'queued') {
    throw new Error(`Run ${input.runId} is not in queued status (current: ${run.status})`);
  }

  // Mark as running
  await generatorRepo.markRunRunning(input.runId);

  try {
    // Get existing titles for deduplication
    const existingTitles = await generatorRepo.getAllExistingTitles(run.track);

    // Generate candidates for each level (0-4)
    const allCandidates: GeneratedCandidate[] = [];
    let totalGenerated = 0;
    let validCount = 0;
    let duplicatesRemoved = 0;
    let tokensUsed = 0;

    // Generate problems per level
    const candidatesPerLevel = Math.ceil(run.targetCount / 5);

    for (let level = 0; level <= 4; level++) {
      // Call LLM generator
      const result = await llmGenerator.generateProblems({
        patternId: run.patternId,
        level,
        count: candidatesPerLevel,
        existingTitles: [...existingTitles, ...allCandidates.map(c => c.candidate.title)],
        promptVersion: run.promptVersion,
        context: input.context,
      });

      totalGenerated += result.candidates.length;
      tokensUsed += result.tokensUsed ?? 0;

      // Validate and store each candidate
      for (const spec of result.candidates) {
        const validation = validateCandidate(spec, existingTitles);

        if (validation.isValid) {
          validCount++;

          // Check for duplicates by title similarity
          const isDuplicate = isDuplicateTitle(
            spec.title,
            [...existingTitles, ...allCandidates.map(c => c.candidate.title)]
          );

          if (isDuplicate) {
            duplicatesRemoved++;
            continue;
          }

          const candidateId: GeneratedCandidateId = idGenerator.generate();
          const candidate = await generatorRepo.createCandidate({
            id: candidateId,
            runId: input.runId,
            level,
            candidate: spec,
            validation,
            status: 'proposed',
          });

          allCandidates.push(candidate);
        } else {
          // Still store invalid candidates for review
          const candidateId: GeneratedCandidateId = idGenerator.generate();
          await generatorRepo.createCandidate({
            id: candidateId,
            runId: input.runId,
            level,
            candidate: spec,
            validation,
            status: 'rejected', // Auto-reject invalid
          });
        }
      }
    }

    const durationMs = Date.now() - startTime;

    // Mark run as succeeded
    const completedRun = await generatorRepo.markRunCompleted(input.runId, {
      status: 'succeeded',
      metrics: {
        totalGenerated,
        validCount,
        duplicatesRemoved,
        tokensUsed: tokensUsed > 0 ? tokensUsed : undefined,
        durationMs,
      },
    });

    return {
      run: completedRun,
      candidates: allCandidates,
      totalGenerated,
      validCount,
      duplicatesRemoved,
    };
  } catch (error) {
    // Mark run as failed
    await generatorRepo.markRunCompleted(input.runId, {
      status: 'failed',
      metrics: {
        totalGenerated: 0,
        validCount: 0,
        duplicatesRemoved: 0,
        durationMs: Date.now() - startTime,
      },
    });

    throw error;
  }
}

/**
 * Validate a candidate problem spec
 */
function validateCandidate(spec: ProblemSpecV1, existingTitles: string[]): CandidateValidation {
  const schemaResult = validateProblemSpec(spec);

  if (!schemaResult.valid) {
    return {
      isValid: false,
      errors: schemaResult.errors,
      warnings: schemaResult.warnings,
    };
  }

  const warnings = [...schemaResult.warnings];
  const errors: string[] = [];

  // Check for suspicious content (potential copyright issues)
  const suspiciousPatterns = [
    /leetcode/i,
    /hackerrank/i,
    /codingbat/i,
    /codewars/i,
    /interviewbit/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (
      pattern.test(spec.title) ||
      pattern.test(spec.statement.prompt) ||
      pattern.test(spec.summary)
    ) {
      errors.push('Potential copyrighted content detected');
      break;
    }
  }

  // Check test case validity
  const testValidation = validateTestCases(spec);
  if (!testValidation.valid) {
    errors.push(...testValidation.errors);
  }
  warnings.push(...testValidation.warnings);

  // Find similar titles
  const similarTitles = findSimilarTitles(spec.title, existingTitles);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    similarTo: similarTitles.length > 0 ? similarTitles : undefined,
    dedupeScore: calculateTitleSimilarity(spec.title, existingTitles),
  };
}

/**
 * Validate test cases
 */
function validateTestCases(spec: ProblemSpecV1): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check that all test inputs are distinct
  const allInputs = [...spec.tests.public, ...spec.tests.hidden].map(t => t.input);
  const uniqueInputs = new Set(allInputs);
  if (uniqueInputs.size !== allInputs.length) {
    warnings.push('Some test cases have duplicate inputs');
  }

  // Check that hidden tests cover edge cases (simple heuristic)
  const hasEmptyTest = allInputs.some(input => input.trim() === '' || input === '[]' || input === '{}');
  if (!hasEmptyTest) {
    warnings.push('Consider adding an edge case with empty input');
  }

  // Check evidence mapping references valid test indices
  if (spec.coach?.evidenceMapping) {
    const totalTests = spec.tests.public.length + spec.tests.hidden.length;
    for (const mapping of spec.coach.evidenceMapping) {
      if (mapping.testIndex >= totalTests || mapping.testIndex < 0) {
        errors.push(`Evidence mapping references invalid test index: ${mapping.testIndex}`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Check if a title is a duplicate (case-insensitive, normalized)
 */
function isDuplicateTitle(title: string, existingTitles: string[]): boolean {
  const normalizedTitle = normalizeTitle(title);
  return existingTitles.some(t => normalizeTitle(t) === normalizedTitle);
}

/**
 * Find similar titles (for warning purposes)
 */
function findSimilarTitles(title: string, existingTitles: string[]): string[] {
  const normalizedTitle = normalizeTitle(title);
  const similar: string[] = [];

  for (const existing of existingTitles) {
    const similarity = stringSimilarity(normalizedTitle, normalizeTitle(existing));
    if (similarity > 0.7 && similarity < 1.0) {
      similar.push(existing);
    }
  }

  return similar.slice(0, 3); // Limit to top 3
}

/**
 * Calculate highest title similarity score
 */
function calculateTitleSimilarity(title: string, existingTitles: string[]): number {
  if (existingTitles.length === 0) return 0;

  const normalizedTitle = normalizeTitle(title);
  let maxSimilarity = 0;

  for (const existing of existingTitles) {
    const similarity = stringSimilarity(normalizedTitle, normalizeTitle(existing));
    maxSimilarity = Math.max(maxSimilarity, similarity);
  }

  return maxSimilarity;
}

/**
 * Normalize a title for comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Simple string similarity (Jaccard index on words)
 */
function stringSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(/\s+/));
  const setB = new Set(b.split(/\s+/));

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}
