/**
 * Anti-Memorization Detection System
 *
 * Detects memorized/editorial content using heuristic analysis.
 * Uses multiple signals to determine if a response is genuine
 * or potentially copied from online resources.
 */

import type {
  MemorizationDetectionContext,
  MemorizationDetectionResult,
  MemorizationDetectionConfig,
  DetectionSignal,
  DetectionSignalType,
  MemorizationClassification,
  MemorizationAction,
  SocraticReprompt,
  EditorialPhrase,
} from './types.js';
import {
  DEFAULT_DETECTION_CONFIG,
} from './types.js';
import type { HelpLevel } from '../learner-centric/types.js';
import {
  getPhrasesForPattern,
  countAuthenticIndicators,
  AUTHENTIC_REASONING_PHRASES,
} from './editorial-phrases.js';

// ============ Detection Thresholds ============

/**
 * Minimum word count to check for personal reasoning indicators.
 */
const MIN_WORDS_FOR_PERSONAL_REASONING_CHECK = 50;

/**
 * Word count threshold for partial concern about missing personal reasoning.
 */
const PARTIAL_CONCERN_WORD_THRESHOLD = 100;

/**
 * Minimum number of step pattern matches to indicate template-like format.
 */
const MIN_STEP_PATTERN_MATCHES = 3;

/**
 * Base confidence for step list format detection.
 */
const STEP_LIST_BASE_CONFIDENCE = 0.3;

/**
 * Confidence increment per additional step pattern match.
 */
const STEP_LIST_CONFIDENCE_INCREMENT = 0.1;

/**
 * Maximum confidence for step list format detection.
 */
const STEP_LIST_MAX_CONFIDENCE = 0.8;

/**
 * Confidence for template wording detection (First/Then/Finally pattern).
 */
const TEMPLATE_WORDING_CONFIDENCE = 0.4;

/**
 * Response time threshold (ms) considered suspiciously fast for optimal solution.
 */
const FAST_RESPONSE_THRESHOLD_MS = 30000;

/**
 * Confidence for instant optimal detection when response is fast.
 */
const INSTANT_OPTIMAL_FAST_CONFIDENCE = 0.6;

/**
 * Confidence for instant optimal detection when response is normal speed.
 */
const INSTANT_OPTIMAL_NORMAL_CONFIDENCE = 0.4;

/**
 * Minimum text length to check for missing tradeoff discussion.
 */
const MIN_LENGTH_FOR_TRADEOFF_CHECK = 200;

/**
 * Confidence for missing tradeoff detection.
 */
const MISSING_TRADEOFF_CONFIDENCE = 0.35;

/**
 * Confidence for pattern name drop detection.
 */
const PATTERN_NAME_DROP_CONFIDENCE = 0.4;

/**
 * Confidence for complexity recitation detection.
 */
const COMPLEXITY_RECITATION_CONFIDENCE = 0.35;

/**
 * Threshold for formal vocabulary increase to be suspicious.
 */
const VOCABULARY_MISMATCH_THRESHOLD = 3;

/**
 * Confidence for vocabulary mismatch detection.
 */
const VOCABULARY_MISMATCH_CONFIDENCE = 0.4;

/**
 * Confidence for known anti-cheat markers.
 */
const ANTI_CHEAT_MARKER_CONFIDENCE = 0.7;

/**
 * Divisor for normalizing aggregate confidence.
 */
const CONFIDENCE_NORMALIZATION_DIVISOR = 2;

/**
 * Reduction in confidence per authentic indicator found.
 */
const AUTHENTIC_INDICATOR_CONFIDENCE_REDUCTION = 0.1;

// ============ Signal Detection Functions ============

/**
 * Detect template-like wording patterns
 */
