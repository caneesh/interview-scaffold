'use client';

import Link from 'next/link';

interface Score {
  overall: number;
  patternRecognition: number;
  implementation: number;
  edgeCases: number;
  efficiency: number;
  bonus?: number;
}

interface CompletionSummaryProps {
  score: Score;
  pattern: string;
  rung: number;
  hintsUsed: number;
  codeSubmissions: number;
}

export function CompletionSummary({
  score,
  pattern,
  rung,
  hintsUsed,
  codeSubmissions
}: CompletionSummaryProps) {
  const overallPercent = Math.round(score.overall * 100);
  const color = overallPercent >= 70 ? 'var(--success)' : overallPercent >= 50 ? 'var(--warning)' : 'var(--error)';

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ marginBottom: '1rem' }}>
          <circle cx="32" cy="32" r="30" stroke={color} strokeWidth="4" fill="none" />
          <path
            d="M20 32L28 40L44 24"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h2 style={{ marginBottom: '0.5rem' }}>Problem Complete!</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          {pattern.replace(/_/g, ' ')} - Rung {rung}
        </p>
      </div>

      <div
        style={{
          fontSize: '3rem',
          fontWeight: '600',
          color,
          marginBottom: '0.5rem'
        }}
      >
        {overallPercent}%
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Overall Score</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1rem',
          textAlign: 'left',
          marginBottom: '2rem'
        }}
      >
        <ScoreItem label="Pattern Recognition" value={score.patternRecognition} />
        <ScoreItem label="Implementation" value={score.implementation} />
        <ScoreItem label="Edge Cases" value={score.edgeCases} />
        <ScoreItem label="Efficiency" value={score.efficiency} />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem',
          color: 'var(--text-muted)',
          fontSize: '0.875rem',
          marginBottom: '2rem'
        }}
      >
        <div>
          <span style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>{codeSubmissions}</span> code submissions
        </div>
        <div>
          <span style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>{hintsUsed}</span> hints used
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        <Link href="/practice" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
          Next Problem
        </Link>
        <Link href="/skills" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
          View Skills
        </Link>
      </div>
    </div>
  );
}

function ScoreItem({ label, value }: { label: string; value: number }) {
  const percent = Math.round(value * 100);
  return (
    <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: '500' }}>{percent}%</div>
    </div>
  );
}
