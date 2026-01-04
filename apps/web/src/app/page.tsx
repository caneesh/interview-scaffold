import Link from 'next/link';

export default function HomePage() {
  return (
    <div>
      <div style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
          Master Coding Patterns
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.125rem' }}>
          Pattern-first interview preparation. Learn algorithmic patterns
          through guided practice with instant feedback.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/practice" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
            Start Practice
          </Link>
          <Link href="/explorer" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
            Explore Patterns
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginTop: '3rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>How it works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div>
            <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>1. Approach</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Identify the pattern before writing code. State the invariant
              that guides your solution.
            </p>
          </div>
          <div>
            <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>2. Implement</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Write your solution with the pattern in mind. Submit code
              and see test results instantly.
            </p>
          </div>
          <div>
            <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>3. Reflect</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Learn from mistakes through guided reflection. Unlock
              micro-lessons when needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
