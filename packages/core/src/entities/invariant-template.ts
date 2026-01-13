/**
 * Invariant Template - Fill-in-the-blanks scaffolding for invariants
 *
 * Provides a structured way for users to build invariants by selecting
 * from pre-defined choices for each blank in a template sentence.
 */

import type { PatternId } from './pattern.js';
import type { RungLevel } from './rung.js';

/**
 * A slot (blank) in the invariant template
 */
export interface InvariantSlot {
  /** Unique identifier for this slot */
  readonly id: string;
  /** Available choices for this slot */
  readonly choices: readonly string[];
  /** Index of the correct choice (0-based) */
  readonly correctIndex: number;
}

/**
 * An invariant template with blanks to fill in
 */
export interface InvariantTemplate {
  /** Unique identifier */
  readonly id: string;
  /** Pattern this template is for */
  readonly pattern: PatternId;
  /** Rung level (difficulty) this template is appropriate for */
  readonly rung: RungLevel;
  /**
   * The template prompt with placeholders for blanks.
   * Use {{slotId}} syntax for slots.
   * Example: "The window [left, right] always contains {{constraint}} elements"
   */
  readonly prompt: string;
  /** The slots (blanks) in the template */
  readonly slots: readonly InvariantSlot[];
  /** Explanation shown after correct completion */
  readonly explanation: string;
  /** Optional: More specific problem context this template is for */
  readonly problemContext?: string;
}

/**
 * User's choices for an invariant template
 */
export interface InvariantTemplateChoices {
  /** Template ID that was used */
  readonly templateId: string;
  /** Map of slot ID to chosen index */
  readonly choices: Record<string, number>;
  /** The final rendered invariant text */
  readonly renderedText: string;
  /** Whether all choices were correct */
  readonly allCorrect: boolean;
}

/**
 * Result of validating template choices
 */
export interface InvariantValidationResult {
  /** Whether all choices match correct indices */
  readonly isCorrect: boolean;
  /** Per-slot validation results */
  readonly slotResults: Record<string, { chosen: number; correct: number; isCorrect: boolean }>;
  /** The rendered invariant text */
  readonly renderedText: string;
}

/**
 * Render a template with user's choices
 */
export function renderTemplate(
  template: InvariantTemplate,
  choices: Record<string, number>
): string {
  let result = template.prompt;

  for (const slot of template.slots) {
    const choiceIndex = choices[slot.id] ?? 0;
    const chosenText = slot.choices[choiceIndex] ?? slot.choices[0] ?? '___';
    result = result.replace(`{{${slot.id}}}`, chosenText);
  }

  return result;
}

/**
 * Validate user's template choices
 */
export function validateTemplateChoices(
  template: InvariantTemplate,
  choices: Record<string, number>
): InvariantValidationResult {
  const slotResults: Record<string, { chosen: number; correct: number; isCorrect: boolean }> = {};
  let allCorrect = true;

  for (const slot of template.slots) {
    const chosen = choices[slot.id] ?? 0;
    const correct = slot.correctIndex;
    const isCorrect = chosen === correct;

    slotResults[slot.id] = { chosen, correct, isCorrect };

    if (!isCorrect) {
      allCorrect = false;
    }
  }

  return {
    isCorrect: allCorrect,
    slotResults,
    renderedText: renderTemplate(template, choices),
  };
}
