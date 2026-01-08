import type { CodeWrapper } from '../types.js';

export const javaWrapper: CodeWrapper = {
  wrap(userCode: string, input: string, functionName: string): string {
    // Check if user code already has a class definition
    const hasClass = /class\s+\w+/.test(userCode);

    // Parse input to determine Java argument passing
    const javaInput = convertToJavaArgs(input);

    if (hasClass) {
      // User provided a class - assume it's called Solution
      return `
import java.util.*;

${userCode}

public class Main {
    public static void main(String[] args) {
        try {
            Solution sol = new Solution();
            Object result = sol.${functionName}(${javaInput});
            System.out.println("__RESULT_START__");
            System.out.println(formatResult(result));
            System.out.println("__RESULT_END__");
        } catch (Exception e) {
            System.out.println("__ERROR_START__");
            System.out.println(e.getMessage());
            System.out.println("__ERROR_END__");
        }
    }

    private static String formatResult(Object result) {
        if (result instanceof int[]) {
            return Arrays.toString((int[]) result);
        } else if (result instanceof String[]) {
            return Arrays.toString((String[]) result);
        } else if (result instanceof boolean[]) {
            return Arrays.toString((boolean[]) result);
        } else if (result instanceof Object[]) {
            return Arrays.deepToString((Object[]) result);
        }
        return String.valueOf(result);
    }
}
`;
    }

    // User provided methods only - wrap in Solution class
    return `
import java.util.*;

class Solution {
    ${userCode}
}

public class Main {
    public static void main(String[] args) {
        try {
            Solution sol = new Solution();
            Object result = sol.${functionName}(${javaInput});
            System.out.println("__RESULT_START__");
            System.out.println(formatResult(result));
            System.out.println("__RESULT_END__");
        } catch (Exception e) {
            System.out.println("__ERROR_START__");
            System.out.println(e.getMessage());
            System.out.println("__ERROR_END__");
        }
    }

    private static String formatResult(Object result) {
        if (result instanceof int[]) {
            return Arrays.toString((int[]) result);
        } else if (result instanceof String[]) {
            return Arrays.toString((String[]) result);
        } else if (result instanceof boolean[]) {
            return Arrays.toString((boolean[]) result);
        } else if (result instanceof Object[]) {
            return Arrays.deepToString((Object[]) result);
        }
        return String.valueOf(result);
    }
}
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
    // Match: public/private/protected returnType methodName(
    const match = code.match(/(?:public|private|protected)?\s*(?:static\s+)?[\w<>\[\]]+\s+(\w+)\s*\(/);
    return match && match[1] ? match[1] : null;
  },
};

/**
 * Convert JSON-like input to Java argument format
 */
function convertToJavaArgs(input: string): string {
  try {
    const parsed = JSON.parse(input);

    if (Array.isArray(parsed)) {
      // Multiple arguments - convert each
      return parsed.map(convertSingleArg).join(', ');
    }

    // Single argument
    return convertSingleArg(parsed);
  } catch {
    // Not valid JSON, return as-is
    return input;
  }
}

function convertSingleArg(value: unknown): string {
  if (value === null) return 'null';

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  if (typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    // Check if it's all numbers
    if (value.every(v => typeof v === 'number')) {
      return `new int[]{${value.join(', ')}}`;
    }
    // Check if it's all strings
    if (value.every(v => typeof v === 'string')) {
      return `new String[]{${value.map(v => `"${v}"`).join(', ')}}`;
    }
    // Mixed or nested - fall back to string representation
    return `new int[]{${value.join(', ')}}`;
  }

  return String(value);
}
