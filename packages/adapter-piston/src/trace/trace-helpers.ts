/**
 * Trace Helpers - Code to inject for trace capture
 *
 * These helpers are prepended to user code to capture variable state
 * at each trace() call. The trace data is serialized and output
 * in a parseable format.
 */

/**
 * JavaScript trace helper code
 * Provides a global trace() function that captures variable state
 */
export const JAVASCRIPT_TRACE_HELPER = `
// ==== TRACE HELPER START ====
const __traceFrames = [];
let __traceIter = 0;
let __traceArray = null;
let __traceArrayName = null;

function trace(vars, label) {
  // Deep clone to capture current state
  const clonedVars = JSON.parse(JSON.stringify(vars));
  __traceFrames.push({
    iter: __traceIter++,
    vars: clonedVars,
    label: label || undefined
  });

  // Detect array variable for visualization
  if (!__traceArray) {
    for (const [key, val] of Object.entries(vars)) {
      if (Array.isArray(val) && val.length > 0) {
        __traceArray = val;
        __traceArrayName = key;
        break;
      }
    }
  }
}

function __outputTrace() {
  const pointerVars = [];
  const pointerNames = ['left', 'right', 'l', 'r', 'i', 'j', 'k', 'start', 'end',
                        'low', 'high', 'mid', 'slow', 'fast', 'windowStart', 'windowEnd'];

  if (__traceFrames.length > 0) {
    const firstVars = __traceFrames[0].vars;
    for (const key of Object.keys(firstVars)) {
      if (pointerNames.includes(key) && typeof firstVars[key] === 'number') {
        pointerVars.push(key);
      }
    }
  }

  const output = {
    success: __traceFrames.length > 0,
    frames: __traceFrames,
    array: __traceArray,
    arrayName: __traceArrayName,
    pointerVars: pointerVars
  };

  console.log('__TRACE_START__');
  console.log(JSON.stringify(output));
  console.log('__TRACE_END__');
}
// ==== TRACE HELPER END ====
`;

/**
 * Python trace helper code
 */
export const PYTHON_TRACE_HELPER = `
# ==== TRACE HELPER START ====
import json
import copy

__trace_frames = []
__trace_iter = 0
__trace_array = None
__trace_array_name = None

def trace(vars_dict, label=None):
    global __trace_frames, __trace_iter, __trace_array, __trace_array_name

    # Deep copy to capture current state
    cloned_vars = copy.deepcopy(vars_dict)

    frame = {
        'iter': __trace_iter,
        'vars': cloned_vars
    }
    if label:
        frame['label'] = label

    __trace_frames.append(frame)
    __trace_iter += 1

    # Detect array variable for visualization
    if __trace_array is None:
        for key, val in vars_dict.items():
            if isinstance(val, (list, tuple)) and len(val) > 0:
                __trace_array = list(val)
                __trace_array_name = key
                break

def __output_trace():
    pointer_vars = []
    pointer_names = ['left', 'right', 'l', 'r', 'i', 'j', 'k', 'start', 'end',
                     'low', 'high', 'mid', 'slow', 'fast', 'window_start', 'window_end']

    if __trace_frames:
        first_vars = __trace_frames[0]['vars']
        for key in first_vars:
            if key in pointer_names and isinstance(first_vars[key], (int, float)):
                pointer_vars.append(key)

    output = {
        'success': len(__trace_frames) > 0,
        'frames': __trace_frames,
        'array': __trace_array,
        'arrayName': __trace_array_name,
        'pointerVars': pointer_vars
    }

    print('__TRACE_START__')
    print(json.dumps(output))
    print('__TRACE_END__')
# ==== TRACE HELPER END ====
`;

/**
 * JavaScript code to call at end of execution to output trace
 */
export const JAVASCRIPT_TRACE_OUTPUT = `
__outputTrace();
`;

/**
 * Python code to call at end of execution to output trace
 */
export const PYTHON_TRACE_OUTPUT = `
__output_trace()
`;

/**
 * Common pointer variable patterns for auto-detection
 */
export const POINTER_PATTERNS = {
  javascript: [
    /\blet\s+(left|right|l|r|i|j|k|start|end|low|high|mid|slow|fast)\s*=/gi,
    /\b(left|right|l|r|i|j|k|start|end|low|high|mid|slow|fast)\s*=/gi,
  ],
  python: [
    /\b(left|right|l|r|i|j|k|start|end|low|high|mid|slow|fast)\s*=/gi,
  ],
};

/**
 * Array variable patterns for auto-detection
 */
export const ARRAY_PATTERNS = {
  javascript: [
    /\b(nums|arr|array|numbers|data|list|items)\s*(?:=|\[)/gi,
  ],
  python: [
    /\b(nums|arr|array|numbers|data|list|items)\s*(?:=|\[)/gi,
  ],
};