function detectTemplateWording(text: string): DetectionSignal | null {
  // Check for numbered step patterns
  const stepPattern = /(?:step\s*\d+[:.]|^\d+\.\s+)/gim;
  const stepMatches = text.match(stepPattern);

  if (stepMatches && stepMatches.length >= MIN_STEP_PATTERN_MATCHES) {
    return {
      type: 'step_list_format',
      confidence: Math.min(
        STEP_LIST_BASE_CONFIDENCE + stepMatches.length * STEP_LIST_CONFIDENCE_INCREMENT,
        STEP_LIST_MAX_CONFIDENCE
      ),
      evidence: `Found ${stepMatches.length} numbered steps in tutorial-like format`,
      excerpt: stepMatches.slice(0, 3).join(', '),
    };
  }

  // Check for "First... Then... Finally..." structure
  const sequencePattern = /\b(first|initially)[^.]*\.\s*[^.]*\b(then|next|after that)[^.]*\.\s*[^.]*\b(finally|lastly)/i;
  const sequenceMatch = text.match(sequencePattern);

  if (sequenceMatch) {
    return {
      type: 'template_wording',
      confidence: TEMPLATE_WORDING_CONFIDENCE,
      evidence: 'Response follows "First... Then... Finally" tutorial structure',
      excerpt: sequenceMatch[0].substring(0, 100),
    };
  }

  return null;
}

// ============ Regex Safety Constants ============

/**
 * Maximum length of text to process with custom regex patterns.
 * Protects against ReDoS by limiting input size.
 */
const REGEX_MAX_INPUT_LENGTH = 10000;

/**
 * Maximum length of a regex pattern to prevent overly complex patterns.
 */
const REGEX_MAX_PATTERN_LENGTH = 200;

/**
 * Patterns that indicate potentially dangerous regex constructs (ReDoS vectors).
 * These patterns can cause catastrophic backtracking.
 */
const DANGEROUS_REGEX_PATTERNS = [
  /(\+|\*|\{[0-9]+,\})\+/, // Nested quantifiers: a++, a*+, a{2,}+
  /(\+|\*|\{[0-9]+,\})\*/, // Nested quantifiers: a+*, a**, a{2,}*
  /(\+|\*|\{[0-9]+,\})\{/, // Nested quantifiers followed by {
  /\([^)]*\)\+[^)]*\(/,    // Repeated group pattern followed by another group
];

/**
 * Check if a regex pattern is potentially dangerous (ReDoS vulnerable).
 */
function isDangerousRegex(pattern: string): boolean {
  // Check pattern length
  if (pattern.length > REGEX_MAX_PATTERN_LENGTH) {
    return true;
  }

  // Check for dangerous patterns
  for (const dangerous of DANGEROUS_REGEX_PATTERNS) {
    if (dangerous.test(pattern)) {
      return true;
    }
  }

  return false;
}

/**
 * Safely execute a regex match with input length limiting.
 * Returns null if the match times out or input is too large.
 */
function safeRegexMatch(text: string, pattern: string, flags: string): RegExpMatchArray | null {
  // Limit input size to prevent ReDoS
  const safeText = text.length > REGEX_MAX_INPUT_LENGTH
    ? text.substring(0, REGEX_MAX_INPUT_LENGTH)
    : text;

  // Check for dangerous patterns
  if (isDangerousRegex(pattern)) {
    // Skip dangerous patterns entirely
    return null;
  }

  try {
    const regex = new RegExp(pattern, flags);
    return safeText.match(regex);
  } catch {
    // Invalid regex
    return null;
  }
}

/**
 * Detect editorial catchphrases
 */
function detectEditorialCatchphrases(
  text: string,
  phrases: readonly EditorialPhrase[]
): DetectionSignal[] {
  const signals: DetectionSignal[] = [];
  const lowerText = text.toLowerCase();

  for (const phrase of phrases) {
    let matches: RegExpMatchArray | null = null;

    if (phrase.isRegex) {
      // Use safe regex matching with ReDoS protection
      matches = safeRegexMatch(text, phrase.pattern, 'gi');
    } else {
      if (lowerText.includes(phrase.pattern.toLowerCase())) {
        matches = [phrase.pattern];
      }
    }

    if (matches && matches.length > 0) {
      signals.push({
        type: 'editorial_catchphrase',
        confidence: phrase.weight,
        evidence: `Found editorial phrase: "${phrase.pattern}"`,
        excerpt: matches[0],
      });
    }
  }

  return signals;
}

/**
 * Detect lack of personal reasoning
 */
