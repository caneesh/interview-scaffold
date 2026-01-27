/**
 * Guardrails for Attempt V2 LLM Outputs
 *
 * Implements safety checks to prevent solution leakage and ensure
 * appropriate responses. All LLM outputs must pass through guardrails
 * before being returned to users.
 *
 * CRITICAL: These guardrails are the last line of defense against
 * accidentally revealing solutions to students.
 */

// ============ Types ============

export interface GuardrailResult {
  readonly passed: boolean;
  readonly violations: readonly GuardrailViolation[];
  readonly sanitizedOutput?: string;
  readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface GuardrailViolation {
  readonly type: GuardrailViolationType;
  readonly description: string;
  readonly excerpt?: string;
  readonly lineNumber?: number;
}

export type GuardrailViolationType =
  | 'CODE_BLOCK'
  | 'INLINE_CODE'
  | 'SOLUTION_PHRASE'
  | 'DIRECT_FIX'
  | 'ALGORITHM_REVEAL'
  | 'COMPLEXITY_REVEAL'
  | 'REQUEST_FOR_SOLUTION'
  | 'EXCESSIVE_LENGTH'
  | 'SCHEMA_VIOLATION';

export interface RedFlagResult {
  readonly detected: boolean;
  readonly flags: readonly RedFlag[];
  readonly suggestedResponse: string;
}

export interface RedFlag {
  readonly type: RedFlagType;
  readonly excerpt: string;
  readonly severity: 'warning' | 'block';
}

export type RedFlagType =
  | 'ASKING_FOR_SOLUTION'
  | 'ASKING_FOR_CODE'
  | 'ASKING_FOR_ANSWER'
  | 'BYPASS_ATTEMPT'
  | 'FRUSTRATION_SIGNAL';

// ============ Solution Leak Detection ============

/**
 * Code block patterns to detect in responses
 */
const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;

/**
 * Inline code patterns that might contain solutions
 */
const INLINE_CODE_PATTERN = /`[^`]+`/g;

/**
 * Programming keywords that suggest code in backticks
 */
const CODE_KEYWORDS = new Set([
  'function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while',
  'class', 'def', 'import', 'export', 'async', 'await', 'try', 'catch',
  'switch', 'case', 'break', 'continue', 'new', 'this', 'self', 'lambda',
  'fn', 'pub', 'mut', 'impl', 'struct', 'enum',
  '++', '--', '+=', '-=', '==', '===', '!=', '!==', '<=', '>=',
]);

/**
 * Phrases that indicate direct solution revelation
 */
const SOLUTION_PHRASES: readonly RegExp[] = [
  /\bthe\s+(answer|solution)\s+is\b/i,
  /\byou\s+(should|need\s+to|must)\s+(use|write|add|remove|change|replace|fix)\b/i,
  /\bjust\s+(add|remove|change|use|replace|fix)\b/i,
  /\bthe\s+(bug|error|problem)\s+is\s+(at|on|in|that)\b/i,
  /\bchange\s+(line\s+\d+|this|that)\s+to\b/i,
  /\breplace\s+.+\s+with\b/i,
  /\bhere('s|\s+is)\s+(the|your|a)\s+(fix|solution|answer|code)\b/i,
  /\bthe\s+correct\s+(pattern|approach|algorithm)\s+is\b/i,
  /\buse\s+(sliding\s+window|two\s+pointers|binary\s+search|dfs|bfs|dp|dynamic\s+programming)\b/i,
  // Direct algorithm name mentions
  /\b(sliding\s+window|two\s+pointers|binary\s+search)\s+(approach|technique|method|pattern)\b/i,
  /\banswer\s+is\s+to\s+use\b/i,
];

/**
 * Phrases that reveal complexity analysis
 */
const COMPLEXITY_REVEAL_PHRASES: readonly RegExp[] = [
  /\btime\s+complexity\s+(is|would\s+be|should\s+be)\s+O\([^)]+\)/i,
  /\bspace\s+complexity\s+(is|would\s+be|should\s+be)\s+O\([^)]+\)/i,
  /\bthis\s+(gives|achieves|has)\s+O\([^)]+\)\s+(time|space)/i,
  /\boptimal\s+solution\s+(is|uses|has)\b/i,
];

/**
 * Detect solution leakage in LLM output
 *
 * @param output - The LLM output text to check
 * @returns GuardrailResult with violations found
 */
export function detectSolutionLeak(output: string): GuardrailResult {
  const violations: GuardrailViolation[] = [];

  // 1. Check for code blocks
  const codeBlocks = output.match(CODE_BLOCK_PATTERN);
  if (codeBlocks) {
    for (const block of codeBlocks) {
      violations.push({
        type: 'CODE_BLOCK',
        description: 'Response contains a code block which may reveal the solution',
        excerpt: block.slice(0, 100) + (block.length > 100 ? '...' : ''),
      });
    }
  }

  // 2. Check inline code for programming keywords
  const inlineMatches = output.matchAll(INLINE_CODE_PATTERN);
  for (const match of inlineMatches) {
    const content = match[0].slice(1, -1); // Remove backticks
    const words = content.toLowerCase().split(/\s+/);
    const hasCodeKeyword = words.some(word => CODE_KEYWORDS.has(word));

    // Also check for assignment-like patterns
    const hasAssignment = /[a-z_]\w*\s*[+\-*/]?=/.test(content);
    const hasFunction = /\w+\s*\(.*\)/.test(content);

    if (hasCodeKeyword || (hasAssignment && content.length > 10) || hasFunction) {
      violations.push({
        type: 'INLINE_CODE',
        description: 'Inline code may contain solution hints',
        excerpt: content,
      });
    }
  }

  // 3. Check for solution phrases
  for (const pattern of SOLUTION_PHRASES) {
    const match = output.match(pattern);
    if (match) {
      violations.push({
        type: 'SOLUTION_PHRASE',
        description: 'Response contains phrasing that may reveal the solution',
        excerpt: match[0],
      });
    }
  }

  // 4. Check for complexity reveals
  for (const pattern of COMPLEXITY_REVEAL_PHRASES) {
    const match = output.match(pattern);
    if (match) {
      violations.push({
        type: 'COMPLEXITY_REVEAL',
        description: 'Response reveals optimal complexity which hints at solution',
        excerpt: match[0],
      });
    }
  }

  // Determine risk level
  const riskLevel = calculateRiskLevel(violations);

  return {
    passed: violations.length === 0,
    violations,
    riskLevel,
  };
}

/**
 * Calculate overall risk level from violations
 */
function calculateRiskLevel(
  violations: readonly GuardrailViolation[]
): 'low' | 'medium' | 'high' | 'critical' {
  if (violations.length === 0) return 'low';

  const hasCodeBlock = violations.some(v => v.type === 'CODE_BLOCK');
  const hasSolutionPhrase = violations.some(v => v.type === 'SOLUTION_PHRASE');
  const violationCount = violations.length;

  if (hasCodeBlock && hasSolutionPhrase) return 'critical';
  if (hasCodeBlock || violationCount >= 3) return 'high';
  if (hasSolutionPhrase || violationCount >= 2) return 'medium';
  return 'low';
}

// ============ Red Flag Detection ============

/**
 * Patterns that indicate user is asking for solution
 */
const SOLUTION_REQUEST_PATTERNS: readonly RegExp[] = [
  /\bgive\s+me\s+(the\s+)?(solution|answer|code)\b/i,
  /\bjust\s+tell\s+me\s+(the\s+)?(answer|solution)\b/i,
  /\bwhat('s|\s+is)\s+the\s+(answer|solution|code)\b/i,
  /\bshow\s+me\s+(the\s+)?(solution|answer|code)\b/i,
  /\bcan\s+you\s+(just\s+)?(solve|fix)\s+(it|this)\s+for\s+me\b/i,
  /\bi\s+give\s+up[,.]?\s*(just\s+)?(tell|show|give)\s+me\b/i,
  /\bwrite\s+(the\s+)?(code|solution)\s+for\s+me\b/i,
];

/**
 * Patterns that indicate bypass attempts
 */
const BYPASS_PATTERNS: readonly RegExp[] = [
  /\bignore\s+(previous\s+)?(instructions|rules)\b/i,
  /\bforget\s+(the\s+)?(rules|constraints)\b/i,
  /\bpretend\s+you('re|\s+are)\s+not\s+a\s+tutor\b/i,
  /\bact\s+as\s+(if|though)\b/i,
  /\brole\s*play\s+as\b/i,
];

/**
 * Patterns that indicate frustration (gentler handling)
 */
const FRUSTRATION_PATTERNS: readonly RegExp[] = [
  /\bi('m|\s+am)\s+(stuck|confused|lost)\b/i,
  /\bthis\s+(is\s+)?(too\s+)?(hard|difficult|confusing)\b/i,
  /\bi\s+don('t|'t)\s+understand\b/i,
  /\bnothing\s+(i\s+try\s+)?(works|is\s+working)\b/i,
  /\bi('ve|\s+have)\s+tried\s+everything\b/i,
];

/**
 * Detect red flags in user input
 *
 * @param input - User's input text
 * @returns RedFlagResult with detected flags and suggested response
 */
export function detectRedFlags(input: string): RedFlagResult {
  const flags: RedFlag[] = [];

  // Check for direct solution requests
  for (const pattern of SOLUTION_REQUEST_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      flags.push({
        type: 'ASKING_FOR_SOLUTION',
        excerpt: match[0],
        severity: 'block',
      });
    }
  }

  // Check for bypass attempts
  for (const pattern of BYPASS_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      flags.push({
        type: 'BYPASS_ATTEMPT',
        excerpt: match[0],
        severity: 'block',
      });
    }
  }

  // Check for frustration signals (warning, not block)
  for (const pattern of FRUSTRATION_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      flags.push({
        type: 'FRUSTRATION_SIGNAL',
        excerpt: match[0],
        severity: 'warning',
      });
    }
  }

  // Generate appropriate response
  const hasBlockingFlag = flags.some(f => f.severity === 'block');
  const hasFrustration = flags.some(f => f.type === 'FRUSTRATION_SIGNAL');

  let suggestedResponse: string;
  if (hasBlockingFlag) {
    suggestedResponse = generateRefusalResponse(flags);
  } else if (hasFrustration) {
    suggestedResponse = generateEncouragementResponse();
  } else {
    suggestedResponse = '';
  }

  return {
    detected: flags.length > 0,
    flags,
    suggestedResponse,
  };
}

/**
 * Generate a gentle refusal response
 */
function generateRefusalResponse(flags: readonly RedFlag[]): string {
  const hasBypass = flags.some(f => f.type === 'BYPASS_ATTEMPT');

  if (hasBypass) {
    return `I understand you might be frustrated, but I'm here to help you learn, not just give you the answer. Let's work through this together. What specific part is confusing you?`;
  }

  return `I can't give you the solution directly, but I can help you figure it out yourself. That's how you'll actually learn and remember it. Let me ask you a question that might help: What do you think is the key insight needed to solve this problem?`;
}

