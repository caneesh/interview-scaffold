'use client';

import { useState } from 'react';
import type { CodeArtifact } from './types';

interface CodeArtifactViewerProps {
  artifacts: readonly CodeArtifact[];
}

/**
 * Displays code artifacts with syntax highlighting and file tabs.
 * Uses a simple <pre> block for syntax display.
 */
export function CodeArtifactViewer({ artifacts }: CodeArtifactViewerProps) {
  const [activeTab, setActiveTab] = useState(0);

  if (artifacts.length === 0) {
    return (
      <div className="code-artifact-empty">
        <p>No code artifacts available</p>
      </div>
    );
  }

  const activeArtifact = artifacts[activeTab]!;

  return (
    <div className="code-artifact-viewer">
      {/* File tabs */}
      {artifacts.length > 1 && (
        <div className="code-artifact-tabs">
          {artifacts.map((artifact, index) => (
            <button
              key={artifact.filename}
              className={`code-artifact-tab ${index === activeTab ? 'active' : ''}`}
              onClick={() => setActiveTab(index)}
            >
              <span className="code-artifact-tab-icon">
                {getLanguageIcon(artifact.language)}
              </span>
              {artifact.filename}
            </button>
          ))}
        </div>
      )}

      {/* Single file header when only one file */}
      {artifacts.length === 1 && (
        <div className="code-artifact-header">
          <span className="code-artifact-filename">
            <span className="code-artifact-tab-icon">
              {getLanguageIcon(activeArtifact.language)}
            </span>
            {activeArtifact.filename}
          </span>
          <span className="code-artifact-language">{activeArtifact.language}</span>
        </div>
      )}

      {/* Code content */}
      <div className="code-artifact-content">
        <pre className={`code-artifact-pre language-${activeArtifact.language}`}>
          <code>{addLineNumbers(activeArtifact.code)}</code>
        </pre>
      </div>

      {/* Description if present */}
      {activeArtifact.description && (
        <div className="code-artifact-description">
          {activeArtifact.description}
        </div>
      )}
    </div>
  );
}

function addLineNumbers(code: string): string {
  const lines = code.split('\n');
  const padWidth = String(lines.length).length;
  return lines
    .map((line, i) => {
      const lineNum = String(i + 1).padStart(padWidth, ' ');
      return `${lineNum} | ${line}`;
    })
    .join('\n');
}

function getLanguageIcon(language: string): string {
  const icons: Record<string, string> = {
    javascript: 'JS',
    typescript: 'TS',
    python: 'PY',
    java: 'JV',
    go: 'GO',
    rust: 'RS',
    cpp: 'C+',
    c: 'C',
    sql: 'SQL',
  };
  return icons[language.toLowerCase()] || language.slice(0, 2).toUpperCase();
}
