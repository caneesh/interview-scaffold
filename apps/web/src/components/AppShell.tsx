'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, type ReactNode } from 'react';
import { IconButton } from './ui/IconButton';
import { Tooltip } from './ui/Tooltip';
import { CommandPalette, useCommandPalette } from './CommandPalette';

type AppMode = 'dashboard' | 'solve' | 'review' | 'coach' | 'debug';

interface AppShellProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  section: 'practice' | 'learn' | 'progress';
}

const NAV_ITEMS: NavItem[] = [
  // Practice section
  {
    label: 'Practice',
    href: '/practice',
    icon: <CodeIcon />,
    section: 'practice',
  },
  {
    label: 'Bug Hunt',
    href: '/bug-hunt',
    icon: <BugIcon />,
    section: 'practice',
  },
  {
    label: 'Debug Lab',
    href: '/debug',
    icon: <TerminalIcon />,
    section: 'practice',
  },
  {
    label: 'Daily Challenge',
    href: '/daily',
    icon: <CalendarIcon />,
    section: 'practice',
  },
  {
    label: 'Mock Interview',
    href: '/interview',
    icon: <VideoIcon />,
    section: 'practice',
  },
  // Learn section
  {
    label: 'Coach',
    href: '/coach',
    icon: <ChatIcon />,
    section: 'learn',
  },
  {
    label: 'Explorer',
    href: '/explorer',
    icon: <CompassIcon />,
    section: 'learn',
  },
  {
    label: 'Features',
    href: '/features',
    icon: <GridIcon />,
    section: 'learn',
  },
  // Progress section
  {
    label: 'Skills',
    href: '/skills',
    icon: <ChartIcon />,
    section: 'progress',
  },
];

const SECTION_LABELS: Record<string, string> = {
  practice: 'Practice',
  learn: 'Learn',
  progress: 'Progress',
};

/**
 * Determines the app mode based on the current pathname.
 *
 * - dashboard: Main navigation pages (/, /practice, /explorer, /skills)
 * - solve: Active problem-solving pages (/practice/[attemptId])
 * - review: Post-attempt review pages (future)
 * - coach: Active coaching sessions (/coach/[sessionId])
 * - debug: Active debug sessions (/debug/attempts/[attemptId])
 *
 * Note: /daily and /interview have their own layouts and don't use AppShell headers
 */
function getAppMode(pathname: string): AppMode {
  // Solve mode: /practice/[attemptId] - has a dynamic segment after /practice/
  if (pathname.startsWith('/practice/') && pathname !== '/practice') {
    return 'solve';
  }

  // Coach mode: /coach/[sessionId] - active coaching session
  if (pathname.startsWith('/coach/') && pathname !== '/coach') {
    return 'coach';
  }

  // Debug mode: /debug/attempts/[attemptId] - active debug session
  if (pathname.startsWith('/debug/attempts/') && pathname !== '/debug/attempts') {
    return 'debug';
  }

  // Dashboard mode for all other pages
  return 'dashboard';
}

/**
 * Determines if the sidebar should be shown for the current route.
 * Focused routes (solve, coach, debug sessions) hide the sidebar.
 */
function shouldShowSidebar(pathname: string, mode: AppMode): boolean {
  // Hide sidebar for focused modes
  if (mode === 'solve' || mode === 'coach' || mode === 'debug') {
    return false;
  }

  // Hide sidebar for daily and interview routes (they have own layouts)
  if (pathname.startsWith('/daily') || pathname.startsWith('/interview')) {
    return false;
  }

  return true;
}

/**
 * Gets the page title based on the current pathname.
 */
function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/': 'Home',
    '/practice': 'Practice',
    '/bug-hunt': 'Bug Hunt',
    '/debug': 'Debug Lab',
    '/debug-lab': 'Debug Lab',
    '/coach': 'Coach',
    '/explorer': 'Pattern Explorer',
    '/skills': 'Skills',
    '/features': 'Features',
    '/daily': 'Daily Challenge',
    '/interview': 'Mock Interview',
  };

  // Check exact match first
  if (titles[pathname]) {
    return titles[pathname];
  }

  // Check prefix matches for dynamic routes
  if (pathname.startsWith('/practice/')) {
    return 'Problem';
  }
  if (pathname.startsWith('/coach/')) {
    return 'Coaching Session';
  }
  if (pathname.startsWith('/debug/attempts/')) {
    return 'Debug Session';
  }

  return 'Scaffold';
}

