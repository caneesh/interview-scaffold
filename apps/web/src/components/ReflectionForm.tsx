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
      <h3 style={{ marginBottom: '0.5rem', color: 'var(--warning)' }}>Reflection Required</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Your code didn't pass all tests. Let's reflect on what might have gone wrong.
      </p>

      <div style={{ marginBottom: '1.5rem' }}>
        <label className="label">{question}</label>
        <div className="reflection-options">
          {options.map((option) => (
            <button
              key={option.id}
              className={`reflection-option ${selectedId === option.id ? 'selected' : ''}`}
              onClick={() => setSelectedId(option.id)}
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>

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
