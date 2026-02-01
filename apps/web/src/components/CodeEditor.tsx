'use client';

import { useState } from 'react';

interface CodeEditorProps {
  initialCode?: string;
  language?: string;
  onSubmit: (data: { code: string; language: string }) => Promise<void>;
  loading?: boolean;
  /** Callback when code or language changes - for trace mode */
  onCodeChange?: (code: string, language: string) => void;
}

const LANGUAGE_OPTIONS = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'go', label: 'Go' },
];

const STARTER_CODE: Record<string, string> = {
  javascript: `function solution(input) {
  // Your code here

}`,
  typescript: `function solution(input: unknown): unknown {
  // Your code here

}`,
  python: `def solution(input):
    # Your code here
    pass`,
  java: `class Solution {
    public Object solution(Object input) {
        // Your code here
        return null;
    }
}`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    // Your code here
};`,
  go: `package main

func solution(input interface{}) interface{} {
    // Your code here
    return nil
}`,
};

export function CodeEditor({
  initialCode,
  language: initialLanguage = 'javascript',
  onSubmit,
  loading,
  onCodeChange,
}: CodeEditorProps) {
  const [code, setCode] = useState(initialCode || STARTER_CODE[initialLanguage] || '');
  const [language, setLanguage] = useState(initialLanguage);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    onCodeChange?.(newCode, language);
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    const newCode = (!code || code === STARTER_CODE[language])
      ? (STARTER_CODE[newLang] || '')
      : code;
    if (newCode !== code) {
      setCode(newCode);
    }
    onCodeChange?.(newCode, newLang);
  };

  const handleSubmit = async () => {
    await onSubmit({ code, language });
  };

  return (
    <div className="code-editor-wrapper" data-testid="code-editor">
      <div className="code-editor">
        <div className="code-editor-header">
          <select
            className="select"
            style={{ width: 'auto' }}
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          className="code-textarea"
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          spellCheck={false}
          placeholder="Write your solution here..."
        />
      </div>

      <div className="code-editor-actions">
        <button
          className="btn btn-primary code-submit-btn"
          onClick={handleSubmit}
          disabled={loading || !code.trim()}
        >
          {loading ? (
            <>
              <span className="spinner" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
              Running Tests...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '0.5rem' }}>
                <path d="M4 2a1 1 0 011 1v10a1 1 0 11-2 0V3a1 1 0 011-1zm7.293.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L13.586 6H7a1 1 0 110-2h6.586l-2.293-2.293a1 1 0 010-1.414z"/>
              </svg>
              Run Tests
            </>
          )}
        </button>
      </div>
    </div>
  );
}
