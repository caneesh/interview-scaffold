import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Scaffold - Interview Prep',
  description: 'Pattern-first interview preparation platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="layout">
          <header className="header">
            <div className="container header-inner">
              <Link href="/" className="logo">
                Scaffold
              </Link>
              <nav className="nav">
                <Link href="/practice">Practice</Link>
                <Link href="/explorer">Explorer</Link>
                <Link href="/skills">Skills</Link>
              </nav>
            </div>
          </header>
          <main className="main">
            <div className="container">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
