/**
 * Debug Track - Evaluation Heuristics
 * Gate-specific evaluation logic using keyword detection and rubric scoring.
 * Pure TypeScript - deterministic evaluation.
 */

import type { DebugGate, RubricCriterion } from './types.js';
import type { DebugScenario, EvaluationResult } from './entities.js';
import type { EvaluationContext } from './ports.js';

// ============ Keyword Sets ============

/**
 * Determinism keywords for DETERMINISM_ANALYSIS gate
 */
const DETERMINISM_KEYWORDS = {
  DETERMINISTIC: [
    'deterministic',
    'reproducible',
    'consistent',
    'always fails',
    'always passes',
    'same result',
    'predictable',
  ],
  NON_DETERMINISTIC: [
    'non-deterministic',
    'nondeterministic',
    'random',
    'unpredictable',
    'sporadic',
    'intermittent',
  ],
  RACE_CONDITION: [
    'race condition',
    'race-condition',
    'timing',
    'concurrent',
    'thread',
    'synchronization',
    'mutex',
    'lock',
    'deadlock',
    'ordering',
  ],
  ENVIRONMENT_DEPENDENT: [
    'environment',
    'configuration',
    'config',
    'platform',
    'os-specific',
    'deployment',
    'production only',
    'local only',
  ],
  FLAKY: [
    'flaky',
    'intermittent',
    'sometimes fails',
    'occasional',
    'unreliable',
  ],
} as const;

/**
 * Regression prevention keywords
 */
const REGRESSION_KEYWORDS = {
  TESTING: [
    'test',
    'unit test',
    'integration test',
    'regression test',
    'e2e',
    'end-to-end',
    'test case',
    'test coverage',
    'tdd',
    'automated test',
  ],
  MONITORING: [
    'monitor',
    'monitoring',
    'alert',
    'alerting',
    'log',
    'logging',
    'observability',
    'metrics',
    'tracing',
    'dashboard',
  ],
  INVARIANTS: [
    'invariant',
    'assertion',
    'assert',
    'precondition',
    'postcondition',
    'contract',
    'validation',
    'guard',
    'check',
  ],
  CODE_REVIEW: [
    'code review',
    'review',
    'pr review',
    'pull request',
    'pair programming',
    'walkthrough',
  ],
  DOCUMENTATION: [
    'document',
    'documentation',
    'readme',
    'runbook',
    'playbook',
    'postmortem',
    'rca',
  ],
} as const;

// ============ Gate Evaluators ============

/**
 * Evaluate SYMPTOM_CLASSIFICATION gate (MCQ match)
 */
function evaluateSymptomClassification(
  answer: string,
  scenario: DebugScenario,
  _context?: EvaluationContext
): EvaluationResult {
  const normalizedAnswer = answer.trim().toLowerCase();

  // Check if scenario has MCQ options
  if (scenario.symptomOptions && scenario.symptomOptions.length > 0) {
    const correctOption = scenario.symptomOptions.find((opt) => opt.isCorrect);
    const selectedOption = scenario.symptomOptions.find(
      (opt) =>
        opt.id.toLowerCase() === normalizedAnswer ||
        opt.label.toLowerCase() === normalizedAnswer
    );

    if (selectedOption && selectedOption.isCorrect) {
      return createPassResult('Correct symptom classification.', 'DETERMINISM_ANALYSIS');
    }

    const feedback = correctOption
      ? `Incorrect. The correct answer was: ${correctOption.label}`
      : 'Incorrect symptom classification.';

    return createFailResult(feedback);
  }

  // Fallback: keyword matching against expected findings
  const matchedFindings = scenario.expectedFindings.filter((finding) =>
    normalizedAnswer.includes(finding.toLowerCase())
  );

  if (matchedFindings.length > 0) {
    return createPassResult(
      'Symptom correctly identified.',
      'DETERMINISM_ANALYSIS',
      matchedFindings
    );
  }

  return createFailResult('Symptom not correctly identified. Review the error output carefully.');
}

/**
 * Evaluate DETERMINISM_ANALYSIS gate (keyword detection)
 */