function detectNoPersonalReasoning(text: string): DetectionSignal | null {
  const authenticCount = countAuthenticIndicators(text);
  const wordCount = text.split(/\s+/).length;

  // If text is long enough but has no personal reasoning indicators
  if (wordCount >= MIN_WORDS_FOR_PERSONAL_REASONING_CHECK && authenticCount === 0) {
    return {
      type: 'no_personal_reasoning',
      confidence: 0.5,
      evidence: `Response of ${wordCount} words contains no personal reasoning indicators`,
    };
  }

  // Partial concern if very few indicators for length
  if (wordCount >= PARTIAL_CONCERN_WORD_THRESHOLD && authenticCount <= 1) {
    return {
      type: 'no_personal_reasoning',
      confidence: 0.3,
      evidence: `Response of ${wordCount} words has minimal personal reasoning (${authenticCount} indicators)`,
    };
  }

  return null;
}

/**
 * Detect instant jump to optimal solution
 */
function detectInstantOptimal(
  text: string,
  context: MemorizationDetectionContext
): DetectionSignal | null {
  const lowerText = text.toLowerCase();

  // Check if mentions optimal without exploring alternatives
  const optimalMentions = (lowerText.match(/\b(optimal|best|most efficient)\b/g) || []).length;
  const alternativeMentions = (lowerText.match(/\b(alternatively|another way|could also|brute force|naive)\b/g) || []).length;

  // Response time check - very fast optimal answers are suspicious
  const isVeryFast = context.responseTimeMs < FAST_RESPONSE_THRESHOLD_MS;

  if (optimalMentions >= 2 && alternativeMentions === 0 && context.attemptCount === 1) {
    return {
      type: 'instant_optimal',
      confidence: isVeryFast ? INSTANT_OPTIMAL_FAST_CONFIDENCE : INSTANT_OPTIMAL_NORMAL_CONFIDENCE,
      evidence: 'Jumped to optimal solution without exploring alternatives on first attempt',
    };
  }

  return null;
}

/**
 * Detect missing tradeoff discussion
 */
function detectMissingTradeoffs(text: string): DetectionSignal | null {
  // Check for complexity mentions without tradeoff discussion
  const hasComplexityMention = /o\([^)]+\)/i.test(text);
  const hasTradeoffWords = /\b(tradeoff|trade-off|versus|vs\.?|downside|drawback|however|although|but)\b/i.test(text);

  // If discussing complexity but no tradeoffs
  if (hasComplexityMention && !hasTradeoffWords && text.length > MIN_LENGTH_FOR_TRADEOFF_CHECK) {
    return {
      type: 'missing_tradeoffs',
      confidence: MISSING_TRADEOFF_CONFIDENCE,
      evidence: 'Discusses complexity without mentioning any tradeoffs or alternatives',
    };
  }

  return null;
}

/**
 * Detect pattern name dropping without explanation
 */
function detectPatternNameDrop(
  text: string,
  pattern: string
): DetectionSignal | null {
  const patternNames: Record<string, string[]> = {
    'SLIDING_WINDOW': ['sliding window', 'two pointer'],
    'TWO_POINTERS': ['two pointers', 'two pointer'],
    'BINARY_SEARCH': ['binary search'],
    'DFS': ['dfs', 'depth first', 'depth-first'],
    'BFS': ['bfs', 'breadth first', 'breadth-first'],
    'DYNAMIC_PROGRAMMING': ['dynamic programming', 'dp', 'memoization'],
    'BACKTRACKING': ['backtracking', 'backtrack'],
    'GREEDY': ['greedy'],
    'HEAP': ['heap', 'priority queue'],
    'TRIE': ['trie', 'prefix tree'],
    'UNION_FIND': ['union find', 'disjoint set'],
    'INTERVAL_MERGING': ['interval', 'merge interval'],
  };

  const names = patternNames[pattern] || [];
  const lowerText = text.toLowerCase();

  for (const name of names) {
    const nameIndex = lowerText.indexOf(name);
    if (nameIndex !== -1) {
      // Check if there's explanation around the pattern mention
      const context = lowerText.substring(
        Math.max(0, nameIndex - 50),
        Math.min(lowerText.length, nameIndex + name.length + 100)
      );

      const hasExplanation = /\b(because|since|as|due to|works here|fits|applies|suitable)\b/i.test(context);

      if (!hasExplanation) {
        return {
          type: 'pattern_name_drop',
          confidence: PATTERN_NAME_DROP_CONFIDENCE,
          evidence: `Mentions "${name}" pattern without explaining why it applies`,
          excerpt: text.substring(nameIndex, nameIndex + name.length + 50),
        };
      }
    }
  }

  return null;
}