/**
 * Generate an encouragement response for frustrated users
 */
function generateEncouragementResponse(): string {
  return `I can see you're finding this challenging - that's actually a good sign! It means you're pushing your boundaries. Let's break this down into smaller steps. What's the first thing you understand clearly about the problem?`;
}

// ============ Output Sanitization ============

/**
 * Maximum allowed length for different output types
 */
const MAX_LENGTHS = {
  hint: 500,
  explanation: 800,
  feedback: 600,
  question: 300,
  default: 1000,
} as const;

export type OutputType = keyof typeof MAX_LENGTHS;

/**
 * Sanitize LLM output by removing potentially harmful content
 *
 * @param output - Raw LLM output
 * @param outputType - Type of output for length limits
 * @returns Sanitized output
 */
export function sanitizeOutput(
  output: string,
  outputType: OutputType = 'default'
): string {
  let sanitized = output;

  // 1. Remove code blocks
  sanitized = sanitized.replace(CODE_BLOCK_PATTERN, '[code removed]');

  // 2. Remove inline code with programming keywords
  sanitized = sanitized.replace(INLINE_CODE_PATTERN, (match) => {
    const content = match.slice(1, -1);
    const words = content.toLowerCase().split(/\s+/);
    const hasCodeKeyword = words.some(word => CODE_KEYWORDS.has(word));
    if (hasCodeKeyword) {
      return '[code removed]';
    }
    return match; // Keep safe inline code
  });

  // 3. Truncate to max length
  const maxLength = MAX_LENGTHS[outputType];
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength - 3) + '...';
  }

  return sanitized.trim();
}

