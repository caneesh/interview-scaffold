import type { CodeWrapper } from '../types.js';

export const cppWrapper: CodeWrapper = {
  wrap(userCode: string, input: string, functionName: string): string {
    const cppArgs = convertToCppArgs(input);

    return `
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>

using namespace std;

${userCode}

template<typename T>
void printResult(const T& result) {
    cout << result;
}

template<typename T>
void printResult(const vector<T>& result) {
    cout << "[";
    for (size_t i = 0; i < result.size(); i++) {
        if (i > 0) cout << ", ";
        cout << result[i];
    }
    cout << "]";
}

void printResult(const vector<string>& result) {
    cout << "[";
    for (size_t i = 0; i < result.size(); i++) {
        if (i > 0) cout << ", ";
        cout << "\\"" << result[i] << "\\"";
    }
    cout << "]";
}

void printResult(bool result) {
    cout << (result ? "true" : "false");
}

int main() {
    try {
        auto result = ${functionName}(${cppArgs});
        cout << "__RESULT_START__" << endl;
        printResult(result);
        cout << endl;
        cout << "__RESULT_END__" << endl;
    } catch (const exception& e) {
        cout << "__ERROR_START__" << endl;
        cout << e.what() << endl;
        cout << "__ERROR_END__" << endl;
    } catch (...) {
        cout << "__ERROR_START__" << endl;
        cout << "Unknown error" << endl;
        cout << "__ERROR_END__" << endl;
    }
    return 0;
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
    // Match: returnType functionName( but not main
    const matches = code.matchAll(/(?:int|void|bool|string|vector<[^>]+>|auto)\s+(\w+)\s*\(/g);
    for (const match of matches) {
      const name = match[1];
      if (name && name !== 'main') {
        return name;
      }
    }
    return null;
  },
};

/**
 * Convert JSON-like input to C++ argument format
 */
function convertToCppArgs(input: string): string {
  try {
    const parsed = JSON.parse(input);

    if (Array.isArray(parsed)) {
      // Check if this is a list of arguments or a single array argument
      // Heuristic: if first element is also an array, it's likely a single array arg
      if (parsed.length > 0 && Array.isArray(parsed[0])) {
        return convertSingleArg(parsed);
      }
      // Check if all elements are primitives and could be multiple args
      if (parsed.every(v => typeof v !== 'object' || v === null)) {
        // Could be multiple primitive args
        return parsed.map(convertSingleArg).join(', ');
      }
      // Single array argument
      return convertSingleArg(parsed);
    }

    return convertSingleArg(parsed);
  } catch {
    return input;
  }
}

function convertSingleArg(value: unknown): string {
  if (value === null) return '{}';

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (Array.isArray(value)) {
    if (value.every(v => typeof v === 'number')) {
      return `vector<int>{${value.join(', ')}}`;
    }
    if (value.every(v => typeof v === 'string')) {
      return `vector<string>{${value.map(v => `"${v}"`).join(', ')}}`;
    }
    // Nested arrays - assume vector<vector<int>>
    if (value.every(v => Array.isArray(v))) {
      const inner = value.map(arr =>
        `{${(arr as number[]).join(', ')}}`
      ).join(', ');
      return `vector<vector<int>>{${inner}}`;
    }
    return `vector<int>{${value.join(', ')}}`;
  }

  return String(value);
}
