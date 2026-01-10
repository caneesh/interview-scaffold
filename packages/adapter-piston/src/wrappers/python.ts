import type { CodeWrapper } from '../types.js';

/**
 * Strips out main execution blocks that use input() so the wrapper can call the function directly.
 * This handles competitive programming style code like:
 *   print(solution(int(input())))
 *   if __name__ == "__main__": print(solve(input()))
 */
function stripMainExecution(code: string): string {
  const lines = code.split('\n');
  const cleanedLines: string[] = [];
  let insideMainBlock = false;
  let mainBlockIndent = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Detect start of if __name__ == "__main__": block
    if (trimmedLine.match(/^if\s+__name__\s*==\s*["']__main__["']\s*:/)) {
      insideMainBlock = true;
      mainBlockIndent = line.search(/\S/);
      continue;
    }

    // If inside main block, skip lines that are indented more than or equal to the block
    if (insideMainBlock) {
      const currentIndent = line.search(/\S/);
      // Empty lines or more indented lines are part of the block
      if (trimmedLine === '' || currentIndent > mainBlockIndent) {
        continue;
      }
      // Less or equal indent means we've exited the block
      insideMainBlock = false;
    }

    // Skip standalone print statements that call the function with input()
    // e.g., print(climbStairs(int(input())))
    if (trimmedLine.match(/^print\s*\(.*\binput\s*\(.*\)\s*\)/)) {
      continue;
    }

    // Skip standalone function calls with input()
    // e.g., solve(input()) or solution(int(input()))
    if (trimmedLine.match(/^\w+\s*\(.*\binput\s*\(.*\)\s*\)$/)) {
      continue;
    }

    cleanedLines.push(line);
  }

  return cleanedLines.join('\n');
}

export const pythonWrapper: CodeWrapper = {
  wrap(userCode: string, input: string, functionName: string): string {
    // Strip out main execution blocks that might use input()
    const cleanedCode = stripMainExecution(userCode);

    return `
import json

${cleanedCode}

# Test harness
if __name__ == "__main__":
    try:
        input_data = ${input}
        if isinstance(input_data, (list, tuple)):
            result = ${functionName}(*input_data)
        else:
            result = ${functionName}(input_data)
        print("__RESULT_START__")
        print(json.dumps(result))
        print("__RESULT_END__")
    except Exception as e:
        print("__ERROR_START__")
        print(str(e))
        print("__ERROR_END__")
`;
  },

  parseOutput(stdout: string): { result: string; error: string | null } {
    const resultMatch = stdout.match(/__RESULT_START__\n([\s\S]*?)\n__RESULT_END__/);
    if (resultMatch && resultMatch[1]) {
      return { result: resultMatch[1].trim(), error: null };
    }

    const errorMatch = stdout.match(/__ERROR_START__\n([\s\S]*?)\n__ERROR_END__/);
    if (errorMatch && errorMatch[1]) {
      return { result: '', error: errorMatch[1].trim() };
    }

    return { result: stdout.trim(), error: null };
  },

  extractFunctionName(code: string): string | null {
    // Match: def function_name(
    const match = code.match(/def\s+(\w+)\s*\(/);
    return match && match[1] ? match[1] : null;
  },
};
