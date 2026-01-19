'use client';

import type { ObservabilitySnapshot, REDMetrics, USEMetrics } from '@scaffold/core';

interface ObservabilityPanelProps {
  snapshot: ObservabilitySnapshot;
}

export function ObservabilityPanel({ snapshot }: ObservabilityPanelProps) {
  const hasRED = snapshot.red && snapshot.red.length > 0;
  const hasUSE = snapshot.use && snapshot.use.length > 0;
  const hasLogs = snapshot.logs && snapshot.logs.length > 0;

  if (!hasRED && !hasUSE && !hasLogs) {
    return null;
  }

  return (
    <div className="observability-panel">
      <div className="observability-header">
        <h3>Observability Data</h3>
        {snapshot.timestamp && (
          <span className="observability-timestamp">Snapshot: {snapshot.timestamp}</span>
        )}
      </div>

      <div className="observability-content">
        {hasRED && (
          <div className="observability-section">
            <h4>RED Metrics (Rate / Errors / Duration)</h4>
            <div className="metrics-grid">
              {snapshot.red!.map((metrics, idx) => (
                <REDMetricsCard key={idx} metrics={metrics} />
              ))}
            </div>
          </div>
        )}

        {hasUSE && (
          <div className="observability-section">
            <h4>USE Metrics (Utilization / Saturation / Errors)</h4>
            <div className="metrics-grid">
              {snapshot.use!.map((metrics, idx) => (
                <USEMetricsCard key={idx} metrics={metrics} />
              ))}
            </div>
          </div>
        )}

        {hasLogs && (
          <div className="observability-section">
            <h4>Application Logs</h4>
            <div className="logs-container">
              {snapshot.logs!.map((log, idx) => (
                <LogLine key={idx} line={log} />
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .observability-panel {
          background: var(--bg-secondary);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .observability-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .observability-header h3 {
          margin: 0;
          font-size: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .observability-header h3::before {
          content: '📊';
        }

        .observability-timestamp {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .observability-section {
          margin-bottom: 1rem;
        }

        .observability-section:last-child {
          margin-bottom: 0;
        }

        .observability-section h4 {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0 0 0.5rem 0;
          font-weight: 500;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.75rem;
        }

        .logs-container {
          background: var(--bg-primary);
          border-radius: 4px;
          padding: 0.75rem;
          font-family: monospace;
          font-size: 0.75rem;
          max-height: 200px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}

function REDMetricsCard({ metrics }: { metrics: REDMetrics }) {
  const errorColor = metrics.errorRate > 0.1 ? 'var(--error)' :
                     metrics.errorRate > 0.01 ? 'var(--warning)' : 'var(--success)';

  return (
    <div className="metrics-card">
      {metrics.label && <div className="metrics-label">{metrics.label}</div>}
      <div className="metrics-row">
        <span className="metrics-name">Rate</span>
        <span className="metrics-value">{metrics.rate.toFixed(1)} req/s</span>
      </div>
      <div className="metrics-row">
        <span className="metrics-name">Error Rate</span>
        <span className="metrics-value" style={{ color: errorColor }}>
          {(metrics.errorRate * 100).toFixed(2)}%
        </span>
      </div>
      <div className="metrics-row">
        <span className="metrics-name">p50 / p95 / p99</span>
        <span className="metrics-value">
          {metrics.duration.p50}ms / {metrics.duration.p95}ms / {metrics.duration.p99}ms
        </span>
      </div>

      <style jsx>{`
        .metrics-card {
          background: var(--bg-primary);
          border-radius: 4px;
          padding: 0.75rem;
        }

        .metrics-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .metrics-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          padding: 0.25rem 0;
        }

        .metrics-name {
          color: var(--text-secondary);
        }

        .metrics-value {
          font-family: monospace;
        }
      `}</style>
    </div>
  );
}

function USEMetricsCard({ metrics }: { metrics: USEMetrics }) {
  const utilColor = metrics.utilization > 0.9 ? 'var(--error)' :
                    metrics.utilization > 0.7 ? 'var(--warning)' : 'var(--success)';
  const satColor = metrics.saturation > 10 ? 'var(--error)' :
                   metrics.saturation > 5 ? 'var(--warning)' : 'var(--success)';

  return (
    <div className="metrics-card">
      <div className="metrics-header">
        <span className="metrics-resource">{metrics.resource}</span>
        {metrics.label && <span className="metrics-label">{metrics.label}</span>}
      </div>
      <div className="metrics-row">
        <span className="metrics-name">Utilization</span>
        <span className="metrics-value" style={{ color: utilColor }}>
          {(metrics.utilization * 100).toFixed(0)}%
        </span>
      </div>
      <div className="metrics-row">
        <span className="metrics-name">Saturation</span>
        <span className="metrics-value" style={{ color: satColor }}>
          {metrics.saturation}
        </span>
      </div>
      <div className="metrics-row">
        <span className="metrics-name">Errors</span>
        <span className="metrics-value" style={{ color: metrics.errors > 0 ? 'var(--error)' : 'var(--success)' }}>
          {metrics.errors}
        </span>
      </div>

      <style jsx>{`
        .metrics-card {
          background: var(--bg-primary);
          border-radius: 4px;
          padding: 0.75rem;
        }

        .metrics-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .metrics-resource {
          font-weight: 500;
          font-size: 0.875rem;
        }

        .metrics-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .metrics-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          padding: 0.25rem 0;
        }

        .metrics-name {
          color: var(--text-secondary);
        }

        .metrics-value {
          font-family: monospace;
        }
      `}</style>
    </div>
  );
}

function LogLine({ line }: { line: string }) {
  // Detect log level for coloring
  const isError = line.includes('[ERROR]') || line.includes('[FATAL]');
  const isWarn = line.includes('[WARN]');
  const isDebug = line.includes('[DEBUG]');

  const color = isError ? 'var(--error)' :
                isWarn ? 'var(--warning)' :
                isDebug ? 'var(--text-secondary)' : 'inherit';

  return (
    <div className="log-line" style={{ color }}>
      {line}

      <style jsx>{`
        .log-line {
          padding: 0.125rem 0;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .log-line:hover {
          background: var(--bg-secondary);
        }
      `}</style>
    </div>
  );
}
