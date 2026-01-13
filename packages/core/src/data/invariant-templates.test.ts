import { describe, it, expect } from 'vitest';
import {
  DEFAULT_INVARIANT_TEMPLATES,
  getTemplatesForPattern,
  getTemplateById,
} from './invariant-templates.js';
import {
  renderTemplate,
  validateTemplateChoices,
  type InvariantTemplate,
} from '../entities/invariant-template.js';
import type { PatternId } from '../entities/pattern.js';

describe('Invariant Templates', () => {
  describe('DEFAULT_INVARIANT_TEMPLATES', () => {
    it('should have templates for all core patterns', () => {
      const patterns: PatternId[] = [
        'SLIDING_WINDOW',
        'TWO_POINTERS',
        'PREFIX_SUM',
        'BINARY_SEARCH',
        'BFS',
        'DFS',
        'DYNAMIC_PROGRAMMING',
        'BACKTRACKING',
        'GREEDY',
        'HEAP',
        'TRIE',
        'UNION_FIND',
        'INTERVAL_MERGING',
      ];

      for (const pattern of patterns) {
        expect(DEFAULT_INVARIANT_TEMPLATES[pattern]).toBeDefined();
        expect(DEFAULT_INVARIANT_TEMPLATES[pattern].length).toBeGreaterThan(0);
      }
    });

    it('should have unique template IDs', () => {
      const allIds = new Set<string>();

      for (const templates of Object.values(DEFAULT_INVARIANT_TEMPLATES)) {
        for (const template of templates) {
          expect(allIds.has(template.id)).toBe(false);
          allIds.add(template.id);
        }
      }
    });

    it('should have valid slot references in prompts', () => {
      for (const templates of Object.values(DEFAULT_INVARIANT_TEMPLATES)) {
        for (const template of templates) {
          const slotIds = template.slots.map(s => s.id);
          const matches = template.prompt.match(/\{\{(\w+)\}\}/g) ?? [];

          for (const match of matches) {
            const slotId = match.replace(/\{\{|\}\}/g, '');
            expect(slotIds).toContain(slotId);
          }
        }
      }
    });

    it('should have correct indices for slot choices', () => {
      for (const templates of Object.values(DEFAULT_INVARIANT_TEMPLATES)) {
        for (const template of templates) {
          for (const slot of template.slots) {
            expect(slot.correctIndex).toBeGreaterThanOrEqual(0);
            expect(slot.correctIndex).toBeLessThan(slot.choices.length);
          }
        }
      }
    });

    it('should have explanations for all templates', () => {
      for (const templates of Object.values(DEFAULT_INVARIANT_TEMPLATES)) {
        for (const template of templates) {
          expect(template.explanation).toBeDefined();
          expect(template.explanation.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('getTemplatesForPattern', () => {
    it('should return templates for a valid pattern', () => {
      const templates = getTemplatesForPattern('SLIDING_WINDOW');
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => t.pattern === 'SLIDING_WINDOW')).toBe(true);
    });

    it('should filter by rung when specified', () => {
      const templates = getTemplatesForPattern('TWO_POINTERS', 1);

      // All templates should be at or below rung 1
      expect(templates.every(t => t.rung <= 1)).toBe(true);
    });

    it('should return all templates when rung is not specified', () => {
      const allTemplates = getTemplatesForPattern('TWO_POINTERS');
      const rung1Templates = getTemplatesForPattern('TWO_POINTERS', 1);

      expect(allTemplates.length).toBeGreaterThanOrEqual(rung1Templates.length);
    });

    it('should return empty array for unknown pattern', () => {
      const templates = getTemplatesForPattern('NON_EXISTENT' as PatternId);
      expect(templates).toEqual([]);
    });

    it('should return a copy, not the original array', () => {
      const templates1 = getTemplatesForPattern('SLIDING_WINDOW');
      const templates2 = getTemplatesForPattern('SLIDING_WINDOW');

      expect(templates1).not.toBe(templates2);
      expect(templates1).toEqual(templates2);
    });
  });

  describe('getTemplateById', () => {
    it('should find template by ID', () => {
      const template = getTemplateById('sw_window_bounds');
      expect(template).not.toBeNull();
      expect(template?.id).toBe('sw_window_bounds');
      expect(template?.pattern).toBe('SLIDING_WINDOW');
    });

    it('should return null for unknown ID', () => {
      const template = getTemplateById('non_existent_template');
      expect(template).toBeNull();
    });

    it('should find templates from different patterns', () => {
      const swTemplate = getTemplateById('sw_window_bounds');
      const tpTemplate = getTemplateById('tp_sorted_search');
      const bsTemplate = getTemplateById('bs_search_space');

      expect(swTemplate?.pattern).toBe('SLIDING_WINDOW');
      expect(tpTemplate?.pattern).toBe('TWO_POINTERS');
      expect(bsTemplate?.pattern).toBe('BINARY_SEARCH');
    });
  });

  describe('renderTemplate', () => {
    it('should render template with correct choices', () => {
      const template = getTemplateById('sw_window_bounds')!;

      const rendered = renderTemplate(template, {
        constraint: 2, // 'a contiguous subarray'
        condition: 3, // 'the problem requirements'
      });

      expect(rendered).toContain('a contiguous subarray');
      expect(rendered).toContain('the problem requirements');
      expect(rendered).not.toContain('{{');
    });

    it('should use first choice as default for missing slots', () => {
      const template = getTemplateById('sw_window_bounds')!;

      const rendered = renderTemplate(template, {
        constraint: 2,
        // condition is missing, should default to index 0
      });

      expect(rendered).toContain('a contiguous subarray');
      expect(rendered).toContain(template.slots.find(s => s.id === 'condition')?.choices[0]);
    });

    it('should handle all slots being filled', () => {
      const template = getTemplateById('bs_search_space')!;

      const choices: Record<string, number> = {};
      for (const slot of template.slots) {
        choices[slot.id] = slot.correctIndex;
      }

      const rendered = renderTemplate(template, choices);
      expect(rendered).not.toContain('{{');
      expect(rendered).not.toContain('}}');
    });

    it('should produce readable sentences', () => {
      const template = getTemplateById('bfs_level_order')!;

      const rendered = renderTemplate(template, {
        queue_contents: 0,
        order: 0,
        guarantee: 0,
      });

      // Should be a readable sentence
      expect(rendered.length).toBeGreaterThan(20);
      expect(rendered).toMatch(/^The queue/);
    });
  });

  describe('validateTemplateChoices', () => {
    it('should pass when all choices are correct', () => {
      const template = getTemplateById('sw_window_bounds')!;

      const correctChoices: Record<string, number> = {};
      for (const slot of template.slots) {
        correctChoices[slot.id] = slot.correctIndex;
      }

      const result = validateTemplateChoices(template, correctChoices);
      expect(result.isCorrect).toBe(true);

      for (const [slotId, slotResult] of Object.entries(result.slotResults)) {
        expect(slotResult.isCorrect).toBe(true);
      }
    });

    it('should fail when some choices are incorrect', () => {
      const template = getTemplateById('sw_window_bounds')!;

      const incorrectChoices: Record<string, number> = {
        constraint: 0, // Wrong - should be 2
        condition: 3, // Correct
      };

      const result = validateTemplateChoices(template, incorrectChoices);
      expect(result.isCorrect).toBe(false);
      expect(result.slotResults['constraint'].isCorrect).toBe(false);
      expect(result.slotResults['condition'].isCorrect).toBe(true);
    });

    it('should return correct slot results', () => {
      const template = getTemplateById('bs_search_space')!;

      const choices = {
        contains: 0, // Correct
        eliminate: 0, // Correct
      };

      const result = validateTemplateChoices(template, choices);

      expect(result.slotResults['contains'].chosen).toBe(0);
      expect(result.slotResults['contains'].correct).toBe(0);
      expect(result.slotResults['contains'].isCorrect).toBe(true);
    });

    it('should include rendered text in result', () => {
      const template = getTemplateById('dfs_exploration')!;

      const choices = {
        action: 0,
        children: 0,
        backtrack: 0,
      };

      const result = validateTemplateChoices(template, choices);
      expect(result.renderedText).toBeDefined();
      expect(result.renderedText.length).toBeGreaterThan(0);
      expect(result.renderedText).not.toContain('{{');
    });

    it('should handle missing choices by defaulting to 0', () => {
      const template = getTemplateById('heap_top_k')!;

      // Only provide one choice
      const result = validateTemplateChoices(template, {
        contents: 0,
      });

      // Should still have results for all slots
      expect(Object.keys(result.slotResults).length).toBe(template.slots.length);
    });
  });

  describe('Template content quality', () => {
    it('should have multiple choice options per slot', () => {
      for (const templates of Object.values(DEFAULT_INVARIANT_TEMPLATES)) {
        for (const template of templates) {
          for (const slot of template.slots) {
            expect(slot.choices.length).toBeGreaterThanOrEqual(2);
          }
        }
      }
    });

    it('should have distinct choice options', () => {
      for (const templates of Object.values(DEFAULT_INVARIANT_TEMPLATES)) {
        for (const template of templates) {
          for (const slot of template.slots) {
            const uniqueChoices = new Set(slot.choices);
            expect(uniqueChoices.size).toBe(slot.choices.length);
          }
        }
      }
    });

    it('should have rung 1 templates for all patterns', () => {
      for (const [pattern, templates] of Object.entries(DEFAULT_INVARIANT_TEMPLATES)) {
        const rung1Templates = templates.filter(t => t.rung === 1);
        expect(rung1Templates.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Specific pattern templates', () => {
    it('SLIDING_WINDOW should have window-related templates', () => {
      const templates = getTemplatesForPattern('SLIDING_WINDOW');
      const templateTexts = templates.map(t => t.prompt.toLowerCase());

      // Should mention window-related concepts
      expect(templateTexts.some(t => t.includes('window'))).toBe(true);
    });

    it('BINARY_SEARCH should have search space templates', () => {
      const templates = getTemplatesForPattern('BINARY_SEARCH');
      const templateTexts = templates.map(t => t.prompt.toLowerCase());

      expect(templateTexts.some(t => t.includes('search'))).toBe(true);
    });

    it('DYNAMIC_PROGRAMMING should have subproblem templates', () => {
      const templates = getTemplatesForPattern('DYNAMIC_PROGRAMMING');
      const templateTexts = templates.map(t => t.prompt.toLowerCase());

      expect(templateTexts.some(t => t.includes('dp') || t.includes('subproblem'))).toBe(true);
    });

    it('BFS should have queue/level templates', () => {
      const templates = getTemplatesForPattern('BFS');
      const templateTexts = templates.map(t => t.prompt.toLowerCase());

      expect(templateTexts.some(t => t.includes('queue') || t.includes('level'))).toBe(true);
    });
  });
});

describe('ThinkingGateData with template', () => {
  it('should structure step data correctly with template', () => {
    const stepData = {
      type: 'THINKING_GATE' as const,
      selectedPattern: 'SLIDING_WINDOW',
      statedInvariant: 'The window [left, right] always contains a contiguous subarray that satisfies the problem requirements.',
      statedComplexity: 'O(n)',
      invariantTemplate: {
        templateId: 'sw_window_bounds',
        choices: { constraint: 2, condition: 3 },
        allCorrect: true,
      },
    };

    expect(stepData.type).toBe('THINKING_GATE');
    expect(stepData.invariantTemplate?.templateId).toBe('sw_window_bounds');
    expect(stepData.invariantTemplate?.allCorrect).toBe(true);
  });

  it('should allow null invariantTemplate for free-text invariants', () => {
    const stepData = {
      type: 'THINKING_GATE' as const,
      selectedPattern: 'TWO_POINTERS',
      statedInvariant: 'Custom user-written invariant.',
      statedComplexity: null,
      invariantTemplate: null,
    };

    expect(stepData.invariantTemplate).toBeNull();
    expect(stepData.statedInvariant).toBe('Custom user-written invariant.');
  });
});
