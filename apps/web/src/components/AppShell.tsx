'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';

type AppMode = 'dashboard' | 'solve' | 'review';

interface AppShellProps {
  children: ReactNode;
}

/**
 * Determines the app mode based on the current pathname.
 *
 * - dashboard: Main navigation pages (/, /practice, /explorer, /skills)
 * - solve: Active problem-solving pages (/practice/[attemptId])
 * - review: Post-attempt review pages (future)
 *
 * Note: /daily and /interview have their own layouts and don't use AppShell headers
 */
function getAppMode(pathname: string): AppMode {
  // Solve mode: /practice/[attemptId] - has a dynamic segment after /practice/
  if (pathname.startsWith('/practice/') && pathname !== '/practice') {
    return 'solve';
  }

  // Dashboard mode for all other pages
  return 'dashboard';
}

function DashboardHeader() {
  return (
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
  );
}

function SolveHeader() {
  return (
    <header className="header header--solve">
      <div className="container header-inner">
        <Link href="/" className="logo">
          Scaffold
        </Link>
        <Link href="/practice" className="btn btn-secondary btn-sm">
          Exit to Dashboard
        </Link>
      </div>
    </header>
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const mode = getAppMode(pathname);

  // Skip AppShell header for pages that have their own layout
  const hasOwnLayout = pathname.startsWith('/daily') || pathname.startsWith('/interview');

  if (hasOwnLayout) {
    return (
      <div className="layout">
        <main className="main">
          <div className="container">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="layout" data-mode={mode}>
      {mode === 'solve' ? <SolveHeader /> : <DashboardHeader />}
      <main className="main">
        <div className="container">
          {children}
        </div>
      </main>
    </div>
  );
}

export { getAppMode };
export type { AppMode };
