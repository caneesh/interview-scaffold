'use client';

import { useState, useMemo, useCallback } from 'react';

// ============ Types ============

export type InvariantTemplateType = 'loop' | 'window' | 'stack' | 'dp';

interface InvariantSlotOption {
  id: string;
  text: string;
}

interface InvariantSlot {
  id: string;
  label: string;
  options: InvariantSlotOption[];
}

interface InvariantTemplate {
  id: string;
  type: InvariantTemplateType;
  name: string;
  template: string; // e.g., "At iteration {{i}}, {{state}} contains {{property}}"
  slots: InvariantSlot[];
  example: string;
}

interface InvariantBuilderV2Props {
  patternId?: string;
  onComplete: (result: {
    templateId: string;
    templateType: string;
    choices: Record<string, string>;
    renderedText: string;
  }) => void;
  initialTemplateType?: InvariantTemplateType;
  showFreeTextFallback?: boolean;
  onFreeTextChange?: (text: string) => void;
}

// ============ Template Definitions ============

const INVARIANT_TEMPLATES: InvariantTemplate[] = [
  // Loop invariants
  {
    id: 'loop-sum',
    type: 'loop',
    name: 'Running Sum/Product',
    template: 'At the start of iteration {{index}}, {{accumulator}} contains the {{operation}} of elements from index 0 to {{range}}.',
    slots: [
      {
        id: 'index',
        label: 'Loop index',
        options: [
          { id: 'i', text: 'i' },
          { id: 'j', text: 'j' },
          { id: 'k', text: 'k' },
        ],
      },
      {
        id: 'accumulator',
        label: 'Accumulator variable',
        options: [
          { id: 'sum', text: 'sum' },
          { id: 'result', text: 'result' },
          { id: 'total', text: 'total' },
          { id: 'product', text: 'product' },
        ],
      },
      {
        id: 'operation',
        label: 'Operation type',
        options: [
          { id: 'sum', text: 'sum' },
          { id: 'product', text: 'product' },
          { id: 'max', text: 'maximum' },
          { id: 'min', text: 'minimum' },
        ],
      },
      {
        id: 'range',
        label: 'Range end',
        options: [
          { id: 'i-1', text: 'i-1' },
          { id: 'i', text: 'i' },
          { id: 'j-1', text: 'j-1' },
        ],
      },
    ],
    example: 'At the start of iteration i, sum contains the sum of elements from index 0 to i-1.',
  },
  {
    id: 'loop-sorted',
    type: 'loop',
    name: 'Sorted Prefix',
    template: 'At the start of iteration {{index}}, the subarray {{range}} is {{property}}.',
    slots: [
      {
        id: 'index',
        label: 'Loop index',
        options: [
          { id: 'i', text: 'i' },
          { id: 'j', text: 'j' },
        ],
      },
      {
        id: 'range',
        label: 'Subarray range',
        options: [
          { id: 'arr[0..i-1]', text: 'arr[0..i-1]' },
          { id: 'arr[0..i]', text: 'arr[0..i]' },
          { id: 'arr[j..n-1]', text: 'arr[j..n-1]' },
        ],
      },
      {
        id: 'property',
        label: 'Property maintained',
        options: [
          { id: 'sorted-asc', text: 'sorted in ascending order' },
          { id: 'sorted-desc', text: 'sorted in descending order' },
          { id: 'partitioned', text: 'correctly partitioned' },
        ],
      },
    ],
    example: 'At the start of iteration i, the subarray arr[0..i-1] is sorted in ascending order.',
  },

  // Window invariants
  {
    id: 'window-constraint',
    type: 'window',
    name: 'Window Constraint',
    template: 'The window [{{left}}, {{right}}] always satisfies: {{constraint}}.',
    slots: [
      {
        id: 'left',
        label: 'Left pointer',
        options: [
          { id: 'left', text: 'left' },
          { id: 'start', text: 'start' },
          { id: 'i', text: 'i' },
        ],
      },
      {
        id: 'right',
        label: 'Right pointer',
        options: [
          { id: 'right', text: 'right' },
          { id: 'end', text: 'end' },
          { id: 'j', text: 'j' },
        ],
      },
      {
        id: 'constraint',
        label: 'Constraint',
        options: [
          { id: 'k-distinct', text: 'contains at most k distinct elements' },
          { id: 'sum-target', text: 'has sum less than or equal to target' },
          { id: 'no-dup', text: 'contains no duplicates' },
          { id: 'valid-substr', text: 'is a valid substring' },
        ],
      },
    ],
    example: 'The window [left, right] always satisfies: contains at most k distinct elements.',
  },
  {
    id: 'window-optimal',
    type: 'window',
    name: 'Optimal Window Tracking',
    template: '{{best}} tracks the {{metric}} window seen so far where {{condition}}.',
    slots: [
      {
        id: 'best',
        label: 'Best tracker',
        options: [
          { id: 'maxLen', text: 'maxLen' },
          { id: 'minLen', text: 'minLen' },
          { id: 'result', text: 'result' },
          { id: 'answer', text: 'answer' },
        ],
      },
      {
        id: 'metric',
        label: 'Optimization metric',
        options: [
          { id: 'longest', text: 'longest' },
          { id: 'shortest', text: 'shortest' },
          { id: 'maximum-sum', text: 'maximum sum' },
        ],
      },
      {
        id: 'condition',
        label: 'Valid condition',
        options: [
          { id: 'constraint-met', text: 'the constraint is satisfied' },
          { id: 'target-reached', text: 'the target is reached' },
          { id: 'all-included', text: 'all required elements are included' },
        ],
      },
    ],
    example: 'maxLen tracks the longest window seen so far where the constraint is satisfied.',
  },

  // Stack invariants
  {
    id: 'stack-monotonic',
    type: 'stack',
    name: 'Monotonic Stack',
    template: 'The stack maintains elements in {{order}} order, where each element represents {{meaning}}.',
    slots: [
      {
        id: 'order',
        label: 'Stack order',
        options: [
          { id: 'increasing', text: 'strictly increasing' },
          { id: 'decreasing', text: 'strictly decreasing' },
          { id: 'non-increasing', text: 'non-increasing' },
          { id: 'non-decreasing', text: 'non-decreasing' },
        ],
      },
      {
        id: 'meaning',
        label: 'Element meaning',
        options: [
          { id: 'indices', text: 'indices of unprocessed elements' },
          { id: 'values', text: 'values waiting for their next greater/smaller element' },
          { id: 'pairs', text: '(index, value) pairs for range queries' },
        ],
      },
    ],
    example: 'The stack maintains elements in strictly increasing order, where each element represents indices of unprocessed elements.',
  },
  {
    id: 'stack-matching',
    type: 'stack',
    name: 'Matching/Balanced',
    template: 'The stack contains {{content}}, and an element is popped when {{trigger}}.',
    slots: [
      {
        id: 'content',
        label: 'Stack contents',
        options: [
          { id: 'opening', text: 'unmatched opening brackets' },
          { id: 'indices', text: 'indices of unmatched elements' },
          { id: 'pending', text: 'pending operations' },
        ],
      },
      {
        id: 'trigger',
        label: 'Pop trigger',
        options: [
          { id: 'closing-match', text: 'a matching closing bracket is found' },
          { id: 'complete', text: 'the corresponding element is complete' },
          { id: 'pair-found', text: 'a valid pair is formed' },
        ],
      },
    ],
    example: 'The stack contains unmatched opening brackets, and an element is popped when a matching closing bracket is found.',
  },

  // DP invariants
  {
    id: 'dp-1d',
    type: 'dp',
    name: '1D DP State',
    template: '{{dp}}[{{index}}] represents {{meaning}} considering {{scope}}.',
    slots: [
      {
        id: 'dp',
        label: 'DP array name',
        options: [
          { id: 'dp', text: 'dp' },
          { id: 'memo', text: 'memo' },
          { id: 'f', text: 'f' },
        ],
      },
      {
        id: 'index',
        label: 'Index meaning',
        options: [
          { id: 'i', text: 'i' },
          { id: 'n', text: 'n' },
          { id: 'len', text: 'len' },
        ],
      },
      {
        id: 'meaning',
        label: 'Value meaning',
        options: [
          { id: 'max-value', text: 'the maximum value achievable' },
          { id: 'min-cost', text: 'the minimum cost' },
          { id: 'num-ways', text: 'the number of ways' },
          { id: 'is-possible', text: 'whether it is possible' },
        ],
      },
      {
        id: 'scope',
        label: 'Scope of subproblem',
        options: [
          { id: 'first-i', text: 'the first i elements' },
          { id: 'last-i', text: 'the last i elements' },
          { id: 'subproblem-size', text: 'subproblem of size i' },
        ],
      },
    ],
    example: 'dp[i] represents the maximum value achievable considering the first i elements.',
  },
  {
    id: 'dp-2d',
    type: 'dp',
    name: '2D DP State',
    template: '{{dp}}[{{row}}][{{col}}] represents {{meaning}} given {{constraint1}} and {{constraint2}}.',
    slots: [
      {
        id: 'dp',
        label: 'DP array name',
        options: [
          { id: 'dp', text: 'dp' },
          { id: 'memo', text: 'memo' },
        ],
      },
      {
        id: 'row',
        label: 'Row meaning',
        options: [
          { id: 'i', text: 'i' },
          { id: 'index', text: 'index' },
        ],
      },
      {
        id: 'col',
        label: 'Column meaning',
        options: [
          { id: 'j', text: 'j' },
          { id: 'capacity', text: 'capacity' },
          { id: 'target', text: 'target' },
        ],
      },
      {
        id: 'meaning',
        label: 'Value meaning',
        options: [
          { id: 'optimal', text: 'the optimal solution' },
          { id: 'is-achievable', text: 'whether the target is achievable' },
          { id: 'count', text: 'the count of valid configurations' },
        ],
      },
      {
        id: 'constraint1',
        label: 'First constraint',
        options: [
          { id: 'first-i', text: 'first i items considered' },
          { id: 'prefix-i', text: 'prefix of length i' },
        ],
      },
      {
        id: 'constraint2',
        label: 'Second constraint',
        options: [
          { id: 'capacity-j', text: 'capacity/budget of j' },
          { id: 'target-j', text: 'target sum of j' },
          { id: 'second-prefix-j', text: 'second prefix of length j' },
        ],
      },
    ],
    example: 'dp[i][j] represents the optimal solution given first i items considered and capacity/budget of j.',
  },
];

