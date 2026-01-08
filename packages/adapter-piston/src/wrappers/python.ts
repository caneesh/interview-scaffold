import type { CodeWrapper } from '../types.js';

export const pythonWrapper: CodeWrapper = {
  wrap(userCode: string, input: string, functionName: string): string {
    return `
import json

${userCode}

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
