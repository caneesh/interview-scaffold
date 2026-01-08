import type { SupportedLanguage, LanguageConfig } from './types.js';

export const LANGUAGE_CONFIGS: Record<SupportedLanguage, LanguageConfig> = {
  javascript: {
    pistonLanguage: 'javascript',
    pistonVersion: '*',
    fileExtension: 'js',
    fileName: 'solution.js',
    compileTimeout: 10000,
    runTimeout: 5000,
  },
  python: {
    pistonLanguage: 'python',
    pistonVersion: '3',
    fileExtension: 'py',
    fileName: 'solution.py',
    compileTimeout: 10000,
    runTimeout: 5000,
  },
  java: {
    pistonLanguage: 'java',
    pistonVersion: '*',
    fileExtension: 'java',
    fileName: 'Solution.java',
    compileTimeout: 15000,
    runTimeout: 5000,
  },
  cpp: {
    pistonLanguage: 'c++',
    pistonVersion: '*',
    fileExtension: 'cpp',
    fileName: 'solution.cpp',
    compileTimeout: 15000,
    runTimeout: 5000,
  },
};

const LANGUAGE_ALIASES: Record<string, SupportedLanguage> = {
  javascript: 'javascript',
  js: 'javascript',
  node: 'javascript',
  python: 'python',
  python3: 'python',
  py: 'python',
  java: 'java',
  cpp: 'cpp',
  'c++': 'cpp',
};

export function normalizeLanguage(lang: string): SupportedLanguage | null {
  const normalized = lang.toLowerCase().trim();
  return LANGUAGE_ALIASES[normalized] ?? null;
}

export function isSupportedLanguage(lang: string): boolean {
  return normalizeLanguage(lang) !== null;
}
