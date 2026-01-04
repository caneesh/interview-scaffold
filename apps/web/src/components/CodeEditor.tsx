'use client';

import { useState } from 'react';

interface CodeEditorProps {
  initialCode?: string;
  language?: string;
  onSubmit: (data: { code: string; language: string }) => Promise<void>;
  onRequestHint: () => Promise<void>;
  loading?: boolean;
  hintLoading?: boolean;
  hintsRemaining?: number;
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
  onRequestHint,
  loading,
  hintLoading,
  hintsRemaining = 5,
}: CodeEditorProps) {
  const [code, setCode] = useState(initialCode || STARTER_CODE[initialLanguage] || '');
  const [language, setLanguage] = useState(initialLanguage);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (!code || code === STARTER_CODE[language]) {
      setCode(STARTER_CODE[newLang] || '');
    }
  };

  const handleSubmit = async () => {
    await onSubmit({ code, language });
  };

  return (
    <div className="card">
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
          <button
            className="btn btn-ghost"
            onClick={onRequestHint}
            disabled={hintLoading || hintsRemaining === 0}
            title={hintsRemaining === 0 ? 'No more hints available' : 'Get a hint'}
          >
            {hintLoading ? 'Loading...' : `Hint (${hintsRemaining} left)`}
          </button>
        </div>
        <textarea
          className="code-textarea"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          placeholder="Write your solution here..."
        />
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1, padding: '0.75rem' }}
          onClick={handleSubmit}
          disabled={loading || !code.trim()}
        >
          {loading ? 'Running Tests...' : 'Submit Code'}
        </button>
      </div>
    </div>
  );
}