/**
 * Detect complexity recitation without derivation
 */
function detectComplexityRecitation(text: string): DetectionSignal | null {
  // Match complexity statements
  const complexityPattern = /(?:time|space)\s*(?:complexity)?[:\s]*O\([^)]+\)/gi;
  const matches = text.match(complexityPattern);

  if (matches && matches.length > 0) {
    // Check if there's derivation/explanation
    const hasDerivation = /\b(because|since|we visit|iterate|for each|at most|amortized)\b/i.test(text);

    if (!hasDerivation) {
      return {
        type: 'complexity_recitation',
        confidence: COMPLEXITY_RECITATION_CONFIDENCE,
        evidence: 'States complexity without explaining derivation',
        excerpt: matches[0],
      };
    }
  }

  return null;
}

/**
 * Detect vocabulary inconsistency with previous responses
 */
function detectVocabularyMismatch(
  text: string,
  previousResponses: readonly string[]
): DetectionSignal | null {
  if (previousResponses.length === 0) return null;

  // Count formal/technical terms in current response
  const formalTerms = /\b(furthermore|moreover|thus|hence|consequently|invariant|optimal substructure|recurrence relation)\b/gi;
  const currentFormalCount = (text.match(formalTerms) || []).length;

  // Count in previous responses
  const previousFormalCounts = previousResponses.map(r =>
    (r.match(formalTerms) || []).length
  );
  const avgPreviousFormal = previousFormalCounts.reduce((a, b) => a + b, 0) / previousFormalCounts.length;

  // Significant increase in formality is suspicious
  if (currentFormalCount > avgPreviousFormal + VOCABULARY_MISMATCH_THRESHOLD) {
    return {
      type: 'vocabulary_mismatch',
      confidence: VOCABULARY_MISMATCH_CONFIDENCE,
      evidence: `Sudden increase in formal vocabulary (${currentFormalCount} vs avg ${avgPreviousFormal.toFixed(1)})`,
    };
  }

  return null;
}

/**
 * Check against custom anti-cheat markers from problem metadata
 */
function checkAntiCheatMarkers(
  text: string,
  markers: readonly string[]
): DetectionSignal[] {
  const signals: DetectionSignal[] = [];
  const lowerText = text.toLowerCase();

  for (const marker of markers) {
    if (lowerText.includes(marker.toLowerCase())) {
      signals.push({
        type: 'editorial_catchphrase',
        confidence: ANTI_CHEAT_MARKER_CONFIDENCE,
        evidence: `Found known editorial marker: "${marker}"`,
        excerpt: marker,
      });
    }
  }

  return signals;
}

// ============ Input Validation ============

/**
 * Validate memorization detection context.
 * Throws if required fields are missing or invalid.
 */
function validateContext(context: MemorizationDetectionContext): void {
  if (typeof context.responseText !== 'string') {
    throw new Error('detectMemorization: context.responseText must be a string');
  }
  if (!Array.isArray(context.previousResponses)) {
    throw new Error('detectMemorization: context.previousResponses must be an array');
  }
  if (typeof context.stage !== 'string' || context.stage.length === 0) {
    throw new Error('detectMemorization: context.stage must be a non-empty string');
  }
  if (typeof context.problemId !== 'string' || context.problemId.length === 0) {
    throw new Error('detectMemorization: context.problemId must be a non-empty string');
  }
  if (typeof context.pattern !== 'string' || context.pattern.length === 0) {
    throw new Error('detectMemorization: context.pattern must be a non-empty string');
  }
  if (typeof context.responseTimeMs !== 'number' || context.responseTimeMs < 0) {
    throw new Error('detectMemorization: context.responseTimeMs must be a non-negative number');
  }
  if (typeof context.attemptCount !== 'number' || context.attemptCount < 0) {
    throw new Error('detectMemorization: context.attemptCount must be a non-negative number');
  }
  // Validate previousResponses array contains only strings
  for (let i = 0; i < context.previousResponses.length; i++) {
    if (typeof context.previousResponses[i] !== 'string') {
      throw new Error(`detectMemorization: context.previousResponses[${i}] must be a string`);
    }
  }
}

