'use client';

import { type HTMLAttributes, type ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional padding override */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Add hover effect */
  hoverable?: boolean;
  /** Make card clickable looking */
  clickable?: boolean;
}

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Title text */
  title?: ReactNode;
  /** Subtitle or description */
  subtitle?: ReactNode;
  /** Action buttons or elements on the right */
  actions?: ReactNode;
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional padding override */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Alignment of footer content */
  align?: 'left' | 'center' | 'right' | 'between';
}

/**
 * Card component with optional header, body, and footer sections.
 *
 * Usage:
 * <Card>
 *   <Card.Header title="Title" subtitle="Description" />
 *   <Card.Body>Content goes here</Card.Body>
 *   <Card.Footer>Actions</Card.Footer>
 * </Card>
 */
export function Card({
  padding = 'md',
  hoverable = false,
  clickable = false,
  className = '',
  children,
  ...props
}: CardProps) {
  const baseClass = 'ui-card';
  const paddingClass = padding !== 'md' ? `ui-card--padding-${padding}` : '';
  const hoverableClass = hoverable ? 'ui-card--hoverable' : '';
  const clickableClass = clickable ? 'ui-card--clickable' : '';

  const classes = [baseClass, paddingClass, hoverableClass, clickableClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

function CardHeader({
  title,
  subtitle,
  actions,
  className = '',
  children,
  ...props
}: CardHeaderProps) {
  const classes = ['ui-card__header', className].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {(title || subtitle) && (
        <div className="ui-card__header-content">
          {title && <h3 className="ui-card__title">{title}</h3>}
          {subtitle && <p className="ui-card__subtitle">{subtitle}</p>}
        </div>
      )}
      {children}
      {actions && <div className="ui-card__header-actions">{actions}</div>}
    </div>
  );
}

function CardBody({ padding, className = '', children, ...props }: CardBodyProps) {
  const baseClass = 'ui-card__body';
  const paddingClass = padding ? `ui-card__body--padding-${padding}` : '';

  const classes = [baseClass, paddingClass, className].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

function CardFooter({ align = 'right', className = '', children, ...props }: CardFooterProps) {
  const baseClass = 'ui-card__footer';
  const alignClass = align !== 'right' ? `ui-card__footer--${align}` : '';

  const classes = [baseClass, alignClass, className].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

// Attach sub-components
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
