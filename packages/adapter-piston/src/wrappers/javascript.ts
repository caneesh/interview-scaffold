import type { CodeWrapper } from '../types.js';

export const javascriptWrapper: CodeWrapper = {
  wrap(userCode: string, input: string, functionName: string): string {
    return `
${userCode}

// Test harness
try {
  const inputData = ${input};
  let result;
  if (Array.isArray(inputData)) {
    result = ${functionName}(...inputData);
  } else {
    result = ${functionName}(inputData);
  }
  console.log('__RESULT_START__');
  console.log(JSON.stringify(result));
  console.log('__RESULT_END__');
} catch (e) {
  console.log('__ERROR_START__');
  console.log(e.message || String(e));
  console.log('__ERROR_END__');
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

    // No delimiters found - return raw output (might be syntax error)
    return { result: stdout.trim(), error: null };
  },

  extractFunctionName(code: string): string | null {
    // Match: function name(...) { or function name(...)
    const funcMatch = code.match(/function\s+(\w+)\s*\(/);
    if (funcMatch && funcMatch[1]) return funcMatch[1];

    // Match: const/let/var name = function or arrow function
    const varFuncMatch = code.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:function|\(|async)/);
    if (varFuncMatch && varFuncMatch[1]) return varFuncMatch[1];

    return null;
  },
};
