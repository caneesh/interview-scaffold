import { describe, it, expect } from 'vitest';
import {
  instrumentCode,
  instrumentJavaScript,
  instrumentPython,
  hasTraceCall,
} from './trace-instrumenter.js';
import { parseTraceOutput } from './trace-executor.js';

describe('Trace Instrumentation', () => {
  describe('hasTraceCall', () => {
    it('should detect trace() call in code', () => {
      expect(hasTraceCall('trace({ left, right })')).toBe(true);
      expect(hasTraceCall('trace(vars)')).toBe(true);
      expect(hasTraceCall('  trace({i, j})  ')).toBe(true);
    });

    it('should not match other function names', () => {
      expect(hasTraceCall('backtrace()')).toBe(false);
      expect(hasTraceCall('stacktrace()')).toBe(false);
      expect(hasTraceCall('tracing()')).toBe(false);
    });

    it('should return false for code without trace', () => {
      expect(hasTraceCall('console.log(left)')).toBe(false);
      expect(hasTraceCall('function solve() {}')).toBe(false);
    });
  });

  describe('instrumentJavaScript', () => {
    it('should insert trace in while loop when pointer vars detected', () => {
      const code = `
function twoSum(nums, target) {
  let left = 0;
  let right = nums.length - 1;
  while (left < right) {
    const sum = nums[left] + nums[right];
    if (sum === target) return [left, right];
    if (sum < target) left++;
    else right--;
  }
  return [];
}`;

      const result = instrumentJavaScript(code);
      expect(result.success).toBe(true);
      expect(result.code).toContain('trace({ left, right, nums })');
      expect(result.code).toContain('// Auto-inserted trace');
      expect(result.detectedVars).toContain('left');
      expect(result.detectedVars).toContain('right');
    });

    it('should insert trace in for loop when pointer vars detected', () => {
      const code = `
function maxSum(nums, k) {
  let sum = 0;
  for (let i = 0; i < nums.length; i++) {
    sum += nums[i];
  }
  return sum;
}`;

      const result = instrumentJavaScript(code);
      expect(result.success).toBe(true);
      expect(result.code).toContain('trace({ i, nums })');
    });

    it('should return hint when no pointer vars detected', () => {
      const code = `
function add(a, b) {
  return a + b;
}`;

      const result = instrumentJavaScript(code);
      expect(result.success).toBe(false);
      expect(result.hint).toBeDefined();
      expect(result.hint).toContain('trace()');
    });

    it('should detect array parameters from function signature', () => {
      const code = `
function solution(arr) {
  let i = 0;
  while (i < arr.length) {
    i++;
  }
}`;

      const result = instrumentJavaScript(code);
      expect(result.success).toBe(true);
      expect(result.detectedVars).toContain('arr');
      expect(result.detectedVars).toContain('i');
    });
  });

  describe('instrumentPython', () => {
    it('should insert trace in while loop when pointer vars detected', () => {
      const code = `
def two_sum(nums, target):
    left = 0
    right = len(nums) - 1
    while left < right:
        total = nums[left] + nums[right]
        if total == target:
            return [left, right]
        elif total < target:
            left += 1
        else:
            right -= 1
    return []`;

      const result = instrumentPython(code);
      expect(result.success).toBe(true);
      expect(result.code).toContain("trace({'left': left, 'right': right, 'nums': nums})");
      expect(result.code).toContain('# Auto-inserted trace');
    });

    it('should insert trace in for loop when pointer vars detected via assignment', () => {
      // Python for loops need pointer variables to be detected via assignments
      // since `for i in range()` doesn't create a detectable assignment
      const code = `
def max_sum(nums, k):
    total = 0
    i = 0
    for i in range(len(nums)):
        total += nums[i]
    return total`;

      const result = instrumentPython(code);
      expect(result.success).toBe(true);
      expect(result.code).toContain("trace({'i': i, 'nums': nums})");
    });

    it('should return hint when no pointer vars detected', () => {
      const code = `
def add(a, b):
    return a + b`;

      const result = instrumentPython(code);
      expect(result.success).toBe(false);
      expect(result.hint).toBeDefined();
    });

    it('should maintain correct Python indentation', () => {
      const code = `
def solution(nums):
    i = 0
    while i < len(nums):
        print(nums[i])
        i += 1`;

      const result = instrumentPython(code);
      expect(result.success).toBe(true);
      // The trace should be indented with 4 spaces relative to while
      expect(result.code).toContain("    trace({'i': i, 'nums': nums})");
    });
  });

  describe('instrumentCode', () => {
    it('should use JavaScript instrumenter for javascript language', () => {
      const code = `
let i = 0;
while (i < 10) {
  i++;
}`;

      const result = instrumentCode(code, 'javascript');
      expect(result.success).toBe(true);
      expect(result.code).toContain('const __traceFrames');
    });

    it('should use Python instrumenter for python language', () => {
      const code = `
i = 0
while i < 10:
    i += 1`;

      const result = instrumentCode(code, 'python');
      expect(result.success).toBe(true);
      expect(result.code).toContain('__trace_frames = []');
    });

    it('should return unsupported message for other languages', () => {
      const code = 'int main() {}';
      const result = instrumentCode(code, 'cpp');
      expect(result.success).toBe(false);
      expect(result.hint).toContain('not yet supported');
    });

    it('should preserve existing trace calls without adding new ones', () => {
      const code = `
let i = 0;
while (i < 10) {
  trace({ i });
  i++;
}`;

      const result = instrumentCode(code, 'javascript');
      expect(result.success).toBe(true);
      // Should wrap with helper but not add auto-inserted trace calls
      // The helper defines a trace function, so we check for the auto-inserted comment
      expect(result.code).not.toContain('// Auto-inserted trace');
    });
  });
});

