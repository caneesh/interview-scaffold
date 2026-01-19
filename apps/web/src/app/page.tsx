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
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/practice" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
            Start Practice
          </Link>
          <Link href="/explorer" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
            Explore Patterns
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Practice Modes</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <Link href="/debug-lab" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card" style={{ height: '100%', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}>
              <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🔬</span> Debug Lab
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Practice debugging real-world scenarios. Triage defects, analyze observability signals,
                and fix bugs in mini-repos.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>Taxonomy-based</span>
                <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>Triage Assessment</span>
                <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>Multi-file</span>
              </div>
            </div>
          </Link>

          <Link href="/bug-hunt" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card" style={{ height: '100%', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}>
              <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🐛</span> Bug Hunt
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Find bugs in code snippets. Select buggy lines and explain the invariant violation.
                Quick pattern-focused debugging practice.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>Pattern-focused</span>
                <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>Line Selection</span>
                <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>Quick Practice</span>
              </div>
            </div>
          </Link>

          <Link href="/practice" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card" style={{ height: '100%', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}>
              <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>💡</span> Pattern Practice
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Guided problem solving with pattern discovery, invariant templates, and
                Socratic coaching. Full implementation practice.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>Guided</span>
                <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>Full Problems</span>
                <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>Adaptive</span>
              </div>
            </div>
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
