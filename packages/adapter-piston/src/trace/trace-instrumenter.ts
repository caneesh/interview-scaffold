/**
 * Trace Instrumenter - Auto-insert trace calls into user code
 *
 * This module analyzes user code and attempts to insert trace() calls
 * in safe locations (inside loops) to capture algorithm state.
 *
 * MVP Approach:
 * - Detect common loop patterns (for, while)
 * - Find variable names that look like pointers/indices
 * - Insert trace() call at the start of each loop body
 * - If detection fails, return a hint for manual insertion
 */

import {
  JAVASCRIPT_TRACE_HELPER,
  PYTHON_TRACE_HELPER,
  JAVASCRIPT_TRACE_OUTPUT,
  PYTHON_TRACE_OUTPUT,
} from './trace-helpers.js';

export interface InstrumentationResult {
  /** Whether instrumentation was successful */
  success: boolean;
  /** Instrumented code (if successful) */
  code?: string;
  /** Hint for manual insertion (if failed) */
  hint?: string;
  /** Detected variables to trace */
  detectedVars?: string[];
}

/**
 * Common pointer/index variable names
 */
const POINTER_VARS = new Set([
  'left', 'right', 'l', 'r', 'i', 'j', 'k',
  'start', 'end', 'low', 'high', 'mid',
  'slow', 'fast', 'head', 'tail',
  'windowStart', 'windowEnd', 'window_start', 'window_end',
]);

/**
 * Common array variable names
 */
const ARRAY_VARS = new Set([
  'nums', 'arr', 'array', 'numbers', 'data', 'list', 'items',
  'input', 'values', 'seq', 'sequence', 'chars', 's', 'str',
]);

/**
 * Instrument JavaScript code with trace calls
 */
export function instrumentJavaScript(code: string): InstrumentationResult {
  // Detect variables in the code
  const vars = detectVariables(code, 'javascript');

  if (vars.pointers.length === 0) {
    return {
      success: false,
      hint: generateHint('javascript', vars),
    };
  }

  // Try to find while or for loops and insert trace
  const loopPatterns = [
    // while loop: while (condition) {
    /(\bwhile\s*\([^)]+\)\s*\{)/g,
    // for loop: for (...) {
    /(\bfor\s*\([^)]*\)\s*\{)/g,
  ];

  let instrumentedCode = code;
  let insertCount = 0;

  for (const pattern of loopPatterns) {
    instrumentedCode = instrumentedCode.replace(pattern, (match) => {
      insertCount++;
      const traceVars = buildTraceObject(vars, 'javascript');
      return `${match}\n    trace(${traceVars}); // Auto-inserted trace`;
    });
  }

  if (insertCount === 0) {
    return {
      success: false,
      hint: generateHint('javascript', vars),
      detectedVars: [...vars.pointers, ...vars.arrays],
    };
  }

  // Wrap with trace helper
  const finalCode = `${JAVASCRIPT_TRACE_HELPER}\n${instrumentedCode}\n${JAVASCRIPT_TRACE_OUTPUT}`;

  return {
    success: true,
    code: finalCode,
    detectedVars: [...vars.pointers, ...vars.arrays],
  };
}

/**
 * Instrument Python code with trace calls
 */
export function instrumentPython(code: string): InstrumentationResult {
  // Detect variables in the code
  const vars = detectVariables(code, 'python');

  if (vars.pointers.length === 0) {
    return {
      success: false,
      hint: generateHint('python', vars),
    };
  }

  // Find while or for loops and insert trace
  // Python is indentation-sensitive, so we need to be careful
  const lines = code.split('\n');
  const instrumentedLines: string[] = [];
  let insertCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    instrumentedLines.push(line);

    // Check if this line starts a loop
    const isWhileLoop = /^\s*while\s+.+:/.test(line);
    const isForLoop = /^\s*for\s+.+:/.test(line);

    if (isWhileLoop || isForLoop) {
      // Get indentation of the loop line
      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch?.[1] ?? '';
      const bodyIndent = indent + '    '; // Python standard indent

      // Build trace call
      const traceVars = buildTraceObject(vars, 'python');
      instrumentedLines.push(`${bodyIndent}trace(${traceVars})  # Auto-inserted trace`);
      insertCount++;
    }
  }

  if (insertCount === 0) {
    return {
      success: false,
      hint: generateHint('python', vars),
      detectedVars: [...vars.pointers, ...vars.arrays],
    };
  }

  // Wrap with trace helper
  const finalCode = `${PYTHON_TRACE_HELPER}\n${instrumentedLines.join('\n')}\n${PYTHON_TRACE_OUTPUT}`;

  return {
    success: true,
    code: finalCode,
    detectedVars: [...vars.pointers, ...vars.arrays],
  };
}

