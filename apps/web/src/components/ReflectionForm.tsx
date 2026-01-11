'use client';

import { useState } from 'react';

interface ReflectionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface ReflectionFormProps {
  question: string;
  options: ReflectionOption[];
  onSubmit: (selectedId: string, isCorrect: boolean) => Promise<void>;
  loading?: boolean;
}

export function ReflectionForm({ question, options, onSubmit, loading }: ReflectionFormProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedId) return;
    const selectedOption = options.find(o => o.id === selectedId);
    await onSubmit(selectedId, selectedOption?.isCorrect ?? false);
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
        Let's Reflect
      </h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Some tests need attention. Taking a moment to reflect helps build stronger problem-solving skills.
      </p>

      <fieldset style={{ marginBottom: '1.5rem', border: 'none', padding: 0 }}>
        <legend className="label">{question}</legend>
        <div className="reflection-options" role="radiogroup" aria-label={question}>
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selectedId === option.id}
              className={`reflection-option ${selectedId === option.id ? 'selected' : ''}`}
              onClick={() => setSelectedId(option.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedId(option.id);
                }
              }}
            >
              {option.text}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        className="btn btn-primary"
        style={{ width: '100%', padding: '0.75rem' }}
        onClick={handleSubmit}
        disabled={!selectedId || loading}
      >
        {loading ? 'Submitting...' : 'Continue'}
      </button>
    </div>
  );
}