describe('Trace Output Parsing', () => {
  describe('parseTraceOutput', () => {
    it('should parse valid trace JSON from stdout', () => {
      const stdout = `Some output
__TRACE_START__
{"success":true,"frames":[{"iter":0,"vars":{"left":0,"right":4}},{"iter":1,"vars":{"left":1,"right":4}}],"array":[1,2,3,4,5],"arrayName":"nums","pointerVars":["left","right"]}
__TRACE_END__
More output`;

      const result = parseTraceOutput(stdout);
      expect(result.success).toBe(true);
      expect(result.frames).toHaveLength(2);
      expect(result.frames[0]?.iter).toBe(0);
      expect(result.frames[0]?.vars.left).toBe(0);
      expect(result.frames[1]?.vars.right).toBe(4);
      expect(result.array).toEqual([1, 2, 3, 4, 5]);
      expect(result.arrayName).toBe('nums');
      expect(result.pointerVars).toEqual(['left', 'right']);
    });

    it('should return error for missing trace markers', () => {
      const stdout = 'No trace output here';
      const result = parseTraceOutput(stdout);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No trace output');
    });

    it('should return error for invalid JSON', () => {
      const stdout = `__TRACE_START__
{invalid json}
__TRACE_END__`;

      const result = parseTraceOutput(stdout);
      expect(result.success).toBe(false);
      expect(result.error).toContain('parse');
    });

    it('should handle frames with labels', () => {
      const stdout = `__TRACE_START__
{"success":true,"frames":[{"iter":0,"vars":{"i":0},"label":"start"},{"iter":1,"vars":{"i":1},"label":"found target"}]}
__TRACE_END__`;

      const result = parseTraceOutput(stdout);
      expect(result.success).toBe(true);
      expect(result.frames[0]?.label).toBe('start');
      expect(result.frames[1]?.label).toBe('found target');
    });

    it('should handle empty frames array', () => {
      const stdout = `__TRACE_START__
{"success":true,"frames":[]}
__TRACE_END__`;

      const result = parseTraceOutput(stdout);
      expect(result.success).toBe(true);
      expect(result.frames).toHaveLength(0);
    });

    it('should handle nested objects in vars', () => {
      const stdout = `__TRACE_START__
{"success":true,"frames":[{"iter":0,"vars":{"window":{"start":0,"end":3},"count":5}}]}
__TRACE_END__`;

      const result = parseTraceOutput(stdout);
      expect(result.success).toBe(true);
      expect(result.frames[0]?.vars.window).toEqual({ start: 0, end: 3 });
      expect(result.frames[0]?.vars.count).toBe(5);
    });

    it('should handle trace error response', () => {
      const stdout = `__TRACE_START__
{"success":false,"frames":[],"error":"Max iterations exceeded"}
__TRACE_END__`;

      const result = parseTraceOutput(stdout);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Max iterations exceeded');
    });
  });
});