/**
 * Full guardrail pipeline: detect, sanitize, validate
 *
 * @param output - Raw LLM output
 * @param outputType - Type of output
 * @returns GuardrailResult with sanitized output if passed
 */
export function applyGuardrails(
  output: string,
  outputType: OutputType = 'default'
): GuardrailResult {
  const leakResult = detectSolutionLeak(output);

  // If high/critical risk, sanitize and re-check
  if (leakResult.riskLevel === 'high' || leakResult.riskLevel === 'critical') {
    const sanitized = sanitizeOutput(output, outputType);
    const recheck = detectSolutionLeak(sanitized);

    return {
      passed: recheck.passed,
      violations: [...leakResult.violations],
      sanitizedOutput: sanitized,
      riskLevel: recheck.riskLevel,
    };
  }

  // For low/medium, still sanitize but mark as passed
  if (leakResult.riskLevel === 'medium') {
    const sanitized = sanitizeOutput(output, outputType);
    return {
      passed: true,
      violations: leakResult.violations,
      sanitizedOutput: sanitized,
      riskLevel: 'low',
    };
  }

  // Low risk, just apply length limits
  const sanitized = output.length > MAX_LENGTHS[outputType]
    ? output.slice(0, MAX_LENGTHS[outputType] - 3) + '...'
    : output;

  return {
    passed: true,
    violations: [],
    sanitizedOutput: sanitized,
    riskLevel: 'low',
  };
}

