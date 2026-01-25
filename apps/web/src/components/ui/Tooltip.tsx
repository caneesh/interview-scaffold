'use client';

import { useState, useRef, useEffect, useId, type ReactNode, type HTMLAttributes } from 'react';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  /** The content to show in the tooltip */
  content: ReactNode;
  /** The element that triggers the tooltip */
  children: ReactNode;
  /** Position of the tooltip relative to the trigger */
  position?: TooltipPosition;
  /** Delay before showing tooltip (ms) */
  delay?: number;
  /** Whether the tooltip is disabled */
  disabled?: boolean;
  /** Whether to make the wrapper focusable (default: true for non-interactive children) */
  focusable?: boolean;
}

/**
 * Simple hover tooltip component.
 *
 * Wraps a trigger element and shows a tooltip on hover.
 * Uses CSS for positioning and animations.
 */
export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  disabled = false,
  focusable = true,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  const showTooltip = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={triggerRef}
      className="ui-tooltip-wrapper"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      tabIndex={focusable ? 0 : undefined}
      aria-describedby={isVisible ? tooltipId : undefined}
    >
      {children}
      {isVisible && content && (
        <div
          id={tooltipId}
          className={`ui-tooltip ui-tooltip--${position}`}
          role="tooltip"
          aria-live="polite"
        >
          <div className="ui-tooltip__content">
            {content}
          </div>
          <div className="ui-tooltip__arrow" />
        </div>
      )}
    </div>
  );
}

export default Tooltip;
