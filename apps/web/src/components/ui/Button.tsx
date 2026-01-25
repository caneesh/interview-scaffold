'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

/**
 * Button component with multiple variants and sizes.
 *
 * Variants:
 * - primary: Blue accent background, for primary actions
 * - secondary: Gray background with border, for secondary actions
 * - ghost: Transparent background, for tertiary actions
 * - danger: Red background, for destructive actions
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseClass = 'ui-btn';
    const variantClass = `ui-btn--${variant}`;
    const sizeClass = `ui-btn--${size}`;
    const widthClass = fullWidth ? 'ui-btn--full' : '';
    const loadingClass = loading ? 'ui-btn--loading' : '';

    const classes = [baseClass, variantClass, sizeClass, widthClass, loadingClass, className]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <span className="ui-btn__spinner" aria-hidden="true">
            <svg
              className="ui-btn__spinner-icon"
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
          </span>
        )}
        {!loading && leftIcon && <span className="ui-btn__icon ui-btn__icon--left">{leftIcon}</span>}
        <span className="ui-btn__text">{children}</span>
        {!loading && rightIcon && <span className="ui-btn__icon ui-btn__icon--right">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