/**
 * Detect pointer and array variables in code
 */
function detectVariables(code: string, language: string): { pointers: string[]; arrays: string[] } {
  const pointers: string[] = [];
  const arrays: string[] = [];

  // Pattern for variable assignments
  const varPatterns = language === 'javascript'
    ? [
        /\b(?:let|const|var)\s+(\w+)\s*=/g,
        /\b(\w+)\s*=/g,
      ]
    : [
        /\b(\w+)\s*=/g,
      ];

  const seenVars = new Set<string>();

  for (const pattern of varPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const varName = match[1];
      if (!varName || seenVars.has(varName)) continue;
      seenVars.add(varName);

      if (POINTER_VARS.has(varName) || POINTER_VARS.has(varName.toLowerCase())) {
        pointers.push(varName);
      }
      if (ARRAY_VARS.has(varName) || ARRAY_VARS.has(varName.toLowerCase())) {
        arrays.push(varName);
      }
    }
  }

  // Also check for function parameters that might be arrays
  const paramPattern = language === 'javascript'
    ? /function\s+\w+\s*\(([^)]*)\)/g
    : /def\s+\w+\s*\(([^)]*)\)/g;

  let paramMatch;
  while ((paramMatch = paramPattern.exec(code)) !== null) {
    const paramsStr = paramMatch[1];
    if (!paramsStr) continue;
    const params = paramsStr.split(',').map(p => {
      const trimmed = p.trim();
      const parts = trimmed.split(/[:\s=]/);
      return parts[0] ?? '';
    });
    for (const param of params) {
      if (!param) continue;
      if (ARRAY_VARS.has(param) || ARRAY_VARS.has(param.toLowerCase())) {
        if (!arrays.includes(param)) arrays.push(param);
      }
    }
  }

  return { pointers, arrays };
}

/**
 * Build trace object string from detected variables
 */
function buildTraceObject(vars: { pointers: string[]; arrays: string[] }, language: string): string {
  const allVars = [...vars.pointers, ...vars.arrays];
  if (allVars.length === 0) return '{}';

  if (language === 'python') {
    // Python dict syntax
    const pairs = allVars.map(v => `'${v}': ${v}`).join(', ');
    return `{${pairs}}`;
  } else {
    // JavaScript object shorthand
    return `{ ${allVars.join(', ')} }`;
  }
}

/**
 * Generate hint for manual trace insertion
 */
function generateHint(language: string, vars: { pointers: string[]; arrays: string[] }): string {
  const example = language === 'python'
    ? `trace({'left': left, 'right': right, 'nums': nums})`
    : `trace({ left, right, nums })`;

  if (vars.pointers.length === 0 && vars.arrays.length === 0) {
    return `Add trace() calls inside your loop to visualize algorithm state.

Example:
  ${example}

Common variables to trace: left, right, i, j, nums, arr`;
  }

  const detectedStr = [...vars.pointers, ...vars.arrays].join(', ');
  return `Could not auto-insert trace calls. Add trace() inside your loop:

Detected variables: ${detectedStr}

Example:
  ${example}`;
}

/**
 * Check if code already contains trace calls
 */
export function hasTraceCall(code: string): boolean {
  return /\btrace\s*\(/.test(code);
}

/**
 * Main instrumentation function
 */
export function instrumentCode(code: string, language: string): InstrumentationResult {
  // If code already has trace calls, just add the helper
  if (hasTraceCall(code)) {
    if (language === 'javascript') {
      return {
        success: true,
        code: `${JAVASCRIPT_TRACE_HELPER}\n${code}\n${JAVASCRIPT_TRACE_OUTPUT}`,
      };
    } else if (language === 'python') {
      return {
        success: true,
        code: `${PYTHON_TRACE_HELPER}\n${code}\n${PYTHON_TRACE_OUTPUT}`,
      };
    }
  }

  // Try auto-instrumentation
  if (language === 'javascript') {
    return instrumentJavaScript(code);
  } else if (language === 'python') {
    return instrumentPython(code);
  }

  return {
    success: false,
    hint: `Trace visualization is not yet supported for ${language}. Currently supported: JavaScript, Python.`,
  };
}
