/**
 * Trace Executor - Run code with trace capture
 *
 * Executes instrumented code and parses the trace output.
 */

import type { PistonClient } from '../piston-client.js';
import { LANGUAGE_CONFIGS, normalizeLanguage } from '../language-configs.js';
import { instrumentCode, type InstrumentationResult } from './trace-instrumenter.js';
import type { TraceOutput, TraceFrame } from '@scaffold/core/entities';
import type { SupportedLanguage } from '../types.js';

export interface TraceExecutorConfig {
  /** Piston client for code execution */
  client: PistonClient;
  /** Run timeout in ms */
  runTimeout?: number;
  /** Compile timeout in ms */
  compileTimeout?: number;
}

export interface TraceExecutionResult {
  /** Parsed trace output */
  trace: TraceOutput;
  /** Hint for manual trace insertion (if auto-insert failed) */
  insertionHint?: string;
  /** The instrumented code that was executed */
  instrumentedCode?: string;
  /** Raw stdout from execution */
  rawOutput?: string;
}

/**
 * Parse trace output from execution stdout
 */
export function parseTraceOutput(stdout: string): TraceOutput {
  // Look for trace markers
  const traceMatch = stdout.match(/__TRACE_START__\s*([\s\S]*?)\s*__TRACE_END__/);

  if (!traceMatch || !traceMatch[1]) {
    return {
      success: false,
      frames: [],
      error: 'No trace output found. Make sure trace() calls are in your code.',
    };
  }

  try {
    const traceData = JSON.parse(traceMatch[1].trim());

    // Validate structure
    if (typeof traceData !== 'object' || !Array.isArray(traceData.frames)) {
      return {
        success: false,
        frames: [],
        error: 'Invalid trace data format',
      };
    }

    // If the trace data indicates failure, return the error
    if (traceData.success === false && traceData.error) {
      return {
        success: false,
        frames: [],
        error: traceData.error,
        array: traceData.array ?? undefined,
        arrayName: traceData.arrayName ?? undefined,
        pointerVars: traceData.pointerVars ?? [],
      };
    }

    // Validate and clean frames
    const frames: TraceFrame[] = traceData.frames
      .filter((f: unknown): f is TraceFrame =>
        typeof f === 'object' &&
        f !== null &&
        typeof (f as TraceFrame).iter === 'number' &&
        typeof (f as TraceFrame).vars === 'object'
      )
      .map((f: TraceFrame) => ({
        iter: f.iter,
        vars: f.vars,
        label: f.label,
        line: f.line,
      }));

    // For empty frames with no explicit error, it's still considered success
    // (the trace worked, just no iterations happened)
    return {
      success: traceData.success !== false,
      frames,
      array: traceData.array ?? undefined,
      arrayName: traceData.arrayName ?? undefined,
      pointerVars: traceData.pointerVars ?? [],
      error: frames.length === 0 && !traceData.success ? 'No trace frames captured' : undefined,
    };
  } catch (e) {
    return {
      success: false,
      frames: [],
      error: `Failed to parse trace: ${e instanceof Error ? e.message : 'unknown error'}`,
    };
  }
}

/**
 * Create a trace executor
 */
