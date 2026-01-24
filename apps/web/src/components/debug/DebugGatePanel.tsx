'use client';

import { useState } from 'react';
import type { DebugGate } from './types';
import { getGateDisplayName } from './types';

interface DebugGatePanelProps {
  gate: DebugGate;
  prompt: string;
  inputType: 'mcq' | 'text';
  options?: readonly string[];
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

/**
 * Panel for answering a debug gate question.
 * Supports both MCQ (for classification gates) and text input (for hypothesis/reflection).
 */
export function DebugGatePanel({
  gate,
  prompt,
  inputType,
  options = [],
  onSubmit,
  disabled = false,
}: DebugGatePanelProps) {
  const [answer, setAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleSubmit = () => {
    if (inputType === 'mcq' && selectedOption) {
      onSubmit(selectedOption);
    } else if (inputType === 'text' && answer.trim()) {
      onSubmit(answer.trim());
    }
  };

  const isSubmitDisabled =
    disabled ||
    (inputType === 'mcq' && !selectedOption) ||
    (inputType === 'text' && !answer.trim());

  return (
    <div className="debug-gate-panel">
      <div className="debug-gate-header">
        <h3 className="debug-gate-title">{getGateDisplayName(gate)}</h3>
      </div>

      <div className="debug-gate-prompt">
        <p>{prompt}</p>
      </div>

      <div className="debug-gate-input">
        {inputType === 'mcq' ? (
          <div className="debug-gate-options">
            {options.map((option, index) => (
              <label
                key={index}
                className={`debug-gate-option ${selectedOption === option ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="gate-answer"
                  value={option}
                  checked={selectedOption === option}
                  onChange={() => setSelectedOption(option)}
                  disabled={disabled}
                />
                <span className="debug-gate-option-text">{option}</span>
              </label>
            ))}
          </div>
        ) : (
          <textarea
            className="textarea debug-gate-textarea"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={getPlaceholderForGate(gate)}
            disabled={disabled}
            rows={5}
          />
        )}
      </div>

      <div className="debug-gate-actions">
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
        >
          {disabled ? (
            <>
              <span className="spinner" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
              Submitting...
            </>
          ) : (
            'Submit Answer'
          )}
        </button>
      </div>
    </div>
  );
}

function getPlaceholderForGate(gate: DebugGate): string {
  const placeholders: Record<DebugGate, string> = {
    SYMPTOM_CLASSIFICATION: 'Describe the type of symptom you observe...',
    DETERMINISM_ANALYSIS: 'Is this bug deterministic? What factors affect reproducibility?',
    PATTERN_CLASSIFICATION: 'What category of bug does this appear to be?',
    ROOT_CAUSE_HYPOTHESIS: 'Based on your analysis, what do you think is the root cause?',
    FIX_STRATEGY: 'Describe how you would fix this bug...',
    REGRESSION_PREVENTION: 'How would you prevent this bug from recurring?',
    REFLECTION: 'What did you learn from debugging this issue?',
  };
  return placeholders[gate];
}
