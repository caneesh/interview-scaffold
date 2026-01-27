'use client';

import type { AttemptMode } from './types';

interface BeginnerModeToggleProps {
  mode: AttemptMode;
  onModeChange: (mode: AttemptMode) => void;
  disabled?: boolean;
}

/**
 * BeginnerModeToggle - Switch between BEGINNER and EXPERT modes
 *
 * Beginner mode: More structured prompts, auto-discovery on low confidence
 * Expert mode: Can skip steps, less hand-holding
 */
export function BeginnerModeToggle({
  mode,
  onModeChange,
  disabled = false,
}: BeginnerModeToggleProps) {
  return (
    <div className="beginner-mode-toggle">
      <button
        type="button"
        className={`beginner-mode-toggle__option ${
          mode === 'BEGINNER' ? 'active' : ''
        }`}
        onClick={() => onModeChange('BEGINNER')}
        disabled={disabled}
        title="More guidance and structured prompts"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 2a8 8 0 00-8 8c0 3.2 1.9 6 4.6 7.3.2.1.4.3.5.5l.4 2.7h5l.4-2.7c.1-.2.3-.4.5-.5A8 8 0 0012 2z" />
          <path d="M10 22h4" />
        </svg>
        <span>Guide me</span>
      </button>

      <button
        type="button"
        className={`beginner-mode-toggle__option ${
          mode === 'EXPERT' ? 'active' : ''
        }`}
        onClick={() => onModeChange('EXPERT')}
        disabled={disabled}
        title="Skip steps, less hand-holding"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        <span>I know this</span>
      </button>
    </div>
  );
}

export default BeginnerModeToggle;