function evaluateDeterminismAnalysis(
  answer: string,
  scenario: DebugScenario,
  _context?: EvaluationContext
): EvaluationResult {
  const normalizedAnswer = answer.toLowerCase();
  const matchedKeywords: string[] = [];

  // Check each determinism category
  const detectedCategories: string[] = [];

  for (const [category, keywords] of Object.entries(DETERMINISM_KEYWORDS)) {
    const matches = keywords.filter((kw) => normalizedAnswer.includes(kw.toLowerCase()));
    if (matches.length > 0) {
      detectedCategories.push(category);
      matchedKeywords.push(...matches);
    }
  }

  // Check if detected category matches expected
  const expectedDeterminism = scenario.expectedDeterminism?.toUpperCase();

  if (expectedDeterminism && detectedCategories.includes(expectedDeterminism)) {
    return createPassResult(
      'Correct determinism analysis.',
      'PATTERN_CLASSIFICATION',
      matchedKeywords
    );
  }

  // Partial credit if any relevant category detected
  if (detectedCategories.length > 0) {
    return {
      isCorrect: false,
      confidence: 0.6,
      feedback: `Detected ${detectedCategories.join(', ')} characteristics, but expected analysis of ${expectedDeterminism ?? 'bug behavior'}.`,
      rubricScores: createPartialRubricScores(0.5),
      nextGate: null,
      allowProceed: false,
      matchedKeywords,
    };
  }

  return createFailResult(
    'Determinism analysis incomplete. Consider: Is this bug reproducible? Is it timing-dependent?'
  );
}

/**
 * Evaluate PATTERN_CLASSIFICATION gate (category/patternKey match)
 */
function evaluatePatternClassification(
  answer: string,
  scenario: DebugScenario,
  _context?: EvaluationContext
): EvaluationResult {
  const normalizedAnswer = answer.toLowerCase();
  const matchedKeywords: string[] = [];

  // Check for category match
  const categoryMatch = normalizedAnswer.includes(scenario.category.toLowerCase().replace('_', ' '));

  // Check for pattern key match
  const patternKeyMatch = normalizedAnswer.includes(scenario.patternKey.toLowerCase().replace('-', ' '));

  // Also check without separators
  const categoryNoSep = scenario.category.toLowerCase().replace('_', '');
  const patternKeyNoSep = scenario.patternKey.toLowerCase().replace('-', '');
  const categoryMatchAlt = normalizedAnswer.includes(categoryNoSep);
  const patternKeyMatchAlt = normalizedAnswer.includes(patternKeyNoSep);

  if (categoryMatch || categoryMatchAlt) matchedKeywords.push(scenario.category);
  if (patternKeyMatch || patternKeyMatchAlt) matchedKeywords.push(scenario.patternKey);

  // Also check tags for matching
  const tagMatches = scenario.tags.filter(
    (tag) => normalizedAnswer.includes(tag.toLowerCase())
  );
  matchedKeywords.push(...tagMatches);

  // Pass if category or pattern key identified
  if (categoryMatch || categoryMatchAlt || patternKeyMatch || patternKeyMatchAlt) {
    return createPassResult(
      'Bug pattern correctly classified.',
      'ROOT_CAUSE_HYPOTHESIS',
      matchedKeywords
    );
  }

  // Partial credit for tag matches
  if (tagMatches.length > 0) {
    return {
      isCorrect: false,
      confidence: 0.5,
      feedback: `Partially correct. You identified related concepts (${tagMatches.join(', ')}), but the specific pattern is ${scenario.category}/${scenario.patternKey}.`,
      rubricScores: createPartialRubricScores(0.5),
      nextGate: null,
      allowProceed: false,
      matchedKeywords,
    };
  }

  return createFailResult(
    `Pattern not correctly identified. This is a ${scenario.category.toLowerCase().replace('_', ' ')} bug.`
  );
}

/**
 * Evaluate ROOT_CAUSE_HYPOTHESIS gate (rubric scoring + keyword checks)
 */
function evaluateRootCauseHypothesis(
  answer: string,
  scenario: DebugScenario,
  _context?: EvaluationContext
): EvaluationResult {
  const normalizedAnswer = answer.toLowerCase();
  const matchedKeywords: string[] = [];

  // Check against expected findings
  let findingsScore = 0;
  for (const finding of scenario.expectedFindings) {
    const findingLower = finding.toLowerCase();
    // Check if any significant part of the finding is mentioned
    const findingWords = findingLower.split(/\s+/).filter((w) => w.length > 3);
    const matchedWords = findingWords.filter((word) => normalizedAnswer.includes(word));

    if (matchedWords.length >= Math.ceil(findingWords.length / 2)) {
      findingsScore += 1;
      matchedKeywords.push(finding);
    }
  }

  const findingsRatio = scenario.expectedFindings.length > 0
    ? findingsScore / scenario.expectedFindings.length
    : 0;

  // Calculate rubric scores
  const scores: Record<RubricCriterion, number> = {
    ACCURACY: findingsRatio,
    COMPLETENESS: Math.min(findingsRatio * 1.2, 1), // Slight boost for completeness
    SPECIFICITY: normalizedAnswer.length > 50 ? 0.8 : 0.5,
    TECHNICAL_DEPTH: matchedKeywords.length > 2 ? 0.9 : 0.6,
    CLARITY: 0.7, // Default - would need LLM for real assessment
    ACTIONABILITY: 0.7,
  };

  const overallScore = calculateWeightedScore(scores);

  if (overallScore >= 0.7) {
    return {
      isCorrect: true,
      confidence: overallScore,
      feedback: 'Root cause hypothesis accepted.',
      rubricScores: scores,
      nextGate: 'FIX_STRATEGY',
      allowProceed: true,
      matchedKeywords,
    };
  }

  if (overallScore >= 0.4) {
    return {
      isCorrect: false,
      confidence: overallScore,
      feedback: 'Hypothesis partially correct. Consider the underlying cause more deeply.',
      rubricScores: scores,
      nextGate: null,
      allowProceed: false,
      matchedKeywords,
    };
  }

  return createFailResult('Hypothesis needs more work. What is the actual cause of the bug?');
}