// ============ Component ============

/**
 * InvariantBuilderV2 - Template-based invariant construction
 *
 * Provides structured templates for building invariants with fill-in-the-blank slots.
 * Supports loop, window, stack, and DP invariant types.
 */
export function InvariantBuilderV2({
  patternId,
  onComplete,
  initialTemplateType = 'loop',
  showFreeTextFallback = false,
  onFreeTextChange,
}: InvariantBuilderV2Props) {
  const [selectedType, setSelectedType] = useState<InvariantTemplateType>(
    initialTemplateType
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [showFreeText, setShowFreeText] = useState(false);
  const [freeText, setFreeText] = useState('');

  // Filter templates by type
  const templatesForType = useMemo(() => {
    return INVARIANT_TEMPLATES.filter((t) => t.type === selectedType);
  }, [selectedType]);

  // Get the currently selected template
  const selectedTemplate = useMemo(() => {
    return templatesForType.find((t) => t.id === selectedTemplateId);
  }, [templatesForType, selectedTemplateId]);

  // Render the template with current choices
  const renderedText = useMemo(() => {
    if (!selectedTemplate) return '';

    let result = selectedTemplate.template;
    for (const slot of selectedTemplate.slots) {
      const choice = choices[slot.id];
      const choiceText = choice
        ? slot.options.find((o) => o.id === choice)?.text ?? '___'
        : '___';
      result = result.replace(`{{${slot.id}}}`, choiceText);
    }
    return result;
  }, [selectedTemplate, choices]);

  // Check if all slots are filled
  const allSlotsFilled = useMemo(() => {
    if (!selectedTemplate) return false;
    return selectedTemplate.slots.every((slot) => choices[slot.id]);
  }, [selectedTemplate, choices]);

  const handleTypeChange = (type: InvariantTemplateType) => {
    setSelectedType(type);
    setSelectedTemplateId(null);
    setChoices({});
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setChoices({});
  };

  const handleChoiceChange = (slotId: string, optionId: string) => {
    setChoices((prev) => ({ ...prev, [slotId]: optionId }));
  };

  const handleComplete = useCallback(() => {
    if (!selectedTemplate || !allSlotsFilled) return;

    onComplete({
      templateId: selectedTemplate.id,
      templateType: selectedTemplate.type,
      choices,
      renderedText,
    });
  }, [selectedTemplate, allSlotsFilled, choices, renderedText, onComplete]);

  const handleFreeTextChange = (text: string) => {
    setFreeText(text);
    onFreeTextChange?.(text);
  };

  // Type selector tabs
  const typeOptions: Array<{ type: InvariantTemplateType; label: string; icon: string }> = [
    { type: 'loop', label: 'Loop', icon: 'M4 6h16M4 12h16M4 18h16' },
    { type: 'window', label: 'Window', icon: 'M3 7h4v10H3V7zm7 0h4v10h-4V7zm7 0h4v10h-4V7z' },
    { type: 'stack', label: 'Stack', icon: 'M4 6h16v4H4V6zm0 8h16v4H4v-4z' },
    { type: 'dp', label: 'DP', icon: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z' },
  ];

  if (showFreeText) {
    return (
      <div className="invariant-builder-v2">
        <div className="invariant-builder-v2__free-text">
          <textarea
            className="textarea"
            value={freeText}
            onChange={(e) => handleFreeTextChange(e.target.value)}
            placeholder="Write your invariant in your own words..."
            rows={3}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowFreeText(false)}
          >
            Switch to Builder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="invariant-builder-v2">
      {/* Type selector */}
      <div className="invariant-builder-v2__types">
        {typeOptions.map(({ type, label, icon }) => (
          <button
            key={type}
            type="button"
            className={`invariant-builder-v2__type-btn ${
              selectedType === type ? 'active' : ''
            }`}
            onClick={() => handleTypeChange(type)}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d={icon} />
            </svg>
            {label}
          </button>
        ))}
      </div>

      {/* Template selector */}
      <div className="invariant-builder-v2__templates">
        {templatesForType.map((template) => (
          <div
            key={template.id}
            className={`invariant-builder-v2__template-card ${
              selectedTemplateId === template.id ? 'selected' : ''
            }`}
            onClick={() => handleTemplateSelect(template.id)}
            role="radio"
            aria-checked={selectedTemplateId === template.id}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTemplateSelect(template.id);
              }
            }}
          >
            <span className="invariant-builder-v2__template-name">
              {template.name}
            </span>
            <span className="invariant-builder-v2__template-example">
              {template.example}
            </span>
          </div>
        ))}
      </div>

      {/* Slot filling */}
      {selectedTemplate && (
        <div className="invariant-builder-v2__slots">
          <h4 className="invariant-builder-v2__slots-title">
            Fill in the blanks:
          </h4>

          {selectedTemplate.slots.map((slot) => (
            <div key={slot.id} className="invariant-builder-v2__slot">
              <label className="invariant-builder-v2__slot-label">
                {slot.label}:
              </label>
              <div className="invariant-builder-v2__slot-options">
                {slot.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`invariant-builder-v2__slot-option ${
                      choices[slot.id] === option.id ? 'selected' : ''
                    }`}
                    onClick={() => handleChoiceChange(slot.id, option.id)}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Preview */}
          <div className="invariant-builder-v2__preview">
            <h4 className="invariant-builder-v2__preview-title">
              Your invariant:
            </h4>
            <p className="invariant-builder-v2__preview-text">{renderedText}</p>
          </div>

          {/* Actions */}
          <div className="invariant-builder-v2__actions">
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
      )}

      {/* Free text fallback */}
      {showFreeTextFallback && (
        <button
          type="button"
          className="btn btn-ghost btn-sm invariant-builder-v2__free-text-trigger"
          onClick={() => setShowFreeText(true)}
        >
          Or write in your own words (advanced)
        </button>
      )}
    </div>
  );
}

export default InvariantBuilderV2;
