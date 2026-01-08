/**
 * Micro-drill and Pattern Discovery types.
 * PURE TypeScript - no framework dependencies.
 */

import type { PatternId, MicroDrillId } from '../entities/types.js';
import type { ValidationErrorType } from '../validation/types.js';

// ============================================================================
// Drill Types
// ============================================================================

export const DrillFormat = {
  MCQ: 'MCQ',
  SHORT_TEXT: 'SHORT_TEXT',
  CODE_COMPLETION: 'CODE_COMPLETION',
  TRUE_FALSE: 'TRUE_FALSE',
} as const;
export type DrillFormat = typeof DrillFormat[keyof typeof DrillFormat];

// ============================================================================
// MCQ Drill
// ============================================================================

export interface MCQOption {
  readonly id: string;
  readonly text: string;
  readonly isCorrect: boolean;
  readonly explanation?: string;
}

export interface MCQDrill {
  readonly id: MicroDrillId;
  readonly format: 'MCQ';
  readonly question: string;
  readonly options: readonly MCQOption[];
  readonly patternId: PatternId;
  readonly targetErrorType: ValidationErrorType | null;
  readonly difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  readonly estimatedTimeSec: number;
  readonly hint?: string;
}

// ============================================================================
// Short Text Drill
// ============================================================================

export interface ShortTextDrill {
  readonly id: MicroDrillId;
  readonly format: 'SHORT_TEXT';
  readonly question: string;
  readonly acceptedAnswers: readonly string[];
  readonly caseSensitive: boolean;
  readonly patternId: PatternId;
  readonly targetErrorType: ValidationErrorType | null;
  readonly difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  readonly estimatedTimeSec: number;
  readonly hint?: string;
}

// ============================================================================
// Code Completion Drill
// ============================================================================

export interface CodeCompletionDrill {
  readonly id: MicroDrillId;
  readonly format: 'CODE_COMPLETION';
  readonly prompt: string;
  readonly codeTemplate: string;
  readonly expectedOutput: string;
  readonly patternId: PatternId;
  readonly targetErrorType: ValidationErrorType | null;
  readonly difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  readonly estimatedTimeSec: number;
  readonly hint?: string;
}

// ============================================================================
// True/False Drill
// ============================================================================

export interface TrueFalseDrill {
  readonly id: MicroDrillId;
  readonly format: 'TRUE_FALSE';
  readonly statement: string;
  readonly correctAnswer: boolean;
  readonly explanation: string;
  readonly patternId: PatternId;
  readonly targetErrorType: ValidationErrorType | null;
  readonly difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  readonly estimatedTimeSec: number;
}

// ============================================================================
// Union Type
// ============================================================================

export type Drill = MCQDrill | ShortTextDrill | CodeCompletionDrill | TrueFalseDrill;

// ============================================================================
// Drill Submission
// ============================================================================

export interface DrillSubmission {
  readonly drillId: MicroDrillId;
  readonly answer: string | boolean | readonly string[];
  readonly timeTakenSec: number;
}

// ============================================================================
// Drill Result
// ============================================================================

export interface DrillResult {
  readonly drillId: MicroDrillId;
  readonly isCorrect: boolean;
  readonly score: number; // 0-100
  readonly feedback: string;
  readonly correctAnswer: string | boolean | readonly string[];
  readonly explanation?: string;
  readonly timeTakenSec: number;
}

// ============================================================================
// Drill Constants
// ============================================================================

export const DRILL_CONSTANTS = {
  /** Target duration range in seconds */
  MIN_DURATION_SEC: 30,
  MAX_DURATION_SEC: 90,

  /** Score thresholds */
  PASS_SCORE: 100,
  PARTIAL_SCORE: 50,

  /** Time penalty (percentage per 10 seconds over) */
  TIME_PENALTY_PERCENT: 5,
} as const;

// ============================================================================
// Pattern Discovery Types
// ============================================================================

export const DiscoveryConstraint = {
  ADJACENCY: 'ADJACENCY',
  REUSE: 'REUSE',
  EXISTENCE: 'EXISTENCE',
  ORDER: 'ORDER',
  WINDOW: 'WINDOW',
} as const;
export type DiscoveryConstraint = typeof DiscoveryConstraint[keyof typeof DiscoveryConstraint];

export interface SocraticQuestion {
  readonly id: string;
  readonly questionText: string;
  readonly targetConstraint: DiscoveryConstraint;
  readonly expectedAnswer: 'yes' | 'no' | 'depends';
  readonly followUpOnYes?: string;
  readonly followUpOnNo?: string;
}

export interface PatternDiscoveryConfig {
  readonly patternId: PatternId;
  readonly patternName: string;
  readonly questions: readonly SocraticQuestion[];
  readonly revealThreshold: number; // Number of correct answers to reveal pattern
}

export interface DiscoveryAnswer {
  readonly questionId: string;
  readonly answer: 'yes' | 'no' | 'depends';
}

export interface DiscoveryResult {
  readonly patternId: PatternId;
  readonly patternName: string;
  readonly inferredCorrectly: boolean;
  readonly answersCorrect: number;
  readonly answersTotal: number;
  readonly constraintsIdentified: readonly DiscoveryConstraint[];
  readonly countsAsHint1: boolean;
}