/**
 * Evaluate FIX_STRATEGY gate (must match one of allowed strategies)
 */
function evaluateFixStrategy(
  answer: string,
  scenario: DebugScenario,
  _context?: EvaluationContext
): EvaluationResult {
  const normalizedAnswer = answer.toLowerCase();
  const matchedKeywords: string[] = [];

  // Check against allowed fix strategies
  for (const strategy of scenario.fixStrategies) {
    const strategyLower = strategy.toLowerCase();
    const strategyWords = strategyLower.split(/\s+/).filter((w) => w.length > 3);

    // Check if significant words match
    const matchedWords = strategyWords.filter((word) => normalizedAnswer.includes(word));

    if (matchedWords.length >= Math.ceil(strategyWords.length / 2)) {
      matchedKeywords.push(strategy);
    }
  }

  if (matchedKeywords.length > 0) {
    return createPassResult(
      'Fix strategy accepted.',
      'REGRESSION_PREVENTION',
      matchedKeywords
    );
  }

  // Provide hint about acceptable strategies
  const strategyHint = scenario.fixStrategies.length > 0
    ? `Consider approaches like: ${scenario.fixStrategies[0]}`
    : 'Think about how to address the root cause directly.';

  return createFailResult(`Fix strategy not recognized. ${strategyHint}`);
}

/**
 * Evaluate REGRESSION_PREVENTION gate (mention tests/monitoring/invariants)
 */
function evaluateRegressionPrevention(
  answer: string,
  scenario: DebugScenario,
  _context?: EvaluationContext
): EvaluationResult {
  const normalizedAnswer = answer.toLowerCase();
  const matchedKeywords: string[] = [];
  const categoriesFound: string[] = [];

  // Check each prevention category
  for (const [category, keywords] of Object.entries(REGRESSION_KEYWORDS)) {
    const matches = keywords.filter((kw) => normalizedAnswer.includes(kw.toLowerCase()));
    if (matches.length > 0) {
      categoriesFound.push(category);
      matchedKeywords.push(...matches);
    }
  }

  // Check against scenario's regression expectation
  const expectationMet = normalizedAnswer.includes(
    scenario.regressionExpectation.toLowerCase()
  ) || scenario.regressionExpectation.toLowerCase().split(/\s+/).filter((w) => w.length > 3).some((word) => normalizedAnswer.includes(word));

  // Scoring based on categories covered
  const categoryScore = Math.min(categoriesFound.length / 3, 1); // Need 3 categories for full score
  const expectationBonus = expectationMet ? 0.2 : 0;
  const overallScore = Math.min(categoryScore + expectationBonus, 1);

  const scores: Record<RubricCriterion, number> = {
    ACCURACY: expectationMet ? 0.9 : 0.6,
    COMPLETENESS: categoryScore,
    SPECIFICITY: categoriesFound.length > 0 ? 0.8 : 0.4,
    TECHNICAL_DEPTH: categoriesFound.includes('TESTING') ? 0.9 : 0.6,
    CLARITY: 0.7,
    ACTIONABILITY: categoriesFound.length >= 2 ? 0.9 : 0.5,
  };

  if (overallScore >= 0.6) {
    return {
      isCorrect: true,
      confidence: overallScore,
      feedback: `Good prevention plan covering: ${categoriesFound.join(', ').toLowerCase()}.`,
      rubricScores: scores,
      nextGate: 'REFLECTION',
      allowProceed: true,
      matchedKeywords,
    };
  }

  return {
    isCorrect: false,
    confidence: overallScore,
    feedback: 'Regression prevention plan incomplete. Consider: testing, monitoring, invariants.',
    rubricScores: scores,
    nextGate: null,
    allowProceed: false,
    matchedKeywords,
  };
}

/**
 * Evaluate REFLECTION gate (grade clarity, low-stakes)
 */
