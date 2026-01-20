'use client';

import { useState } from 'react';
import { HelpPanel } from './HelpPanel';
import { CodeAntiCheatWarning } from './MemorizationWarning';

interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  explanation?: string;
}

interface TestResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error?: string;
}

interface CodingStageProps {
  sessionId: string;
  attemptId: string;
  problemTitle: string;
  problemStatement: string;
  patternName: string;
  testCases: TestCase[];
  helpLevel: 1 | 2 | 3 | 4 | 5;
  onStageComplete: () => void;
}

const STARTER_CODE = `function solve(input) {
  // Your code here

}`;

export function CodingStage({
  sessionId,
  attemptId,
  problemTitle,
  problemStatement,
  patternName,
  testCases,
  helpLevel,
  onStageComplete,
}: CodingStageProps) {
  const [code, setCode] = useState(STARTER_CODE);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [allPassed, setAllPassed] = useState(false);
  const [currentHelpLevel, setCurrentHelpLevel] = useState(helpLevel);

  // Anti-cheat warnings state
  const [antiCheatWarnings, setAntiCheatWarnings] = useState<Array<{
    type: 'editorial_pattern' | 'anti_cheat_marker';
    message: string;
    severity: 'info' | 'warning';
  }>>([]);

  const visibleTestCases = testCases.filter(tc => !tc.isHidden);

  async function runTests() {
    setRunning(true);
    setError(null);

    try {
      const res = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: 'javascript',
          runOnly: true,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error.message);
        return;
      }

      setTestResults(data.results || []);

      const passed = data.results?.every((r: TestResult) => r.passed) ?? false;
      setAllPassed(passed);
    } catch (err) {
      setError('Failed to run tests');
    } finally {
      setRunning(false);
    }
  }

  async function submitCode() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/coaching/sessions/${sessionId}/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: 'javascript',
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error.message);
        return;
      }

      // Check for anti-cheat warnings
      if (data.antiCheatWarnings && data.antiCheatWarnings.length > 0) {
        setAntiCheatWarnings(data.antiCheatWarnings);
      }

      if (data.isComplete) {
        setTimeout(() => {
          onStageComplete();
        }, 1500);
      }
    } catch (err) {
      setError('Failed to submit code');
    } finally {
      setSubmitting(false);
    }
  }

  function handleHelpReceived(level: number) {
    if (level > currentHelpLevel) {
      setCurrentHelpLevel(level as 1 | 2 | 3 | 4 | 5);
    }
  }

  return (
    <div className="coaching-stage coding-stage">
      <div className="stage-header">
        <div className="stage-icon stage-icon--coding">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </div>
        <div className="stage-header-content">
          <h2>Coding</h2>
          <p>Implement your solution. The silent interviewer is watching.</p>
        </div>
        <HelpPanel
          sessionId={sessionId}
          currentLevel={currentHelpLevel}
          context={`Coding stage for ${problemTitle} using ${patternName}`}
          onHelpReceived={handleHelpReceived}
        />
      </div>

      {allPassed && (
        <div className="stage-complete-banner stage-complete-banner--success">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>All tests passed! Ready to submit.</span>
        </div>
      )}

      {error && (
        <div className="stage-error">
          {error}
          <button onClick={() => setError(null)} className="error-dismiss">x</button>
        </div>
      )}

      {antiCheatWarnings.length > 0 && (
        <CodeAntiCheatWarning warnings={antiCheatWarnings} />
      )}

      <div className="coding-layout">
        <div className="coding-problem">
          <h3>{problemTitle}</h3>
          <div className="problem-statement-compact">
            {problemStatement.length > 300
              ? problemStatement.slice(0, 300) + '...'
              : problemStatement}
          </div>
          <div className="problem-pattern-badge">
            Using: {patternName.replace(/_/g, ' ')}
          </div>
        </div>

        <div className="coding-editor">
          <div className="editor-header">
            <span className="editor-language">JavaScript</span>
          </div>
          <textarea
            className="code-textarea"
            value={code}
            onChange={e => setCode(e.target.value)}
            spellCheck={false}
            disabled={running || submitting}
          />
        </div>

        <div className="coding-actions">
          <button
            className="btn btn-secondary"
            onClick={runTests}
            disabled={running || submitting}
          >
            {running ? 'Running...' : 'Run Tests'}
          </button>
          <button
            className="btn btn-primary"
            onClick={submitCode}
            disabled={!allPassed || submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Solution'}
          </button>
        </div>

        {/* Test Cases */}
        <div className="test-cases-section">
          <h4>Test Cases</h4>
          <div className="test-cases-list">
            {visibleTestCases.map((tc, index) => {
              const result = testResults?.[index];
              return (
                <div
                  key={index}
                  className={`test-case ${result ? (result.passed ? 'passed' : 'failed') : ''}`}
                >
                  <div className="test-case-header">
                    <span className="test-case-number">Test {index + 1}</span>
                    {result && (
                      <span className={`test-case-status ${result.passed ? 'passed' : 'failed'}`}>
                        {result.passed ? 'PASS' : 'FAIL'}
                      </span>
                    )}
                  </div>
                  <div className="test-case-content">
                    <div className="test-case-row">
                      <span className="test-case-label">Input:</span>
                      <code>{tc.input}</code>
                    </div>
                    <div className="test-case-row">
                      <span className="test-case-label">Expected:</span>
                      <code>{tc.expectedOutput}</code>
                    </div>
                    {result && !result.passed && (
                      <div className="test-case-row test-case-row--actual">
                        <span className="test-case-label">Actual:</span>
                        <code>{result.actual}</code>
                      </div>
                    )}
                    {result?.error && (
                      <div className="test-case-error">{result.error}</div>
                    )}
                  </div>
                  {tc.explanation && (
                    <div className="test-case-explanation">{tc.explanation}</div>
                  )}
                </div>
              );
            })}
            {testCases.filter(tc => tc.isHidden).length > 0 && (
              <div className="hidden-tests-note">
                + {testCases.filter(tc => tc.isHidden).length} hidden test cases
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="coding-tips">
        <h4>Silent Interviewer Mode</h4>
        <p>
          Like in a real interview, you should be able to implement your solution
          without hints. Use the Help Panel only if you are truly stuck.
          Each help level applies a score penalty.
        </p>
      </div>
    </div>
  );
}
