import { describe, it, expect } from 'vitest';
import {
  languages,
  languageList,
  getFileName,
  editorTheme,
  editorOptions,
} from './languageConfig';

describe('languageConfig', () => {
  describe('languages object', () => {
    it('should have python, javascript, and java languages', () => {
      expect(languages).toHaveProperty('python');
      expect(languages).toHaveProperty('javascript');
      expect(languages).toHaveProperty('java');
    });

    it('should have correct structure for each language', () => {
      const requiredFields = [
        'id',
        'name',
        'extension',
        'monacoId',
        'icon',
        'color',
        'defaultTemplate',
      ];

      Object.values(languages).forEach((lang) => {
        requiredFields.forEach((field) => {
          expect(lang).toHaveProperty(field);
        });
      });
    });

    describe('Python configuration', () => {
      it('should have correct Python settings', () => {
        expect(languages.python.id).toBe('python');
        expect(languages.python.name).toBe('Python');
        expect(languages.python.extension).toBe('.py');
        expect(languages.python.monacoId).toBe('python');
      });

      it('should have Python default template with def', () => {
        expect(languages.python.defaultTemplate).toContain('def');
        expect(languages.python.defaultTemplate).toContain('solution');
      });
    });

    describe('JavaScript configuration', () => {
      it('should have correct JavaScript settings', () => {
        expect(languages.javascript.id).toBe('javascript');
        expect(languages.javascript.name).toBe('JavaScript');
        expect(languages.javascript.extension).toBe('.js');
        expect(languages.javascript.monacoId).toBe('javascript');
      });

      it('should have JavaScript default template with function', () => {
        expect(languages.javascript.defaultTemplate).toContain('function');
        expect(languages.javascript.defaultTemplate).toContain('solution');
      });
    });

    describe('Java configuration', () => {
      it('should have correct Java settings', () => {
        expect(languages.java.id).toBe('java');
        expect(languages.java.name).toBe('Java');
        expect(languages.java.extension).toBe('.java');
        expect(languages.java.monacoId).toBe('java');
      });

      it('should have Java default template with class', () => {
        expect(languages.java.defaultTemplate).toContain('class');
        expect(languages.java.defaultTemplate).toContain('Solution');
        expect(languages.java.defaultTemplate).toContain('public');
      });
    });
  });

  describe('languageList', () => {
    it('should be an array of all languages', () => {
      expect(Array.isArray(languageList)).toBe(true);
      expect(languageList.length).toBe(3);
    });

    it('should contain all language objects', () => {
      const ids = languageList.map((lang) => lang.id);
      expect(ids).toContain('python');
      expect(ids).toContain('javascript');
      expect(ids).toContain('java');
    });
  });

  describe('getFileName', () => {
    it('should return correct filename for python', () => {
      expect(getFileName('python')).toBe('solution.py');
    });

    it('should return correct filename for javascript', () => {
      expect(getFileName('javascript')).toBe('solution.js');
    });

    it('should return correct filename for java', () => {
      expect(getFileName('java')).toBe('solution.java');
    });

    it('should use custom base name', () => {
      expect(getFileName('python', 'myFile')).toBe('myFile.py');
      expect(getFileName('javascript', 'index')).toBe('index.js');
    });

    it('should default to python for unknown language', () => {
      expect(getFileName('ruby')).toBe('solution.py');
      expect(getFileName('unknown')).toBe('solution.py');
    });
  });

  describe('editorTheme', () => {
    it('should have base theme set to vs-dark', () => {
      expect(editorTheme.base).toBe('vs-dark');
    });

    it('should inherit from base theme', () => {
      expect(editorTheme.inherit).toBe(true);
    });

    it('should have syntax highlighting rules', () => {
      expect(Array.isArray(editorTheme.rules)).toBe(true);
      expect(editorTheme.rules.length).toBeGreaterThan(0);

      const tokenTypes = editorTheme.rules.map((rule) => rule.token);
      expect(tokenTypes).toContain('comment');
      expect(tokenTypes).toContain('keyword');
      expect(tokenTypes).toContain('string');
    });

    it('should have custom editor colors', () => {
      expect(editorTheme.colors).toHaveProperty('editor.background');
      expect(editorTheme.colors).toHaveProperty('editor.foreground');
    });
  });

  describe('editorOptions', () => {
    it('should have reasonable font size', () => {
      expect(editorOptions.fontSize).toBeGreaterThanOrEqual(12);
      expect(editorOptions.fontSize).toBeLessThanOrEqual(18);
    });

    it('should have minimap disabled', () => {
      expect(editorOptions.minimap.enabled).toBe(false);
    });

    it('should enable automatic layout', () => {
      expect(editorOptions.automaticLayout).toBe(true);
    });

    it('should have proper indentation settings', () => {
      expect(editorOptions.tabSize).toBe(4);
      expect(editorOptions.insertSpaces).toBe(true);
    });

    it('should enable word wrap', () => {
      expect(editorOptions.wordWrap).toBe('on');
    });

    it('should enable bracket pair colorization', () => {
      expect(editorOptions.bracketPairColorization.enabled).toBe(true);
    });

    it('should enable auto-closing brackets and quotes', () => {
      expect(editorOptions.autoClosingBrackets).toBe('always');
      expect(editorOptions.autoClosingQuotes).toBe('always');
    });
  });
});
