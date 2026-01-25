'use client';

import { type HTMLAttributes, type ReactNode } from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Visual variant */
  variant?: BadgeVariant;
  /** Size of the badge */
  size?: BadgeSize;
  /** Icon to show before text */
  icon?: ReactNode;
  /** Make the badge rounded pill shape */
  pill?: boolean;
}

/**
 * Badge component for status indicators and labels.
 *
 * Variants:
 * - default: Neutral gray
 * - success: Green for positive states
 * - warning: Yellow for cautionary states
 * - error: Red for error/negative states
 * - info: Blue for informational states
 */
export function Badge({
  variant = 'default',
  size = 'md',
  icon,
  pill = false,
  className = '',
  children,
  ...props
}: BadgeProps) {
  const baseClass = 'ui-badge';
  const variantClass = `ui-badge--${variant}`;
  const sizeClass = size !== 'md' ? `ui-badge--${size}` : '';
  const pillClass = pill ? 'ui-badge--pill' : '';

  const classes = [baseClass, variantClass, sizeClass, pillClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...props}>
      {icon && <span className="ui-badge__icon">{icon}</span>}
      {children}
    </span>
  );
}

export default Badge;
