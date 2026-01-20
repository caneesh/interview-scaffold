/**
 * Anti-Memorization Detection Types
 *
 * Types for detecting when users provide memorized/editorial content
 * instead of genuine first-principles reasoning.
 */

import type { HelpLevel } from '../learner-centric/types.js';

// ============ Classification ============

/**
 * Classification of content authenticity
 */
export const MEMORIZATION_CLASSIFICATIONS = [
  'authentic',           // Genuine reasoning, personal language
  'partially_memorized', // Some memorized elements mixed with genuine thought
  'likely_memorized',    // High confidence of memorized/editorial content
] as const;

export type MemorizationClassification = (typeof MEMORIZATION_CLASSIFICATIONS)[number];

// ============ Detection Signals ============

/**
 * Types of signals that indicate memorization
 */
export const DETECTION_SIGNAL_TYPES = [
  'template_wording',        // Highly polished, template-like language
  'editorial_catchphrase',   // Common phrases from online editorials
  'no_personal_reasoning',   // Lacks "I think", "my approach", etc.
  'instant_optimal',         // Jumps to optimal solution with no exploration
  'missing_tradeoffs',       // Doesn't discuss alternatives or tradeoffs
  'pattern_name_drop',       // Names pattern without explaining why it fits
  'complexity_recitation',   // States complexity without derivation
  'step_list_format',        // Numbered steps like from a tutorial
  'solution_structure',      // Code structure matches known solutions
  'vocabulary_mismatch',     // Uses terminology inconsistent with prior responses
] as const;

export type DetectionSignalType = (typeof DETECTION_SIGNAL_TYPES)[number];

/**
 * Individual detection signal
 */
export interface DetectionSignal {
  /** Type of signal detected */
  readonly type: DetectionSignalType;
  /** Confidence that this signal indicates memorization (0-1) */
  readonly confidence: number;
  /** Evidence for this signal */
  readonly evidence: string;
  /** Specific text excerpt that triggered the signal */
  readonly excerpt?: string;
}

// ============ Actions ============

/**
 * Actions to take when memorization is detected
 */
export const MEMORIZATION_ACTIONS = [
  'continue',              // Allow to proceed (low confidence or authentic)
  'reset_to_feynman',      // Reset to Feynman check for deeper understanding
  'reset_to_strategy',     // Reset to strategy design
  'block_and_reprompt',    // Block progression, ask Socratic questions
] as const;

export type MemorizationAction = (typeof MEMORIZATION_ACTIONS)[number];

// ============ Reprompt Generation ============

/**
 * Socratic question to force first-principles reasoning
 */
export interface SocraticReprompt {
  /** Unique ID for tracking */
  readonly id: string;
  /** The question to ask */
  readonly question: string;
  /** Why this question is being asked */
  readonly purpose: string;
  /** What concept this probes */
  readonly targetConcept: string;
}

// ============ Detection Result ============

/**
 * Full result from memorization detection
 */
export interface MemorizationDetectionResult {
  /** Overall classification */
  readonly classification: MemorizationClassification;
  /** Confidence in the classification (0-1) */
  readonly confidence: number;
  /** All signals detected */
  readonly signals: readonly DetectionSignal[];
  /** Recommended action */
  readonly action: MemorizationAction;
  /** Socratic questions to ask (max 3) */
  readonly reprompts: readonly SocraticReprompt[];
  /** Recommended help level adjustment */
  readonly recommendedHelpLevel: HelpLevel;
  /** Explanation of the detection result */
  readonly explanation: string;
}

// ============ Detection Context ============

/**
 * Context provided to the detection system
 */
export interface MemorizationDetectionContext {
  /** The user's current response text */
  readonly responseText: string;
  /** Current coaching stage */
  readonly stage: string;
  /** Problem being solved */
  readonly problemId: string;
  /** Pattern for this problem */
  readonly pattern: string;
  /** Previous responses in this session */
  readonly previousResponses: readonly string[];
  /** Current help level */
  readonly currentHelpLevel: HelpLevel;
  /** Time spent on this response (ms) */
  readonly responseTimeMs: number;
  /** Number of attempts at current stage */
  readonly attemptCount: number;
  /** Anti-cheat markers from problem metadata (if available) */
  readonly antiCheatMarkers?: readonly string[];
}

// ============ Editorial Phrase Database ============

/**
 * Known editorial phrases that may indicate memorization
 */
export interface EditorialPhrase {
  /** The phrase or regex pattern */
  readonly pattern: string;
  /** Whether this is a regex */
  readonly isRegex: boolean;
  /** Weight for detection (0-1) */
  readonly weight: number;
  /** Category of the phrase */
  readonly category: 'solution' | 'pattern' | 'complexity' | 'approach';
}

// ============ Detection Configuration ============

/**
 * Configuration for memorization detection
 */
export interface MemorizationDetectionConfig {
  /** Threshold for classification as partially_memorized */
  readonly partialThreshold: number;
  /** Threshold for classification as likely_memorized */
  readonly likelyThreshold: number;
  /** Maximum number of reprompts to generate */
  readonly maxReprompts: number;
  /** Whether to include LLM-based detection */
  readonly useLLMDetection: boolean;
  /** Custom editorial phrases to detect */
  readonly customPhrases: readonly EditorialPhrase[];
}

/**
 * Default configuration
 */
export const DEFAULT_DETECTION_CONFIG: MemorizationDetectionConfig = {
  partialThreshold: 0.4,
  likelyThreshold: 0.7,
  maxReprompts: 3,
  useLLMDetection: false,
  customPhrases: [],
};
