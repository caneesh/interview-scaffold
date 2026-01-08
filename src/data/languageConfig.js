/**
 * Language Configuration for Multi-Language Code Editor
 * Supports: Python, JavaScript, Java
 */

export const languages = {
  python: {
    id: 'python',
    name: 'Python',
    extension: '.py',
    monacoId: 'python',
    icon: 'python',
    color: '#3776AB',
    defaultTemplate: `def solution(nums):
    # Your code here
    pass
`,
  },
  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    extension: '.js',
    monacoId: 'javascript',
    icon: 'javascript',
    color: '#F7DF1E',
    defaultTemplate: `function solution(nums) {
    // Your code here

}
`,
  },
  java: {
    id: 'java',
    name: 'Java',
    extension: '.java',
    monacoId: 'java',
    icon: 'java',
    color: '#ED8B00',
    defaultTemplate: `class Solution {
    public int[] solution(int[] nums) {
        // Your code here

    }
}
`,
  },
};

export const languageList = Object.values(languages);

/**
 * Get file name with extension based on language
 */
export function getFileName(language, baseName = 'solution') {
  const lang = languages[language] || languages.python;
  return `${baseName}${lang.extension}`;
}

/**
 * Monaco Editor theme configuration
 */
export const editorTheme = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6A9955' },
    { token: 'keyword', foreground: 'C586C0' },
    { token: 'string', foreground: 'CE9178' },
    { token: 'number', foreground: 'B5CEA8' },
    { token: 'function', foreground: 'DCDCAA' },
    { token: 'variable', foreground: '9CDCFE' },
    { token: 'type', foreground: '4EC9B0' },
  ],
  colors: {
    'editor.background': '#1E293B',
    'editor.foreground': '#D4D4D4',
    'editor.lineHighlightBackground': '#334155',
    'editorLineNumber.foreground': '#6B7280',
    'editorCursor.foreground': '#22D3EE',
    'editor.selectionBackground': '#264F78',
  },
};

/**
 * Monaco Editor options
 */
export const editorOptions = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
  fontLigatures: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 4,
  insertSpaces: true,
  wordWrap: 'on',
  lineNumbers: 'on',
  renderLineHighlight: 'line',
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  smoothScrolling: true,
  padding: { top: 16, bottom: 16 },
  suggest: {
    showKeywords: true,
    showSnippets: true,
    showFunctions: true,
    showVariables: true,
  },
  quickSuggestions: {
    other: true,
    comments: false,
    strings: false,
  },
  parameterHints: { enabled: true },
  formatOnPaste: true,
  formatOnType: true,
  bracketPairColorization: { enabled: true },
  autoClosingBrackets: 'always',
  autoClosingQuotes: 'always',
  autoIndent: 'full',
};

export default languages;