// ============ Main Detection Function ============

/**
 * Run all detection heuristics and aggregate results.
 * Validates input context before processing.
 *
 * @throws {Error} If context fields are missing or invalid
 */
export function detectMemorization(
  context: MemorizationDetectionContext,
  config: MemorizationDetectionConfig = DEFAULT_DETECTION_CONFIG
): MemorizationDetectionResult {
  // Validate inputs before processing
  validateContext(context);

  const signals: DetectionSignal[] = [];

  // Run all detectors
  const templateSignal = detectTemplateWording(context.responseText);
  if (templateSignal) signals.push(templateSignal);

  const phrases = getPhrasesForPattern(context.pattern);
  const allPhrases = [...phrases, ...config.customPhrases];
  signals.push(...detectEditorialCatchphrases(context.responseText, allPhrases));

  const personalSignal = detectNoPersonalReasoning(context.responseText);
  if (personalSignal) signals.push(personalSignal);

  const optimalSignal = detectInstantOptimal(context.responseText, context);
  if (optimalSignal) signals.push(optimalSignal);

  const tradeoffSignal = detectMissingTradeoffs(context.responseText);
  if (tradeoffSignal) signals.push(tradeoffSignal);

  const patternDropSignal = detectPatternNameDrop(context.responseText, context.pattern);
  if (patternDropSignal) signals.push(patternDropSignal);

  const complexitySignal = detectComplexityRecitation(context.responseText);
  if (complexitySignal) signals.push(complexitySignal);

  const vocabSignal = detectVocabularyMismatch(context.responseText, context.previousResponses);
  if (vocabSignal) signals.push(vocabSignal);

  if (context.antiCheatMarkers) {
    signals.push(...checkAntiCheatMarkers(context.responseText, context.antiCheatMarkers));
  }

  // Calculate aggregate confidence
  const totalConfidence = signals.reduce((sum, s) => sum + s.confidence, 0);
  const normalizedConfidence = Math.min(totalConfidence / CONFIDENCE_NORMALIZATION_DIVISOR, 1); // Cap at 1

  // Adjust for authentic indicators
  const authenticCount = countAuthenticIndicators(context.responseText);
  const adjustedConfidence = Math.max(0, normalizedConfidence - authenticCount * AUTHENTIC_INDICATOR_CONFIDENCE_REDUCTION);

  // Classify
  let classification: MemorizationClassification;
  if (adjustedConfidence >= config.likelyThreshold) {
    classification = 'likely_memorized';
  } else if (adjustedConfidence >= config.partialThreshold) {
    classification = 'partially_memorized';
  } else {
    classification = 'authentic';
  }

  // Determine action
  const action = determineAction(classification, context);

  // Generate reprompts if needed
  const reprompts = action === 'block_and_reprompt'
    ? generateReprompts(context, signals, config.maxReprompts)
    : [];

  // Determine help level adjustment
  const recommendedHelpLevel = determineHelpLevel(classification, context.currentHelpLevel);

  return {
    classification,
    confidence: adjustedConfidence,
    signals,
    action,
    reprompts,
    recommendedHelpLevel,
    explanation: generateExplanation(classification, signals, adjustedConfidence),
  };
}

// ============ Helper Functions ============

/**
 * Determine action based on classification and context
 */
