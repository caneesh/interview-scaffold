'use client';

import { useState, useEffect, useCallback } from 'react';

interface TraceFrame {
  iter: number;
  vars: Record<string, unknown>;
  label?: string;
}

interface TraceOutput {
  success: boolean;
  frames: TraceFrame[];
  error?: string;
  array?: unknown[];
  arrayName?: string;
  pointerVars?: string[];
}

interface TraceVisualizationProps {
  /** Trace data from execution */
  trace: TraceOutput | null;
  /** Whether trace is loading */
  loading?: boolean;
  /** Hint for manual trace insertion */
  insertionHint?: string;
  /** Callback when user wants to add trace calls */
  onRequestTraceInsertion?: () => void;
}

export function TraceVisualization({
  trace,
  loading,
  insertionHint,
  onRequestTraceInsertion,
}: TraceVisualizationProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(500); // ms per frame

  // Reset frame when trace changes
  useEffect(() => {
    setCurrentFrame(0);
    setIsPlaying(false);
  }, [trace]);

  // Auto-play animation
  useEffect(() => {
    if (!isPlaying || !trace?.frames.length) return;

    const timer = setInterval(() => {
      setCurrentFrame((prev) => {
        if (prev >= trace.frames.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, playSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, trace?.frames.length, playSpeed]);

  const handlePrevFrame = useCallback(() => {
    setIsPlaying(false);
    setCurrentFrame((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextFrame = useCallback(() => {
    setIsPlaying(false);
    setCurrentFrame((prev) =>
      Math.min((trace?.frames.length ?? 1) - 1, prev + 1)
    );
  }, [trace?.frames.length]);

  const handlePlayPause = useCallback(() => {
    if (!trace?.frames.length) return;
    if (currentFrame >= trace.frames.length - 1) {
      setCurrentFrame(0);
    }
    setIsPlaying((prev) => !prev);
  }, [currentFrame, trace?.frames.length]);

  // Loading state
  if (loading) {
    return (
      <div className="trace-panel trace-panel--loading">
        <div className="trace-header">
          <span className="trace-title">Trace Visualization</span>
        </div>
        <div className="trace-loading">
          <div className="spinner" />
          <p>Running trace execution...</p>
        </div>
      </div>
    );
  }

  // No trace available
  if (!trace) {
    return (
      <div className="trace-panel trace-panel--empty">
        <div className="trace-header">
          <span className="trace-title">Trace Visualization</span>
        </div>
        <div className="trace-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p>Enable Trace Mode and run your code to see the visualization</p>
        </div>
      </div>
    );
  }

  // Trace failed
  if (!trace.success) {
    return (
      <div className="trace-panel trace-panel--error">
        <div className="trace-header">
          <span className="trace-title">Trace Visualization</span>
        </div>
        <div className="trace-error">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p>{trace.error || 'Could not capture trace'}</p>
          {insertionHint && (
            <div className="trace-hint">
              <pre>{insertionHint}</pre>
              {onRequestTraceInsertion && (
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={onRequestTraceInsertion}
                >
                  Add trace() calls
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const frame = trace.frames[currentFrame];
  const array = trace.array ?? [];
  const pointerVars = trace.pointerVars ?? [];

  // Get pointer values for current frame
  const pointers: Record<string, number> = {};
  if (frame) {
    for (const pv of pointerVars) {
      const val = frame.vars[pv];
      if (typeof val === 'number') {
        pointers[pv] = val;
      }
    }
  }

  return (
    <div className="trace-panel">
      <div className="trace-header">
        <span className="trace-title">Trace Visualization</span>
        <span className="trace-frame-counter">
          Frame {currentFrame + 1} / {trace.frames.length}
        </span>
      </div>

      {/* Array visualization */}
      {array.length > 0 && (
        <div className="trace-array-container">
          <div className="trace-array-label">{trace.arrayName || 'array'}</div>
          <div className="trace-array">
            {array.map((val, idx) => {
              // Determine which pointers point to this index
              const pointingVars = Object.entries(pointers)
                .filter(([, ptrIdx]) => ptrIdx === idx)
                .map(([name]) => name);

              return (
                <div
                  key={idx}
                  className={`trace-array-cell ${
                    pointingVars.length > 0 ? 'trace-array-cell--highlighted' : ''
                  }`}
                >
                  <div className="trace-array-index">{idx}</div>
                  <div className="trace-array-value">
                    {formatValue(val)}
                  </div>
                  {pointingVars.length > 0 && (
                    <div className="trace-array-pointers">
                      {pointingVars.map((pv) => (
                        <span key={pv} className="trace-pointer-label">{pv}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Variables panel */}
      {frame && (
        <div className="trace-vars">
          <div className="trace-vars-label">Variables</div>
          <div className="trace-vars-grid">
            {Object.entries(frame.vars).map(([key, val]) => (
              <div key={key} className="trace-var">
                <span className="trace-var-name">{key}</span>
                <span className="trace-var-value">{formatValue(val)}</span>
              </div>
            ))}
          </div>
          {frame.label && (
            <div className="trace-frame-label">{frame.label}</div>
          )}
        </div>
      )}

      {/* Playback controls */}
      <div className="trace-controls">
        <button
          className="btn btn-sm btn-ghost"
          onClick={handlePrevFrame}
          disabled={currentFrame === 0}
          title="Previous frame"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="19 20 9 12 19 4 19 20" />
            <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>

        <button
          className="btn btn-sm btn-ghost"
          onClick={handlePlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        <button
          className="btn btn-sm btn-ghost"
          onClick={handleNextFrame}
          disabled={currentFrame >= trace.frames.length - 1}
          title="Next frame"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>

        <div className="trace-speed">
          <label htmlFor="trace-speed">Speed:</label>
          <select
            id="trace-speed"
            value={playSpeed}
            onChange={(e) => setPlaySpeed(Number(e.target.value))}
            className="trace-speed-select"
          >
            <option value={1000}>Slow</option>
            <option value={500}>Normal</option>
            <option value={200}>Fast</option>
            <option value={100}>Very Fast</option>
          </select>
        </div>

        {/* Frame slider */}
        <input
          type="range"
          min={0}
          max={trace.frames.length - 1}
          value={currentFrame}
          onChange={(e) => {
            setIsPlaying(false);
            setCurrentFrame(Number(e.target.value));
          }}
          className="trace-slider"
        />
      </div>
    </div>
  );
}

/**
 * Format a value for display
 */
function formatValue(val: unknown): string {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val === 'string') return val.length > 20 ? `"${val.slice(0, 20)}..."` : `"${val}"`;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    if (val.length <= 5) return `[${val.map(formatValue).join(', ')}]`;
    return `[${val.slice(0, 5).map(formatValue).join(', ')}, ...]`;
  }
  if (typeof val === 'object') {
    const entries = Object.entries(val);
    if (entries.length === 0) return '{}';
    if (entries.length <= 3) {
      return `{${entries.map(([k, v]) => `${k}: ${formatValue(v)}`).join(', ')}}`;
    }
    return `{${entries.slice(0, 3).map(([k, v]) => `${k}: ${formatValue(v)}`).join(', ')}, ...}`;
  }
  return String(val);
}
