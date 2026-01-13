/**
 * Trace Visualization - Whiteboard Trace Types
 *
 * Types for capturing and visualizing algorithm execution state.
 * Used to show pointer movements, variable changes, and iteration steps.
 */

/**
 * A single trace frame capturing state at one point in execution
 */
export interface TraceFrame {
  /** Iteration number (0-indexed) */
  readonly iter: number;
  /** Variable values at this point */
  readonly vars: TraceVars;
  /** Optional label for this frame (e.g., "shrink window", "found match") */
  readonly label?: string;
  /** Line number in source code (if available) */
  readonly line?: number;
}

/**
 * Variable values captured in a trace frame
 * Supports common algorithm patterns: pointers, arrays, counters, etc.
 */
export interface TraceVars {
  /** Array index pointers (e.g., left, right, i, j, start, end) */
  readonly [key: string]: TraceValue;
}

/**
 * Supported trace value types
 */
export type TraceValue =
  | number
  | string
  | boolean
  | null
  | readonly TraceValue[]
  | { readonly [key: string]: TraceValue };

/**
 * Complete trace output from execution
 */
export interface TraceOutput {
  /** Whether trace was successfully captured */
  readonly success: boolean;
  /** Trace frames (empty if not captured) */
  readonly frames: readonly TraceFrame[];
  /** Error message if trace failed */
  readonly error?: string;
  /** The array being operated on (for visualization) */
  readonly array?: readonly TraceValue[];
  /** Array variable name (e.g., "nums", "arr") */
  readonly arrayName?: string;
  /** Detected pointer variable names for highlighting */
  readonly pointerVars?: readonly string[];
}

/**
 * Trace execution request
 */
export interface TraceExecutionInput {
  /** User's code */
  readonly code: string;
  /** Programming language */
  readonly language: string;
  /** Test case input to trace */
  readonly testInput: string;
  /** Whether to attempt auto-insertion of trace calls */
  readonly autoInsert?: boolean;
}

/**
 * Common pointer variable names to detect and highlight
 */
export const POINTER_VAR_NAMES = [
  'left', 'right', 'l', 'r',
  'start', 'end',
  'i', 'j', 'k',
  'low', 'high', 'mid',
  'slow', 'fast',
  'head', 'tail',
  'begin', 'end',
  'front', 'back',
  'windowStart', 'windowEnd',
] as const;

/**
 * Common array variable names to detect
 */
export const ARRAY_VAR_NAMES = [
  'nums', 'arr', 'array', 'numbers',
  'data', 'list', 'items', 'elements',
  'input', 'values', 'seq', 'sequence',
  'chars', 's', 'str', 'string',
] as const;

/**
 * Languages that support trace execution
 */
export const TRACE_SUPPORTED_LANGUAGES = ['javascript', 'python'] as const;
export type TraceSupportedLanguage = (typeof TRACE_SUPPORTED_LANGUAGES)[number];

/**
 * Check if a language supports trace execution
 */
export function isTraceSupportedLanguage(lang: string): lang is TraceSupportedLanguage {
  return TRACE_SUPPORTED_LANGUAGES.includes(lang as TraceSupportedLanguage);
}