function determineAction(
  classification: MemorizationClassification,
  context: MemorizationDetectionContext
): MemorizationAction {
  if (classification === 'authentic') {
    return 'continue';
  }

  if (classification === 'likely_memorized') {
    // Strong memorization signal
    if (context.stage === 'PATTERN_RECOGNITION' || context.stage === 'STRATEGY_DESIGN') {
      return 'reset_to_feynman';
    }
    return 'block_and_reprompt';
  }

  // Partial memorization
  if (context.attemptCount >= 2) {
    // Multiple attempts with partial memorization signals
    return 'block_and_reprompt';
  }

  return 'continue'; // Give benefit of doubt on first partial detection
}

/**
 * Generate Socratic reprompts based on detected signals
 */
function generateReprompts(
  context: MemorizationDetectionContext,
  signals: readonly DetectionSignal[],
  maxCount: number
): SocraticReprompt[] {
  const reprompts: SocraticReprompt[] = [];

  // Always include a general understanding question
  reprompts.push({
    id: 'reprompt-understanding',
    question: 'Can you explain in your own words why this approach works for this specific problem?',
    purpose: 'Force genuine articulation of understanding',
    targetConcept: 'core_understanding',
  });

  // Add signal-specific questions
  for (const signal of signals) {
    if (reprompts.length >= maxCount) break;

    switch (signal.type) {
      case 'instant_optimal':
        reprompts.push({
          id: 'reprompt-alternatives',
          question: 'What other approaches did you consider before arriving at this one? What made you reject them?',
          purpose: 'Verify exploration of solution space',
          targetConcept: 'problem_exploration',
        });
        break;

      case 'pattern_name_drop':
        reprompts.push({
          id: 'reprompt-pattern-fit',
          question: 'What specific characteristics of this problem made you think this pattern would work?',
          purpose: 'Verify pattern recognition reasoning',
          targetConcept: 'pattern_mapping',
        });
        break;

      case 'complexity_recitation':
        reprompts.push({
          id: 'reprompt-complexity',
          question: 'Can you walk me through how you derived that complexity? What operations contribute to it?',
          purpose: 'Verify complexity analysis ability',
          targetConcept: 'complexity_derivation',
        });
        break;

      case 'missing_tradeoffs':
        reprompts.push({
          id: 'reprompt-tradeoffs',
          question: 'What are the tradeoffs of this approach? In what scenarios might a different approach be better?',
          purpose: 'Verify deep understanding of approach',
          targetConcept: 'solution_tradeoffs',
        });
        break;

      case 'no_personal_reasoning':
        reprompts.push({
          id: 'reprompt-intuition',
          question: 'What was your initial intuition when you first read this problem? What stood out to you?',
          purpose: 'Elicit genuine problem-solving thought process',
          targetConcept: 'initial_intuition',
        });
        break;
    }
  }

  return reprompts.slice(0, maxCount);
}

/**
 * Determine recommended help level based on detection
 */
function determineHelpLevel(
  classification: MemorizationClassification,
  currentLevel: HelpLevel
): HelpLevel {
  // If memorization detected, start help ladder low to force genuine work
  if (classification === 'likely_memorized') {
    return 1;
  }
  if (classification === 'partially_memorized') {
    return Math.min(currentLevel, 2) as HelpLevel;
  }
  return currentLevel;
}

/**
 * Generate human-readable explanation
 */
function generateExplanation(
  classification: MemorizationClassification,
  signals: readonly DetectionSignal[],
  confidence: number
): string {
  if (classification === 'authentic') {
    return 'Response appears to be genuine reasoning with personal thought process.';
  }

  const signalTypes = [...new Set(signals.map(s => s.type))];
  const signalSummary = signalTypes.slice(0, 3).join(', ');

  if (classification === 'likely_memorized') {
    return `High likelihood of memorized content (${(confidence * 100).toFixed(0)}% confidence). ` +
           `Detected signals: ${signalSummary}. Consider requiring deeper explanation.`;
  }

  return `Partial memorization signals detected (${(confidence * 100).toFixed(0)}% confidence). ` +
         `Signals: ${signalSummary}. Monitoring for further indicators.`;
}

// ============ Utility Exports ============

export {
  detectTemplateWording,
  detectEditorialCatchphrases,
  detectNoPersonalReasoning,
  detectInstantOptimal,
  detectMissingTradeoffs,
  detectPatternNameDrop,
  detectComplexityRecitation,
  detectVocabularyMismatch,
};