function evaluateReflection(
  answer: string,
  _scenario: DebugScenario,
  _context?: EvaluationContext
): EvaluationResult {
  const normalizedAnswer = answer.trim();

  // Reflection is low-stakes - almost always passes if there's content
  if (normalizedAnswer.length < 20) {
    return createFailResult('Please provide a more detailed reflection on what you learned.');
  }

  // Check for some reflection indicators
  const reflectionIndicators = [
    'learned',
    'understand',
    'realized',
    'next time',
    'future',
    'mistake',
    'improve',
    'better',
    'insight',
    'takeaway',
  ];

  const indicatorsFound = reflectionIndicators.filter((ind) =>
    normalizedAnswer.toLowerCase().includes(ind)
  );

  const clarityScore = Math.min(indicatorsFound.length / 3 + 0.5, 1);

  return {
    isCorrect: true,
    confidence: clarityScore,
    feedback: 'Reflection recorded. Great job completing this debugging exercise!',
    rubricScores: {
      ACCURACY: 1.0, // Not applicable for reflection
      COMPLETENESS: normalizedAnswer.length > 100 ? 1.0 : 0.8,
      SPECIFICITY: clarityScore,
      TECHNICAL_DEPTH: 0.8, // Not heavily weighted for reflection
      CLARITY: clarityScore,
      ACTIONABILITY: indicatorsFound.includes('next time') || indicatorsFound.includes('future') ? 1.0 : 0.7,
    },
    nextGate: null, // Final gate
    allowProceed: true,
    matchedKeywords: indicatorsFound,
  };
}

// ============ Main Evaluation Function ============

/**
 * Evaluate a gate submission using heuristics
 */
export function evaluateGate(
  gate: DebugGate,
  answer: string,
  scenario: DebugScenario,
  context?: EvaluationContext
): EvaluationResult {
  switch (gate) {
    case 'SYMPTOM_CLASSIFICATION':
      return evaluateSymptomClassification(answer, scenario, context);
    case 'DETERMINISM_ANALYSIS':
      return evaluateDeterminismAnalysis(answer, scenario, context);
    case 'PATTERN_CLASSIFICATION':
      return evaluatePatternClassification(answer, scenario, context);
    case 'ROOT_CAUSE_HYPOTHESIS':
      return evaluateRootCauseHypothesis(answer, scenario, context);
    case 'FIX_STRATEGY':
      return evaluateFixStrategy(answer, scenario, context);
    case 'REGRESSION_PREVENTION':
      return evaluateRegressionPrevention(answer, scenario, context);
    case 'REFLECTION':
      return evaluateReflection(answer, scenario, context);
    default:
      return createFailResult(`Unknown gate: ${gate}`);
  }
}

// ============ Helper Functions ============

function createPassResult(
  feedback: string,
  nextGate: DebugGate | null,
  matchedKeywords?: string[]
): EvaluationResult {
  return {
    isCorrect: true,
    confidence: 1.0,
    feedback,
    rubricScores: {
      ACCURACY: 1.0,
      COMPLETENESS: 1.0,
      SPECIFICITY: 1.0,
      TECHNICAL_DEPTH: 1.0,
      CLARITY: 1.0,
      ACTIONABILITY: 1.0,
    },
    nextGate,
    allowProceed: true,
    matchedKeywords,
  };
}

function createFailResult(feedback: string): EvaluationResult {
  return {
    isCorrect: false,
    confidence: 0.0,
    feedback,
    rubricScores: {
      ACCURACY: 0.0,
      COMPLETENESS: 0.0,
      SPECIFICITY: 0.0,
      TECHNICAL_DEPTH: 0.0,
      CLARITY: 0.0,
      ACTIONABILITY: 0.0,
    },
    nextGate: null,
    allowProceed: false,
  };
}

function createPartialRubricScores(score: number): Record<RubricCriterion, number> {
  return {
    ACCURACY: score,
    COMPLETENESS: score,
    SPECIFICITY: score,
    TECHNICAL_DEPTH: score,
    CLARITY: score,
    ACTIONABILITY: score,
  };
}

function calculateWeightedScore(scores: Record<RubricCriterion, number>): number {
  const weights: Record<RubricCriterion, number> = {
    ACCURACY: 0.25,
    COMPLETENESS: 0.2,
    SPECIFICITY: 0.15,
    TECHNICAL_DEPTH: 0.2,
    CLARITY: 0.1,
    ACTIONABILITY: 0.1,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [criterion, weight] of Object.entries(weights)) {
    weightedSum += scores[criterion as RubricCriterion] * weight;
    totalWeight += weight;
  }

  return weightedSum / totalWeight;
}

// ============ Heuristic Evaluator Implementation ============

/**
 * Create a heuristic-based DebugEvaluator
 */
export function createHeuristicEvaluator(): {
  evaluate: (
    gate: DebugGate,
    answer: string,
    scenario: DebugScenario,
    context?: EvaluationContext
  ) => Promise<EvaluationResult>;
  isLLMAvailable: () => boolean;
} {
  return {
    evaluate: async (gate, answer, scenario, context) => {
      return evaluateGate(gate, answer, scenario, context);
    },
    isLLMAvailable: () => false,
  };
}
