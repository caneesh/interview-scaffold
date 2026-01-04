'use client';

interface TestResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  error: string | null;
}

interface TestResultsProps {
  results: TestResult[];
  showHidden?: boolean;
}

export function TestResults({ results, showHidden = false }: TestResultsProps) {
  const passCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  return (
    <div className="test-results">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <h4 style={{ margin: 0 }}>Test Results</h4>
        <span style={{
          color: passCount === totalCount ? 'var(--success)' : 'var(--error)',
          fontWeight: '500'
        }}>
          {passCount}/{totalCount} passed
        </span>
      </div>

      {results.map((result, index) => (
        <div key={index} className={`test-result ${result.passed ? 'pass' : 'fail'}`}>
          <div className="test-result-header">
            {result.passed ? (
              <svg className="test-result-icon" viewBox="0 0 16 16" fill="var(--success)">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.78 5.28a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 1 1 1.06-1.06l1.47 1.47 3.72-3.72a.75.75 0 0 1 1.06 0z"/>
              </svg>
            ) : (
              <svg className="test-result-icon" viewBox="0 0 16 16" fill="var(--error)">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.28 4.72a.75.75 0 0 1 0 1.06L9.06 8l2.22 2.22a.75.75 0 1 1-1.06 1.06L8 9.06l-2.22 2.22a.75.75 0 0 1-1.06-1.06L6.94 8 4.72 5.78a.75.75 0 0 1 1.06-1.06L8 6.94l2.22-2.22a.75.75 0 0 1 1.06 0z"/>
              </svg>
            )}
            <span style={{ fontWeight: '500' }}>Test Case {index + 1}</span>
          </div>

          <div style={{ fontSize: '0.8125rem' }}>
            <div style={{ marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Input: </span>
              <code>{result.input}</code>
            </div>
            <div style={{ marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Expected: </span>
              <code>{result.expected}</code>
            </div>
            {!result.passed && (
              <div style={{ marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Actual: </span>
                <code style={{ color: 'var(--error)' }}>{result.actual}</code>
              </div>
            )}
            {result.error && (
              <div style={{ color: 'var(--error)', marginTop: '0.5rem' }}>
                Error: {result.error}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
