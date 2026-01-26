/**
 * Auto-Approve Policy Service
 *
 * Determines if a candidate should be automatically approved based on strict quality gates.
 * This is a conservative policy - only high-quality candidates pass.
 */

import type { ProblemSpecV1 } from '@scaffold/contracts';
import type { CandidateValidation } from '../ports/generator-repo.js';

export interface AutoApproveResult {
  approved: boolean;
  reasons: string[];
}

/**
 * Banned terms that indicate potential copyright issues
 */
const BANNED_TERMS = [
  'leetcode',
  'hackerrank',
  'codewars',
  'codingbat',
  'interviewbit',
  'designgurus',
  'grokking',
  'algoexpert',
  'educative',
  'pramp',
];

/**
 * Evaluate if a candidate should be auto-approved
 *
 * Auto-approve requires ALL of these gates to pass:
 * 1. Zod schema validation passed
 * 2. At least 2 examples in statement
 * 3. At least 8 total tests with at least 3 hidden
 * 4. Constraints are present and non-trivial (at least 2)
 * 5. Hint ladder has at least 3 hints
 * 6. Title is reasonable length (5-80 chars)
 * 7. No banned terms (copyright concerns)
 * 8. No validation errors
 * 9. Dedupe score below threshold
 */
export function autoApproveCandidate(
  spec: ProblemSpecV1,
  validation: CandidateValidation | null,
  options?: {
    maxDedupeScore?: number;
    existingTitles?: string[];
  }
): AutoApproveResult {
  const reasons: string[] = [];
  const maxDedupeScore = options?.maxDedupeScore ?? 0.7;

  // Gate 1: Must have passed schema validation
  if (validation && !validation.isValid) {
    reasons.push('Schema validation failed');
    return { approved: false, reasons };
  }

  // Gate 2: Must have validation errors empty
  if (validation?.errors && validation.errors.length > 0) {
    reasons.push(`Has ${validation.errors.length} validation error(s)`);
    return { approved: false, reasons };
  }

  // Gate 3: Must have at least 2 examples
  const exampleCount = spec.statement.examples.length;
  if (exampleCount < 2) {
    reasons.push(`Only ${exampleCount} example(s), need at least 2`);
  }

  // Gate 4: Must have at least 8 total tests with at least 3 hidden
  const publicTestCount = spec.tests.public.length;
  const hiddenTestCount = spec.tests.hidden.length;
  const totalTestCount = publicTestCount + hiddenTestCount;

  if (totalTestCount < 8) {
    reasons.push(`Only ${totalTestCount} test(s), need at least 8`);
  }
  if (hiddenTestCount < 3) {
    reasons.push(`Only ${hiddenTestCount} hidden test(s), need at least 3`);
  }

  // Gate 5: Must have at least 2 constraints
  const constraintCount = spec.statement.constraints.length;
  if (constraintCount < 2) {
    reasons.push(`Only ${constraintCount} constraint(s), need at least 2`);
  }

  // Check constraints are non-trivial (not empty or too short)
  const trivialConstraints = spec.statement.constraints.filter(
    c => c.trim().length < 10
  );
  if (trivialConstraints.length > constraintCount / 2) {
    reasons.push('Too many trivial constraints');
  }

  // Gate 6: Must have at least 3 hints
  const hintCount = spec.hints.length;
  if (hintCount < 3) {
    reasons.push(`Only ${hintCount} hint(s), need at least 3`);
  }

  // Gate 7: Title must be reasonable length
  const titleLength = spec.title.trim().length;
  if (titleLength < 5) {
    reasons.push(`Title too short (${titleLength} chars)`);
  }
  if (titleLength > 80) {
    reasons.push(`Title too long (${titleLength} chars)`);
  }

  // Gate 8: No banned terms in title, summary, or statement
  const textToCheck = `${spec.title} ${spec.summary} ${spec.statement.prompt}`.toLowerCase();
  for (const term of BANNED_TERMS) {
    if (textToCheck.includes(term)) {
      reasons.push(`Contains banned term: ${term}`);
      break;
    }
  }

  // Gate 9: Dedupe score must be below threshold
  if (validation?.dedupeScore !== undefined && validation.dedupeScore > maxDedupeScore) {
    reasons.push(`Dedupe score too high (${(validation.dedupeScore * 100).toFixed(0)}%)`);
  }

  // Gate 10: Must have reference solution outline
  if (!spec.reference.solutionOutline || spec.reference.solutionOutline.trim().length < 20) {
    reasons.push('Missing or too short solution outline');
  }

  // Gate 11: Must have time/space complexity
  if (!spec.reference.timeComplexity || !spec.reference.spaceComplexity) {
    reasons.push('Missing complexity analysis');
  }

  return {
    approved: reasons.length === 0,
    reasons,
  };
}

/**
 * Get a summary of auto-approve policy requirements
 */
export function getAutoApprovePolicyRequirements(): string[] {
  return [
    'Schema validation must pass',
    'No validation errors',
    'At least 2 examples',
    'At least 8 total tests (3+ hidden)',
    'At least 2 non-trivial constraints',
    'At least 3 hints',
    'Title between 5-80 characters',
    'No banned terms (LeetCode, etc.)',
    'Dedupe score below 70%',
    'Solution outline present (20+ chars)',
    'Time and space complexity defined',
  ];
}
