'use client';

import { useState, useCallback } from 'react';
import type { DebugLabFile } from '@scaffold/core';

interface MultiFileEditorProps {
  files: DebugLabFile[];
  modifiedFiles: Record<string, string>;
  onFileChange: (path: string, content: string) => void;
  disabled?: boolean;
  language?: string;
}

export function MultiFileEditor({
  files,
  modifiedFiles,
  onFileChange,
  disabled = false,
  language = 'javascript',
}: MultiFileEditorProps) {
  const [activeFile, setActiveFile] = useState(files[0]?.path || '');

  const currentFile = files.find(f => f.path === activeFile);
  const currentContent = modifiedFiles[activeFile] ?? currentFile?.content ?? '';

  const handleContentChange = useCallback((content: string) => {
    if (currentFile && currentFile.editable && !disabled) {
      onFileChange(activeFile, content);
    }
  }, [activeFile, currentFile, disabled, onFileChange]);

  const isModified = (path: string) => {
    const original = files.find(f => f.path === path)?.content;
    const modified = modifiedFiles[path];
    return modified !== undefined && modified !== original;
  };

  return (
    <div className="multi-file-editor">
      {/* File Tabs */}
      <div className="file-tabs">
        {files.map(file => (
          <button
            key={file.path}
            className={`file-tab ${activeFile === file.path ? 'active' : ''} ${!file.editable ? 'readonly' : ''}`}
            onClick={() => setActiveFile(file.path)}
          >
            <span className="file-icon">{getFileIcon(file.path)}</span>
            <span className="file-name">{getFileName(file.path)}</span>
            {isModified(file.path) && <span className="file-modified">•</span>}
            {!file.editable && <span className="file-lock">🔒</span>}
          </button>
        ))}
      </div>

      {/* File Path */}
      <div className="file-path-bar">
        <span className="file-full-path">{activeFile}</span>
        {currentFile && !currentFile.editable && (
          <span className="file-readonly-badge">Read Only</span>
        )}
      </div>

      {/* Editor */}
      <div className="editor-container">
        {currentFile ? (
          <textarea
            className="code-editor"
            value={currentContent}
            onChange={e => handleContentChange(e.target.value)}
            disabled={disabled || !currentFile.editable}
            spellCheck={false}
            wrap="off"
          />
        ) : (
          <div className="editor-empty">
            Select a file to view
          </div>
        )}

        {/* Line Numbers Overlay */}
        <div className="line-numbers">
          {currentContent.split('\n').map((_, idx) => (
            <span key={idx} className="line-number">{idx + 1}</span>
          ))}
        </div>
      </div>

      <style jsx>{`
        .multi-file-editor {
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          background: var(--bg-primary);
        }

        .file-tabs {
          display: flex;
          overflow-x: auto;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
        }

        .file-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          white-space: nowrap;
          border-bottom: 2px solid transparent;
          font-size: 0.875rem;
        }

        .file-tab:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .file-tab.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
          background: var(--bg-primary);
        }

        .file-tab.readonly {
          opacity: 0.7;
        }

        .file-icon {
          font-size: 1rem;
        }

        .file-name {
          font-family: var(--font-mono);
        }

        .file-modified {
          color: var(--warning);
          font-size: 1.25rem;
          line-height: 1;
        }

        .file-lock {
          font-size: 0.75rem;
        }

        .file-path-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 1rem;
          background: var(--bg-tertiary);
          border-bottom: 1px solid var(--border);
          font-size: 0.75rem;
        }

        .file-full-path {
          font-family: var(--font-mono);
          color: var(--text-secondary);
        }

        .file-readonly-badge {
          background: var(--bg-secondary);
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          color: var(--text-secondary);
        }

        .editor-container {
          position: relative;
          min-height: 400px;
          max-height: 600px;
        }

        .code-editor {
          width: 100%;
          height: 100%;
          min-height: 400px;
          max-height: 600px;
          padding: 1rem 1rem 1rem 4rem;
          border: none;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: var(--font-mono);
          font-size: 0.875rem;
          line-height: 1.5;
          resize: vertical;
          outline: none;
          overflow: auto;
          tab-size: 2;
        }

        .code-editor:disabled {
          background: var(--bg-secondary);
          color: var(--text-secondary);
          cursor: not-allowed;
        }

        .line-numbers {
          position: absolute;
          top: 0;
          left: 0;
          width: 3rem;
          padding: 1rem 0.5rem;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border);
          text-align: right;
          font-family: var(--font-mono);
          font-size: 0.875rem;
          line-height: 1.5;
          color: var(--text-secondary);
          user-select: none;
          overflow: hidden;
          height: 100%;
        }

        .line-number {
          display: block;
        }

        .editor-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 400px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}

function getFileIcon(path: string): string {
  if (path.endsWith('.test.js') || path.endsWith('.test.ts')) return '🧪';
  if (path.endsWith('.js')) return '📜';
  if (path.endsWith('.ts')) return '📘';
  if (path.endsWith('.json')) return '📋';
  if (path.endsWith('.md')) return '📝';
  return '📄';
}

function getFileName(path: string): string {
  return path.split('/').pop() || path;
}
