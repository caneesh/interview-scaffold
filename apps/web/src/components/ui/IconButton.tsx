'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type IconButtonVariant = 'default' | 'ghost' | 'outline';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The icon to display */
  icon: ReactNode;
  /** Visual variant */
  variant?: IconButtonVariant;
  /** Size of the button */
  size?: IconButtonSize;
  /** Accessible label (required for accessibility) */
  'aria-label': string;
  /** Show loading state */
  loading?: boolean;
}

/**
 * Icon-only button component.
 *
 * Requires aria-label for accessibility.
 *
 * Variants:
 * - default: Subtle background on hover
 * - ghost: No background, just icon color change
 * - outline: Border with transparent background
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      variant = 'default',
      size = 'md',
      loading = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseClass = 'ui-icon-btn';
    const variantClass = `ui-icon-btn--${variant}`;
    const sizeClass = `ui-icon-btn--${size}`;
    const loadingClass = loading ? 'ui-icon-btn--loading' : '';

    const classes = [baseClass, variantClass, sizeClass, loadingClass, className]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg
            className="ui-icon-btn__spinner"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="31.4 31.4"
            />
          </svg>
        ) : (
          icon
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default IconButton;
