'use client';

interface Problem {
  id: string;
  title: string;
  statement: string;
  pattern: string;
  rung: number;
  targetComplexity?: string;
}

interface ProblemStatementProps {
  problem: Problem;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function ProblemStatement({ problem, collapsed = false, onToggle }: ProblemStatementProps) {
  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          cursor: onToggle ? 'pointer' : 'default'
        }}
        onClick={onToggle}
      >
        <div>
          <h2 className="problem-title" style={{ fontSize: '1.25rem' }}>{problem.title}</h2>
          <div className="problem-meta" style={{ marginTop: '0.5rem' }}>
            <span className="problem-tag">{problem.pattern.replace(/_/g, ' ')}</span>
            <span className="problem-tag">Rung {problem.rung}</span>
            {problem.targetComplexity && (
              <span className="problem-tag">Target: {problem.targetComplexity}</span>
            )}
          </div>
        </div>
        {onToggle && (
          <button className="btn btn-ghost" style={{ padding: '0.25rem' }}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
              style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="problem-body" style={{ marginTop: '1rem' }}>
          {problem.statement}
        </div>
      )}
    </div>
  );
}