// ============ Schema Validation Guardrail ============

/**
 * Ensure schema-level guarantees are met
 *
 * For VerifyExplainOutput, ensures noSolutionCode is true
 * For SocraticHintOutput, ensures noCodeProvided is true
 */
export function validateSchemaGuarantees(
  output: Record<string, unknown>,
  schemaType: 'verify_explain' | 'socratic_hint' | 'other'
): GuardrailResult {
  const violations: GuardrailViolation[] = [];

  if (schemaType === 'verify_explain') {
    if (output.noSolutionCode !== true) {
      violations.push({
        type: 'SCHEMA_VIOLATION',
        description: 'noSolutionCode must be true but was missing or false',
      });
    }
  }

  if (schemaType === 'socratic_hint') {
    if (output.noCodeProvided !== true) {
      violations.push({
        type: 'SCHEMA_VIOLATION',
        description: 'noCodeProvided must be true but was missing or false',
      });
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    riskLevel: violations.length > 0 ? 'critical' : 'low',
  };
}

// ============ Combined Guardrail Check ============

/**
 * Run all guardrails on an output
 *
 * @param output - The text output to check
 * @param parsedOutput - The parsed JSON output (for schema checks)
 * @param schemaType - Type of schema for guarantee checks
 * @param outputType - Type of output for length limits
 * @returns Combined guardrail result
 */
export function runAllGuardrails(
  output: string,
  parsedOutput: Record<string, unknown> | null,
  schemaType: 'verify_explain' | 'socratic_hint' | 'other' = 'other',
  outputType: OutputType = 'default'
): GuardrailResult {
  // 1. Apply content guardrails
  const contentResult = applyGuardrails(output, outputType);

  // 2. Apply schema guardrails if parsed output available
  let schemaResult: GuardrailResult = {
    passed: true,
    violations: [],
    riskLevel: 'low',
  };

  if (parsedOutput && schemaType !== 'other') {
    schemaResult = validateSchemaGuarantees(parsedOutput, schemaType);
  }

  // 3. Combine results
  const allViolations = [...contentResult.violations, ...schemaResult.violations];
  const maxRisk = getMaxRiskLevel(contentResult.riskLevel, schemaResult.riskLevel);

  return {
    passed: contentResult.passed && schemaResult.passed,
    violations: allViolations,
    sanitizedOutput: contentResult.sanitizedOutput,
    riskLevel: maxRisk,
  };
}

/**
 * Get the maximum risk level
 */
function getMaxRiskLevel(
  a: GuardrailResult['riskLevel'],
  b: GuardrailResult['riskLevel']
): GuardrailResult['riskLevel'] {
  const levels = ['low', 'medium', 'high', 'critical'] as const;
  const aIndex = levels.indexOf(a);
  const bIndex = levels.indexOf(b);
  return levels[Math.max(aIndex, bIndex)]!;
}