// Icon Components
function LogoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 18L22 12L16 6M8 6L2 12L8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function BugIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 2L8.5 5M16 2L15.5 5M3 10H6M18 10H21M3 14H6M18 14H21M8 22L8.5 19M16 22L15.5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <ellipse cx="12" cy="12" rx="6" ry="7" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 5V19M7 12H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 17L10 11L4 5M12 19H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M22 7L16 12L22 17V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <path d="M16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88L16.24 7.76Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2"/>
      <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2"/>
      <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2"/>
      <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 20V10M12 20V4M6 20V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/**
 * Sidebar component with navigation sections.
 */
function Sidebar({
  collapsed,
  onToggle,
  pathname,
}: {
  collapsed: boolean;
  onToggle: () => void;
  pathname: string;
}) {
  const groupedItems = NAV_ITEMS.reduce<Record<string, NavItem[]>>(
    (acc, item) => {
      if (!acc[item.section]) {
        acc[item.section] = [];
      }
      acc[item.section]!.push(item);
      return acc;
    },
    {}
  );

  return (
    <aside
      className={`app-sidebar app-sidebar--light ${collapsed ? 'app-sidebar--collapsed' : ''}`}
      aria-expanded={!collapsed}
    >
      <div className="app-sidebar__header">
        <Link href="/" className="app-sidebar__logo">
          <LogoIcon />
          {!collapsed && <span className="app-sidebar__logo-text">Scaffold</span>}
        </Link>
        <IconButton
          icon={collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="app-sidebar__toggle"
        />
      </div>

      <nav className="app-sidebar__nav" aria-label="Main navigation">
        {(['practice', 'learn', 'progress'] as const).map((section) => (
          <div key={section} className="app-sidebar__section">
            {!collapsed && (
              <span className="app-sidebar__section-label">
                {SECTION_LABELS[section]}
              </span>
            )}
            <ul className="app-sidebar__list">
              {groupedItems[section]?.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href));

                const navLink = (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
                    >
                      <span className="app-sidebar__link-icon">{item.icon}</span>
                      {!collapsed && (
                        <span className="app-sidebar__link-label">{item.label}</span>
                      )}
                    </Link>
                  </li>
                );

                // Wrap in tooltip when collapsed
                if (collapsed) {
                  return (
                    <Tooltip key={item.href} content={item.label} position="right">
                      {navLink}
                    </Tooltip>
                  );
                }

                return navLink;
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

/**
 * Topbar component with page title and user actions.
 */
function Topbar({
  title,
  showMenuButton = false,
  onMenuClick,
  onSearchClick,
}: {
  title: string;
  showMenuButton?: boolean;
  onMenuClick?: () => void;
  onSearchClick?: () => void;
}) {
  return (
    <header className="app-topbar">
      <div className="app-topbar__left">
        {showMenuButton && (
          <IconButton
            icon={<MenuIcon />}
            aria-label="Open menu"
            variant="ghost"
            size="md"
            onClick={onMenuClick}
            className="app-topbar__menu-btn"
          />
        )}
        <h1 className="app-topbar__title">{title}</h1>
      </div>
      <div className="app-topbar__right">
        {onSearchClick && (
          <button
            className="topbar-search-btn focus-ring"
            onClick={onSearchClick}
            aria-label="Open command palette"
          >
            <SearchIcon />
            <span>Search...</span>
            <span className="topbar-search-btn__shortcut">Cmd+K</span>
          </button>
        )}
        <Tooltip content="User menu" position="bottom">
          <IconButton
            icon={<UserIcon />}
            aria-label="User menu"
            variant="ghost"
            size="md"
          />
        </Tooltip>
      </div>
    </header>
  );
}

/**
 * Header for focused modes (solve, coach, debug).
 */
function FocusedModeHeader({
  mode,
  title,
  exitLabel,
  exitHref,
}: {
  mode: AppMode;
  title: string;
  exitLabel: string;
  exitHref: string;
}) {
  const modeLabels: Record<string, string> = {
    solve: 'Problem',
    coach: 'Coaching Mode',
    debug: 'Debug Mode',
  };

  return (
    <header className={`app-topbar app-topbar--${mode}`}>
      <div className="app-topbar__left">
        <Link href="/" className="app-topbar__logo">
          <LogoIcon />
          <span className="app-topbar__logo-text">Scaffold</span>
        </Link>
        {modeLabels[mode] && (
          <span className="app-topbar__mode-label">{modeLabels[mode]}</span>
        )}
      </div>
      <div className="app-topbar__right">
        <Link href={exitHref} className="btn btn-secondary btn-sm">
          {exitLabel}
        </Link>
      </div>
    </header>
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const mode = getAppMode(pathname);
  const showSidebar = shouldShowSidebar(pathname, mode);
  const pageTitle = getPageTitle(pathname);

  // Sidebar collapsed state - persist in localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Command palette
  const { isOpen: commandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } = useCommandPalette();

  // Load sidebar state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored !== null) {
      setSidebarCollapsed(stored === 'true');
    }
  }, []);

  // Save sidebar state to localStorage
  const toggleSidebar = () => {
    const newValue = !sidebarCollapsed;
    setSidebarCollapsed(newValue);
    localStorage.setItem('sidebar-collapsed', String(newValue));
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Skip AppShell for pages that have their own layout
  const hasOwnLayout = pathname.startsWith('/daily') || pathname.startsWith('/interview');

  if (hasOwnLayout) {
    return (
      <div className="layout">
        <main className="main">
          <div className="container">{children}</div>
        </main>
      </div>
    );
  }

  // Focused mode layout (solve, coach, debug)
  if (!showSidebar) {
    const exitConfig: Record<string, { label: string; href: string }> = {
      solve: { label: 'Exit to Dashboard', href: '/practice' },
      coach: { label: 'Exit to Coach', href: '/coach' },
      debug: { label: 'Exit to Debug', href: '/debug' },
    };

    const config = exitConfig[mode] || { label: 'Exit', href: '/' };

    return (
      <div className="app-layout app-layout--focused" data-mode={mode}>
        <FocusedModeHeader
          mode={mode}
          title={pageTitle}
          exitLabel={config.label}
          exitHref={config.href}
        />
        <main className="app-main app-main--focused">
          <div className="container">{children}</div>
        </main>
      </div>
    );
  }

  // Dashboard layout with sidebar
  return (
    <div
      className={`app-layout ${sidebarCollapsed ? 'app-layout--sidebar-collapsed' : ''}`}
      data-mode={mode}
    >
      {/* Skip link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="app-sidebar-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <aside className={`app-sidebar app-sidebar--mobile ${mobileMenuOpen ? 'app-sidebar--open' : ''}`}>
        <div className="app-sidebar__header">
          <Link href="/" className="app-sidebar__logo">
            <LogoIcon />
            <span className="app-sidebar__logo-text">Scaffold</span>
          </Link>
          <IconButton
            icon={<CloseIcon />}
            aria-label="Close menu"
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(false)}
          />
        </div>
        <nav className="app-sidebar__nav">
          {(['practice', 'learn', 'progress'] as const).map((section) => {
            const items = NAV_ITEMS.filter((item) => item.section === section);
            return (
              <div key={section} className="app-sidebar__section">
                <span className="app-sidebar__section-label">
                  {SECTION_LABELS[section]}
                </span>
                <ul className="app-sidebar__list">
                  {items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
                        >
                          <span className="app-sidebar__link-icon">{item.icon}</span>
                          <span className="app-sidebar__link-label">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Desktop sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        pathname={pathname}
      />

      <div className="app-content">
        <Topbar
          title={pageTitle}
          showMenuButton={true}
          onMenuClick={() => setMobileMenuOpen(true)}
          onSearchClick={openCommandPalette}
        />
        <main id="main-content" className="app-main">
          <div className="app-main__inner">{children}</div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette isOpen={commandPaletteOpen} onClose={closeCommandPalette} />
    </div>
  );
}

export { getAppMode };
export type { AppMode };