// ============================================================================
// Pattern Discovery Configurations
// ============================================================================

export const DISCOVERY_CONFIGS: readonly PatternDiscoveryConfig[] = [
  {
    patternId: 'sliding-window' as PatternId,
    patternName: 'Sliding Window',
    revealThreshold: 3,
    questions: [
      {
        id: 'sw-1',
        questionText: 'Does the problem ask about a contiguous sequence or subarray?',
        targetConstraint: DiscoveryConstraint.ADJACENCY,
        expectedAnswer: 'yes',
        followUpOnYes: 'Contiguous sequences are a key indicator of sliding window.',
      },
      {
        id: 'sw-2',
        questionText: 'Can elements be reused or visited multiple times?',
        targetConstraint: DiscoveryConstraint.REUSE,
        expectedAnswer: 'no',
        followUpOnNo: 'Single-pass with no reuse suggests sliding window.',
      },
      {
        id: 'sw-3',
        questionText: 'Is there a fixed or variable window size mentioned?',
        targetConstraint: DiscoveryConstraint.WINDOW,
        expectedAnswer: 'yes',
        followUpOnYes: 'Window size is the defining characteristic.',
      },
      {
        id: 'sw-4',
        questionText: 'Does the problem involve finding a maximum/minimum of contiguous elements?',
        targetConstraint: DiscoveryConstraint.EXISTENCE,
        expectedAnswer: 'yes',
      },
      {
        id: 'sw-5',
        questionText: 'Can elements be processed from both ends?',
        targetConstraint: DiscoveryConstraint.ORDER,
        expectedAnswer: 'no',
        followUpOnNo: 'One-direction processing is typical for sliding window.',
      },
    ],
  },
  {
    patternId: 'two-pointers' as PatternId,
    patternName: 'Two Pointers',
    revealThreshold: 3,
    questions: [
      {
        id: 'tp-1',
        questionText: 'Is the input sorted or can it be sorted?',
        targetConstraint: DiscoveryConstraint.ORDER,
        expectedAnswer: 'yes',
        followUpOnYes: 'Sorted data enables two-pointer technique.',
      },
      {
        id: 'tp-2',
        questionText: 'Does the problem involve finding pairs that meet a condition?',
        targetConstraint: DiscoveryConstraint.EXISTENCE,
        expectedAnswer: 'yes',
      },
      {
        id: 'tp-3',
        questionText: 'Can we eliminate possibilities by comparing values from both ends?',
        targetConstraint: DiscoveryConstraint.ORDER,
        expectedAnswer: 'yes',
        followUpOnYes: 'This is the core two-pointer insight.',
      },
      {
        id: 'tp-4',
        questionText: 'Is O(n) time complexity achievable without nested loops?',
        targetConstraint: DiscoveryConstraint.REUSE,
        expectedAnswer: 'yes',
      },
    ],
  },
  {
    patternId: 'merge-intervals' as PatternId,
    patternName: 'Merge Intervals',
    revealThreshold: 3,
    questions: [
      {
        id: 'mi-1',
        questionText: 'Does the problem involve ranges or intervals?',
        targetConstraint: DiscoveryConstraint.ADJACENCY,
        expectedAnswer: 'yes',
        followUpOnYes: 'Intervals are the key data structure here.',
      },
      {
        id: 'mi-2',
        questionText: 'Do intervals need to be combined when they overlap?',
        targetConstraint: DiscoveryConstraint.ADJACENCY,
        expectedAnswer: 'yes',
        followUpOnYes: 'Overlapping detection is central to this pattern.',
      },
      {
        id: 'mi-3',
        questionText: 'Would sorting by start time help?',
        targetConstraint: DiscoveryConstraint.ORDER,
        expectedAnswer: 'yes',
      },
      {
        id: 'mi-4',
        questionText: 'Is there a concept of gaps or non-overlapping periods?',
        targetConstraint: DiscoveryConstraint.EXISTENCE,
        expectedAnswer: 'depends',
      },
    ],
  },
  {
    patternId: 'dfs-grid' as PatternId,
    patternName: 'DFS on Grid',
    revealThreshold: 3,
    questions: [
      {
        id: 'dfs-1',
        questionText: 'Is the input a 2D grid or matrix?',
        targetConstraint: DiscoveryConstraint.ADJACENCY,
        expectedAnswer: 'yes',
      },
      {
        id: 'dfs-2',
        questionText: 'Do we need to explore connected components?',
        targetConstraint: DiscoveryConstraint.ADJACENCY,
        expectedAnswer: 'yes',
        followUpOnYes: 'Connected component search is classic DFS.',
      },
      {
        id: 'dfs-3',
        questionText: 'Should cells be visited only once?',
        targetConstraint: DiscoveryConstraint.REUSE,
        expectedAnswer: 'yes',
        followUpOnYes: 'Visited tracking prevents infinite loops.',
      },
      {
        id: 'dfs-4',
        questionText: 'Is there a concept of islands, regions, or paths?',
        targetConstraint: DiscoveryConstraint.EXISTENCE,
        expectedAnswer: 'yes',
      },
    ],
  },
];
