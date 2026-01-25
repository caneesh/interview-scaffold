'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui';

// ============ Types ============

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  category: 'action' | 'problem' | 'pattern' | 'page';
  href?: string;
  action?: () => void;
  badge?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============ Icons ============

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 18L22 12L16 6M8 6L2 12L8 18" />
    </svg>
  );
}

function BugIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 2L8.5 5M16 2L15.5 5M3 10H6M18 10H21M3 14H6M18 14H21M8 22L8.5 19M16 22L15.5 19" />
      <ellipse cx="12" cy="12" rx="6" ry="7" />
      <path d="M12 5V19M7 12H17" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88L16.24 7.76Z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10M12 20V4M6 20V14" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

// ============ Mock Data ============

const QUICK_ACTIONS: CommandItem[] = [
  {
    id: 'new-practice',
    title: 'Start New Practice',
    description: 'Begin a new problem-solving session',
    icon: <PlayIcon />,
    category: 'action',
    href: '/practice',
  },
  {
    id: 'debug-lab',
    title: 'Enter Debug Lab',
    description: 'Practice debugging scenarios',
    icon: <BugIcon />,
    category: 'action',
    href: '/debug',
  },
  {
    id: 'coach-session',
    title: 'Start Coach Session',
    description: 'Get AI-powered guidance',
    icon: <ChatIcon />,
    category: 'action',
    href: '/coach',
  },
];

const PROBLEMS: CommandItem[] = [
  {
    id: 'max-sum-subarray',
    title: 'Max Sum Subarray',
    description: 'Sliding Window',
    icon: <FileIcon />,
    category: 'problem',
    href: '/practice?problem=max-sum-subarray',
    badge: 'Easy',
    badgeVariant: 'success',
  },
  {
    id: 'two-sum',
    title: 'Two Sum',
    description: 'Two Pointers / Hash Map',
    icon: <FileIcon />,
    category: 'problem',
    href: '/practice?problem=two-sum',
    badge: 'Easy',
    badgeVariant: 'success',
  },
  {
    id: 'binary-search',
    title: 'Binary Search',
    description: 'Binary Search',
    icon: <FileIcon />,
    category: 'problem',
    href: '/practice?problem=binary-search',
    badge: 'Easy',
    badgeVariant: 'success',
  },
  {
    id: 'minimum-window-substring',
    title: 'Minimum Window Substring',
    description: 'Sliding Window',
    icon: <FileIcon />,
    category: 'problem',
    href: '/practice?problem=minimum-window-substring',
    badge: 'Hard',
    badgeVariant: 'error',
  },
];

const PATTERNS: CommandItem[] = [
  {
    id: 'sliding-window',
    title: 'Sliding Window',
    description: 'Maintain a window that slides through array',
    icon: <LayersIcon />,
    category: 'pattern',
    href: '/explorer?pattern=sliding-window',
  },
  {
    id: 'two-pointers',
    title: 'Two Pointers',
    description: 'Use two pointers to traverse data',
    icon: <LayersIcon />,
    category: 'pattern',
    href: '/explorer?pattern=two-pointers',
  },
  {
    id: 'binary-search',
    title: 'Binary Search',
    description: 'Divide and conquer on sorted data',
    icon: <LayersIcon />,
    category: 'pattern',
    href: '/explorer?pattern=binary-search',
  },
  {
    id: 'dfs-bfs',
    title: 'DFS / BFS',
    description: 'Graph and tree traversal',
    icon: <LayersIcon />,
    category: 'pattern',
    href: '/explorer?pattern=dfs-bfs',
  },
];

const PAGES: CommandItem[] = [
  {
    id: 'home',
    title: 'Home',
    description: 'Go to dashboard',
    icon: <HomeIcon />,
    category: 'page',
    href: '/',
  },
  {
    id: 'practice',
    title: 'Practice',
    description: 'Problem bank',
    icon: <CodeIcon />,
    category: 'page',
    href: '/practice',
  },
  {
    id: 'explorer',
    title: 'Pattern Explorer',
    description: 'Browse patterns',
    icon: <CompassIcon />,
    category: 'page',
    href: '/explorer',
  },
  {
    id: 'skills',
    title: 'Skills',
    description: 'View progress',
    icon: <ChartIcon />,
    category: 'page',
    href: '/skills',
  },
];

