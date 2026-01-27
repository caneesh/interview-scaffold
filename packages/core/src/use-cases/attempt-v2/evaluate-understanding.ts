/**
 * Evaluate Understanding Use Case
 *
 * Evaluates a user's explanation of a problem in the UNDERSTAND phase.
 * Uses AI to assess conceptual clarity without revealing solutions.
 *
 * Called by: POST /api/attempts/{id}/understand/submit
 */

import type { TenantId } from '../../entities/tenant.js';
import type { Problem } from '../../entities/problem.js';
import type { AttemptV2LLMPort, UnderstandEvalOutput } from '../../prompts/index.js';
import {
  UNDERSTAND_EVAL,
  callUnderstandEval,
  detectRedFlags,
  applyGuardrails,
} from '../../prompts/index.js';

// ============ Types ============

export interface EvaluateUnderstandingInput {
  readonly tenantId: TenantId;
  readonly attemptId: string;
  readonly userId: string;
  readonly problem: Problem;
  readonly explanation: string;
  readonly inputOutputDescription: string;
  readonly constraintsDescription: string;
  readonly exampleWalkthrough: string;
  readonly wrongApproach: string;
}

export interface EvaluateUnderstandingOutput {
  readonly status: 'PASS' | 'NEEDS_WORK';
  readonly strengths: readonly string[];
  readonly gaps: readonly string[];
  readonly followupQuestions: readonly string[];
  readonly solutionLeakRisk: 'low' | 'medium' | 'high';
  readonly source: 'ai' | 'deterministic';
}

export interface EvaluateUnderstandingDeps {
  readonly llm: AttemptV2LLMPort;
}

// ============ Errors ============

export class EvaluateUnderstandingError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'EvaluateUnderstandingError';
  }
}

// ============ Use Case ============

export async function evaluateUnderstanding(
  input: EvaluateUnderstandingInput,
  deps: EvaluateUnderstandingDeps
): Promise<EvaluateUnderstandingOutput> {
  const { problem, explanation, inputOutputDescription, constraintsDescription, exampleWalkthrough, wrongApproach } = input;
  const { llm } = deps;

  // 1. Check for red flags in user input
  const combinedInput = [explanation, inputOutputDescription, constraintsDescription, exampleWalkthrough, wrongApproach].join(' ');
  const redFlags = detectRedFlags(combinedInput);

  if (redFlags.detected && redFlags.flags.some(f => f.severity === 'block')) {
    // User is asking for solution, return gentle redirect
    return {
      status: 'NEEDS_WORK',
      strengths: [],
      gaps: ['Please focus on understanding the problem rather than seeking the solution.'],
      followupQuestions: ['Can you explain what the problem is asking in your own words?'],
      solutionLeakRisk: 'low',
      source: 'deterministic',
    };
  }

  // 2. Try AI evaluation
  if (llm.isEnabled()) {
    const result = await callUnderstandEval(llm, UNDERSTAND_EVAL, {
      problemStatement: problem.statement,
      explanation,
      inputOutputDescription,
      constraintsDescription,
      exampleWalkthrough,
      wrongApproach,
    });

    if (result.success && result.data) {
      // Apply final guardrails to any text output
      const guardrailCheck = applyGuardrails(
        result.data.followupQuestions.join(' '),
        'question'
      );

      // If guardrails flag high risk, fall back to deterministic
      if (guardrailCheck.riskLevel === 'high' || guardrailCheck.riskLevel === 'critical') {
        return evaluateDeterministic(input);
      }

      return {
        status: result.data.status,
        strengths: result.data.strengths,
        gaps: result.data.gaps,
        followupQuestions: result.data.followupQuestions,
        solutionLeakRisk: result.data.safety.solutionLeakRisk,
        source: 'ai',
      };
    }
  }

  // 3. Fall back to deterministic evaluation
  return evaluateDeterministic(input);
}

// ============ Deterministic Fallback ============

function evaluateDeterministic(
  input: EvaluateUnderstandingInput
): EvaluateUnderstandingOutput {
  const { explanation, inputOutputDescription, constraintsDescription, exampleWalkthrough, wrongApproach } = input;

  const strengths: string[] = [];
  const gaps: string[] = [];
  const followupQuestions: string[] = [];

  // Check explanation length and content
  const explanationWords = explanation.trim().split(/\s+/).length;
  if (explanationWords >= 20) {
    strengths.push('Provided a detailed explanation');
  } else if (explanationWords < 10) {
    gaps.push('Explanation is too brief');
    followupQuestions.push('Can you expand on your explanation? What is the core challenge this problem presents?');
  }

  // Check input/output description
  if (inputOutputDescription.trim().length >= 30) {
    strengths.push('Described inputs and outputs');
  } else {
    gaps.push('Input/output description is incomplete');
    followupQuestions.push('What types of inputs does this problem accept? What should the output look like?');
  }

  // Check constraints
  if (constraintsDescription.trim().length >= 20) {
    strengths.push('Identified constraints');
  } else {
    gaps.push('Constraints not fully addressed');
    followupQuestions.push('What constraints does the problem mention? Are there any limits on input size or values?');
  }

  // Check example walkthrough
  if (exampleWalkthrough.trim().length >= 30) {
    strengths.push('Walked through an example');
  } else {
    gaps.push('Example walkthrough is missing or incomplete');
    followupQuestions.push('Can you trace through a specific example step by step?');
  }

  // Check wrong approach
  if (wrongApproach.trim().length >= 15) {
    strengths.push('Identified an approach that would not work');
  } else {
    gaps.push('Did not identify a wrong approach');
    followupQuestions.push('Can you think of an approach that seems obvious but would not work? Why would it fail?');
  }

  // Determine status
  const status: 'PASS' | 'NEEDS_WORK' = gaps.length <= 1 ? 'PASS' : 'NEEDS_WORK';

  // Limit followup questions to 3
  const limitedFollowups = followupQuestions.slice(0, 3);

  return {
    status,
    strengths,
    gaps,
    followupQuestions: limitedFollowups,
    solutionLeakRisk: 'low',
    source: 'deterministic',
  };
}