export function createTraceExecutor(config: TraceExecutorConfig) {
  const { client, runTimeout = 10000, compileTimeout = 15000 } = config;

  return {
    /**
     * Execute code with trace capture
     */
    async executeWithTrace(
      code: string,
      language: string,
      testInput: string,
      autoInsert: boolean = true
    ): Promise<TraceExecutionResult> {
      // Normalize language
      const normalizedLang = normalizeLanguage(language);
      if (!normalizedLang) {
        return {
          trace: {
            success: false,
            frames: [],
            error: `Unsupported language: ${language}`,
          },
        };
      }

      // Check if trace is supported for this language
      if (normalizedLang !== 'javascript' && normalizedLang !== 'python') {
        return {
          trace: {
            success: false,
            frames: [],
            error: `Trace visualization is not yet supported for ${language}. Currently supported: JavaScript, Python.`,
          },
          insertionHint: `Trace is only available for JavaScript and Python.`,
        };
      }

      // Instrument the code
      let instrumentation: InstrumentationResult;
      if (autoInsert) {
        instrumentation = instrumentCode(code, normalizedLang);
      } else {
        // Just add the trace helper without auto-inserting calls
        instrumentation = instrumentCode(code, normalizedLang);
      }

      if (!instrumentation.success || !instrumentation.code) {
        return {
          trace: {
            success: false,
            frames: [],
            error: 'Could not instrument code for tracing',
          },
          insertionHint: instrumentation.hint,
        };
      }

      // Get language config
      const langConfig = LANGUAGE_CONFIGS[normalizedLang as SupportedLanguage];

      // Build the wrapped code for execution
      const wrappedCode = buildTraceWrapper(
        instrumentation.code,
        normalizedLang,
        testInput
      );

      // Execute via Piston
      try {
        const response = await client.execute({
          language: langConfig.pistonLanguage,
          version: langConfig.pistonVersion,
          files: [{ name: langConfig.fileName, content: wrappedCode }],
          compile_timeout: compileTimeout,
          run_timeout: runTimeout,
        });

        // Check for execution errors
        if (response.run.stderr && response.run.stderr.trim()) {
          return {
            trace: {
              success: false,
              frames: [],
              error: `Execution error: ${response.run.stderr.slice(0, 500)}`,
            },
            instrumentedCode: instrumentation.code,
            rawOutput: response.run.stdout,
          };
        }

        // Parse trace output
        const trace = parseTraceOutput(response.run.stdout);

        return {
          trace,
          instrumentedCode: instrumentation.code,
          rawOutput: response.run.stdout,
        };
      } catch (e) {
        return {
          trace: {
            success: false,
            frames: [],
            error: `Execution failed: ${e instanceof Error ? e.message : 'unknown error'}`,
          },
          instrumentedCode: instrumentation.code,
        };
      }
    },
  };
}

/**
 * Build wrapper code that includes test input and executes the traced code
 */
function buildTraceWrapper(
  instrumentedCode: string,
  language: 'javascript' | 'python',
  testInput: string
): string {
  if (language === 'javascript') {
    return `
${instrumentedCode}

// Execute with test input
try {
  const input = ${testInput};
  // Find and call the main function
  if (typeof solution === 'function') {
    solution(...(Array.isArray(input) ? input : [input]));
  } else if (typeof maxSubArray === 'function') {
    maxSubArray(...(Array.isArray(input) ? input : [input]));
  } else if (typeof twoSum === 'function') {
    twoSum(...(Array.isArray(input) ? input : [input]));
  } else if (typeof lengthOfLongestSubstring === 'function') {
    lengthOfLongestSubstring(...(Array.isArray(input) ? input : [input]));
  }
  // Generic fallback: look for any function with common names
  const funcNames = Object.keys(this).filter(k => typeof this[k] === 'function' && !k.startsWith('__'));
  if (funcNames.length > 0) {
    const fn = this[funcNames[0]];
    if (fn && fn !== trace && fn !== __outputTrace) {
      fn(...(Array.isArray(input) ? input : [input]));
    }
  }
} catch (e) {
  console.error('Execution error:', e.message);
}
`;
  } else {
    // Python
    return `
${instrumentedCode}

# Execute with test input
try:
    input_data = ${testInput}
    # Find and call the main function
    import inspect
    for name, obj in list(globals().items()):
        if callable(obj) and not name.startswith('_') and name != 'trace':
            sig = inspect.signature(obj)
            if len(sig.parameters) > 0:
                if isinstance(input_data, (list, tuple)) and len(input_data) == len(sig.parameters):
                    obj(*input_data)
                else:
                    obj(input_data)
                break
except Exception as e:
    print(f'Execution error: {e}')
`;
  }
}

export type TraceExecutor = ReturnType<typeof createTraceExecutor>;