// ============ Command Palette Component ============

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Combine all items
  const allItems = [...QUICK_ACTIONS, ...PROBLEMS, ...PATTERNS, ...PAGES];

  // Filter items based on query
  const filteredItems = query.trim() === ''
    ? allItems
    : allItems.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase())
      );

  // Group filtered items by category
  const groupedItems = {
    action: filteredItems.filter(item => item.category === 'action'),
    problem: filteredItems.filter(item => item.category === 'problem'),
    pattern: filteredItems.filter(item => item.category === 'pattern'),
    page: filteredItems.filter(item => item.category === 'page'),
  };

  const flatFilteredItems = [
    ...groupedItems.action,
    ...groupedItems.problem,
    ...groupedItems.pattern,
    ...groupedItems.page,
  ];

  // Handle item selection
  const handleSelect = useCallback((item: CommandItem) => {
    if (item.action) {
      item.action();
    } else if (item.href) {
      router.push(item.href);
    }
    onClose();
    setQuery('');
    setSelectedIndex(0);
  }, [router, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < flatFilteredItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : flatFilteredItems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (flatFilteredItems[selectedIndex]) {
          handleSelect(flatFilteredItems[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        setQuery('');
        setSelectedIndex(0);
        break;
    }
  }, [isOpen, flatFilteredItems, selectedIndex, handleSelect, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector('[data-selected="true"]');
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const categoryLabels: Record<string, string> = {
    action: 'Quick Actions',
    problem: 'Problems',
    pattern: 'Patterns',
    page: 'Pages',
  };

  let currentItemIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="command-palette-overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette */}
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search Header */}
        <div className="command-palette__header">
          <span className="command-palette__search-icon">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            type="text"
            className="command-palette__input"
            placeholder="Search problems, patterns, actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search commands"
          />
          <div className="command-palette__shortcut">
            <kbd>Esc</kbd>
          </div>
        </div>

        {/* Results */}
        <div className="command-palette__content" ref={listRef}>
          {flatFilteredItems.length === 0 ? (
            <div className="command-palette__empty">
              <p>No results found for "{query}"</p>
              <p>Try searching for problems, patterns, or actions</p>
            </div>
          ) : (
            (['action', 'problem', 'pattern', 'page'] as const).map(category => {
              const items = groupedItems[category];
              if (items.length === 0) return null;

              return (
                <div key={category} className="command-palette__section">
                  <div className="command-palette__section-title">
                    {categoryLabels[category]}
                  </div>
                  {items.map(item => {
                    const itemIndex = currentItemIndex++;
                    const isSelected = itemIndex === selectedIndex;

                    return (
                      <div
                        key={item.id}
                        className={`command-palette__item ${isSelected ? 'command-palette__item--selected' : ''}`}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        data-selected={isSelected}
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={-1}
                      >
                        <div className="command-palette__item-icon">
                          {item.icon}
                        </div>
                        <div className="command-palette__item-content">
                          <div className="command-palette__item-title">
                            {item.title}
                          </div>
                          {item.description && (
                            <div className="command-palette__item-description">
                              {item.description}
                            </div>
                          )}
                        </div>
                        {item.badge && (
                          <div className="command-palette__item-badge">
                            <Badge
                              variant={item.badgeVariant || 'default'}
                              size="sm"
                            >
                              {item.badge}
                            </Badge>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer with hints */}
        <div className="command-palette__footer">
          <div className="command-palette__hints">
            <span className="command-palette__hint">
              <kbd>Up</kbd><kbd>Down</kbd> to navigate
            </span>
            <span className="command-palette__hint">
              <kbd>Enter</kbd> to select
            </span>
            <span className="command-palette__hint">
              <kbd>Esc</kbd> to close
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

// ============ Hook for Command Palette ============

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return { isOpen, open, close, toggle };
}

export default CommandPalette;
