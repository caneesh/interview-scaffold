'use client';

import { useState, useMemo } from 'react';

interface InvariantSlot {
  id: string;
  choices: readonly string[];
  correctIndex: number;
}

interface InvariantTemplate {
  id: string;
  pattern: string;
  rung: number;
  prompt: string;
  slots: readonly InvariantSlot[];
  explanation: string;
  problemContext?: string;
}

interface InvariantBuilderProps {
  /** Available templates for the selected pattern */
  templates: InvariantTemplate[];
  /** Callback when user completes the builder */
  onComplete: (result: {
    templateId: string;
    choices: Record<string, number>;
    renderedText: string;
    allCorrect: boolean;
  }) => void;
  /** Optional: pre-selected template ID */
  selectedTemplateId?: string;
  /** Whether to show validation feedback */
  showValidation?: boolean;
}

/**
 * InvariantBuilder - Fill-in-the-blanks component for building invariants
 *
 * Displays a template sentence with selectable slots (blanks).
 * Users choose from tile options for each slot.
 */
export function InvariantBuilder({
  templates,
  onComplete,
  selectedTemplateId,
  showValidation = false,
}: InvariantBuilderProps) {
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    selectedTemplateId ?? templates[0]?.id ?? ''
  );
  const [choices, setChoices] = useState<Record<string, number>>({});

  const activeTemplate = useMemo(
    () => templates.find(t => t.id === activeTemplateId) ?? templates[0],
    [templates, activeTemplateId]
  );

  // Parse the template prompt into segments and slots
  const parsedPrompt = useMemo(() => {
    if (!activeTemplate) return [];

    const segments: Array<{ type: 'text' | 'slot'; content: string }> = [];
    let remaining = activeTemplate.prompt;

    // Match {{slotId}} patterns
    const slotPattern = /\{\{(\w+)\}\}/g;
    let lastIndex = 0;
    let match;

    while ((match = slotPattern.exec(activeTemplate.prompt)) !== null) {
      // Add text before the slot
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: activeTemplate.prompt.slice(lastIndex, match.index),
        });
      }

      // Add the slot
      segments.push({
        type: 'slot',
        content: match[1] ?? '',
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last slot
    if (lastIndex < activeTemplate.prompt.length) {
      segments.push({
        type: 'text',
        content: activeTemplate.prompt.slice(lastIndex),
      });
    }

    return segments;
  }, [activeTemplate]);

  // Render the final invariant text
  const renderedText = useMemo(() => {
    if (!activeTemplate) return '';

    let result = activeTemplate.prompt;
    for (const slot of activeTemplate.slots) {
      const choiceIndex = choices[slot.id] ?? -1;
      const chosenText = choiceIndex >= 0
        ? slot.choices[choiceIndex] ?? '___'
        : '___';
      result = result.replace(`{{${slot.id}}}`, chosenText);
    }
    return result;
  }, [activeTemplate, choices]);

  // Check if all slots are filled
  const allSlotsFilled = useMemo(() => {
    if (!activeTemplate) return false;
    return activeTemplate.slots.every(slot => choices[slot.id] !== undefined);
  }, [activeTemplate, choices]);

  // Validate choices
  const validation = useMemo(() => {
    if (!activeTemplate || !showValidation) return null;

    const results: Record<string, boolean> = {};
    let allCorrect = true;

    for (const slot of activeTemplate.slots) {
      const chosen = choices[slot.id];
      const isCorrect = chosen === slot.correctIndex;
      results[slot.id] = isCorrect;
      if (!isCorrect) allCorrect = false;
    }

    return { results, allCorrect };
  }, [activeTemplate, choices, showValidation]);

  const handleSlotChoice = (slotId: string, choiceIndex: number) => {
    setChoices(prev => ({ ...prev, [slotId]: choiceIndex }));
  };

  const handleComplete = () => {
    if (!activeTemplate || !allSlotsFilled) return;

    // Calculate if all correct
    let allCorrect = true;
    for (const slot of activeTemplate.slots) {
      if (choices[slot.id] !== slot.correctIndex) {
        allCorrect = false;
        break;
      }
    }

    onComplete({
      templateId: activeTemplate.id,
      choices,
      renderedText,
      allCorrect,
    });
  };

  const handleTemplateChange = (templateId: string) => {
    setActiveTemplateId(templateId);
    setChoices({}); // Reset choices when changing template
  };

  if (!activeTemplate) {
    return (
      <div className="invariant-builder invariant-builder--empty">
        <p>No templates available for this pattern.</p>
      </div>
    );
  }

  return (
    <div className="invariant-builder">
      {/* Template selector (if multiple templates) */}
      {templates.length > 1 && (
        <div className="invariant-builder-selector">
          <label className="invariant-builder-label">Choose a template:</label>
          <div className="invariant-builder-templates">
            {templates.map(template => (
              <button
                key={template.id}
                type="button"
                className={`invariant-template-btn ${activeTemplateId === template.id ? 'active' : ''}`}
                onClick={() => handleTemplateChange(template.id)}
              >
                Template {templates.indexOf(template) + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fill-in-the-blanks prompt */}
      <div className="invariant-builder-prompt">
        {parsedPrompt.map((segment, idx) => {
          if (segment.type === 'text') {
            return (
              <span key={idx} className="invariant-text">
                {segment.content}
              </span>
            );
          }

          const slot = activeTemplate.slots.find(s => s.id === segment.content);
          if (!slot) return null;

          const selectedChoice = choices[slot.id];
          const isSelected = selectedChoice !== undefined;
          const validationResult = validation?.results[slot.id];

          return (
            <span
              key={idx}
              className={`invariant-slot ${isSelected ? 'filled' : ''} ${
                validation && validationResult !== undefined
                  ? validationResult ? 'correct' : 'incorrect'
                  : ''
              }`}
            >
              {isSelected ? slot.choices[selectedChoice] : '___'}
            </span>
          );
        })}
      </div>

      {/* Slot choices */}
      <div className="invariant-builder-slots">
        {activeTemplate.slots.map(slot => {
          const selectedChoice = choices[slot.id];
          const validationResult = validation?.results[slot.id];

          return (
            <div key={slot.id} className="invariant-slot-group">
              <div className="invariant-slot-choices">
                {slot.choices.map((choice, idx) => {
                  const isSelected = selectedChoice === idx;
                  const isCorrect = validation && isSelected && validationResult === true;
                  const isIncorrect = validation && isSelected && validationResult === false;

                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`invariant-choice ${isSelected ? 'selected' : ''} ${
                        isCorrect ? 'correct' : ''
                      } ${isIncorrect ? 'incorrect' : ''}`}
                      onClick={() => handleSlotChoice(slot.id, idx)}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview */}
      <div className="invariant-builder-preview">
        <label className="invariant-builder-label">Your invariant:</label>
        <div className="invariant-preview-text">
          {renderedText}
        </div>
      </div>

      {/* Explanation (shown after validation) */}
      {validation && activeTemplate.explanation && (
        <div className={`invariant-builder-explanation ${validation.allCorrect ? 'success' : 'hint'}`}>
          {validation.allCorrect ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p>{activeTemplate.explanation}</p>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p>Some choices don't match the correct invariant. Review and try again.</p>
            </>
          )}
        </div>
      )}

      {/* Complete button */}
      <div className="invariant-builder-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleComplete}
          disabled={!allSlotsFilled}
        >
          Use This Invariant
        </button>
      </div>
    </div>
  );
}
