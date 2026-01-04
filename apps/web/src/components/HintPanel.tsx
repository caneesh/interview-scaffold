'use client';

interface Hint {
  level: string;
  text: string;
}

interface HintPanelProps {
  hints: Hint[];
}

const LEVEL_LABELS: Record<string, string> = {
  DIRECTIONAL_QUESTION: 'Directional Question',
  HEURISTIC_HINT: 'Heuristic Hint',
  CONCEPT_INJECTION: 'Concept Injection',
  MICRO_EXAMPLE: 'Micro Example',
  PATCH_SNIPPET: 'Code Snippet',
};

export function HintPanel({ hints }: HintPanelProps) {
  if (hints.length === 0) return null;

  return (
    <div style={{ marginTop: '1rem' }}>
      {hints.map((hint, index) => (
        <div key={index} className="hint-panel" style={{ marginBottom: '0.75rem' }}>
          <div className="hint-header">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm6.5-.25A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75zM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
            </svg>
            <span>Hint {index + 1}</span>
            <span className="hint-level">{LEVEL_LABELS[hint.level] || hint.level}</span>
          </div>
          <div className="hint-text">
            {hint.level === 'PATCH_SNIPPET' ? (
              <pre style={{
                margin: 0,
                padding: '0.75rem',
                background: 'var(--bg-tertiary)',
                borderRadius: '0.25rem',
                overflow: 'auto'
              }}>
                {hint.text}
              </pre>
            ) : (
              hint.text
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
